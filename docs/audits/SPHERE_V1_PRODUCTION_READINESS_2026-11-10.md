# Sphere V1 Production Readiness Audit - 2026-11-10

## Scope and Evidence

This audit was executed read-only against the configured development Supabase project on 2026-11-10 America/Bogota (2026-11-11 UTC). It used PostgREST `GET`/`HEAD`, Auth Admin listing, and Storage object listing. It did not invoke product RPCs, mutate rows, apply migrations, or delete Storage objects.

Direct PostgreSQL catalog credentials and a Supabase Management API token were not available. Therefore indexes, trigger definitions, complete RLS policy text, migration history, `SECURITY DEFINER` attributes, cron jobs, and non-API-exposed quarantine relations remain pending execution of `tests/sql/supabase_readonly_audit.sql` in SQL Editor.

## Live Inventory

### API-visible relations

| Relation | Rows | Disposition |
|---|---:|---|
| `datasets` | 2 | Keep |
| `reports` | 4 | Keep; anon exposure is a P0 blocker |
| `public_report_snapshots` | 2 | Keep; both active |
| `stories` | 1 | Keep |
| `public_story_snapshots` | 0 | Keep schema |
| `story_export_jobs` | 0 | Keep schema |
| `normalized_dataset_sync_sessions` | 1 | Keep; completed |
| `normalized_dataset_sync_chunks` | 103 | Keep integrity evidence |
| `normalized_dataset_sync_cleanup_log` | 0 | Keep schema |
| `user_roles` | 1 | Keep; one `superadmin` |
| `admin_audit_log` | 0 | Keep schema |
| `account_subscriptions` | 0 | Keep schema |
| `account_deletion_requests` | 0 | Keep schema |
| `stripe_webhook_events` | 0 | Keep schema |

Two definitive analytical relations are visible and correspond to the two dataset metadata rows:

- one relation with 514,704 rows;
- one relation with 28 rows.

No stale `active`, `aborted`, or `superseded` sync session older than 24 hours was found. No API-visible staging relation was found.

### Relationship integrity

The live read-only reconciliation found zero:

- Reports without Dataset;
- Report snapshots without Report or Dataset;
- Stories without Dataset or optional source Report;
- Story snapshots without Story or Dataset;
- export jobs without Story;
- sync sessions without Dataset;
- sync chunks without session.

### Authentication and roles

- Auth users: 2 confirmed, 0 currently banned.
- Role rows: 1 `superadmin`.
- Subscription rows: 0.
- Account deletion requests: 0.
- Stripe webhook rows: 0.

No email addresses or user identifiers were included in this artifact.

### Storage

Bucket `files` is public and has no bucket-level file-size override. The recursive inventory found 28 objects totaling 57,329,446 bytes.

- 13 objects are directly referenced by Dataset metadata or by the large-dataset manifest, including eight ordered compressed CSV parts.
- 15 objects are not referenced by current Dataset metadata, manifests, or export jobs and are cleanup candidates only.
- No referenced Dataset artifact is missing.

The 15 candidates must not be deleted until their ownership, backup, and relationship with historical test/import evidence are approved.

## Live RPC Inventory

PostgREST exposes 27 public-schema RPC signatures:

- analytics/import: `map_dataset_type_to_pg`, `sync_normalized_dataset`, `run_dataset_query`, `normalized_dataset_table_name`, `normalized_dataset_staging_table_name`, `begin_normalized_dataset_sync`, `append_normalized_dataset_rows`, `complete_normalized_dataset_sync`, `abort_normalized_dataset_sync`, `cleanup_abandoned_normalized_dataset_sync`;
- lifecycle/limits: `get_current_user_limits`, `get_dataset_delete_dependencies`, `delete_dataset_lifecycle`, `delete_report_lifecycle`, `delete_story_lifecycle`;
- administration: `is_current_account_active`, `enforce_active_account_request`, `admin_assert_actor`, `admin_get_user_usage`, `admin_record_action`, `admin_set_user_access`;
- billing/account: `assert_account_dataset_tables`, `begin_account_deletion`, `delete_account_product_data`, `claim_stripe_webhook_event`, `apply_stripe_subscription_state`, `apply_stripe_invoice_status`.

All are referenced by current migrations or application code. None is approved for removal based only on an empty table or low observed usage.

## Expected Repository Objects

The migrations declare the following non-internal triggers:

- Dataset and Report role-aware limit triggers;
- `user_roles` timestamp and last-superadmin guards;
- normalized-sync cleanup before Dataset deletion.

They also declare indexes for owner/listing, publication lookup, Story/export lifecycle, sync cleanup, role/admin audit, subscriptions, and account deletion. Exact live definitions, usage, duplicates, and missing FK indexes require catalog output before any index cleanup.

The repository still lacks the original `CREATE TABLE` baseline for `datasets` and `reports`. A clean database cannot be proven reproducible from repository migrations alone. This is P1 technical debt; do not synthesize a baseline until the live column, constraint, grant, and policy definitions are exported.

## Findings

### P0 - Anonymous Report access

An anonymous `HEAD` with exact count sees all 4 rows in `reports`. Private Report definitions must not be enumerable by `anon`.

Proposed correction, not applied:

1. export current `reports` grants and policies;
2. enable RLS and revoke all `anon` privileges;
3. add owner-only authenticated policies for select/insert/update/delete;
4. enforce owned Dataset on insert/update;
5. repeat owner CRUD, Save As, publication, and anonymous probes.

### P0 - Public Dataset artifacts

The `files` bucket is public and contains raw XLSX, normalized data, manifests, and compressed parts. Public Report/Story snapshots do not need direct anonymous access to private Dataset artifacts.

Proposed correction, not applied: migrate artifact access to a private bucket or private object policy, persist object paths rather than permanent public URLs, and use authenticated or short-lived signed downloads. This requires a dedicated compatibility migration and must not be patched during reset.

### P1 - Incomplete reproducibility

The base `datasets`/`reports` schema, full live RLS, cron state, and quarantine relation inventory are not available from repository migrations or PostgREST. Run the catalog audit before approving production or destructive cleanup.

### P1 - Storage candidates

Fifteen objects are not referenced by current metadata/manifests. They are candidates, not confirmed garbage. Quarantine-copy and checksum them before deletion.

### P1 - Dependency audit

`d3`, `@types/d3`, and `tailwind-merge` had no repository imports and were removed. `next` and `eslint-config-next` were updated from 16.1.1 to 16.4.6 to remove the direct production framework advisories.

### P1 - Remaining package advisories

`npm audit` still reports 12 findings: eight moderate, two high, and two critical. The critical findings are in the test-only Vitest worker stack; the available fixed Vitest line requires a Node runtime policy change. `xlsx@0.18.5` has two known advisories and no npm-registry fix. Replacing the workbook parser is outside this stabilization package and must be planned before unrestricted public uploads.

### P2 - Retention

No approved retention period exists for revoked snapshots, completed sync evidence, cleanup logs, failed export jobs, or administration audit records. Do not infer deletion eligibility from age or zero usage alone.

## Anonymous Access Probe

| Relation | Anonymous result |
|---|---:|
| `datasets` | 0 visible |
| `reports` | **4 visible (P0)** |
| `public_report_snapshots` | 2 visible, expected active public artifacts |
| `stories` | 0 visible |
| `public_story_snapshots` | 0 visible |
| `story_export_jobs` | 0 visible |
| role, sync, admin, billing and deletion tables | HTTP 401 |

## Zero-reset Procedure Status

The proposed procedure is documented in `tests/sql/sphere_v1_zero_reset_proposal.sql`. It is intentionally read-only by default and contains no enabled destructive statement.

Before approval:

1. run `tests/sql/supabase_readonly_audit.sql` with catalog access;
2. export schema and data backups and test restore in isolated QA;
3. preserve the configured superadmin Auth user and `user_roles` row;
4. create a signed manifest for every Dataset, dynamic table, Storage object, Report, Story, snapshot, and export;
5. reconcile the 15 Storage candidates and every quarantine relation;
6. remove Storage through the Storage API, never direct SQL against `storage.objects`;
7. remove non-superadmin Auth users only through the Auth Admin API after product data cleanup;
8. verify zero product rows/orphans and re-run RLS/functional smoke tests.

## V1 Stabilization Results

### Corrected regressions

- E2E expectations now validate the planner's deterministic, data-dependent output (4-9 widgets) instead of requiring a legacy fixed count.
- Dynamic report, Story and render routes are compiled once in Playwright global setup. This prevents cross-worker Fast Refresh reloads from resetting active report and MP4 flows.
- The suite runs with two workers because chart/file/video scenarios share one Next server and are CPU intensive; this preserves concurrency coverage without starving browser workers.
- Supabase session initialization performs an explicit `getSession()` in addition to subscribing to auth events, so startup does not depend on observing a single `INITIAL_SESSION` event.
- Saving/publishing an unchanged Quick Result preserves the widget array identity. It no longer clears resolved results or sends duplicate widget RPCs before PPTX export.
- Widget type normalization preserves explicit `COUNT` rather than replacing it with a default `SUM` when entering Refine.

### Final quality gates

| Gate | Result |
|---|---|
| Unit/acceptance | 105 passed, 11 explicitly skipped external/heavy cases |
| Heavy ingestion | 7 passed, including the real 514,704 x 14 XLSX fixture |
| E2E | 36/36 passed |
| Typecheck | Passed |
| Production build | Passed on Next.js 16.4.6 |
| ESLint | Passed with 0 errors and 74 documented legacy warnings |

The large-ingestion run preserved all 514,704 rows and 14 columns. The real fixture completed profiling in approximately 18.9 seconds; its 118.4 MB normalized CSV was represented by eight ordered compressed parts totaling approximately 7.87 MB. No remote write was performed by this production-readiness audit.

## Production Verdict

**NOT READY** until anonymous Report exposure and public private-artifact access are corrected and validated, the live catalog/cron/quarantine audit is attached, and the remaining dependency risk is accepted or remediated.
