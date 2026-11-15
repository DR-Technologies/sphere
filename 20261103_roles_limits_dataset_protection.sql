begin;

create table if not exists public.user_roles (
  user_id uuid primary key references auth.users(id) on delete cascade,
  role text not null default 'standard' check (role in ('standard', 'superadmin')),
  created_at timestamptz not null default timezone('utc'::text, now()),
  updated_at timestamptz not null default timezone('utc'::text, now())
);

alter table public.user_roles enable row level security;

drop policy if exists user_roles_select_own on public.user_roles;
create policy user_roles_select_own
  on public.user_roles
  for select
  to authenticated
  using (auth.uid() = user_id);

revoke all on table public.user_roles from public, anon, authenticated;
grant select on table public.user_roles to authenticated;
grant all on table public.user_roles to service_role;

-- Verified Sphere owner account. The conditional insert keeps other environments
-- safe and does not assign elevated access to an unknown user.
insert into public.user_roles (user_id, role)
select id, 'superadmin'
from auth.users
where id = '9d55e891-07e7-4699-9049-2e5f8ce787b7'::uuid
on conflict (user_id) do update
set role = excluded.role,
    updated_at = timezone('utc'::text, now());

create or replace function public.get_current_user_limits()
returns jsonb
language plpgsql
stable
security definer
set search_path = public
as $$
declare
  v_user_role text;
begin
  if auth.uid() is null then
    raise exception 'AUTHENTICATION_REQUIRED' using errcode = '42501';
  end if;

  select role into v_user_role
  from public.user_roles
  where user_id = auth.uid();

  v_user_role := coalesce(v_user_role, 'standard');

  return jsonb_build_object(
    'role', v_user_role,
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
    where user_id = new.user_id and role = 'superadmin'
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

drop trigger if exists datasets_per_user_limit on public.datasets;
create trigger datasets_per_user_limit
  before insert or update of user_id on public.datasets
  for each row execute function public.enforce_datasets_per_user_limit();

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
    where user_id = new.user_id and role = 'superadmin'
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

drop trigger if exists reports_per_dataset_limit on public.reports;
create trigger reports_per_dataset_limit
  before insert or update of user_id, dataset_id on public.reports
  for each row execute function public.enforce_reports_per_dataset_limit();

-- Dataset deletion must never cascade into product entities. Individual Report
-- and Story lifecycle functions remain responsible for their own dependants.
alter table public.reports drop constraint if exists reports_dataset_id_fkey;
alter table public.reports
  add constraint reports_dataset_id_fkey
  foreign key (dataset_id) references public.datasets(id) on delete restrict not valid;

alter table public.stories drop constraint if exists stories_dataset_id_fkey;
alter table public.stories
  add constraint stories_dataset_id_fkey
  foreign key (dataset_id) references public.datasets(id) on delete restrict not valid;

alter table public.public_report_snapshots drop constraint if exists public_report_snapshots_dataset_id_fkey;
alter table public.public_report_snapshots
  add constraint public_report_snapshots_dataset_id_fkey
  foreign key (dataset_id) references public.datasets(id) on delete restrict not valid;

alter table public.public_story_snapshots drop constraint if exists public_story_snapshots_dataset_id_fkey;
alter table public.public_story_snapshots
  add constraint public_story_snapshots_dataset_id_fkey
  foreign key (dataset_id) references public.datasets(id) on delete restrict not valid;

create or replace function public.get_dataset_delete_dependencies(p_dataset_id uuid)
returns jsonb
language plpgsql
stable
security definer
set search_path = public
as $$
declare
  report_names jsonb;
  story_names jsonb;
  report_count integer;
  story_count integer;
begin
  if not exists (
    select 1 from public.datasets
    where id = p_dataset_id and user_id = auth.uid()
  ) then
    return null;
  end if;

  select count(*), coalesce(jsonb_agg(name order by created_at), '[]'::jsonb)
  into report_count, report_names
  from public.reports
  where dataset_id = p_dataset_id and user_id = auth.uid();

  select count(*), coalesce(jsonb_agg(title order by created_at), '[]'::jsonb)
  into story_count, story_names
  from public.stories
  where dataset_id = p_dataset_id and user_id = auth.uid();

  return jsonb_build_object(
    'report_count', report_count,
    'report_names', report_names,
    'story_count', story_count,
    'story_names', story_names
  );
end;
$$;

revoke all on function public.get_dataset_delete_dependencies(uuid) from public, anon;
grant execute on function public.get_dataset_delete_dependencies(uuid) to authenticated, service_role;

create or replace function public.delete_dataset_lifecycle(p_dataset_id uuid)
returns jsonb
language plpgsql
security definer
set search_path = public
as $$
declare
  dataset_record public.datasets%rowtype;
  dependencies jsonb;
  report_count integer;
  story_count integer;
begin
  select *
  into dataset_record
  from public.datasets
  where id = p_dataset_id and user_id = auth.uid()
  for update;

  if dataset_record.id is null then
    return null;
  end if;

  perform pg_advisory_xact_lock(hashtextextended(auth.uid()::text || ':' || p_dataset_id::text, 0));
  dependencies := public.get_dataset_delete_dependencies(p_dataset_id);
  report_count := coalesce((dependencies->>'report_count')::integer, 0);
  story_count := coalesce((dependencies->>'story_count')::integer, 0);

  if report_count > 0 then
    raise exception 'DATASET_HAS_REPORTS'
      using errcode = 'P0001', detail = dependencies::text;
  end if;

  if story_count > 0 then
    raise exception 'DATASET_HAS_STORIES'
      using errcode = 'P0001', detail = dependencies::text;
  end if;

  delete from public.datasets
  where id = p_dataset_id and user_id = auth.uid();

  if dataset_record.normalized_table_name is not null
    and dataset_record.normalized_table_name ~ '^dataset_[0-9a-f_]+$' then
    execute format('drop table if exists public.%I', dataset_record.normalized_table_name);
  end if;

  return jsonb_build_object(
    'file_url', dataset_record.file_url,
    'normalized_file_url', dataset_record.normalized_file_url,
    'analytics_manifest_url', dataset_record.analytics_manifest_url,
    'export_job_ids', '[]'::jsonb
  );
end;
$$;

revoke all on function public.delete_dataset_lifecycle(uuid) from public, anon;
grant execute on function public.delete_dataset_lifecycle(uuid) to authenticated, service_role;

commit;
