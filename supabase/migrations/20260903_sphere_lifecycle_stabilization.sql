begin;

create index if not exists reports_user_dataset_created_idx
  on public.reports(user_id, dataset_id, created_at desc);

alter table public.reports drop constraint if exists reports_dataset_id_fkey;
alter table public.reports
  add constraint reports_dataset_id_fkey
  foreign key (dataset_id) references public.datasets(id) on delete cascade not valid;

-- A report and its public artifact share one lifecycle. Stories deliberately keep
-- source_report_id nullable because they become independent after creation.
update public.public_report_snapshots
set revoked_at = timezone('utc'::text, now()), updated_at = timezone('utc'::text, now())
where report_id is null and revoked_at is null;

alter table public.public_report_snapshots
  drop constraint if exists public_report_snapshots_report_id_fkey;
alter table public.public_report_snapshots
  add constraint public_report_snapshots_report_id_fkey
  foreign key (report_id) references public.reports(id) on delete cascade not valid;

alter table public.public_story_snapshots
  drop constraint if exists public_story_snapshots_story_id_fkey;
alter table public.public_story_snapshots
  add constraint public_story_snapshots_story_id_fkey
  foreign key (story_id) references public.stories(id) on delete cascade not valid;

update public.public_story_snapshots
set revoked_at = timezone('utc'::text, now()), updated_at = timezone('utc'::text, now())
where story_id is null and revoked_at is null;

-- Keep only the newest publication active before enforcing one active snapshot
-- per private entity. Historical/revoked snapshots remain available to owners.
with ranked as (
  select id, row_number() over (
    partition by report_id
    order by published_at desc, created_at desc, id desc
  ) as position
  from public.public_report_snapshots
  where report_id is not null and revoked_at is null
)
update public.public_report_snapshots snapshot
set revoked_at = timezone('utc'::text, now()),
    updated_at = timezone('utc'::text, now())
from ranked
where snapshot.id = ranked.id and ranked.position > 1;

create unique index if not exists public_report_snapshots_one_active_idx
  on public.public_report_snapshots(report_id)
  where report_id is not null and revoked_at is null;

with ranked as (
  select id, row_number() over (
    partition by story_id
    order by published_at desc, created_at desc, id desc
  ) as position
  from public.public_story_snapshots
  where story_id is not null and revoked_at is null
)
update public.public_story_snapshots snapshot
set revoked_at = timezone('utc'::text, now()),
    updated_at = timezone('utc'::text, now())
from ranked
where snapshot.id = ranked.id and ranked.position > 1;

create unique index if not exists public_story_snapshots_one_active_idx
  on public.public_story_snapshots(story_id)
  where story_id is not null and revoked_at is null;

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

  if (
    select count(*)
    from public.reports
    where user_id = new.user_id and dataset_id = new.dataset_id
  ) >= 3 then
    raise exception 'REPORT_LIMIT_REACHED'
      using errcode = 'P0001', detail = 'A dataset can have at most 3 reports.';
  end if;

  return new;
end;
$$;

drop trigger if exists reports_per_dataset_limit on public.reports;
create trigger reports_per_dataset_limit
  before insert or update of user_id, dataset_id on public.reports
  for each row execute function public.enforce_reports_per_dataset_limit();

create or replace function public.delete_report_lifecycle(p_report_id uuid)
returns boolean
language plpgsql
security definer
set search_path = public
as $$
begin
  if not exists (
    select 1 from public.reports where id = p_report_id and user_id = auth.uid()
  ) then
    return false;
  end if;

  delete from public.public_report_snapshots
  where report_id = p_report_id and user_id = auth.uid();
  delete from public.reports
  where id = p_report_id and user_id = auth.uid();
  return true;
end;
$$;

create or replace function public.delete_story_lifecycle(p_story_id uuid)
returns boolean
language plpgsql
security definer
set search_path = public
as $$
begin
  if not exists (
    select 1 from public.stories where id = p_story_id and user_id = auth.uid()
  ) then
    return false;
  end if;

  delete from public.public_story_snapshots
  where story_id = p_story_id and user_id = auth.uid();
  delete from public.stories
  where id = p_story_id and user_id = auth.uid();
  return true;
end;
$$;

create or replace function public.delete_dataset_lifecycle(p_dataset_id uuid)
returns jsonb
language plpgsql
security definer
set search_path = public
as $$
declare
  dataset_record public.datasets%rowtype;
  export_job_ids jsonb;
begin
  select *
  into dataset_record
  from public.datasets
  where id = p_dataset_id and user_id = auth.uid();

  if dataset_record.id is null then
    return null;
  end if;

  select coalesce(jsonb_agg(job.id), '[]'::jsonb)
  into export_job_ids
  from public.story_export_jobs job
  join public.stories story on story.id = job.story_id
  where story.dataset_id = p_dataset_id and story.user_id = auth.uid();

  delete from public.public_report_snapshots where dataset_id = p_dataset_id and user_id = auth.uid();
  delete from public.public_story_snapshots where dataset_id = p_dataset_id and user_id = auth.uid();
  delete from public.stories where dataset_id = p_dataset_id and user_id = auth.uid();
  delete from public.reports where dataset_id = p_dataset_id and user_id = auth.uid();
  delete from public.datasets where id = p_dataset_id and user_id = auth.uid();

  if dataset_record.normalized_table_name is not null
    and dataset_record.normalized_table_name ~ '^dataset_[0-9a-f_]+$' then
    execute format('drop table if exists public.%I', dataset_record.normalized_table_name);
  end if;

  return jsonb_build_object(
    'file_url', dataset_record.file_url,
    'normalized_file_url', dataset_record.normalized_file_url,
    'analytics_manifest_url', dataset_record.analytics_manifest_url,
    'export_job_ids', export_job_ids
  );
end;
$$;

revoke all on function public.delete_report_lifecycle(uuid) from public, anon;
revoke all on function public.delete_story_lifecycle(uuid) from public, anon;
revoke all on function public.delete_dataset_lifecycle(uuid) from public, anon;
grant execute on function public.delete_report_lifecycle(uuid) to authenticated, service_role;
grant execute on function public.delete_story_lifecycle(uuid) to authenticated, service_role;
grant execute on function public.delete_dataset_lifecycle(uuid) to authenticated, service_role;

commit;
