import type { ChartType } from '@/components/visuals/ChartRenderer';

export type AggregationType = 'SUM' | 'AVG' | 'COUNT' | 'MIN' | 'MAX' | 'DISTINCT' | 'NONE';

export interface Widget {
  id: string;
  type: ChartType;
  title: string;
  xAxis: string;
  yAxis: string;
  aggregation: AggregationType;
  columns?: string[];
  x: number;
  y: number;
  w: number;
  h: number;
  orderBy?: 'ASC' | 'DESC';
  topN?: number;
  orientation?: 'vertical' | 'horizontal';
  colorScheme?: 'varied' | 'blues' | 'solid';
  colorByCategory?: boolean;
  customColor?: string;
  showLegend?: boolean;
  showTooltip?: boolean;
  showDataLabels?: boolean;
  numberFormat?: 'standard' | 'compact';
  dateDisplayFormat?: 'default' | 'short';
  columnAggregations?: Record<string, AggregationType>;
  latitudeField?: string;
  longitudeField?: string;
  showWidgetTitle?: boolean;
  showWidgetSubtitle?: boolean;
  showCardLabel?: boolean;
  cardValueSize?: 'small' | 'medium' | 'large';
}

export interface GlobalFilter {
  id: string;
  column: string;
  value: string | null;
}

export interface ReportPresentation {
  title: string;
  subtitle: string;
  templateId: 'modern' | 'editorial' | 'dark';
  source: 'quick-result' | 'refine';
}

export interface DatasetColumnMeta {
  name: string;
  type: string;
  semanticRole?: string;
  semanticConfidence?: number;
  semanticReason?: string;
}
