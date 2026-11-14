import fs from 'node:fs';
import path from 'node:path';
import { describe, expect, it } from 'vitest';

const migration = fs.readFileSync(
  path.resolve('supabase/migrations/20261111_security_hardening.sql'),
  'utf8'
);
const prechecks = fs.readFileSync(
  path.resolve('tests/sql/security_hardening_prechecks.sql'),
  'utf8'
);

describe('Sphere V1 security hardening migration', () => {
  it('makes private report access owner and dataset scoped', () => {
    expect(migration).toContain('alter table public.datasets enable row level security');
    expect(migration).toContain('alter table public.reports enable row level security');
    expect(migration).toContain('revoke all on table public.datasets from public, anon');
    expect(migration).toContain('revoke all on table public.reports from public, anon');
    expect(migration).toContain("where schemaname = 'public' and tablename = 'datasets'");
    expect(migration).toContain("where schemaname = 'public' and tablename = 'reports'");
    expect(migration).toContain('create policy reports_select_own');
    expect(migration).toContain('create policy reports_insert_own');
    expect(migration).toContain('dataset.user_id = auth.uid()');
    expect(migration).toContain('datasets_authenticated_owner_guard');
    expect(migration.match(/create policy reports_[a-z_]+[\s\S]*?to authenticated/g)).toHaveLength(4);
    expect(migration).not.toMatch(/create policy reports_[a-z_]+\s+on public\.reports[^;]+to anon/);
  });

  it('rejects report, Story, snapshot, and export ownership mismatches independently of the client', () => {
    expect(migration).toContain('REPORT_DATASET_OWNER_MISMATCH');
    expect(migration).toContain('SNAPSHOT_DATASET_OWNER_MISMATCH');
    expect(migration).toContain('SNAPSHOT_REPORT_OWNER_MISMATCH');
    expect(migration).toContain('STORY_DATASET_OWNER_MISMATCH');
    expect(migration).toContain('STORY_REPORT_OWNER_MISMATCH');
    expect(migration).toContain('STORY_SNAPSHOT_PARENT_OWNER_MISMATCH');
    expect(migration).toContain('STORY_EXPORT_OWNER_MISMATCH');
    expect(migration).toContain('reports_dataset_owner_guard');
    expect(migration).toContain('public_report_snapshot_owner_guard');
    expect(migration).toContain('stories_parent_owner_guard');
    expect(migration).toContain('public_story_snapshot_owner_guard');
    expect(migration).toContain('story_export_owner_guard');
  });

  it('keeps public sharing slug-scoped without anonymous table enumeration', () => {
    expect(migration).toContain('alter table public.public_report_snapshots enable row level security');
    expect(migration).toContain('create policy public_report_snapshots_select_own');
    expect(migration).toContain('create or replace function public.get_public_report_snapshot');
    expect(migration).toContain('create or replace function public.get_public_story_snapshot');
    expect(migration).toContain('and snapshot.revoked_at is null');
    expect(migration).toContain('grant execute on function public.get_public_report_snapshot(text) to anon, authenticated');
    expect(migration).toContain('grant execute on function public.get_public_story_snapshot(text) to anon, authenticated');
    expect(migration).not.toContain('grant select on table public.public_report_snapshots to anon');
    expect(migration).not.toContain('grant select on table public.public_story_snapshots to anon');
  });

  it('protects dynamic analytical tables and removes definer-owned arbitrary SQL execution', () => {
    expect(migration).toContain('create or replace function public.secure_normalized_dataset_table');
    expect(migration).toContain('alter table public.%I enable row level security');
    expect(migration).toContain('create policy normalized_dataset_owner_select');
    expect(migration).toContain('datasets_secure_normalized_table');
    expect(migration).toMatch(/create or replace function public\.run_dataset_query[\s\S]*?security invoker/);
    expect(migration).toContain("validation_query !~* '\\mfrom[[:space:]]+dataset");
    expect(migration).toContain('in_string_literal boolean := false');
    expect(migration).toContain('in_quoted_identifier boolean := false');
    expect(migration).toContain("from_clause := substring(lower(validation_query) from '\\mfrom[[:space:]]+dataset\\M')");
    expect(migration).toContain("p_query placing format('public.%I', table_name)");
    expect(migration).not.toContain("regexp_replace(\n    p_query,\n    '\\mdataset\\M'");
    expect(migration).toContain('select to_jsonb(q) from (%s) q limit 1000');
    expect(migration).not.toMatch(/create or replace function public\.run_dataset_query[\s\S]*?security definer/);
  });

  it('keeps optional migration history checks read-only when the Supabase history table is absent', () => {
    expect(prechecks).toContain("to_regclass('supabase_migrations.schema_migrations') is null");
    expect(prechecks).toContain('MIGRATION_HISTORY_UNAVAILABLE');
    expect(prechecks).toContain('execute $history$');
    expect(prechecks).not.toMatch(/select version, name, statements\s+from supabase_migrations\.schema_migrations/i);
    expect(prechecks).not.toMatch(/create\s+table\s+supabase_migrations\.schema_migrations/i);
  });

  it('makes files private and restricts every authenticated object to its owner prefix', () => {
    expect(migration).toContain('FILES_BUCKET_MISSING');
    expect(migration).toMatch(/update storage\.buckets[\s\S]*?set public = false[\s\S]*?where id = 'files'/);
    expect(migration).toContain('sphere_files_authenticated_owner_guard');
    expect(migration).toContain('sphere_files_anon_deny_guard');
    expect(migration).toContain("split_part(name, '/', 1) = auth.uid()::text");
    expect(migration).toContain('and public.is_current_account_active()');
    expect(migration).toContain("using (bucket_id <> 'files')");
  });

  it('does not mutate product rows or move Storage objects', () => {
    expect(migration).not.toMatch(/delete\s+from\s+public\.(datasets|reports|stories|public_report_snapshots|public_story_snapshots|story_export_jobs)/i);
    expect(migration).not.toMatch(/drop\s+table/i);
    expect(migration).not.toMatch(/truncate/i);
  });
});
