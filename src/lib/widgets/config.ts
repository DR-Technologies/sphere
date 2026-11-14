import type { ChartType } from '@/components/visuals/ChartRenderer';
import type { DatasetColumnMeta, Widget } from './types';

const NUMERIC_COLUMN_TYPES = new Set(['INTEGER', 'BIGINT', 'DOUBLE', 'DECIMAL', 'NUMERIC', 'REAL', 'SMALLINT']);

export const PRESENTATION_CONTROL_SUPPORT: Record<ChartType, { legend: boolean; tooltip: boolean; dataLabels: boolean; colors: boolean; numberFormat: boolean; dateFormat: boolean; orientation: boolean }> = {
  bar: { legend: true, tooltip: true, dataLabels: true, colors: true, numberFormat: true, dateFormat: true, orientation: true },
  line: { legend: true, tooltip: true, dataLabels: true, colors: true, numberFormat: true, dateFormat: true, orientation: false },
  pie: { legend: true, tooltip: true, dataLabels: true, colors: true, numberFormat: true, dateFormat: true, orientation: false },
  area: { legend: true, tooltip: true, dataLabels: true, colors: true, numberFormat: true, dateFormat: true, orientation: false },
  table: { legend: false, tooltip: false, dataLabels: false, colors: false, numberFormat: true, dateFormat: true, orientation: false },
  treemap: { legend: false, tooltip: true, dataLabels: true, colors: true, numberFormat: true, dateFormat: true, orientation: false },
  card: { legend: false, tooltip: false, dataLabels: false, colors: false, numberFormat: true, dateFormat: false, orientation: false },
  map: { legend: false, tooltip: false, dataLabels: false, colors: true, numberFormat: true, dateFormat: false, orientation: false }
};

const WIDGET_TYPE_CAPABILITIES: Record<ChartType, {
  usesColumns: boolean;
  usesMapFields: boolean;
  usesOrientation: boolean;
  usesTopN: boolean;
  usesCardControls: boolean;
}> = {
  bar: { usesColumns: false, usesMapFields: false, usesOrientation: true, usesTopN: true, usesCardControls: false },
  line: { usesColumns: false, usesMapFields: false, usesOrientation: false, usesTopN: true, usesCardControls: false },
  pie: { usesColumns: false, usesMapFields: false, usesOrientation: false, usesTopN: true, usesCardControls: false },
  area: { usesColumns: false, usesMapFields: false, usesOrientation: false, usesTopN: true, usesCardControls: false },
  table: { usesColumns: true, usesMapFields: false, usesOrientation: false, usesTopN: false, usesCardControls: false },
  treemap: { usesColumns: false, usesMapFields: false, usesOrientation: false, usesTopN: false, usesCardControls: false },
  card: { usesColumns: false, usesMapFields: false, usesOrientation: false, usesTopN: false, usesCardControls: true },
  map: { usesColumns: false, usesMapFields: true, usesOrientation: false, usesTopN: true, usesCardControls: false }
};

export function getWidgetDisplayDefaults(type: ChartType) {
  return {
    showLegend: PRESENTATION_CONTROL_SUPPORT[type].legend,
    showTooltip: PRESENTATION_CONTROL_SUPPORT[type].tooltip,
    showDataLabels: false,
    numberFormat: 'standard' as const,
    dateDisplayFormat: 'default' as const
  };
}

export function getColumnType(columnsMeta: DatasetColumnMeta[], columnName?: string) {
  if (!columnName) return null;
  return columnsMeta.find((column) => column.name === columnName)?.type?.toUpperCase() || null;
}

function isNumericColumn(columnsMeta: DatasetColumnMeta[], columnName?: string) {
  const columnType = getColumnType(columnsMeta, columnName);
  return Boolean(columnType && NUMERIC_COLUMN_TYPES.has(columnType));
}

export function isExistingColumn(columnsMeta: DatasetColumnMeta[], columnName?: string) {
  return Boolean(columnName && columnsMeta.some((column) => column.name === columnName));
}

export function formatWidgetFieldLabel(value?: string) {
  if (!value) return '';
  return value.replace(/[_-]+/g, ' ').replace(/\s+/g, ' ').trim();
}

export function buildLegacyDefaultWidgetTitle(widget: Pick<Widget, 'type' | 'xAxis' | 'yAxis' | 'topN'>) {
  if (widget.type === 'pie') return `Top ${widget.topN || 10} - ${widget.yAxis} by ${widget.xAxis}`;
  if (widget.type === 'card') return `Nuevo indicador de ${widget.yAxis}`;
  if (widget.type === 'map') return `Nuevo mapa de ${widget.yAxis}`;
  return `Nuevo Gráfico de ${widget.type}`;
}

export function buildDefaultWidgetTitle(widget: Pick<Widget, 'type' | 'xAxis' | 'yAxis'>) {
  const xLabel = formatWidgetFieldLabel(widget.xAxis);
  const yLabel = formatWidgetFieldLabel(widget.yAxis);
  if (widget.type === 'table') return 'Detalle';
  if (widget.type === 'card') return yLabel || 'Indicador';
  if (widget.type === 'map') return yLabel ? `${yLabel} por ubicación` : 'Mapa';
  if (widget.type === 'treemap' && xLabel && yLabel) return `${xLabel} por ${yLabel}`;
  if (xLabel && yLabel) return `${yLabel} por ${xLabel}`;
  return yLabel || xLabel || 'Visualización';
}

export function shouldRefreshWidgetTitle(currentWidget: Widget) {
  const currentTitle = currentWidget.title?.trim();
  if (!currentTitle) return true;
  const generatedTitles = new Set([
    buildLegacyDefaultWidgetTitle(currentWidget),
    buildDefaultWidgetTitle(currentWidget)
  ]);
  return generatedTitles.has(currentTitle);
}

export function getSuggestedWidgetFields(dataset: { columns: DatasetColumnMeta[]; stats: { column: string; type: string }[] }) {
  const semanticMeasure = dataset.columns.find((column) => ['measure', 'currency', 'percentage'].includes(column.semanticRole || ''));
  const semanticDimension = dataset.columns.find((column) => ['dimension', 'datetime', 'geography'].includes(column.semanticRole || ''));
  const numericCol = semanticMeasure?.name || dataset.stats.find((s) => NUMERIC_COLUMN_TYPES.has(s.type.toUpperCase()))?.column || dataset.columns[1]?.name || dataset.columns[0]?.name || '';
  const categoricalCol = semanticDimension?.name || dataset.columns[0]?.name || numericCol;
  const latitudeCol = dataset.columns.find((col) => /^(lat|latitude)$/i.test(col.name))?.name || '';
  const longitudeCol = dataset.columns.find((col) => /^(lng|lon|longitude)$/i.test(col.name))?.name || '';
  return { numericCol, categoricalCol, latitudeCol, longitudeCol };
}

export function getWidgetTypeDefaults(type: ChartType, dataset: { columns: DatasetColumnMeta[]; stats: { column: string; type: string }[] }): Partial<Widget> {
  const { numericCol, categoricalCol, latitudeCol, longitudeCol } = getSuggestedWidgetFields(dataset);
  return {
    type,
    xAxis: categoricalCol,
    yAxis: numericCol,
    aggregation: 'SUM',
    columns: type === 'table' ? [categoricalCol, numericCol].filter(Boolean) : undefined,
    columnAggregations: type === 'table' ? {} : undefined,
    latitudeField: type === 'map' ? latitudeCol : undefined,
    longitudeField: type === 'map' ? longitudeCol : undefined,
    topN: type === 'pie' ? 10 : type === 'map' ? 500 : undefined,
    orientation: type === 'bar' ? 'vertical' : undefined,
    colorScheme: 'varied',
    colorByCategory: true,
    showWidgetTitle: true,
    showWidgetSubtitle: true,
    showCardLabel: type === 'card' ? true : undefined,
    cardValueSize: type === 'card' ? 'medium' : undefined,
    ...getWidgetDisplayDefaults(type)
  };
}

export function sanitizeWidgetForType(widget: Widget, nextType: ChartType, dataset: { columns: DatasetColumnMeta[]; stats: { column: string; type: string }[] }): Widget {
  const capabilities = WIDGET_TYPE_CAPABILITIES[nextType];
  const defaults = getWidgetTypeDefaults(nextType, dataset);
  const nextWidget: Widget = {
    ...widget,
    ...defaults,
    id: widget.id,
    x: widget.x,
    y: widget.y,
    w: widget.w,
    h: widget.h,
    type: nextType,
    aggregation: widget.aggregation || defaults.aggregation || 'SUM',
    xAxis: isExistingColumn(dataset.columns, widget.xAxis) ? widget.xAxis : (defaults.xAxis || ''),
    yAxis: isExistingColumn(dataset.columns, widget.yAxis) ? widget.yAxis : (defaults.yAxis || ''),
    showWidgetTitle: widget.showWidgetTitle ?? true,
    showWidgetSubtitle: widget.showWidgetSubtitle ?? true
  };

  if (capabilities.usesColumns) {
    const validColumns = (widget.columns || []).filter((columnName) => isExistingColumn(dataset.columns, columnName));
    nextWidget.columns = validColumns.length > 0 ? validColumns : defaults.columns;
    nextWidget.columnAggregations = Object.fromEntries(
      Object.entries(widget.columnAggregations || {}).filter(([columnName]) => nextWidget.columns?.includes(columnName))
    );
  } else {
    nextWidget.columns = undefined;
    nextWidget.columnAggregations = undefined;
  }

  if (capabilities.usesMapFields) {
    nextWidget.latitudeField = isExistingColumn(dataset.columns, widget.latitudeField) ? widget.latitudeField : defaults.latitudeField;
    nextWidget.longitudeField = isExistingColumn(dataset.columns, widget.longitudeField) ? widget.longitudeField : defaults.longitudeField;
  } else {
    nextWidget.latitudeField = undefined;
    nextWidget.longitudeField = undefined;
  }

  nextWidget.orientation = capabilities.usesOrientation ? (widget.orientation || defaults.orientation) : undefined;
  nextWidget.topN = capabilities.usesTopN ? (widget.topN ?? defaults.topN) : undefined;

  if (capabilities.usesCardControls) {
    nextWidget.showCardLabel = widget.showCardLabel ?? true;
    nextWidget.cardValueSize = widget.cardValueSize || 'medium';
  } else {
    nextWidget.showCardLabel = undefined;
    nextWidget.cardValueSize = undefined;
  }

  if (!PRESENTATION_CONTROL_SUPPORT[nextType].legend) nextWidget.showLegend = false;
  if (!PRESENTATION_CONTROL_SUPPORT[nextType].tooltip) nextWidget.showTooltip = false;
  if (!PRESENTATION_CONTROL_SUPPORT[nextType].dataLabels) nextWidget.showDataLabels = false;
  if (!PRESENTATION_CONTROL_SUPPORT[nextType].dateFormat) nextWidget.dateDisplayFormat = getWidgetDisplayDefaults(nextType).dateDisplayFormat;
  if (!PRESENTATION_CONTROL_SUPPORT[nextType].numberFormat) nextWidget.numberFormat = getWidgetDisplayDefaults(nextType).numberFormat;

  if (nextType === 'treemap') {
    if (isNumericColumn(dataset.columns, nextWidget.yAxis) && nextWidget.aggregation === 'NONE') {
      nextWidget.aggregation = 'SUM';
    }
    nextWidget.orderBy = undefined;
  }

  if (shouldRefreshWidgetTitle(widget)) {
    nextWidget.title = buildDefaultWidgetTitle(nextWidget);
  }

  return nextWidget;
}

export function getWidgetConfigIssue(widget: Widget, columnsMeta: DatasetColumnMeta[]) {
  const columnExists = (columnName?: string) => isExistingColumn(columnsMeta, columnName);
  const isNumericAggregation = widget.aggregation === 'SUM' || widget.aggregation === 'AVG';
  const yAxisType = getColumnType(columnsMeta, widget.yAxis);

  if (widget.type === 'table') {
    const validColumns = (widget.columns || []).filter((columnName) => columnExists(columnName));
    if (validColumns.length === 0) return 'Selecciona al menos una columna para mostrar la tabla.';
    return null;
  }

  if (widget.type === 'card') {
    if (!columnExists(widget.yAxis)) return 'Selecciona un campo de valor válido para la tarjeta.';
    if (isNumericAggregation && (!yAxisType || !NUMERIC_COLUMN_TYPES.has(yAxisType))) {
      return `“${widget.yAxis}” debe ser una columna numérica para usar ${widget.aggregation}.`;
    }
    return null;
  }

  if (widget.type === 'map') {
    if (!columnExists(widget.latitudeField) || !columnExists(widget.longitudeField)) {
      return 'Selecciona campos válidos de latitud y longitud para mostrar el mapa.';
    }
    if (!columnExists(widget.yAxis)) return 'Selecciona un campo de valor válido para el mapa.';
    if (widget.aggregation !== 'NONE' && isNumericAggregation && (!yAxisType || !NUMERIC_COLUMN_TYPES.has(yAxisType))) {
      return `“${widget.yAxis}” debe ser una columna numérica para usar ${widget.aggregation}.`;
    }
    return null;
  }

  if (!columnExists(widget.xAxis) || !columnExists(widget.yAxis)) {
    return 'Selecciona campos válidos para configurar esta visualización.';
  }

  if (widget.aggregation !== 'NONE' && isNumericAggregation && (!yAxisType || !NUMERIC_COLUMN_TYPES.has(yAxisType))) {
    return `“${widget.yAxis}” debe ser una columna numérica para usar ${widget.aggregation}.`;
  }

  return null;
}
