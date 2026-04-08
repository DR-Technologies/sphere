import * as duckdb from '@duckdb/duckdb-wasm';
import * as XLSX from 'xlsx';
import Papa from 'papaparse';
import type {
  AnalyticsProvider,
  DatasetColumn,
  DatasetColumnStat,
  DatasetProfileResult,
  DatasetRow,
  NormalizedDatasetManifest,
  ProfileFromUrlOptions
} from '../types';

let db: duckdb.AsyncDuckDB | null = null;
let initPromise: Promise<duckdb.AsyncDuckDB> | null = null;

async function initDB() {
  if (db) return db;
  if (initPromise) return initPromise;

  initPromise = (async () => {
    const JSDELIVR_BUNDLES = duckdb.getJsDelivrBundles();
    const bundle = await duckdb.selectBundle(JSDELIVR_BUNDLES);

    const workerUrl = URL.createObjectURL(
      new Blob([`importScripts("${bundle.mainWorker!}");`], { type: 'text/javascript' })
    );

    const worker = new Worker(workerUrl);
    const logger = new duckdb.ConsoleLogger();
    const newDB = new duckdb.AsyncDuckDB(logger, worker);
    await newDB.instantiate(bundle.mainModule, bundle.pthreadWorker);

    URL.revokeObjectURL(workerUrl);
    db = newDB;
    return db;
  })();

  return initPromise;
}

async function getExcelSheetNames(file: File): Promise<string[]> {
  const data = await file.arrayBuffer();
  const workbook = XLSX.read(data, { type: 'array', bookSheets: true });
  return workbook.SheetNames;
}

async function excelToCSV(file: File, sheetName?: string): Promise<{ csv: string; sheetNames: string[] }> {
  const data = await file.arrayBuffer();
  const workbook = XLSX.read(data, { type: 'array', cellDates: true });
  const sheetNames = workbook.SheetNames;
  const targetSheetName = sheetName || sheetNames[0];
  const worksheet = workbook.Sheets[targetSheetName];

  if (!worksheet) {
    throw new Error(`Sheet "${targetSheetName}" not found in workbook.`);
  }

  const range = worksheet['!ref'] ? XLSX.utils.decode_range(worksheet['!ref']) : null;
  if (range) {
    for (let R = range.s.r; R <= range.e.r; ++R) {
      for (let C = range.s.c; C <= range.e.c; ++C) {
        const cellRef = XLSX.utils.encode_cell({ r: R, c: C });
        const cell = worksheet[cellRef];
        if (cell && cell.v instanceof Date) {
          cell.t = 's';
          cell.v = cell.v.toISOString().split('T')[0];
        }
      }
    }
  }

  const csv = XLSX.utils.sheet_to_csv(worksheet);
  return { csv, sheetNames };
}

function sanitizeForJSON(row: Record<string, any>): DatasetRow {
  const plainRow: DatasetRow = {};
  for (const key of Object.keys(row)) {
    const value = row[key];
    if (typeof value === 'bigint') {
      plainRow[key] = Number(value);
    } else if (value instanceof Date) {
      plainRow[key] = value.toISOString().split('T')[0];
    } else if (typeof value === 'string' || typeof value === 'number' || typeof value === 'boolean' || value === null) {
      plainRow[key] = value;
    } else if (value === undefined) {
      plainRow[key] = undefined;
    } else {
      plainRow[key] = String(value);
    }
  }
  return plainRow;
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
      'typed_ingestion_with_duckdb',
      'date_values_serialized_as_iso_strings',
      'numeric_and_boolean_values_preserved_when_detected'
    ]
  };
}

async function loadDatasetIntoDuckDb(file: File, sheetName?: string) {
  const duckDB = await initDB();
  const conn = await duckDB.connect();
  const tableName = 'dataset';

  const nameParts = file.name.toLowerCase().split('.');
  let extension = nameParts.pop();
  if (extension && (extension.includes(' ') || extension.includes('('))) {
    const match = file.name.toLowerCase().match(/\.(csv|json|xlsx|xls)(\s|\(|$)/);
    if (match) extension = match[1];
  }

  await conn.query(`DROP TABLE IF EXISTS ${tableName}`);

  if (extension === 'xlsx' || extension === 'xls') {
    const { csv } = await excelToCSV(file, sheetName);
    await duckDB.registerFileText('temp.csv', csv);
    await conn.insertCSVFromPath('temp.csv', {
      name: tableName,
      header: true,
      detect: true
    });
  } else if (extension === 'csv' || extension === 'json') {
    const buffer = new Uint8Array(await file.arrayBuffer());
    await duckDB.registerFileBuffer(file.name, buffer);

    if (extension === 'csv') {
      await conn.insertCSVFromPath(file.name, {
        name: tableName,
        header: true,
        detect: true
      });
    } else {
      await conn.query(`CREATE TABLE ${tableName} AS SELECT * FROM read_json_auto('${file.name}')`);
    }
  } else {
    throw new Error(`Unsupported file format: ${extension || 'unknown'}`);
  }

  return { conn, extension: extension || 'unknown' };
}

async function collectProfile(conn: duckdb.AsyncDuckDBConnection, extension: string, sheetName?: string): Promise<DatasetProfileResult> {
  const columnsResult = await conn.query(`DESCRIBE dataset`);
  const columns: DatasetColumn[] = columnsResult.toArray().map((row: Record<string, any>) => ({
    name: String(row.column_name),
    type: String(row.column_type)
  }));

  const stats: DatasetColumnStat[] = [];
  for (const col of columns) {
    const colStats = await conn.query(`
      SELECT 
        MIN("${col.name}") as min,
        MAX("${col.name}") as max,
        COUNT(*) as total_count,
        COUNT("${col.name}") as non_null_count,
        COUNT(DISTINCT "${col.name}") as unique_count
      FROM dataset
    `);

    const statsRow = colStats.toArray()[0];
    stats.push({
      column: col.name,
      type: col.type,
      min: statsRow.min,
      max: statsRow.max,
      total: Number(statsRow.total_count),
      nulls: Number(statsRow.total_count) - Number(statsRow.non_null_count),
      unique: Number(statsRow.unique_count)
    });
  }

  const previewResult = await conn.query(`SELECT * FROM dataset LIMIT 100`);
  const preview = previewResult.toArray().map((row: Record<string, any>) => sanitizeForJSON(row));

  const normalizedResult = await conn.query(`SELECT * FROM dataset`);
  const normalizedRows = normalizedResult.toArray().map((row: Record<string, any>) => sanitizeForJSON(row));
  const normalizedCsv = Papa.unparse(normalizedRows, {
    header: true,
    skipEmptyLines: 'greedy'
  });

  return {
    columns,
    stats,
    preview,
    artifacts: {
      normalizedCsv,
      manifest: buildManifest(extension, sheetName, columns, stats)
    }
  };
}

function deriveArtifactUrls(rawUrl: string) {
  const lastDot = rawUrl.lastIndexOf('.');
  if (lastDot === -1) return null;

  return {
    normalizedFileUrl: `${rawUrl.slice(0, lastDot)}__normalized.csv`,
    analyticsManifestUrl: `${rawUrl.slice(0, lastDot)}__analytics.json`
  };
}

async function profileFile(file: File, sheetName?: string): Promise<DatasetProfileResult> {
  const { conn, extension } = await loadDatasetIntoDuckDb(file, sheetName);
  try {
    return await collectProfile(conn, extension, sheetName);
  } finally {
    await conn.close();
  }
}

async function profileFromUrl(url: string, name: string, sheetName?: string, options?: ProfileFromUrlOptions): Promise<DatasetProfileResult> {
  let fileNameForDetection = name;
  try {
    const urlObj = new URL(url);
    const pathParts = urlObj.pathname.split('/');
    const lastPart = pathParts.pop();
    if (lastPart && lastPart.includes('.')) {
      fileNameForDetection = lastPart;
    }
  } catch {}

  const derivedUrls = deriveArtifactUrls(url);
  const normalizedFileUrl = options?.normalizedFileUrl || derivedUrls?.normalizedFileUrl;

  if (normalizedFileUrl) {
    try {
      const normalizedResponse = await fetch(normalizedFileUrl, { method: 'GET' });
      if (normalizedResponse.ok) {
        const normalizedBlob = await normalizedResponse.blob();
        const normalizedFile = new File([normalizedBlob], 'normalized.csv', { type: normalizedBlob.type || 'text/csv' });
        return profileFile(normalizedFile, sheetName);
      }
    } catch {
      // Fall back to original file when normalized artifact is missing.
    }
  }

  const response = await fetch(url);
  const blob = await response.blob();
  const file = new File([blob], fileNameForDetection, { type: blob.type });
  return profileFile(file, sheetName);
}

async function runQuery(query: string): Promise<Record<string, any>[]> {
  const duckDB = await initDB();
  const conn = await duckDB.connect();
  try {
    const result = await conn.query(query);
    return result.toArray().map((row: Record<string, any>) => sanitizeForJSON(row));
  } finally {
    await conn.close();
  }
}

export const duckDbAnalyticsProvider: AnalyticsProvider = {
  profileFile,
  profileFromUrl,
  runQuery,
  getExcelSheetNames
};
