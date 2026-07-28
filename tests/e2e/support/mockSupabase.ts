import type { BrowserContext, Page, Route } from '@playwright/test';

type Row = Record<string, string | number | boolean | null>;

interface MockDataset {
  id: string;
  user_id: string;
  name: string;
  file_url: string;
  normalized_file_url?: string;
  analytics_manifest_url?: string;
  normalized_table_name?: string;
  columns: { name: string; type: string; semanticRole?: string }[];
  stats: Array<{ column: string; type: string; total: number; nulls: number; unique: number; min: unknown; max: unknown }>;
  sheet_name?: string;
  created_at: string;
  rows: Row[];
}

interface MockReport {
  id: string;
  user_id: string;
  name: string;
  dataset_id: string;
  widgets: unknown[];
  filters: unknown[];
  presentation?: unknown;
  created_at: string;
}

interface MockSnapshot {
  id: string;
  slug: string;
  report_id: string | null;
  dataset_id: string;
  user_id: string;
  title: string;
  subtitle: string | null;
  template_id: string;
  widgets: unknown[];
  widget_results: unknown[];
  columns: unknown[];
  published_at: string;
  revoked_at: string | null;
  created_at: string;
  updated_at: string;
}

interface MockState {
  user: {
    id: string;
    email: string;
    user_metadata: { full_name: string };
    app_metadata: { provider: string; providers: string[] };
    aud: string;
  };
  datasets: MockDataset[];
  reports: MockReport[];
  snapshots: MockSnapshot[];
  networkErrors: string[];
  consoleErrors: string[];
}

function nowIso() {
  return new Date('2026-07-27T18:00:00.000Z').toISOString();
}

function randomId(prefix: string) {
  return `${prefix}_${Math.random().toString(36).slice(2, 10)}`;
}

function parseBody(text: string | null) {
  if (!text) return null;
  try {
    return JSON.parse(text);
  } catch {
    return null;
  }
}

function splitSelectItems(selectClause: string) {
  const items: string[] = [];
  let current = '';
  let depth = 0;

  for (const char of selectClause) {
    if (char === '(') depth += 1;
    if (char === ')') depth -= 1;

    if (char === ',' && depth === 0) {
      items.push(current.trim());
      current = '';
      continue;
    }

    current += char;
  }

  if (current.trim()) items.push(current.trim());
  return items;
}

function extractQuotedColumns(fragment: string) {
  return Array.from(fragment.matchAll(/"([^"]+)"/g)).map((match) => match[1]);
}

function applyWhere(rows: Row[], query: string) {
  const match = query.match(/WHERE\s+([\s\S]+?)(?:GROUP BY|ORDER BY|LIMIT|$)/i);
  if (!match) return rows;
  const conditions = Array.from(match[1].matchAll(/"([^"]+)"\s*=\s*'([^']*)'/g)).map((item) => ({
    column: item[1],
    value: item[2]
  }));

  return rows.filter((row) => conditions.every((condition) => String(row[condition.column] ?? '') === condition.value));
}

function aggregateValue(values: Array<string | number | boolean | null>, operator: string) {
  const nonNull = values.filter((value) => value !== null && value !== undefined && value !== '') as Array<string | number | boolean>;
  if (operator === 'COUNT') return nonNull.length;
  if (operator === 'DISTINCT') return new Set(nonNull.map((value) => JSON.stringify(value))).size;

  const numeric = nonNull.map((value) => Number(value)).filter((value) => Number.isFinite(value));
  if (!numeric.length) return null;

  if (operator === 'SUM') return numeric.reduce((sum, value) => sum + value, 0);
  if (operator === 'AVG') return numeric.reduce((sum, value) => sum + value, 0) / numeric.length;
  if (operator === 'MIN') return Math.min(...numeric);
  if (operator === 'MAX') return Math.max(...numeric);
  return null;
}

function executeQuery(query: string, dataset: MockDataset) {
  const filteredRows = applyWhere(dataset.rows, query);
  const groupColumns = (() => {
    const match = query.match(/GROUP BY\s+([\s\S]+?)(?:ORDER BY|LIMIT|$)/i);
    if (!match) return [] as string[];
    return extractQuotedColumns(match[1]);
  })();

  const selectMatch = query.match(/SELECT\s+([\s\S]+?)\s+FROM\s+dataset/i);
  const selectItems = splitSelectItems(selectMatch?.[1] || '');

  const buildProjection = (rows: Row[]) => {
    return selectItems.reduce<Row>((acc, item) => {
      const trimmed = item.trim();

      const aggregateAlias = trimmed.match(/^(SUM|AVG|MIN|MAX|COUNT)\("([^"]+)"(?:::double precision)?\)\s+as\s+"([^"]+)"$/i);
      if (aggregateAlias) {
        acc[aggregateAlias[3]] = aggregateValue(rows.map((row) => row[aggregateAlias[2]] ?? null), aggregateAlias[1].toUpperCase());
        return acc;
      }

      const distinctAlias = trimmed.match(/^COUNT\(DISTINCT "([^"]+)"\)\s+as\s+"([^"]+)"$/i);
      if (distinctAlias) {
        acc[distinctAlias[2]] = aggregateValue(rows.map((row) => row[distinctAlias[1]] ?? null), 'DISTINCT');
        return acc;
      }

      const castAlias = trimmed.match(/^"([^"]+)"::double precision\s+as\s+"([^"]+)"$/i);
      if (castAlias) {
        acc[castAlias[2]] = Number(rows[0]?.[castAlias[1]] ?? 0);
        return acc;
      }

      const aliasedPlain = trimmed.match(/^"([^"]+)"\s+as\s+"([^"]+)"$/i);
      if (aliasedPlain) {
        acc[aliasedPlain[2]] = rows[0]?.[aliasedPlain[1]] ?? null;
        return acc;
      }

      const plain = trimmed.match(/^"([^"]+)"$/);
      if (plain) {
        acc[plain[1]] = rows[0]?.[plain[1]] ?? null;
      }

      return acc;
    }, {});
  };

  let results: Row[] = [];

  if (groupColumns.length > 0) {
    const grouped = new Map<string, Row[]>();
    filteredRows.forEach((row) => {
      const key = JSON.stringify(groupColumns.map((column) => row[column] ?? null));
      const existing = grouped.get(key) || [];
      existing.push(row);
      grouped.set(key, existing);
    });

    results = Array.from(grouped.values()).map((rows) => buildProjection(rows));
  } else if (selectItems.some((item) => /\b(SUM|AVG|MIN|MAX|COUNT)\(/i.test(item))) {
    results = [buildProjection(filteredRows)];
  } else {
    results = filteredRows.map((row) => {
      return selectItems.reduce<Row>((acc, item) => {
        const plain = item.trim().match(/^"([^"]+)"$/);
        if (plain) {
          acc[plain[1]] = row[plain[1]] ?? null;
        }
        return acc;
      }, {});
    });
  }

  const orderMatch = query.match(/ORDER BY\s+"([^"]+)"\s+(ASC|DESC)/i);
  if (orderMatch) {
    const [, orderColumn, direction] = orderMatch;
    results.sort((left, right) => {
      const a = left[orderColumn];
      const b = right[orderColumn];
      if (a === b) return 0;
      if (a === null || a === undefined) return 1;
      if (b === null || b === undefined) return -1;
      return direction.toUpperCase() === 'ASC'
        ? (a > b ? 1 : -1)
        : (a < b ? 1 : -1);
    });
  }

  const limitMatch = query.match(/LIMIT\s+(\d+)/i);
  const limit = limitMatch ? Number(limitMatch[1]) : results.length;

  return results.slice(0, limit).map((row) => ({ row_data: row }));
}

async function handleRestRoute(route: Route, state: MockState) {
  const request = route.request();
  const url = new URL(request.url());
  const pathname = url.pathname;
  const method = request.method();

  if (method === 'OPTIONS') {
    await route.fulfill({
      status: 204,
      headers: {
        'access-control-allow-origin': '*',
        'access-control-allow-methods': 'GET,POST,PATCH,DELETE,OPTIONS,HEAD',
        'access-control-allow-headers': '*'
      },
      body: ''
    });
    return;
  }

  if (pathname.includes('/auth/v1/user')) {
    await route.fulfill({ status: 200, contentType: 'application/json', body: JSON.stringify(state.user) });
    return;
  }

  if (pathname.includes('/auth/v1/token')) {
    await route.fulfill({
      status: 200,
      contentType: 'application/json',
      body: JSON.stringify({
        access_token: 'qa-access-token',
        refresh_token: 'qa-refresh-token',
        token_type: 'bearer',
        user: state.user,
        expires_in: 3600,
        expires_at: 1893456000
      })
    });
    return;
  }

  if (pathname.includes('/auth/v1/logout')) {
    await route.fulfill({ status: 204, body: '' });
    return;
  }

  if (pathname.includes('/storage/v1/object/files/')) {
    await route.fulfill({ status: 200, contentType: 'application/json', body: JSON.stringify({ Key: pathname }) });
    return;
  }

  if (pathname.includes('/rest/v1/datasets') && method === 'HEAD') {
    await route.fulfill({ status: 200, headers: { 'content-range': '0-0/0' }, body: '' });
    return;
  }

  if (pathname.includes('/rest/v1/reports') && method === 'HEAD') {
    await route.fulfill({ status: 200, headers: { 'content-range': '0-0/0' }, body: '' });
    return;
  }

  if (pathname.includes('/rest/v1/datasets') && method === 'GET') {
    const idFilter = url.searchParams.get('id');
    const datasetId = idFilter?.match(/eq\.(.+)/)?.[1];
    const result = datasetId ? state.datasets.filter((dataset) => dataset.id === datasetId) : state.datasets;
    await route.fulfill({ status: 200, contentType: 'application/json', body: JSON.stringify(result) });
    return;
  }

  if (pathname.includes('/rest/v1/reports') && method === 'GET') {
    const datasetFilter = url.searchParams.get('dataset_id');
    const reportIdFilter = url.searchParams.get('id');
    let result = state.reports;
    if (datasetFilter?.startsWith('eq.')) result = result.filter((report) => report.dataset_id === datasetFilter.slice(3));
    if (reportIdFilter?.startsWith('eq.')) result = result.filter((report) => report.id === reportIdFilter.slice(3));
    await route.fulfill({ status: 200, contentType: 'application/json', body: JSON.stringify(result) });
    return;
  }

  if (pathname.includes('/rest/v1/datasets') && method === 'POST') {
    const payload = parseBody(request.postData() || '[]') as Array<Partial<MockDataset>>;
    const body = payload[0];
    const saved: MockDataset = {
      id: randomId('dataset'),
      user_id: state.user.id,
      name: body.name || 'dataset',
      file_url: body.file_url || '',
      normalized_file_url: body.normalized_file_url,
      analytics_manifest_url: body.analytics_manifest_url,
      normalized_table_name: body.normalized_table_name,
      columns: (body.columns || []) as MockDataset['columns'],
      stats: (body.stats || []) as MockDataset['stats'],
      sheet_name: body.sheet_name,
      created_at: nowIso(),
      rows: []
    };
    state.datasets.unshift(saved);
    await route.fulfill({ status: 201, contentType: 'application/json', body: JSON.stringify(saved) });
    return;
  }

  if (pathname.includes('/rest/v1/reports') && method === 'POST') {
    const payload = parseBody(request.postData() || '[]') as Array<Partial<MockReport>>;
    const body = payload[0];
    const report: MockReport = {
      id: (body.id as string) || randomId('report'),
      user_id: state.user.id,
      name: body.name || 'Report',
      dataset_id: body.dataset_id || '',
      widgets: (body.widgets || []) as unknown[],
      filters: (body.filters || []) as unknown[],
      presentation: body.presentation,
      created_at: nowIso()
    };
    state.reports = [report, ...state.reports.filter((item) => item.id !== report.id)];
    await route.fulfill({ status: 201, contentType: 'application/json', body: JSON.stringify(report) });
    return;
  }

  if (pathname.includes('/rest/v1/public_report_snapshots') && method === 'GET') {
    const slugFilter = url.searchParams.get('slug');
    const reportFilter = url.searchParams.get('report_id');
    let result = state.snapshots.filter((snapshot) => snapshot.revoked_at === null);
    if (slugFilter?.startsWith('eq.')) result = result.filter((snapshot) => snapshot.slug === slugFilter.slice(3));
    if (reportFilter?.startsWith('eq.')) result = result.filter((snapshot) => snapshot.report_id === reportFilter.slice(3));
    if (url.searchParams.has('limit') || url.searchParams.get('select')) {
      const response = url.searchParams.get('limit') === '1' || result.length <= 1 ? (result[0] || null) : result;
      await route.fulfill({ status: response ? 200 : 406, contentType: 'application/json', body: JSON.stringify(response) });
      return;
    }
    await route.fulfill({ status: 200, contentType: 'application/json', body: JSON.stringify(result) });
    return;
  }

  if (pathname.includes('/rest/v1/public_report_snapshots') && method === 'POST') {
    const payload = parseBody(request.postData() || '[]') as Array<Partial<MockSnapshot>>;
    const body = payload[0];
    const snapshot: MockSnapshot = {
      id: randomId('snapshot'),
      slug: body.slug || randomId('pub'),
      report_id: body.report_id || null,
      dataset_id: body.dataset_id || '',
      user_id: state.user.id,
      title: body.title || 'Snapshot',
      subtitle: body.subtitle || null,
      template_id: body.template_id || 'modern',
      widgets: (body.widgets || []) as unknown[],
      widget_results: (body.widget_results || []) as unknown[],
      columns: (body.columns || []) as unknown[],
      published_at: nowIso(),
      revoked_at: null,
      created_at: nowIso(),
      updated_at: nowIso()
    };
    state.snapshots = [snapshot, ...state.snapshots.filter((item) => item.slug !== snapshot.slug)];
    await route.fulfill({ status: 201, contentType: 'application/json', body: JSON.stringify(snapshot) });
    return;
  }

  if (pathname.includes('/rest/v1/public_report_snapshots') && method === 'PATCH') {
    const slugFilter = url.searchParams.get('slug');
    const slug = slugFilter?.startsWith('eq.') ? slugFilter.slice(3) : '';
    const body = parseBody(request.postData() || '{}') as Partial<MockSnapshot>;
    state.snapshots = state.snapshots.map((snapshot) => snapshot.slug === slug ? { ...snapshot, ...body, updated_at: nowIso() } : snapshot);
    const updated = state.snapshots.find((snapshot) => snapshot.slug === slug) || null;
    await route.fulfill({ status: 200, contentType: 'application/json', body: JSON.stringify(updated ? [updated] : []) });
    return;
  }

  if (pathname.includes('/rest/v1/rpc/sync_normalized_dataset') && method === 'POST') {
    const body = parseBody(request.postData() || '{}') as { p_dataset_id: string; p_rows: Row[] };
    const dataset = state.datasets.find((item) => item.id === body.p_dataset_id);
    if (dataset) {
      dataset.rows = body.p_rows || [];
      dataset.normalized_table_name = `dataset_${body.p_dataset_id}`;
    }
    await route.fulfill({ status: 200, contentType: 'application/json', body: JSON.stringify(`dataset_${body.p_dataset_id}`) });
    return;
  }

  if (pathname.includes('/rest/v1/rpc/run_dataset_query') && method === 'POST') {
    const body = parseBody(request.postData() || '{}') as { p_dataset_id: string; p_query: string };
    const dataset = state.datasets.find((item) => item.id === body.p_dataset_id);
    const result = dataset ? executeQuery(body.p_query, dataset) : [];
    await route.fulfill({ status: 200, contentType: 'application/json', body: JSON.stringify(result) });
    return;
  }

  state.networkErrors.push(`${method} ${pathname}`);
  await route.fulfill({ status: 200, contentType: 'application/json', body: '[]' });
}

export async function createMockSupabaseState() {
  return {
    user: {
      id: 'user_qa_001',
      email: 'qa@sphere.test',
      user_metadata: { full_name: 'QA User' },
      app_metadata: { provider: 'google', providers: ['google'] },
      aud: 'authenticated'
    },
    datasets: [],
    reports: [],
    snapshots: [],
    networkErrors: [],
    consoleErrors: []
  } satisfies MockState;
}

export async function installMockSupabase(context: BrowserContext, page: Page, state: MockState) {
  const session = {
    access_token: 'qa-access-token',
    token_type: 'bearer',
    expires_in: 3600,
    expires_at: 1893456000,
    refresh_token: 'qa-refresh-token',
    user: state.user
  };

  await context.addInitScript((value) => {
    window.localStorage.setItem('sphere-auth-session', JSON.stringify(value));
    window.localStorage.setItem('sphere_lang', 'en');
  }, session);

  page.on('console', (message) => {
    if (message.type() === 'error') {
      state.consoleErrors.push(message.text());
    }
  });

  await context.route(/.*\/(auth|rest|storage)\/v1\/.*/, async (route) => {
    await handleRestRoute(route, state);
  });
}
