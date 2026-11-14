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
  DatasetProfileExecutionOptions,
  DatasetRow,
  NormalizedDatasetManifest,
  ProfileFromUrlOptions
} from '../types';
import { resolvePrivateFileUrl } from '@/lib/storage/files';
import { annotateDatasetColumns } from '../semantics';
import { normalizeDatasetQueryError } from '../queryError';

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

interface ParsedDatasetSource {
  extension: string;
  estimatedRows: number;
  forEachChunk: (
    chunkSize: number,
    callback: (rows: Record<string, unknown>[], processedSourceRows: number) => void | Promise<void>
  ) => Promise<void>;
  release: () => void;
}

function createArraySource(rows: Record<string, unknown>[], extension: string): ParsedDatasetSource {
  return {
    extension,
    estimatedRows: rows.length,
    async forEachChunk(chunkSize, callback) {
      for (let start = 0; start < rows.length; start += chunkSize) {
        const end = Math.min(start + chunkSize, rows.length);
        await callback(rows.slice(start, end), end);
      }
    },
    release() {
      rows.length = 0;
    }
  };
}

async function parseExcel(file: File, sheetName?: string): Promise<ParsedDatasetSource> {
  const data = await file.arrayBuffer();
  const workbook = XLSX.read(data, {
    type: 'array',
    cellDates: true,
    dense: true,
    sheets: sheetName ? [sheetName] : 0
  });
  const targetSheetName = sheetName || workbook.SheetNames[0];
  let worksheet: XLSX.WorkSheet | undefined = workbook.Sheets[targetSheetName];
  if (!worksheet) throw new Error(`Sheet "${targetSheetName}" not found in workbook.`);
  const decodedRange = worksheet['!ref'] ? XLSX.utils.decode_range(worksheet['!ref']) : null;
  if (!decodedRange || decodedRange.e.r <= decodedRange.s.r) {
    return createArraySource([], detectFileExtension(file.name));
  }

  // Let SheetJS derive the exact column names (including duplicate/blank header
  // normalization) from a tiny range, then reuse those names for every chunk.
  const headerProbe = XLSX.utils.sheet_to_json<Record<string, unknown>>(worksheet, {
    raw: true,
    defval: null,
    range: {
      s: decodedRange.s,
      e: { r: Math.min(decodedRange.s.r + 1, decodedRange.e.r), c: decodedRange.e.c }
    }
  });
  const columnNames = Object.keys(headerProbe[0] || {});
  const dataStartRow = decodedRange.s.r + 1;
  const estimatedRows = Math.max(0, decodedRange.e.r - decodedRange.s.r);

  return {
    extension: detectFileExtension(file.name),
    estimatedRows,
    async forEachChunk(chunkSize, callback) {
      if (!worksheet) throw new Error('Excel worksheet was released before profiling completed.');
      for (let rowStart = dataStartRow; rowStart <= decodedRange.e.r; rowStart += chunkSize) {
        const rowEnd = Math.min(rowStart + chunkSize - 1, decodedRange.e.r);
        const chunk = XLSX.utils.sheet_to_json<Record<string, unknown>>(worksheet, {
          header: columnNames,
          raw: true,
          defval: null,
          range: {
            s: { r: rowStart, c: decodedRange.s.c },
            e: { r: rowEnd, c: decodedRange.e.c }
          }
        });
        await callback(chunk, rowEnd - decodedRange.s.r);
      }
    },
    release() {
      delete workbook.Sheets[targetSheetName];
      workbook.SheetNames.length = 0;
      worksheet = undefined;
    }
  };
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

interface ColumnTypeAccumulator {
  meaningful: number;
  allBoolean: boolean;
  allNumeric: boolean;
  allInteger: boolean;
  allDate: boolean;
  hasTime: boolean;
}

interface ColumnStatAccumulator {
  nulls: number;
  min: unknown;
  max: unknown;
}

const DEFAULT_PROFILE_CHUNK_SIZE = 5_000;

function createTypeAccumulator(): ColumnTypeAccumulator {
  return {
    meaningful: 0,
    allBoolean: true,
    allNumeric: true,
    allInteger: true,
    allDate: true,
    hasTime: false
  };
}

function updateTypeAccumulator(accumulator: ColumnTypeAccumulator, value: unknown, dateFormat?: DateInputFormat) {
  if (value === null || value === undefined || value === '') return;
  accumulator.meaningful += 1;

  accumulator.allBoolean = accumulator.allBoolean && parseBoolean(value) !== null;
  const numeric = parseNumeric(value);
  accumulator.allNumeric = accumulator.allNumeric && numeric !== null;
  accumulator.allInteger = accumulator.allInteger && numeric !== null && Number.isInteger(numeric);
  accumulator.allDate = accumulator.allDate && parseDate(value, dateFormat) !== null;
  accumulator.hasTime = accumulator.hasTime
    || (typeof value === 'string' && /[tT ]\d{2}:\d{2}/.test(value));
}

function resolveColumnType(accumulator: ColumnTypeAccumulator) {
  if (accumulator.meaningful === 0) return 'VARCHAR';
  if (accumulator.allBoolean) return 'BOOLEAN';
  if (accumulator.allNumeric) return accumulator.allInteger ? 'INTEGER' : 'DOUBLE';
  if (accumulator.allDate) return accumulator.hasTime ? 'TIMESTAMP' : 'DATE';
  return 'VARCHAR';
}

function updateStatAccumulator(accumulator: ColumnStatAccumulator, value: DatasetRow[string]) {
  if (value === null || value === undefined || value === '') {
    accumulator.nulls += 1;
    return;
  }

  if (typeof value === 'number') {
    accumulator.min = accumulator.min === null ? value : Math.min(accumulator.min as number, value);
    accumulator.max = accumulator.max === null ? value : Math.max(accumulator.max as number, value);
    return;
  }

  const comparable = String(value);
  accumulator.min = accumulator.min === null || comparable < String(accumulator.min) ? comparable : accumulator.min;
  accumulator.max = accumulator.max === null || comparable > String(accumulator.max) ? comparable : accumulator.max;
}

function countUniqueValues(rows: DatasetRow[], columnName: string) {
  const uniqueValues = new Set<string>();
  for (const row of rows) {
    const value = row[columnName];
    if (value !== null && value !== undefined && value !== '') uniqueValues.add(JSON.stringify(value));
  }
  return uniqueValues.size;
}

async function reportProgress(
  execution: DatasetProfileExecutionOptions | undefined,
  stage: 'reading' | 'profiling' | 'normalizing',
  processedRows: number,
  totalRows: number,
  progressOverride?: number
) {
  execution?.onProgress?.({
    stage,
    progress: progressOverride ?? (totalRows > 0 ? Math.min(1, processedRows / totalRows) : 1),
    processedRows,
    totalRows
  });
  await new Promise<void>((resolve) => setTimeout(resolve, 0));
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

async function parseFileByExtension(file: File, options?: DatasetImportOptions): Promise<ParsedDatasetSource> {
  const extension = detectFileExtension(file.name);
  if (extension === 'csv') return createArraySource(await parseCsv(file, options), extension);
  if (extension === 'json') return createArraySource(await parseJson(file, options), extension);
  if (extension === 'xlsx' || extension === 'xls') return parseExcel(file, options?.sheetName);
  throw new Error(`Unsupported file format: ${extension || 'unknown'}`);
}

async function profileFile(
  file: File,
  options?: DatasetImportOptions,
  execution?: DatasetProfileExecutionOptions
): Promise<DatasetProfileResult> {
  execution?.onProgress?.({ stage: 'reading', progress: 0 });
  const source = await parseFileByExtension(file, options);
  const chunkSize = Math.max(500, execution?.chunkSize || DEFAULT_PROFILE_CHUNK_SIZE);
  await reportProgress(execution, 'reading', source.estimatedRows, source.estimatedRows);

  const columnNames: string[] = [];
  const typeAccumulators = new Map<string, ColumnTypeAccumulator>();
  let totalRows = 0;
  await source.forEachChunk(chunkSize, async (rows, processedSourceRows) => {
    for (const row of rows) {
      for (const name of Object.keys(row)) {
        let accumulator = typeAccumulators.get(name);
        if (!accumulator) {
          accumulator = createTypeAccumulator();
          typeAccumulators.set(name, accumulator);
          columnNames.push(name);
        }
        updateTypeAccumulator(accumulator, row[name], options?.dateFormat);
      }
    }
    totalRows += rows.length;
    await reportProgress(execution, 'profiling', processedSourceRows, source.estimatedRows);
  });

  const columns: DatasetColumn[] = columnNames.map((name) => ({
    name,
    type: resolveColumnType(typeAccumulators.get(name) || createTypeAccumulator())
  }));
  const statAccumulators = new Map(columns.map((column) => [column.name, {
    nulls: 0,
    min: null,
    max: null
  } satisfies ColumnStatAccumulator]));
  const normalizedRows: DatasetRow[] = [];
  const normalizedCsvParts: BlobPart[] = [];
  let normalizedCount = 0;

  await source.forEachChunk(chunkSize, async (rows, processedSourceRows) => {
    const normalizedChunk = new Array<DatasetRow>(rows.length);
    for (let rowIndex = 0; rowIndex < rows.length; rowIndex += 1) {
      const sourceRow = rows[rowIndex] || {};
      const normalized: DatasetRow = {};
      for (const column of columns) {
        const value = normalizeValue(sourceRow[column.name], column.type, options?.dateFormat);
        normalized[column.name] = value;
        updateStatAccumulator(statAccumulators.get(column.name)!, value);
      }
      normalizedRows.push(normalized);
      normalizedChunk[rowIndex] = normalized;
    }

    const csvChunk = Papa.unparse(normalizedChunk, {
      header: normalizedCount === 0,
      columns: columnNames,
      skipEmptyLines: 'greedy'
    });
    if (normalizedCount > 0 && csvChunk) normalizedCsvParts.push('\r\n');
    if (csvChunk) normalizedCsvParts.push(csvChunk);
    normalizedCount += normalizedChunk.length;
    const rowProgress = source.estimatedRows > 0 ? processedSourceRows / source.estimatedRows : 1;
    await reportProgress(execution, 'normalizing', processedSourceRows, source.estimatedRows, Math.min(0.8, rowProgress * 0.8));
  });

  source.release();
  const stats: DatasetColumnStat[] = [];
  for (let columnIndex = 0; columnIndex < columns.length; columnIndex += 1) {
    const column = columns[columnIndex];
    const accumulator = statAccumulators.get(column.name)!;
    stats.push({
      column: column.name,
      type: column.type,
      min: accumulator.min,
      max: accumulator.max,
      total: totalRows,
      nulls: accumulator.nulls,
      unique: countUniqueValues(normalizedRows, column.name)
    });
    await reportProgress(
      execution,
      'normalizing',
      totalRows,
      totalRows,
      0.8 + (0.2 * (columnIndex + 1)) / Math.max(1, columns.length)
    );
  }

  const semanticColumns = annotateDatasetColumns(columns, stats);

  return {
    columns: semanticColumns,
    stats,
    preview: normalizedRows.slice(0, 100),
    artifacts: {
      normalizedCsv: new Blob(normalizedCsvParts, { type: 'text/csv;charset=utf-8' }),
      normalizedRows,
      manifest: buildManifest(source.extension, options, semanticColumns, stats)
    }
  };
}

async function profileFromUrl(url: string, name: string, sheetName?: string, options?: ProfileFromUrlOptions): Promise<DatasetProfileResult> {
  const sourceReference = options?.normalizedFileUrl || url;
  const sourceUrl = await resolvePrivateFileUrl(sourceReference);
  const response = await fetch(sourceUrl);
  if (!response.ok) throw new Error(`No se pudo abrir el archivo del dataset (${response.status}).`);
  const blob = await response.blob();
  const file = new File([blob], options?.normalizedFileUrl ? 'normalized.csv' : name, { type: blob.type });
  return profileFile(file, { sheetName });
}

async function runQuery(query: string, options?: { datasetId?: string }): Promise<DatasetRow[]> {
  if (!options?.datasetId) {
    throw new Error('datasetId is required for Supabase analytics queries.');
  }

  const { data, error } = await supabase.rpc('run_dataset_query', {
    p_dataset_id: options.datasetId,
    p_query: query
  });

  if (error) throw normalizeDatasetQueryError(error);

  return (data || []).map((row: unknown) => {
    if (row && typeof row === 'object' && 'row_data' in row) {
      return (row as { row_data: DatasetRow }).row_data;
    }
    return row as DatasetRow;
  });
}

export const supabaseAnalyticsProvider: AnalyticsProvider = {
  profileFile,
  profileFromUrl,
  runQuery,
  getExcelSheetNames
};
