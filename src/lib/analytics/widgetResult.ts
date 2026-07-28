import type { DatasetColumnMeta, Widget } from '@/lib/widgets/types';
import type { WidgetQueryModel } from './queryModel';
import { executeWidgetQuery } from './queryService';

const NUMERIC_COLUMN_TYPES = new Set(['INTEGER', 'BIGINT', 'DOUBLE', 'DECIMAL', 'NUMERIC', 'REAL', 'SMALLINT']);

export interface WidgetVisualizationResult {
  rawRows: Record<string, unknown>[];
  rows: Record<string, unknown>[];
  rowCount: number;
  renderableRowCount: number;
  issue: string | null;
}

function getColumnType(columnsMeta: DatasetColumnMeta[], columnName?: string) {
  if (!columnName) return '';
  return columnsMeta.find((column) => column.name === columnName)?.type?.toUpperCase() || '';
}

function isNumericColumn(columnsMeta: DatasetColumnMeta[], columnName?: string) {
  return NUMERIC_COLUMN_TYPES.has(getColumnType(columnsMeta, columnName));
}

function normalizeMetricValue(value: unknown) {
  if (typeof value === 'number' && Number.isFinite(value)) return value;
  if (typeof value === 'string') {
    const cleaned = value.trim().replace(/,/g, '');
    if (!cleaned) return null;
    const numeric = Number(cleaned);
    return Number.isFinite(numeric) ? numeric : null;
  }
  return null;
}

function normalizeGenericValue(value: unknown) {
  if (value instanceof Date && !Number.isNaN(value.getTime())) {
    return value.toISOString();
  }
  return value;
}

function getWidgetEmptyStateMessage(widget: Widget) {
  switch (widget.type) {
    case 'map':
      return 'No hay coordenadas válidas para mostrar este mapa.';
    case 'card':
      return 'No hay datos válidos para calcular este indicador.';
    case 'table':
      return 'No hay filas para mostrar en esta tabla.';
    default:
      return 'No hay datos válidos para renderizar esta visualización.';
  }
}

function normalizeRowsForWidget(widget: Widget, rows: Record<string, unknown>[], columnsMeta: DatasetColumnMeta[]) {
  if (widget.type === 'table') {
    return rows.map((row) => Object.fromEntries(Object.entries(row).map(([key, value]) => [key, normalizeGenericValue(value)])));
  }

  if (widget.type === 'card') {
    return rows
      .map((row) => ({
        ...row,
        [widget.yAxis]: normalizeMetricValue(row[widget.yAxis])
      }))
      .filter((row) => row[widget.yAxis] !== null);
  }

  if (widget.type === 'map') {
    return rows
      .map((row) => ({
        ...row,
        [widget.xAxis]: normalizeGenericValue(row[widget.xAxis]),
        [widget.yAxis]: normalizeMetricValue(row[widget.yAxis]),
        [widget.latitudeField || '']: normalizeMetricValue(row[widget.latitudeField || '']),
        [widget.longitudeField || '']: normalizeMetricValue(row[widget.longitudeField || ''])
      }))
      .filter((row) => {
        const lat = row[widget.latitudeField || ''];
        const lon = row[widget.longitudeField || ''];
        const value = row[widget.yAxis];
        return typeof lat === 'number'
          && Number.isFinite(lat)
          && typeof lon === 'number'
          && Number.isFinite(lon)
          && typeof value === 'number'
          && Number.isFinite(value);
      });
  }

  const shouldNormalizeMetric = widget.aggregation !== 'NONE' || isNumericColumn(columnsMeta, widget.yAxis);

  return rows
    .map((row) => ({
      ...row,
      [widget.xAxis]: normalizeGenericValue(row[widget.xAxis]),
      [widget.yAxis]: shouldNormalizeMetric ? normalizeMetricValue(row[widget.yAxis]) : normalizeGenericValue(row[widget.yAxis])
    }))
    .filter((row) => {
      const dimensionValue = row[widget.xAxis];
      const metricValue = row[widget.yAxis];
      const hasDimension = dimensionValue !== null && dimensionValue !== undefined && String(dimensionValue).trim() !== '';
      const hasMetric = typeof metricValue === 'number' ? Number.isFinite(metricValue) : metricValue !== null && metricValue !== undefined && String(metricValue).trim() !== '';
      return hasDimension && hasMetric;
    });
}

export function materializeWidgetVisualizationResult(widget: Widget, rows: Record<string, unknown>[], columnsMeta: DatasetColumnMeta[]): WidgetVisualizationResult {
  const normalizedRows = normalizeRowsForWidget(widget, rows, columnsMeta);

  return {
    rawRows: rows,
    rows: normalizedRows,
    rowCount: rows.length,
    renderableRowCount: normalizedRows.length,
    issue: normalizedRows.length === 0 ? getWidgetEmptyStateMessage(widget) : null
  };
}

export async function resolveWidgetVisualizationResult(model: WidgetQueryModel, columnsMeta: DatasetColumnMeta[], datasetId: string): Promise<WidgetVisualizationResult> {
  const rawRows = await executeWidgetQuery(model, columnsMeta, datasetId);
  return materializeWidgetVisualizationResult(model.widget, rawRows, columnsMeta);
}
