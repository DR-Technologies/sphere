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

interface MockStory {
  id: string;
  user_id: string;
  dataset_id: string;
  source_report_id: string | null;
  title: string;
  subtitle: string;
  template_id: string;
  motion_preset_id: string;
  pacing_preset_id: string;
  orientation: string;
  definition_version: number;
  story_definition: Record<string, unknown>;
  created_at: string;
  updated_at: string;
}

interface MockStorySnapshot {
  id: string;
  slug: string;
  story_id: string | null;
  dataset_id: string;
  user_id: string;
  title: string;
  subtitle: string;
  template_id: string;
  motion_preset_id: string;
  pacing_preset_id: string;
  orientation: string;
  definition_version: number;
  render_model_version: number;
  story_definition: Record<string, unknown>;
  materialized_story: Record<string, unknown>;
  published_at: string;
  revoked_at: string | null;
  created_at: string;
  updated_at: string;
}

interface MockStoryExportJob {
  id: string;
  story_id: string;
  user_id: string;
  status: string;
  phase: string;
  orientation: string;
  render_token: string;
  file_name: string | null;
  output_path: string | null;
  output_size_bytes: number | null;
  duration_ms: number | null;
  frame_count: number | null;
  current_frame: number | null;
  current_time_ms: number | null;
  progress: number | null;
  fps: number;
  render_time_ms: number | null;
  frame_render_time_ms: number | null;
  encoding_time_ms: number | null;
  error: string | null;
  technical_metadata: Record<string, unknown>;
  created_at: string;
  started_at: string | null;
  completed_at: string | null;
  heartbeat_at: string | null;
  updated_at: string;
}

interface MockAdminUser {
  id: string;
  email: string;
  name: string;
  role: 'standard' | 'superadmin';
  subscriptionPlan: 'free' | 'pro' | 'enterprise';
  status: 'active' | 'suspended' | 'invited';
  accessStatus: 'active' | 'suspended';
  createdAt: string;
  lastSignInAt: string | null;
  invitedAt: string | null;
  emailConfirmedAt: string | null;
  datasets: number;
  reports: number;
  stories: number;
  limits: { maxDatasets: number | null; maxReportsPerDataset: number | null; maxWidgetsPerReport: number };
  isCurrentUser: boolean;
}

interface MockState {
  user: {
    id: string;
    email: string;
    user_metadata: { full_name: string };
    app_metadata: { provider: string; providers: string[] };
    aud: string;
  };
  accountRole: 'standard' | 'superadmin';
  adminUsers: MockAdminUser[];
  datasets: MockDataset[];
  reports: MockReport[];
  snapshots: MockSnapshot[];
  stories: MockStory[];
  storySnapshots: MockStorySnapshot[];
  storyExportJobs: MockStoryExportJob[];
  storageObjects: Map<string, { body: Buffer; contentType: string }>;
  datasetQueries: string[];
  datasetQueryFailuresRemaining: number;
  storageReadDelayMs: number;
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

async function readStorageUpload(request: import('@playwright/test').Request) {
  const body = request.postDataBuffer() || Buffer.from('');
  const requestContentType = (await request.headerValue('content-type')) || 'application/octet-stream';
  if (!requestContentType.startsWith('multipart/form-data')) {
    return { body, contentType: requestContentType };
  }

  const filePart = body.indexOf(Buffer.from('filename="'));
  const headerEnd = filePart >= 0 ? body.indexOf(Buffer.from('\r\n\r\n'), filePart) : -1;
  const boundary = requestContentType.match(/boundary=([^;]+)/i)?.[1];
  const payloadEnd = boundary && headerEnd >= 0
    ? body.indexOf(Buffer.from(`\r\n--${boundary}`), headerEnd + 4)
    : -1;
  if (filePart < 0 || headerEnd < 0 || payloadEnd <= headerEnd) {
    return { body, contentType: 'application/octet-stream' };
  }

  const partHeaders = body.subarray(filePart, headerEnd).toString('utf8');
  const partContentType = partHeaders.match(/content-type:\s*([^\r\n]+)/i)?.[1]?.trim();
  return {
    body: body.subarray(headerEnd + 4, payloadEnd),
    contentType: partContentType || 'application/octet-stream'
  };
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
    if (method === 'PUT') {
      const body = parseBody(request.postData()) as { email?: string; data?: { full_name?: string } } | null;
      if (body?.data?.full_name) state.user.user_metadata.full_name = body.data.full_name;
      if (body?.email) state.user.email = body.email;
    }
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

  if (pathname.includes('/storage/v1/object/public/files/') && method === 'GET') {
    if (state.storageReadDelayMs > 0) {
      await new Promise((resolve) => setTimeout(resolve, state.storageReadDelayMs));
    }
    const objectPath = decodeURIComponent(pathname.split('/storage/v1/object/public/files/')[1] || '');
    const object = state.storageObjects.get(objectPath);
    if (!object) {
      await route.fulfill({ status: 404, contentType: 'application/json', body: JSON.stringify({ message: 'Object not found' }) });
      return;
    }
    await route.fulfill({ status: 200, contentType: object.contentType, body: object.body });
    return;
  }

  if (pathname.includes('/storage/v1/object/sign/files/')) {
    const objectPath = decodeURIComponent(pathname.split('/storage/v1/object/sign/files/')[1] || '');
    if (method === 'POST') {
      const signedURL = `/storage/v1/object/sign/files/${encodeURI(objectPath)}?token=qa-signed-token`;
      await route.fulfill({
        status: state.storageObjects.has(objectPath) ? 200 : 404,
        contentType: 'application/json',
        body: JSON.stringify(state.storageObjects.has(objectPath)
          ? { signedURL }
          : { message: 'Object not found' })
      });
      return;
    }
    if (method === 'GET') {
      if (state.storageReadDelayMs > 0) {
        await new Promise((resolve) => setTimeout(resolve, state.storageReadDelayMs));
      }
      const object = state.storageObjects.get(objectPath);
      if (!object) {
        await route.fulfill({ status: 404, contentType: 'application/json', body: JSON.stringify({ message: 'Object not found' }) });
        return;
      }
      await route.fulfill({ status: 200, contentType: object.contentType, body: object.body });
      return;
    }
  }

  if (pathname.includes('/storage/v1/object/files/')) {
    if (method === 'POST' || method === 'PUT') {
      const objectPath = decodeURIComponent(pathname.split('/storage/v1/object/files/')[1] || '');
      state.storageObjects.set(objectPath, await readStorageUpload(request));
    }
    await route.fulfill({ status: 200, contentType: 'application/json', body: JSON.stringify({ Key: pathname }) });
    return;
  }

  if (pathname.includes('/rest/v1/datasets') && method === 'HEAD') {
    const userFilter = url.searchParams.get('user_id');
    let datasets = state.datasets;
    if (userFilter?.startsWith('eq.')) datasets = datasets.filter((dataset) => dataset.user_id === userFilter.slice(3));
    const end = Math.max(0, datasets.length - 1);
    await route.fulfill({
      status: 200,
      headers: {
        'content-range': `0-${end}/${datasets.length}`,
        'access-control-expose-headers': 'content-range'
      },
      body: ''
    });
    return;
  }

  if (pathname.includes('/rest/v1/reports') && method === 'HEAD') {
    const datasetFilter = url.searchParams.get('dataset_id');
    const userFilter = url.searchParams.get('user_id');
    let reports = state.reports;
    if (datasetFilter?.startsWith('eq.')) reports = reports.filter((report) => report.dataset_id === datasetFilter.slice(3));
    if (userFilter?.startsWith('eq.')) reports = reports.filter((report) => report.user_id === userFilter.slice(3));
    const end = Math.max(0, reports.length - 1);
    await route.fulfill({
      status: 200,
      headers: {
        'content-range': `0-${end}/${reports.length}`,
        'access-control-expose-headers': 'content-range'
      },
      body: ''
    });
    return;
  }

  if (pathname.includes('/rest/v1/datasets') && method === 'GET') {
    const idFilter = url.searchParams.get('id');
    const datasetId = idFilter?.match(/eq\.(.+)/)?.[1];
    const result = datasetId ? state.datasets.filter((dataset) => dataset.id === datasetId) : state.datasets;
    await route.fulfill({ status: 200, contentType: 'application/json', body: JSON.stringify(result) });
    return;
  }

  if (pathname.includes('/rest/v1/user_roles')) {
    if (method !== 'GET') {
      await route.fulfill({
        status: 403,
        contentType: 'application/json',
        body: JSON.stringify({ code: '42501', message: 'permission denied for table user_roles' })
      });
      return;
    }
    await route.fulfill({
      status: 200,
      contentType: 'application/json',
      body: JSON.stringify([{ user_id: state.user.id, role: state.accountRole }])
    });
    return;
  }

  if (pathname.includes('/rest/v1/reports') && method === 'GET') {
    const datasetFilter = url.searchParams.get('dataset_id');
    const reportIdFilter = url.searchParams.get('id');
    const userFilter = url.searchParams.get('user_id');
    let result = state.reports;
    if (datasetFilter?.startsWith('eq.')) result = result.filter((report) => report.dataset_id === datasetFilter.slice(3));
    if (reportIdFilter?.startsWith('eq.')) result = result.filter((report) => report.id === reportIdFilter.slice(3));
    if (userFilter?.startsWith('eq.')) result = result.filter((report) => report.user_id === userFilter.slice(3));
    await route.fulfill({ status: 200, contentType: 'application/json', body: JSON.stringify(result) });
    return;
  }

  if (pathname.includes('/rest/v1/datasets') && method === 'POST') {
    if (state.accountRole !== 'superadmin' && state.datasets.filter((dataset) => dataset.user_id === state.user.id).length >= 3) {
      await route.fulfill({
        status: 400,
        contentType: 'application/json',
        body: JSON.stringify({ code: 'P0001', message: 'DATASET_LIMIT_REACHED', details: 'A standard user can have at most 3 datasets.' })
      });
      return;
    }
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
    if (state.accountRole !== 'superadmin' && state.reports.filter((report) => report.user_id === state.user.id && report.dataset_id === body.dataset_id).length >= 3) {
      await route.fulfill({
        status: 400,
        contentType: 'application/json',
        body: JSON.stringify({ code: 'P0001', message: 'REPORT_LIMIT_REACHED', details: 'A standard user can have at most 3 reports per dataset.' })
      });
      return;
    }
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

  if (pathname.includes('/rest/v1/reports') && method === 'PATCH') {
    const reportIdFilter = url.searchParams.get('id');
    const reportId = reportIdFilter?.startsWith('eq.') ? reportIdFilter.slice(3) : '';
    const body = parseBody(request.postData() || '{}') as Partial<MockReport>;
    state.reports = state.reports.map((report) => report.id === reportId ? { ...report, ...body } : report);
    const updated = state.reports.find((report) => report.id === reportId) || null;
    await route.fulfill({ status: 200, contentType: 'application/json', body: JSON.stringify(updated) });
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
      await route.fulfill({ status: 200, contentType: 'application/json', body: JSON.stringify(response) });
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

  if (pathname.includes('/rest/v1/stories') && method === 'GET') {
    const storyIdFilter = url.searchParams.get('id');
    const datasetFilter = url.searchParams.get('dataset_id');
    let result = state.stories;
    if (storyIdFilter?.startsWith('eq.')) result = result.filter((story) => story.id === storyIdFilter.slice(3));
    if (datasetFilter?.startsWith('eq.')) result = result.filter((story) => story.dataset_id === datasetFilter.slice(3));
    const isSingle = url.searchParams.get('limit') === '1' || Boolean(storyIdFilter);
    await route.fulfill({ status: 200, contentType: 'application/json', body: JSON.stringify(isSingle ? (result[0] || null) : result) });
    return;
  }

  if (pathname.includes('/rest/v1/stories') && method === 'POST') {
    const payload = parseBody(request.postData() || '[]') as Array<Partial<MockStory>>;
    const body = payload[0];
    const story: MockStory = {
      id: (body.id as string) || randomId('story'),
      user_id: state.user.id,
      dataset_id: body.dataset_id || '',
      source_report_id: (body.source_report_id as string) || null,
      title: body.title || 'Story',
      subtitle: body.subtitle || '',
      template_id: body.template_id || 'modern',
      motion_preset_id: body.motion_preset_id || 'smooth',
      pacing_preset_id: body.pacing_preset_id || 'standard',
      orientation: body.orientation || 'landscape',
      definition_version: Number(body.definition_version || 1),
      story_definition: (body.story_definition || {}) as Record<string, unknown>,
      created_at: (body.created_at as string) || nowIso(),
      updated_at: nowIso()
    };
    state.stories = [story, ...state.stories.filter((item) => item.id !== story.id)];
    await route.fulfill({ status: 201, contentType: 'application/json', body: JSON.stringify(story) });
    return;
  }

  if (pathname.includes('/rest/v1/stories') && method === 'DELETE') {
    const storyIdFilter = url.searchParams.get('id');
    const storyId = storyIdFilter?.startsWith('eq.') ? storyIdFilter.slice(3) : '';
    state.stories = state.stories.filter((story) => story.id !== storyId);
    state.storyExportJobs = state.storyExportJobs.filter((job) => job.story_id !== storyId);
    state.storySnapshots = state.storySnapshots.filter((snapshot) => snapshot.story_id !== storyId);
    await route.fulfill({ status: 204, body: '' });
    return;
  }

  if (pathname.includes('/rest/v1/public_story_snapshots') && method === 'GET') {
    const slugFilter = url.searchParams.get('slug');
    const storyFilter = url.searchParams.get('story_id');
    let result = state.storySnapshots.filter((snapshot) => snapshot.revoked_at === null);
    if (slugFilter?.startsWith('eq.')) result = result.filter((snapshot) => snapshot.slug === slugFilter.slice(3));
    if (storyFilter?.startsWith('eq.')) result = result.filter((snapshot) => snapshot.story_id === storyFilter.slice(3));
    const response = url.searchParams.get('limit') === '1' || result.length <= 1 ? (result[0] || null) : result;
    await route.fulfill({ status: 200, contentType: 'application/json', body: JSON.stringify(response) });
    return;
  }

  if (pathname.includes('/rest/v1/public_story_snapshots') && method === 'POST') {
    const payload = parseBody(request.postData() || '[]') as Array<Partial<MockStorySnapshot>>;
    const body = payload[0];
    const snapshot: MockStorySnapshot = {
      id: randomId('story_snapshot'),
      slug: body.slug || randomId('story_pub'),
      story_id: (body.story_id as string) || null,
      dataset_id: body.dataset_id || '',
      user_id: state.user.id,
      title: body.title || 'Story',
      subtitle: body.subtitle || '',
      template_id: body.template_id || 'modern',
      motion_preset_id: body.motion_preset_id || 'smooth',
      pacing_preset_id: body.pacing_preset_id || 'standard',
      orientation: body.orientation || 'landscape',
      definition_version: Number(body.definition_version || 1),
      render_model_version: Number(body.render_model_version || 1),
      story_definition: (body.story_definition || {}) as Record<string, unknown>,
      materialized_story: (body.materialized_story || {}) as Record<string, unknown>,
      published_at: nowIso(),
      revoked_at: null,
      created_at: nowIso(),
      updated_at: nowIso()
    };
    state.storySnapshots = [snapshot, ...state.storySnapshots.filter((item) => item.slug !== snapshot.slug)];
    await route.fulfill({ status: 201, contentType: 'application/json', body: JSON.stringify(snapshot) });
    return;
  }

  if (pathname.includes('/rest/v1/public_story_snapshots') && method === 'PATCH') {
    const slugFilter = url.searchParams.get('slug');
    const slug = slugFilter?.startsWith('eq.') ? slugFilter.slice(3) : '';
    const body = parseBody(request.postData() || '{}') as Partial<MockStorySnapshot>;
    state.storySnapshots = state.storySnapshots.map((snapshot) => snapshot.slug === slug ? { ...snapshot, ...body, updated_at: nowIso() } : snapshot);
    const updated = state.storySnapshots.find((snapshot) => snapshot.slug === slug) || null;
    await route.fulfill({ status: 200, contentType: 'application/json', body: JSON.stringify(updated ? [updated] : []) });
    return;
  }

  if (pathname.includes('/rest/v1/story_export_jobs') && method === 'GET') {
    const storyFilter = url.searchParams.get('story_id');
    const jobIdFilter = url.searchParams.get('id');
    let result = state.storyExportJobs;
    if (storyFilter?.startsWith('eq.')) result = result.filter((job) => job.story_id === storyFilter.slice(3));
    if (jobIdFilter?.startsWith('eq.')) result = result.filter((job) => job.id === jobIdFilter.slice(3));
    const isSingle = url.searchParams.get('limit') === '1' || Boolean(jobIdFilter);
    await route.fulfill({ status: 200, contentType: 'application/json', body: JSON.stringify(isSingle ? (result[0] || null) : result) });
    return;
  }

  if (pathname.includes('/rest/v1/story_export_jobs') && method === 'POST') {
    const payload = parseBody(request.postData() || '[]') as Array<Partial<MockStoryExportJob>>;
    const body = payload[0];
    const job: MockStoryExportJob = {
      id: (body.id as string) || randomId('story_job'),
      story_id: body.story_id || '',
      user_id: state.user.id,
      status: body.status || 'queued',
      phase: body.phase || 'queued',
      orientation: body.orientation || 'landscape',
      render_token: body.render_token || randomId('render'),
      file_name: (body.file_name as string) || null,
      output_path: (body.output_path as string) || null,
      output_size_bytes: Number(body.output_size_bytes || 0) || null,
      duration_ms: Number(body.duration_ms || 0) || null,
      frame_count: Number(body.frame_count || 0) || null,
      current_frame: Number(body.current_frame || 0) || null,
      current_time_ms: Number(body.current_time_ms || 0) || null,
      progress: typeof body.progress === 'number' ? body.progress : null,
      fps: Number(body.fps || 24),
      render_time_ms: Number(body.render_time_ms || 0) || null,
      frame_render_time_ms: Number(body.frame_render_time_ms || 0) || null,
      encoding_time_ms: Number(body.encoding_time_ms || 0) || null,
      error: (body.error as string) || null,
      technical_metadata: (body.technical_metadata || {}) as Record<string, unknown>,
      created_at: nowIso(),
      started_at: (body.started_at as string) || null,
      completed_at: (body.completed_at as string) || null,
      heartbeat_at: (body.heartbeat_at as string) || null,
      updated_at: nowIso()
    };
    state.storyExportJobs = [job, ...state.storyExportJobs.filter((item) => item.id !== job.id)];
    await route.fulfill({ status: 201, contentType: 'application/json', body: JSON.stringify(job) });
    return;
  }

  if (pathname.includes('/rest/v1/story_export_jobs') && method === 'PATCH') {
    const jobIdFilter = url.searchParams.get('id');
    const jobId = jobIdFilter?.startsWith('eq.') ? jobIdFilter.slice(3) : '';
    const body = parseBody(request.postData() || '{}') as Partial<MockStoryExportJob>;
    state.storyExportJobs = state.storyExportJobs.map((job) => job.id === jobId ? { ...job, ...body, updated_at: nowIso() } : job);
    const updated = state.storyExportJobs.find((job) => job.id === jobId) || null;
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

  if (pathname.includes('/rest/v1/rpc/get_current_user_limits') && method === 'POST') {
    await route.fulfill({
      status: 200,
      contentType: 'application/json',
      body: JSON.stringify({
        role: state.accountRole,
        subscription_plan: 'free',
        status: 'active',
        max_datasets: state.accountRole === 'superadmin' ? null : 3,
        max_reports_per_dataset: state.accountRole === 'superadmin' ? null : 3,
        max_widgets_per_report: 9
      })
    });
    return;
  }

  if (pathname.includes('/rest/v1/rpc/get_dataset_delete_dependencies') && method === 'POST') {
    const body = parseBody(request.postData() || '{}') as { p_dataset_id: string };
    const dataset = state.datasets.find((item) => item.id === body.p_dataset_id && item.user_id === state.user.id);
    if (!dataset) {
      await route.fulfill({ status: 200, contentType: 'application/json', body: 'null' });
      return;
    }
    const reports = state.reports.filter((report) => report.dataset_id === dataset.id && report.user_id === state.user.id);
    const stories = state.stories.filter((story) => story.dataset_id === dataset.id && story.user_id === state.user.id);
    await route.fulfill({
      status: 200,
      contentType: 'application/json',
      body: JSON.stringify({
        report_count: reports.length,
        report_names: reports.map((report) => report.name),
        story_count: stories.length,
        story_names: stories.map((story) => story.title)
      })
    });
    return;
  }

  if (pathname.includes('/rest/v1/rpc/delete_report_lifecycle') && method === 'POST') {
    const body = parseBody(request.postData() || '{}') as { p_report_id: string };
    const exists = state.reports.some((report) => report.id === body.p_report_id && report.user_id === state.user.id);
    if (exists) {
      state.reports = state.reports.filter((report) => report.id !== body.p_report_id);
      state.snapshots = state.snapshots.filter((snapshot) => snapshot.report_id !== body.p_report_id);
    }
    await route.fulfill({ status: 200, contentType: 'application/json', body: JSON.stringify(exists) });
    return;
  }

  if (pathname.includes('/rest/v1/rpc/delete_story_lifecycle') && method === 'POST') {
    const body = parseBody(request.postData() || '{}') as { p_story_id: string };
    const exists = state.stories.some((story) => story.id === body.p_story_id && story.user_id === state.user.id);
    if (exists) {
      state.stories = state.stories.filter((story) => story.id !== body.p_story_id);
      state.storySnapshots = state.storySnapshots.filter((snapshot) => snapshot.story_id !== body.p_story_id);
      state.storyExportJobs = state.storyExportJobs.filter((job) => job.story_id !== body.p_story_id);
    }
    await route.fulfill({ status: 200, contentType: 'application/json', body: JSON.stringify(exists) });
    return;
  }

  if (pathname.includes('/rest/v1/rpc/delete_dataset_lifecycle') && method === 'POST') {
    const body = parseBody(request.postData() || '{}') as { p_dataset_id: string };
    const dataset = state.datasets.find((item) => item.id === body.p_dataset_id && item.user_id === state.user.id);
    if (!dataset) {
      await route.fulfill({ status: 200, contentType: 'application/json', body: 'null' });
      return;
    }
    const reports = state.reports.filter((report) => report.dataset_id === dataset.id && report.user_id === state.user.id);
    const stories = state.stories.filter((story) => story.dataset_id === dataset.id && story.user_id === state.user.id);
    if (reports.length || stories.length) {
      await route.fulfill({
        status: 400,
        contentType: 'application/json',
        body: JSON.stringify({
          code: 'P0001',
          message: reports.length ? 'DATASET_HAS_REPORTS' : 'DATASET_HAS_STORIES',
          details: JSON.stringify({
            report_count: reports.length,
            report_names: reports.map((report) => report.name),
            story_count: stories.length,
            story_names: stories.map((story) => story.title)
          })
        })
      });
      return;
    }
    state.datasets = state.datasets.filter((item) => item.id !== dataset.id);
    await route.fulfill({
      status: 200,
      contentType: 'application/json',
      body: JSON.stringify({
        file_url: dataset.file_url,
        normalized_file_url: dataset.normalized_file_url || null,
        analytics_manifest_url: dataset.analytics_manifest_url || null,
        export_job_ids: []
      })
    });
    return;
  }

  if (pathname.includes('/rest/v1/rpc/get_public_report_snapshot') && method === 'POST') {
    const body = parseBody(request.postData() || '{}') as { p_slug?: string };
    const snapshot = state.snapshots.find((item) => item.slug === body.p_slug && item.revoked_at === null) || null;
    await route.fulfill({ status: 200, contentType: 'application/json', body: JSON.stringify(snapshot) });
    return;
  }

  if (pathname.includes('/rest/v1/rpc/get_public_story_snapshot') && method === 'POST') {
    const body = parseBody(request.postData() || '{}') as { p_slug?: string };
    const snapshot = state.storySnapshots.find((item) => item.slug === body.p_slug && item.revoked_at === null) || null;
    await route.fulfill({ status: 200, contentType: 'application/json', body: JSON.stringify(snapshot) });
    return;
  }

  if (pathname.includes('/rest/v1/rpc/run_dataset_query') && method === 'POST') {
    const body = parseBody(request.postData() || '{}') as { p_dataset_id: string; p_query: string };
    state.datasetQueries.push(`${body.p_dataset_id}\u0000${body.p_query}`);
    if (state.datasetQueryFailuresRemaining > 0) {
      state.datasetQueryFailuresRemaining -= 1;
      await route.fulfill({
        status: 500,
        contentType: 'application/json',
        body: JSON.stringify({ code: '57014', message: 'canceling statement due to statement timeout', details: null, hint: null })
      });
      return;
    }
    const dataset = state.datasets.find((item) => item.id === body.p_dataset_id);
    const result = dataset ? executeQuery(body.p_query, dataset) : [];
    await route.fulfill({ status: 200, contentType: 'application/json', body: JSON.stringify(result) });
    return;
  }

  state.networkErrors.push(`${method} ${pathname}`);
  await route.fulfill({ status: 200, contentType: 'application/json', body: '[]' });
}

export async function createMockSupabaseState(): Promise<MockState> {
  return {
    user: {
      id: 'user_qa_001',
      email: 'qa@sphere.test',
      user_metadata: { full_name: 'QA User' },
      app_metadata: { provider: 'google', providers: ['google'] },
      aud: 'authenticated'
    },
    accountRole: 'standard',
    adminUsers: [
      {
        id: 'user_qa_001',
        email: 'qa@sphere.test',
        name: 'QA User',
        role: 'standard',
        subscriptionPlan: 'free',
        status: 'active',
        accessStatus: 'active',
        createdAt: nowIso(),
        lastSignInAt: nowIso(),
        invitedAt: null,
        emailConfirmedAt: nowIso(),
        datasets: 0,
        reports: 0,
        stories: 0,
        limits: { maxDatasets: 3, maxReportsPerDataset: 3, maxWidgetsPerReport: 9 },
        isCurrentUser: true
      },
      {
        id: 'user_qa_002',
        email: 'analista@sphere.test',
        name: 'Analista Sphere',
        role: 'standard',
        subscriptionPlan: 'pro',
        status: 'active',
        accessStatus: 'active',
        createdAt: '2026-07-20T18:00:00.000Z',
        lastSignInAt: '2026-07-26T18:00:00.000Z',
        invitedAt: null,
        emailConfirmedAt: '2026-07-20T18:00:00.000Z',
        datasets: 2,
        reports: 4,
        stories: 1,
        limits: { maxDatasets: 3, maxReportsPerDataset: 3, maxWidgetsPerReport: 9 },
        isCurrentUser: false
      }
    ],
    datasets: [],
    reports: [],
    snapshots: [],
    stories: [],
    storySnapshots: [],
    storyExportJobs: [],
    storageObjects: new Map(),
    datasetQueries: [],
    datasetQueryFailuresRemaining: 0,
    storageReadDelayMs: 0,
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
    window.localStorage.setItem('sphere_e2e_mock', '1');
  }, session);

  page.on('console', (message) => {
    if (message.type() === 'error') {
      state.consoleErrors.push(message.text());
    }
  });

  await context.route(/.*\/(auth|rest|storage)\/v1\/.*/, async (route) => {
    await handleRestRoute(route, state);
  });
  await context.route(/.*\/api\/admin\/users(?:\/[^/?]+)?(?:\?.*)?$/, async (route) => {
    const request = route.request();
    const url = new URL(request.url());
    const authorization = await request.headerValue('authorization');
    if (!authorization) {
      await route.fulfill({ status: 401, contentType: 'application/json', body: JSON.stringify({ error: 'Debes iniciar sesión.', code: 'AUTHENTICATION_REQUIRED' }) });
      return;
    }
    if (state.accountRole !== 'superadmin') {
      await route.fulfill({ status: 403, contentType: 'application/json', body: JSON.stringify({ error: 'Esta operación requiere acceso SUPERADMIN.', code: 'SUPERADMIN_REQUIRED' }) });
      return;
    }

    if (request.method() === 'GET') {
      await route.fulfill({ status: 200, contentType: 'application/json', body: JSON.stringify({ users: state.adminUsers }) });
      return;
    }

    if (request.method() === 'POST') {
      const body = parseBody(request.postData()) as { email: string; name?: string; role: 'standard' | 'superadmin'; subscriptionPlan: 'free' | 'pro' | 'enterprise' };
      const invited: MockAdminUser = {
        id: randomId('user'),
        email: body.email,
        name: body.name || body.email.split('@')[0],
        role: body.role,
        subscriptionPlan: body.subscriptionPlan,
        status: 'invited',
        accessStatus: 'active',
        createdAt: nowIso(),
        lastSignInAt: null,
        invitedAt: nowIso(),
        emailConfirmedAt: null,
        datasets: 0,
        reports: 0,
        stories: 0,
        limits: {
          maxDatasets: body.role === 'superadmin' ? null : 3,
          maxReportsPerDataset: body.role === 'superadmin' ? null : 3,
          maxWidgetsPerReport: 9
        },
        isCurrentUser: false
      };
      state.adminUsers.unshift(invited);
      await route.fulfill({ status: 201, contentType: 'application/json', body: JSON.stringify({ user: invited }) });
      return;
    }

    if (request.method() === 'PATCH') {
      const userId = url.pathname.split('/').pop() || '';
      const body = parseBody(request.postData()) as { role: 'standard' | 'superadmin'; subscriptionPlan: 'free' | 'pro' | 'enterprise'; status: 'active' | 'suspended' };
      const current = state.adminUsers.find((user) => user.id === userId);
      if (!current) {
        await route.fulfill({ status: 404, contentType: 'application/json', body: JSON.stringify({ error: 'Usuario no encontrado.' }) });
        return;
      }
      if (current.isCurrentUser && (body.role !== current.role || body.status !== current.accessStatus)) {
        await route.fulfill({ status: 409, contentType: 'application/json', body: JSON.stringify({ error: 'No puedes cambiar tu propio rol o estado de acceso.', code: 'ADMIN_SELF_ACCESS_CHANGE_FORBIDDEN' }) });
        return;
      }
      const activeSuperadmins = state.adminUsers.filter((user) => user.role === 'superadmin' && user.accessStatus === 'active');
      if (current.role === 'superadmin' && current.accessStatus === 'active'
        && (body.role !== 'superadmin' || body.status !== 'active')
        && activeSuperadmins.length === 1) {
        await route.fulfill({ status: 409, contentType: 'application/json', body: JSON.stringify({ error: 'No se puede desactivar o degradar al último SUPERADMIN activo.', code: 'LAST_SUPERADMIN_REQUIRED' }) });
        return;
      }
      Object.assign(current, {
        role: body.role,
        subscriptionPlan: body.subscriptionPlan,
        status: body.status,
        accessStatus: body.status,
        limits: {
          maxDatasets: body.role === 'superadmin' ? null : 3,
          maxReportsPerDataset: body.role === 'superadmin' ? null : 3,
          maxWidgetsPerReport: 9
        }
      });
      await route.fulfill({ status: 200, contentType: 'application/json', body: JSON.stringify({ user: current }) });
      return;
    }

    await route.fulfill({ status: 405, contentType: 'application/json', body: JSON.stringify({ error: 'Method not allowed' }) });
  });
  await context.route(/.*\/api\/account(?:\/billing\/(?:checkout|portal))?(?:\?.*)?$/, async (route) => {
    const request = route.request();
    if (!(await request.headerValue('authorization'))) {
      await route.fulfill({ status: 401, contentType: 'application/json', body: JSON.stringify({ error: 'Debes iniciar sesión.' }) });
      return;
    }
    if (new URL(request.url()).pathname.endsWith('/checkout')) {
      await route.fulfill({ status: 200, contentType: 'application/json', body: JSON.stringify({ url: '/?view=settings&billing=success' }) });
      return;
    }
    if (new URL(request.url()).pathname.endsWith('/portal')) {
      await route.fulfill({ status: 200, contentType: 'application/json', body: JSON.stringify({ url: '/?view=settings&billing=portal' }) });
      return;
    }
    await route.fulfill({ status: 200, contentType: 'application/json', body: JSON.stringify({
      user: { id: state.user.id, name: state.user.user_metadata.full_name, email: state.user.email, createdAt: nowIso(), lastSignInAt: nowIso(), pendingEmail: null },
      role: state.accountRole,
      subscription: { plan: 'free', source: 'free', status: 'inactive', cancelAtPeriodEnd: false, currentPeriodEnd: null, hasStripeCustomer: false, adminOverride: null },
      usage: { datasets: state.datasets.length, reports: state.reports.length, stories: state.stories.length },
      limits: { maxDatasets: state.accountRole === 'superadmin' ? null : 3, maxReportsPerDataset: state.accountRole === 'superadmin' ? null : 3, maxWidgetsPerReport: 9 },
      deletion: { datasets: state.datasets.length, reports: state.reports.length, stories: state.stories.length, exports: state.storyExportJobs.length, storageArtifacts: state.storageObjects.size, status: 'none' },
      billingConfigured: false
    }) });
  });
  await context.route(/.*\/api\/lifecycle\/(story|dataset)-artifacts\/.*/, async (route) => {
    const requestUrl = new URL(route.request().url());
    const storyId = requestUrl.pathname.match(/\/api\/lifecycle\/story-artifacts\/([^/]+)/)?.[1];
    const datasetId = requestUrl.pathname.match(/\/api\/lifecycle\/dataset-artifacts\/([^/]+)/)?.[1];

    if (storyId) {
      const exists = state.stories.some((story) => story.id === storyId && story.user_id === state.user.id);
      if (!exists) {
        await route.fulfill({ status: 404, contentType: 'application/json', body: JSON.stringify({ error: 'Could not delete Story.' }) });
        return;
      }
      state.stories = state.stories.filter((story) => story.id !== storyId);
      state.storySnapshots = state.storySnapshots.filter((snapshot) => snapshot.story_id !== storyId);
      const removed = state.storyExportJobs.filter((job) => job.story_id === storyId).length;
      state.storyExportJobs = state.storyExportJobs.filter((job) => job.story_id !== storyId);
      await route.fulfill({ status: 200, contentType: 'application/json', body: JSON.stringify({ deleted: true, removed }) });
      return;
    }

    const dataset = state.datasets.find((item) => item.id === datasetId && item.user_id === state.user.id);
    if (!dataset) {
      await route.fulfill({ status: 404, contentType: 'application/json', body: JSON.stringify({ error: 'Could not delete dataset.' }) });
      return;
    }
    const reports = state.reports.filter((report) => report.dataset_id === dataset.id && report.user_id === state.user.id);
    const stories = state.stories.filter((story) => story.dataset_id === dataset.id && story.user_id === state.user.id);
    if (reports.length || stories.length) {
      await route.fulfill({
        status: 409,
        contentType: 'application/json',
        body: JSON.stringify({
          error: reports.length
            ? `No se puede eliminar este dataset porque está siendo utilizado por ${reports.length} reportes. Debes eliminar primero los reportes asociados.`
            : `No se puede eliminar este dataset porque está siendo utilizado por ${stories.length} Stories. Debes eliminar primero las Stories asociadas.`,
          dependencies: {
            report_count: reports.length,
            report_names: reports.map((report) => report.name),
            story_count: stories.length,
            story_names: stories.map((story) => story.title)
          }
        })
      });
      return;
    }
    state.datasets = state.datasets.filter((item) => item.id !== dataset.id);
    await route.fulfill({
      status: 200,
      contentType: 'application/json',
      body: JSON.stringify({
        file_url: dataset.file_url,
        normalized_file_url: dataset.normalized_file_url || null,
        analytics_manifest_url: dataset.analytics_manifest_url || null,
        removed: 0
      })
    });
  });
}
