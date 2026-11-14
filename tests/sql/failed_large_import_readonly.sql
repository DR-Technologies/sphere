-- Read-only diagnostics for the failed Ventas Mensual Julio 2026 import.
-- Run with a PostgreSQL connection that can inspect the private sync tables.
-- This script does not update, delete, drop, truncate, or replace anything.

with matching_datasets as (
  select
    id,
    user_id,
    name,
    normalized_table_name,
    normalized_sync_generation,
    normalized_row_count,
    normalized_content_checksum,
    file_url,
    normalized_file_url,
    analytics_manifest_url,
    created_at
  from public.datasets
  where name ilike '%Ventas Mensual Julio 2026.xlsx%'
)
select *
from matching_datasets
order by created_at desc;

with matching_datasets as (
  select id
  from public.datasets
  where name ilike '%Ventas Mensual Julio 2026.xlsx%'
)
select
  session.id,
  session.dataset_id,
  session.user_id,
  session.status,
  session.staging_table_name,
  to_regclass(format('public.%I', session.staging_table_name)) as staging_relation,
  case
    when to_regclass(format('public.%I', session.staging_table_name)) is null then null
    else pg_total_relation_size(to_regclass(format('public.%I', session.staging_table_name)))
  end as staging_total_bytes,
  session.base_generation,
  session.expected_rows,
  session.appended_rows,
  session.expected_chunks,
  session.appended_chunks,
  session.chunk_size,
  session.columns_checksum,
  session.content_checksum,
  session.created_at,
  session.updated_at,
  session.completed_at,
  session.aborted_at,
  session.staging_cleaned_at,
  session.staging_cleanup_result
from public.normalized_dataset_sync_sessions session
join matching_datasets dataset on dataset.id = session.dataset_id
order by session.created_at desc;

with matching_sessions as (
  select session.id
  from public.normalized_dataset_sync_sessions session
  join public.datasets dataset on dataset.id = session.dataset_id
  where dataset.name ilike '%Ventas Mensual Julio 2026.xlsx%'
)
select
  chunk.session_id,
  count(*) as confirmed_chunks,
  coalesce(sum(chunk.row_count), 0) as confirmed_rows,
  min(chunk.chunk_index) as first_chunk,
  max(chunk.chunk_index) as last_chunk,
  count(*) filter (where chunk.payload_checksum <> chunk.persisted_checksum) as checksum_mismatches
from public.normalized_dataset_sync_chunks chunk
join matching_sessions session on session.id = chunk.session_id
group by chunk.session_id
order by chunk.session_id;

select
  dataset.id as dataset_id,
  dataset.normalized_table_name,
  to_regclass(format('public.%I', dataset.normalized_table_name)) as definitive_relation,
  case
    when dataset.normalized_table_name is null
      or to_regclass(format('public.%I', dataset.normalized_table_name)) is null then null
    else pg_total_relation_size(to_regclass(format('public.%I', dataset.normalized_table_name)))
  end as definitive_total_bytes,
  dataset.normalized_row_count,
  dataset.normalized_content_checksum
from public.datasets dataset
where dataset.name ilike '%Ventas Mensual Julio 2026.xlsx%'
order by dataset.created_at desc;
