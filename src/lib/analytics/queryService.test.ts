import { describe, expect, it } from 'vitest';
import { buildWidgetSql } from './queryService';
import type { Widget } from '@/lib/widgets/types';

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
});
