import { describe, expect, it } from 'vitest';
import { applyReportLayout, normalizeReportWidgets, REPORT_LAYOUT_COLUMNS } from '@/lib/reportLayout';
import type { Widget } from '@/lib/widgets/types';

function createWidget(type: Widget['type'], overrides: Partial<Widget> = {}): Widget {
  return {
    id: `${type}-${overrides.id || 'widget'}`,
    type,
    title: `${type} widget`,
    xAxis: 'Category',
    yAxis: 'Metric',
    aggregation: 'SUM',
    x: 0,
    y: 0,
    w: 1,
    h: 1,
    ...overrides
  };
}

describe('report layout', () => {
  it('creates the instant wow canonical composition directly in widget geometry', () => {
    const widgets = applyReportLayout([
      createWidget('card', { id: 'card' }),
      createWidget('line', { id: 'line' }),
      createWidget('bar', { id: 'bar' }),
      createWidget('treemap', { id: 'treemap' }),
      createWidget('pie', { id: 'pie' }),
      createWidget('table', { id: 'table' })
    ]);

    expect(widgets.map((widget) => ({ id: widget.id, x: widget.x, y: widget.y, w: widget.w, h: widget.h }))).toEqual([
      { id: 'card', x: 0, y: 0, w: 4, h: 4 },
      { id: 'line', x: 4, y: 0, w: 8, h: 4 },
      { id: 'bar', x: 0, y: 4, w: 7, h: 4 },
      { id: 'treemap', x: 7, y: 4, w: 5, h: 4 },
      { id: 'pie', x: 0, y: 8, w: 5, h: 4 },
      { id: 'table', x: 5, y: 8, w: 7, h: 4 }
    ]);
  });

  it('migrates legacy auto layouts back to canonical instant wow geometry', () => {
    const widgets = normalizeReportWidgets([
      createWidget('card', {
        id: 'card',
        x: 0,
        y: 0,
        w: 1,
        h: 2,
        displayLayout: { row: 0, order: 0, colStart: 1, colSpan: 4, rowSpan: 1, mobileColSpan: 12 }
      }),
      createWidget('line', {
        id: 'line',
        x: 1,
        y: 0,
        w: 2,
        h: 3,
        displayLayout: { row: 0, order: 1, colStart: 5, colSpan: 8, rowSpan: 2, mobileColSpan: 12 }
      })
    ]);

    expect(widgets.map((widget) => ({ x: widget.x, y: widget.y, w: widget.w, h: widget.h }))).toEqual([
      { x: 0, y: 0, w: 4, h: 4 },
      { x: 4, y: 0, w: 8, h: 4 }
    ]);
  });

  it('scales refined legacy editor layouts into the canonical 12-column grid without leaving bounds', () => {
    const widgets = normalizeReportWidgets([
      createWidget('line', { id: 'line', x: 0, y: 0, w: 3, h: 4 }),
      createWidget('table', { id: 'table', x: 0, y: 4, w: 3, h: 6 })
    ]);

    widgets.forEach((widget) => {
      expect(widget.x).toBeGreaterThanOrEqual(0);
      expect(widget.y).toBeGreaterThanOrEqual(0);
      expect(widget.w).toBeGreaterThanOrEqual(1);
      expect(widget.x + widget.w).toBeLessThanOrEqual(REPORT_LAYOUT_COLUMNS);
    });
  });
});
