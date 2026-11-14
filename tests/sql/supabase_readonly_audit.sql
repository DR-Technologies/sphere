-- Sphere Supabase database audit (READ ONLY)
-- No statement in this file mutates data or schema.
-- Run with a database role that can inspect pg_catalog, public, storage and cron.

-- 1. Applied migration history.
select
    to_regclass('supabase_migrations.schema_migrations')
        as migration_history_table;

-- 2. User relations and estimated size/cardinality.
select
  namespace.nspname as schema_name,
  relation.relname as relation_name,
  case relation.relkind
    when 'r' then 'table'
    when 'p' then 'partitioned_table'
    when 'v' then 'view'
    when 'm' then 'materialized_view'
    when 'S' then 'sequence'
    else relation.relkind::text
  end as relation_type,
  relation.reltuples::bigint as estimated_rows,
  pg_total_relation_size(relation.oid) as total_bytes,
  pg_relation_size(relation.oid) as table_bytes,
  pg_indexes_size(relation.oid) as index_bytes,
  relation.relrowsecurity as rls_enabled,
  relation.relforcerowsecurity as rls_forced
from pg_class relation
join pg_namespace namespace on namespace.oid = relation.relnamespace
where namespace.nspname in ('public', 'storage')
  and relation.relkind in ('r', 'p', 'v', 'm', 'S')
order by namespace.nspname, relation.relkind, relation.relname;

-- 3. Columns and defaults.
select
  columns.table_schema,
  columns.table_name,
  columns.ordinal_position,
  columns.column_name,
  columns.data_type,
  columns.udt_name,
  columns.is_nullable,
  columns.column_default
from information_schema.columns
where columns.table_schema in ('public', 'storage')
order by columns.table_schema, columns.table_name, columns.ordinal_position;

-- 4. Constraints, validation state and delete/update behavior.
select
  namespace.nspname as schema_name,
  relation.relname as table_name,
  constraint_record.conname as constraint_name,
  constraint_record.contype as constraint_type,
  constraint_record.convalidated,
  pg_get_constraintdef(constraint_record.oid, true) as definition
from pg_constraint constraint_record
join pg_class relation on relation.oid = constraint_record.conrelid
join pg_namespace namespace on namespace.oid = relation.relnamespace
where namespace.nspname = 'public'
order by relation.relname, constraint_record.contype, constraint_record.conname;

-- 5. Index inventory and observed usage. Zero scans alone is not deletion evidence.
select
  index_stats.schemaname,
  index_stats.relname as table_name,
  index_stats.indexrelname as index_name,
  index_record.indisunique,
  index_record.indisprimary,
  index_record.indisvalid,
  index_record.indisready,
  pg_get_indexdef(index_record.indexrelid) as definition,
  index_stats.idx_scan,
  index_stats.idx_tup_read,
  index_stats.idx_tup_fetch,
  pg_relation_size(index_record.indexrelid) as index_bytes
from pg_stat_user_indexes index_stats
join pg_index index_record on index_record.indexrelid = index_stats.indexrelid
where index_stats.schemaname = 'public'
order by index_stats.relname, index_stats.indexrelname;

-- 6. Structurally duplicated indexes (same table, keys, expressions and predicate).
select
  first_index.indrelid::regclass as table_name,
  first_index.indexrelid::regclass as first_index,
  second_index.indexrelid::regclass as second_index,
  pg_get_indexdef(first_index.indexrelid) as first_definition,
  pg_get_indexdef(second_index.indexrelid) as second_definition
from pg_index first_index
join pg_index second_index
  on second_index.indrelid = first_index.indrelid
 and second_index.indexrelid > first_index.indexrelid
 and second_index.indkey = first_index.indkey
 and coalesce(pg_get_expr(second_index.indexprs, second_index.indrelid), '')
     = coalesce(pg_get_expr(first_index.indexprs, first_index.indrelid), '')
 and coalesce(pg_get_expr(second_index.indpred, second_index.indrelid), '')
     = coalesce(pg_get_expr(first_index.indpred, first_index.indrelid), '')
join pg_class relation on relation.oid = first_index.indrelid
join pg_namespace namespace on namespace.oid = relation.relnamespace
where namespace.nspname = 'public'
order by first_index.indrelid::regclass::text, first_index.indexrelid::regclass::text;

-- 7. Foreign keys whose leading columns are not covered by an index.
select
  relation.oid::regclass as table_name,
  constraint_record.conname as foreign_key,
  pg_get_constraintdef(constraint_record.oid, true) as definition
from pg_constraint constraint_record
join pg_class relation on relation.oid = constraint_record.conrelid
join pg_namespace namespace on namespace.oid = relation.relnamespace
where namespace.nspname = 'public'
  and constraint_record.contype = 'f'
  and not exists (
    select 1
    from pg_index index_record
    where index_record.indrelid = constraint_record.conrelid
      and index_record.indisvalid
      and index_record.indisready
      and (
        select array_agg(key_column.attnum order by key_column.ordinality)
        from unnest(index_record.indkey::smallint[]) with ordinality
          as key_column(attnum, ordinality)
        where key_column.ordinality <= cardinality(constraint_record.conkey)
      ) = constraint_record.conkey
  )
order by relation.oid::regclass::text, constraint_record.conname;

-- 8. Non-internal triggers.
select
  namespace.nspname as schema_name,
  relation.relname as table_name,
  trigger_record.tgname as trigger_name,
  trigger_record.tgenabled,
  pg_get_triggerdef(trigger_record.oid, true) as definition
from pg_trigger trigger_record
join pg_class relation on relation.oid = trigger_record.tgrelid
join pg_namespace namespace on namespace.oid = relation.relnamespace
where namespace.nspname = 'public'
  and not trigger_record.tgisinternal
order by relation.relname, trigger_record.tgname;

-- 9. RLS policies.
select
  policies.schemaname,
  policies.tablename,
  policies.policyname,
  policies.permissive,
  policies.roles,
  policies.cmd,
  policies.qual,
  policies.with_check
from pg_policies policies
where policies.schemaname in ('public', 'storage')
order by policies.schemaname, policies.tablename, policies.policyname;

-- 10. Public tables without RLS.
select relation.oid::regclass as table_name
from pg_class relation
join pg_namespace namespace on namespace.oid = relation.relnamespace
where namespace.nspname = 'public'
  and relation.relkind in ('r', 'p')
  and not relation.relrowsecurity
order by relation.relname;

-- 11. Functions, ownership, SECURITY DEFINER, search_path and grants.
select
  namespace.nspname as schema_name,
  procedure.proname,
  pg_get_function_identity_arguments(procedure.oid) as arguments,
  pg_get_userbyid(procedure.proowner) as owner,
  procedure.prosecdef as security_definer,
  procedure.provolatile,
  procedure.proconfig,
  procedure.proacl,
  has_function_privilege('anon', procedure.oid, 'EXECUTE') as anon_can_execute,
  has_function_privilege('authenticated', procedure.oid, 'EXECUTE') as authenticated_can_execute,
  has_function_privilege('service_role', procedure.oid, 'EXECUTE') as service_role_can_execute
from pg_proc procedure
join pg_namespace namespace on namespace.oid = procedure.pronamespace
where namespace.nspname = 'public'
order by procedure.proname, arguments;

-- 12. Table grants for API-facing roles.
select
  grants.table_schema,
  grants.table_name,
  grants.grantee,
  grants.privilege_type,
  grants.is_grantable
from information_schema.role_table_grants grants
where grants.table_schema in ('public', 'storage')
  and grants.grantee in ('anon', 'authenticated', 'service_role')
order by grants.table_schema, grants.table_name, grants.grantee, grants.privilege_type;

-- 13. Extension inventory. If pg_cron is present, run the following read-only
-- query separately: select jobid, jobname, schedule, command, active from cron.job;
select extension.extname, extension.extversion, namespace.nspname as extension_schema
from pg_extension extension
join pg_namespace namespace on namespace.oid = extension.extnamespace
order by extension.extname;

-- 14. Dynamic analytical and staging tables.
select
  relation.relname as table_name,
  relation.reltuples::bigint as estimated_rows,
  pg_total_relation_size(relation.oid) as total_bytes,
  case
    when relation.relname ~ '^dataset_staging_[0-9a-f]{32}$' then 'staging'
    when relation.relname ~ '^dataset_[0-9a-f_]+$' then 'definitive'
    else 'other'
  end as table_kind
from pg_class relation
join pg_namespace namespace on namespace.oid = relation.relnamespace
where namespace.nspname = 'public'
  and relation.relkind = 'r'
  and (relation.relname ~ '^dataset_staging_[0-9a-f]{32}$'
    or relation.relname ~ '^dataset_[0-9a-f_]+$')
order by table_kind, relation.relname;

-- 15. Sync session reconciliation. Preserve the failed 514,704-row evidence.
select
  session.id,
  session.dataset_id,
  dataset.name as dataset_name,
  session.status,
  session.staging_table_name,
  to_regclass(format('public.%I', session.staging_table_name)) as staging_relation,
  session.expected_rows,
  session.appended_rows,
  session.expected_chunks,
  session.appended_chunks,
  coalesce(chunks.confirmed_rows, 0) as confirmed_rows,
  coalesce(chunks.confirmed_chunks, 0) as confirmed_chunks,
  coalesce(chunks.checksum_mismatches, 0) as checksum_mismatches,
  session.content_checksum,
  session.created_at,
  session.updated_at,
  session.completed_at,
  session.aborted_at,
  session.staging_cleaned_at,
  session.staging_cleanup_result
from public.normalized_dataset_sync_sessions session
left join public.datasets dataset on dataset.id = session.dataset_id
left join lateral (
  select
    count(*) as confirmed_chunks,
    coalesce(sum(chunk.row_count), 0) as confirmed_rows,
    count(*) filter (where chunk.payload_checksum <> chunk.persisted_checksum) as checksum_mismatches
  from public.normalized_dataset_sync_chunks chunk
  where chunk.session_id = session.id
) chunks on true
order by session.created_at desc;

-- 16. Staging tables not referenced by any sync session. Candidates only.
select relation.relname as unreferenced_staging_table
from pg_class relation
join pg_namespace namespace on namespace.oid = relation.relnamespace
left join public.normalized_dataset_sync_sessions session
  on session.staging_table_name = relation.relname
where namespace.nspname = 'public'
  and relation.relkind = 'r'
  and relation.relname ~ '^dataset_staging_[0-9a-f]{32}$'
  and session.id is null
order by relation.relname;

-- 17. Definitive dataset tables not referenced by dataset metadata. Candidates only.
select relation.relname as unreferenced_dataset_table
from pg_class relation
join pg_namespace namespace on namespace.oid = relation.relnamespace
left join public.datasets dataset on dataset.normalized_table_name = relation.relname
where namespace.nspname = 'public'
  and relation.relkind = 'r'
  and relation.relname ~ '^dataset_[0-9a-f_]+$'
  and dataset.id is null
order by relation.relname;

-- 18. Product referential and ownership inconsistencies.
select 'reports_without_dataset' as issue, count(*) as affected
from public.reports report
left join public.datasets dataset on dataset.id = report.dataset_id
where dataset.id is null
union all
select 'reports_owner_mismatch', count(*)
from public.reports report join public.datasets dataset on dataset.id = report.dataset_id
where report.user_id <> dataset.user_id
union all
select 'stories_without_dataset', count(*)
from public.stories story left join public.datasets dataset on dataset.id = story.dataset_id
where dataset.id is null
union all
select 'stories_owner_mismatch', count(*)
from public.stories story join public.datasets dataset on dataset.id = story.dataset_id
where story.user_id <> dataset.user_id
union all
select 'report_snapshots_without_report', count(*)
from public.public_report_snapshots snapshot left join public.reports report on report.id = snapshot.report_id
where snapshot.report_id is not null and report.id is null
union all
select 'story_snapshots_without_story', count(*)
from public.public_story_snapshots snapshot left join public.stories story on story.id = snapshot.story_id
where snapshot.story_id is not null and story.id is null
union all
select 'export_jobs_without_story', count(*)
from public.story_export_jobs job left join public.stories story on story.id = job.story_id
where story.id is null;

-- 19. Active publication uniqueness and invalid completed exports.
select 'reports_with_multiple_active_snapshots' as issue, count(*) as affected
from (
  select report_id from public.public_report_snapshots
  where report_id is not null and revoked_at is null
  group by report_id having count(*) > 1
) duplicates
union all
select 'stories_with_multiple_active_snapshots', count(*)
from (
  select story_id from public.public_story_snapshots
  where story_id is not null and revoked_at is null
  group by story_id having count(*) > 1
) duplicates
union all
select 'completed_exports_without_output_reference', count(*)
from public.story_export_jobs
where status = 'completed' and (output_path is null or output_size_bytes is null or output_size_bytes <= 0)
union all
select 'stale_processing_exports', count(*)
from public.story_export_jobs
where status in ('queued', 'processing')
  and coalesce(heartbeat_at, updated_at, created_at) < now() - interval '2 hours';

-- 20. Dataset metadata integrity.
select
  id,
  name,
  normalized_table_name,
  to_regclass(format('public.%I', normalized_table_name)) as normalized_relation,
  normalized_row_count,
  normalized_content_checksum,
  file_url,
  normalized_file_url,
  analytics_manifest_url
from public.datasets
where file_url is null
   or analytics_manifest_url is null
   or (normalized_table_name is not null
       and to_regclass(format('public.%I', normalized_table_name)) is null)
order by created_at;

-- 21. Storage bucket and object inventory. Do not inspect object contents.
select id, name, public, file_size_limit, allowed_mime_types, created_at, updated_at
from storage.buckets
order by id;

select
  bucket_id,
  count(*) as object_count,
  coalesce(sum((metadata ->> 'size')::bigint), 0) as recorded_bytes,
  min(created_at) as oldest_object,
  max(updated_at) as newest_activity
from storage.objects
group by bucket_id
order by bucket_id;

-- 22. Directly referenced dataset artifacts missing from Storage. Partition
-- members are recorded in manifests and must be reconciled separately without
-- assuming they are orphaned merely because they are not direct DB columns.
with artifact_references as (
  select dataset.id as dataset_id, reference.artifact_kind, reference.value
  from public.datasets dataset
  cross join lateral (values
    ('raw', dataset.file_url),
    ('normalized', dataset.normalized_file_url),
    ('manifest', dataset.analytics_manifest_url)
  ) as reference(artifact_kind, value)
),
referenced_objects as (
  select
    dataset_id,
    artifact_kind,
    case
      when value is null or btrim(value) = '' then null
      when value like '%/storage/v1/object/public/files/%'
        then nullif(split_part(split_part(value, '/storage/v1/object/public/files/', 2), '?', 1), '')
      when value like '%/storage/v1/object/sign/files/%'
        then nullif(split_part(split_part(value, '/storage/v1/object/sign/files/', 2), '?', 1), '')
      when value like '%/storage/v1/object/authenticated/files/%'
        then nullif(split_part(split_part(value, '/storage/v1/object/authenticated/files/', 2), '?', 1), '')
      when value like 'files/%'
        then nullif(split_part(substr(value, length('files/') + 1), '?', 1), '')
      when value not like '%://%'
        then nullif(split_part(value, '?', 1), '')
      else null
    end as object_name
  from artifact_references
)
select reference.dataset_id, reference.artifact_kind, reference.object_name
from referenced_objects reference
left join storage.objects object
  on object.bucket_id = 'files' and object.name = reference.object_name
where reference.object_name is not null and object.id is null
order by reference.dataset_id, reference.artifact_kind;
