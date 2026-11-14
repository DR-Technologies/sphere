import { afterEach, describe, expect, it, vi } from 'vitest';
import { buildWidgetSql, executeWidgetQuery, quoteSqlIdentifier } from './queryService';
import type { Widget } from '@/lib/widgets/types';
import { getAnalyticsProvider, setAnalyticsProvider } from './provider';

const originalProvider = getAnalyticsProvider();

afterEach(() => {
  setAnalyticsProvider(originalProvider);
});

describe('query service', () => {
  const columns = [
    { name: 'Category', type: 'VARCHAR' },
    { name: 'Amount', type: 'DOUBLE' }
  ];

  it('builds grouped SQL for series widgets', () => {
    const widget: Widget = {
      id: 'w1',
      type: 'bar',
      title: 'Amount by Category',
      xAxis: 'Category',
      yAxis: 'Amount',
      aggregation: 'SUM',
      x: 0,
      y: 0,
      w: 6,
      h: 3
    };

    const sql = buildWidgetSql({
      kind: 'series',
      widgetId: widget.id,
      widgetType: widget.type,
      widget,
      filters: []
    }, columns);

    expect(sql).toContain('SUM("Amount"::double precision)');
    expect(sql).toContain('GROUP BY "Category"');
  });

  it('upgrades legacy treemap widgets with numeric measures to grouped SUM SQL', () => {
    const widget: Widget = {
      id: 'w2',
      type: 'treemap',
      title: 'Category by Amount',
      xAxis: 'Category',
      yAxis: 'Amount',
      aggregation: 'NONE',
      x: 0,
      y: 0,
      w: 6,
      h: 3
    };

    const sql = buildWidgetSql({
      kind: 'series',
      widgetId: widget.id,
      widgetType: widget.type,
      widget,
      filters: []
    }, columns);

    expect(sql).toContain('SUM("Amount"::double precision)');
    expect(sql).toContain('GROUP BY "Category"');
  });

  it('quotes embedded identifier delimiters safely', () => {
    expect(quoteSqlIdentifier('Monto "Neto"')).toBe('"Monto ""Neto"""');
  });

  it('deduplicates concurrent requests for the same widget SQL', async () => {
    const runQuery = vi.fn(async () => [{ Category: 'A', Amount: 10 }]);
    setAnalyticsProvider({ ...originalProvider, runQuery });
    const widget: Widget = {
      id: 'same-query', type: 'bar', title: 'Amount by Category',
      xAxis: 'Category', yAxis: 'Amount', aggregation: 'SUM', x: 0, y: 0, w: 6, h: 3
    };
    const model = { kind: 'series' as const, widgetId: widget.id, widgetType: widget.type, widget, filters: [] };

    const [first, second] = await Promise.all([
      executeWidgetQuery(model, columns, 'dataset-1'),
      executeWidgetQuery(model, columns, 'dataset-1')
    ]);

    expect(runQuery).toHaveBeenCalledTimes(1);
    expect(first).toEqual(second);
  });

  it('limits independent widget queries to two concurrent requests', async () => {
    let active = 0;
    let maximumActive = 0;
    const runQuery = vi.fn(async () => {
      active += 1;
      maximumActive = Math.max(maximumActive, active);
      await new Promise((resolve) => setTimeout(resolve, 5));
      active -= 1;
      return [{ Category: 'A', Amount: 10 }];
    });
    setAnalyticsProvider({ ...originalProvider, runQuery });
    const widget: Widget = {
      id: 'limited-query', type: 'bar', title: 'Amount by Category',
      xAxis: 'Category', yAxis: 'Amount', aggregation: 'SUM', x: 0, y: 0, w: 6, h: 3
    };
    const model = { kind: 'series' as const, widgetId: widget.id, widgetType: widget.type, widget, filters: [] };

    await Promise.all([
      executeWidgetQuery(model, columns, 'dataset-1'),
      executeWidgetQuery(model, columns, 'dataset-2'),
      executeWidgetQuery(model, columns, 'dataset-3')
    ]);

    expect(runQuery).toHaveBeenCalledTimes(3);
    expect(maximumActive).toBe(2);
  });
});
