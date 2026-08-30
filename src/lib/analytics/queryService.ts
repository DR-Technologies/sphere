import { getAnalyticsProvider } from './provider';
import type { WidgetQueryModel } from './queryModel';
import type { DatasetColumnMeta } from '@/lib/widgets/types';

const NUMERIC_COLUMN_TYPES = new Set(['INTEGER', 'BIGINT', 'DOUBLE', 'DECIMAL', 'NUMERIC', 'REAL', 'SMALLINT']);

function getColumnType(columnsMeta: DatasetColumnMeta[], columnName?: string) {
  if (!columnName) return null;
  return columnsMeta.find((column) => column.name === columnName)?.type?.toUpperCase() || null;
}

function buildAggregationExpression(columnsMeta: DatasetColumnMeta[], columnName: string, aggregation: string) {
  if (aggregation === 'COUNT') return `COUNT("${columnName}")`;
  if (aggregation === 'DISTINCT') return `COUNT(DISTINCT "${columnName}")`;

  if (aggregation === 'SUM' || aggregation === 'AVG') {
    const columnType = getColumnType(columnsMeta, columnName);
    if (!columnType || !NUMERIC_COLUMN_TYPES.has(columnType)) {
      throw new Error(`Aggregation ${aggregation} requires a numeric column.`);
    }
    return `${aggregation}("${columnName}"::double precision)`;
  }

  return `${aggregation}("${columnName}")`;
}

function getEffectiveAggregation(model: WidgetQueryModel, columnsMeta: DatasetColumnMeta[]) {
  if (model.widget.type === 'treemap' && model.widget.aggregation === 'NONE') {
    const columnType = getColumnType(columnsMeta, model.widget.yAxis);
    if (columnType && NUMERIC_COLUMN_TYPES.has(columnType)) {
      return 'SUM';
    }
  }

  return model.widget.aggregation;
}

function escapeFilterValue(value: string | null) {
  return String(value ?? '').replace(/'/g, "''");
}

function buildWhereClause(model: WidgetQueryModel) {
  const filtersToApply = model.filters.filter((filter) => filter.column && filter.value !== null && filter.value !== '');
  if (!filtersToApply.length) return '';
  return `WHERE ${filtersToApply.map((filter) => `"${filter.column}" = '${escapeFilterValue(filter.value)}'`).join(' AND ')}`;
}

export function buildWidgetSql(model: WidgetQueryModel, columnsMeta: DatasetColumnMeta[]) {
  const { widget } = model;
  const whereClause = buildWhereClause(model);
  const effectiveAggregation = getEffectiveAggregation(model, columnsMeta);

  if (model.kind === 'card') {
    const aggExpr = buildAggregationExpression(columnsMeta, widget.yAxis, effectiveAggregation);
    return `SELECT ${aggExpr} as "${widget.yAxis}" FROM dataset ${whereClause}`;
  }

  if (model.kind === 'map' && widget.latitudeField && widget.longitudeField) {
    const metricExpr = effectiveAggregation === 'NONE'
      ? `"${widget.yAxis}"::double precision`
      : buildAggregationExpression(columnsMeta, widget.yAxis, effectiveAggregation);
    const dimensionSelect = widget.xAxis ? `"${widget.xAxis}",` : '';
    const groupByClause = effectiveAggregation === 'NONE'
      ? ''
      : `GROUP BY ${widget.xAxis ? `"${widget.xAxis}",` : ''} "${widget.latitudeField}", "${widget.longitudeField}"`;

    return `
      SELECT
        ${dimensionSelect}
        "${widget.latitudeField}",
        "${widget.longitudeField}",
        ${metricExpr} as "${widget.yAxis}"
      FROM dataset
      ${whereClause}
      ${groupByClause}
      LIMIT ${widget.topN || 500}
    `;
  }

  if (model.kind === 'table' && widget.columns && widget.columns.length > 0) {
    const columnAggregations = widget.columnAggregations || {};
    const hasMetrics = Object.entries(columnAggregations).some(([columnName, aggregation]) => widget.columns?.includes(columnName) && aggregation !== 'NONE');

    if (hasMetrics) {
      const abbreviations: Record<string, string> = { SUM: 'SUM', AVG: 'AVG', COUNT: 'CNT', DISTINCT: 'DST' };
      const selects = widget.columns.map((columnName) => {
        const aggregation = columnAggregations[columnName] || 'NONE';
        if (aggregation === 'NONE') return `"${columnName}"`;
        const abbreviation = abbreviations[aggregation] || aggregation;
        return `${buildAggregationExpression(columnsMeta, columnName, aggregation)} as "${columnName} (${abbreviation})"`;
      }).join(', ');

      const dimensions = widget.columns.filter((columnName) => (columnAggregations[columnName] || 'NONE') === 'NONE');
      const groupByClause = dimensions.length > 0 ? `GROUP BY ${dimensions.map((columnName) => `"${columnName}"`).join(', ')}` : '';
      return `SELECT ${selects} FROM dataset ${whereClause} ${groupByClause} LIMIT 50`;
    }

    const cols = widget.columns.map((columnName) => `"${columnName}"`).join(', ');
    return `SELECT ${cols} FROM dataset ${whereClause} LIMIT 100`;
  }

  if (effectiveAggregation === 'NONE') {
    const orderClause = widget.orderBy ? `ORDER BY "${widget.xAxis}" ${widget.orderBy}` : '';
    const limitClause = widget.topN ? `LIMIT ${widget.topN}` : 'LIMIT 100';
    return `SELECT "${widget.xAxis}", "${widget.yAxis}" FROM dataset ${whereClause} ${orderClause} ${limitClause}`;
  }

  const aggExpr = buildAggregationExpression(columnsMeta, widget.yAxis, effectiveAggregation);
  const orderCol = widget.orderBy === 'ASC' || widget.orderBy === 'DESC' ? `"${widget.yAxis}"` : `"${widget.xAxis}"`;
  const orderDir = widget.orderBy || 'DESC';
  const limitClause = widget.topN ? `LIMIT ${widget.topN}` : 'LIMIT 50';

  return `
    SELECT
      "${widget.xAxis}",
      ${aggExpr} as "${widget.yAxis}"
    FROM dataset
    ${whereClause}
    GROUP BY "${widget.xAxis}"
    ORDER BY ${orderCol} ${orderDir}
    ${limitClause}
  `;
}

export async function executeWidgetQuery(model: WidgetQueryModel, columnsMeta: DatasetColumnMeta[], datasetId: string) {
  const sql = buildWidgetSql(model, columnsMeta);
  return getAnalyticsProvider().runQuery(sql, { datasetId });
}
