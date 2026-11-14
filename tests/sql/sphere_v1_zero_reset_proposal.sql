-- Sphere V1 zero-reset proposal - REVIEW ONLY
--
-- This file is intentionally READ ONLY. It does not contain enabled DELETE,
-- DROP, TRUNCATE, Storage mutation, or Auth mutation statements. Convert each
-- reviewed phase into a separately approved runbook after backups and restore
-- tests exist. Never run a product-data reset directly in shared development.

-- 1. Superadmin accounts/configuration that must be preserved.
select user_id, role, status, subscription_plan, admin_plan_override
from public.user_roles
where role = 'superadmin'
order by user_id;

-- 2. Product rows affected by a complete reset.
select 'datasets' as object_type, count(*) as row_count from public.datasets
union all select 'reports', count(*) from public.reports
union all select 'public_report_snapshots', count(*) from public.public_report_snapshots
union all select 'stories', count(*) from public.stories
union all select 'public_story_snapshots', count(*) from public.public_story_snapshots
union all select 'story_export_jobs', count(*) from public.story_export_jobs
union all select 'normalized_dataset_sync_sessions', count(*) from public.normalized_dataset_sync_sessions
union all select 'normalized_dataset_sync_chunks', count(*) from public.normalized_dataset_sync_chunks
union all select 'normalized_dataset_sync_cleanup_log', count(*) from public.normalized_dataset_sync_cleanup_log
union all select 'account_subscriptions', count(*) from public.account_subscriptions
union all select 'account_deletion_requests', count(*) from public.account_deletion_requests
union all select 'stripe_webhook_events', count(*) from public.stripe_webhook_events
order by object_type;

-- 3. Dynamic definitive/staging relations requiring an explicit backup and
-- canonical-owner reconciliation before any approved removal.
select
  namespace.nspname as schema_name,
  relation.relname as relation_name,
  pg_total_relation_size(relation.oid) as total_bytes,
  relation.reltuples::bigint as estimated_rows,
  case
    when relation.relname ~ '^dataset_staging_[0-9a-f]{32}$' then 'staging'
    when relation.relname ~ '^dataset_[0-9a-f_]+$' then 'definitive'
    else 'quarantine_or_other'
  end as relation_kind
from pg_class relation
join pg_namespace namespace on namespace.oid = relation.relnamespace
where namespace.nspname = 'public'
  and relation.relkind = 'r'
  and relation.relname like 'dataset%'
order by relation.relname;

-- 4. Ownership/dependency preflight. Every result must be zero before reset.
select 'reports_without_dataset' as check_name, count(*) as failures
from public.reports report
left join public.datasets dataset on dataset.id = report.dataset_id
where dataset.id is null
union all
select 'stories_without_dataset', count(*)
from public.stories story
left join public.datasets dataset on dataset.id = story.dataset_id
where dataset.id is null
union all
select 'report_snapshots_without_report', count(*)
from public.public_report_snapshots snapshot
left join public.reports report on report.id = snapshot.report_id
where snapshot.report_id is not null and report.id is null
union all
select 'story_snapshots_without_story', count(*)
from public.public_story_snapshots snapshot
left join public.stories story on story.id = snapshot.story_id
where snapshot.story_id is not null and story.id is null
union all
select 'exports_without_story', count(*)
from public.story_export_jobs job
left join public.stories story on story.id = job.story_id
where story.id is null;

-- 5. Proposed approved execution order (disabled on purpose):
--
-- A. pg_dump schema plus all Sphere-owned tables; restore into isolated QA.
-- B. Export a manifest containing row counts, IDs, dynamic-table checksums and
--    Storage object paths/checksums. Preserve administration audit according to
--    retention policy.
-- C. Through backend service-role lifecycle operations, remove in this order:
--      public snapshots -> export jobs -> Stories -> Reports -> Datasets.
--    Validate dynamic table names with normalized_dataset_table_name(dataset.id)
--    before dropping them. Never trust normalized_table_name as a DROP target.
-- D. Remove raw/normalized/manifest/part/video objects through Storage API only
--    after expanding every manifest and recording per-object success/failure.
-- E. Remove non-superadmin Auth users through Auth Admin API only after their
--    product resources are confirmed absent. Preserve all superadmin users and
--    their user_roles/admin plan configuration.
-- F. Re-run this file, the catalog audit, anonymous/owner RLS probes, and product
--    smoke tests. Any mismatch triggers restore, not an ad-hoc repair.

-- 6. Expected post-reset verification. Superadmin configuration is excluded
-- from the zero-product-data requirement.
select
  (select count(*) from public.datasets) as datasets,
  (select count(*) from public.reports) as reports,
  (select count(*) from public.public_report_snapshots) as report_snapshots,
  (select count(*) from public.stories) as stories,
  (select count(*) from public.public_story_snapshots) as story_snapshots,
  (select count(*) from public.story_export_jobs) as export_jobs,
  (select count(*) from public.user_roles where role = 'superadmin') as preserved_superadmins;
