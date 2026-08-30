import type { Widget } from '@/lib/widgets/types';
import { normalizeCanvasWidgetLayout } from '@/lib/widgets/sizing';

interface WidgetLayoutRule {
  preferredW: number;
  minW: number;
  maxW: number;
  defaultH: number;
}

interface ReportLayoutRowItem {
  widget: Widget;
  rule: WidgetLayoutRule;
  w: number;
}

export interface ReportLayoutItem {
  widgetId: string;
  order: number;
  x: number;
  y: number;
  w: number;
  h: number;
}

export const REPORT_LAYOUT_COLUMNS = 12;
export const REPORT_LAYOUT_ROW_HEIGHT = 76;
export const REPORT_LAYOUT_GAP = 18;
export const REPORT_LAYOUT_MOBILE_BREAKPOINT = 980;

const LEGACY_EDITOR_COLUMNS = 3;
const LEGACY_CANVAS_X_SCALE = REPORT_LAYOUT_COLUMNS / LEGACY_EDITOR_COLUMNS;
const LEGACY_CANVAS_Y_SCALE = 4 / 3;

const DEFAULT_RULE: WidgetLayoutRule = {
  preferredW: 6,
  minW: 4,
  maxW: 12,
  defaultH: 4
};

function stripLegacyDisplayLayout(widget: Widget): Widget {
  const { displayLayout, ...rest } = widget;
  void displayLayout;
  return rest;
}

function getWidgetLayoutRule(widget: Widget): WidgetLayoutRule {
  switch (widget.type) {
    case 'card':
      return { preferredW: 4, minW: 3, maxW: 6, defaultH: 4 };
    case 'line':
    case 'area':
      return { preferredW: 8, minW: 6, maxW: 12, defaultH: 4 };
    case 'bar':
      return { preferredW: 7, minW: 5, maxW: 9, defaultH: 4 };
    case 'treemap':
      return { preferredW: 5, minW: 4, maxW: 7, defaultH: 4 };
    case 'pie':
      return { preferredW: 5, minW: 4, maxW: 6, defaultH: 4 };
    case 'table':
      return { preferredW: 8, minW: 6, maxW: 12, defaultH: 4 };
    case 'map':
      return { preferredW: 12, minW: 8, maxW: 12, defaultH: 5 };
    default:
      return DEFAULT_RULE;
  }
}

function distributeLeftover(row: ReportLayoutRowItem[], leftover: number) {
  if (leftover <= 0 || row.length === 0) return;

  const growable = row.filter((item) => item.w < item.rule.maxW);
  if (growable.length === 0) {
    row[row.length - 1].w += leftover;
    return;
  }

  let remaining = leftover;
  let cursor = 0;

  while (remaining > 0) {
    const item = growable[cursor % growable.length];
    if (item.w < item.rule.maxW) {
      item.w += 1;
      remaining -= 1;
    }
    cursor += 1;
    if (cursor > 200) break;
  }

  if (remaining > 0) {
    row[row.length - 1].w += remaining;
  }
}

function finalizeRow(row: ReportLayoutRowItem[]) {
  const used = row.reduce((sum, item) => sum + item.w, 0);
  const leftover = Math.max(0, REPORT_LAYOUT_COLUMNS - used);

  if (row.length === 1) {
    row[0].w = REPORT_LAYOUT_COLUMNS;
    return;
  }

  distributeLeftover(row, leftover);
}

function buildRow(widgets: Widget[], startIndex: number) {
  const row: ReportLayoutRowItem[] = [];
  let used = 0;
  let index = startIndex;

  while (index < widgets.length) {
    const widget = widgets[index];
    const rule = getWidgetLayoutRule(widget);
    const remaining = REPORT_LAYOUT_COLUMNS - used;

    if (remaining <= 0) break;

    const preferredW = Math.min(rule.preferredW, remaining);
    if (row.length > 0 && preferredW < rule.minW) {
      break;
    }

    const nextW = Math.max(rule.minW, preferredW);
    row.push({ widget, rule, w: nextW });
    used += nextW;
    index += 1;

    if (used >= REPORT_LAYOUT_COLUMNS) break;
  }

  finalizeRow(row);
  return { row, nextIndex: index };
}

function getLegacyCanvasFromDisplayLayout(widget: Widget) {
  const displayLayout = widget.displayLayout;
  if (!displayLayout) return null;

  const colWidth = 4;
  const w = Math.max(1, Math.min(LEGACY_EDITOR_COLUMNS, Math.round(displayLayout.colSpan / colWidth)));
  const x = Math.max(0, Math.min(LEGACY_EDITOR_COLUMNS - w, Math.round((displayLayout.colStart - 1) / colWidth)));
  const y = displayLayout.row * 2;
  const h = Math.max(2, displayLayout.rowSpan + 1);

  return { x, y, w, h };
}

function widgetsUseLegacyAutoLayout(widgets: Widget[]) {
  return widgets.length > 0 && widgets.every((widget) => {
    const legacyCanvas = getLegacyCanvasFromDisplayLayout(widget);
    if (!legacyCanvas) return false;

    return legacyCanvas.x === widget.x
      && legacyCanvas.y === widget.y
      && legacyCanvas.w === widget.w
      && legacyCanvas.h === widget.h;
  });
}

function widgetsUseLegacyEditorGrid(widgets: Widget[]) {
  return widgets.length > 0 && widgets.every((widget) => (
    Number.isFinite(widget.x)
    && Number.isFinite(widget.y)
    && Number.isFinite(widget.w)
    && Number.isFinite(widget.h)
    && widget.w <= LEGACY_EDITOR_COLUMNS
    && widget.x + widget.w <= LEGACY_EDITOR_COLUMNS
  ));
}

function isCanonicalWidget(widget: Widget) {
  return Number.isFinite(widget.x)
    && Number.isFinite(widget.y)
    && Number.isFinite(widget.w)
    && Number.isFinite(widget.h)
    && widget.w > LEGACY_EDITOR_COLUMNS;
}

function collides(a: ReportLayoutItem, b: ReportLayoutItem) {
  return a.x < b.x + b.w
    && a.x + a.w > b.x
    && a.y < b.y + b.h
    && a.y + a.h > b.y;
}

function compactItems(items: ReportLayoutItem[]) {
  const placed: ReportLayoutItem[] = [];

  return items
    .sort((a, b) => (a.y - b.y) || (a.x - b.x) || (a.order - b.order))
    .map((item) => {
      const next = { ...item };
      while (placed.some((candidate) => collides(candidate, next))) {
        next.y += 1;
      }
      placed.push(next);
      return next;
    });
}

function scaleLegacyCanvasWidget(widget: Widget, order: number): ReportLayoutItem {
  const scaledW = Math.max(1, Math.round(widget.w * LEGACY_CANVAS_X_SCALE));
  const scaledX = Math.max(0, Math.round(widget.x * LEGACY_CANVAS_X_SCALE));
  const scaledH = Math.max(1, Math.round(widget.h * LEGACY_CANVAS_Y_SCALE));
  const scaledY = Math.max(0, Math.round(widget.y * LEGACY_CANVAS_Y_SCALE));
  const normalized = normalizeCanvasWidgetLayout({
    ...stripLegacyDisplayLayout(widget),
    x: scaledX,
    y: scaledY,
    w: scaledW,
    h: scaledH
  }, REPORT_LAYOUT_COLUMNS);

  return {
    widgetId: widget.id,
    order,
    x: normalized.x,
    y: normalized.y,
    w: normalized.w,
    h: normalized.h
  };
}

function toCanonicalWidget(widget: Widget, layout: ReportLayoutItem): Widget {
  return normalizeCanvasWidgetLayout({
    ...stripLegacyDisplayLayout(widget),
    x: layout.x,
    y: layout.y,
    w: layout.w,
    h: layout.h
  }, REPORT_LAYOUT_COLUMNS);
}

export function buildReportLayoutItems(widgets: Widget[]): ReportLayoutItem[] {
  const items: ReportLayoutItem[] = [];
  let index = 0;
  let currentY = 0;

  while (index < widgets.length) {
    const { row, nextIndex } = buildRow(widgets, index);
    const rowHeightUnits = Math.max(...row.map((item) => item.rule.defaultH), 4);
    let currentX = 0;

    row.forEach((item) => {
      items.push({
        widgetId: item.widget.id,
        order: items.length,
        x: currentX,
        y: currentY,
        w: item.w,
        h: rowHeightUnits
      });
      currentX += item.w;
    });

    currentY += rowHeightUnits;
    index = nextIndex;
  }

  return items;
}

export function applyReportLayout(widgets: Widget[]) {
  const baseWidgets = widgets.map(stripLegacyDisplayLayout);
  const items = buildReportLayoutItems(baseWidgets);
  const itemById = new Map(items.map((item) => [item.widgetId, item]));

  return baseWidgets.map((widget) => {
    const layout = itemById.get(widget.id);
    if (!layout) return widget;
    return toCanonicalWidget(widget, layout);
  });
}

export function normalizeReportWidgets(widgets: Widget[]) {
  if (!widgets.length) return [];

  if (widgetsUseLegacyAutoLayout(widgets)) {
    return applyReportLayout(widgets);
  }

  if (widgetsUseLegacyEditorGrid(widgets)) {
    const compacted = compactItems(widgets.map((widget, index) => scaleLegacyCanvasWidget(widget, index)));
    const itemById = new Map(compacted.map((item) => [item.widgetId, item]));

    return widgets.map((widget, index) => {
      const layout = itemById.get(widget.id) || scaleLegacyCanvasWidget(widget, index);
      return toCanonicalWidget(widget, layout);
    });
  }

  if (widgets.every(isCanonicalWidget)) {
    const compacted = compactItems(widgets.map((widget, index) => ({
      widgetId: widget.id,
      order: index,
      x: widget.x,
      y: widget.y,
      w: widget.w,
      h: widget.h
    })));
    const itemById = new Map(compacted.map((item) => [item.widgetId, item]));

    return widgets.map((widget, index) => {
      const layout = itemById.get(widget.id) || compacted[index];
      return toCanonicalWidget(widget, layout);
    });
  }

  return applyReportLayout(widgets);
}

export function getWidgetDisplayLayout(widget: Widget, order = 0): ReportLayoutItem {
  const [normalized] = normalizeReportWidgets([{ ...widget, id: widget.id }]);

  return {
    widgetId: normalized?.id || widget.id,
    order,
    x: normalized?.x ?? 0,
    y: normalized?.y ?? 0,
    w: normalized?.w ?? REPORT_LAYOUT_COLUMNS,
    h: normalized?.h ?? 4
  };
}

export function convertDisplayLayoutToCanvas(widget: Widget) {
  return normalizeReportWidgets([widget])[0];
}

export function sortWidgetsByLayout(widgets: Widget[]) {
  return [...normalizeReportWidgets(widgets)].sort((a, b) => (
    a.y - b.y
    || a.x - b.x
    || a.h - b.h
    || a.w - b.w
    || a.id.localeCompare(b.id)
  ));
}

export function projectWidgetsForPresentation(widgets: Widget[], mobile = false) {
  const ordered = sortWidgetsByLayout(widgets);

  if (!mobile) return ordered;

  let nextY = 0;
  return ordered.map((widget) => {
    const projected = toCanonicalWidget(widget, {
      widgetId: widget.id,
      order: 0,
      x: 0,
      y: nextY,
      w: REPORT_LAYOUT_COLUMNS,
      h: widget.h
    });
    nextY += projected.h;
    return projected;
  });
}

export function getPresentationWidgetPlacement(widget: Widget, order = 0) {
  const layout = getWidgetDisplayLayout(widget, order);
  return {
    gridColumn: `${layout.x + 1} / span ${layout.w}`,
    gridRow: `${layout.y + 1} / span ${layout.h}`
  } as const;
}

export function getCanonicalWidgetPixelHeight(widget: Widget) {
  const layout = getWidgetDisplayLayout(widget);
  return layout.h * REPORT_LAYOUT_ROW_HEIGHT + Math.max(0, layout.h - 1) * REPORT_LAYOUT_GAP;
}
