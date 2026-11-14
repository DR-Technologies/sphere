begin;

alter table public.user_roles
  add column if not exists admin_plan_override text;

alter table public.user_roles
  drop constraint if exists user_roles_admin_plan_override_check,
  add constraint user_roles_admin_plan_override_check
    check (admin_plan_override is null or admin_plan_override in ('free', 'pro', 'enterprise'));

create table if not exists public.account_subscriptions (
  user_id uuid primary key references auth.users(id) on delete cascade,
  stripe_customer_id text unique,
  stripe_subscription_id text unique,
  stripe_price_id text,
  plan text not null default 'free' check (plan in ('free', 'pro', 'enterprise')),
  status text not null default 'inactive'
    check (status in ('inactive', 'trialing', 'active', 'past_due', 'canceled', 'unpaid', 'incomplete', 'incomplete_expired', 'paused')),
  current_period_end timestamptz,
  cancel_at_period_end boolean not null default false,
  latest_invoice_status text,
  stripe_event_created_at timestamptz,
  stripe_event_id text,
  latest_invoice_event_created_at timestamptz,
  created_at timestamptz not null default timezone('utc', now()),
  updated_at timestamptz not null default timezone('utc', now())
);

create index if not exists account_subscriptions_status_idx
  on public.account_subscriptions(status);

alter table public.account_subscriptions enable row level security;
revoke all on public.account_subscriptions from public, anon, authenticated;
grant all on public.account_subscriptions to service_role;

-- Package 3 stored administrative plan assignments in subscription_plan. Only
-- migrate rows for which no real Stripe subscription is already recorded. This
-- also makes reapplication safe in an environment populated by billing sync.
update public.user_roles access
set admin_plan_override = access.subscription_plan
where access.subscription_plan <> 'free'
  and access.admin_plan_override is null
  and not exists (
    select 1
    from public.account_subscriptions billing
    where billing.user_id = access.user_id
      and billing.stripe_subscription_id is not null
  );

create table if not exists public.stripe_webhook_events (
  event_id text primary key,
  event_type text not null,
  status text not null check (status in ('processing', 'completed', 'failed')),
  attempts integer not null default 1,
  last_error text,
  stripe_created_at timestamptz not null,
  processing_started_at timestamptz,
  lease_expires_at timestamptz,
  claim_token uuid,
  created_at timestamptz not null default timezone('utc', now()),
  updated_at timestamptz not null default timezone('utc', now()),
  processed_at timestamptz
);

alter table public.stripe_webhook_events enable row level security;
revoke all on public.stripe_webhook_events from public, anon, authenticated;
grant all on public.stripe_webhook_events to service_role;

create table if not exists public.account_deletion_requests (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null unique,
  status text not null check (status in ('processing', 'failed', 'completed')),
  retry_token_hash text not null,
  resources jsonb not null default '{}'::jsonb,
  attempts integer not null default 1,
  last_error text,
  last_error_stage text,
  database_cleaned_at timestamptz,
  storage_cleaned_at timestamptz,
  auth_deleted_at timestamptz,
  created_at timestamptz not null default timezone('utc', now()),
  updated_at timestamptz not null default timezone('utc', now()),
  completed_at timestamptz
);

create index if not exists account_deletion_requests_status_updated_idx
  on public.account_deletion_requests(status, updated_at);

alter table public.account_deletion_requests enable row level security;
revoke all on public.account_deletion_requests from public, anon, authenticated;
grant all on public.account_deletion_requests to service_role;

create or replace function public.assert_account_dataset_tables(p_user_id uuid)
returns void
language plpgsql
security definer
set search_path = pg_catalog, public
as $$
declare
  dataset_record record;
  expected_table_name text;
  relation_kind "char";
begin
  if auth.role() <> 'service_role' then
    raise exception 'SERVICE_ROLE_REQUIRED' using errcode = '42501';
  end if;

  for dataset_record in
    select id, normalized_table_name
    from public.datasets
    where user_id = p_user_id
    order by id
    for update
  loop
    expected_table_name := public.normalized_dataset_table_name(dataset_record.id);

    select relation.relkind into relation_kind
    from pg_catalog.pg_class relation
    join pg_catalog.pg_namespace namespace on namespace.oid = relation.relnamespace
    where namespace.nspname = 'public' and relation.relname = expected_table_name;

    if dataset_record.normalized_table_name is null then
      if relation_kind is not null then
        raise exception 'DATASET_TABLE_METADATA_MISSING'
          using errcode = 'P0001', detail = format('dataset_id=%s table=%s', dataset_record.id, expected_table_name);
      end if;
      continue;
    end if;
    if dataset_record.normalized_table_name <> expected_table_name then
      raise exception 'DATASET_TABLE_NAME_MISMATCH'
        using errcode = 'P0001',
          detail = format('dataset_id=%s expected=%s actual=%s', dataset_record.id, expected_table_name, dataset_record.normalized_table_name);
    end if;
    if exists (
      select 1 from public.datasets other_dataset
      where other_dataset.id <> dataset_record.id
        and other_dataset.normalized_table_name = expected_table_name
    ) then
      raise exception 'DATASET_TABLE_REFERENCE_CONFLICT'
        using errcode = 'P0001', detail = format('dataset_id=%s table=%s', dataset_record.id, expected_table_name);
    end if;

    if relation_kind is not null and relation_kind not in ('r', 'p') then
      raise exception 'DATASET_RELATION_TYPE_INVALID'
        using errcode = 'P0001', detail = format('dataset_id=%s table=%s relkind=%s', dataset_record.id, expected_table_name, relation_kind);
    end if;
  end loop;
end;
$$;

create or replace function public.claim_stripe_webhook_event(
  p_event_id text,
  p_event_type text,
  p_event_created_at timestamptz,
  p_claim_token uuid,
  p_lease_seconds integer default 600
)
returns jsonb
language plpgsql
security definer
set search_path = pg_catalog, public
as $$
declare
  event_record public.stripe_webhook_events%rowtype;
  now_at timestamptz := timezone('utc', now());
begin
  if auth.role() <> 'service_role' then
    raise exception 'SERVICE_ROLE_REQUIRED' using errcode = '42501';
  end if;
  if p_event_id is null or p_event_type is null or p_event_created_at is null or p_claim_token is null
    or p_lease_seconds < 30 or p_lease_seconds > 3600 then
    raise exception 'STRIPE_EVENT_CLAIM_INVALID' using errcode = '22023';
  end if;
  perform pg_advisory_xact_lock(hashtextextended('stripe:' || p_event_id, 0));
  select * into event_record from public.stripe_webhook_events where event_id = p_event_id for update;

  if event_record.event_id is null then
    insert into public.stripe_webhook_events(
      event_id, event_type, status, stripe_created_at, processing_started_at, lease_expires_at, claim_token
    ) values (
      p_event_id, p_event_type, 'processing', p_event_created_at, now_at,
      now_at + make_interval(secs => p_lease_seconds), p_claim_token
    );
    return jsonb_build_object('claimed', true, 'reason', 'new', 'attempt', 1);
  end if;
  if event_record.event_type <> p_event_type or event_record.stripe_created_at <> p_event_created_at then
    raise exception 'STRIPE_EVENT_IDENTITY_MISMATCH' using errcode = 'P0001';
  end if;
  if event_record.status = 'completed' then
    return jsonb_build_object('claimed', false, 'reason', 'completed', 'attempt', event_record.attempts);
  end if;
  if event_record.status = 'processing' and event_record.lease_expires_at > now_at then
    return jsonb_build_object('claimed', false, 'reason', 'in_progress', 'attempt', event_record.attempts);
  end if;

  update public.stripe_webhook_events
  set status = 'processing', attempts = attempts + 1, last_error = null,
      processing_started_at = now_at, lease_expires_at = now_at + make_interval(secs => p_lease_seconds),
      claim_token = p_claim_token, updated_at = now_at
  where event_id = p_event_id;
  return jsonb_build_object(
    'claimed', true,
    'reason', case when event_record.status = 'failed' then 'retry' else 'stale_recovery' end,
    'attempt', event_record.attempts + 1
  );
end;
$$;

create or replace function public.apply_stripe_subscription_state(
  p_user_id uuid,
  p_customer_id text,
  p_subscription_id text,
  p_price_id text,
  p_plan text,
  p_status text,
  p_current_period_end timestamptz,
  p_cancel_at_period_end boolean,
  p_event_created_at timestamptz,
  p_event_id text
)
returns boolean
language plpgsql
security definer
set search_path = pg_catalog, public
as $$
declare
  existing_record public.account_subscriptions%rowtype;
  affected integer;
  effective_plan text;
begin
  if auth.role() <> 'service_role' then raise exception 'SERVICE_ROLE_REQUIRED' using errcode = '42501'; end if;
  if p_plan not in ('free', 'pro', 'enterprise')
    or p_status not in ('inactive', 'trialing', 'active', 'past_due', 'canceled', 'unpaid', 'incomplete', 'incomplete_expired', 'paused')
    or p_event_created_at is null or p_event_id is null then
    raise exception 'STRIPE_SUBSCRIPTION_STATE_INVALID' using errcode = '22023';
  end if;
  if not exists (select 1 from auth.users where id = p_user_id) then
    raise exception 'STRIPE_SUBSCRIPTION_OWNER_NOT_FOUND' using errcode = 'P0002';
  end if;
  perform pg_advisory_xact_lock(hashtextextended('stripe-subscription:' || p_user_id::text, 0));
  select * into existing_record from public.account_subscriptions where user_id = p_user_id for update;
  if existing_record.user_id is not null and existing_record.stripe_customer_id is not null
    and existing_record.stripe_customer_id <> p_customer_id then
    raise exception 'STRIPE_CUSTOMER_OWNERSHIP_MISMATCH' using errcode = 'P0001';
  end if;
  if existing_record.stripe_event_created_at is not null
    and p_event_created_at < existing_record.stripe_event_created_at then
    return false;
  end if;

  insert into public.account_subscriptions(
    user_id, stripe_customer_id, stripe_subscription_id, stripe_price_id, plan, status,
    current_period_end, cancel_at_period_end, stripe_event_created_at, stripe_event_id, updated_at
  ) values (
    p_user_id, p_customer_id, p_subscription_id, p_price_id, p_plan, p_status,
    p_current_period_end, p_cancel_at_period_end, p_event_created_at, p_event_id, timezone('utc', now())
  )
  on conflict (user_id) do update set
    stripe_customer_id = excluded.stripe_customer_id,
    stripe_subscription_id = excluded.stripe_subscription_id,
    stripe_price_id = excluded.stripe_price_id,
    plan = excluded.plan,
    status = excluded.status,
    current_period_end = excluded.current_period_end,
    cancel_at_period_end = excluded.cancel_at_period_end,
    stripe_event_created_at = excluded.stripe_event_created_at,
    stripe_event_id = excluded.stripe_event_id,
    updated_at = excluded.updated_at;
  get diagnostics affected = row_count;

  effective_plan := case when p_status in ('trialing', 'active', 'past_due') then p_plan else 'free' end;
  update public.user_roles
  set subscription_plan = effective_plan
  where user_id = p_user_id and admin_plan_override is null;
  return affected = 1;
end;
$$;

create or replace function public.apply_stripe_invoice_status(
  p_customer_id text,
  p_invoice_status text,
  p_event_created_at timestamptz
)
returns boolean
language plpgsql
security definer
set search_path = pg_catalog, public
as $$
declare
  affected integer;
begin
  if auth.role() <> 'service_role' then raise exception 'SERVICE_ROLE_REQUIRED' using errcode = '42501'; end if;
  update public.account_subscriptions
  set latest_invoice_status = p_invoice_status,
      latest_invoice_event_created_at = p_event_created_at,
      updated_at = timezone('utc', now())
  where stripe_customer_id = p_customer_id
    and (latest_invoice_event_created_at is null or p_event_created_at >= latest_invoice_event_created_at);
  get diagnostics affected = row_count;
  return affected = 1;
end;
$$;

create or replace function public.begin_account_deletion(
  p_user_id uuid,
  p_retry_token_hash text
)
returns jsonb
language plpgsql
security definer
set search_path = pg_catalog, public
as $$
declare
  request_id uuid;
  resources jsonb;
begin
  if auth.role() <> 'service_role' then
    raise exception 'SERVICE_ROLE_REQUIRED' using errcode = '42501';
  end if;
  perform pg_advisory_xact_lock(hashtextextended('account-delete:' || p_user_id::text, 0));
  if not exists (select 1 from auth.users where id = p_user_id) then
    raise exception 'ACCOUNT_NOT_FOUND' using errcode = 'P0002';
  end if;

  -- Validate every dynamic relation before changing account status or writing a
  -- deletion request. A mismatch aborts the transaction without partial loss.
  perform public.assert_account_dataset_tables(p_user_id);

  insert into public.user_roles(user_id, role, subscription_plan, status)
  values (p_user_id, 'standard', 'free', 'active')
  on conflict (user_id) do nothing;

  -- The existing trigger rejects suspending the last active SUPERADMIN.
  update public.user_roles
  set status = 'suspended', suspended_at = timezone('utc', now())
  where user_id = p_user_id;

  select jsonb_build_object(
    'dataset_count', (select count(*) from public.datasets where user_id = p_user_id),
    'report_count', (select count(*) from public.reports where user_id = p_user_id),
    'story_count', (select count(*) from public.stories where user_id = p_user_id),
    'export_count', (select count(*) from public.story_export_jobs where user_id = p_user_id),
    'datasets', coalesce((select jsonb_agg(jsonb_build_object(
      'id', id, 'table', normalized_table_name, 'file_url', file_url,
      'normalized_file_url', normalized_file_url, 'analytics_manifest_url', analytics_manifest_url
    )) from public.datasets where user_id = p_user_id), '[]'::jsonb),
    'export_job_ids', coalesce((select jsonb_agg(id) from public.story_export_jobs where user_id = p_user_id), '[]'::jsonb)
  ) into resources;

  insert into public.account_deletion_requests(user_id, status, retry_token_hash, resources)
  values (p_user_id, 'processing', p_retry_token_hash, resources)
  on conflict (user_id) do update set
    status = 'processing', retry_token_hash = excluded.retry_token_hash,
    resources = excluded.resources, attempts = public.account_deletion_requests.attempts + 1,
    last_error = null, last_error_stage = null, updated_at = timezone('utc', now())
  returning id into request_id;

  insert into public.admin_audit_log(actor_user_id, target_user_id, action, details)
  values (p_user_id, p_user_id, 'account_deletion_started', jsonb_build_object('request_id', request_id));
  return jsonb_build_object('request_id', request_id, 'resources', resources);
end;
$$;

create or replace function public.delete_account_product_data(p_user_id uuid, p_request_id uuid)
returns jsonb
language plpgsql
security definer
set search_path = pg_catalog, public
as $$
declare
  dataset_record record;
  deleted_counts jsonb;
begin
  if auth.role() <> 'service_role' then
    raise exception 'SERVICE_ROLE_REQUIRED' using errcode = '42501';
  end if;
  perform pg_advisory_xact_lock(hashtextextended('account-delete:' || p_user_id::text, 0));
  if not exists (
    select 1 from public.account_deletion_requests
    where id = p_request_id and user_id = p_user_id and status in ('processing', 'failed')
    for update
  ) then raise exception 'ACCOUNT_DELETION_REQUEST_INVALID' using errcode = 'P0001'; end if;

  -- Revalidate under the account advisory lock immediately before any mutation.
  perform public.assert_account_dataset_tables(p_user_id);

  select jsonb_build_object(
    'datasets', (select count(*) from public.datasets where user_id = p_user_id),
    'reports', (select count(*) from public.reports where user_id = p_user_id),
    'stories', (select count(*) from public.stories where user_id = p_user_id),
    'exports', (select count(*) from public.story_export_jobs where user_id = p_user_id)
  ) into deleted_counts;

  -- Use the same canonical naming function as normalized dataset sync. Never
  -- trust metadata as a DROP target, even after it passed equality validation.
  for dataset_record in
    select id, normalized_table_name from public.datasets where user_id = p_user_id order by id
  loop
    if dataset_record.normalized_table_name is not null then
      execute format('drop table if exists public.%I', public.normalized_dataset_table_name(dataset_record.id));
    end if;
  end loop;

  delete from public.public_report_snapshots where user_id = p_user_id;
  delete from public.public_story_snapshots where user_id = p_user_id;
  delete from public.story_export_jobs where user_id = p_user_id;
  delete from public.stories where user_id = p_user_id;
  delete from public.reports where user_id = p_user_id;
  delete from public.datasets where user_id = p_user_id;

  update public.account_deletion_requests
  set database_cleaned_at = coalesce(database_cleaned_at, timezone('utc', now())),
      status = 'processing', updated_at = timezone('utc', now())
  where id = p_request_id;
  return deleted_counts;
end;
$$;

revoke all on function public.assert_account_dataset_tables(uuid) from public, anon, authenticated;
revoke all on function public.claim_stripe_webhook_event(text, text, timestamptz, uuid, integer) from public, anon, authenticated;
revoke all on function public.apply_stripe_subscription_state(uuid, text, text, text, text, text, timestamptz, boolean, timestamptz, text) from public, anon, authenticated;
revoke all on function public.apply_stripe_invoice_status(text, text, timestamptz) from public, anon, authenticated;
revoke all on function public.begin_account_deletion(uuid, text) from public, anon, authenticated;
revoke all on function public.delete_account_product_data(uuid, uuid) from public, anon, authenticated;
grant execute on function public.assert_account_dataset_tables(uuid) to service_role;
grant execute on function public.claim_stripe_webhook_event(text, text, timestamptz, uuid, integer) to service_role;
grant execute on function public.apply_stripe_subscription_state(uuid, text, text, text, text, text, timestamptz, boolean, timestamptz, text) to service_role;
grant execute on function public.apply_stripe_invoice_status(text, text, timestamptz) to service_role;
grant execute on function public.begin_account_deletion(uuid, text) to service_role;
grant execute on function public.delete_account_product_data(uuid, uuid) to service_role;

commit;
