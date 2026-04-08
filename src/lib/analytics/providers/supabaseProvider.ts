import * as XLSX from 'xlsx';
import Papa from 'papaparse';
import { supabase } from '@/lib/supabase';
import type {
  AnalyticsProvider,
  DatasetColumn,
  DatasetColumnStat,
  DatasetProfileResult,
  DatasetRow,
  NormalizedDatasetManifest,
  ProfileFromUrlOptions
} from '../types';

function detectFileExtension(fileName: string) {
  const match = fileName.toLowerCase().match(/\.(csv|json|xlsx|xls)(\s|\(|$)/);
  return match?.[1] || fileName.toLowerCase().split('.').pop() || '';
}

async function getExcelSheetNames(file: File): Promise<string[]> {
  const data = await file.arrayBuffer();
  const workbook = XLSX.read(data, { type: 'array', bookSheets: true });
  return workbook.SheetNames;
}

async function parseCsv(file: File): Promise<Record<string, unknown>[]> {
  const text = await file.text();
  return new Promise((resolve, reject) => {
    Papa.parse<Record<string, unknown>>(text, {
      header: true,
      skipEmptyLines: 'greedy',
      complete: (results) => resolve(results.data),
      error: (error) => reject(error)
    });
  });
}

async function parseJson(file: File): Promise<Record<string, unknown>[]> {
  const text = await file.text();
  const parsed = JSON.parse(text);
  if (Array.isArray(parsed)) return parsed as Record<string, unknown>[];
  if (parsed && typeof parsed === 'object') return [parsed as Record<string, unknown>];
  throw new Error('JSON file must contain an object or array of objects.');
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

function parseDate(value: unknown) {
  if (value instanceof Date && !Number.isNaN(value.getTime())) return value;
  if (typeof value !== 'string') return null;
  const trimmed = value.trim();
  if (!trimmed) return null;
  const parsed = new Date(trimmed);
  return Number.isNaN(parsed.getTime()) ? null : parsed;
}

function inferColumnType(values: unknown[]): string {
  const meaningfulValues = values.filter((value) => value !== null && value !== undefined && value !== '');
  if (meaningfulValues.length === 0) return 'VARCHAR';

  const booleans = meaningfulValues.every((value) => parseBoolean(value) !== null);
  if (booleans) return 'BOOLEAN';

  const numerics = meaningfulValues.map(parseNumeric);
  const allNumeric = numerics.every((value) => value !== null);
  if (allNumeric) {
    return numerics.every((value) => Number.isInteger(value as number)) ? 'INTEGER' : 'DOUBLE';
  }

  const dates = meaningfulValues.map(parseDate);
  const allDates = dates.every((value) => value !== null);
  if (allDates) {
    const hasTime = meaningfulValues.some((value) => typeof value === 'string' && /[tT ]\d{2}:\d{2}/.test(value));
    return hasTime ? 'TIMESTAMP' : 'DATE';
  }

  return 'VARCHAR';
}

function normalizeValue(value: unknown, type: string): DatasetRow[string] {
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
      const parsed = parseDate(value);
      return parsed ? parsed.toISOString().split('T')[0] : String(value);
    }
    case 'TIMESTAMP': {
      const parsed = parseDate(value);
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

function buildManifest(sourceFormat: string, sheetName: string | undefined, columns: DatasetColumn[], stats: DatasetColumnStat[]): NormalizedDatasetManifest {
  return {
    version: 1,
    generated_at: new Date().toISOString(),
    source_format: sourceFormat,
    sheet_name: sheetName,
    normalized_format: 'csv',
    columns,
    stats,
    transforms: [
      'typed_ingestion_in_javascript',
      'currency_symbols_removed_before_numeric_cast',
      'date_values_normalized_to_iso_strings',
      'booleans_normalized',
      'normalized_rows_persisted_for_postgres_analytics'
    ]
  };
}

async function parseFileByExtension(file: File, sheetName?: string) {
  const extension = detectFileExtension(file.name);
  if (extension === 'csv') return { rows: await parseCsv(file), extension };
  if (extension === 'json') return { rows: await parseJson(file), extension };
  if (extension === 'xlsx' || extension === 'xls') return { rows: await parseExcel(file, sheetName), extension };
  throw new Error(`Unsupported file format: ${extension || 'unknown'}`);
}

async function profileFile(file: File, sheetName?: string): Promise<DatasetProfileResult> {
  const { rows, extension } = await parseFileByExtension(file, sheetName);
  const columnNames = Array.from(new Set(rows.flatMap((row) => Object.keys(row || {}))));
  const columns: DatasetColumn[] = columnNames.map((name) => ({
    name,
    type: inferColumnType(rows.map((row) => row?.[name]))
  }));

  const normalizedRows: DatasetRow[] = rows.map((row) => {
    const normalized: DatasetRow = {};
    columns.forEach((column) => {
      normalized[column.name] = normalizeValue(row?.[column.name], column.type);
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

  return {
    columns,
    stats,
    preview: normalizedRows.slice(0, 100),
    artifacts: {
      normalizedCsv: Papa.unparse(normalizedRows, { header: true, skipEmptyLines: 'greedy' }),
      normalizedRows,
      manifest: buildManifest(extension, sheetName, columns, stats)
    }
  };
}

async function profileFromUrl(url: string, name: string, sheetName?: string, options?: ProfileFromUrlOptions): Promise<DatasetProfileResult> {
  const sourceUrl = options?.normalizedFileUrl || url;
  const response = await fetch(sourceUrl);
  const blob = await response.blob();
  const file = new File([blob], options?.normalizedFileUrl ? 'normalized.csv' : name, { type: blob.type });
  return profileFile(file, sheetName);
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
