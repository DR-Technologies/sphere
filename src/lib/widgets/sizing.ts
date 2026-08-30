import type { Widget } from '@/lib/widgets/types';

export interface WidgetSizePolicy {
  minW: number;
  minH: number;
  defaultW: number;
  defaultH: number;
  maxW: number;
  maxH: number;
}

export const REPORT_EDITOR_GRID_BREAKPOINTS = { lg: 1200, md: 996, sm: 768, xs: 480, xxs: 0 } as const;
export const REPORT_EDITOR_GRID_COLS = { lg: 12, md: 12, sm: 6, xs: 1, xxs: 1 } as const;
export const REPORT_EDITOR_DESKTOP_COLUMNS = REPORT_EDITOR_GRID_COLS.lg;
export const REPORT_EDITOR_GRID_ROW_HEIGHT = 76;
export const REPORT_EDITOR_GRID_MARGIN: [number, number] = [18, 18];
export const REPORT_EDITOR_GRID_COMPACT_TYPE = 'vertical' as const;

const WIDGET_SIZE_POLICIES: Record<Widget['type'], WidgetSizePolicy> = {
  card: { minW: 3, minH: 3, defaultW: 4, defaultH: 4, maxW: 6, maxH: 6 },
  line: { minW: 6, minH: 4, defaultW: 8, defaultH: 4, maxW: 12, maxH: 8 },
  bar: { minW: 5, minH: 4, defaultW: 7, defaultH: 4, maxW: 10, maxH: 8 },
  area: { minW: 6, minH: 4, defaultW: 8, defaultH: 4, maxW: 12, maxH: 8 },
  pie: { minW: 4, minH: 4, defaultW: 5, defaultH: 4, maxW: 8, maxH: 6 },
  treemap: { minW: 4, minH: 4, defaultW: 5, defaultH: 4, maxW: 8, maxH: 8 },
  table: { minW: 6, minH: 4, defaultW: 8, defaultH: 4, maxW: 12, maxH: 8 },
  map: { minW: 8, minH: 5, defaultW: 12, defaultH: 5, maxW: 12, maxH: 10 }
};

export function getWidgetSizePolicy(type: Widget['type']): WidgetSizePolicy {
  return WIDGET_SIZE_POLICIES[type];
}

export function getWidgetDefaultSize(type: Widget['type']) {
  const policy = getWidgetSizePolicy(type);
  return {
    w: policy.defaultW,
    h: policy.defaultH
  };
}

export function getGridHeightForRows(rows: number) {
  return REPORT_EDITOR_GRID_ROW_HEIGHT * rows + REPORT_EDITOR_GRID_MARGIN[1] * Math.max(0, rows - 1);
}

export function normalizeWidgetSize(type: Widget['type'], w: number, h: number, cols = REPORT_EDITOR_DESKTOP_COLUMNS) {
  const policy = getWidgetSizePolicy(type);
  const effectiveMaxW = Math.min(policy.maxW, cols);

  return {
    w: Math.max(policy.minW, Math.min(effectiveMaxW, w)),
    h: Math.max(policy.minH, Math.min(policy.maxH, h))
  };
}

export function normalizeCanvasWidgetLayout<T extends { type: Widget['type']; w: number; h: number; x: number; y: number }>(
  widget: T,
  cols = REPORT_EDITOR_DESKTOP_COLUMNS
): T {
  const nextSize = normalizeWidgetSize(widget.type, widget.w, widget.h, cols);
  const maxX = Math.max(0, cols - nextSize.w);

  return {
    ...widget,
    w: nextSize.w,
    h: nextSize.h,
    x: Math.max(0, Math.min(maxX, widget.x)),
    y: Math.max(0, widget.y)
  };
}
