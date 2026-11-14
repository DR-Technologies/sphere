import fs from 'node:fs/promises';
import path from 'node:path';
import { createClient, type SupabaseClient } from '@supabase/supabase-js';
import { afterAll, beforeAll, describe, expect, it } from 'vitest';
import { supabaseAnalyticsProvider } from '@/lib/analytics/providers/supabaseProvider';
import type { DatasetRow } from '@/lib/analytics/types';

const config = {
  url: process.env.NEXT_PUBLIC_SUPABASE_URL,
  anonKey: process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY,
  serviceRoleKey: process.env.SUPABASE_SERVICE_ROLE_KEY,
  email: process.env.SPHERE_SUPABASE_TEST_EMAIL,
  password: process.env.SPHERE_SUPABASE_TEST_PASSWORD,
  fixture: process.env.SPHERE_LARGE_XLSX_FIXTURE
};
const runRemoteLarge = process.env.SPHERE_RUN_SUPABASE_PERSISTENCE === '1'
  && Object.values(config).every(Boolean);

describe.skipIf(!runRemoteLarge)('real XLSX isolated Supabase persistence', () => {
  let client: SupabaseClient;
  let admin: SupabaseClient;
  let userId: string;
  let datasetId: string | undefined;
  let sessionId: string | undefined;

  beforeAll(async () => {
    client = createClient(config.url!, config.anonKey!, {
      auth: { persistSession: false, autoRefreshToken: false }
    });
    admin = createClient(config.url!, config.serviceRoleKey!, {
      auth: { persistSession: false, autoRefreshToken: false }
    });
    const { data, error } = await client.auth.signInWithPassword({
      email: config.email!,
      password: config.password!
    });
    if (error || !data.user) throw error || new Error('QA authentication failed.');
    userId = data.user.id;
  });

  afterAll(async () => {
    if (sessionId) await client.rpc('abort_normalized_dataset_sync', { p_session_id: sessionId });
    if (datasetId) await client.rpc('delete_dataset_lifecycle', { p_dataset_id: datasetId });
    if (client) await client.auth.signOut();
  });

  it('persists 514704 rows and all 14 columns without altering another dataset', async () => {
    const acceptanceStartedAt = performance.now();
    const rssBefore = process.memoryUsage().rss;
    const { data: beforeDatasets, error: beforeError } = await admin
      .from('datasets')
      .select('id, normalized_table_name, normalized_sync_generation, normalized_row_count, normalized_content_checksum');
    if (beforeError) throw beforeError;
    const baseline = new Map((beforeDatasets || []).map((dataset) => [dataset.id, JSON.stringify(dataset)]));

    const content = await fs.readFile(path.resolve(config.fixture!));
    const file = new File([content], path.basename(config.fixture!), {
      type: 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet'
    });
    const profile = await supabaseAnalyticsProvider.profileFile(file, { sheetName: '_datos' });
    const rows = profile.artifacts?.normalizedRows as DatasetRow[] | undefined;
    expect(rows).toHaveLength(514_704);
    expect(profile.columns).toHaveLength(14);
    expect(profile.stats.every((stat) => stat.total === 514_704)).toBe(true);

    const created = await client.from('datasets').insert({
      user_id: userId,
      name: `__sphere_large_sync_qa_${crypto.randomUUID()}`,
      file_url: 'qa://isolated-large-chunk-sync',
      sheet_name: '_datos',
      columns: profile.columns,
      stats: profile.stats
    }).select('id').single();
    if (created.error) throw created.error;
    datasetId = created.data.id;

    const chunkSize = 5_000;
    const begun = await client.rpc('begin_normalized_dataset_sync', {
      p_dataset_id: datasetId,
      p_chunk_size: chunkSize
    });
    if (begun.error) throw begun.error;
    sessionId = begun.data.session_id;
    expect(begun.data.expected_rows).toBe(514_704);
    expect(begun.data.expected_chunks).toBe(Math.ceil(514_704 / chunkSize));

    const confirmedChecksums: string[] = [];
    const interruptionChunk = 3;
    for (let start = 0; start < rows!.length; start += chunkSize) {
      const chunkIndex = Math.floor(start / chunkSize);
      const chunk = rows!.slice(start, Math.min(start + chunkSize, rows!.length));
      const appended = await client.rpc('append_normalized_dataset_rows', {
        p_session_id: sessionId,
        p_chunk_index: chunkIndex,
        p_rows: chunk
      });
      if (appended.error) throw appended.error;
      expect(appended.data.row_count).toBe(chunk.length);
      expect(appended.data.checksum).toMatch(/^[0-9a-f]{32}$/);
      confirmedChecksums.push(appended.data.checksum);

      if (chunkIndex === interruptionChunk) {
        const incomplete = await client.rpc('complete_normalized_dataset_sync', { p_session_id: sessionId });
        expect(incomplete.error).not.toBeNull();
        const replay = await client.rpc('append_normalized_dataset_rows', {
          p_session_id: sessionId,
          p_chunk_index: chunkIndex,
          p_rows: chunk
        });
        expect(replay.error).toBeNull();
        expect(replay.data.replayed).toBe(true);
        expect(replay.data.checksum).toBe(appended.data.checksum);
      }
    }

    const finalizeStartedAt = performance.now();
    const completed = await client.rpc('complete_normalized_dataset_sync', { p_session_id: sessionId });
    const finalizeDurationMs = performance.now() - finalizeStartedAt;
    if (completed.error) throw completed.error;
    expect(completed.data.row_count).toBe(514_704);
    expect(completed.data.chunk_count).toBe(confirmedChecksums.length);
    expect(completed.data.content_checksum).toMatch(/^[0-9a-f]{32}$/);
    expect(Number(completed.data.timings_ms?.total)).toBeGreaterThanOrEqual(0);

    const { data: persistedChunks, error: chunksError } = await admin
      .from('normalized_dataset_sync_chunks')
      .select('chunk_index, row_count, payload_checksum, persisted_checksum')
      .eq('session_id', sessionId)
      .order('chunk_index');
    if (chunksError) throw chunksError;
    expect(persistedChunks).toHaveLength(confirmedChecksums.length);
    for (let index = 0; index < persistedChunks!.length; index += 1) {
      expect(persistedChunks![index].chunk_index).toBe(index);
      expect(persistedChunks![index].payload_checksum).toBe(confirmedChecksums[index]);
      expect(persistedChunks![index].persisted_checksum).toBe(confirmedChecksums[index]);
    }

    const countQuery = await client.rpc('run_dataset_query', {
      p_dataset_id: datasetId,
      p_query: 'SELECT COUNT(*)::bigint AS row_count FROM dataset'
    });
    if (countQuery.error) throw countQuery.error;
    expect(Number(countQuery.data[0].row_data.row_count)).toBe(514_704);

    const columnQuery = await client.rpc('run_dataset_query', {
      p_dataset_id: datasetId,
      p_query: 'SELECT * FROM dataset LIMIT 1'
    });
    if (columnQuery.error) throw columnQuery.error;
    expect(Object.keys(columnQuery.data[0].row_data)).toHaveLength(14);
    expect(Object.keys(columnQuery.data[0].row_data).sort())
      .toEqual(profile.columns.map((column) => column.name).sort());

    const metadata = await admin.from('datasets')
      .select('normalized_row_count, normalized_content_checksum')
      .eq('id', datasetId)
      .single();
    if (metadata.error) throw metadata.error;
    expect(Number(metadata.data.normalized_row_count)).toBe(514_704);
    expect(metadata.data.normalized_content_checksum).toBe(completed.data.content_checksum);

    const { data: afterDatasets, error: afterError } = await admin
      .from('datasets')
      .select('id, normalized_table_name, normalized_sync_generation, normalized_row_count, normalized_content_checksum')
      .neq('id', datasetId);
    if (afterError) throw afterError;
    expect(new Map((afterDatasets || []).map((dataset) => [dataset.id, JSON.stringify(dataset)]))).toEqual(baseline);

    console.info(JSON.stringify({
      rowCount: 514_704,
      columnCount: 14,
      chunkCount: confirmedChecksums.length,
      finalizeDurationMs: Math.round(finalizeDurationMs),
      databaseTimingsMs: completed.data.timings_ms,
      totalDurationMs: Math.round(performance.now() - acceptanceStartedAt),
      rssDeltaBytes: process.memoryUsage().rss - rssBefore
    }));
  }, 1_200_000);
});
