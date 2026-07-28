import type { Widget } from '@/lib/widgets/types';

export interface PresentationWidgetLayout {
  columnSpan: number;
  minHeight: number;
  chartAreaMinHeight: number;
  maxTableHeight?: number;
}

export function getPresentationWidgetLayout(widget: Widget): PresentationWidgetLayout {
  switch (widget.type) {
    case 'card':
      return {
        columnSpan: 4,
        minHeight: 220,
        chartAreaMinHeight: 132
      };
    case 'line':
    case 'area':
      return {
        columnSpan: 8,
        minHeight: 380,
        chartAreaMinHeight: 290
      };
    case 'bar':
      return {
        columnSpan: 7,
        minHeight: 380,
        chartAreaMinHeight: 290
      };
    case 'treemap':
      return {
        columnSpan: 5,
        minHeight: 380,
        chartAreaMinHeight: 290
      };
    case 'pie':
      return {
        columnSpan: 5,
        minHeight: 360,
        chartAreaMinHeight: 272
      };
    case 'table':
      return {
        columnSpan: 7,
        minHeight: 360,
        chartAreaMinHeight: 272,
        maxTableHeight: 300
      };
    case 'map':
      return {
        columnSpan: 12,
        minHeight: 420,
        chartAreaMinHeight: 332
      };
    default:
      return {
        columnSpan: 6,
        minHeight: 360,
        chartAreaMinHeight: 272
      };
  }
}
