import fs from 'node:fs';
import path from 'node:path';
import { describe, expect, it } from 'vitest';

const migration = fs.readFileSync(
  path.resolve(process.cwd(), 'supabase/migrations/20261108_harden_dataset_query_execution.sql'),
  'utf8'
);

describe('dataset query RPC migration', () => {
  it('preserves ownership and records PostgreSQL diagnostics without extending timeouts', () => {
    expect(migration).toContain('where id = p_dataset_id');
    expect(migration).toContain('and user_id = auth.uid()');
    expect(migration).toContain('set search_path = pg_catalog');
    expect(migration).toContain("when sqlstate '57014'");
    expect(migration).toContain('returned_sqlstate');
    expect(migration).toContain('query_hash');
    expect(migration).not.toMatch(/statement_timeout/i);
    expect(migration).not.toMatch(/alter\s+(role|database)/i);
  });
});
