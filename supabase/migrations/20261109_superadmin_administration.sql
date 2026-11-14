begin;

alter table public.user_roles
  add column if not exists subscription_plan text not null default 'free',
  add column if not exists status text not null default 'active',
  add column if not exists suspended_at timestamptz,
  add column if not exists suspended_by uuid references auth.users(id) on delete set null;

alter table public.user_roles
  drop constraint if exists user_roles_subscription_plan_check,
  add constraint user_roles_subscription_plan_check
    check (subscription_plan in ('free', 'pro', 'enterprise'));

alter table public.user_roles
  drop constraint if exists user_roles_status_check,
  add constraint user_roles_status_check
    check (status in ('active', 'suspended'));

create index if not exists user_roles_role_status_idx
  on public.user_roles (role, status);

create index if not exists user_roles_subscription_plan_idx
  on public.user_roles (subscription_plan);

create table if not exists public.admin_audit_log (
  id uuid primary key default gen_random_uuid(),
  actor_user_id uuid not null,
  target_user_id uuid references auth.users(id) on delete set null,
  action text not null,
  details jsonb not null default '{}'::jsonb,
  created_at timestamptz not null default timezone('utc'::text, now())
);

create index if not exists admin_audit_log_actor_created_idx
  on public.admin_audit_log (actor_user_id, created_at desc);

create index if not exists admin_audit_log_target_created_idx
  on public.admin_audit_log (target_user_id, created_at desc);

alter table public.admin_audit_log enable row level security;
revoke all on table public.admin_audit_log from public, anon, authenticated;
grant all on table public.admin_audit_log to service_role;

create or replace function public.touch_user_roles_updated_at()
returns trigger
language plpgsql
security invoker
set search_path = public
as $$
begin
  new.updated_at := timezone('utc'::text, now());
  return new;
end;
$$;

drop trigger if exists user_roles_touch_updated_at on public.user_roles;
create trigger user_roles_touch_updated_at
  before update on public.user_roles
  for each row execute function public.touch_user_roles_updated_at();

create or replace function public.protect_last_active_superadmin()
returns trigger
language plpgsql
security definer
set search_path = pg_catalog, public
as $$
declare
  removes_active_superadmin boolean;
  other_active_superadmins integer;
begin
  if tg_op = 'DELETE' then
    removes_active_superadmin := old.role = 'superadmin' and old.status = 'active';
  else
    removes_active_superadmin := old.role = 'superadmin'
      and old.status = 'active'
      and (new.role <> 'superadmin' or new.status <> 'active');
  end if;

  if not removes_active_superadmin then
    if tg_op = 'DELETE' then
      return old;
    end if;
    return new;
  end if;

  perform pg_advisory_xact_lock(hashtextextended('sphere:last-active-superadmin', 0));

  select count(*)
  into other_active_superadmins
  from public.user_roles
  where role = 'superadmin'
    and status = 'active'
    and user_id <> old.user_id;

  if other_active_superadmins = 0 then
    raise exception 'LAST_SUPERADMIN_REQUIRED'
      using errcode = 'P0001',
        detail = 'At least one active superadmin account must remain.';
  end if;

  if tg_op = 'DELETE' then
    return old;
  end if;
  return new;
end;
$$;

drop trigger if exists user_roles_protect_last_superadmin on public.user_roles;
create trigger user_roles_protect_last_superadmin
  before update of role, status or delete on public.user_roles
  for each row execute function public.protect_last_active_superadmin();

create or replace function public.is_current_account_active()
returns boolean
language sql
stable
security definer
set search_path = pg_catalog, public
as $$
  select case
    when auth.uid() is null then false
    else coalesce((
      select status = 'active'
      from public.user_roles
      where user_id = auth.uid()
    ), true)
  end;
$$;

revoke all on function public.is_current_account_active() from public;
grant execute on function public.is_current_account_active() to authenticated, service_role;

create or replace function public.enforce_active_account_request()
returns void
language plpgsql
stable
security definer
set search_path = pg_catalog, public
as $$
begin
  if auth.role() in ('anon', 'service_role') then
    return;
  end if;

  if auth.uid() is null then
    raise exception 'AUTHENTICATION_REQUIRED' using errcode = '42501';
  end if;

  if not public.is_current_account_active() then
    raise exception 'ACCOUNT_SUSPENDED'
      using errcode = '42501', detail = 'This Sphere account is suspended.';
  end if;
end;
$$;

revoke all on function public.enforce_active_account_request() from public;
grant execute on function public.enforce_active_account_request() to anon, authenticated, service_role;

drop policy if exists sphere_active_account_storage_guard on storage.objects;
create policy sphere_active_account_storage_guard
  on storage.objects
  as restrictive
  for all
  to authenticated
  using (public.is_current_account_active())
  with check (public.is_current_account_active());

-- PostgREST invokes this function before every API request. Auth banning prevents
-- new sessions; this check also blocks an already-issued JWT immediately.
alter role authenticator set pgrst.db_pre_request = 'public.enforce_active_account_request';
notify pgrst, 'reload config';

create or replace function public.get_current_user_limits()
returns jsonb
language plpgsql
stable
security definer
set search_path = pg_catalog, public
as $$
declare
  v_user_role text;
  current_plan text;
  current_status text;
begin
  if auth.uid() is null then
    raise exception 'AUTHENTICATION_REQUIRED' using errcode = '42501';
  end if;

  select role, subscription_plan, status
  into v_user_role, current_plan, current_status
  from public.user_roles
  where user_id = auth.uid();

  v_user_role := coalesce(v_user_role, 'standard');
  current_plan := coalesce(current_plan, 'free');
  current_status := coalesce(current_status, 'active');

  if current_status <> 'active' then
    raise exception 'ACCOUNT_SUSPENDED'
      using errcode = '42501', detail = 'This Sphere account is suspended.';
  end if;

  return jsonb_build_object(
    'role', v_user_role,
    'subscription_plan', current_plan,
    'status', current_status,
    'max_datasets', case when v_user_role = 'superadmin' then null else 3 end,
    'max_reports_per_dataset', case when v_user_role = 'superadmin' then null else 3 end,
    'max_widgets_per_report', 9
  );
end;
$$;

revoke all on function public.get_current_user_limits() from public, anon;
grant execute on function public.get_current_user_limits() to authenticated, service_role;

create or replace function public.enforce_datasets_per_user_limit()
returns trigger
language plpgsql
security invoker
set search_path = public
as $$
begin
  if tg_op = 'UPDATE' and old.user_id = new.user_id then
    return new;
  end if;

  perform pg_advisory_xact_lock(hashtextextended('datasets:' || new.user_id::text, 0));

  if exists (
    select 1 from public.user_roles
    where user_id = new.user_id
      and role = 'superadmin'
      and status = 'active'
  ) then
    return new;
  end if;

  if (select count(*) from public.datasets where user_id = new.user_id) >= 3 then
    raise exception 'DATASET_LIMIT_REACHED'
      using errcode = 'P0001', detail = 'A standard user can have at most 3 datasets.';
  end if;

  return new;
end;
$$;

create or replace function public.enforce_reports_per_dataset_limit()
returns trigger
language plpgsql
security invoker
set search_path = public
as $$
begin
  if tg_op = 'UPDATE'
    and old.user_id = new.user_id
    and old.dataset_id = new.dataset_id then
    return new;
  end if;

  perform pg_advisory_xact_lock(hashtextextended(new.user_id::text || ':' || new.dataset_id::text, 0));

  if exists (
    select 1 from public.user_roles
    where user_id = new.user_id
      and role = 'superadmin'
      and status = 'active'
  ) then
    return new;
  end if;

  if (
    select count(*)
    from public.reports
    where user_id = new.user_id and dataset_id = new.dataset_id
  ) >= 3 then
    raise exception 'REPORT_LIMIT_REACHED'
      using errcode = 'P0001', detail = 'A standard user can have at most 3 reports per dataset.';
  end if;

  return new;
end;
$$;

create or replace function public.admin_get_user_usage()
returns table (
  user_id uuid,
  role text,
  subscription_plan text,
  status text,
  dataset_count bigint,
  report_count bigint,
  story_count bigint,
  role_created_at timestamptz,
  role_updated_at timestamptz
)
language sql
stable
security definer
set search_path = pg_catalog, public
as $$
  with known_users as (
    select user_id from public.user_roles
    union
    select user_id from public.datasets
    union
    select user_id from public.reports
    union
    select user_id from public.stories
  ), dataset_usage as (
    select user_id, count(*) as dataset_count
    from public.datasets
    group by user_id
  ), report_usage as (
    select user_id, count(*) as report_count
    from public.reports
    group by user_id
  ), story_usage as (
    select user_id, count(*) as story_count
    from public.stories
    group by user_id
  )
  select
    users.user_id,
    coalesce(access.role, 'standard') as role,
    coalesce(access.subscription_plan, 'free') as subscription_plan,
    coalesce(access.status, 'active') as status,
    coalesce(dataset_usage.dataset_count, 0) as dataset_count,
    coalesce(report_usage.report_count, 0) as report_count,
    coalesce(story_usage.story_count, 0) as story_count,
    access.created_at as role_created_at,
    access.updated_at as role_updated_at
  from known_users users
  left join public.user_roles access on access.user_id = users.user_id
  left join dataset_usage on dataset_usage.user_id = users.user_id
  left join report_usage on report_usage.user_id = users.user_id
  left join story_usage on story_usage.user_id = users.user_id;
$$;

revoke all on function public.admin_get_user_usage() from public, anon, authenticated;
grant execute on function public.admin_get_user_usage() to service_role;

create or replace function public.admin_assert_actor(p_actor_user_id uuid)
returns void
language plpgsql
stable
security definer
set search_path = pg_catalog, public
as $$
begin
  if auth.role() <> 'service_role' then
    raise exception 'SERVICE_ROLE_REQUIRED' using errcode = '42501';
  end if;

  if not exists (
    select 1 from public.user_roles
    where user_id = p_actor_user_id
      and role = 'superadmin'
      and status = 'active'
  ) then
    raise exception 'SUPERADMIN_REQUIRED' using errcode = '42501';
  end if;
end;
$$;

revoke all on function public.admin_assert_actor(uuid) from public, anon, authenticated;
grant execute on function public.admin_assert_actor(uuid) to service_role;

create or replace function public.admin_set_user_access(
  p_actor_user_id uuid,
  p_target_user_id uuid,
  p_role text,
  p_subscription_plan text,
  p_status text,
  p_action text default 'user_access_updated'
)
returns jsonb
language plpgsql
security definer
set search_path = pg_catalog, public
as $$
declare
  previous_access public.user_roles%rowtype;
  updated_access public.user_roles%rowtype;
begin
  perform public.admin_assert_actor(p_actor_user_id);

  if p_role not in ('standard', 'superadmin') then
    raise exception 'INVALID_ACCOUNT_ROLE' using errcode = '22023';
  end if;
  if p_subscription_plan not in ('free', 'pro', 'enterprise') then
    raise exception 'INVALID_SUBSCRIPTION_PLAN' using errcode = '22023';
  end if;
  if p_status not in ('active', 'suspended') then
    raise exception 'INVALID_ACCOUNT_STATUS' using errcode = '22023';
  end if;
  if not exists (select 1 from auth.users where id = p_target_user_id) then
    raise exception 'TARGET_USER_NOT_FOUND' using errcode = 'P0002';
  end if;

  perform pg_advisory_xact_lock(hashtextextended('sphere:user-access:' || p_target_user_id::text, 0));

  insert into public.user_roles (user_id)
  values (p_target_user_id)
  on conflict (user_id) do nothing;

  select * into previous_access
  from public.user_roles
  where user_id = p_target_user_id
  for update;

  if p_actor_user_id = p_target_user_id
    and (p_role <> previous_access.role or p_status <> previous_access.status) then
    raise exception 'ADMIN_SELF_ACCESS_CHANGE_FORBIDDEN'
      using errcode = 'P0001',
        detail = 'A superadmin cannot change their own security role or account status.';
  end if;

  update public.user_roles
  set role = p_role,
      subscription_plan = p_subscription_plan,
      status = p_status,
      suspended_at = case when p_status = 'suspended' then timezone('utc'::text, now()) else null end,
      suspended_by = case when p_status = 'suspended' then p_actor_user_id else null end
  where user_id = p_target_user_id
  returning * into updated_access;

  insert into public.admin_audit_log (actor_user_id, target_user_id, action, details)
  values (
    p_actor_user_id,
    p_target_user_id,
    p_action,
    jsonb_build_object(
      'previous', jsonb_build_object(
        'role', previous_access.role,
        'subscription_plan', previous_access.subscription_plan,
        'status', previous_access.status
      ),
      'current', jsonb_build_object(
        'role', updated_access.role,
        'subscription_plan', updated_access.subscription_plan,
        'status', updated_access.status
      )
    )
  );

  return jsonb_build_object(
    'user_id', updated_access.user_id,
    'role', updated_access.role,
    'subscription_plan', updated_access.subscription_plan,
    'status', updated_access.status,
    'updated_at', updated_access.updated_at
  );
end;
$$;

revoke all on function public.admin_set_user_access(uuid, uuid, text, text, text, text)
  from public, anon, authenticated;
grant execute on function public.admin_set_user_access(uuid, uuid, text, text, text, text)
  to service_role;

create or replace function public.admin_record_action(
  p_actor_user_id uuid,
  p_target_user_id uuid,
  p_action text,
  p_details jsonb default '{}'::jsonb
)
returns uuid
language plpgsql
security definer
set search_path = pg_catalog, public
as $$
declare
  audit_id uuid;
begin
  perform public.admin_assert_actor(p_actor_user_id);

  insert into public.admin_audit_log (actor_user_id, target_user_id, action, details)
  values (p_actor_user_id, p_target_user_id, p_action, coalesce(p_details, '{}'::jsonb))
  returning id into audit_id;

  return audit_id;
end;
$$;

revoke all on function public.admin_record_action(uuid, uuid, text, jsonb)
  from public, anon, authenticated;
grant execute on function public.admin_record_action(uuid, uuid, text, jsonb)
  to service_role;

commit;
