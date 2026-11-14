# Supabase Database Audit - 2026-11-05

## Status and Scope

This audit is read-only. No database or Storage object was changed.

The repository contains only `NEXT_PUBLIC_SUPABASE_URL` and the public client key. The real project rejects PostgREST schema introspection without `service_role`, and no PostgreSQL or Supabase Management API credential is available. Therefore this document separates:

- **Repository-confirmed:** migrations and code references inspected locally.
- **Real-schema pending:** facts that require execution of `tests/sql/supabase_readonly_audit.sql` against Supabase.

The failed 514,704-row import must remain preserved until its session id, staging table, chunks and checksums have been recorded.

### Minimal Real-Project Probe

A no-row `limit=0` / exact-count probe was executed with the public `anon` role. It did not download row content.

| Object | Anonymous result | Interpretation |
|---|---:|---|
| `datasets` | `200`, count 0 | Table exists; RLS hides rows from anon |
| `reports` | `206`, count 2 | **Private report rows are visible/countable to anon** |
| `stories` | `200`, count 0 | Table exists; RLS hides rows from anon |
| `public_report_snapshots` | `206`, count 1 | Active public artifact is anonymously enumerable |
| `public_story_snapshots` | `200`, count 0 | No anon-visible active row at probe time |
| `story_export_jobs` | `200`, count 0 | Table exists; no anon-visible row |
| `user_roles` | `401` | Direct anon access denied |
| Sync sessions/chunks/cleanup log | `401` | Direct anon access denied |

The PostgREST OpenAPI root itself returned `401` and explicitly requires `service_role`, so catalog definitions, policies and private row counts remain unavailable.

## Repository-Confirmed Inventory

### Product Tables

| Object | Purpose | Code usage | Status |
|---|---|---|---|
| `public.datasets` | Dataset metadata and analytical table pointer | Active | KEEP |
| `public.reports` | Saved report definitions | Active | KEEP |
| `public.public_report_snapshots` | Materialized public report artifacts | Active | KEEP |
| `public.stories` | Private Story definitions | Active | KEEP |
| `public.public_story_snapshots` | Materialized public Story artifacts | Active | KEEP |
| `public.story_export_jobs` | MP4 job state and output metadata | Active | KEEP |
| `public.user_roles` | `standard` / `superadmin` authorization | Active | KEEP |
| `public.normalized_dataset_sync_sessions` | Chunked-import session contract | Active | KEEP |
| `public.normalized_dataset_sync_chunks` | Per-chunk row/checksum evidence | Active | KEEP |
| `public.normalized_dataset_sync_cleanup_log` | Staging cleanup audit trail | Operational evidence | KEEP |

`datasets` and `reports` predate the migration directory: their original `CREATE TABLE`, complete constraints and complete RLS definitions are not reproducible from this repository.

### Dynamic Tables

- `public.dataset_<dataset_uuid>`: definitive normalized analytical data.
- `public.dataset_staging_<session_md5>`: isolated chunked-import staging.

Dynamic tables are intentional. A table is not a cleanup candidate merely because application code does not reference its literal name.

### Views

No application view or materialized view is declared by repository migrations. The real schema still requires inspection.

### RPC and Trigger Functions

| Function | Caller / purpose | Keep status |
|---|---|---|
| `map_dataset_type_to_pg` | Normalized type mapping | KEEP, review grant |
| `sync_normalized_dataset` | Small dataset persistence | KEEP WITH CHANGES |
| `run_dataset_query` | Dataset analytics query execution | REWORK, P0 |
| `get_current_user_limits` | Role-aware limits | KEEP |
| `get_dataset_delete_dependencies` | Safe dataset deletion preflight | KEEP |
| `delete_report_lifecycle` | Report + snapshot lifecycle | KEEP |
| `delete_story_lifecycle` | Story + snapshot/job lifecycle | KEEP |
| `delete_dataset_lifecycle` | Dependency-protected dataset deletion | KEEP |
| `enforce_datasets_per_user_limit` | Dataset limit trigger | KEEP |
| `enforce_reports_per_dataset_limit` | Report limit trigger | KEEP |
| `normalized_dataset_table_name` | Deterministic definitive name | KEEP, internal only |
| `normalized_dataset_staging_table_name` | Deterministic staging name | KEEP, internal only |
| `begin_normalized_dataset_sync` | Start isolated import | KEEP |
| `append_normalized_dataset_rows` | Idempotent verified chunk append | KEEP |
| `complete_normalized_dataset_sync` | Atomic reconciliation and swap | KEEP |
| `abort_normalized_dataset_sync` | Session-scoped abort | KEEP |
| `cleanup_abandoned_normalized_dataset_sync` | Service-only stale staging cleanup | KEEP |
| `cleanup_normalized_sync_before_dataset_delete` | Drop only owned staging before dataset deletion | KEEP |

### Triggers

- `datasets_per_user_limit` on `datasets`.
- `reports_per_dataset_limit` on `reports`.
- `cleanup_normalized_sync_before_dataset_delete` on `datasets`.

### RLS Declared in Migrations

- `datasets`: owner select/insert/update/delete.
- `stories`: owner select/insert/update/delete.
- `public_report_snapshots`: public active select, owner select, owner insert/update/delete.
- `public_story_snapshots`: public active select, owner select, owner insert/update/delete.
- `story_export_jobs`: owner select/insert/update/delete.
- `user_roles`: owner select; writes reserved to `service_role`.
- Sync session/chunk/cleanup tables: RLS enabled, frontend roles fully revoked, service access only.

The complete RLS state of `reports`, Storage and pre-existing base objects is not present in repository migrations and must be read from the real project.

### Scheduled Jobs

The repository schedules:

- `sphere-cleanup-abandoned-normalized-sync`
- Schedule: minute 17 of every hour.
- Command: `select public.cleanup_abandoned_normalized_dataset_sync(100)`.

Actual `cron.job` presence, duplicate jobs and run history remain pending.

## Dependency Map

```text
auth.users
  -> datasets
      -> reports
          -> public_report_snapshots
      -> stories
          -> public_story_snapshots
          -> story_export_jobs
      -> dataset_<uuid>
      -> normalized_dataset_sync_sessions
          -> normalized_dataset_sync_chunks
          -> dataset_staging_<session>

auth.users
  -> user_roles
```

Additional rules:

- A Story may retain `source_report_id`, but the relation becomes `NULL` when its source Report is deleted.
- Dataset deletion is `RESTRICT` while Reports, Stories or snapshots still depend on it.
- Report and Story snapshots cascade with their private parent.
- Export jobs cascade with Story deletion; MP4 files are local-filesystem artifacts and are not transactional with PostgreSQL.

## Findings

### P0 - Security / Data Integrity

#### DB-AUD-000 - Private Reports are anonymously selectable in the real project

The real `anon` role received an exact count of two rows from `public.reports` and accepted selection of `id`, `name`, `dataset_id`, `user_id` and `widgets`. No row values were downloaded during this audit, but anonymous SELECT exposure is confirmed.

Exact proposal:

1. Back up `reports` and capture current grants/policies.
2. Enable RLS on `public.reports` if it is disabled.
3. Revoke every privilege on `public.reports` from `anon`.
4. Grant required CRUD privileges to `authenticated` and add owner-only policies for SELECT/INSERT/UPDATE/DELETE using `auth.uid() = user_id`.
5. Strengthen INSERT/UPDATE checks so `dataset_id` belongs to the same user.
6. Verify owner listing, Save, Save As, rename, delete, publishing and Story creation.
7. Repeat the anonymous exact-count probe; expected result is zero visible rows or permission denied.

Do not delete or rewrite the two reports. This is an access-control migration only.

#### DB-AUD-001 - Arbitrary SQL in a `SECURITY DEFINER` RPC

`run_dataset_query(uuid, text)` validates ownership of one dataset but executes caller-provided SQL under the function owner's privileges. It does not require the query to reference the selected dataset and uses `search_path = public`.

Risk: direct RPC callers may attempt to read or invoke objects outside the owned analytical table, bypassing the intended Query Model boundary.

Exact proposal:

1. Introduce a typed analytics RPC accepting dimensions, measures, aggregations, filters, ordering and limit rather than SQL text.
2. Resolve and quote the owned normalized table only inside PostgreSQL.
3. Migrate `QueryService` to the typed RPC.
4. Revoke `run_dataset_query` from `authenticated` only after compatibility tests and all callers migrate.
5. If temporary compatibility is unavoidable, reject multi-statements and every relation/function except the resolved dataset table; this is transitional, not the target architecture.

Do not drop the current RPC before migration because Reports and Stories actively depend on it.

#### DB-AUD-002 - Dataset artifact privacy cannot be proven

Application code stores `getPublicUrl()` values for raw files, normalized CSV and manifests in bucket `files`. If `storage.buckets.public = true`, private dataset artifacts are anonymously retrievable.

Exact proposal if confirmed public:

1. Create a private replacement bucket or make `files` private after an access migration.
2. Add owner-scoped `storage.objects` policies based on the first path segment (`user_id`).
3. Replace public URLs with object paths and authenticated downloads / short-lived signed URLs.
4. Validate reopening datasets before removing old access.
5. Never expose partition manifests or raw files through public report/story URLs.

No bucket change should occur until the real bucket flag, policies and all stored paths are inventoried.

#### DB-AUD-003 - Real schema and failed-import evidence unavailable to this audit session

The real OpenAPI inventory returned `401` because schema introspection is restricted to `service_role`. Without read credentials, session/chunk/staging state and PostgreSQL logs cannot be asserted.

Required evidence before cleanup:

- Session id and status for the 514,704-row import.
- `expected/appended/confirmed` rows and chunks.
- Staging relation existence and size.
- Final relation pointer, row count and checksum.
- Storage objects and manifest descriptor.
- Original HTTP/PostgreSQL finalization error.

### P1 - Maintainability / Integrity

#### DB-AUD-004 - Base schema is not reproducible

The repository does not create `datasets` or `reports`, and does not declare the complete `reports` RLS baseline or Storage bucket policies.

Proposal: after real introspection, create a non-destructive baseline migration containing missing definitions with `IF NOT EXISTS`, plus a schema snapshot used by CI. Do not recreate existing tables.

#### DB-AUD-005 - Foreign keys remain `NOT VALID`

Lifecycle migrations add several foreign keys as `NOT VALID`. New rows are protected, but historical rows may violate relationships indefinitely.

Proposal: execute read-only orphan checks, reconcile each exception with an approved disposition, then use a new migration with `VALIDATE CONSTRAINT`. Never validate before preserving/repairing evidence.

#### DB-AUD-006 - Parent ownership is not enforced by all child insert policies

Several RLS `WITH CHECK` clauses validate only `auth.uid() = user_id`; migrations do not show checks that `dataset_id`, `report_id`, `story_id` and `source_report_id` belong to that user.

Proposal: add parent-ownership predicates and database-level consistency triggers/constraints where cross-table user equality cannot be expressed as a normal FK. First report mismatches; do not rewrite existing ownership blindly.

#### DB-AUD-007 - Anonymous public snapshot policies permit bulk enumeration

The public policies allow anonymous selection of every non-revoked snapshot, not only lookup by a known slug. This also exposes ownership/reference columns included in `select('*')`.

Proposal: expose narrowly scoped `get_public_report_snapshot(slug)` and `get_public_story_snapshot(slug)` RPCs/views returning only playback fields; revoke anonymous table-level select after public routes migrate.

#### DB-AUD-008 - Inconsistent `SECURITY DEFINER` hardening

New sync functions use `search_path = pg_catalog` and qualified names, while older lifecycle, limits and analytics functions use `search_path = public`.

Proposal: in a compatibility migration, fully qualify every relation/helper and set a fixed safe search path. Confirm owner and explicit EXECUTE grants for every definer function. Revoke default `PUBLIC` execution where not intended.

#### DB-AUD-009 - Small and large persistence produce different integrity metadata

Large imports populate generation, authoritative row count and checksum. `sync_normalized_dataset` remains active for small imports but only updates `normalized_table_name`.

Proposal: either route small imports through the session contract or make the small RPC atomically populate equivalent generation/count/checksum metadata. Preserve the small-file API until regression coverage passes.

#### DB-AUD-010 - Storage cleanup is not transactional or retryable

PostgreSQL deletion completes before Storage cleanup. A failed object removal is logged but no durable retry task is created.

Proposal: add an owner-scoped cleanup outbox with artifact path, entity id, status, attempts and last error. Process idempotently from authorized backend. Do not restore deleted DB rows merely because object cleanup failed.

#### DB-AUD-011 - Completed MP4 jobs may outlive local files

`story_export_jobs.output_path` points to local filesystem artifacts. Database rows can remain `completed` after process restart or ephemeral filesystem eviction.

Proposal: reconcile completed rows against artifact availability, mark missing artifacts expired/failed using an explicit lifecycle, and move production artifacts to durable private object storage before cleaning historical jobs.

### P2 - Optimization / Retention

#### DB-AUD-012 - Index candidates require real statistics

Potential additions based on current query shapes:

- `datasets(user_id, created_at desc)`.
- `stories(user_id, updated_at desc)`.
- `story_export_jobs(story_id, created_at desc)`.

Potential low-value indexes requiring `pg_stat_user_indexes` evidence before removal:

- `story_export_jobs_phase_idx`.
- `story_export_jobs_heartbeat_idx`.
- Separate low-cardinality status indexes where the cache composites already satisfy actual plans.

Use `EXPLAIN (ANALYZE, BUFFERS)` only on safe representative SELECTs and retain at least one meaningful observation period. Zero rows or zero scans is not sufficient removal evidence.

#### DB-AUD-013 - No explicit retention policy

Completed/aborted sync sessions, chunks, cleanup logs, revoked snapshots and failed exports can grow indefinitely. They also provide important recovery and audit evidence.

Proposal: define product/legal retention first. Archive checksum/session evidence before bounded batch deletion. Explicitly exclude the failed 514,704-row import until acceptance is complete.

## Objects to Preserve

- All core product tables and their valid rows.
- All referenced `dataset_<uuid>` analytical tables.
- Active/recent staging sessions.
- The failed 514,704-row session, chunks, staging table, manifest and Storage objects.
- Active and revoked snapshots until retention is approved.
- Export jobs while artifacts or support diagnostics depend on them.
- Cleanup logs until a retention policy exists.
- All Supabase-managed `auth`, `storage`, realtime, vault and migration objects.

## Cleanup Candidates Requiring Real Evidence

No object is approved for deletion yet. Candidate classes are:

1. `dataset_staging_*` with no session row, after identifying creator and backup.
2. Staging tables for `aborted`/`superseded` sessions older than 24 hours, using the existing locked cleanup function.
3. `dataset_<uuid>` tables not referenced by any dataset and not referenced in backup/history.
4. Old function signatures that the 20261105 migration intended to drop, only if no dependencies remain.
5. Structurally duplicate indexes proven by catalog comparison.
6. Expired export jobs whose durable artifact is absent and whose retention period elapsed.
7. Unreferenced Storage objects after raw, normalized, manifest-part and export references are reconciled.

Every candidate needs object id/name, owner, dependency graph, size, last activity, backup location and rollback procedure.

## Safe Cleanup Plan (Not Executed)

### Phase 0 - Evidence and Recovery

1. Export schema-only and selected data backups for all Sphere-owned tables.
2. Capture migration history, function definitions, grants, RLS, jobs and object inventory.
3. Record failed-import session/chunk checksums and staging relation identity.
4. Copy candidate Storage objects to a private quarantine prefix/bucket; do not delete.
5. Define restoration commands and test them in QA.

### Phase 1 - Security Hardening Without Cleanup

1. Replace arbitrary-SQL analytics access.
2. Close anonymous access to `reports` and verify owner RLS.
3. Restrict public snapshot retrieval to safe slug RPCs.
4. Harden `SECURITY DEFINER` search paths and grants.
5. Add parent ownership enforcement.
6. Validate no regression in upload, Instant Wow, Refine, public reports, Stories, PNG and MP4.

### Phase 2 - Integrity and Performance

1. Reconcile all orphan/mismatch reports.
2. Validate existing `NOT VALID` foreign keys.
3. Add only indexes justified by query plans.
4. Establish durable artifact/outbox lifecycle.

### Phase 3 - Controlled Cleanup

1. Generate a signed candidate manifest; human approval is required.
2. Clean one class at a time in bounded batches.
3. Re-run row counts, checksums, FK checks, RLS tests and product smoke tests after each batch.
4. Keep quarantine/backups through the agreed recovery window.
5. Restore immediately if counts, checksums or functional smoke tests diverge.

## Required Real-Supabase Follow-up

Run `tests/sql/supabase_readonly_audit.sql` with read catalog access and attach the unmodified output. Also export:

- `cron.job` and recent job-run details.
- PostgreSQL logs for the failed finalization window.
- Storage bucket configuration and policies.
- Supabase advisors/security findings.
- `EXPLAIN` plans for report listing, Story listing, publication lookup, export-cache lookup and normalized query execution.

Only after that evidence is reviewed can any cleanup migration be considered safe.
