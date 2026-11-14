begin;

-- Stop before changing access if historical rows violate the ownership
-- invariant. The operator can inspect and repair them without this migration
-- silently hiding or reassigning data.
do $$
begin
  if not exists (select 1 from storage.buckets where id = 'files') then
    raise exception 'FILES_BUCKET_MISSING' using errcode = 'P0002';
  end if;

  if exists (
    select 1
    from public.reports report
    left join public.datasets dataset on dataset.id = report.dataset_id
    where dataset.id is null or dataset.user_id <> report.user_id
  ) then
    raise exception 'REPORT_DATASET_OWNER_MISMATCH_PRECHECK'
      using errcode = '23503';
  end if;

  if exists (
    select 1
    from public.public_report_snapshots snapshot
    left join public.datasets dataset on dataset.id = snapshot.dataset_id
    left join public.reports report on report.id = snapshot.report_id
    where dataset.id is null
      or dataset.user_id <> snapshot.user_id
      or (
        snapshot.report_id is not null
        and (
          report.id is null
          or report.user_id <> snapshot.user_id
          or report.dataset_id <> snapshot.dataset_id
        )
      )
  ) then
    raise exception 'PUBLIC_SNAPSHOT_OWNER_MISMATCH_PRECHECK'
      using errcode = '23503';
  end if;

  if exists (
    select 1
    from public.stories story
    left join public.datasets dataset on dataset.id = story.dataset_id
    left join public.reports report on report.id = story.source_report_id
    where dataset.id is null
      or dataset.user_id <> story.user_id
      or (
        story.source_report_id is not null
        and (
          report.id is null
          or report.user_id <> story.user_id
          or report.dataset_id <> story.dataset_id
        )
      )
  ) then
    raise exception 'STORY_PARENT_OWNER_MISMATCH_PRECHECK'
      using errcode = '23503';
  end if;

  if exists (
    select 1
    from public.public_story_snapshots snapshot
    left join public.datasets dataset on dataset.id = snapshot.dataset_id
    left join public.stories story on story.id = snapshot.story_id
    where dataset.id is null
      or dataset.user_id <> snapshot.user_id
      or (
        snapshot.story_id is not null
        and (
          story.id is null
          or story.user_id <> snapshot.user_id
          or story.dataset_id <> snapshot.dataset_id
        )
      )
  ) then
    raise exception 'PUBLIC_STORY_SNAPSHOT_OWNER_MISMATCH_PRECHECK'
      using errcode = '23503';
  end if;

  if exists (
    select 1
    from public.story_export_jobs export_job
    left join public.stories story on story.id = export_job.story_id
    where story.id is null or story.user_id <> export_job.user_id
  ) then
    raise exception 'STORY_EXPORT_OWNER_MISMATCH_PRECHECK'
      using errcode = '23503';
  end if;

  if exists (
    select 1
    from public.datasets dataset
    where dataset.normalized_table_name is not null
      and (
        dataset.normalized_table_name <> 'dataset_' || replace(dataset.id::text, '-', '_')
        or to_regclass(format('public.%I', dataset.normalized_table_name)) is null
      )
  ) then
    raise exception 'NORMALIZED_DATASET_RELATION_MISMATCH_PRECHECK'
      using errcode = '42P01';
  end if;

  if exists (
    select 1
    from storage.objects object
    where object.bucket_id = 'files'
      and not exists (
        select 1 from auth.users account
        where account.id::text = split_part(object.name, '/', 1)
      )
  ) then
    raise exception 'FILES_OBJECT_OWNER_PREFIX_MISMATCH_PRECHECK'
      using errcode = '23503';
  end if;

  if exists (
    select 1
    from public.datasets dataset
    cross join lateral (values
      (dataset.file_url),
      (dataset.normalized_file_url),
      (dataset.analytics_manifest_url)
    ) as reference(value)
    cross join lateral (
      select case
        when reference.value is null or btrim(reference.value) = '' then null
        when reference.value like '%/storage/v1/object/public/files/%'
          then split_part(split_part(reference.value, '/storage/v1/object/public/files/', 2), '?', 1)
        when reference.value like '%/storage/v1/object/sign/files/%'
          then split_part(split_part(reference.value, '/storage/v1/object/sign/files/', 2), '?', 1)
        when reference.value like '%/storage/v1/object/authenticated/files/%'
          then split_part(split_part(reference.value, '/storage/v1/object/authenticated/files/', 2), '?', 1)
        when reference.value like 'files/%'
          then split_part(substr(reference.value, length('files/') + 1), '?', 1)
        when reference.value not like '%://%'
          then split_part(reference.value, '?', 1)
        else null
      end as object_path
    ) normalized_reference
    where reference.value is not null
      and (
        normalized_reference.object_path is null
        or normalized_reference.object_path not like dataset.user_id::text || '/%'
      )
  ) then
    raise exception 'DATASET_ARTIFACT_OWNER_PREFIX_MISMATCH_PRECHECK'
      using errcode = '23503';
  end if;
end
$$;

-- Private product entities are never readable through the anonymous API. Public
-- sharing continues exclusively through materialized snapshot tables.
alter table public.datasets enable row level security;
alter table public.reports enable row level security;

revoke all on table public.datasets from public, anon;
revoke all on table public.reports from public, anon;
revoke all on table public.datasets from authenticated;
revoke all on table public.reports from authenticated;
grant select, insert, update, delete on table public.datasets to authenticated;
grant select, insert, update, delete on table public.reports to authenticated;

-- Replace every historical Dataset policy. Unknown permissive policies cannot
-- be retained because they could preserve anonymous or cross-owner access.
do $$
declare
  policy_record record;
begin
  for policy_record in
    select policyname
    from pg_policies
    where schemaname = 'public' and tablename = 'datasets'
  loop
    execute format('drop policy %I on public.datasets', policy_record.policyname);
  end loop;
end
$$;

create policy datasets_select_own
  on public.datasets for select to authenticated
  using (user_id = auth.uid());

create policy datasets_insert_own
  on public.datasets for insert to authenticated
  with check (user_id = auth.uid());

create policy datasets_update_own
  on public.datasets for update to authenticated
  using (user_id = auth.uid())
  with check (user_id = auth.uid());

create policy datasets_delete_own
  on public.datasets for delete to authenticated
  using (user_id = auth.uid());

create policy datasets_authenticated_owner_guard
  on public.datasets
  as restrictive
  for all
  to authenticated
  using (user_id = auth.uid())
  with check (user_id = auth.uid());

-- Remove every historical reports policy before installing the canonical owner
-- policies. The repository did not contain the original reports RLS migration,
-- so retaining unknown policies could preserve an anonymous/cross-owner path.
do $$
declare
  policy_record record;
begin
  for policy_record in
    select policyname
    from pg_policies
    where schemaname = 'public' and tablename = 'reports'
  loop
    execute format('drop policy %I on public.reports', policy_record.policyname);
  end loop;
end
$$;

create policy reports_select_own
  on public.reports for select to authenticated
  using (
    user_id = auth.uid()
    and exists (
      select 1 from public.datasets dataset
      where dataset.id = reports.dataset_id
        and dataset.user_id = auth.uid()
    )
  );

create policy reports_insert_own
  on public.reports for insert to authenticated
  with check (
    user_id = auth.uid()
    and exists (
      select 1 from public.datasets dataset
      where dataset.id = reports.dataset_id
        and dataset.user_id = auth.uid()
    )
  );

create policy reports_update_own
  on public.reports for update to authenticated
  using (
    user_id = auth.uid()
    and exists (
      select 1 from public.datasets dataset
      where dataset.id = reports.dataset_id
        and dataset.user_id = auth.uid()
    )
  )
  with check (
    user_id = auth.uid()
    and exists (
      select 1 from public.datasets dataset
      where dataset.id = reports.dataset_id
        and dataset.user_id = auth.uid()
    )
  );

create policy reports_delete_own
  on public.reports for delete to authenticated
  using (
    user_id = auth.uid()
    and exists (
      select 1 from public.datasets dataset
      where dataset.id = reports.dataset_id
        and dataset.user_id = auth.uid()
    )
  );

create or replace function public.enforce_report_dataset_owner()
returns trigger
language plpgsql
security definer
set search_path = pg_catalog, public
as $$
begin
  if not exists (
    select 1
    from public.datasets dataset
    where dataset.id = new.dataset_id
      and dataset.user_id = new.user_id
  ) then
    raise exception 'REPORT_DATASET_OWNER_MISMATCH'
      using errcode = '23503', detail = 'Report owner must own the referenced dataset.';
  end if;
  return new;
end;
$$;

revoke all on function public.enforce_report_dataset_owner() from public, anon, authenticated;

drop trigger if exists reports_dataset_owner_guard on public.reports;
create trigger reports_dataset_owner_guard
  before insert or update of user_id, dataset_id on public.reports
  for each row execute function public.enforce_report_dataset_owner();

alter table public.stories enable row level security;
revoke all on table public.stories from public, anon, authenticated;
grant select, insert, update, delete on table public.stories to authenticated;

do $$
declare
  policy_record record;
begin
  for policy_record in
    select policyname
    from pg_policies
    where schemaname = 'public' and tablename = 'stories'
  loop
    execute format('drop policy %I on public.stories', policy_record.policyname);
  end loop;
end
$$;

create policy stories_select_own
  on public.stories for select to authenticated
  using (
    user_id = auth.uid()
    and exists (
      select 1 from public.datasets dataset
      where dataset.id = stories.dataset_id
        and dataset.user_id = auth.uid()
    )
  );

create policy stories_insert_own
  on public.stories for insert to authenticated
  with check (
    user_id = auth.uid()
    and exists (
      select 1 from public.datasets dataset
      where dataset.id = stories.dataset_id
        and dataset.user_id = auth.uid()
    )
    and (
      source_report_id is null
      or exists (
        select 1 from public.reports report
        where report.id = stories.source_report_id
          and report.dataset_id = stories.dataset_id
          and report.user_id = auth.uid()
      )
    )
  );

create policy stories_update_own
  on public.stories for update to authenticated
  using (user_id = auth.uid())
  with check (
    user_id = auth.uid()
    and exists (
      select 1 from public.datasets dataset
      where dataset.id = stories.dataset_id
        and dataset.user_id = auth.uid()
    )
    and (
      source_report_id is null
      or exists (
        select 1 from public.reports report
        where report.id = stories.source_report_id
          and report.dataset_id = stories.dataset_id
          and report.user_id = auth.uid()
      )
    )
  );

create policy stories_delete_own
  on public.stories for delete to authenticated
  using (user_id = auth.uid());

create or replace function public.enforce_story_parent_owner()
returns trigger
language plpgsql
security definer
set search_path = pg_catalog, public
as $$
begin
  if not exists (
    select 1 from public.datasets dataset
    where dataset.id = new.dataset_id
      and dataset.user_id = new.user_id
  ) then
    raise exception 'STORY_DATASET_OWNER_MISMATCH'
      using errcode = '23503';
  end if;

  if new.source_report_id is not null and not exists (
    select 1 from public.reports report
    where report.id = new.source_report_id
      and report.dataset_id = new.dataset_id
      and report.user_id = new.user_id
  ) then
    raise exception 'STORY_REPORT_OWNER_MISMATCH'
      using errcode = '23503';
  end if;
  return new;
end;
$$;

revoke all on function public.enforce_story_parent_owner() from public, anon, authenticated;

drop trigger if exists stories_parent_owner_guard on public.stories;
create trigger stories_parent_owner_guard
  before insert or update of user_id, dataset_id, source_report_id on public.stories
  for each row execute function public.enforce_story_parent_owner();

create or replace function public.enforce_public_report_snapshot_owner()
returns trigger
language plpgsql
security definer
set search_path = pg_catalog, public
as $$
begin
  if not exists (
    select 1
    from public.datasets dataset
    where dataset.id = new.dataset_id
      and dataset.user_id = new.user_id
  ) then
    raise exception 'SNAPSHOT_DATASET_OWNER_MISMATCH'
      using errcode = '23503', detail = 'Snapshot owner must own the referenced dataset.';
  end if;

  if new.report_id is not null and not exists (
    select 1
    from public.reports report
    where report.id = new.report_id
      and report.user_id = new.user_id
      and report.dataset_id = new.dataset_id
  ) then
    raise exception 'SNAPSHOT_REPORT_OWNER_MISMATCH'
      using errcode = '23503', detail = 'Snapshot report, dataset, and owner must match.';
  end if;
  return new;
end;
$$;

revoke all on function public.enforce_public_report_snapshot_owner() from public, anon, authenticated;

drop trigger if exists public_report_snapshot_owner_guard on public.public_report_snapshots;
create trigger public_report_snapshot_owner_guard
  before insert or update of report_id, dataset_id, user_id on public.public_report_snapshots
  for each row execute function public.enforce_public_report_snapshot_owner();

alter table public.public_report_snapshots enable row level security;

-- Replace every historical Snapshot policy. Public reads are recreated below
-- with an explicit revoked_at guard; private management remains owner-scoped.
do $$
declare
  policy_record record;
begin
  for policy_record in
    select policyname
    from pg_policies
    where schemaname = 'public'
      and tablename = 'public_report_snapshots'
  loop
    execute format(
      'drop policy %I on public.public_report_snapshots',
      policy_record.policyname
    );
  end loop;
end
$$;

revoke all on table public.public_report_snapshots from public, anon, authenticated;
grant select, insert, update, delete on table public.public_report_snapshots to authenticated;

create policy public_report_snapshots_select_own
  on public.public_report_snapshots for select to authenticated
  using (user_id = auth.uid());

create policy public_report_snapshots_insert_own
  on public.public_report_snapshots for insert to authenticated
  with check (
    user_id = auth.uid()
    and exists (
      select 1 from public.datasets dataset
      where dataset.id = public_report_snapshots.dataset_id
        and dataset.user_id = auth.uid()
    )
    and (
      report_id is null
      or exists (
        select 1 from public.reports report
        where report.id = public_report_snapshots.report_id
          and report.dataset_id = public_report_snapshots.dataset_id
          and report.user_id = auth.uid()
      )
    )
  );

create policy public_report_snapshots_update_own
  on public.public_report_snapshots for update to authenticated
  using (user_id = auth.uid())
  with check (
    user_id = auth.uid()
    and exists (
      select 1 from public.datasets dataset
      where dataset.id = public_report_snapshots.dataset_id
        and dataset.user_id = auth.uid()
    )
    and (
      report_id is null
      or exists (
        select 1 from public.reports report
        where report.id = public_report_snapshots.report_id
          and report.dataset_id = public_report_snapshots.dataset_id
          and report.user_id = auth.uid()
      )
    )
  );

create policy public_report_snapshots_delete_own
  on public.public_report_snapshots for delete to authenticated
  using (user_id = auth.uid());

create or replace function public.get_public_report_snapshot(p_slug text)
returns jsonb
language sql
stable
security definer
set search_path = pg_catalog
as $$
  select to_jsonb(snapshot)
  from public.public_report_snapshots snapshot
  where snapshot.slug = p_slug
    and snapshot.revoked_at is null
  limit 1
$$;

revoke all on function public.get_public_report_snapshot(text) from public, anon, authenticated;
grant execute on function public.get_public_report_snapshot(text) to anon, authenticated;

create or replace function public.enforce_public_story_snapshot_owner()
returns trigger
language plpgsql
security definer
set search_path = pg_catalog, public
as $$
begin
  if not exists (
    select 1 from public.datasets dataset
    where dataset.id = new.dataset_id
      and dataset.user_id = new.user_id
  ) then
    raise exception 'STORY_SNAPSHOT_DATASET_OWNER_MISMATCH'
      using errcode = '23503';
  end if;

  if new.story_id is not null and not exists (
    select 1 from public.stories story
    where story.id = new.story_id
      and story.dataset_id = new.dataset_id
      and story.user_id = new.user_id
  ) then
    raise exception 'STORY_SNAPSHOT_PARENT_OWNER_MISMATCH'
      using errcode = '23503';
  end if;
  return new;
end;
$$;

revoke all on function public.enforce_public_story_snapshot_owner() from public, anon, authenticated;

drop trigger if exists public_story_snapshot_owner_guard on public.public_story_snapshots;
create trigger public_story_snapshot_owner_guard
  before insert or update of story_id, dataset_id, user_id on public.public_story_snapshots
  for each row execute function public.enforce_public_story_snapshot_owner();

alter table public.public_story_snapshots enable row level security;
revoke all on table public.public_story_snapshots from public, anon, authenticated;
grant select, insert, update, delete on table public.public_story_snapshots to authenticated;

do $$
declare
  policy_record record;
begin
  for policy_record in
    select policyname
    from pg_policies
    where schemaname = 'public' and tablename = 'public_story_snapshots'
  loop
    execute format('drop policy %I on public.public_story_snapshots', policy_record.policyname);
  end loop;
end
$$;

create policy public_story_snapshots_select_own
  on public.public_story_snapshots for select to authenticated
  using (user_id = auth.uid());

create policy public_story_snapshots_insert_own
  on public.public_story_snapshots for insert to authenticated
  with check (
    user_id = auth.uid()
    and exists (
      select 1 from public.datasets dataset
      where dataset.id = public_story_snapshots.dataset_id
        and dataset.user_id = auth.uid()
    )
    and (
      story_id is null
      or exists (
        select 1 from public.stories story
        where story.id = public_story_snapshots.story_id
          and story.dataset_id = public_story_snapshots.dataset_id
          and story.user_id = auth.uid()
      )
    )
  );

create policy public_story_snapshots_update_own
  on public.public_story_snapshots for update to authenticated
  using (user_id = auth.uid())
  with check (
    user_id = auth.uid()
    and exists (
      select 1 from public.datasets dataset
      where dataset.id = public_story_snapshots.dataset_id
        and dataset.user_id = auth.uid()
    )
    and (
      story_id is null
      or exists (
        select 1 from public.stories story
        where story.id = public_story_snapshots.story_id
          and story.dataset_id = public_story_snapshots.dataset_id
          and story.user_id = auth.uid()
      )
    )
  );

create policy public_story_snapshots_delete_own
  on public.public_story_snapshots for delete to authenticated
  using (user_id = auth.uid());

create or replace function public.get_public_story_snapshot(p_slug text)
returns jsonb
language sql
stable
security definer
set search_path = pg_catalog
as $$
  select to_jsonb(snapshot)
  from public.public_story_snapshots snapshot
  where snapshot.slug = p_slug
    and snapshot.revoked_at is null
  limit 1
$$;

revoke all on function public.get_public_story_snapshot(text) from public, anon, authenticated;
grant execute on function public.get_public_story_snapshot(text) to anon, authenticated;

create or replace function public.enforce_story_export_owner()
returns trigger
language plpgsql
security definer
set search_path = pg_catalog, public
as $$
begin
  if not exists (
    select 1 from public.stories story
    where story.id = new.story_id
      and story.user_id = new.user_id
  ) then
    raise exception 'STORY_EXPORT_OWNER_MISMATCH'
      using errcode = '23503';
  end if;
  return new;
end;
$$;

revoke all on function public.enforce_story_export_owner() from public, anon, authenticated;

drop trigger if exists story_export_owner_guard on public.story_export_jobs;
create trigger story_export_owner_guard
  before insert or update of story_id, user_id on public.story_export_jobs
  for each row execute function public.enforce_story_export_owner();

alter table public.story_export_jobs enable row level security;
revoke all on table public.story_export_jobs from public, anon, authenticated;
grant select, insert, update, delete on table public.story_export_jobs to authenticated;

do $$
declare
  policy_record record;
begin
  for policy_record in
    select policyname
    from pg_policies
    where schemaname = 'public' and tablename = 'story_export_jobs'
  loop
    execute format('drop policy %I on public.story_export_jobs', policy_record.policyname);
  end loop;
end
$$;

create policy story_export_jobs_select_own
  on public.story_export_jobs for select to authenticated
  using (user_id = auth.uid());

create policy story_export_jobs_insert_own
  on public.story_export_jobs for insert to authenticated
  with check (
    user_id = auth.uid()
    and exists (
      select 1 from public.stories story
      where story.id = story_export_jobs.story_id
        and story.user_id = auth.uid()
    )
  );

create policy story_export_jobs_update_own
  on public.story_export_jobs for update to authenticated
  using (user_id = auth.uid())
  with check (
    user_id = auth.uid()
    and exists (
      select 1 from public.stories story
      where story.id = story_export_jobs.story_id
        and story.user_id = auth.uid()
    )
  );

create policy story_export_jobs_delete_own
  on public.story_export_jobs for delete to authenticated
  using (user_id = auth.uid());

-- Definitive analytical tables remain dynamic, but are no longer reachable
-- through a definer-owned arbitrary SQL executor. Each table gets an owner-only
-- RLS policy and the query RPC runs with the caller's own database privileges.
create or replace function public.secure_normalized_dataset_table(p_dataset_id uuid)
returns void
language plpgsql
security definer
set search_path = pg_catalog, public
as $$
declare
  dataset_record record;
  expected_table_name text;
begin
  select id, user_id, normalized_table_name
  into dataset_record
  from public.datasets
  where id = p_dataset_id;

  if not found or dataset_record.normalized_table_name is null then
    return;
  end if;

  expected_table_name := 'dataset_' || replace(dataset_record.id::text, '-', '_');
  if dataset_record.normalized_table_name <> expected_table_name
    or to_regclass(format('public.%I', expected_table_name)) is null then
    raise exception 'NORMALIZED_DATASET_RELATION_MISMATCH'
      using errcode = '42P01';
  end if;

  execute format('alter table public.%I enable row level security', expected_table_name);
  execute format(
    'revoke all on table public.%I from public, anon, authenticated',
    expected_table_name
  );
  execute format('grant select on table public.%I to authenticated, service_role', expected_table_name);
  execute format('drop policy if exists normalized_dataset_owner_select on public.%I', expected_table_name);
  execute format(
    'create policy normalized_dataset_owner_select on public.%I for select to authenticated using (auth.uid() = %L::uuid)',
    expected_table_name,
    dataset_record.user_id::text
  );
end;
$$;

revoke all on function public.secure_normalized_dataset_table(uuid) from public, anon, authenticated;

create or replace function public.secure_normalized_dataset_table_trigger()
returns trigger
language plpgsql
security definer
set search_path = pg_catalog, public
as $$
begin
  if new.normalized_table_name is not null then
    perform public.secure_normalized_dataset_table(new.id);
  end if;
  return new;
end;
$$;

revoke all on function public.secure_normalized_dataset_table_trigger() from public, anon, authenticated;

drop trigger if exists datasets_secure_normalized_table on public.datasets;
create trigger datasets_secure_normalized_table
  after insert or update of normalized_table_name, user_id on public.datasets
  for each row execute function public.secure_normalized_dataset_table_trigger();

do $$
declare
  dataset_record record;
begin
  for dataset_record in
    select id from public.datasets
    where normalized_table_name is not null
    order by id
  loop
    perform public.secure_normalized_dataset_table(dataset_record.id);
  end loop;
end
$$;

create or replace function public.run_dataset_query(
  p_dataset_id uuid,
  p_query text
)
returns table (row_data jsonb)
language plpgsql
security invoker
set search_path = pg_catalog
as $$
declare
  table_name text;
  rewritten_query text;
  validation_query text;
  query_index integer := 1;
  query_length integer;
  query_char text;
  next_char text;
  in_string_literal boolean := false;
  in_quoted_identifier boolean := false;
  from_clause text;
  from_position integer;
  dataset_position integer;
  started_at timestamptz := clock_timestamp();
  duration_ms numeric;
  error_state text;
  error_message text;
  error_detail text;
  error_hint text;
begin
  if auth.uid() is null and auth.role() <> 'service_role' then
    raise exception 'Authenticated session required' using errcode = '28000';
  end if;

  select normalized_table_name
  into table_name
  from public.datasets
  where id = p_dataset_id
    and (user_id = auth.uid() or auth.role() = 'service_role');

  if table_name is null then
    raise exception 'Normalized dataset table not found for dataset %', p_dataset_id
      using errcode = '42P01';
  end if;
  if table_name <> 'dataset_' || replace(p_dataset_id::text, '-', '_')
    or to_regclass(format('public.%I', table_name)) is null then
    raise exception 'Normalized dataset relation is invalid for dataset %', p_dataset_id
      using errcode = '42P01';
  end if;

  if p_query is null then
    raise exception 'Only one generated SELECT from dataset is supported'
      using errcode = '22023';
  end if;

  -- Preserve character positions while blanking string values and quoted
  -- identifiers. This lets the rewrite target the parsed FROM token without
  -- touching a value such as 'dataset' or a column named "dataset".
  validation_query := '';
  query_length := char_length(p_query);
  while query_index <= query_length loop
    query_char := substr(p_query, query_index, 1);
    next_char := case
      when query_index < query_length then substr(p_query, query_index + 1, 1)
      else ''
    end;

    if in_string_literal then
      validation_query := validation_query || ' ';
      if query_char = '''' then
        if next_char = '''' then
          validation_query := validation_query || ' ';
          query_index := query_index + 2;
          continue;
        end if;
        in_string_literal := false;
      end if;
    elsif in_quoted_identifier then
      validation_query := validation_query || ' ';
      if query_char = '"' then
        if next_char = '"' then
          validation_query := validation_query || ' ';
          query_index := query_index + 2;
          continue;
        end if;
        in_quoted_identifier := false;
      end if;
    elsif query_char = '''' then
      in_string_literal := true;
      validation_query := validation_query || ' ';
    elsif query_char = '"' then
      in_quoted_identifier := true;
      validation_query := validation_query || ' ';
    else
      validation_query := validation_query || query_char;
    end if;

    query_index := query_index + 1;
  end loop;

  if in_string_literal or in_quoted_identifier then
    raise exception 'Generated dataset query contains an unterminated value or identifier'
      using errcode = '22023';
  end if;

  if validation_query !~* '^[[:space:]]*select[[:space:]]'
    or validation_query !~* '\mfrom[[:space:]]+dataset[[:space:]]*(where|group[[:space:]]+by|order[[:space:]]+by|limit|$)'
    or (select count(*) from regexp_matches(validation_query, '\mselect\M', 'gi')) <> 1
    or (select count(*) from regexp_matches(validation_query, '\mdataset\M', 'gi')) <> 1
    or validation_query ~ '(;|--|/\*|\*/|\$)'
    or validation_query ~* '\m(join|union|intersect|except|with|into|copy|insert|update|delete|alter|drop|create|grant|revoke|set|show|lateral|table|values|call|do|execute)\M'
    or validation_query ~* '\m(public|auth|storage|information_schema|pg_catalog)[[:space:]]*\.'
    or validation_query ~* '"column"[[:space:]]*\.'
    or validation_query ~* '\m(pg_sleep|set_config|current_setting|dblink|lo_import|lo_export)[[:space:]]*\('
  then
    raise exception 'Only one generated SELECT from dataset is supported'
      using errcode = '22023';
  end if;

  from_clause := substring(lower(validation_query) from '\mfrom[[:space:]]+dataset\M');
  from_position := strpos(lower(validation_query), from_clause);
  dataset_position := from_position + strpos(from_clause, 'dataset') - 1;
  if from_clause is null or from_position <= 0 or dataset_position <= 0 then
    raise exception 'Generated dataset query is missing its dataset source'
      using errcode = '22023';
  end if;

  rewritten_query := overlay(
    p_query placing format('public.%I', table_name)
    from dataset_position for char_length('dataset')
  );

  begin
    return query execute format(
      'select to_jsonb(q) from (%s) q limit 1000',
      rewritten_query
    );
  exception
    when others then
      get stacked diagnostics
        error_state = returned_sqlstate,
        error_message = message_text,
        error_detail = pg_exception_detail,
        error_hint = pg_exception_hint;
      raise log 'sphere dataset query failed dataset=% table=% query_hash=% duration_ms=% code=% message=% detail=% hint=%',
        p_dataset_id, table_name, md5(p_query),
        round(extract(epoch from (clock_timestamp() - started_at)) * 1000, 3),
        error_state, error_message, error_detail, error_hint;
      raise;
  end;

  duration_ms := round(extract(epoch from (clock_timestamp() - started_at)) * 1000, 3);
  if duration_ms >= 500 then
    raise log 'sphere dataset query slow dataset=% table=% query_hash=% duration_ms=%',
      p_dataset_id, table_name, md5(p_query), duration_ms;
  end if;
end;
$$;

revoke all on function public.run_dataset_query(uuid, text) from public, anon, authenticated;
grant execute on function public.run_dataset_query(uuid, text) to authenticated, service_role;

-- Existing object names already use <auth.uid()>/datasets/... . Making the
-- bucket private therefore requires no object move and preserves manifests.
update storage.buckets
set public = false,
    updated_at = timezone('utc', now())
where id = 'files';

drop policy if exists sphere_files_owner_access on storage.objects;
create policy sphere_files_owner_access
  on storage.objects
  for all
  to authenticated
  using (
    bucket_id = 'files'
    and split_part(name, '/', 1) = auth.uid()::text
    and public.is_current_account_active()
  )
  with check (
    bucket_id = 'files'
    and split_part(name, '/', 1) = auth.uid()::text
    and public.is_current_account_active()
  );

-- Restrictive guards close access even if an older broad permissive Storage
-- policy still exists. Other buckets are intentionally unaffected.
drop policy if exists sphere_files_authenticated_owner_guard on storage.objects;
create policy sphere_files_authenticated_owner_guard
  on storage.objects
  as restrictive
  for all
  to authenticated
  using (
    bucket_id <> 'files'
    or (
      split_part(name, '/', 1) = auth.uid()::text
      and public.is_current_account_active()
    )
  )
  with check (
    bucket_id <> 'files'
    or (
      split_part(name, '/', 1) = auth.uid()::text
      and public.is_current_account_active()
    )
  );

drop policy if exists sphere_files_anon_deny_guard on storage.objects;
create policy sphere_files_anon_deny_guard
  on storage.objects
  as restrictive
  for all
  to anon
  using (bucket_id <> 'files')
  with check (bucket_id <> 'files');

commit;
