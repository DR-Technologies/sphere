import type { Widget } from '@/lib/widgets/types';

export interface PresentationWidgetLayout {
  columnSpan: number;
  mobileColumnSpan: number;
  minHeight: number;
  chartAreaMinHeight: number;
  maxTableHeight?: number;
  emphasis: 'compact' | 'medium' | 'wide' | 'full';
}

export function getPresentationWidgetLayout(widget: Widget): PresentationWidgetLayout {
  switch (widget.type) {
    case 'card':
      return {
        columnSpan: 4,
        mobileColumnSpan: 12,
        minHeight: 204,
        chartAreaMinHeight: 124,
        emphasis: 'compact'
      };
    case 'line':
    case 'area':
      return {
        columnSpan: 8,
        mobileColumnSpan: 12,
        minHeight: 368,
        chartAreaMinHeight: 280,
        emphasis: 'wide'
      };
    case 'bar':
      return {
        columnSpan: 7,
        mobileColumnSpan: 12,
        minHeight: 360,
        chartAreaMinHeight: 272,
        emphasis: 'medium'
      };
    case 'treemap':
      return {
        columnSpan: 5,
        mobileColumnSpan: 12,
        minHeight: 360,
        chartAreaMinHeight: 272,
        emphasis: 'medium'
      };
    case 'pie':
      return {
        columnSpan: 5,
        mobileColumnSpan: 12,
        minHeight: 360,
        chartAreaMinHeight: 272,
        emphasis: 'medium'
      };
    case 'table':
      return {
        columnSpan: 8,
        mobileColumnSpan: 12,
        minHeight: 328,
        chartAreaMinHeight: 240,
        maxTableHeight: 248,
        emphasis: 'wide'
      };
    case 'map':
      return {
        columnSpan: 12,
        mobileColumnSpan: 12,
        minHeight: 420,
        chartAreaMinHeight: 332,
        emphasis: 'full'
      };
    default:
      return {
        columnSpan: 6,
        mobileColumnSpan: 12,
        minHeight: 344,
        chartAreaMinHeight: 260,
        emphasis: 'medium'
      };
  }
}

export function getPresentationWidgetSubtitle(widget: Pick<Widget, 'type' | 'xAxis' | 'yAxis' | 'aggregation'>) {
  if (widget.type === 'table') {
    return 'Detalle';
  }

  if (widget.type === 'map') {
    return `${widget.yAxis} por ubicación`;
  }

  if (widget.type === 'card') {
    return widget.aggregation !== 'NONE' ? `${widget.aggregation}(${widget.yAxis})` : widget.yAxis;
  }

  return `${widget.aggregation !== 'NONE' ? `${widget.aggregation}(${widget.yAxis})` : widget.yAxis} por ${widget.xAxis}`;
}
