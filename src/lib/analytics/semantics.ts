import type { DatasetColumn, DatasetColumnStat } from './types';

export type DatasetSemanticRole =
  | 'dimension'
  | 'measure'
  | 'datetime'
  | 'geography'
  | 'identifier'
  | 'currency'
  | 'percentage'
  | 'boolean';

export interface DatasetSemanticSummary {
  dimensions: string[];
  measures: string[];
  datetimes: string[];
  geographies: string[];
  identifiers: string[];
  currencies: string[];
  percentages: string[];
  booleans: string[];
}

const NUMERIC_TYPES = new Set(['INTEGER', 'BIGINT', 'DOUBLE', 'DECIMAL', 'NUMERIC', 'REAL', 'SMALLINT']);
const DATE_TYPES = new Set(['DATE', 'TIMESTAMP']);

function scoreName(name: string, patterns: RegExp[]) {
  return patterns.some((pattern) => pattern.test(name));
}

function getUniqueRatio(stat?: DatasetColumnStat) {
  if (!stat || !stat.total) return 0;
  return stat.unique / stat.total;
}

export function inferSemanticRole(
  column: Pick<DatasetColumn, 'name' | 'type'>,
  stat?: DatasetColumnStat
): { role: DatasetSemanticRole; confidence: number; reason: string } {
  const name = column.name.toLowerCase();
  const type = column.type.toUpperCase();
  const uniqueRatio = getUniqueRatio(stat);

  if (type === 'BOOLEAN') {
    return { role: 'boolean', confidence: 0.99, reason: 'boolean_type' };
  }

  if (DATE_TYPES.has(type)) {
    return { role: 'datetime', confidence: 0.99, reason: 'date_type' };
  }

  const isGeo = scoreName(name, [
    /\bcountry\b/,
    /\bregion\b/,
    /\bcity\b/,
    /\bstate\b/,
    /\bprovince\b/,
    /\bpostal\b/,
    /\bzip\b/,
    /\blat\b/,
    /\blatitude\b/,
    /\blon\b/,
    /\blng\b/,
    /\blongitude\b/
  ]);
  if (isGeo) {
    return { role: 'geography', confidence: 0.92, reason: 'geography_name_pattern' };
  }

  if (NUMERIC_TYPES.has(type) && scoreName(name, [/%/, /\bpercent(age)?\b/, /\bpct\b/, /\brate\b/, /\bratio\b/, /\bmargin\b/])) {
    return { role: 'percentage', confidence: 0.88, reason: 'percentage_name_pattern' };
  }

  if (NUMERIC_TYPES.has(type) && scoreName(name, [/\bamount\b/, /\brevenue\b/, /\bsales\b/, /\bcost\b/, /\bprice\b/, /\bbudget\b/, /\bprofit\b/, /\bexpense\b/, /\bincome\b/])) {
    return { role: 'currency', confidence: 0.84, reason: 'currency_name_pattern' };
  }

  if (scoreName(name, [/\bid\b/, /\buuid\b/, /\bcode\b/, /\bkey\b/, /\bnumber\b/, /\bno\b/]) && uniqueRatio > 0.7) {
    return { role: 'identifier', confidence: 0.86, reason: 'identifier_name_and_uniqueness' };
  }

  if (NUMERIC_TYPES.has(type)) {
    return { role: 'measure', confidence: 0.82, reason: 'numeric_type' };
  }

  return {
    role: uniqueRatio > 0.8 ? 'identifier' : 'dimension',
    confidence: uniqueRatio > 0.8 ? 0.72 : 0.78,
    reason: uniqueRatio > 0.8 ? 'high_uniqueness_text' : 'default_dimension'
  };
}

export function annotateDatasetColumns(
  columns: DatasetColumn[],
  stats: DatasetColumnStat[]
): DatasetColumn[] {
  return columns.map((column) => {
    const stat = stats.find((item) => item.column === column.name);
    const semantic = inferSemanticRole(column, stat);
    return {
      ...column,
      semanticRole: semantic.role,
      semanticConfidence: semantic.confidence,
      semanticReason: semantic.reason
    };
  });
}

export function summarizeSemantics(columns: DatasetColumn[]): DatasetSemanticSummary {
  return columns.reduce<DatasetSemanticSummary>((summary, column) => {
    const role = column.semanticRole || 'dimension';
    if (role === 'dimension') summary.dimensions.push(column.name);
    if (role === 'measure') summary.measures.push(column.name);
    if (role === 'datetime') summary.datetimes.push(column.name);
    if (role === 'geography') summary.geographies.push(column.name);
    if (role === 'identifier') summary.identifiers.push(column.name);
    if (role === 'currency') summary.currencies.push(column.name);
    if (role === 'percentage') summary.percentages.push(column.name);
    if (role === 'boolean') summary.booleans.push(column.name);
    return summary;
  }, {
    dimensions: [],
    measures: [],
    datetimes: [],
    geographies: [],
    identifiers: [],
    currencies: [],
    percentages: [],
    booleans: []
  });
}
