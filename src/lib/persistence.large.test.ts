import { beforeEach, describe, expect, it, vi } from 'vitest';

const { getSession, rpc } = vi.hoisted(() => ({
  getSession: vi.fn(),
  rpc: vi.fn()
}));

vi.mock('@/lib/supabase', () => ({
  supabase: {
    auth: { getSession },
    rpc
  }
}));

import { DatasetImportError, syncNormalizedDataset } from './persistence';

const FINALIZE_URL = 'https://qa.supabase.test/rest/v1/rpc/complete_normalized_dataset_sync';

function jsonResponse(payload: unknown, status = 200) {
  return new Response(JSON.stringify(payload), {
    status,
    headers: { 'Content-Type': 'application/json' }
  });
}

function successfulRpc(sessionId = 'session-a') {
  return async (name: string, params: Record<string, unknown>) => {
    if (name === 'begin_normalized_dataset_sync') {
      return { data: { session_id: sessionId, expected_rows: 10_001, expected_chunks: 3 }, error: null };
    }
    if (name === 'append_normalized_dataset_rows') {
      const chunk = params.p_rows as unknown[];
      return {
        data: {
          session_id: sessionId,
          chunk_index: params.p_chunk_index,
          row_count: chunk.length,
          checksum: `checksum-${params.p_chunk_index}`,
          replayed: false
        },
        error: null
      };
    }
    return { data: true, error: null };
  };
}

describe('session-based normalized dataset persistence', () => {
  const rows = Array.from({ length: 10_001 }, (_, index) => ({ id: index, value: `row-${index}` }));
  const columns = [{ name: 'id', type: 'INTEGER' }, { name: 'value', type: 'VARCHAR' }];

  beforeEach(() => {
    vi.unstubAllEnvs();
    vi.stubEnv('NEXT_PUBLIC_SUPABASE_URL', 'https://qa.supabase.test');
    vi.stubEnv('NEXT_PUBLIC_SUPABASE_ANON_KEY', 'anon-key');
    rpc.mockReset();
    getSession.mockReset();
    getSession.mockResolvedValue({
      data: { session: { access_token: 'access-token' } },
      error: null
    });
    vi.stubGlobal('fetch', vi.fn().mockResolvedValue(jsonResponse({
      table_name: 'dataset_table',
      row_count: 10_001,
      content_checksum: 'final-checksum'
    })));
  });

  it('writes a finite ordered sequence and accepts server integrity confirmations', async () => {
    rpc.mockImplementation(successfulRpc());
    const progress: Array<{ stage: string; processedRows: number }> = [];
    const table = await syncNormalizedDataset('dataset-id', columns, rows, (state) => {
      progress.push({ stage: state.stage, processedRows: state.processedRows || 0 });
    });

    expect(table).toBe('dataset_table');
    expect(rpc).toHaveBeenCalledWith('begin_normalized_dataset_sync', {
      p_dataset_id: 'dataset-id',
      p_chunk_size: 5_000
    });
    const appendCalls = rpc.mock.calls.filter(([name]) => name === 'append_normalized_dataset_rows');
    expect(appendCalls).toHaveLength(3);
    expect(appendCalls.map(([, params]) => params.p_chunk_index)).toEqual([0, 1, 2]);
    expect(appendCalls.every(([, params]) => params.p_session_id === 'session-a')).toBe(true);
    expect(fetch).toHaveBeenCalledWith(FINALIZE_URL, expect.objectContaining({
      method: 'POST',
      body: JSON.stringify({ p_session_id: 'session-a' })
    }));
    expect(progress.at(-1)).toEqual({ stage: 'finalizing', processedRows: 10_001 });
  });

  it('aborts only its own session after an interrupted chunk sequence', async () => {
    let appendCalls = 0;
    rpc.mockImplementation(async (name: string, params: Record<string, unknown>) => {
      if (name === 'begin_normalized_dataset_sync') {
        return { data: { session_id: 'interrupted-session', expected_rows: 10_001, expected_chunks: 3 }, error: null };
      }
      if (name === 'append_normalized_dataset_rows') {
        appendCalls += 1;
        if (appendCalls === 2) return { data: null, error: new Error('chunk failed') };
        return { data: { chunk_index: params.p_chunk_index, row_count: (params.p_rows as unknown[]).length, checksum: 'confirmed' }, error: null };
      }
      return { data: true, error: null };
    });

    await expect(syncNormalizedDataset('dataset-id', columns, rows)).rejects.toMatchObject({
      name: 'DatasetImportError',
      stage: 'persisting'
    });
    expect(rpc).toHaveBeenCalledWith('abort_normalized_dataset_sync', { p_session_id: 'interrupted-session' });
    expect(fetch).not.toHaveBeenCalled();
  });

  it('rejects a session whose authoritative row contract differs from the profile', async () => {
    rpc.mockImplementation(async (name: string) => {
      if (name === 'begin_normalized_dataset_sync') {
        return { data: { session_id: 'wrong-contract', expected_rows: 10_000, expected_chunks: 2 }, error: null };
      }
      return { data: true, error: null };
    });

    await expect(syncNormalizedDataset('dataset-id', columns, rows)).rejects.toBeInstanceOf(DatasetImportError);
    expect(rpc.mock.calls.some(([name]) => name === 'append_normalized_dataset_rows')).toBe(false);
    expect(rpc).toHaveBeenCalledWith('abort_normalized_dataset_sync', { p_session_id: 'wrong-contract' });
  });

  it('does not accept completion without a server checksum', async () => {
    rpc.mockImplementation(successfulRpc());
    vi.mocked(fetch).mockResolvedValueOnce(jsonResponse({ table_name: 'dataset_table', row_count: 10_001 }));

    await expect(syncNormalizedDataset('dataset-id', columns, rows)).rejects.toMatchObject({
      name: 'DatasetImportError',
      stage: 'persisting'
    });
    expect(rpc).toHaveBeenCalledWith('abort_normalized_dataset_sync', { p_session_id: 'session-a' });
  });

  it('preserves the HTTP and PostgreSQL diagnostics from a failed finalization', async () => {
    rpc.mockImplementation(successfulRpc());
    const progress: Array<{ stage: string; progress: number }> = [];
    vi.mocked(fetch).mockResolvedValueOnce(jsonResponse({
      code: '57014',
      details: null,
      hint: 'Increase only the function timeout after reviewing the query.',
      message: 'canceling statement due to statement timeout'
    }, 500));

    await expect(syncNormalizedDataset('dataset-id', columns, rows, (state) => {
      progress.push({ stage: state.stage, progress: state.progress });
    })).rejects.toMatchObject({
      name: 'DatasetImportError',
      stage: 'finalizing',
      code: 'NORMALIZED_DATASET_FINALIZE_FAILED',
      diagnostics: {
        httpStatus: 500,
        postgresCode: '57014',
        message: 'canceling statement due to statement timeout'
      }
    });
    expect(progress.at(-1)).toEqual({ stage: 'finalizing', progress: 0 });
    expect(progress).not.toContainEqual({ stage: 'finalizing', progress: 1 });
    expect(rpc).toHaveBeenCalledWith('abort_normalized_dataset_sync', { p_session_id: 'session-a' });
  });

  it('keeps concurrent calls isolated by their server-issued session ids', async () => {
    let beginCount = 0;
    rpc.mockImplementation(async (name: string, params: Record<string, unknown>) => {
      if (name === 'begin_normalized_dataset_sync') {
        beginCount += 1;
        const sessionId = beginCount === 1 ? 'session-a' : 'session-b';
        return { data: { session_id: sessionId, expected_rows: 10_001, expected_chunks: 3 }, error: null };
      }
      if (name === 'append_normalized_dataset_rows') {
        return {
          data: {
            chunk_index: params.p_chunk_index,
            row_count: (params.p_rows as unknown[]).length,
            checksum: `${params.p_session_id}-${params.p_chunk_index}`
          },
          error: null
        };
      }
      return { data: true, error: null };
    });
    vi.mocked(fetch).mockImplementation(async (_input, init) => {
      const sessionId = JSON.parse(String(init?.body)).p_session_id;
      return sessionId === 'session-a'
        ? jsonResponse({ table_name: 'dataset_table', row_count: 10_001, content_checksum: 'final-a' })
        : jsonResponse({ code: 'P0001', message: 'STALE_SYNC_SESSION' }, 409);
    });

    const first = await syncNormalizedDataset('dataset-id', columns, rows);
    await expect(syncNormalizedDataset('dataset-id', columns, rows)).rejects.toMatchObject({ stage: 'finalizing' });

    expect(first).toBe('dataset_table');
    expect(rpc).toHaveBeenCalledWith('abort_normalized_dataset_sync', { p_session_id: 'session-b' });
    expect(rpc).not.toHaveBeenCalledWith('abort_normalized_dataset_sync', { p_session_id: 'session-a' });
  });
});
