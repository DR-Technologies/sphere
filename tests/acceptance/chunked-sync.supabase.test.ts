import { createClient, type SupabaseClient } from '@supabase/supabase-js';
import { afterAll, beforeAll, describe, expect, it } from 'vitest';

const config = {
  url: process.env.NEXT_PUBLIC_SUPABASE_URL,
  anonKey: process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY,
  serviceRoleKey: process.env.SUPABASE_SERVICE_ROLE_KEY,
  email: process.env.SPHERE_SUPABASE_TEST_EMAIL,
  password: process.env.SPHERE_SUPABASE_TEST_PASSWORD
};
const runRemote = process.env.SPHERE_RUN_SUPABASE_PERSISTENCE === '1'
  && Object.values(config).every(Boolean);

const columns = [
  { name: 'id', type: 'INTEGER' },
  { name: 'amount', type: 'DOUBLE' },
  { name: 'active', type: 'BOOLEAN' },
  { name: 'event_date', type: 'DATE' },
  { name: 'event_time', type: 'TIMESTAMP' },
  { name: 'label', type: 'VARCHAR' }
];

function makeRows(version: string) {
  return Array.from({ length: 4 }, (_, index) => ({
    id: index + 1,
    amount: Number(`${index + 1}.${index + 2}`),
    active: index % 2 === 0,
    event_date: `2026-0${index + 1}-0${index + 1}`,
    event_time: `2026-0${index + 1}-0${index + 1}T0${index}:00:00.000Z`,
    label: `${version}-row-${index + 1}`
  }));
}

describe.skipIf(!runRemote)('isolated Supabase chunked sync acceptance', () => {
  let client: SupabaseClient;
  let admin: SupabaseClient;
  let datasetId: string;
  const sessions: string[] = [];

  async function begin() {
    const { data, error } = await client.rpc('begin_normalized_dataset_sync', {
      p_dataset_id: datasetId,
      p_chunk_size: 2
    });
    if (error) throw error;
    const sessionId = data.session_id as string;
    sessions.push(sessionId);
    return sessionId;
  }

  async function append(sessionId: string, chunkIndex: number, rows: ReturnType<typeof makeRows>) {
    return client.rpc('append_normalized_dataset_rows', {
      p_session_id: sessionId,
      p_chunk_index: chunkIndex,
      p_rows: rows
    });
  }

  beforeAll(async () => {
    client = createClient(config.url!, config.anonKey!, {
      auth: { persistSession: false, autoRefreshToken: false }
    });
    admin = createClient(config.url!, config.serviceRoleKey!, {
      auth: { persistSession: false, autoRefreshToken: false }
    });
    const { data: auth, error: authError } = await client.auth.signInWithPassword({
      email: config.email!,
      password: config.password!
    });
    if (authError || !auth.user) throw authError || new Error('QA authentication failed.');

    const stats = columns.map((column) => ({
      column: column.name,
      type: column.type,
      min: null,
      max: null,
      total: 4,
      nulls: 0,
      unique: 4
    }));
    const { data, error } = await client.from('datasets').insert({
      user_id: auth.user.id,
      name: `__sphere_chunk_sync_qa_${crypto.randomUUID()}`,
      file_url: 'qa://isolated-chunk-sync',
      columns,
      stats
    }).select('id').single();
    if (error) throw error;
    datasetId = data.id;
  });

  afterAll(async () => {
    if (!client || !datasetId) return;
    for (const sessionId of sessions) {
      await client.rpc('abort_normalized_dataset_sync', { p_session_id: sessionId });
    }
    await client.rpc('delete_dataset_lifecycle', { p_dataset_id: datasetId });
    await client.auth.signOut();
  });

  it('isolates concurrent sessions and preserves every typed column', async () => {
    const rowsA = makeRows('a');
    const rowsB = makeRows('b');
    const sessionA = await begin();
    const sessionB = await begin();

    const first = await append(sessionA, 0, rowsA.slice(0, 2));
    expect(first.error).toBeNull();
    const replay = await append(sessionA, 0, rowsA.slice(0, 2));
    expect(replay.error).toBeNull();
    expect(replay.data.replayed).toBe(true);
    expect((await append(sessionB, 0, rowsB.slice(0, 2))).error).toBeNull();
    expect((await append(sessionB, 1, rowsB.slice(2))).error).toBeNull();
    expect((await append(sessionA, 1, rowsA.slice(2))).error).toBeNull();

    const completedA = await client.rpc('complete_normalized_dataset_sync', { p_session_id: sessionA });
    expect(completedA.error).toBeNull();
    expect(completedA.data.row_count).toBe(4);
    expect(completedA.data.content_checksum).toMatch(/^[0-9a-f]{32}$/);

    const completedB = await client.rpc('complete_normalized_dataset_sync', { p_session_id: sessionB });
    expect(completedB.error).not.toBeNull();

    const { data: queryRows, error: queryError } = await client.rpc('run_dataset_query', {
      p_dataset_id: datasetId,
      p_query: 'SELECT * FROM dataset ORDER BY "id"'
    });
    expect(queryError).toBeNull();
    const actual = queryRows.map((entry: { row_data: Record<string, unknown> }) => entry.row_data);
    expect(actual).toHaveLength(rowsA.length);
    for (let index = 0; index < rowsA.length; index += 1) {
      expect(Object.keys(actual[index]).sort()).toEqual(Object.keys(rowsA[index]).sort());
      expect(actual[index].id).toBe(rowsA[index].id);
      expect(actual[index].amount).toBe(rowsA[index].amount);
      expect(actual[index].active).toBe(rowsA[index].active);
      expect(actual[index].event_date).toBe(rowsA[index].event_date);
      expect(new Date(String(actual[index].event_time)).getTime()).toBe(new Date(rowsA[index].event_time).getTime());
      expect(actual[index].label).toBe(rowsA[index].label);
    }
  });

  it('rejects partial completion, resumes after interruption, and aborts exactly one session', async () => {
    const recoveredRows = makeRows('recovered');
    const interrupted = await begin();
    expect((await append(interrupted, 0, recoveredRows.slice(0, 2))).error).toBeNull();

    const partialComplete = await client.rpc('complete_normalized_dataset_sync', { p_session_id: interrupted });
    expect(partialComplete.error).not.toBeNull();

    expect((await append(interrupted, 1, recoveredRows.slice(2))).error).toBeNull();
    const recovered = await client.rpc('complete_normalized_dataset_sync', { p_session_id: interrupted });
    expect(recovered.error).toBeNull();
    expect(recovered.data.row_count).toBe(4);

    const aborted = await begin();
    expect((await append(aborted, 0, makeRows('aborted').slice(0, 2))).error).toBeNull();
    expect((await client.rpc('abort_normalized_dataset_sync', { p_session_id: aborted })).data).toBe(true);
    expect((await append(aborted, 1, makeRows('aborted').slice(2))).error).not.toBeNull();

    const { data: finalRows, error: finalError } = await client.rpc('run_dataset_query', {
      p_dataset_id: datasetId,
      p_query: 'SELECT * FROM dataset ORDER BY "id"'
    });
    expect(finalError).toBeNull();
    expect(finalRows.map((entry: { row_data: { label: string } }) => entry.row_data.label))
      .toEqual(recoveredRows.map((row) => row.label));
  });

  it('cleans only a stale staging session through service_role', async () => {
    const stale = await begin();
    expect((await append(stale, 0, makeRows('stale').slice(0, 2))).error).toBeNull();

    const staleTimestamp = new Date(Date.now() - 25 * 60 * 60 * 1000).toISOString();
    const aged = await admin
      .from('normalized_dataset_sync_sessions')
      .update({ updated_at: staleTimestamp })
      .eq('id', stale);
    expect(aged.error).toBeNull();

    const unauthorized = await client.rpc('cleanup_abandoned_normalized_dataset_sync', { p_limit: 100 });
    expect(unauthorized.error).not.toBeNull();
    const cleanup = await admin.rpc('cleanup_abandoned_normalized_dataset_sync', { p_limit: 100 });
    expect(cleanup.error).toBeNull();
    expect(cleanup.data.cleaned).toBeGreaterThanOrEqual(1);
    expect(cleanup.data.failed).toBe(0);

    const { data: session, error: sessionError } = await admin
      .from('normalized_dataset_sync_sessions')
      .select('status, staging_cleaned_at, staging_cleanup_result')
      .eq('id', stale)
      .single();
    expect(sessionError).toBeNull();
    if (!session) throw new Error('Expected the stale sync session to remain available for audit.');
    expect(session.status).toBe('aborted');
    expect(session.staging_cleaned_at).toBeTruthy();
    expect(['dropped', 'already_missing']).toContain(session.staging_cleanup_result);
    expect((await append(stale, 1, makeRows('stale').slice(2))).error).not.toBeNull();

    const { data: logs, error: logError } = await admin
      .from('normalized_dataset_sync_cleanup_log')
      .select('result')
      .eq('session_id', stale);
    expect(logError).toBeNull();
    expect(logs?.some((entry) => ['dropped', 'already_missing'].includes(entry.result))).toBe(true);
  });
});
