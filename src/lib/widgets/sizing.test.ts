import { describe, expect, it } from 'vitest';
import { convertDisplayLayoutToCanvas } from '@/lib/reportLayout';
import {
  getGridHeightForRows,
  getWidgetDefaultSize,
  getWidgetSizePolicy,
  normalizeCanvasWidgetLayout,
  normalizeWidgetSize
} from '@/lib/widgets/sizing';
import type { Widget } from '@/lib/widgets/types';

function createWidget(type: Widget['type'], overrides: Partial<Widget> = {}): Widget {
  return {
    id: `${type}-widget`,
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

describe('widget sizing policy', () => {
  it('enforces meaningful minimums for resizable visuals', () => {
    expect(getWidgetSizePolicy('card')).toMatchObject({ minW: 3, minH: 3 });
    expect(getWidgetSizePolicy('line')).toMatchObject({ minW: 6, minH: 4 });
    expect(getWidgetSizePolicy('bar')).toMatchObject({ minW: 5, minH: 4 });
    expect(getWidgetSizePolicy('table')).toMatchObject({ minW: 6, minH: 4 });
  });

  it('clamps widget sizes to their policy bounds', () => {
    expect(normalizeWidgetSize('line', 1, 1)).toEqual({ w: 6, h: 4 });
    expect(normalizeWidgetSize('table', 16, 99)).toEqual({ w: 12, h: 8 });
    expect(normalizeWidgetSize('card', 9, 10)).toEqual({ w: 6, h: 6 });
  });

  it('keeps normalized widgets inside the desktop grid bounds', () => {
    const normalized = normalizeCanvasWidgetLayout(createWidget('line', { x: 8, w: 8, h: 2 }));
    expect(normalized.x).toBe(4);
    expect(normalized.w).toBe(8);
    expect(normalized.h).toBe(4);
  });

  it('translates legacy presentation layout into canonical dimensions', () => {
    const lineWidget = convertDisplayLayoutToCanvas(createWidget('line', {
      x: 1,
      y: 0,
      w: 2,
      h: 3,
      displayLayout: { row: 0, order: 0, colStart: 5, colSpan: 8, rowSpan: 2, mobileColSpan: 12 }
    }));
    const cardWidget = convertDisplayLayoutToCanvas(createWidget('card', {
      x: 0,
      y: 0,
      w: 1,
      h: 2,
      displayLayout: { row: 0, order: 0, colStart: 1, colSpan: 4, rowSpan: 1, mobileColSpan: 12 }
    }));
    const mapWidget = convertDisplayLayoutToCanvas(createWidget('map', {
      x: 0,
      y: 0,
      w: 3,
      h: 4,
      displayLayout: { row: 0, order: 0, colStart: 1, colSpan: 12, rowSpan: 3, mobileColSpan: 12 }
    }));

    expect(lineWidget).toMatchObject({ w: 12, h: 4, x: 0, y: 0 });
    expect(cardWidget).toMatchObject({ w: 6, h: 4, x: 0, y: 0 });
    expect(mapWidget).toMatchObject({ w: 12, h: 5, x: 0, y: 0 });
  });

  it('uses a finer report grid granularity for canonical presentation parity', () => {
    expect(getGridHeightForRows(1)).toBe(76);
    expect(getGridHeightForRows(2)).toBe(170);
    expect(getGridHeightForRows(4)).toBe(358);
  });

  it('creates widgets using policy defaults instead of ad hoc dimensions', () => {
    expect(getWidgetDefaultSize('card')).toEqual({ w: 4, h: 4 });
    expect(getWidgetDefaultSize('line')).toEqual({ w: 8, h: 4 });
    expect(getWidgetDefaultSize('table')).toEqual({ w: 8, h: 4 });
  });
});
