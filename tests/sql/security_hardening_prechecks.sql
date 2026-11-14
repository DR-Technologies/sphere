-- Sphere V1 security hardening prechecks (READ ONLY)
-- Run in Supabase SQL Editor before 20261111_security_hardening.sql.
-- Export every result set as CSV/JSON and attach it to the change record.
-- Expected blockers are documented below; this script never mutates data.

-- 1. Applied migration history. The hardening version must not already exist.
-- Some projects do not expose Supabase CLI migration history. Resolve the
-- optional relation before referencing it so the rest of the audit still runs.
do $precheck$
declare
  migration_history jsonb;
begin
  if to_regclass('supabase_migrations.schema_migrations') is null then
    raise notice 'MIGRATION_HISTORY_UNAVAILABLE: supabase_migrations.schema_migrations does not exist';
  else
    execute $history$
      select coalesce(
        jsonb_agg(to_jsonb(history) order by history.version),
        '[]'::jsonb
      )
      from (
        select *
        from supabase_migrations.schema_migrations
        where version >= '20260407'
      ) history
    $history$
    into migration_history;

    raise notice 'MIGRATION_HISTORY=%', migration_history;
  end if;
end
$precheck$;

-- 2. Product row-count baseline.
select 'datasets' as object_name, count(*)::bigint as row_count from public.datasets
union all select 'reports', count(*) from public.reports
union all select 'public_report_snapshots', count(*) from public.public_report_snapshots
union all select 'stories', count(*) from public.stories
union all select 'public_story_snapshots', count(*) from public.public_story_snapshots
union all select 'story_export_jobs', count(*) from public.story_export_jobs
union all select 'normalized_dataset_sync_sessions', count(*) from public.normalized_dataset_sync_sessions
union all select 'normalized_dataset_sync_chunks', count(*) from public.normalized_dataset_sync_chunks
union all select 'normalized_dataset_sync_cleanup_log', count(*) from public.normalized_dataset_sync_cleanup_log
order by object_name;

-- 3. Parent/owner integrity. Every affected count must be zero.
select 'report_parent_owner_mismatch' as check_name, count(*)::bigint as affected
from public.reports report
left join public.datasets dataset on dataset.id = report.dataset_id
where dataset.id is null or dataset.user_id <> report.user_id
union all
select 'report_snapshot_parent_owner_mismatch', count(*)
from public.public_report_snapshots snapshot
left join public.datasets dataset on dataset.id = snapshot.dataset_id
left join public.reports report on report.id = snapshot.report_id
where dataset.id is null
   or dataset.user_id <> snapshot.user_id
   or (snapshot.report_id is not null and (
     report.id is null
     or report.user_id <> snapshot.user_id
     or report.dataset_id <> snapshot.dataset_id
   ))
union all
select 'story_parent_owner_mismatch', count(*)
from public.stories story
left join public.datasets dataset on dataset.id = story.dataset_id
left join public.reports report on report.id = story.source_report_id
where dataset.id is null
   or dataset.user_id <> story.user_id
   or (story.source_report_id is not null and (
     report.id is null
     or report.user_id <> story.user_id
     or report.dataset_id <> story.dataset_id
   ))
union all
select 'story_snapshot_parent_owner_mismatch', count(*)
from public.public_story_snapshots snapshot
left join public.datasets dataset on dataset.id = snapshot.dataset_id
left join public.stories story on story.id = snapshot.story_id
where dataset.id is null
   or dataset.user_id <> snapshot.user_id
   or (snapshot.story_id is not null and (
     story.id is null
     or story.user_id <> snapshot.user_id
     or story.dataset_id <> snapshot.dataset_id
   ))
union all
select 'story_export_parent_owner_mismatch', count(*)
from public.story_export_jobs export_job
left join public.stories story on story.id = export_job.story_id
where story.id is null or story.user_id <> export_job.user_id;

-- 4. Definitive analytical-table integrity. Every Dataset pointer must be the
-- canonical relation and resolve to an existing ordinary/partitioned table.
select
  dataset.id,
  dataset.normalized_table_name,
  'dataset_' || replace(dataset.id::text, '-', '_') as expected_table_name,
  to_regclass(format('public.%I', dataset.normalized_table_name)) as resolved_relation,
  relation.relkind,
  dataset.normalized_row_count,
  dataset.normalized_content_checksum
from public.datasets dataset
left join pg_class relation
  on relation.oid = to_regclass(format('public.%I', dataset.normalized_table_name))
where dataset.normalized_table_name is not null
order by dataset.created_at, dataset.id;

select count(*)::bigint as invalid_normalized_relations
from public.datasets dataset
where dataset.normalized_table_name is not null
  and (
    dataset.normalized_table_name <> 'dataset_' || replace(dataset.id::text, '-', '_')
    or to_regclass(format('public.%I', dataset.normalized_table_name)) is null
  );

-- Generate exact, read-only row-count statements for each analytical table.
-- Run and export the generated statements separately; compare each result with
-- normalized_row_count before and after migration.
select format(
  'select %L as dataset_id, count(*)::bigint as actual_rows from public.%I;',
  dataset.id,
  dataset.normalized_table_name
) as row_count_statement
from public.datasets dataset
where dataset.normalized_table_name is not null
order by dataset.id;

-- 5. Dataset artifact references. Every non-null path must begin with owner id.
with artifact_references as (
  select dataset.id, dataset.user_id, reference.artifact_kind, reference.value
  from public.datasets dataset
  cross join lateral (values
    ('raw', dataset.file_url),
    ('normalized', dataset.normalized_file_url),
    ('manifest', dataset.analytics_manifest_url)
  ) as reference(artifact_kind, value)
), normalized_references as (
  select id, user_id, artifact_kind, value,
    case
      when value is null or btrim(value) = '' then null
      when value like '%/storage/v1/object/public/files/%'
        then split_part(split_part(value, '/storage/v1/object/public/files/', 2), '?', 1)
      when value like '%/storage/v1/object/sign/files/%'
        then split_part(split_part(value, '/storage/v1/object/sign/files/', 2), '?', 1)
      when value like '%/storage/v1/object/authenticated/files/%'
        then split_part(split_part(value, '/storage/v1/object/authenticated/files/', 2), '?', 1)
      when value like 'files/%'
        then split_part(substr(value, length('files/') + 1), '?', 1)
      when value not like '%://%' then split_part(value, '?', 1)
      else null
    end as object_path
  from artifact_references
)
select id as dataset_id, artifact_kind, object_path
from normalized_references
where value is not null
  and (object_path is null or object_path not like user_id::text || '/%')
order by id, artifact_kind;

-- 6. Storage baseline. files must currently exist; every first path segment
-- must map to an Auth user. No object content is selected.
select id, name, public, file_size_limit, allowed_mime_types, created_at, updated_at
from storage.buckets
where id = 'files';

select
  count(*)::bigint as object_count,
  coalesce(sum((metadata ->> 'size')::bigint), 0) as recorded_bytes,
  count(*) filter (where account.id is null)::bigint as invalid_owner_prefixes
from storage.objects object
left join auth.users account
  on account.id::text = split_part(object.name, '/', 1)
where object.bucket_id = 'files';

-- 7. Current grants and RLS policies. Save this output with the schema backup.
select grantee, table_schema, table_name, privilege_type
from information_schema.role_table_grants
where table_schema in ('public', 'storage')
  and table_name in (
    'datasets', 'reports', 'stories', 'public_report_snapshots',
    'public_story_snapshots', 'story_export_jobs', 'objects'
  )
order by table_schema, table_name, grantee, privilege_type;

select schemaname, tablename, policyname, permissive, roles, cmd, qual, with_check
from pg_policies
where (schemaname = 'public' and tablename in (
    'datasets', 'reports', 'stories', 'public_report_snapshots',
    'public_story_snapshots', 'story_export_jobs'
  ))
  or (schemaname = 'storage' and tablename = 'objects')
order by schemaname, tablename, policyname;

-- 8. SECURITY DEFINER/invoker inventory and explicit EXECUTE grants.
select
  namespace.nspname as function_schema,
  procedure.proname as function_name,
  pg_get_function_identity_arguments(procedure.oid) as identity_arguments,
  procedure.prosecdef as security_definer,
  procedure.proconfig as function_settings,
  procedure.proacl as acl,
  pg_get_functiondef(procedure.oid) as definition
from pg_proc procedure
join pg_namespace namespace on namespace.oid = procedure.pronamespace
where namespace.nspname = 'public'
order by procedure.proname, identity_arguments;

-- 9. Trigger and cron inventory.
select
  event_object_schema,
  event_object_table,
  trigger_name,
  action_timing,
  event_manipulation,
  action_statement
from information_schema.triggers
where event_object_schema = 'public'
order by event_object_table, trigger_name, event_manipulation;

select extension.extname, extension.extversion
from pg_extension extension
where extension.extname = 'pg_cron';

-- Run only if the previous query confirms pg_cron is installed:
-- select jobid, jobname, schedule, command, active from cron.job order by jobid;

-- 10. Stable metadata fingerprints for before/after comparison. These contain
-- no row payload values, only counts and deterministic metadata digests.
select
  'datasets' as object_name,
  count(*)::bigint as row_count,
  md5(coalesce(string_agg(
    id::text || ':' || user_id::text || ':' || coalesce(normalized_table_name, '') || ':' ||
    coalesce(normalized_row_count::text, '') || ':' || coalesce(normalized_content_checksum, ''),
    '|' order by id
  ), '')) as metadata_fingerprint
from public.datasets
union all
select 'reports', count(*), md5(coalesce(string_agg(
  id::text || ':' || user_id::text || ':' || dataset_id::text || ':' || name,
  '|' order by id
), ''))
from public.reports
union all
select 'report_snapshots', count(*), md5(coalesce(string_agg(
  id::text || ':' || user_id::text || ':' || dataset_id::text || ':' || slug || ':' || coalesce(revoked_at::text, ''),
  '|' order by id
), ''))
from public.public_report_snapshots
union all
select 'stories', count(*), md5(coalesce(string_agg(
  id::text || ':' || user_id::text || ':' || dataset_id::text || ':' || title,
  '|' order by id
), ''))
from public.stories
union all
select 'story_snapshots', count(*), md5(coalesce(string_agg(
  id::text || ':' || user_id::text || ':' || dataset_id::text || ':' || slug || ':' || coalesce(revoked_at::text, ''),
  '|' order by id
), ''))
from public.public_story_snapshots
union all
select 'story_export_jobs', count(*), md5(coalesce(string_agg(
  id::text || ':' || user_id::text || ':' || story_id::text || ':' || status,
  '|' order by id
), ''))
from public.story_export_jobs
order by object_name;
