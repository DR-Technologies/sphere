import { readFileSync } from 'node:fs';
import { describe, expect, it } from 'vitest';

const migration = readFileSync(
  'supabase/migrations/20261115_suspended_account_security_forward_fix.sql',
  'utf8'
).toLowerCase();

describe('suspended account security forward fix migration', () => {
  it('is transactional and requires the existing private-storage hardening', () => {
    expect(migration.trimStart().startsWith('begin;')).toBe(true);
    expect(migration.trimEnd().endsWith('commit;')).toBe(true);
    expect(migration).toContain('private_files_bucket_prerequisite_missing');
    expect(migration).toContain("id = 'files' and public = false");
  });

  it('adds restrictive active-account policies to every client-private table', () => {
    for (const table of [
      'datasets',
      'reports',
      'stories',
      'public_report_snapshots',
      'public_story_snapshots',
      'story_export_jobs',
      'user_roles'
    ]) {
      expect(migration).toContain(`'${table}'`);
    }
    expect(migration).toContain('as restrictive for all to authenticated');
    expect(migration).toContain('public.is_current_account_active()');
  });

  it('protects existing and future analytical relations', () => {
    expect(migration).toContain('normalized_dataset_active_account_guard');
    expect(migration).toContain('create or replace function public.secure_normalized_dataset_table');
    expect(migration).toContain('perform public.secure_normalized_dataset_table(dataset_record.id)');
  });

  it('guards invoker queries and definer-backed private operations', () => {
    expect(migration).toContain("raise exception 'account_suspended'");
    expect(migration).toContain('create or replace function public.enforce_active_account_private_mutation');
    expect(migration).toContain('perform public.enforce_active_account_request()');
    expect(migration).toContain('create or replace function public.get_dataset_delete_dependencies');
    expect(migration).toContain('create or replace function public.run_dataset_query');
  });

  it('does not reopen Storage or mutate product data', () => {
    expect(migration).not.toContain('set public = true');
    expect(migration).not.toMatch(/\b(delete|truncate)\s+from\s+public\./);
    expect(migration).not.toMatch(/\bdrop\s+table\b/);
  });
});
