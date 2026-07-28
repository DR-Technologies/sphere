import * as XLSX from 'xlsx';
import Papa from 'papaparse';
import { supabase } from '@/lib/supabase';
import type {
  AnalyticsProvider,
  DatasetImportOptions,
  DateInputFormat,
  DatasetColumn,
  DatasetColumnStat,
  DatasetProfileResult,
  DatasetRow,
  NormalizedDatasetManifest,
  ProfileFromUrlOptions
} from '../types';
import { annotateDatasetColumns } from '../semantics';

function detectFileExtension(fileName: string) {
  const match = fileName.toLowerCase().match(/\.(csv|json|xlsx|xls)(\s|\(|$)/);
  return match?.[1] || fileName.toLowerCase().split('.').pop() || '';
}

async function getExcelSheetNames(file: File): Promise<string[]> {
  const data = await file.arrayBuffer();
  const workbook = XLSX.read(data, { type: 'array', bookSheets: true });
  return workbook.SheetNames;
}

async function parseCsv(file: File, options?: DatasetImportOptions): Promise<Record<string, unknown>[]> {
  const text = await file.text();
  return new Promise((resolve, reject) => {
    Papa.parse<Record<string, unknown>>(text, {
      header: true,
      delimiter: options?.csvDelimiter || '',
      quoteChar: options?.csvQuoteChar || '"',
      skipEmptyLines: 'greedy',
      complete: (results) => resolve(results.data),
      error: (error: Error) => reject(error)
    });
  });
}

function rowsFromJsonOrient(parsed: unknown, orient: DatasetImportOptions['jsonOrient'] = 'records'): Record<string, unknown>[] {
  if (orient === 'records') {
    if (Array.isArray(parsed)) return parsed as Record<string, unknown>[];
    if (parsed && typeof parsed === 'object') return [parsed as Record<string, unknown>];
  }

  if (orient === 'split' && parsed && typeof parsed === 'object') {
    const source = parsed as { columns?: unknown[]; data?: unknown[][] };
    if (Array.isArray(source.columns) && Array.isArray(source.data)) {
      return source.data.map((row) => Object.fromEntries(source.columns!.map((column, index) => [String(column), row?.[index]])));
    }
  }

  if (orient === 'index' && parsed && typeof parsed === 'object' && !Array.isArray(parsed)) {
    return Object.values(parsed as Record<string, unknown>).filter((row) => row && typeof row === 'object') as Record<string, unknown>[];
  }

  if (orient === 'columns' && parsed && typeof parsed === 'object' && !Array.isArray(parsed)) {
    const columns = parsed as Record<string, Record<string, unknown> | unknown[]>;
    const rowKeys = Array.from(new Set(Object.values(columns).flatMap((columnValues) => Array.isArray(columnValues) ? columnValues.map((_, index) => String(index)) : Object.keys(columnValues || {}))));
    return rowKeys.map((rowKey, rowIndex) => Object.fromEntries(Object.entries(columns).map(([columnName, columnValues]) => [
      columnName,
      Array.isArray(columnValues) ? columnValues[rowIndex] : columnValues?.[rowKey]
    ])));
  }

  if (orient === 'values' && Array.isArray(parsed)) {
    return (parsed as unknown[][]).map((row) => Object.fromEntries((row || []).map((value, index) => [`column_${index + 1}`, value])));
  }

  if (orient === 'table' && parsed && typeof parsed === 'object') {
    const source = parsed as { data?: unknown[] };
    if (Array.isArray(source.data)) return source.data as Record<string, unknown>[];
  }

  throw new Error(`JSON file does not match orient "${orient}".`);
}

async function parseJson(file: File, options?: DatasetImportOptions): Promise<Record<string, unknown>[]> {
  const text = await file.text();
  const parsed = JSON.parse(text);
  return rowsFromJsonOrient(parsed, options?.jsonOrient || 'records');
}

async function parseExcel(file: File, sheetName?: string): Promise<Record<string, unknown>[]> {
  const data = await file.arrayBuffer();
  const workbook = XLSX.read(data, { type: 'array', cellDates: true });
  const targetSheetName = sheetName || workbook.SheetNames[0];
  const worksheet = workbook.Sheets[targetSheetName];
  if (!worksheet) throw new Error(`Sheet "${targetSheetName}" not found in workbook.`);
  return XLSX.utils.sheet_to_json<Record<string, unknown>>(worksheet, { raw: true, defval: null });
}

function parseBoolean(value: unknown) {
  if (typeof value === 'boolean') return value;
  if (typeof value !== 'string') return null;
  const normalized = value.trim().toLowerCase();
  if (['true', 'yes', 'y', '1'].includes(normalized)) return true;
  if (['false', 'no', 'n', '0'].includes(normalized)) return false;
  return null;
}

function parseNumeric(value: unknown) {
  if (typeof value === 'number' && Number.isFinite(value)) return value;
  if (typeof value !== 'string') return null;
  const cleaned = value
    .trim()
    .replace(/\s+/g, '')
    .replace(/[€$£¥₹₽₩₱₴₦₡₲₵₮₭₪₫₸₺]/g, '')
    .replace(/%$/, '')
    .replace(/,/g, '');
  if (!cleaned || !/^[-+]?\d*\.?\d+$/.test(cleaned)) return null;
  const parsed = Number(cleaned);
  return Number.isFinite(parsed) ? parsed : null;
}

function buildDate(year: number, month: number, day: number) {
  const parsed = new Date(Date.UTC(year, month - 1, day));
  if (parsed.getUTCFullYear() !== year || parsed.getUTCMonth() !== month - 1 || parsed.getUTCDate() !== day) return null;
  return parsed;
}

function normalizeYear(year: number) {
  if (year >= 100) return year;
  return year <= 68 ? 2000 + year : 1900 + year;
}

function parseDateByFormat(value: string, format: DateInputFormat) {
  const trimmed = value.trim();
  const match = trimmed.match(/^(\d{1,4})[\/-](\d{1,2})[\/-](\d{1,4})(?:[ T].*)?$/);
  if (!match) return null;

  const [, first, second, third] = match;
  const a = Number(first);
  const b = Number(second);
  const c = Number(third);

  switch (format) {
    case 'DD/MM/YYYY':
    case 'DD-MM-YYYY':
      return buildDate(normalizeYear(c), b, a);
    case 'MM/DD/YYYY':
    case 'MM-DD-YYYY':
      return buildDate(normalizeYear(c), a, b);
    case 'YYYY-MM-DD':
    case 'YYYY/MM/DD':
      return buildDate(normalizeYear(a), b, c);
    default:
      return null;
  }
}

function parseDate(value: unknown, dateFormat: DateInputFormat = 'AUTO') {
  if (value instanceof Date && !Number.isNaN(value.getTime())) return value;
  if (typeof value !== 'string') return null;
  const trimmed = value.trim();
  if (!trimmed) return null;

  if (dateFormat !== 'AUTO') {
    return parseDateByFormat(trimmed, dateFormat);
  }

  const parsed = new Date(trimmed);
  return Number.isNaN(parsed.getTime()) ? null : parsed;
}

function inferColumnType(values: unknown[], dateFormat?: DateInputFormat): string {
  const meaningfulValues = values.filter((value) => value !== null && value !== undefined && value !== '');
  if (meaningfulValues.length === 0) return 'VARCHAR';

  const booleans = meaningfulValues.every((value) => parseBoolean(value) !== null);
  if (booleans) return 'BOOLEAN';

  const numerics = meaningfulValues.map(parseNumeric);
  const allNumeric = numerics.every((value) => value !== null);
  if (allNumeric) {
    return numerics.every((value) => Number.isInteger(value as number)) ? 'INTEGER' : 'DOUBLE';
  }

  const dates = meaningfulValues.map((value) => parseDate(value, dateFormat));
  const allDates = dates.every((value) => value !== null);
  if (allDates) {
    const hasTime = meaningfulValues.some((value) => typeof value === 'string' && /[tT ]\d{2}:\d{2}/.test(value));
    return hasTime ? 'TIMESTAMP' : 'DATE';
  }

  return 'VARCHAR';
}

function normalizeValue(value: unknown, type: string, dateFormat?: DateInputFormat): DatasetRow[string] {
  if (value === null || value === undefined || value === '') return null;

  switch (type) {
    case 'BOOLEAN':
      return parseBoolean(value);
    case 'INTEGER': {
      const numeric = parseNumeric(value);
      return numeric === null ? null : Math.trunc(numeric);
    }
    case 'DOUBLE':
      return parseNumeric(value);
    case 'DATE': {
      const parsed = parseDate(value, dateFormat);
      return parsed ? parsed.toISOString().split('T')[0] : String(value);
    }
    case 'TIMESTAMP': {
      const parsed = parseDate(value, dateFormat);
      return parsed ? parsed.toISOString() : String(value);
    }
    default:
      return String(value);
  }
}

function compareValues(values: unknown[]) {
  const filtered = values.filter((value) => value !== null && value !== undefined);
  if (!filtered.length) return { min: null, max: null };
  if (filtered.every((value) => typeof value === 'number')) {
    return {
      min: Math.min(...(filtered as number[])),
      max: Math.max(...(filtered as number[]))
    };
  }
  const sorted = filtered.map((value) => String(value)).sort();
  return { min: sorted[0], max: sorted[sorted.length - 1] };
}

function buildManifest(sourceFormat: string, options: DatasetImportOptions | undefined, columns: DatasetColumn[], stats: DatasetColumnStat[]): NormalizedDatasetManifest {
  return {
    version: 1,
    generated_at: new Date().toISOString(),
    source_format: sourceFormat,
    sheet_name: options?.sheetName,
    normalized_format: 'csv',
    columns,
    stats,
    transforms: [
      'typed_ingestion_in_javascript',
      'currency_symbols_removed_before_numeric_cast',
      'date_values_normalized_to_iso_strings',
      'booleans_normalized',
      'normalized_rows_persisted_for_postgres_analytics'
    ],
    import_options: options
  };
}

async function parseFileByExtension(file: File, options?: DatasetImportOptions) {
  const extension = detectFileExtension(file.name);
  if (extension === 'csv') return { rows: await parseCsv(file, options), extension };
  if (extension === 'json') return { rows: await parseJson(file, options), extension };
  if (extension === 'xlsx' || extension === 'xls') return { rows: await parseExcel(file, options?.sheetName), extension };
  throw new Error(`Unsupported file format: ${extension || 'unknown'}`);
}

async function profileFile(file: File, options?: DatasetImportOptions): Promise<DatasetProfileResult> {
  const { rows, extension } = await parseFileByExtension(file, options);
  const columnNames = Array.from(new Set(rows.flatMap((row) => Object.keys(row || {}))));
  const columns: DatasetColumn[] = columnNames.map((name) => ({
    name,
    type: inferColumnType(rows.map((row) => row?.[name]), options?.dateFormat)
  }));

  const normalizedRows: DatasetRow[] = rows.map((row) => {
    const normalized: DatasetRow = {};
    columns.forEach((column) => {
      normalized[column.name] = normalizeValue(row?.[column.name], column.type, options?.dateFormat);
    });
    return normalized;
  });

  const stats: DatasetColumnStat[] = columns.map((column) => {
    const values = normalizedRows.map((row) => row[column.name]);
    const { min, max } = compareValues(values);
    const nulls = values.filter((value) => value === null || value === undefined || value === '').length;
    const meaningful = values.filter((value) => value !== null && value !== undefined && value !== '');
    return {
      column: column.name,
      type: column.type,
      min,
      max,
      total: values.length,
      nulls,
      unique: new Set(meaningful.map((value) => JSON.stringify(value))).size
    };
  });

  const semanticColumns = annotateDatasetColumns(columns, stats);

  return {
    columns: semanticColumns,
    stats,
    preview: normalizedRows.slice(0, 100),
    artifacts: {
      normalizedCsv: Papa.unparse(normalizedRows, { header: true, skipEmptyLines: 'greedy' }),
      normalizedRows,
      manifest: buildManifest(extension, options, semanticColumns, stats)
    }
  };
}

async function profileFromUrl(url: string, name: string, sheetName?: string, options?: ProfileFromUrlOptions): Promise<DatasetProfileResult> {
  const sourceUrl = options?.normalizedFileUrl || url;
  const response = await fetch(sourceUrl);
  const blob = await response.blob();
  const file = new File([blob], options?.normalizedFileUrl ? 'normalized.csv' : name, { type: blob.type });
  return profileFile(file, { sheetName });
}

async function runQuery(query: string, options?: { datasetId?: string }): Promise<Record<string, any>[]> {
  if (!options?.datasetId) {
    throw new Error('datasetId is required for Supabase analytics queries.');
  }

  const { data, error } = await supabase.rpc('run_dataset_query', {
    p_dataset_id: options.datasetId,
    p_query: query
  });

  if (error) throw error;

  return (data || []).map((row: { row_data: Record<string, any> }) => row.row_data || row);
}

export const supabaseAnalyticsProvider: AnalyticsProvider = {
  profileFile,
  profileFromUrl,
  runQuery,
  getExcelSheetNames
};
