import fs from 'node:fs';
import path from 'node:path';
import { describe, expect, it } from 'vitest';

const migration = fs.readFileSync(
  path.resolve(process.cwd(), 'supabase/migrations/20261105_large_dataset_chunked_sync.sql'),
  'utf8'
);
const finalizeTimeoutMigration = fs.readFileSync(
  path.resolve(process.cwd(), 'supabase/migrations/20261106_large_dataset_finalize_timeout.sql'),
  'utf8'
);
const optimizedFinalizeMigration = fs.readFileSync(
  path.resolve(process.cwd(), 'supabase/migrations/20261107_optimize_large_dataset_finalize.sql'),
  'utf8'
);

describe('chunked sync migration contract', () => {
  it('uses isolated sessions, ordered column expansion and generation checks', () => {
    expect(migration).toContain('normalized_dataset_sync_sessions');
    expect(migration).toContain('normalized_dataset_sync_chunks');
    expect(migration).toMatch(/with ordinality/gi);
    expect(migration).toMatch(/order by ordinal/gi);
    expect(migration).toContain('normalized_sync_generation');
    expect(migration).toContain('session_record.base_generation');
  });

  it('validates all columns before transactionally replacing target contents', () => {
    expect(migration).toContain("to_jsonb(staging_row) - ''_sphere_chunk_index'' - ''_sphere_row_index''");
    expect(migration).toContain('payload_checksum = persisted_checksum');
    expect(migration).toContain('access exclusive mode');
    expect(migration).toContain("truncate table public.%I");
    expect(migration).toContain('Normalized dataset chunk % failed final integrity validation');
  });

  it('does not expose metadata tables or helpers to authenticated clients', () => {
    expect(migration).toContain('revoke all on table public.normalized_dataset_sync_sessions from public, anon, authenticated');
    expect(migration).toContain('revoke all on function public.normalized_dataset_table_name(uuid) from public, anon, authenticated');
    expect(migration).toContain('set search_path = pg_catalog');
  });

  it('cleans only stale session staging tables through a service-role maintenance RPC', () => {
    expect(migration).toContain('normalized_dataset_sync_cleanup_log');
    expect(migration).toContain("updated_at < stale_before");
    expect(migration).toContain('pg_advisory_xact_lock');
    expect(migration).toContain('for update');
    expect(migration).toContain("session_record.staging_table_name <> expected_staging_name");
    expect(migration).toContain("status in ('active', 'aborted', 'superseded')");
    expect(migration).toContain(
      'revoke all on function public.cleanup_abandoned_normalized_dataset_sync(integer) from public, anon, authenticated'
    );
    expect(migration).toContain(
      'grant execute on function public.cleanup_abandoned_normalized_dataset_sync(integer) to service_role'
    );
    expect(migration).toContain("'sphere-cleanup-abandoned-normalized-sync'");
    expect(migration).toContain("'17 * * * *'");
  });

  it('scopes the extended REST timeout to final reconciliation only', () => {
    expect(finalizeTimeoutMigration).toContain('alter function public.complete_normalized_dataset_sync(uuid)');
    expect(finalizeTimeoutMigration).toContain("statement_timeout = '60s'");
    expect(finalizeTimeoutMigration).not.toMatch(/alter\s+role/i);
    expect(finalizeTimeoutMigration).not.toMatch(/alter\s+database/i);
  });

  it('replaces the timeout workaround with immutable staging and bounded final reconciliation', () => {
    expect(optimizedFinalizeMigration).toContain('staging_immutable boolean not null default false');
    expect(optimizedFinalizeMigration).toContain('reject_normalized_dataset_staging_mutation');
    expect(optimizedFinalizeMigration).toContain('before update or delete or truncate');
    expect(optimizedFinalizeMigration).toContain('actual.min_row_index <> 0');
    expect(optimizedFinalizeMigration).toContain('confirmed.payload_checksum <> confirmed.persisted_checksum');
    expect(optimizedFinalizeMigration).toContain('if session_record.staging_immutable then');
    expect(optimizedFinalizeMigration).toContain('alter function public.complete_normalized_dataset_sync(uuid) reset statement_timeout');
    expect(optimizedFinalizeMigration).not.toMatch(/alter\s+role/i);
    expect(optimizedFinalizeMigration).not.toMatch(/alter\s+database/i);
  });
});
