import type { DatasetColumnMeta, GlobalFilter, Widget } from '@/lib/widgets/types';
import { getWidgetConfigIssue } from '@/lib/widgets/config';

export type WidgetQueryKind = 'series' | 'table' | 'card' | 'map';

export interface WidgetQueryModel {
  kind: WidgetQueryKind;
  widgetId: string;
  widgetType: Widget['type'];
  widget: Widget;
  filters: GlobalFilter[];
}

export function buildWidgetQueryModel(widget: Widget, columnsMeta: DatasetColumnMeta[], filters: GlobalFilter[]): { model?: WidgetQueryModel; issue?: string } {
  const issue = getWidgetConfigIssue(widget, columnsMeta);
  if (issue) {
    return { issue };
  }

  if (widget.type === 'table') {
    return { model: { kind: 'table', widgetId: widget.id, widgetType: widget.type, widget, filters } };
  }

  if (widget.type === 'card') {
    return { model: { kind: 'card', widgetId: widget.id, widgetType: widget.type, widget, filters } };
  }

  if (widget.type === 'map') {
    return { model: { kind: 'map', widgetId: widget.id, widgetType: widget.type, widget, filters } };
  }

  return { model: { kind: 'series', widgetId: widget.id, widgetType: widget.type, widget, filters } };
}
