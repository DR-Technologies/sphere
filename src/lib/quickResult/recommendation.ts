import type { Widget, ReportPresentation } from '@/lib/widgets/types';
import type { DatasetColumn, DatasetColumnStat } from '@/lib/analytics/types';
import { summarizeSemantics } from '@/lib/analytics/semantics';
import { buildDefaultWidgetTitle } from '@/lib/widgets/config';
import { applyReportLayout } from '@/lib/reportLayout';

interface DatasetLike {
  name: string;
  columns: DatasetColumn[];
  stats: DatasetColumnStat[];
}

interface QuickResultRecommendation {
  widgets: Widget[];
  presentation: ReportPresentation;
}

function createWidget(overrides: Partial<Widget> & Pick<Widget, 'type' | 'xAxis' | 'yAxis'>, index: number): Widget {
  const w = overrides.type === 'card' ? 4 : overrides.type === 'map' ? 8 : overrides.type === 'table' ? 12 : 6;
  const h = overrides.type === 'card' ? 2 : overrides.type === 'table' ? 4 : overrides.type === 'map' ? 4 : 3;
  return {
    id: `quick-${index + 1}`,
    type: overrides.type,
    title: overrides.title || buildDefaultWidgetTitle({ type: overrides.type, xAxis: overrides.xAxis, yAxis: overrides.yAxis }),
    xAxis: overrides.xAxis,
    yAxis: overrides.yAxis,
    aggregation: overrides.aggregation || 'SUM',
    x: (index % 2) * 6,
    y: Math.floor(index / 2) * 3,
    w,
    h,
    orderBy: overrides.orderBy,
    topN: overrides.topN,
    orientation: overrides.orientation,
    colorScheme: overrides.colorScheme || 'varied',
    colorByCategory: overrides.colorByCategory ?? true,
    customColor: overrides.customColor,
    showLegend: overrides.showLegend ?? (overrides.type !== 'card' && overrides.type !== 'map' && overrides.type !== 'table' && overrides.type !== 'treemap'),
    showTooltip: overrides.showTooltip ?? true,
    showDataLabels: overrides.showDataLabels ?? false,
    numberFormat: overrides.numberFormat || 'standard',
    dateDisplayFormat: overrides.dateDisplayFormat || 'default',
    columns: overrides.columns,
    columnAggregations: overrides.columnAggregations,
    latitudeField: overrides.latitudeField,
    longitudeField: overrides.longitudeField,
    showWidgetTitle: overrides.showWidgetTitle ?? true,
    showWidgetSubtitle: overrides.showWidgetSubtitle ?? true,
    showCardLabel: overrides.showCardLabel,
    cardValueSize: overrides.cardValueSize
  };
}

function cleanDatasetName(name: string) {
  return name.replace(/\.(csv|json|xlsx|xls)$/i, '').trim();
}

export function buildQuickResultRecommendation(dataset: DatasetLike): QuickResultRecommendation {
  const semantics = summarizeSemantics(dataset.columns);
  const primaryMeasure = semantics.currencies[0] || semantics.measures[0] || semantics.percentages[0] || dataset.columns.find((column) => ['INTEGER', 'BIGINT', 'DOUBLE', 'DECIMAL'].includes(column.type.toUpperCase()))?.name || dataset.columns[0]?.name || '';
  const primaryDate = semantics.datetimes[0] || '';
  const categoricalDimensions = semantics.dimensions.filter((column) => column !== primaryDate && column !== primaryMeasure && !semantics.identifiers.includes(column));
  const primaryDimension = categoricalDimensions[0] || semantics.geographies[0] || semantics.dimensions[0] || dataset.columns.find((column) => column.name !== primaryMeasure && column.name !== primaryDate)?.name || '';
  const compositionDimension = categoricalDimensions.find((column) => column !== primaryDimension) || primaryDimension || semantics.geographies[0] || '';
  const latitudeField = dataset.columns.find((column) => /^(lat|latitude)$/i.test(column.name))?.name || '';
  const longitudeField = dataset.columns.find((column) => /^(lng|lon|longitude)$/i.test(column.name))?.name || '';

  const widgets: Widget[] = [];

  if (primaryMeasure) {
    widgets.push(createWidget({
      type: 'card',
      xAxis: primaryDimension || primaryMeasure,
      yAxis: primaryMeasure,
      aggregation: 'SUM',
      showWidgetSubtitle: false,
      cardValueSize: 'large',
      showCardLabel: true,
      title: buildDefaultWidgetTitle({ type: 'card', xAxis: primaryDimension || primaryMeasure, yAxis: primaryMeasure })
    }, widgets.length));
  }

  if (primaryDate && primaryMeasure) {
    widgets.push(createWidget({
      type: 'line',
      xAxis: primaryDate,
      yAxis: primaryMeasure,
      aggregation: 'SUM',
      orderBy: 'ASC',
      title: `${primaryMeasure} por ${primaryDate}`
    }, widgets.length));
  }

  if (primaryDimension && primaryMeasure) {
    widgets.push(createWidget({
      type: 'bar',
      xAxis: primaryDimension,
      yAxis: primaryMeasure,
      aggregation: 'SUM',
      orderBy: 'DESC',
      topN: 10,
      orientation: 'horizontal',
      title: `${primaryMeasure} por ${primaryDimension}`
    }, widgets.length));
  }

  if (compositionDimension && primaryMeasure) {
    widgets.push(createWidget({
      type: 'treemap',
      xAxis: compositionDimension,
      yAxis: primaryMeasure,
      aggregation: 'SUM',
      showDataLabels: true,
      title: `${compositionDimension} por ${primaryMeasure}`
    }, widgets.length));
  }

  if (latitudeField && longitudeField && primaryMeasure) {
    widgets.push(createWidget({
      type: 'map',
      xAxis: primaryDimension || primaryMeasure,
      yAxis: primaryMeasure,
      aggregation: 'SUM',
      latitudeField,
      longitudeField,
      topN: 200,
      title: `${primaryMeasure} por ubicación`
    }, widgets.length));
  } else if (compositionDimension && primaryMeasure) {
    widgets.push(createWidget({
      type: 'pie',
      xAxis: compositionDimension,
      yAxis: primaryMeasure,
      aggregation: 'SUM',
      topN: 8,
      showDataLabels: true,
      title: `Participación de ${primaryMeasure}`
    }, widgets.length));
  }

  widgets.push(createWidget({
    type: 'table',
    xAxis: primaryDimension || dataset.columns[0]?.name || '',
    yAxis: primaryMeasure || dataset.columns[1]?.name || dataset.columns[0]?.name || '',
    columns: [primaryDimension, primaryMeasure, primaryDate].filter(Boolean).slice(0, 4),
    aggregation: 'NONE',
    title: 'Detalle'
  }, widgets.length));

  return {
    widgets: applyReportLayout(widgets.slice(0, 6)),
    presentation: {
      title: cleanDatasetName(dataset.name),
      subtitle: primaryDate ? `Resultado automático basado en ${primaryMeasure} y ${primaryDate}` : `Resultado automático basado en ${primaryMeasure || 'tu dataset'}`,
      templateId: 'modern',
      source: 'quick-result'
    }
  };
}
