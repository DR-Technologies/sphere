import { afterEach, describe, expect, it } from 'vitest';
import fs from 'node:fs/promises';
import path from 'node:path';
import { supabaseAnalyticsProvider } from '@/lib/analytics/providers/supabaseProvider';
import { buildQuickResultRecommendation } from '@/lib/quickResult/recommendation';
import { setAnalyticsProvider } from '@/lib/analytics/provider';
import { buildWidgetQueryModel } from '@/lib/analytics/queryModel';
import { resolveWidgetVisualizationResult } from '@/lib/analytics/widgetResult';
import type { AnalyticsProvider, DatasetProfileResult } from '@/lib/analytics/types';

type Row = Record<string, string | number | boolean | null>;

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

function executeQuery(query: string, rows: Row[]) {
  const filteredRows = applyWhere(rows, query);
  const groupColumns = (() => {
    const match = query.match(/GROUP BY\s+([\s\S]+?)(?:ORDER BY|LIMIT|$)/i);
    if (!match) return [] as string[];
    return extractQuotedColumns(match[1]);
  })();

  const selectMatch = query.match(/SELECT\s+([\s\S]+?)\s+FROM\s+dataset/i);
  const selectItems = splitSelectItems(selectMatch?.[1] || '');

  const buildProjection = (groupRows: Row[]) => {
    return selectItems.reduce<Row>((acc, item) => {
      const trimmed = item.trim();

      const aggregateAlias = trimmed.match(/^(SUM|AVG|MIN|MAX|COUNT)\("([^"]+)"(?:::double precision)?\)\s+as\s+"([^"]+)"$/i);
      if (aggregateAlias) {
        acc[aggregateAlias[3]] = aggregateValue(groupRows.map((row) => row[aggregateAlias[2]] ?? null), aggregateAlias[1].toUpperCase());
        return acc;
      }

      const distinctAlias = trimmed.match(/^COUNT\(DISTINCT "([^"]+)"\)\s+as\s+"([^"]+)"$/i);
      if (distinctAlias) {
        acc[distinctAlias[2]] = aggregateValue(groupRows.map((row) => row[distinctAlias[1]] ?? null), 'DISTINCT');
        return acc;
      }

      const castAlias = trimmed.match(/^"([^"]+)"::double precision\s+as\s+"([^"]+)"$/i);
      if (castAlias) {
        acc[castAlias[2]] = Number(groupRows[0]?.[castAlias[1]] ?? 0);
        return acc;
      }

      const plain = trimmed.match(/^"([^"]+)"$/);
      if (plain) {
        acc[plain[1]] = groupRows[0]?.[plain[1]] ?? null;
      }

      return acc;
    }, {});
  };

  let results: Row[] = [];

  if (groupColumns.length > 0) {
    const grouped = new Map<string, Row[]>();
    filteredRows.forEach((row) => {
      const key = JSON.stringify(groupColumns.map((column) => row[column] ?? null));
      const bucket = grouped.get(key) || [];
      bucket.push(row);
      grouped.set(key, bucket);
    });
    results = Array.from(grouped.values()).map((groupRows) => buildProjection(groupRows));
  } else if (selectItems.some((item) => /\b(SUM|AVG|MIN|MAX|COUNT)\(/i.test(item))) {
    results = [buildProjection(filteredRows)];
  } else {
    results = filteredRows.map((row) => buildProjection([row]));
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
      return direction.toUpperCase() === 'ASC' ? (a > b ? 1 : -1) : (a < b ? 1 : -1);
    });
  }

  const limitMatch = query.match(/LIMIT\s+(\d+)/i);
  const limit = limitMatch ? Number(limitMatch[1]) : results.length;
  return results.slice(0, limit);
}

async function profileFixture(name: string, options?: { dateFormat?: 'AUTO' | 'DD/MM/YYYY' }) {
  const buffer = await fs.readFile(path.resolve(process.cwd(), 'tests/fixtures', name));
  const file = new File([buffer], name, { type: 'text/csv' });
  return supabaseAnalyticsProvider.profileFile(file, options);
}

function withMockProvider(rows: Row[]): AnalyticsProvider {
  return {
    ...supabaseAnalyticsProvider,
    async runQuery(query: string) {
      return executeQuery(query, rows);
    }
  };
}

async function evaluateDataset(datasetName: string, profile: DatasetProfileResult) {
  const recommendation = buildQuickResultRecommendation({
    name: datasetName,
    columns: profile.columns,
    stats: profile.stats
  });

  setAnalyticsProvider(withMockProvider(profile.artifacts?.normalizedRows || []));

  const results: Array<{
    title: string;
    type: string;
    dimension: string;
    measure: string;
    aggregation: string;
    rowCount: number;
    renderStatus: 'PASS' | 'FAIL';
  }> = [];

  for (const widget of recommendation.widgets) {
    const built = buildWidgetQueryModel(widget, profile.columns, []);
    expect(built.model, `Widget ${widget.title} should have a valid query model`).toBeTruthy();
    const result = await resolveWidgetVisualizationResult(built.model!, profile.columns, 'acceptance-dataset');
    results.push({
      title: widget.title,
      type: widget.type,
      dimension: widget.xAxis,
      measure: widget.yAxis,
      aggregation: widget.aggregation,
      rowCount: result.rowCount,
      renderStatus: result.issue ? 'FAIL' : 'PASS'
    });
  }

  return results;
}

afterEach(() => {
  setAnalyticsProvider(supabaseAnalyticsProvider);
});

describe('widget rendering acceptance', () => {
  it('Dataset A recommendations are renderable end-to-end', async () => {
    const profile = await profileFixture('dataset-a-simple.csv', { dateFormat: 'DD/MM/YYYY' });
    const results = await evaluateDataset('dataset-a-simple.csv', profile);
    console.table(results);
    expect(results.filter((result) => result.type !== 'table').every((result) => result.renderStatus === 'PASS')).toBe(true);
  });

  it('Dataset B recommendations are renderable end-to-end', async () => {
    const profile = await profileFixture('dataset-b-empresarial.csv', { dateFormat: 'DD/MM/YYYY' });
    const results = await evaluateDataset('dataset-b-empresarial.csv', profile);
    console.table(results);
    expect(results.filter((result) => result.type !== 'table').every((result) => result.renderStatus === 'PASS')).toBe(true);
  });

  it('Dataset C recommendations are renderable end-to-end', async () => {
    const profile = await profileFixture('dataset-c-visual.csv');
    const results = await evaluateDataset('dataset-c-visual.csv', profile);
    console.table(results);
    expect(results.filter((result) => result.type !== 'table').every((result) => result.renderStatus === 'PASS')).toBe(true);
  });
});
