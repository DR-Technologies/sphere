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

function normalizeColumnName(name: string) {
  const raw = name
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '');
  const words = raw
    .replace(/([a-z0-9])([A-Z])/g, '$1 $2')
    .replace(/[^a-zA-Z0-9]+/g, ' ')
    .trim()
    .toLowerCase();
  return { raw: raw.toLowerCase(), words, compact: words.replace(/\s+/g, '') };
}

function getUniqueRatio(stat?: DatasetColumnStat) {
  if (!stat || !stat.total) return 0;
  return stat.unique / stat.total;
}

function hasTemporalName(name: ReturnType<typeof normalizeColumnName>) {
  return scoreName(name.words, [
    /\bdate\b/,
    /\bfecha\b/,
    /\bdatetime\b/,
    /\btimestamp\b/,
    /\bmonth\b/,
    /\bmes\b/,
    /\byear\b/,
    /\banio\b/,
    /\bperiod\b/,
    /\bperiodo\b/,
    /\bquarter\b/,
    /\btrimestre\b/
  ]);
}

export function inferSemanticRole(
  column: Pick<DatasetColumn, 'name' | 'type'>,
  stat?: DatasetColumnStat
): { role: DatasetSemanticRole; confidence: number; reason: string } {
  const name = normalizeColumnName(column.name);
  const type = column.type.toUpperCase();
  const uniqueRatio = getUniqueRatio(stat);

  if (type === 'BOOLEAN') {
    return { role: 'boolean', confidence: 0.99, reason: 'boolean_type' };
  }

  if (DATE_TYPES.has(type)) {
    return { role: 'datetime', confidence: 0.99, reason: 'date_type' };
  }

  if (hasTemporalName(name)) {
    return { role: 'datetime', confidence: 0.86, reason: 'temporal_name_pattern' };
  }

  const hasStrongIdentifierName = scoreName(name.words, [
    /\bid\b/,
    /\buuid\b/,
    /\bcode\b/,
    /\bcodigo\b/,
    /\bkey\b/,
    /\bidentificador\b/,
    /\bsku\b/,
    /\bnit\b/,
    /\binvoice\b/,
    /\bfactura\b/,
    /\baccount\s+number\b/,
    /\bnumero\s+(de\s+)?(factura|contrato|cuenta|pedido|orden)\b/
  ]) || /^(id|uuid|code|codigo|key|identificador|sku|nit|invoice|factura)/.test(name.compact);
  const hasWeakIdentifierName = scoreName(name.words, [/\bnumber\b/, /\bnumero\b/, /\bnro\b/, /\bno\b/]);
  if (hasStrongIdentifierName || (hasWeakIdentifierName && uniqueRatio > 0.7)) {
    return {
      role: 'identifier',
      confidence: 0.9,
      reason: hasStrongIdentifierName ? 'identifier_name_pattern' : 'identifier_name_and_uniqueness'
    };
  }

  const isGeo = scoreName(name.words, [
    /\bcountry\b/,
    /\bpais\b/,
    /\bregion\b/,
    /\bcity\b/,
    /\bciudad\b/,
    /\bstate\b/,
    /\bdepartamento\b/,
    /\bprovince\b/,
    /\bprovincia\b/,
    /\bmunicipio\b/,
    /\bpostal\b/,
    /\bzip\b/,
    /\blat\b/,
    /\blatitud\b/,
    /\blatitude\b/,
    /\blon\b/,
    /\blng\b/,
    /\blongitud\b/,
    /\blongitude\b/
  ]);
  if (isGeo) {
    return { role: 'geography', confidence: 0.92, reason: 'geography_name_pattern' };
  }

  if (NUMERIC_TYPES.has(type) && (name.raw.includes('%') || scoreName(name.words, [/\bpercent(age)?\b/, /\bporcentaje\b/, /\bpct\b/, /\brate\b/, /\btasa\b/, /\bratio\b/, /\bmargin\b/, /\bmargen\b/]))) {
    return { role: 'percentage', confidence: 0.88, reason: 'percentage_name_pattern' };
  }

  if (NUMERIC_TYPES.has(type) && (
    scoreName(name.words, [/\bamount\b/, /\brevenue\b/, /\bsales\b/, /\bventa(s)?\b/, /\bcost\b/, /\bcosto(s)?\b/, /\bprice\b/, /\bprecio\b/, /\bbudget\b/, /\bpresupuesto\b/, /\bprofit\b/, /\butilidad\b/, /\bexpense\b/, /\bgasto(s)?\b/, /\bincome\b/, /\bingreso(s)?\b/, /\bmonto\b/, /\bimporte\b/, /\bfacturad[oa]?\b/])
    || /^(monto|importe|ventas?|ingresos?|costos?|precios?|facturad)/.test(name.compact)
  )) {
    return { role: 'currency', confidence: 0.84, reason: 'currency_name_pattern' };
  }

  if (NUMERIC_TYPES.has(type)) {
    const hasMeasureName = scoreName(name.words, [
      /\bquantity\b/,
      /\bcantidad\b/,
      /\bunits?\b/,
      /\bunidades?\b/,
      /\bhours?\b/,
      /\bhoras?\b/,
      /\bduration\b/,
      /\bduracion\b/,
      /\bscore\b/,
      /\bpuntaje\b/,
      /\bweight\b/,
      /\bpeso\b/,
      /\bvolume\b/,
      /\bvolumen\b/
    ]);
    return {
      role: 'measure',
      confidence: hasMeasureName ? 0.88 : 0.82,
      reason: hasMeasureName ? 'measure_name_pattern' : 'numeric_type'
    };
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
