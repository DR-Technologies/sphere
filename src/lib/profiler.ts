import * as duckdb from '@duckdb/duckdb-wasm';
import * as XLSX from 'xlsx';

let db: duckdb.AsyncDuckDB | null = null;
let initPromise: Promise<duckdb.AsyncDuckDB> | null = null;

async function initDB() {
    if (db) return db;
    if (initPromise) return initPromise;

    initPromise = (async () => {
        const JSDELIVR_BUNDLES = duckdb.getJsDelivrBundles();
        const bundle = await duckdb.selectBundle(JSDELIVR_BUNDLES);

        const worker_url = URL.createObjectURL(
            new Blob([`importScripts("${bundle.mainWorker!}");`], { type: 'text/javascript' })
        );

        const worker = new Worker(worker_url);
        const logger = new duckdb.ConsoleLogger();
        const newDB = new duckdb.AsyncDuckDB(logger, worker);
        await newDB.instantiate(bundle.mainModule, bundle.pthreadWorker);

        URL.revokeObjectURL(worker_url);
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

    // Ensure dates are formatted as ISO strings (YYYY-MM-DD) for DuckDB consistency
    // without relying on XLSX's internal default formatting which can produce serial numbers
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

    // We use raw: true to get actual numbers/dates instead of formatted strings where possible
    const csv = XLSX.utils.sheet_to_csv(worksheet);
    return { csv, sheetNames };
}

interface Column {
    name: string;
    type: string;
}

interface ColumnStat {
    column: string;
    type: string;
    min: unknown;
    max: unknown;
    total: number;
    nulls: number;
    unique: number;
}

interface DataRow {
    [key: string]: string | number | boolean | null | undefined;
}

export async function profileFile(file: File, sheetName?: string): Promise<{ columns: Column[]; stats: ColumnStat[]; preview: DataRow[] }> {
    const duckDB = await initDB();
    const conn = await duckDB.connect();

    try {
        // More robust extension detection (ignore everything after the first . until we find a known extension)
        const nameParts = file.name.toLowerCase().split('.');
        let extension = nameParts.pop();
        
        // If the last part has a space or parenthesis (from sheet additions), try to find the extension in the previous part
        if (extension && (extension.includes(' ') || extension.includes('('))) {
            const match = file.name.toLowerCase().match(/\.(csv|json|xlsx|xls)(\s|\(|$)/);
            if (match) extension = match[1];
        }
        const tableName = 'dataset';

        // Drop existing table if any to avoid conflicts
        await conn.query(`DROP TABLE IF EXISTS ${tableName}`);

        // Load data based on format
        if (extension === 'xlsx' || extension === 'xls') {
            const { csv } = await excelToCSV(file, sheetName);
            await duckDB.registerFileText('temp.csv', csv);
            await conn.insertCSVFromPath('temp.csv', {
                name: tableName,
                header: true,
                detect: true,
            });
        } else if (extension === 'csv' || extension === 'json') {
            // Using registerFileBuffer is often more stable than registerFileHandle
            const buffer = new Uint8Array(await file.arrayBuffer());
            await duckDB.registerFileBuffer(file.name, buffer);

            if (extension === 'csv') {
                await conn.insertCSVFromPath(file.name, {
                    name: tableName,
                    header: true,
                    detect: true,
                });
            } else {
                await conn.query(`CREATE TABLE ${tableName} AS SELECT * FROM read_json_auto('${file.name}')`);
            }
        }

        // Get table info
        const columnsResult = await conn.query(`DESCRIBE ${tableName}`);
        const columns: Column[] = columnsResult.toArray().map((row: Record<string, any>) => ({
            name: String(row.column_name),
            type: String(row.column_type),
        }));

        // Get basic stats for each column
        const stats: ColumnStat[] = [];
        for (const col of columns) {
            const colStats = await conn.query(`
                SELECT 
                    MIN("${col.name}") as min,
                    MAX("${col.name}") as max,
                    COUNT(*) as total_count,
                    COUNT("${col.name}") as non_null_count,
                    COUNT(DISTINCT "${col.name}") as unique_count
                FROM ${tableName}
            `);

            const statsRow = colStats.toArray()[0];
            stats.push({
                column: col.name,
                type: col.type,
                min: statsRow.min,
                max: statsRow.max,
                total: Number(statsRow.total_count),
                nulls: Number(statsRow.total_count) - Number(statsRow.non_null_count),
                unique: Number(statsRow.unique_count),
            });
        }

        // Get sample data for preview - Increased to 100 rows
        const previewResult = await conn.query(`SELECT * FROM ${tableName} LIMIT 100`);
        const preview = previewResult.toArray().map((row: Record<string, any>) => {
            const plainRow: DataRow = {};
            for (const key of Object.keys(row)) {
                // Handle BigInt and Date objects for JSON serialization
                const val = row[key];
                if (typeof val === 'bigint') {
                    plainRow[key] = Number(val);
                } else if (val instanceof Date) {
                    plainRow[key] = val.toISOString().split('T')[0];
                } else if (typeof val === 'string' || typeof val === 'number' || typeof val === 'boolean' || val === null) {
                    plainRow[key] = val;
                } else {
                    plainRow[key] = String(val);
                }
            }
            return plainRow;
        });

        return { columns, stats, preview };
    } finally {
        await conn.close();
    }
}

export async function runQuery(query: string): Promise<Record<string, any>[]> {
    const duckDB = await initDB();
    const conn = await duckDB.connect();
    try {
        const result = await conn.query(query);
        return result.toArray().map((row: Record<string, any>) => {
            const plainRow: Record<string, any> = {};
            for (const key of Object.keys(row)) {
                const val = row[key];
                if (typeof val === 'bigint') {
                    plainRow[key] = Number(val);
                } else if (val instanceof Date) {
                    plainRow[key] = val.toISOString().split('T')[0];
                } else {
                    plainRow[key] = val;
                }
            }
            return plainRow;
        });
    } finally {
        await conn.close();
    }
}

export async function profileFromUrl(url: string, name: string, sheetName?: string): Promise<{ columns: Column[]; stats: ColumnStat[]; preview: DataRow[] }> {
    // If we have a URL, the extension might be better detected from the URL path
    let fileNameForDetection = name;
    try {
        const urlObj = new URL(url);
        const pathParts = urlObj.pathname.split('/');
        const lastPart = pathParts.pop();
        if (lastPart && lastPart.includes('.')) {
            fileNameForDetection = lastPart;
        }
    } catch { /* ignore invalid URLs */ }

    const response = await fetch(url);
    const blob = await response.blob();
    const file = new File([blob], fileNameForDetection, { type: blob.type });
    return profileFile(file, sheetName);
}

export { getExcelSheetNames };
