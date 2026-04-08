module.exports = [
"[project]/src/lib/supabase.ts [app-ssr] (ecmascript)", ((__turbopack_context__) => {
"use strict";

__turbopack_context__.s([
    "supabase",
    ()=>supabase
]);
var __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f40$supabase$2f$supabase$2d$js$2f$dist$2f$index$2e$mjs__$5b$app$2d$ssr$5d$__$28$ecmascript$29$__$3c$locals$3e$__ = __turbopack_context__.i("[project]/node_modules/@supabase/supabase-js/dist/index.mjs [app-ssr] (ecmascript) <locals>");
;
const supabaseUrl = ("TURBOPACK compile-time value", "https://dsbbybsybtlpyriwdmla.supabase.co") || '';
const supabaseAnonKey = ("TURBOPACK compile-time value", "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImRzYmJ5YnN5YnRscHlyaXdkbWxhIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NjgzNDUwMDMsImV4cCI6MjA4MzkyMTAwM30.sgJSZj6nppYWZD2DCgyEdhgN79e1Q3ZzOpIaO7grhY4") || '';
if ("TURBOPACK compile-time falsy", 0) //TURBOPACK unreachable
;
const supabase = (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f40$supabase$2f$supabase$2d$js$2f$dist$2f$index$2e$mjs__$5b$app$2d$ssr$5d$__$28$ecmascript$29$__$3c$locals$3e$__["createClient"])(supabaseUrl || 'https://placeholder.supabase.co', supabaseAnonKey || 'placeholder', {
    auth: {
        persistSession: true,
        autoRefreshToken: true,
        detectSessionInUrl: true,
        storageKey: 'sphere-auth-session'
    }
}); // Optional: enable debug if needed (user can see it in console)
 // (supabase as any).debug = true;
}),
"[project]/src/lib/persistence.ts [app-ssr] (ecmascript)", ((__turbopack_context__) => {
"use strict";

__turbopack_context__.s([
    "checkDatasetLimit",
    ()=>checkDatasetLimit,
    "checkReportLimit",
    ()=>checkReportLimit,
    "deleteDataset",
    ()=>deleteDataset,
    "deleteReport",
    ()=>deleteReport,
    "getDatasetById",
    ()=>getDatasetById,
    "getDatasets",
    ()=>getDatasets,
    "getReportById",
    ()=>getReportById,
    "getReports",
    ()=>getReports,
    "saveDataset",
    ()=>saveDataset,
    "saveReport",
    ()=>saveReport,
    "updateReportName",
    ()=>updateReportName,
    "uploadFile",
    ()=>uploadFile
]);
var __TURBOPACK__imported__module__$5b$project$5d2f$src$2f$lib$2f$supabase$2e$ts__$5b$app$2d$ssr$5d$__$28$ecmascript$29$__ = __turbopack_context__.i("[project]/src/lib/supabase.ts [app-ssr] (ecmascript)");
;
async function uploadFile(file, userId) {
    const fileExt = file.name.split('.').pop();
    const fileName = `${Math.random().toString(36).substring(2)}.${fileExt}`;
    const filePath = `${userId}/datasets/${fileName}`;
    const { error: uploadError } = await __TURBOPACK__imported__module__$5b$project$5d2f$src$2f$lib$2f$supabase$2e$ts__$5b$app$2d$ssr$5d$__$28$ecmascript$29$__["supabase"].storage.from('files').upload(filePath, file);
    if (uploadError) {
        console.error('Error uploading file:', uploadError.message);
        return null;
    }
    const { data: { publicUrl } } = __TURBOPACK__imported__module__$5b$project$5d2f$src$2f$lib$2f$supabase$2e$ts__$5b$app$2d$ssr$5d$__$28$ecmascript$29$__["supabase"].storage.from('files').getPublicUrl(filePath);
    return publicUrl;
}
/**
 * Sanitizes an object to be JSON-safe by converting BigInt to Number
 */ function sanitizeForJSON(obj) {
    if (obj === null || obj === undefined) return obj;
    if (typeof obj === 'bigint') return Number(obj);
    if (Array.isArray(obj)) return obj.map(sanitizeForJSON);
    if (typeof obj === 'object') {
        const sanitized = {};
        for (const [key, value] of Object.entries(obj)){
            sanitized[key] = sanitizeForJSON(value);
        }
        return sanitized;
    }
    return obj;
}
async function saveDataset(dataset) {
    const sanitizedDataset = sanitizeForJSON(dataset);
    const { sheet_name, ...metadataWithoutSheet } = sanitizedDataset;
    // We try to save with sheet_name, but if it fails we fall back to saving without it
    // to avoid breaking the entire flow if the DB column isn't ready yet.
    const { data, error } = await __TURBOPACK__imported__module__$5b$project$5d2f$src$2f$lib$2f$supabase$2e$ts__$5b$app$2d$ssr$5d$__$28$ecmascript$29$__["supabase"].from('datasets').insert([
        sanitizedDataset
    ]).select().single();
    if (error && error.code === 'PGRST204') {
        console.warn('Column sheet_name not found in datasets table. Falling back to save without it.');
        const { data: retryData, error: retryError } = await __TURBOPACK__imported__module__$5b$project$5d2f$src$2f$lib$2f$supabase$2e$ts__$5b$app$2d$ssr$5d$__$28$ecmascript$29$__["supabase"].from('datasets').insert([
            metadataWithoutSheet
        ]).select().single();
        if (retryError) throw retryError;
        return retryData;
    }
    if (error) {
        console.error('Error saving dataset metadata:', error.message);
        throw error;
    }
    return data;
}
async function getDatasets(userId) {
    const { data, error } = await __TURBOPACK__imported__module__$5b$project$5d2f$src$2f$lib$2f$supabase$2e$ts__$5b$app$2d$ssr$5d$__$28$ecmascript$29$__["supabase"].from('datasets').select('*').eq('user_id', userId).order('created_at', {
        ascending: false
    });
    if (error) {
        console.error('Error fetching datasets:', error.message);
        return [];
    }
    return data || [];
}
async function saveReport(report) {
    const { data, error } = await __TURBOPACK__imported__module__$5b$project$5d2f$src$2f$lib$2f$supabase$2e$ts__$5b$app$2d$ssr$5d$__$28$ecmascript$29$__["supabase"].from('reports').upsert([
        report
    ]).select().single();
    if (error) {
        console.error('Error saving report:', error.message);
        throw error;
    }
    return data;
}
async function getReports(userId, datasetId) {
    let query = __TURBOPACK__imported__module__$5b$project$5d2f$src$2f$lib$2f$supabase$2e$ts__$5b$app$2d$ssr$5d$__$28$ecmascript$29$__["supabase"].from('reports').select('*').eq('user_id', userId).order('created_at', {
        ascending: false
    });
    if (datasetId) {
        query = query.eq('dataset_id', datasetId);
    }
    const { data, error } = await query;
    if (error) {
        console.error('Error fetching reports:', error.message);
        return [];
    }
    return data || [];
}
async function getReportById(reportId) {
    const { data, error } = await __TURBOPACK__imported__module__$5b$project$5d2f$src$2f$lib$2f$supabase$2e$ts__$5b$app$2d$ssr$5d$__$28$ecmascript$29$__["supabase"].from('reports').select('*').eq('id', reportId).single();
    if (error) {
        console.error('Error fetching report by ID:', error.message);
        return null;
    }
    return data;
}
async function getDatasetById(datasetId) {
    const { data, error } = await __TURBOPACK__imported__module__$5b$project$5d2f$src$2f$lib$2f$supabase$2e$ts__$5b$app$2d$ssr$5d$__$28$ecmascript$29$__["supabase"].from('datasets').select('*').eq('id', datasetId).single();
    if (error) {
        console.error('Error fetching dataset by ID:', error.message);
        return null;
    }
    return data;
}
async function deleteReport(reportId, userId) {
    const { error } = await __TURBOPACK__imported__module__$5b$project$5d2f$src$2f$lib$2f$supabase$2e$ts__$5b$app$2d$ssr$5d$__$28$ecmascript$29$__["supabase"].from('reports').delete().eq('id', reportId).eq('user_id', userId);
    if (error) {
        console.error('Error deleting report:', error.message);
        throw error;
    }
}
async function deleteDataset(datasetId, fileUrl, userId) {
    // 1. Delete from database
    const { error: dbError } = await __TURBOPACK__imported__module__$5b$project$5d2f$src$2f$lib$2f$supabase$2e$ts__$5b$app$2d$ssr$5d$__$28$ecmascript$29$__["supabase"].from('datasets').delete().eq('id', datasetId).eq('user_id', userId);
    if (dbError) {
        console.error('Error deleting dataset from DB:', dbError.message);
        throw dbError;
    }
    // 2. Delete from storage (optional but recommended)
    try {
        const path = fileUrl.split('/storage/v1/object/public/files/')[1];
        if (path) {
            await __TURBOPACK__imported__module__$5b$project$5d2f$src$2f$lib$2f$supabase$2e$ts__$5b$app$2d$ssr$5d$__$28$ecmascript$29$__["supabase"].storage.from('files').remove([
                path
            ]);
        }
    } catch (err) {
        console.warn('Failed to delete file from storage:', err);
    }
}
async function updateReportName(reportId, name, userId) {
    const { error } = await __TURBOPACK__imported__module__$5b$project$5d2f$src$2f$lib$2f$supabase$2e$ts__$5b$app$2d$ssr$5d$__$28$ecmascript$29$__["supabase"].from('reports').update({
        name
    }).eq('id', reportId).eq('user_id', userId);
    if (error) {
        console.error('Error updating report name:', error.message);
        throw error;
    }
}
async function checkDatasetLimit(userId) {
    const { count, error } = await __TURBOPACK__imported__module__$5b$project$5d2f$src$2f$lib$2f$supabase$2e$ts__$5b$app$2d$ssr$5d$__$28$ecmascript$29$__["supabase"].from('datasets').select('*', {
        count: 'exact',
        head: true
    }).eq('user_id', userId);
    if (error) return false;
    return (count || 0) < 3;
}
async function checkReportLimit(datasetId) {
    const { count, error } = await __TURBOPACK__imported__module__$5b$project$5d2f$src$2f$lib$2f$supabase$2e$ts__$5b$app$2d$ssr$5d$__$28$ecmascript$29$__["supabase"].from('reports').select('*', {
        count: 'exact',
        head: true
    }).eq('dataset_id', datasetId);
    if (error) return false;
    return (count || 0) < 3;
}
}),
"[externals]/url [external] (url, cjs)", ((__turbopack_context__, module, exports) => {

const mod = __turbopack_context__.x("url", () => require("url"));

module.exports = mod;
}),
"[externals]/vm [external] (vm, cjs)", ((__turbopack_context__, module, exports) => {

const mod = __turbopack_context__.x("vm", () => require("vm"));

module.exports = mod;
}),
"[externals]/worker_threads [external] (worker_threads, cjs)", ((__turbopack_context__, module, exports) => {

const mod = __turbopack_context__.x("worker_threads", () => require("worker_threads"));

module.exports = mod;
}),
"[externals]/node:stream [external] (node:stream, cjs)", ((__turbopack_context__, module, exports) => {

const mod = __turbopack_context__.x("node:stream", () => require("node:stream"));

module.exports = mod;
}),
"[project]/src/lib/profiler.ts [app-ssr] (ecmascript)", ((__turbopack_context__) => {
"use strict";

__turbopack_context__.s([
    "getExcelSheetNames",
    ()=>getExcelSheetNames,
    "profileFile",
    ()=>profileFile,
    "profileFromUrl",
    ()=>profileFromUrl,
    "runQuery",
    ()=>runQuery
]);
var __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f40$duckdb$2f$duckdb$2d$wasm$2f$dist$2f$duckdb$2d$node$2e$cjs__$5b$app$2d$ssr$5d$__$28$ecmascript$29$__ = __turbopack_context__.i("[project]/node_modules/@duckdb/duckdb-wasm/dist/duckdb-node.cjs [app-ssr] (ecmascript)");
var __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$xlsx$2f$xlsx$2e$mjs__$5b$app$2d$ssr$5d$__$28$ecmascript$29$__ = __turbopack_context__.i("[project]/node_modules/xlsx/xlsx.mjs [app-ssr] (ecmascript)");
;
;
let db = null;
let initPromise = null;
async function initDB() {
    if (db) return db;
    if (initPromise) return initPromise;
    initPromise = (async ()=>{
        const JSDELIVR_BUNDLES = __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f40$duckdb$2f$duckdb$2d$wasm$2f$dist$2f$duckdb$2d$node$2e$cjs__$5b$app$2d$ssr$5d$__$28$ecmascript$29$__["getJsDelivrBundles"]();
        const bundle = await __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f40$duckdb$2f$duckdb$2d$wasm$2f$dist$2f$duckdb$2d$node$2e$cjs__$5b$app$2d$ssr$5d$__$28$ecmascript$29$__["selectBundle"](JSDELIVR_BUNDLES);
        const worker_url = URL.createObjectURL(new Blob([
            `importScripts("${bundle.mainWorker}");`
        ], {
            type: 'text/javascript'
        }));
        const worker = new Worker(worker_url);
        const logger = new __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f40$duckdb$2f$duckdb$2d$wasm$2f$dist$2f$duckdb$2d$node$2e$cjs__$5b$app$2d$ssr$5d$__$28$ecmascript$29$__["ConsoleLogger"]();
        const newDB = new __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f40$duckdb$2f$duckdb$2d$wasm$2f$dist$2f$duckdb$2d$node$2e$cjs__$5b$app$2d$ssr$5d$__$28$ecmascript$29$__["AsyncDuckDB"](logger, worker);
        await newDB.instantiate(bundle.mainModule, bundle.pthreadWorker);
        URL.revokeObjectURL(worker_url);
        db = newDB;
        return db;
    })();
    return initPromise;
}
async function getExcelSheetNames(file) {
    const data = await file.arrayBuffer();
    const workbook = __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$xlsx$2f$xlsx$2e$mjs__$5b$app$2d$ssr$5d$__$28$ecmascript$29$__["read"](data, {
        type: 'array',
        bookSheets: true
    });
    return workbook.SheetNames;
}
async function excelToCSV(file, sheetName) {
    const data = await file.arrayBuffer();
    const workbook = __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$xlsx$2f$xlsx$2e$mjs__$5b$app$2d$ssr$5d$__$28$ecmascript$29$__["read"](data, {
        type: 'array',
        cellDates: true
    });
    const sheetNames = workbook.SheetNames;
    const targetSheetName = sheetName || sheetNames[0];
    const worksheet = workbook.Sheets[targetSheetName];
    if (!worksheet) {
        throw new Error(`Sheet "${targetSheetName}" not found in workbook.`);
    }
    // Ensure dates are formatted as ISO strings (YYYY-MM-DD) for DuckDB consistency
    // without relying on XLSX's internal default formatting which can produce serial numbers
    const range = worksheet['!ref'] ? __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$xlsx$2f$xlsx$2e$mjs__$5b$app$2d$ssr$5d$__$28$ecmascript$29$__["utils"].decode_range(worksheet['!ref']) : null;
    if (range) {
        for(let R = range.s.r; R <= range.e.r; ++R){
            for(let C = range.s.c; C <= range.e.c; ++C){
                const cellRef = __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$xlsx$2f$xlsx$2e$mjs__$5b$app$2d$ssr$5d$__$28$ecmascript$29$__["utils"].encode_cell({
                    r: R,
                    c: C
                });
                const cell = worksheet[cellRef];
                if (cell && cell.v instanceof Date) {
                    cell.t = 's';
                    cell.v = cell.v.toISOString().split('T')[0];
                }
            }
        }
    }
    // We use raw: true to get actual numbers/dates instead of formatted strings where possible
    const csv = __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$xlsx$2f$xlsx$2e$mjs__$5b$app$2d$ssr$5d$__$28$ecmascript$29$__["utils"].sheet_to_csv(worksheet);
    return {
        csv,
        sheetNames
    };
}
async function profileFile(file, sheetName) {
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
                detect: true
            });
        } else if (extension === 'csv' || extension === 'json') {
            // Using registerFileBuffer is often more stable than registerFileHandle
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
        }
        // Get table info
        const columnsResult = await conn.query(`DESCRIBE ${tableName}`);
        const columns = columnsResult.toArray().map((row)=>({
                name: String(row.column_name),
                type: String(row.column_type)
            }));
        // Get basic stats for each column
        const stats = [];
        for (const col of columns){
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
                unique: Number(statsRow.unique_count)
            });
        }
        // Get sample data for preview - Increased to 100 rows
        const previewResult = await conn.query(`SELECT * FROM ${tableName} LIMIT 100`);
        const preview = previewResult.toArray().map((row)=>{
            const plainRow = {};
            for (const key of Object.keys(row)){
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
        return {
            columns,
            stats,
            preview
        };
    } finally{
        await conn.close();
    }
}
async function runQuery(query) {
    const duckDB = await initDB();
    const conn = await duckDB.connect();
    try {
        const result = await conn.query(query);
        return result.toArray().map((row)=>{
            const plainRow = {};
            for (const key of Object.keys(row)){
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
    } finally{
        await conn.close();
    }
}
async function profileFromUrl(url, name, sheetName) {
    // If we have a URL, the extension might be better detected from the URL path
    let fileNameForDetection = name;
    try {
        const urlObj = new URL(url);
        const pathParts = urlObj.pathname.split('/');
        const lastPart = pathParts.pop();
        if (lastPart && lastPart.includes('.')) {
            fileNameForDetection = lastPart;
        }
    } catch  {}
    const response = await fetch(url);
    const blob = await response.blob();
    const file = new File([
        blob
    ], fileNameForDetection, {
        type: blob.type
    });
    return profileFile(file, sheetName);
}
;
}),
"[project]/src/components/layout/Sidebar.tsx [app-ssr] (ecmascript)", ((__turbopack_context__) => {
"use strict";

__turbopack_context__.s([
    "default",
    ()=>Sidebar
]);
var __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$next$2f$dist$2f$server$2f$route$2d$modules$2f$app$2d$page$2f$vendored$2f$ssr$2f$react$2d$jsx$2d$dev$2d$runtime$2e$js__$5b$app$2d$ssr$5d$__$28$ecmascript$29$__ = __turbopack_context__.i("[project]/node_modules/next/dist/server/route-modules/app-page/vendored/ssr/react-jsx-dev-runtime.js [app-ssr] (ecmascript)");
var __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$styled$2d$jsx$2f$style$2e$js__$5b$app$2d$ssr$5d$__$28$ecmascript$29$__ = __turbopack_context__.i("[project]/node_modules/styled-jsx/style.js [app-ssr] (ecmascript)");
var __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$next$2f$dist$2f$server$2f$route$2d$modules$2f$app$2d$page$2f$vendored$2f$ssr$2f$react$2e$js__$5b$app$2d$ssr$5d$__$28$ecmascript$29$__ = __turbopack_context__.i("[project]/node_modules/next/dist/server/route-modules/app-page/vendored/ssr/react.js [app-ssr] (ecmascript)");
var __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$lucide$2d$react$2f$dist$2f$esm$2f$icons$2f$house$2e$js__$5b$app$2d$ssr$5d$__$28$ecmascript$29$__$3c$export__default__as__Home$3e$__ = __turbopack_context__.i("[project]/node_modules/lucide-react/dist/esm/icons/house.js [app-ssr] (ecmascript) <export default as Home>");
var __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$lucide$2d$react$2f$dist$2f$esm$2f$icons$2f$database$2e$js__$5b$app$2d$ssr$5d$__$28$ecmascript$29$__$3c$export__default__as__Database$3e$__ = __turbopack_context__.i("[project]/node_modules/lucide-react/dist/esm/icons/database.js [app-ssr] (ecmascript) <export default as Database>");
var __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$lucide$2d$react$2f$dist$2f$esm$2f$icons$2f$upload$2e$js__$5b$app$2d$ssr$5d$__$28$ecmascript$29$__$3c$export__default__as__Upload$3e$__ = __turbopack_context__.i("[project]/node_modules/lucide-react/dist/esm/icons/upload.js [app-ssr] (ecmascript) <export default as Upload>");
var __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$lucide$2d$react$2f$dist$2f$esm$2f$icons$2f$log$2d$out$2e$js__$5b$app$2d$ssr$5d$__$28$ecmascript$29$__$3c$export__default__as__LogOut$3e$__ = __turbopack_context__.i("[project]/node_modules/lucide-react/dist/esm/icons/log-out.js [app-ssr] (ecmascript) <export default as LogOut>");
var __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$lucide$2d$react$2f$dist$2f$esm$2f$icons$2f$activity$2e$js__$5b$app$2d$ssr$5d$__$28$ecmascript$29$__$3c$export__default__as__Activity$3e$__ = __turbopack_context__.i("[project]/node_modules/lucide-react/dist/esm/icons/activity.js [app-ssr] (ecmascript) <export default as Activity>");
var __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$lucide$2d$react$2f$dist$2f$esm$2f$icons$2f$chevron$2d$left$2e$js__$5b$app$2d$ssr$5d$__$28$ecmascript$29$__$3c$export__default__as__ChevronLeft$3e$__ = __turbopack_context__.i("[project]/node_modules/lucide-react/dist/esm/icons/chevron-left.js [app-ssr] (ecmascript) <export default as ChevronLeft>");
var __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$lucide$2d$react$2f$dist$2f$esm$2f$icons$2f$chevron$2d$right$2e$js__$5b$app$2d$ssr$5d$__$28$ecmascript$29$__$3c$export__default__as__ChevronRight$3e$__ = __turbopack_context__.i("[project]/node_modules/lucide-react/dist/esm/icons/chevron-right.js [app-ssr] (ecmascript) <export default as ChevronRight>");
var __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$lucide$2d$react$2f$dist$2f$esm$2f$icons$2f$settings$2e$js__$5b$app$2d$ssr$5d$__$28$ecmascript$29$__$3c$export__default__as__Settings$3e$__ = __turbopack_context__.i("[project]/node_modules/lucide-react/dist/esm/icons/settings.js [app-ssr] (ecmascript) <export default as Settings>");
var __TURBOPACK__imported__module__$5b$project$5d2f$src$2f$lib$2f$i18n$2f$LanguageContext$2e$tsx__$5b$app$2d$ssr$5d$__$28$ecmascript$29$__ = __turbopack_context__.i("[project]/src/lib/i18n/LanguageContext.tsx [app-ssr] (ecmascript)");
'use client';
;
;
;
;
;
function Sidebar({ activeView, onViewChange, onLogout, userName }) {
    const [isCollapsed, setIsCollapsed] = __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$next$2f$dist$2f$server$2f$route$2d$modules$2f$app$2d$page$2f$vendored$2f$ssr$2f$react$2e$js__$5b$app$2d$ssr$5d$__$28$ecmascript$29$__["default"].useState(false);
    const { t } = (0, __TURBOPACK__imported__module__$5b$project$5d2f$src$2f$lib$2f$i18n$2f$LanguageContext$2e$tsx__$5b$app$2d$ssr$5d$__$28$ecmascript$29$__["useTranslation"])();
    const menuItems = [
        {
            id: 'home',
            label: t('sidebar.home'),
            icon: /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$next$2f$dist$2f$server$2f$route$2d$modules$2f$app$2d$page$2f$vendored$2f$ssr$2f$react$2d$jsx$2d$dev$2d$runtime$2e$js__$5b$app$2d$ssr$5d$__$28$ecmascript$29$__["jsxDEV"])(__TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$lucide$2d$react$2f$dist$2f$esm$2f$icons$2f$house$2e$js__$5b$app$2d$ssr$5d$__$28$ecmascript$29$__$3c$export__default__as__Home$3e$__["Home"], {
                size: 20
            }, void 0, false, {
                fileName: "[project]/src/components/layout/Sidebar.tsx",
                lineNumber: 20,
                columnNumber: 55
            }, this)
        },
        {
            id: 'datasets',
            label: t('sidebar.datasets'),
            icon: /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$next$2f$dist$2f$server$2f$route$2d$modules$2f$app$2d$page$2f$vendored$2f$ssr$2f$react$2d$jsx$2d$dev$2d$runtime$2e$js__$5b$app$2d$ssr$5d$__$28$ecmascript$29$__["jsxDEV"])(__TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$lucide$2d$react$2f$dist$2f$esm$2f$icons$2f$database$2e$js__$5b$app$2d$ssr$5d$__$28$ecmascript$29$__$3c$export__default__as__Database$3e$__["Database"], {
                size: 20
            }, void 0, false, {
                fileName: "[project]/src/components/layout/Sidebar.tsx",
                lineNumber: 21,
                columnNumber: 63
            }, this)
        },
        {
            id: 'reports',
            label: t('sidebar.reports'),
            icon: /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$next$2f$dist$2f$server$2f$route$2d$modules$2f$app$2d$page$2f$vendored$2f$ssr$2f$react$2d$jsx$2d$dev$2d$runtime$2e$js__$5b$app$2d$ssr$5d$__$28$ecmascript$29$__["jsxDEV"])(__TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$lucide$2d$react$2f$dist$2f$esm$2f$icons$2f$activity$2e$js__$5b$app$2d$ssr$5d$__$28$ecmascript$29$__$3c$export__default__as__Activity$3e$__["Activity"], {
                size: 20
            }, void 0, false, {
                fileName: "[project]/src/components/layout/Sidebar.tsx",
                lineNumber: 22,
                columnNumber: 61
            }, this)
        },
        {
            id: 'upload',
            label: t('sidebar.upload'),
            icon: /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$next$2f$dist$2f$server$2f$route$2d$modules$2f$app$2d$page$2f$vendored$2f$ssr$2f$react$2d$jsx$2d$dev$2d$runtime$2e$js__$5b$app$2d$ssr$5d$__$28$ecmascript$29$__["jsxDEV"])(__TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$lucide$2d$react$2f$dist$2f$esm$2f$icons$2f$upload$2e$js__$5b$app$2d$ssr$5d$__$28$ecmascript$29$__$3c$export__default__as__Upload$3e$__["Upload"], {
                size: 20
            }, void 0, false, {
                fileName: "[project]/src/components/layout/Sidebar.tsx",
                lineNumber: 23,
                columnNumber: 59
            }, this)
        },
        {
            id: 'settings',
            label: t('sidebar.settings'),
            icon: /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$next$2f$dist$2f$server$2f$route$2d$modules$2f$app$2d$page$2f$vendored$2f$ssr$2f$react$2d$jsx$2d$dev$2d$runtime$2e$js__$5b$app$2d$ssr$5d$__$28$ecmascript$29$__["jsxDEV"])(__TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$lucide$2d$react$2f$dist$2f$esm$2f$icons$2f$settings$2e$js__$5b$app$2d$ssr$5d$__$28$ecmascript$29$__$3c$export__default__as__Settings$3e$__["Settings"], {
                size: 20
            }, void 0, false, {
                fileName: "[project]/src/components/layout/Sidebar.tsx",
                lineNumber: 24,
                columnNumber: 63
            }, this)
        }
    ];
    const toggleCollapse = ()=>setIsCollapsed(!isCollapsed);
    return /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$next$2f$dist$2f$server$2f$route$2d$modules$2f$app$2d$page$2f$vendored$2f$ssr$2f$react$2d$jsx$2d$dev$2d$runtime$2e$js__$5b$app$2d$ssr$5d$__$28$ecmascript$29$__["jsxDEV"])("aside", {
        className: "jsx-8e7f2cc34759cc3" + " " + `sidebar ${isCollapsed ? 'collapsed' : ''}`,
        children: [
            /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$next$2f$dist$2f$server$2f$route$2d$modules$2f$app$2d$page$2f$vendored$2f$ssr$2f$react$2d$jsx$2d$dev$2d$runtime$2e$js__$5b$app$2d$ssr$5d$__$28$ecmascript$29$__["jsxDEV"])("div", {
                className: "jsx-8e7f2cc34759cc3" + " " + "sidebar-header",
                children: [
                    /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$next$2f$dist$2f$server$2f$route$2d$modules$2f$app$2d$page$2f$vendored$2f$ssr$2f$react$2d$jsx$2d$dev$2d$runtime$2e$js__$5b$app$2d$ssr$5d$__$28$ecmascript$29$__["jsxDEV"])("div", {
                        className: "jsx-8e7f2cc34759cc3" + " " + "logo-container",
                        children: [
                            /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$next$2f$dist$2f$server$2f$route$2d$modules$2f$app$2d$page$2f$vendored$2f$ssr$2f$react$2d$jsx$2d$dev$2d$runtime$2e$js__$5b$app$2d$ssr$5d$__$28$ecmascript$29$__["jsxDEV"])("div", {
                                className: "jsx-8e7f2cc34759cc3" + " " + "logo-orb"
                            }, void 0, false, {
                                fileName: "[project]/src/components/layout/Sidebar.tsx",
                                lineNumber: 33,
                                columnNumber: 21
                            }, this),
                            !isCollapsed && /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$next$2f$dist$2f$server$2f$route$2d$modules$2f$app$2d$page$2f$vendored$2f$ssr$2f$react$2d$jsx$2d$dev$2d$runtime$2e$js__$5b$app$2d$ssr$5d$__$28$ecmascript$29$__["jsxDEV"])("span", {
                                className: "jsx-8e7f2cc34759cc3" + " " + "logo-text",
                                children: "Sphere"
                            }, void 0, false, {
                                fileName: "[project]/src/components/layout/Sidebar.tsx",
                                lineNumber: 34,
                                columnNumber: 38
                            }, this)
                        ]
                    }, void 0, true, {
                        fileName: "[project]/src/components/layout/Sidebar.tsx",
                        lineNumber: 32,
                        columnNumber: 17
                    }, this),
                    /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$next$2f$dist$2f$server$2f$route$2d$modules$2f$app$2d$page$2f$vendored$2f$ssr$2f$react$2d$jsx$2d$dev$2d$runtime$2e$js__$5b$app$2d$ssr$5d$__$28$ecmascript$29$__["jsxDEV"])("button", {
                        onClick: toggleCollapse,
                        className: "jsx-8e7f2cc34759cc3" + " " + "collapse-toggle",
                        children: isCollapsed ? /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$next$2f$dist$2f$server$2f$route$2d$modules$2f$app$2d$page$2f$vendored$2f$ssr$2f$react$2d$jsx$2d$dev$2d$runtime$2e$js__$5b$app$2d$ssr$5d$__$28$ecmascript$29$__["jsxDEV"])(__TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$lucide$2d$react$2f$dist$2f$esm$2f$icons$2f$chevron$2d$right$2e$js__$5b$app$2d$ssr$5d$__$28$ecmascript$29$__$3c$export__default__as__ChevronRight$3e$__["ChevronRight"], {
                            size: 16
                        }, void 0, false, {
                            fileName: "[project]/src/components/layout/Sidebar.tsx",
                            lineNumber: 37,
                            columnNumber: 36
                        }, this) : /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$next$2f$dist$2f$server$2f$route$2d$modules$2f$app$2d$page$2f$vendored$2f$ssr$2f$react$2d$jsx$2d$dev$2d$runtime$2e$js__$5b$app$2d$ssr$5d$__$28$ecmascript$29$__["jsxDEV"])(__TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$lucide$2d$react$2f$dist$2f$esm$2f$icons$2f$chevron$2d$left$2e$js__$5b$app$2d$ssr$5d$__$28$ecmascript$29$__$3c$export__default__as__ChevronLeft$3e$__["ChevronLeft"], {
                            size: 16
                        }, void 0, false, {
                            fileName: "[project]/src/components/layout/Sidebar.tsx",
                            lineNumber: 37,
                            columnNumber: 65
                        }, this)
                    }, void 0, false, {
                        fileName: "[project]/src/components/layout/Sidebar.tsx",
                        lineNumber: 36,
                        columnNumber: 17
                    }, this)
                ]
            }, void 0, true, {
                fileName: "[project]/src/components/layout/Sidebar.tsx",
                lineNumber: 31,
                columnNumber: 13
            }, this),
            /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$next$2f$dist$2f$server$2f$route$2d$modules$2f$app$2d$page$2f$vendored$2f$ssr$2f$react$2d$jsx$2d$dev$2d$runtime$2e$js__$5b$app$2d$ssr$5d$__$28$ecmascript$29$__["jsxDEV"])("nav", {
                className: "jsx-8e7f2cc34759cc3" + " " + "sidebar-nav",
                children: menuItems.map((item)=>/*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$next$2f$dist$2f$server$2f$route$2d$modules$2f$app$2d$page$2f$vendored$2f$ssr$2f$react$2d$jsx$2d$dev$2d$runtime$2e$js__$5b$app$2d$ssr$5d$__$28$ecmascript$29$__["jsxDEV"])("button", {
                        onClick: ()=>onViewChange(item.id),
                        title: isCollapsed ? item.label : undefined,
                        className: "jsx-8e7f2cc34759cc3" + " " + `nav-item ${activeView === item.id ? 'active' : ''}`,
                        children: [
                            item.icon,
                            !isCollapsed && /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$next$2f$dist$2f$server$2f$route$2d$modules$2f$app$2d$page$2f$vendored$2f$ssr$2f$react$2d$jsx$2d$dev$2d$runtime$2e$js__$5b$app$2d$ssr$5d$__$28$ecmascript$29$__["jsxDEV"])("span", {
                                className: "jsx-8e7f2cc34759cc3",
                                children: item.label
                            }, void 0, false, {
                                fileName: "[project]/src/components/layout/Sidebar.tsx",
                                lineNumber: 50,
                                columnNumber: 42
                            }, this)
                        ]
                    }, item.id, true, {
                        fileName: "[project]/src/components/layout/Sidebar.tsx",
                        lineNumber: 43,
                        columnNumber: 21
                    }, this))
            }, void 0, false, {
                fileName: "[project]/src/components/layout/Sidebar.tsx",
                lineNumber: 41,
                columnNumber: 13
            }, this),
            /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$next$2f$dist$2f$server$2f$route$2d$modules$2f$app$2d$page$2f$vendored$2f$ssr$2f$react$2d$jsx$2d$dev$2d$runtime$2e$js__$5b$app$2d$ssr$5d$__$28$ecmascript$29$__["jsxDEV"])("div", {
                className: "jsx-8e7f2cc34759cc3" + " " + "sidebar-footer",
                children: [
                    userName && /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$next$2f$dist$2f$server$2f$route$2d$modules$2f$app$2d$page$2f$vendored$2f$ssr$2f$react$2d$jsx$2d$dev$2d$runtime$2e$js__$5b$app$2d$ssr$5d$__$28$ecmascript$29$__["jsxDEV"])("div", {
                        className: "jsx-8e7f2cc34759cc3" + " " + "user-info",
                        children: [
                            /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$next$2f$dist$2f$server$2f$route$2d$modules$2f$app$2d$page$2f$vendored$2f$ssr$2f$react$2d$jsx$2d$dev$2d$runtime$2e$js__$5b$app$2d$ssr$5d$__$28$ecmascript$29$__["jsxDEV"])("div", {
                                className: "jsx-8e7f2cc34759cc3" + " " + "user-avatar",
                                children: userName.charAt(0).toUpperCase()
                            }, void 0, false, {
                                fileName: "[project]/src/components/layout/Sidebar.tsx",
                                lineNumber: 58,
                                columnNumber: 25
                            }, this),
                            !isCollapsed && /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$next$2f$dist$2f$server$2f$route$2d$modules$2f$app$2d$page$2f$vendored$2f$ssr$2f$react$2d$jsx$2d$dev$2d$runtime$2e$js__$5b$app$2d$ssr$5d$__$28$ecmascript$29$__["jsxDEV"])("div", {
                                className: "jsx-8e7f2cc34759cc3" + " " + "user-details",
                                children: /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$next$2f$dist$2f$server$2f$route$2d$modules$2f$app$2d$page$2f$vendored$2f$ssr$2f$react$2d$jsx$2d$dev$2d$runtime$2e$js__$5b$app$2d$ssr$5d$__$28$ecmascript$29$__["jsxDEV"])("span", {
                                    className: "jsx-8e7f2cc34759cc3" + " " + "user-name",
                                    children: userName
                                }, void 0, false, {
                                    fileName: "[project]/src/components/layout/Sidebar.tsx",
                                    lineNumber: 63,
                                    columnNumber: 33
                                }, this)
                            }, void 0, false, {
                                fileName: "[project]/src/components/layout/Sidebar.tsx",
                                lineNumber: 62,
                                columnNumber: 29
                            }, this)
                        ]
                    }, void 0, true, {
                        fileName: "[project]/src/components/layout/Sidebar.tsx",
                        lineNumber: 57,
                        columnNumber: 21
                    }, this),
                    /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$next$2f$dist$2f$server$2f$route$2d$modules$2f$app$2d$page$2f$vendored$2f$ssr$2f$react$2d$jsx$2d$dev$2d$runtime$2e$js__$5b$app$2d$ssr$5d$__$28$ecmascript$29$__["jsxDEV"])("button", {
                        onClick: onLogout,
                        title: isCollapsed ? t('sidebar.logout') : undefined,
                        className: "jsx-8e7f2cc34759cc3" + " " + "nav-item logout-btn",
                        children: [
                            /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$next$2f$dist$2f$server$2f$route$2d$modules$2f$app$2d$page$2f$vendored$2f$ssr$2f$react$2d$jsx$2d$dev$2d$runtime$2e$js__$5b$app$2d$ssr$5d$__$28$ecmascript$29$__["jsxDEV"])(__TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$lucide$2d$react$2f$dist$2f$esm$2f$icons$2f$log$2d$out$2e$js__$5b$app$2d$ssr$5d$__$28$ecmascript$29$__$3c$export__default__as__LogOut$3e$__["LogOut"], {
                                size: 20
                            }, void 0, false, {
                                fileName: "[project]/src/components/layout/Sidebar.tsx",
                                lineNumber: 73,
                                columnNumber: 21
                            }, this),
                            !isCollapsed && /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$next$2f$dist$2f$server$2f$route$2d$modules$2f$app$2d$page$2f$vendored$2f$ssr$2f$react$2d$jsx$2d$dev$2d$runtime$2e$js__$5b$app$2d$ssr$5d$__$28$ecmascript$29$__["jsxDEV"])("span", {
                                className: "jsx-8e7f2cc34759cc3",
                                children: t('sidebar.logout')
                            }, void 0, false, {
                                fileName: "[project]/src/components/layout/Sidebar.tsx",
                                lineNumber: 74,
                                columnNumber: 38
                            }, this)
                        ]
                    }, void 0, true, {
                        fileName: "[project]/src/components/layout/Sidebar.tsx",
                        lineNumber: 68,
                        columnNumber: 17
                    }, this)
                ]
            }, void 0, true, {
                fileName: "[project]/src/components/layout/Sidebar.tsx",
                lineNumber: 55,
                columnNumber: 13
            }, this),
            /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$next$2f$dist$2f$server$2f$route$2d$modules$2f$app$2d$page$2f$vendored$2f$ssr$2f$react$2d$jsx$2d$dev$2d$runtime$2e$js__$5b$app$2d$ssr$5d$__$28$ecmascript$29$__["jsxDEV"])(__TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$styled$2d$jsx$2f$style$2e$js__$5b$app$2d$ssr$5d$__$28$ecmascript$29$__["default"], {
                id: "8e7f2cc34759cc3",
                children: '.sidebar.jsx-8e7f2cc34759cc3{-webkit-backdrop-filter:blur(30px)saturate(170%);z-index:100;background:linear-gradient(#ffffff26,#ffffff0f);border-right:1px solid #ffffff1f;flex-direction:column;width:260px;height:100vh;transition:width .3s cubic-bezier(.4,0,.2,1);display:flex;position:sticky;top:0;overflow:hidden;box-shadow:inset -1px 0 #ffffff0f}.sidebar.collapsed.jsx-8e7f2cc34759cc3{width:80px}.sidebar-header.jsx-8e7f2cc34759cc3{border-bottom:1px solid #ffffff14;justify-content:space-between;align-items:center;padding:32px 24px;display:flex;position:relative}.sidebar.collapsed.jsx-8e7f2cc34759cc3 .sidebar-header.jsx-8e7f2cc34759cc3{justify-content:center;padding:32px 0}.logo-container.jsx-8e7f2cc34759cc3{align-items:center;gap:12px;display:flex}.logo-orb.jsx-8e7f2cc34759cc3{background:radial-gradient(circle at 30% 30%,#ffffffd9,#fff3 28%,transparent 30%),linear-gradient(135deg,var(--primary),var(--secondary));width:32px;height:32px;box-shadow:0 12px 24px var(--primary-glow),inset 0 1px 0 #ffffff73;border-radius:50%;position:relative}.logo-orb.jsx-8e7f2cc34759cc3:after{content:"";background:#fff6;border-radius:50%;width:8px;height:8px;position:absolute;top:4px;left:4px}.logo-text.jsx-8e7f2cc34759cc3{letter-spacing:-.04em;-webkit-text-fill-color:transparent;background:linear-gradient(90deg,#fff,#d8e6ff);-webkit-background-clip:text;font-size:1.5rem;font-weight:700}.collapse-toggle.jsx-8e7f2cc34759cc3{cursor:pointer;width:28px;height:28px;color:var(--text-muted);z-index:10;background:#ffffff1f;border:1px solid #ffffff2e;border-radius:999px;justify-content:center;align-items:center;transition:all .2s;display:flex;position:absolute;top:40px;right:-12px}.sidebar.collapsed.jsx-8e7f2cc34759cc3 .collapse-toggle.jsx-8e7f2cc34759cc3{position:absolute;top:24px;right:auto;transform:translate(35px)}.collapse-toggle.jsx-8e7f2cc34759cc3:hover{color:var(--foreground);background:#ffffff2e;border-color:#ffffff4d;transform:translateY(-1px)}.sidebar-nav.jsx-8e7f2cc34759cc3{flex-direction:column;flex:1;gap:8px;padding:18px 16px;display:flex}.nav-item.jsx-8e7f2cc34759cc3{color:#e9f2ffc2;cursor:pointer;text-align:left;white-space:nowrap;-webkit-backdrop-filter:blur(16px);backdrop-filter:blur(16px);background:#ffffff08;border:1px solid #0000;border-radius:18px;align-items:center;gap:12px;width:100%;padding:12px 16px;font-size:.9375rem;font-weight:600;transition:all .28s;display:flex}.sidebar.collapsed.jsx-8e7f2cc34759cc3 .nav-item.jsx-8e7f2cc34759cc3{justify-content:center;padding:12px}.nav-item.jsx-8e7f2cc34759cc3:hover{color:var(--foreground);background:#ffffff1a;border-color:#ffffff24;transform:translate(2px)}.nav-item.active.jsx-8e7f2cc34759cc3{color:#f7fbff;background:linear-gradient(#a6c4ff3d,#89b6ff29);border-color:#c4d9ff42;box-shadow:inset 0 1px #ffffff29,0 12px 24px #74a1ff24}.sidebar-footer.jsx-8e7f2cc34759cc3{border-top:1px solid #ffffff14;flex-direction:column;gap:16px;padding:24px 16px;display:flex}.user-info.jsx-8e7f2cc34759cc3{align-items:center;gap:12px;padding:0 8px;display:flex}.sidebar.collapsed.jsx-8e7f2cc34759cc3 .user-info.jsx-8e7f2cc34759cc3{justify-content:center;padding:0}.user-avatar.jsx-8e7f2cc34759cc3{color:#fff;background:linear-gradient(#ffffff2e,#ffffff14);border:1px solid #ffffff29;border-radius:50%;justify-content:center;align-items:center;width:36px;height:36px;font-weight:600;display:flex;box-shadow:inset 0 1px #fff3}.user-details.jsx-8e7f2cc34759cc3{flex-direction:column;display:flex;overflow:hidden}.user-name.jsx-8e7f2cc34759cc3{color:var(--foreground);white-space:nowrap;text-overflow:ellipsis;font-size:.875rem;font-weight:500;overflow:hidden}.logout-btn.jsx-8e7f2cc34759cc3{color:#f87171}.logout-btn.jsx-8e7f2cc34759cc3:hover{color:#ef4444;background:#f871711a}'
            }, void 0, false, void 0, this)
        ]
    }, void 0, true, {
        fileName: "[project]/src/components/layout/Sidebar.tsx",
        lineNumber: 30,
        columnNumber: 9
    }, this);
}
}),
"[project]/src/components/layout/DashboardLayout.tsx [app-ssr] (ecmascript)", ((__turbopack_context__) => {
"use strict";

__turbopack_context__.s([
    "default",
    ()=>DashboardLayout
]);
var __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$next$2f$dist$2f$server$2f$route$2d$modules$2f$app$2d$page$2f$vendored$2f$ssr$2f$react$2d$jsx$2d$dev$2d$runtime$2e$js__$5b$app$2d$ssr$5d$__$28$ecmascript$29$__ = __turbopack_context__.i("[project]/node_modules/next/dist/server/route-modules/app-page/vendored/ssr/react-jsx-dev-runtime.js [app-ssr] (ecmascript)");
var __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$styled$2d$jsx$2f$style$2e$js__$5b$app$2d$ssr$5d$__$28$ecmascript$29$__ = __turbopack_context__.i("[project]/node_modules/styled-jsx/style.js [app-ssr] (ecmascript)");
var __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$next$2f$dist$2f$server$2f$route$2d$modules$2f$app$2d$page$2f$vendored$2f$ssr$2f$react$2e$js__$5b$app$2d$ssr$5d$__$28$ecmascript$29$__ = __turbopack_context__.i("[project]/node_modules/next/dist/server/route-modules/app-page/vendored/ssr/react.js [app-ssr] (ecmascript)");
var __TURBOPACK__imported__module__$5b$project$5d2f$src$2f$components$2f$layout$2f$Sidebar$2e$tsx__$5b$app$2d$ssr$5d$__$28$ecmascript$29$__ = __turbopack_context__.i("[project]/src/components/layout/Sidebar.tsx [app-ssr] (ecmascript)");
'use client';
;
;
;
;
function DashboardLayout({ children, activeView, onViewChange, onLogout, userName }) {
    (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$next$2f$dist$2f$server$2f$route$2d$modules$2f$app$2d$page$2f$vendored$2f$ssr$2f$react$2e$js__$5b$app$2d$ssr$5d$__$28$ecmascript$29$__["useEffect"])(()=>{
        const previousBodyOverflow = document.body.style.overflow;
        const previousHtmlOverflow = document.documentElement.style.overflow;
        document.body.style.overflow = 'hidden';
        document.documentElement.style.overflow = 'hidden';
        return ()=>{
            document.body.style.overflow = previousBodyOverflow;
            document.documentElement.style.overflow = previousHtmlOverflow;
        };
    }, []);
    return /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$next$2f$dist$2f$server$2f$route$2d$modules$2f$app$2d$page$2f$vendored$2f$ssr$2f$react$2d$jsx$2d$dev$2d$runtime$2e$js__$5b$app$2d$ssr$5d$__$28$ecmascript$29$__["jsxDEV"])("div", {
        className: "jsx-b896981614e51acf" + " " + "dashboard-layout",
        children: [
            /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$next$2f$dist$2f$server$2f$route$2d$modules$2f$app$2d$page$2f$vendored$2f$ssr$2f$react$2d$jsx$2d$dev$2d$runtime$2e$js__$5b$app$2d$ssr$5d$__$28$ecmascript$29$__["jsxDEV"])(__TURBOPACK__imported__module__$5b$project$5d2f$src$2f$components$2f$layout$2f$Sidebar$2e$tsx__$5b$app$2d$ssr$5d$__$28$ecmascript$29$__["default"], {
                activeView: activeView,
                onViewChange: onViewChange,
                onLogout: onLogout,
                userName: userName
            }, void 0, false, {
                fileName: "[project]/src/components/layout/DashboardLayout.tsx",
                lineNumber: 36,
                columnNumber: 13
            }, this),
            /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$next$2f$dist$2f$server$2f$route$2d$modules$2f$app$2d$page$2f$vendored$2f$ssr$2f$react$2d$jsx$2d$dev$2d$runtime$2e$js__$5b$app$2d$ssr$5d$__$28$ecmascript$29$__["jsxDEV"])("main", {
                className: "jsx-b896981614e51acf" + " " + "dashboard-content",
                children: children
            }, void 0, false, {
                fileName: "[project]/src/components/layout/DashboardLayout.tsx",
                lineNumber: 42,
                columnNumber: 13
            }, this),
            /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$next$2f$dist$2f$server$2f$route$2d$modules$2f$app$2d$page$2f$vendored$2f$ssr$2f$react$2d$jsx$2d$dev$2d$runtime$2e$js__$5b$app$2d$ssr$5d$__$28$ecmascript$29$__["jsxDEV"])(__TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$styled$2d$jsx$2f$style$2e$js__$5b$app$2d$ssr$5d$__$28$ecmascript$29$__["default"], {
                id: "b896981614e51acf",
                children: ".dashboard-layout.jsx-b896981614e51acf{background:0 0;height:100vh;display:flex;overflow:hidden}.dashboard-content.jsx-b896981614e51acf{flex:1;height:100vh;padding:0 0 0 18px;position:relative;overflow:hidden auto}"
            }, void 0, false, void 0, this)
        ]
    }, void 0, true, {
        fileName: "[project]/src/components/layout/DashboardLayout.tsx",
        lineNumber: 35,
        columnNumber: 9
    }, this);
}
}),
"[project]/src/components/upload/FileDropzone.module.css [app-ssr] (css module)", ((__turbopack_context__) => {

__turbopack_context__.v({
  "dragging": "FileDropzone-module__xT1dYG__dragging",
  "dropzone": "FileDropzone-module__xT1dYG__dropzone",
  "error": "FileDropzone-module__xT1dYG__error",
  "errorBanner": "FileDropzone-module__xT1dYG__errorBanner",
  "formatBadge": "FileDropzone-module__xT1dYG__formatBadge",
  "iconWrapper": "FileDropzone-module__xT1dYG__iconWrapper",
});
}),
"[project]/src/components/upload/FileDropzone.tsx [app-ssr] (ecmascript)", ((__turbopack_context__) => {
"use strict";

__turbopack_context__.s([
    "default",
    ()=>FileDropzone
]);
var __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$next$2f$dist$2f$server$2f$route$2d$modules$2f$app$2d$page$2f$vendored$2f$ssr$2f$react$2d$jsx$2d$dev$2d$runtime$2e$js__$5b$app$2d$ssr$5d$__$28$ecmascript$29$__ = __turbopack_context__.i("[project]/node_modules/next/dist/server/route-modules/app-page/vendored/ssr/react-jsx-dev-runtime.js [app-ssr] (ecmascript)");
var __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$next$2f$dist$2f$server$2f$route$2d$modules$2f$app$2d$page$2f$vendored$2f$ssr$2f$react$2e$js__$5b$app$2d$ssr$5d$__$28$ecmascript$29$__ = __turbopack_context__.i("[project]/node_modules/next/dist/server/route-modules/app-page/vendored/ssr/react.js [app-ssr] (ecmascript)");
var __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$lucide$2d$react$2f$dist$2f$esm$2f$icons$2f$upload$2e$js__$5b$app$2d$ssr$5d$__$28$ecmascript$29$__$3c$export__default__as__Upload$3e$__ = __turbopack_context__.i("[project]/node_modules/lucide-react/dist/esm/icons/upload.js [app-ssr] (ecmascript) <export default as Upload>");
var __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$lucide$2d$react$2f$dist$2f$esm$2f$icons$2f$x$2e$js__$5b$app$2d$ssr$5d$__$28$ecmascript$29$__$3c$export__default__as__X$3e$__ = __turbopack_context__.i("[project]/node_modules/lucide-react/dist/esm/icons/x.js [app-ssr] (ecmascript) <export default as X>");
var __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$lucide$2d$react$2f$dist$2f$esm$2f$icons$2f$circle$2d$check$2e$js__$5b$app$2d$ssr$5d$__$28$ecmascript$29$__$3c$export__default__as__CheckCircle2$3e$__ = __turbopack_context__.i("[project]/node_modules/lucide-react/dist/esm/icons/circle-check.js [app-ssr] (ecmascript) <export default as CheckCircle2>");
var __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$lucide$2d$react$2f$dist$2f$esm$2f$icons$2f$circle$2d$alert$2e$js__$5b$app$2d$ssr$5d$__$28$ecmascript$29$__$3c$export__default__as__AlertCircle$3e$__ = __turbopack_context__.i("[project]/node_modules/lucide-react/dist/esm/icons/circle-alert.js [app-ssr] (ecmascript) <export default as AlertCircle>");
var __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$clsx$2f$dist$2f$clsx$2e$mjs__$5b$app$2d$ssr$5d$__$28$ecmascript$29$__ = __turbopack_context__.i("[project]/node_modules/clsx/dist/clsx.mjs [app-ssr] (ecmascript)");
var __TURBOPACK__imported__module__$5b$project$5d2f$src$2f$components$2f$upload$2f$FileDropzone$2e$module$2e$css__$5b$app$2d$ssr$5d$__$28$css__module$29$__ = __turbopack_context__.i("[project]/src/components/upload/FileDropzone.module.css [app-ssr] (css module)");
'use client';
;
;
;
;
;
function FileDropzone({ onFileSelect }) {
    const [isDragging, setIsDragging] = (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$next$2f$dist$2f$server$2f$route$2d$modules$2f$app$2d$page$2f$vendored$2f$ssr$2f$react$2e$js__$5b$app$2d$ssr$5d$__$28$ecmascript$29$__["useState"])(false);
    const [selectedFile, setSelectedFile] = (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$next$2f$dist$2f$server$2f$route$2d$modules$2f$app$2d$page$2f$vendored$2f$ssr$2f$react$2e$js__$5b$app$2d$ssr$5d$__$28$ecmascript$29$__["useState"])(null);
    const [error, setError] = (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$next$2f$dist$2f$server$2f$route$2d$modules$2f$app$2d$page$2f$vendored$2f$ssr$2f$react$2e$js__$5b$app$2d$ssr$5d$__$28$ecmascript$29$__["useState"])(null);
    const validateFile = (file)=>{
        const validExtensions = [
            '.csv',
            '.json',
            '.xlsx',
            '.xls'
        ];
        const fileName = file.name.toLowerCase();
        const isValid = validExtensions.some((ext)=>fileName.endsWith(ext));
        if (!isValid) {
            setError('Unsupported file format. Please upload CSV, JSON, or Excel.');
            return false;
        }
        if (file.size > 50 * 1024 * 1024) {
            setError('File size exceeds 50MB limit.');
            return false;
        }
        setError(null);
        return true;
    };
    const handleDragOver = (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$next$2f$dist$2f$server$2f$route$2d$modules$2f$app$2d$page$2f$vendored$2f$ssr$2f$react$2e$js__$5b$app$2d$ssr$5d$__$28$ecmascript$29$__["useCallback"])((e)=>{
        e.preventDefault();
        setIsDragging(true);
    }, []);
    const handleDragLeave = (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$next$2f$dist$2f$server$2f$route$2d$modules$2f$app$2d$page$2f$vendored$2f$ssr$2f$react$2e$js__$5b$app$2d$ssr$5d$__$28$ecmascript$29$__["useCallback"])((e)=>{
        e.preventDefault();
        setIsDragging(false);
    }, []);
    const handleDrop = (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$next$2f$dist$2f$server$2f$route$2d$modules$2f$app$2d$page$2f$vendored$2f$ssr$2f$react$2e$js__$5b$app$2d$ssr$5d$__$28$ecmascript$29$__["useCallback"])((e)=>{
        e.preventDefault();
        setIsDragging(false);
        const file = e.dataTransfer.files[0];
        if (file && validateFile(file)) {
            setSelectedFile(file);
            onFileSelect(file);
        }
    }, [
        onFileSelect
    ]);
    const handleFileChange = (e)=>{
        const file = e.target.files?.[0];
        if (file && validateFile(file)) {
            setSelectedFile(file);
            onFileSelect(file);
        }
    };
    const clearFile = (e)=>{
        e.stopPropagation();
        setSelectedFile(null);
        setError(null);
    };
    return /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$next$2f$dist$2f$server$2f$route$2d$modules$2f$app$2d$page$2f$vendored$2f$ssr$2f$react$2d$jsx$2d$dev$2d$runtime$2e$js__$5b$app$2d$ssr$5d$__$28$ecmascript$29$__["jsxDEV"])("div", {
        style: {
            width: '100%'
        },
        children: /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$next$2f$dist$2f$server$2f$route$2d$modules$2f$app$2d$page$2f$vendored$2f$ssr$2f$react$2d$jsx$2d$dev$2d$runtime$2e$js__$5b$app$2d$ssr$5d$__$28$ecmascript$29$__["jsxDEV"])("div", {
            onDragOver: handleDragOver,
            onDragLeave: handleDragLeave,
            onDrop: handleDrop,
            className: (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$clsx$2f$dist$2f$clsx$2e$mjs__$5b$app$2d$ssr$5d$__$28$ecmascript$29$__["clsx"])(__TURBOPACK__imported__module__$5b$project$5d2f$src$2f$components$2f$upload$2f$FileDropzone$2e$module$2e$css__$5b$app$2d$ssr$5d$__$28$css__module$29$__["default"].dropzone, isDragging && __TURBOPACK__imported__module__$5b$project$5d2f$src$2f$components$2f$upload$2f$FileDropzone$2e$module$2e$css__$5b$app$2d$ssr$5d$__$28$css__module$29$__["default"].dragging, error && __TURBOPACK__imported__module__$5b$project$5d2f$src$2f$components$2f$upload$2f$FileDropzone$2e$module$2e$css__$5b$app$2d$ssr$5d$__$28$css__module$29$__["default"].error),
            onClick: ()=>document.getElementById('file-upload')?.click(),
            children: [
                /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$next$2f$dist$2f$server$2f$route$2d$modules$2f$app$2d$page$2f$vendored$2f$ssr$2f$react$2d$jsx$2d$dev$2d$runtime$2e$js__$5b$app$2d$ssr$5d$__$28$ecmascript$29$__["jsxDEV"])("input", {
                    id: "file-upload",
                    type: "file",
                    style: {
                        display: 'none'
                    },
                    accept: ".csv,.json,.xlsx,.xls",
                    onChange: handleFileChange
                }, void 0, false, {
                    fileName: "[project]/src/components/upload/FileDropzone.tsx",
                    lineNumber: 84,
                    columnNumber: 17
                }, this),
                selectedFile ? /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$next$2f$dist$2f$server$2f$route$2d$modules$2f$app$2d$page$2f$vendored$2f$ssr$2f$react$2d$jsx$2d$dev$2d$runtime$2e$js__$5b$app$2d$ssr$5d$__$28$ecmascript$29$__["jsxDEV"])("div", {
                    style: {
                        display: 'flex',
                        flexDirection: 'column',
                        alignItems: 'center'
                    },
                    children: [
                        /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$next$2f$dist$2f$server$2f$route$2d$modules$2f$app$2d$page$2f$vendored$2f$ssr$2f$react$2d$jsx$2d$dev$2d$runtime$2e$js__$5b$app$2d$ssr$5d$__$28$ecmascript$29$__["jsxDEV"])("div", {
                            className: __TURBOPACK__imported__module__$5b$project$5d2f$src$2f$components$2f$upload$2f$FileDropzone$2e$module$2e$css__$5b$app$2d$ssr$5d$__$28$css__module$29$__["default"].iconWrapper,
                            style: {
                                background: 'rgba(139, 92, 246, 0.1)',
                                border: 'none'
                            },
                            children: /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$next$2f$dist$2f$server$2f$route$2d$modules$2f$app$2d$page$2f$vendored$2f$ssr$2f$react$2d$jsx$2d$dev$2d$runtime$2e$js__$5b$app$2d$ssr$5d$__$28$ecmascript$29$__["jsxDEV"])(__TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$lucide$2d$react$2f$dist$2f$esm$2f$icons$2f$circle$2d$check$2e$js__$5b$app$2d$ssr$5d$__$28$ecmascript$29$__$3c$export__default__as__CheckCircle2$3e$__["CheckCircle2"], {
                                size: 32,
                                color: "var(--primary)"
                            }, void 0, false, {
                                fileName: "[project]/src/components/upload/FileDropzone.tsx",
                                lineNumber: 95,
                                columnNumber: 29
                            }, this)
                        }, void 0, false, {
                            fileName: "[project]/src/components/upload/FileDropzone.tsx",
                            lineNumber: 94,
                            columnNumber: 25
                        }, this),
                        /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$next$2f$dist$2f$server$2f$route$2d$modules$2f$app$2d$page$2f$vendored$2f$ssr$2f$react$2d$jsx$2d$dev$2d$runtime$2e$js__$5b$app$2d$ssr$5d$__$28$ecmascript$29$__["jsxDEV"])("h3", {
                            style: {
                                fontSize: '1.125rem',
                                fontWeight: 600,
                                marginBottom: '4px'
                            },
                            children: selectedFile.name
                        }, void 0, false, {
                            fileName: "[project]/src/components/upload/FileDropzone.tsx",
                            lineNumber: 97,
                            columnNumber: 25
                        }, this),
                        /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$next$2f$dist$2f$server$2f$route$2d$modules$2f$app$2d$page$2f$vendored$2f$ssr$2f$react$2d$jsx$2d$dev$2d$runtime$2e$js__$5b$app$2d$ssr$5d$__$28$ecmascript$29$__["jsxDEV"])("p", {
                            style: {
                                fontSize: '0.875rem',
                                color: 'var(--text-muted)',
                                marginBottom: '16px'
                            },
                            children: [
                                (selectedFile.size / (1024 * 1024)).toFixed(2),
                                " MB • Ready to process"
                            ]
                        }, void 0, true, {
                            fileName: "[project]/src/components/upload/FileDropzone.tsx",
                            lineNumber: 98,
                            columnNumber: 25
                        }, this),
                        /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$next$2f$dist$2f$server$2f$route$2d$modules$2f$app$2d$page$2f$vendored$2f$ssr$2f$react$2d$jsx$2d$dev$2d$runtime$2e$js__$5b$app$2d$ssr$5d$__$28$ecmascript$29$__["jsxDEV"])("button", {
                            type: "button",
                            onClick: clearFile,
                            style: {
                                display: 'flex',
                                alignItems: 'center',
                                gap: '8px',
                                fontSize: '0.875rem',
                                color: '#f87171',
                                background: 'transparent',
                                border: 'none',
                                cursor: 'pointer'
                            },
                            children: [
                                /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$next$2f$dist$2f$server$2f$route$2d$modules$2f$app$2d$page$2f$vendored$2f$ssr$2f$react$2d$jsx$2d$dev$2d$runtime$2e$js__$5b$app$2d$ssr$5d$__$28$ecmascript$29$__["jsxDEV"])(__TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$lucide$2d$react$2f$dist$2f$esm$2f$icons$2f$x$2e$js__$5b$app$2d$ssr$5d$__$28$ecmascript$29$__$3c$export__default__as__X$3e$__["X"], {
                                    size: 14
                                }, void 0, false, {
                                    fileName: "[project]/src/components/upload/FileDropzone.tsx",
                                    lineNumber: 115,
                                    columnNumber: 29
                                }, this),
                                " Remove and try another"
                            ]
                        }, void 0, true, {
                            fileName: "[project]/src/components/upload/FileDropzone.tsx",
                            lineNumber: 101,
                            columnNumber: 25
                        }, this)
                    ]
                }, void 0, true, {
                    fileName: "[project]/src/components/upload/FileDropzone.tsx",
                    lineNumber: 93,
                    columnNumber: 21
                }, this) : /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$next$2f$dist$2f$server$2f$route$2d$modules$2f$app$2d$page$2f$vendored$2f$ssr$2f$react$2d$jsx$2d$dev$2d$runtime$2e$js__$5b$app$2d$ssr$5d$__$28$ecmascript$29$__["jsxDEV"])(__TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$next$2f$dist$2f$server$2f$route$2d$modules$2f$app$2d$page$2f$vendored$2f$ssr$2f$react$2d$jsx$2d$dev$2d$runtime$2e$js__$5b$app$2d$ssr$5d$__$28$ecmascript$29$__["Fragment"], {
                    children: [
                        /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$next$2f$dist$2f$server$2f$route$2d$modules$2f$app$2d$page$2f$vendored$2f$ssr$2f$react$2d$jsx$2d$dev$2d$runtime$2e$js__$5b$app$2d$ssr$5d$__$28$ecmascript$29$__["jsxDEV"])("div", {
                            className: __TURBOPACK__imported__module__$5b$project$5d2f$src$2f$components$2f$upload$2f$FileDropzone$2e$module$2e$css__$5b$app$2d$ssr$5d$__$28$css__module$29$__["default"].iconWrapper,
                            children: /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$next$2f$dist$2f$server$2f$route$2d$modules$2f$app$2d$page$2f$vendored$2f$ssr$2f$react$2d$jsx$2d$dev$2d$runtime$2e$js__$5b$app$2d$ssr$5d$__$28$ecmascript$29$__["jsxDEV"])(__TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$lucide$2d$react$2f$dist$2f$esm$2f$icons$2f$upload$2e$js__$5b$app$2d$ssr$5d$__$28$ecmascript$29$__$3c$export__default__as__Upload$3e$__["Upload"], {
                                size: 32,
                                color: "var(--primary)"
                            }, void 0, false, {
                                fileName: "[project]/src/components/upload/FileDropzone.tsx",
                                lineNumber: 121,
                                columnNumber: 29
                            }, this)
                        }, void 0, false, {
                            fileName: "[project]/src/components/upload/FileDropzone.tsx",
                            lineNumber: 120,
                            columnNumber: 25
                        }, this),
                        /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$next$2f$dist$2f$server$2f$route$2d$modules$2f$app$2d$page$2f$vendored$2f$ssr$2f$react$2d$jsx$2d$dev$2d$runtime$2e$js__$5b$app$2d$ssr$5d$__$28$ecmascript$29$__["jsxDEV"])("h3", {
                            style: {
                                fontSize: '1.25rem',
                                fontWeight: 700,
                                marginBottom: '8px'
                            },
                            children: "Drop your dataset here"
                        }, void 0, false, {
                            fileName: "[project]/src/components/upload/FileDropzone.tsx",
                            lineNumber: 123,
                            columnNumber: 25
                        }, this),
                        /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$next$2f$dist$2f$server$2f$route$2d$modules$2f$app$2d$page$2f$vendored$2f$ssr$2f$react$2d$jsx$2d$dev$2d$runtime$2e$js__$5b$app$2d$ssr$5d$__$28$ecmascript$29$__["jsxDEV"])("p", {
                            style: {
                                color: 'var(--text-muted)',
                                marginBottom: '24px'
                            },
                            children: "Drag and drop your file, or click to browse"
                        }, void 0, false, {
                            fileName: "[project]/src/components/upload/FileDropzone.tsx",
                            lineNumber: 124,
                            columnNumber: 25
                        }, this),
                        /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$next$2f$dist$2f$server$2f$route$2d$modules$2f$app$2d$page$2f$vendored$2f$ssr$2f$react$2d$jsx$2d$dev$2d$runtime$2e$js__$5b$app$2d$ssr$5d$__$28$ecmascript$29$__["jsxDEV"])("div", {
                            style: {
                                display: 'flex',
                                gap: '16px',
                                justifyContent: 'center'
                            },
                            children: [
                                'CSV',
                                'JSON',
                                'Excel'
                            ].map((format)=>/*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$next$2f$dist$2f$server$2f$route$2d$modules$2f$app$2d$page$2f$vendored$2f$ssr$2f$react$2d$jsx$2d$dev$2d$runtime$2e$js__$5b$app$2d$ssr$5d$__$28$ecmascript$29$__["jsxDEV"])("span", {
                                    className: __TURBOPACK__imported__module__$5b$project$5d2f$src$2f$components$2f$upload$2f$FileDropzone$2e$module$2e$css__$5b$app$2d$ssr$5d$__$28$css__module$29$__["default"].formatBadge,
                                    children: format
                                }, format, false, {
                                    fileName: "[project]/src/components/upload/FileDropzone.tsx",
                                    lineNumber: 129,
                                    columnNumber: 33
                                }, this))
                        }, void 0, false, {
                            fileName: "[project]/src/components/upload/FileDropzone.tsx",
                            lineNumber: 127,
                            columnNumber: 25
                        }, this)
                    ]
                }, void 0, true),
                error && /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$next$2f$dist$2f$server$2f$route$2d$modules$2f$app$2d$page$2f$vendored$2f$ssr$2f$react$2d$jsx$2d$dev$2d$runtime$2e$js__$5b$app$2d$ssr$5d$__$28$ecmascript$29$__["jsxDEV"])("div", {
                    className: __TURBOPACK__imported__module__$5b$project$5d2f$src$2f$components$2f$upload$2f$FileDropzone$2e$module$2e$css__$5b$app$2d$ssr$5d$__$28$css__module$29$__["default"].errorBanner,
                    children: [
                        /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$next$2f$dist$2f$server$2f$route$2d$modules$2f$app$2d$page$2f$vendored$2f$ssr$2f$react$2d$jsx$2d$dev$2d$runtime$2e$js__$5b$app$2d$ssr$5d$__$28$ecmascript$29$__["jsxDEV"])(__TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$lucide$2d$react$2f$dist$2f$esm$2f$icons$2f$circle$2d$alert$2e$js__$5b$app$2d$ssr$5d$__$28$ecmascript$29$__$3c$export__default__as__AlertCircle$3e$__["AlertCircle"], {
                            size: 16
                        }, void 0, false, {
                            fileName: "[project]/src/components/upload/FileDropzone.tsx",
                            lineNumber: 139,
                            columnNumber: 25
                        }, this),
                        /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$next$2f$dist$2f$server$2f$route$2d$modules$2f$app$2d$page$2f$vendored$2f$ssr$2f$react$2d$jsx$2d$dev$2d$runtime$2e$js__$5b$app$2d$ssr$5d$__$28$ecmascript$29$__["jsxDEV"])("span", {
                            children: error
                        }, void 0, false, {
                            fileName: "[project]/src/components/upload/FileDropzone.tsx",
                            lineNumber: 140,
                            columnNumber: 25
                        }, this)
                    ]
                }, void 0, true, {
                    fileName: "[project]/src/components/upload/FileDropzone.tsx",
                    lineNumber: 138,
                    columnNumber: 21
                }, this)
            ]
        }, void 0, true, {
            fileName: "[project]/src/components/upload/FileDropzone.tsx",
            lineNumber: 73,
            columnNumber: 13
        }, this)
    }, void 0, false, {
        fileName: "[project]/src/components/upload/FileDropzone.tsx",
        lineNumber: 72,
        columnNumber: 9
    }, this);
}
}),
"[project]/src/lib/dateUtils.ts [app-ssr] (ecmascript)", ((__turbopack_context__) => {
"use strict";

/**
 * Formats a date string or object to DD/MM/YYYY format.
 * Returns the original string or a fallback if the date is invalid.
 */ __turbopack_context__.s([
    "formatDate",
    ()=>formatDate
]);
function formatDate(date) {
    if (!date) return '';
    try {
        const d = new Date(date);
        // Check if date is valid
        if (isNaN(d.getTime())) {
            return String(date);
        }
        const day = String(d.getDate()).padStart(2, '0');
        const month = String(d.getMonth() + 1).padStart(2, '0');
        const year = d.getFullYear();
        return `${day}/${month}/${year}`;
    } catch (e) {
        return String(date);
    }
}
}),
"[project]/src/components/ui/DataTable.tsx [app-ssr] (ecmascript)", ((__turbopack_context__) => {
"use strict";

__turbopack_context__.s([
    "default",
    ()=>DataTable
]);
var __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$next$2f$dist$2f$server$2f$route$2d$modules$2f$app$2d$page$2f$vendored$2f$ssr$2f$react$2d$jsx$2d$dev$2d$runtime$2e$js__$5b$app$2d$ssr$5d$__$28$ecmascript$29$__ = __turbopack_context__.i("[project]/node_modules/next/dist/server/route-modules/app-page/vendored/ssr/react-jsx-dev-runtime.js [app-ssr] (ecmascript)");
var __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$styled$2d$jsx$2f$style$2e$js__$5b$app$2d$ssr$5d$__$28$ecmascript$29$__ = __turbopack_context__.i("[project]/node_modules/styled-jsx/style.js [app-ssr] (ecmascript)");
var __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$next$2f$dist$2f$server$2f$route$2d$modules$2f$app$2d$page$2f$vendored$2f$ssr$2f$react$2e$js__$5b$app$2d$ssr$5d$__$28$ecmascript$29$__ = __turbopack_context__.i("[project]/node_modules/next/dist/server/route-modules/app-page/vendored/ssr/react.js [app-ssr] (ecmascript)");
var __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$lucide$2d$react$2f$dist$2f$esm$2f$icons$2f$chevron$2d$up$2e$js__$5b$app$2d$ssr$5d$__$28$ecmascript$29$__$3c$export__default__as__ChevronUp$3e$__ = __turbopack_context__.i("[project]/node_modules/lucide-react/dist/esm/icons/chevron-up.js [app-ssr] (ecmascript) <export default as ChevronUp>");
var __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$lucide$2d$react$2f$dist$2f$esm$2f$icons$2f$chevron$2d$down$2e$js__$5b$app$2d$ssr$5d$__$28$ecmascript$29$__$3c$export__default__as__ChevronDown$3e$__ = __turbopack_context__.i("[project]/node_modules/lucide-react/dist/esm/icons/chevron-down.js [app-ssr] (ecmascript) <export default as ChevronDown>");
var __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$lucide$2d$react$2f$dist$2f$esm$2f$icons$2f$search$2e$js__$5b$app$2d$ssr$5d$__$28$ecmascript$29$__$3c$export__default__as__Search$3e$__ = __turbopack_context__.i("[project]/node_modules/lucide-react/dist/esm/icons/search.js [app-ssr] (ecmascript) <export default as Search>");
var __TURBOPACK__imported__module__$5b$project$5d2f$src$2f$lib$2f$dateUtils$2e$ts__$5b$app$2d$ssr$5d$__$28$ecmascript$29$__ = __turbopack_context__.i("[project]/src/lib/dateUtils.ts [app-ssr] (ecmascript)");
'use client';
;
;
;
;
;
function DataTable({ columns, data, maxRows = 100 }) {
    const [sortConfig, setSortConfig] = (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$next$2f$dist$2f$server$2f$route$2d$modules$2f$app$2d$page$2f$vendored$2f$ssr$2f$react$2e$js__$5b$app$2d$ssr$5d$__$28$ecmascript$29$__["useState"])(null);
    const [searchTerm, setSearchTerm] = (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$next$2f$dist$2f$server$2f$route$2d$modules$2f$app$2d$page$2f$vendored$2f$ssr$2f$react$2e$js__$5b$app$2d$ssr$5d$__$28$ecmascript$29$__["useState"])('');
    const sortedAndFilteredData = (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$next$2f$dist$2f$server$2f$route$2d$modules$2f$app$2d$page$2f$vendored$2f$ssr$2f$react$2e$js__$5b$app$2d$ssr$5d$__$28$ecmascript$29$__["useMemo"])(()=>{
        let processData = [
            ...data
        ];
        // Filter
        if (searchTerm) {
            processData = processData.filter((row)=>Object.values(row).some((val)=>String(val).toLowerCase().includes(searchTerm.toLowerCase())));
        }
        // Sort
        if (sortConfig) {
            processData.sort((a, b)=>{
                const aVal = a[sortConfig.key];
                const bVal = b[sortConfig.key];
                if (aVal < bVal) return sortConfig.direction === 'asc' ? -1 : 1;
                if (aVal > bVal) return sortConfig.direction === 'asc' ? 1 : -1;
                return 0;
            });
        }
        return processData.slice(0, maxRows);
    }, [
        data,
        sortConfig,
        searchTerm,
        maxRows
    ]);
    const handleSort = (key)=>{
        let direction = 'asc';
        if (sortConfig && sortConfig.key === key && sortConfig.direction === 'asc') {
            direction = 'desc';
        }
        setSortConfig({
            key,
            direction
        });
    };
    return /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$next$2f$dist$2f$server$2f$route$2d$modules$2f$app$2d$page$2f$vendored$2f$ssr$2f$react$2d$jsx$2d$dev$2d$runtime$2e$js__$5b$app$2d$ssr$5d$__$28$ecmascript$29$__["jsxDEV"])("div", {
        style: {
            display: 'flex',
            flexDirection: 'column',
            gap: '16px'
        },
        className: "jsx-82a1890f184697d0",
        children: [
            /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$next$2f$dist$2f$server$2f$route$2d$modules$2f$app$2d$page$2f$vendored$2f$ssr$2f$react$2d$jsx$2d$dev$2d$runtime$2e$js__$5b$app$2d$ssr$5d$__$28$ecmascript$29$__["jsxDEV"])("div", {
                style: {
                    position: 'relative',
                    maxWidth: '400px'
                },
                className: "jsx-82a1890f184697d0",
                children: [
                    /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$next$2f$dist$2f$server$2f$route$2d$modules$2f$app$2d$page$2f$vendored$2f$ssr$2f$react$2d$jsx$2d$dev$2d$runtime$2e$js__$5b$app$2d$ssr$5d$__$28$ecmascript$29$__["jsxDEV"])(__TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$lucide$2d$react$2f$dist$2f$esm$2f$icons$2f$search$2e$js__$5b$app$2d$ssr$5d$__$28$ecmascript$29$__$3c$export__default__as__Search$3e$__["Search"], {
                        size: 18,
                        style: {
                            position: 'absolute',
                            left: '12px',
                            top: '50%',
                            transform: 'translateY(-50%)',
                            color: 'var(--text-muted)'
                        }
                    }, void 0, false, {
                        fileName: "[project]/src/components/ui/DataTable.tsx",
                        lineNumber: 55,
                        columnNumber: 17
                    }, this),
                    /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$next$2f$dist$2f$server$2f$route$2d$modules$2f$app$2d$page$2f$vendored$2f$ssr$2f$react$2d$jsx$2d$dev$2d$runtime$2e$js__$5b$app$2d$ssr$5d$__$28$ecmascript$29$__["jsxDEV"])("input", {
                        type: "text",
                        placeholder: "Search in preview...",
                        value: searchTerm,
                        onChange: (e)=>setSearchTerm(e.target.value),
                        style: {
                            width: '100%',
                            padding: '10px 12px 10px 40px',
                            background: 'var(--surface)',
                            border: '1px solid var(--border)',
                            borderRadius: '10px',
                            color: 'var(--foreground)',
                            fontSize: '0.875rem',
                            outline: 'none',
                            transition: 'border-color 0.2s'
                        },
                        onFocus: (e)=>e.target.style.borderColor = 'var(--primary)',
                        onBlur: (e)=>e.target.style.borderColor = 'var(--border)',
                        className: "jsx-82a1890f184697d0"
                    }, void 0, false, {
                        fileName: "[project]/src/components/ui/DataTable.tsx",
                        lineNumber: 59,
                        columnNumber: 17
                    }, this)
                ]
            }, void 0, true, {
                fileName: "[project]/src/components/ui/DataTable.tsx",
                lineNumber: 54,
                columnNumber: 13
            }, this),
            /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$next$2f$dist$2f$server$2f$route$2d$modules$2f$app$2d$page$2f$vendored$2f$ssr$2f$react$2d$jsx$2d$dev$2d$runtime$2e$js__$5b$app$2d$ssr$5d$__$28$ecmascript$29$__["jsxDEV"])("div", {
                style: {
                    borderRadius: '16px',
                    overflow: 'hidden'
                },
                className: "jsx-82a1890f184697d0" + " " + "glass",
                children: [
                    /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$next$2f$dist$2f$server$2f$route$2d$modules$2f$app$2d$page$2f$vendored$2f$ssr$2f$react$2d$jsx$2d$dev$2d$runtime$2e$js__$5b$app$2d$ssr$5d$__$28$ecmascript$29$__["jsxDEV"])("div", {
                        style: {
                            overflowX: 'auto',
                            maxHeight: '500px'
                        },
                        className: "jsx-82a1890f184697d0",
                        children: /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$next$2f$dist$2f$server$2f$route$2d$modules$2f$app$2d$page$2f$vendored$2f$ssr$2f$react$2d$jsx$2d$dev$2d$runtime$2e$js__$5b$app$2d$ssr$5d$__$28$ecmascript$29$__["jsxDEV"])("table", {
                            style: {
                                width: '100%',
                                borderCollapse: 'collapse',
                                textAlign: 'left',
                                fontSize: '0.875rem'
                            },
                            className: "jsx-82a1890f184697d0",
                            children: [
                                /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$next$2f$dist$2f$server$2f$route$2d$modules$2f$app$2d$page$2f$vendored$2f$ssr$2f$react$2d$jsx$2d$dev$2d$runtime$2e$js__$5b$app$2d$ssr$5d$__$28$ecmascript$29$__["jsxDEV"])("thead", {
                                    style: {
                                        position: 'sticky',
                                        top: 0,
                                        zIndex: 10
                                    },
                                    className: "jsx-82a1890f184697d0",
                                    children: /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$next$2f$dist$2f$server$2f$route$2d$modules$2f$app$2d$page$2f$vendored$2f$ssr$2f$react$2d$jsx$2d$dev$2d$runtime$2e$js__$5b$app$2d$ssr$5d$__$28$ecmascript$29$__["jsxDEV"])("tr", {
                                        style: {
                                            background: 'var(--surface)',
                                            borderBottom: '1px solid var(--border)'
                                        },
                                        className: "jsx-82a1890f184697d0",
                                        children: columns.map((col)=>/*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$next$2f$dist$2f$server$2f$route$2d$modules$2f$app$2d$page$2f$vendored$2f$ssr$2f$react$2d$jsx$2d$dev$2d$runtime$2e$js__$5b$app$2d$ssr$5d$__$28$ecmascript$29$__["jsxDEV"])("th", {
                                                onClick: ()=>handleSort(col.name),
                                                style: {
                                                    padding: '16px',
                                                    color: 'var(--text-muted)',
                                                    fontWeight: 600,
                                                    cursor: 'pointer',
                                                    whiteSpace: 'nowrap',
                                                    transition: 'color 0.2s'
                                                },
                                                className: "jsx-82a1890f184697d0",
                                                children: /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$next$2f$dist$2f$server$2f$route$2d$modules$2f$app$2d$page$2f$vendored$2f$ssr$2f$react$2d$jsx$2d$dev$2d$runtime$2e$js__$5b$app$2d$ssr$5d$__$28$ecmascript$29$__["jsxDEV"])("div", {
                                                    style: {
                                                        display: 'flex',
                                                        alignItems: 'center',
                                                        gap: '8px'
                                                    },
                                                    className: "jsx-82a1890f184697d0",
                                                    children: [
                                                        col.name,
                                                        /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$next$2f$dist$2f$server$2f$route$2d$modules$2f$app$2d$page$2f$vendored$2f$ssr$2f$react$2d$jsx$2d$dev$2d$runtime$2e$js__$5b$app$2d$ssr$5d$__$28$ecmascript$29$__["jsxDEV"])("span", {
                                                            style: {
                                                                display: 'flex',
                                                                flexDirection: 'column',
                                                                opacity: sortConfig?.key === col.name ? 1 : 0.3
                                                            },
                                                            className: "jsx-82a1890f184697d0",
                                                            children: [
                                                                /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$next$2f$dist$2f$server$2f$route$2d$modules$2f$app$2d$page$2f$vendored$2f$ssr$2f$react$2d$jsx$2d$dev$2d$runtime$2e$js__$5b$app$2d$ssr$5d$__$28$ecmascript$29$__["jsxDEV"])(__TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$lucide$2d$react$2f$dist$2f$esm$2f$icons$2f$chevron$2d$up$2e$js__$5b$app$2d$ssr$5d$__$28$ecmascript$29$__$3c$export__default__as__ChevronUp$3e$__["ChevronUp"], {
                                                                    size: 12,
                                                                    style: {
                                                                        marginBottom: '-4px',
                                                                        color: sortConfig?.key === col.name && sortConfig.direction === 'asc' ? 'var(--primary)' : 'inherit'
                                                                    }
                                                                }, void 0, false, {
                                                                    fileName: "[project]/src/components/ui/DataTable.tsx",
                                                                    lineNumber: 101,
                                                                    columnNumber: 49
                                                                }, this),
                                                                /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$next$2f$dist$2f$server$2f$route$2d$modules$2f$app$2d$page$2f$vendored$2f$ssr$2f$react$2d$jsx$2d$dev$2d$runtime$2e$js__$5b$app$2d$ssr$5d$__$28$ecmascript$29$__["jsxDEV"])(__TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$lucide$2d$react$2f$dist$2f$esm$2f$icons$2f$chevron$2d$down$2e$js__$5b$app$2d$ssr$5d$__$28$ecmascript$29$__$3c$export__default__as__ChevronDown$3e$__["ChevronDown"], {
                                                                    size: 12,
                                                                    style: {
                                                                        color: sortConfig?.key === col.name && sortConfig.direction === 'desc' ? 'var(--primary)' : 'inherit'
                                                                    }
                                                                }, void 0, false, {
                                                                    fileName: "[project]/src/components/ui/DataTable.tsx",
                                                                    lineNumber: 102,
                                                                    columnNumber: 49
                                                                }, this)
                                                            ]
                                                        }, void 0, true, {
                                                            fileName: "[project]/src/components/ui/DataTable.tsx",
                                                            lineNumber: 100,
                                                            columnNumber: 45
                                                        }, this)
                                                    ]
                                                }, void 0, true, {
                                                    fileName: "[project]/src/components/ui/DataTable.tsx",
                                                    lineNumber: 98,
                                                    columnNumber: 41
                                                }, this)
                                            }, col.name, false, {
                                                fileName: "[project]/src/components/ui/DataTable.tsx",
                                                lineNumber: 86,
                                                columnNumber: 37
                                            }, this))
                                    }, void 0, false, {
                                        fileName: "[project]/src/components/ui/DataTable.tsx",
                                        lineNumber: 84,
                                        columnNumber: 29
                                    }, this)
                                }, void 0, false, {
                                    fileName: "[project]/src/components/ui/DataTable.tsx",
                                    lineNumber: 83,
                                    columnNumber: 25
                                }, this),
                                /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$next$2f$dist$2f$server$2f$route$2d$modules$2f$app$2d$page$2f$vendored$2f$ssr$2f$react$2d$jsx$2d$dev$2d$runtime$2e$js__$5b$app$2d$ssr$5d$__$28$ecmascript$29$__["jsxDEV"])("tbody", {
                                    className: "jsx-82a1890f184697d0",
                                    children: sortedAndFilteredData.length > 0 ? sortedAndFilteredData.map((row, i)=>/*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$next$2f$dist$2f$server$2f$route$2d$modules$2f$app$2d$page$2f$vendored$2f$ssr$2f$react$2d$jsx$2d$dev$2d$runtime$2e$js__$5b$app$2d$ssr$5d$__$28$ecmascript$29$__["jsxDEV"])("tr", {
                                            style: {
                                                borderBottom: '1px solid var(--border)',
                                                transition: 'background 0.2s'
                                            },
                                            className: "jsx-82a1890f184697d0" + " " + "table-row-hover",
                                            children: columns.map((col)=>/*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$next$2f$dist$2f$server$2f$route$2d$modules$2f$app$2d$page$2f$vendored$2f$ssr$2f$react$2d$jsx$2d$dev$2d$runtime$2e$js__$5b$app$2d$ssr$5d$__$28$ecmascript$29$__["jsxDEV"])("td", {
                                                    style: {
                                                        padding: '16px',
                                                        whiteSpace: 'nowrap',
                                                        overflow: 'hidden',
                                                        textOverflow: 'ellipsis',
                                                        maxWidth: '200px'
                                                    },
                                                    className: "jsx-82a1890f184697d0",
                                                    children: col.type === 'DATE' || col.type === 'TIMESTAMP' ? (0, __TURBOPACK__imported__module__$5b$project$5d2f$src$2f$lib$2f$dateUtils$2e$ts__$5b$app$2d$ssr$5d$__$28$ecmascript$29$__["formatDate"])(row[col.name]) : String(row[col.name] ?? '')
                                                }, col.name, false, {
                                                    fileName: "[project]/src/components/ui/DataTable.tsx",
                                                    lineNumber: 114,
                                                    columnNumber: 45
                                                }, this))
                                        }, i, false, {
                                            fileName: "[project]/src/components/ui/DataTable.tsx",
                                            lineNumber: 112,
                                            columnNumber: 37
                                        }, this)) : /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$next$2f$dist$2f$server$2f$route$2d$modules$2f$app$2d$page$2f$vendored$2f$ssr$2f$react$2d$jsx$2d$dev$2d$runtime$2e$js__$5b$app$2d$ssr$5d$__$28$ecmascript$29$__["jsxDEV"])("tr", {
                                        className: "jsx-82a1890f184697d0",
                                        children: /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$next$2f$dist$2f$server$2f$route$2d$modules$2f$app$2d$page$2f$vendored$2f$ssr$2f$react$2d$jsx$2d$dev$2d$runtime$2e$js__$5b$app$2d$ssr$5d$__$28$ecmascript$29$__["jsxDEV"])("td", {
                                            colSpan: columns.length,
                                            style: {
                                                padding: '40px',
                                                textAlign: 'center',
                                                color: 'var(--text-muted)'
                                            },
                                            className: "jsx-82a1890f184697d0",
                                            children: "No results found"
                                        }, void 0, false, {
                                            fileName: "[project]/src/components/ui/DataTable.tsx",
                                            lineNumber: 124,
                                            columnNumber: 37
                                        }, this)
                                    }, void 0, false, {
                                        fileName: "[project]/src/components/ui/DataTable.tsx",
                                        lineNumber: 123,
                                        columnNumber: 33
                                    }, this)
                                }, void 0, false, {
                                    fileName: "[project]/src/components/ui/DataTable.tsx",
                                    lineNumber: 109,
                                    columnNumber: 25
                                }, this)
                            ]
                        }, void 0, true, {
                            fileName: "[project]/src/components/ui/DataTable.tsx",
                            lineNumber: 82,
                            columnNumber: 21
                        }, this)
                    }, void 0, false, {
                        fileName: "[project]/src/components/ui/DataTable.tsx",
                        lineNumber: 81,
                        columnNumber: 17
                    }, this),
                    /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$next$2f$dist$2f$server$2f$route$2d$modules$2f$app$2d$page$2f$vendored$2f$ssr$2f$react$2d$jsx$2d$dev$2d$runtime$2e$js__$5b$app$2d$ssr$5d$__$28$ecmascript$29$__["jsxDEV"])("div", {
                        style: {
                            padding: '12px 16px',
                            background: 'var(--surface)',
                            color: 'var(--text-muted)',
                            textAlign: 'center',
                            fontSize: '0.75rem',
                            borderTop: '1px solid var(--border)'
                        },
                        className: "jsx-82a1890f184697d0",
                        children: [
                            "Showing ",
                            sortedAndFilteredData.length,
                            " of ",
                            data.length,
                            " rows"
                        ]
                    }, void 0, true, {
                        fileName: "[project]/src/components/ui/DataTable.tsx",
                        lineNumber: 132,
                        columnNumber: 17
                    }, this)
                ]
            }, void 0, true, {
                fileName: "[project]/src/components/ui/DataTable.tsx",
                lineNumber: 80,
                columnNumber: 13
            }, this),
            /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$next$2f$dist$2f$server$2f$route$2d$modules$2f$app$2d$page$2f$vendored$2f$ssr$2f$react$2d$jsx$2d$dev$2d$runtime$2e$js__$5b$app$2d$ssr$5d$__$28$ecmascript$29$__["jsxDEV"])(__TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$styled$2d$jsx$2f$style$2e$js__$5b$app$2d$ssr$5d$__$28$ecmascript$29$__["default"], {
                id: "82a1890f184697d0",
                children: ".table-row-hover.jsx-82a1890f184697d0:hover{background:#ffffff14}th.jsx-82a1890f184697d0:hover{color:var(--foreground)!important}table{-webkit-backdrop-filter:blur(18px);backdrop-filter:blur(18px)}"
            }, void 0, false, void 0, this)
        ]
    }, void 0, true, {
        fileName: "[project]/src/components/ui/DataTable.tsx",
        lineNumber: 53,
        columnNumber: 9
    }, this);
}
}),
"[project]/src/components/visuals/ChartRenderer.tsx [app-ssr] (ecmascript)", ((__turbopack_context__) => {
"use strict";

__turbopack_context__.s([
    "default",
    ()=>ChartRenderer
]);
var __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$next$2f$dist$2f$server$2f$route$2d$modules$2f$app$2d$page$2f$vendored$2f$ssr$2f$react$2d$jsx$2d$dev$2d$runtime$2e$js__$5b$app$2d$ssr$5d$__$28$ecmascript$29$__ = __turbopack_context__.i("[project]/node_modules/next/dist/server/route-modules/app-page/vendored/ssr/react-jsx-dev-runtime.js [app-ssr] (ecmascript)");
var __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$next$2f$dist$2f$server$2f$route$2d$modules$2f$app$2d$page$2f$vendored$2f$ssr$2f$react$2e$js__$5b$app$2d$ssr$5d$__$28$ecmascript$29$__ = __turbopack_context__.i("[project]/node_modules/next/dist/server/route-modules/app-page/vendored/ssr/react.js [app-ssr] (ecmascript)");
var __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$recharts$2f$es6$2f$chart$2f$BarChart$2e$js__$5b$app$2d$ssr$5d$__$28$ecmascript$29$__ = __turbopack_context__.i("[project]/node_modules/recharts/es6/chart/BarChart.js [app-ssr] (ecmascript)");
var __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$recharts$2f$es6$2f$cartesian$2f$Bar$2e$js__$5b$app$2d$ssr$5d$__$28$ecmascript$29$__ = __turbopack_context__.i("[project]/node_modules/recharts/es6/cartesian/Bar.js [app-ssr] (ecmascript)");
var __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$recharts$2f$es6$2f$chart$2f$LineChart$2e$js__$5b$app$2d$ssr$5d$__$28$ecmascript$29$__ = __turbopack_context__.i("[project]/node_modules/recharts/es6/chart/LineChart.js [app-ssr] (ecmascript)");
var __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$recharts$2f$es6$2f$cartesian$2f$Line$2e$js__$5b$app$2d$ssr$5d$__$28$ecmascript$29$__ = __turbopack_context__.i("[project]/node_modules/recharts/es6/cartesian/Line.js [app-ssr] (ecmascript)");
var __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$recharts$2f$es6$2f$chart$2f$PieChart$2e$js__$5b$app$2d$ssr$5d$__$28$ecmascript$29$__ = __turbopack_context__.i("[project]/node_modules/recharts/es6/chart/PieChart.js [app-ssr] (ecmascript)");
var __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$recharts$2f$es6$2f$polar$2f$Pie$2e$js__$5b$app$2d$ssr$5d$__$28$ecmascript$29$__ = __turbopack_context__.i("[project]/node_modules/recharts/es6/polar/Pie.js [app-ssr] (ecmascript)");
var __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$recharts$2f$es6$2f$component$2f$Cell$2e$js__$5b$app$2d$ssr$5d$__$28$ecmascript$29$__ = __turbopack_context__.i("[project]/node_modules/recharts/es6/component/Cell.js [app-ssr] (ecmascript)");
var __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$recharts$2f$es6$2f$cartesian$2f$XAxis$2e$js__$5b$app$2d$ssr$5d$__$28$ecmascript$29$__ = __turbopack_context__.i("[project]/node_modules/recharts/es6/cartesian/XAxis.js [app-ssr] (ecmascript)");
var __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$recharts$2f$es6$2f$cartesian$2f$YAxis$2e$js__$5b$app$2d$ssr$5d$__$28$ecmascript$29$__ = __turbopack_context__.i("[project]/node_modules/recharts/es6/cartesian/YAxis.js [app-ssr] (ecmascript)");
var __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$recharts$2f$es6$2f$cartesian$2f$CartesianGrid$2e$js__$5b$app$2d$ssr$5d$__$28$ecmascript$29$__ = __turbopack_context__.i("[project]/node_modules/recharts/es6/cartesian/CartesianGrid.js [app-ssr] (ecmascript)");
var __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$recharts$2f$es6$2f$component$2f$Tooltip$2e$js__$5b$app$2d$ssr$5d$__$28$ecmascript$29$__ = __turbopack_context__.i("[project]/node_modules/recharts/es6/component/Tooltip.js [app-ssr] (ecmascript)");
var __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$recharts$2f$es6$2f$component$2f$ResponsiveContainer$2e$js__$5b$app$2d$ssr$5d$__$28$ecmascript$29$__ = __turbopack_context__.i("[project]/node_modules/recharts/es6/component/ResponsiveContainer.js [app-ssr] (ecmascript)");
var __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$recharts$2f$es6$2f$component$2f$Legend$2e$js__$5b$app$2d$ssr$5d$__$28$ecmascript$29$__ = __turbopack_context__.i("[project]/node_modules/recharts/es6/component/Legend.js [app-ssr] (ecmascript)");
var __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$recharts$2f$es6$2f$chart$2f$AreaChart$2e$js__$5b$app$2d$ssr$5d$__$28$ecmascript$29$__ = __turbopack_context__.i("[project]/node_modules/recharts/es6/chart/AreaChart.js [app-ssr] (ecmascript)");
var __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$recharts$2f$es6$2f$cartesian$2f$Area$2e$js__$5b$app$2d$ssr$5d$__$28$ecmascript$29$__ = __turbopack_context__.i("[project]/node_modules/recharts/es6/cartesian/Area.js [app-ssr] (ecmascript)");
var __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$recharts$2f$es6$2f$chart$2f$Treemap$2e$js__$5b$app$2d$ssr$5d$__$28$ecmascript$29$__ = __turbopack_context__.i("[project]/node_modules/recharts/es6/chart/Treemap.js [app-ssr] (ecmascript)");
var __TURBOPACK__imported__module__$5b$project$5d2f$src$2f$lib$2f$dateUtils$2e$ts__$5b$app$2d$ssr$5d$__$28$ecmascript$29$__ = __turbopack_context__.i("[project]/src/lib/dateUtils.ts [app-ssr] (ecmascript)");
'use client';
;
;
;
;
const DEFAULT_COLORS = [
    '#8b5cf6',
    '#22d3ee',
    '#f43f5e',
    '#10b981',
    '#f59e0b',
    '#6366f1',
    '#ec4899'
];
const BLUE_COLORS = [
    '#3b82f6',
    '#60a5fa',
    '#93c5fd',
    '#bfdbfe',
    '#dbeafe'
];
const CHART_FONT_FAMILY = '"DejaVu Sans", "DejaVu Sans Condensed", sans-serif';
function ChartRenderer({ type, data, xAxis, yAxis, columnsMeta = [], widgetTitle, latitudeField, longitudeField, orientation = 'vertical', colorScheme = 'varied', colorByCategory = true, colors = DEFAULT_COLORS, customColor }) {
    const [isMounted, setIsMounted] = __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$next$2f$dist$2f$server$2f$route$2d$modules$2f$app$2d$page$2f$vendored$2f$ssr$2f$react$2e$js__$5b$app$2d$ssr$5d$__$28$ecmascript$29$__["default"].useState(false);
    __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$next$2f$dist$2f$server$2f$route$2d$modules$2f$app$2d$page$2f$vendored$2f$ssr$2f$react$2e$js__$5b$app$2d$ssr$5d$__$28$ecmascript$29$__["default"].useEffect(()=>{
        setIsMounted(true);
    }, []);
    const getColors = ()=>{
        if (colorScheme === 'solid') return [
            customColor || colors[0]
        ];
        if (colorScheme === 'blues') return BLUE_COLORS;
        return colors;
    };
    const activeColors = getColors();
    const getBaseFieldName = (fieldName)=>{
        if (!fieldName) return '';
        return fieldName.replace(/\s+\((SUM|AVG|CNT|COUNT|MIN|MAX|DST|DISTINCT|NONE)\)$/i, '').trim();
    };
    const getColumnType = (fieldName)=>{
        const baseFieldName = getBaseFieldName(fieldName);
        return columnsMeta.find((column)=>column.name === baseFieldName)?.type?.toUpperCase() || '';
    };
    const isDateColumn = (fieldName)=>{
        const columnType = getColumnType(fieldName);
        return columnType === 'DATE' || columnType === 'TIMESTAMP';
    };
    const normalizeDateValue = (value, fieldName)=>{
        if (value === null || value === undefined || value === '') return null;
        if (value instanceof Date && !Number.isNaN(value.getTime())) return value;
        if (typeof value === 'number' && Number.isFinite(value) && isDateColumn(fieldName)) {
            if (value > 1e11) return new Date(value);
            if (value > 1e9) return new Date(value * 1000);
        }
        if (typeof value === 'string') {
            const trimmed = value.trim();
            if (/^\d{10,13}$/.test(trimmed) && isDateColumn(fieldName)) {
                const numeric = Number(trimmed);
                if (trimmed.length === 13) return new Date(numeric);
                if (trimmed.length === 10) return new Date(numeric * 1000);
            }
            if (isDateColumn(fieldName) || /^\d{4}-\d{2}-\d{2}/.test(trimmed) || /^\d{4}\/\d{2}\/\d{2}/.test(trimmed)) {
                const parsed = new Date(trimmed);
                if (!Number.isNaN(parsed.getTime())) return parsed;
            }
        }
        return null;
    };
    const formatDisplayValue = (value, fieldName)=>{
        const normalizedDate = normalizeDateValue(value, fieldName);
        if (normalizedDate) return (0, __TURBOPACK__imported__module__$5b$project$5d2f$src$2f$lib$2f$dateUtils$2e$ts__$5b$app$2d$ssr$5d$__$28$ecmascript$29$__["formatDate"])(normalizedDate);
        if (typeof value === 'number') return value.toLocaleString();
        return String(value ?? '');
    };
    const formatMetricValue = (value)=>{
        if (typeof value === 'number' && Number.isFinite(value)) {
            return new Intl.NumberFormat('es-CO', {
                maximumFractionDigits: 2
            }).format(value);
        }
        return formatDisplayValue(value);
    };
    const renderTreemapNode = (props)=>{
        const { x = 0, y = 0, width = 0, height = 0, name = '', fill = '#8884d8' } = props;
        if (width < 36 || height < 24) {
            return /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$next$2f$dist$2f$server$2f$route$2d$modules$2f$app$2d$page$2f$vendored$2f$ssr$2f$react$2d$jsx$2d$dev$2d$runtime$2e$js__$5b$app$2d$ssr$5d$__$28$ecmascript$29$__["jsxDEV"])("g", {
                children: /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$next$2f$dist$2f$server$2f$route$2d$modules$2f$app$2d$page$2f$vendored$2f$ssr$2f$react$2d$jsx$2d$dev$2d$runtime$2e$js__$5b$app$2d$ssr$5d$__$28$ecmascript$29$__["jsxDEV"])("rect", {
                    x: x,
                    y: y,
                    width: width,
                    height: height,
                    fill: fill,
                    stroke: "rgba(255,255,255,0.72)",
                    strokeWidth: 1
                }, void 0, false, {
                    fileName: "[project]/src/components/visuals/ChartRenderer.tsx",
                    lineNumber: 134,
                    columnNumber: 21
                }, this)
            }, void 0, false, {
                fileName: "[project]/src/components/visuals/ChartRenderer.tsx",
                lineNumber: 133,
                columnNumber: 17
            }, this);
        }
        const fontSize = Math.max(11, Math.min(22, Math.min(width / 5.8, height / 2.8)));
        const labelX = x + 8;
        const labelY = y + Math.min(height - 8, Math.max(18, fontSize + 8));
        return /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$next$2f$dist$2f$server$2f$route$2d$modules$2f$app$2d$page$2f$vendored$2f$ssr$2f$react$2d$jsx$2d$dev$2d$runtime$2e$js__$5b$app$2d$ssr$5d$__$28$ecmascript$29$__["jsxDEV"])("g", {
            children: [
                /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$next$2f$dist$2f$server$2f$route$2d$modules$2f$app$2d$page$2f$vendored$2f$ssr$2f$react$2d$jsx$2d$dev$2d$runtime$2e$js__$5b$app$2d$ssr$5d$__$28$ecmascript$29$__["jsxDEV"])("rect", {
                    x: x,
                    y: y,
                    width: width,
                    height: height,
                    fill: fill,
                    stroke: "rgba(255,255,255,0.72)",
                    strokeWidth: 1
                }, void 0, false, {
                    fileName: "[project]/src/components/visuals/ChartRenderer.tsx",
                    lineNumber: 145,
                    columnNumber: 17
                }, this),
                /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$next$2f$dist$2f$server$2f$route$2d$modules$2f$app$2d$page$2f$vendored$2f$ssr$2f$react$2d$jsx$2d$dev$2d$runtime$2e$js__$5b$app$2d$ssr$5d$__$28$ecmascript$29$__["jsxDEV"])("text", {
                    x: labelX,
                    y: labelY,
                    fill: "rgba(255,255,255,0.96)",
                    fontFamily: '-apple-system, BlinkMacSystemFont, "SF Pro Text", "Segoe UI", sans-serif',
                    fontSize: fontSize,
                    fontWeight: 600,
                    textRendering: "geometricPrecision",
                    style: {
                        pointerEvents: 'none',
                        paintOrder: 'fill',
                        stroke: 'none',
                        letterSpacing: '-0.02em'
                    },
                    children: formatDisplayValue(name, xAxis)
                }, void 0, false, {
                    fileName: "[project]/src/components/visuals/ChartRenderer.tsx",
                    lineNumber: 146,
                    columnNumber: 17
                }, this)
            ]
        }, void 0, true, {
            fileName: "[project]/src/components/visuals/ChartRenderer.tsx",
            lineNumber: 144,
            columnNumber: 13
        }, this);
    };
    if (!isMounted) return /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$next$2f$dist$2f$server$2f$route$2d$modules$2f$app$2d$page$2f$vendored$2f$ssr$2f$react$2d$jsx$2d$dev$2d$runtime$2e$js__$5b$app$2d$ssr$5d$__$28$ecmascript$29$__["jsxDEV"])("div", {
        style: {
            height: '100%',
            width: '100%'
        }
    }, void 0, false, {
        fileName: "[project]/src/components/visuals/ChartRenderer.tsx",
        lineNumber: 167,
        columnNumber: 28
    }, this);
    if (!data || data.length === 0) {
        return /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$next$2f$dist$2f$server$2f$route$2d$modules$2f$app$2d$page$2f$vendored$2f$ssr$2f$react$2d$jsx$2d$dev$2d$runtime$2e$js__$5b$app$2d$ssr$5d$__$28$ecmascript$29$__["jsxDEV"])("div", {
            style: {
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                height: '100%',
                color: 'var(--text-muted)'
            },
            children: "No data available"
        }, void 0, false, {
            fileName: "[project]/src/components/visuals/ChartRenderer.tsx",
            lineNumber: 170,
            columnNumber: 16
        }, this);
    }
    const CustomTooltip = ({ active, payload, label })=>{
        if (active && payload && payload.length) {
            const data = payload[0].payload;
            return /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$next$2f$dist$2f$server$2f$route$2d$modules$2f$app$2d$page$2f$vendored$2f$ssr$2f$react$2d$jsx$2d$dev$2d$runtime$2e$js__$5b$app$2d$ssr$5d$__$28$ecmascript$29$__["jsxDEV"])("div", {
                className: "glass-card",
                style: {
                    padding: '12px',
                    border: '1px solid var(--border)',
                    background: 'var(--surface)',
                    fontSize: '0.875rem'
                },
                children: [
                    /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$next$2f$dist$2f$server$2f$route$2d$modules$2f$app$2d$page$2f$vendored$2f$ssr$2f$react$2d$jsx$2d$dev$2d$runtime$2e$js__$5b$app$2d$ssr$5d$__$28$ecmascript$29$__["jsxDEV"])("p", {
                        style: {
                            fontWeight: 600,
                            marginBottom: '4px'
                        },
                        children: formatDisplayValue(label || data.name, xAxis)
                    }, void 0, false, {
                        fileName: "[project]/src/components/visuals/ChartRenderer.tsx",
                        lineNumber: 178,
                        columnNumber: 21
                    }, this),
                    payload.map((entry, index)=>/*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$next$2f$dist$2f$server$2f$route$2d$modules$2f$app$2d$page$2f$vendored$2f$ssr$2f$react$2d$jsx$2d$dev$2d$runtime$2e$js__$5b$app$2d$ssr$5d$__$28$ecmascript$29$__["jsxDEV"])("p", {
                            style: {
                                color: entry.color || entry.fill
                            },
                            children: [
                                entry.name || 'Value',
                                ": ",
                                /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$next$2f$dist$2f$server$2f$route$2d$modules$2f$app$2d$page$2f$vendored$2f$ssr$2f$react$2d$jsx$2d$dev$2d$runtime$2e$js__$5b$app$2d$ssr$5d$__$28$ecmascript$29$__["jsxDEV"])("span", {
                                    style: {
                                        fontWeight: 600
                                    },
                                    children: formatDisplayValue(entry.value, String(entry.dataKey || entry.name || yAxis))
                                }, void 0, false, {
                                    fileName: "[project]/src/components/visuals/ChartRenderer.tsx",
                                    lineNumber: 181,
                                    columnNumber: 54
                                }, this)
                            ]
                        }, index, true, {
                            fileName: "[project]/src/components/visuals/ChartRenderer.tsx",
                            lineNumber: 180,
                            columnNumber: 25
                        }, this))
                ]
            }, void 0, true, {
                fileName: "[project]/src/components/visuals/ChartRenderer.tsx",
                lineNumber: 177,
                columnNumber: 17
            }, this);
        }
        return null;
    };
    if (type === 'table') {
        const columns = Object.keys(data[0]);
        return /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$next$2f$dist$2f$server$2f$route$2d$modules$2f$app$2d$page$2f$vendored$2f$ssr$2f$react$2d$jsx$2d$dev$2d$runtime$2e$js__$5b$app$2d$ssr$5d$__$28$ecmascript$29$__["jsxDEV"])("div", {
            style: {
                width: '100%',
                height: '100%',
                overflow: 'auto',
                borderRadius: '8px',
                border: '1px solid var(--border)',
                background: 'var(--surface)'
            },
            children: /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$next$2f$dist$2f$server$2f$route$2d$modules$2f$app$2d$page$2f$vendored$2f$ssr$2f$react$2d$jsx$2d$dev$2d$runtime$2e$js__$5b$app$2d$ssr$5d$__$28$ecmascript$29$__["jsxDEV"])("table", {
                style: {
                    width: '100%',
                    borderCollapse: 'collapse',
                    fontSize: '0.875rem'
                },
                children: [
                    /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$next$2f$dist$2f$server$2f$route$2d$modules$2f$app$2d$page$2f$vendored$2f$ssr$2f$react$2d$jsx$2d$dev$2d$runtime$2e$js__$5b$app$2d$ssr$5d$__$28$ecmascript$29$__["jsxDEV"])("thead", {
                        style: {
                            position: 'sticky',
                            top: 0,
                            background: 'var(--surface)',
                            zIndex: 10,
                            boxShadow: '0 1px 0 var(--border)'
                        },
                        children: /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$next$2f$dist$2f$server$2f$route$2d$modules$2f$app$2d$page$2f$vendored$2f$ssr$2f$react$2d$jsx$2d$dev$2d$runtime$2e$js__$5b$app$2d$ssr$5d$__$28$ecmascript$29$__["jsxDEV"])("tr", {
                            children: columns.map((col)=>/*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$next$2f$dist$2f$server$2f$route$2d$modules$2f$app$2d$page$2f$vendored$2f$ssr$2f$react$2d$jsx$2d$dev$2d$runtime$2e$js__$5b$app$2d$ssr$5d$__$28$ecmascript$29$__["jsxDEV"])("th", {
                                    style: {
                                        padding: '12px',
                                        textAlign: 'left',
                                        fontWeight: 600,
                                        color: 'var(--text-muted)',
                                        borderBottom: '1px solid var(--border)'
                                    },
                                    children: col
                                }, col, false, {
                                    fileName: "[project]/src/components/visuals/ChartRenderer.tsx",
                                    lineNumber: 198,
                                    columnNumber: 33
                                }, this))
                        }, void 0, false, {
                            fileName: "[project]/src/components/visuals/ChartRenderer.tsx",
                            lineNumber: 196,
                            columnNumber: 25
                        }, this)
                    }, void 0, false, {
                        fileName: "[project]/src/components/visuals/ChartRenderer.tsx",
                        lineNumber: 195,
                        columnNumber: 21
                    }, this),
                    /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$next$2f$dist$2f$server$2f$route$2d$modules$2f$app$2d$page$2f$vendored$2f$ssr$2f$react$2d$jsx$2d$dev$2d$runtime$2e$js__$5b$app$2d$ssr$5d$__$28$ecmascript$29$__["jsxDEV"])("tbody", {
                        children: data.map((row, i)=>/*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$next$2f$dist$2f$server$2f$route$2d$modules$2f$app$2d$page$2f$vendored$2f$ssr$2f$react$2d$jsx$2d$dev$2d$runtime$2e$js__$5b$app$2d$ssr$5d$__$28$ecmascript$29$__["jsxDEV"])("tr", {
                                style: {
                                    borderBottom: '1px solid var(--border)'
                                },
                                className: "table-row",
                                children: columns.map((col)=>/*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$next$2f$dist$2f$server$2f$route$2d$modules$2f$app$2d$page$2f$vendored$2f$ssr$2f$react$2d$jsx$2d$dev$2d$runtime$2e$js__$5b$app$2d$ssr$5d$__$28$ecmascript$29$__["jsxDEV"])("td", {
                                        style: {
                                            padding: '12px',
                                            color: 'var(--foreground)'
                                        },
                                        children: formatDisplayValue(row[col], col)
                                    }, col, false, {
                                        fileName: "[project]/src/components/visuals/ChartRenderer.tsx",
                                        lineNumber: 206,
                                        columnNumber: 37
                                    }, this))
                            }, i, false, {
                                fileName: "[project]/src/components/visuals/ChartRenderer.tsx",
                                lineNumber: 204,
                                columnNumber: 29
                            }, this))
                    }, void 0, false, {
                        fileName: "[project]/src/components/visuals/ChartRenderer.tsx",
                        lineNumber: 202,
                        columnNumber: 21
                    }, this)
                ]
            }, void 0, true, {
                fileName: "[project]/src/components/visuals/ChartRenderer.tsx",
                lineNumber: 194,
                columnNumber: 17
            }, this)
        }, void 0, false, {
            fileName: "[project]/src/components/visuals/ChartRenderer.tsx",
            lineNumber: 193,
            columnNumber: 13
        }, this);
    }
    if (type === 'card') {
        const primaryRow = data[0] || {};
        const value = primaryRow[yAxis];
        return /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$next$2f$dist$2f$server$2f$route$2d$modules$2f$app$2d$page$2f$vendored$2f$ssr$2f$react$2d$jsx$2d$dev$2d$runtime$2e$js__$5b$app$2d$ssr$5d$__$28$ecmascript$29$__["jsxDEV"])("div", {
            style: {
                width: '100%',
                height: '100%',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center'
            },
            children: /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$next$2f$dist$2f$server$2f$route$2d$modules$2f$app$2d$page$2f$vendored$2f$ssr$2f$react$2d$jsx$2d$dev$2d$runtime$2e$js__$5b$app$2d$ssr$5d$__$28$ecmascript$29$__["jsxDEV"])("div", {
                style: {
                    textAlign: 'center',
                    width: '100%'
                },
                children: [
                    /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$next$2f$dist$2f$server$2f$route$2d$modules$2f$app$2d$page$2f$vendored$2f$ssr$2f$react$2d$jsx$2d$dev$2d$runtime$2e$js__$5b$app$2d$ssr$5d$__$28$ecmascript$29$__["jsxDEV"])("p", {
                        style: {
                            fontSize: '0.8rem',
                            color: 'var(--text-muted)',
                            marginBottom: '12px',
                            textTransform: 'uppercase',
                            letterSpacing: '0.08em'
                        },
                        children: widgetTitle || yAxis
                    }, void 0, false, {
                        fileName: "[project]/src/components/visuals/ChartRenderer.tsx",
                        lineNumber: 224,
                        columnNumber: 21
                    }, this),
                    /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$next$2f$dist$2f$server$2f$route$2d$modules$2f$app$2d$page$2f$vendored$2f$ssr$2f$react$2d$jsx$2d$dev$2d$runtime$2e$js__$5b$app$2d$ssr$5d$__$28$ecmascript$29$__["jsxDEV"])("div", {
                        style: {
                            fontSize: 'clamp(2rem, 5vw, 4rem)',
                            fontWeight: 700,
                            letterSpacing: '-0.05em',
                            color: 'var(--foreground)',
                            lineHeight: 1
                        },
                        children: formatMetricValue(value)
                    }, void 0, false, {
                        fileName: "[project]/src/components/visuals/ChartRenderer.tsx",
                        lineNumber: 227,
                        columnNumber: 21
                    }, this)
                ]
            }, void 0, true, {
                fileName: "[project]/src/components/visuals/ChartRenderer.tsx",
                lineNumber: 223,
                columnNumber: 17
            }, this)
        }, void 0, false, {
            fileName: "[project]/src/components/visuals/ChartRenderer.tsx",
            lineNumber: 222,
            columnNumber: 13
        }, this);
    }
    if (type === 'map') {
        const points = data.map((row)=>({
                label: row[xAxis],
                value: Number(row[yAxis]),
                lat: Number(row[latitudeField || '']),
                lon: Number(row[longitudeField || ''])
            })).filter((point)=>Number.isFinite(point.lat) && Number.isFinite(point.lon) && point.lat >= -90 && point.lat <= 90 && point.lon >= -180 && point.lon <= 180);
        const maxValue = Math.max(...points.map((point)=>Math.abs(point.value || 0)), 1);
        const projectX = (lon)=>(lon + 180) / 360 * 100;
        const projectY = (lat)=>(90 - lat) / 180 * 100;
        const worldPaths = [
            "M109 124 L132 110 L168 103 L201 109 L221 126 L240 149 L252 178 L252 204 L237 230 L212 249 L182 258 L158 247 L143 223 L133 196 L119 176 L102 162 L94 144 Z",
            "M215 274 L236 287 L247 312 L249 344 L241 377 L226 410 L212 438 L195 450 L184 435 L181 404 L187 369 L196 334 L202 303 Z",
            "M279 113 L312 92 L365 86 L421 90 L470 102 L515 116 L562 133 L608 158 L648 190 L665 218 L663 240 L646 256 L616 261 L582 254 L549 240 L521 222 L493 210 L461 208 L431 218 L404 230 L377 232 L349 223 L323 206 L301 184 L284 157 Z",
            "M533 271 L561 282 L585 301 L598 326 L597 359 L579 380 L553 387 L528 374 L516 351 L515 320 L521 292 Z",
            "M695 138 L724 121 L764 116 L804 119 L845 131 L883 152 L911 177 L925 203 L922 227 L902 243 L872 248 L841 242 L813 230 L787 214 L760 200 L731 193 L705 181 L690 162 Z",
            "M822 318 L851 313 L881 321 L904 337 L918 362 L917 390 L902 415 L873 431 L840 431 L816 415 L806 392 L808 361 Z",
            "M941 392 L954 388 L964 395 L964 410 L954 420 L941 415 Z"
        ];
        return /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$next$2f$dist$2f$server$2f$route$2d$modules$2f$app$2d$page$2f$vendored$2f$ssr$2f$react$2d$jsx$2d$dev$2d$runtime$2e$js__$5b$app$2d$ssr$5d$__$28$ecmascript$29$__["jsxDEV"])("div", {
            style: {
                width: '100%',
                height: '100%',
                position: 'relative',
                borderRadius: '18px',
                overflow: 'hidden',
                background: 'linear-gradient(180deg, rgba(120, 169, 255, 0.18), rgba(12, 20, 34, 0.1))'
            },
            children: [
                /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$next$2f$dist$2f$server$2f$route$2d$modules$2f$app$2d$page$2f$vendored$2f$ssr$2f$react$2d$jsx$2d$dev$2d$runtime$2e$js__$5b$app$2d$ssr$5d$__$28$ecmascript$29$__["jsxDEV"])("svg", {
                    viewBox: "0 0 1000 520",
                    preserveAspectRatio: "none",
                    style: {
                        width: '100%',
                        height: '100%',
                        display: 'block'
                    },
                    children: [
                        /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$next$2f$dist$2f$server$2f$route$2d$modules$2f$app$2d$page$2f$vendored$2f$ssr$2f$react$2d$jsx$2d$dev$2d$runtime$2e$js__$5b$app$2d$ssr$5d$__$28$ecmascript$29$__["jsxDEV"])("defs", {
                            children: /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$next$2f$dist$2f$server$2f$route$2d$modules$2f$app$2d$page$2f$vendored$2f$ssr$2f$react$2d$jsx$2d$dev$2d$runtime$2e$js__$5b$app$2d$ssr$5d$__$28$ecmascript$29$__["jsxDEV"])("linearGradient", {
                                id: "mapOcean",
                                x1: "0",
                                y1: "0",
                                x2: "0",
                                y2: "1",
                                children: [
                                    /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$next$2f$dist$2f$server$2f$route$2d$modules$2f$app$2d$page$2f$vendored$2f$ssr$2f$react$2d$jsx$2d$dev$2d$runtime$2e$js__$5b$app$2d$ssr$5d$__$28$ecmascript$29$__["jsxDEV"])("stop", {
                                        offset: "0%",
                                        stopColor: "rgba(132, 174, 255, 0.16)"
                                    }, void 0, false, {
                                        fileName: "[project]/src/components/visuals/ChartRenderer.tsx",
                                        lineNumber: 263,
                                        columnNumber: 29
                                    }, this),
                                    /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$next$2f$dist$2f$server$2f$route$2d$modules$2f$app$2d$page$2f$vendored$2f$ssr$2f$react$2d$jsx$2d$dev$2d$runtime$2e$js__$5b$app$2d$ssr$5d$__$28$ecmascript$29$__["jsxDEV"])("stop", {
                                        offset: "100%",
                                        stopColor: "rgba(10, 18, 31, 0.08)"
                                    }, void 0, false, {
                                        fileName: "[project]/src/components/visuals/ChartRenderer.tsx",
                                        lineNumber: 264,
                                        columnNumber: 29
                                    }, this)
                                ]
                            }, void 0, true, {
                                fileName: "[project]/src/components/visuals/ChartRenderer.tsx",
                                lineNumber: 262,
                                columnNumber: 25
                            }, this)
                        }, void 0, false, {
                            fileName: "[project]/src/components/visuals/ChartRenderer.tsx",
                            lineNumber: 261,
                            columnNumber: 21
                        }, this),
                        /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$next$2f$dist$2f$server$2f$route$2d$modules$2f$app$2d$page$2f$vendored$2f$ssr$2f$react$2d$jsx$2d$dev$2d$runtime$2e$js__$5b$app$2d$ssr$5d$__$28$ecmascript$29$__["jsxDEV"])("rect", {
                            x: "0",
                            y: "0",
                            width: "1000",
                            height: "520",
                            fill: "url(#mapOcean)"
                        }, void 0, false, {
                            fileName: "[project]/src/components/visuals/ChartRenderer.tsx",
                            lineNumber: 267,
                            columnNumber: 21
                        }, this),
                        [
                            125,
                            250,
                            375
                        ].map((y)=>/*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$next$2f$dist$2f$server$2f$route$2d$modules$2f$app$2d$page$2f$vendored$2f$ssr$2f$react$2d$jsx$2d$dev$2d$runtime$2e$js__$5b$app$2d$ssr$5d$__$28$ecmascript$29$__["jsxDEV"])("line", {
                                x1: "0",
                                y1: y,
                                x2: "1000",
                                y2: y,
                                stroke: "rgba(255,255,255,0.08)",
                                strokeWidth: "1"
                            }, y, false, {
                                fileName: "[project]/src/components/visuals/ChartRenderer.tsx",
                                lineNumber: 268,
                                columnNumber: 49
                            }, this)),
                        [
                            166,
                            333,
                            500,
                            666,
                            833
                        ].map((x)=>/*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$next$2f$dist$2f$server$2f$route$2d$modules$2f$app$2d$page$2f$vendored$2f$ssr$2f$react$2d$jsx$2d$dev$2d$runtime$2e$js__$5b$app$2d$ssr$5d$__$28$ecmascript$29$__["jsxDEV"])("line", {
                                x1: x,
                                y1: "0",
                                x2: x,
                                y2: "520",
                                stroke: "rgba(255,255,255,0.08)",
                                strokeWidth: "1"
                            }, x, false, {
                                fileName: "[project]/src/components/visuals/ChartRenderer.tsx",
                                lineNumber: 269,
                                columnNumber: 59
                            }, this)),
                        worldPaths.map((path, index)=>/*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$next$2f$dist$2f$server$2f$route$2d$modules$2f$app$2d$page$2f$vendored$2f$ssr$2f$react$2d$jsx$2d$dev$2d$runtime$2e$js__$5b$app$2d$ssr$5d$__$28$ecmascript$29$__["jsxDEV"])("path", {
                                d: path,
                                fill: "rgba(255,255,255,0.1)",
                                stroke: "rgba(255,255,255,0.14)",
                                strokeWidth: "1.2",
                                vectorEffect: "non-scaling-stroke"
                            }, index, false, {
                                fileName: "[project]/src/components/visuals/ChartRenderer.tsx",
                                lineNumber: 271,
                                columnNumber: 25
                            }, this)),
                        points.map((point, index)=>{
                            const x = projectX(point.lon) * 10;
                            const y = projectY(point.lat) * 5.2;
                            const radius = 6 + Math.abs(point.value || 0) / maxValue * 18;
                            const fill = activeColors[index % activeColors.length];
                            return /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$next$2f$dist$2f$server$2f$route$2d$modules$2f$app$2d$page$2f$vendored$2f$ssr$2f$react$2d$jsx$2d$dev$2d$runtime$2e$js__$5b$app$2d$ssr$5d$__$28$ecmascript$29$__["jsxDEV"])("g", {
                                children: [
                                    /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$next$2f$dist$2f$server$2f$route$2d$modules$2f$app$2d$page$2f$vendored$2f$ssr$2f$react$2d$jsx$2d$dev$2d$runtime$2e$js__$5b$app$2d$ssr$5d$__$28$ecmascript$29$__["jsxDEV"])("circle", {
                                        cx: x,
                                        cy: y,
                                        r: radius + 6,
                                        fill: fill,
                                        opacity: "0.14"
                                    }, void 0, false, {
                                        fileName: "[project]/src/components/visuals/ChartRenderer.tsx",
                                        lineNumber: 287,
                                        columnNumber: 33
                                    }, this),
                                    /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$next$2f$dist$2f$server$2f$route$2d$modules$2f$app$2d$page$2f$vendored$2f$ssr$2f$react$2d$jsx$2d$dev$2d$runtime$2e$js__$5b$app$2d$ssr$5d$__$28$ecmascript$29$__["jsxDEV"])("circle", {
                                        cx: x,
                                        cy: y,
                                        r: radius,
                                        fill: fill,
                                        fillOpacity: "0.82",
                                        stroke: "rgba(255,255,255,0.85)",
                                        strokeWidth: "1.5"
                                    }, void 0, false, {
                                        fileName: "[project]/src/components/visuals/ChartRenderer.tsx",
                                        lineNumber: 288,
                                        columnNumber: 33
                                    }, this)
                                ]
                            }, `${point.label}-${index}`, true, {
                                fileName: "[project]/src/components/visuals/ChartRenderer.tsx",
                                lineNumber: 286,
                                columnNumber: 29
                            }, this);
                        })
                    ]
                }, void 0, true, {
                    fileName: "[project]/src/components/visuals/ChartRenderer.tsx",
                    lineNumber: 260,
                    columnNumber: 17
                }, this),
                points.length === 0 && /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$next$2f$dist$2f$server$2f$route$2d$modules$2f$app$2d$page$2f$vendored$2f$ssr$2f$react$2d$jsx$2d$dev$2d$runtime$2e$js__$5b$app$2d$ssr$5d$__$28$ecmascript$29$__["jsxDEV"])("div", {
                    style: {
                        position: 'absolute',
                        inset: 0,
                        display: 'flex',
                        alignItems: 'center',
                        justifyContent: 'center',
                        color: 'var(--text-muted)',
                        fontSize: '0.9rem'
                    },
                    children: "No valid coordinates to display"
                }, void 0, false, {
                    fileName: "[project]/src/components/visuals/ChartRenderer.tsx",
                    lineNumber: 294,
                    columnNumber: 21
                }, this)
            ]
        }, void 0, true, {
            fileName: "[project]/src/components/visuals/ChartRenderer.tsx",
            lineNumber: 259,
            columnNumber: 13
        }, this);
    }
    const commonProps = {
        data,
        margin: {
            top: 10,
            right: 30,
            left: 0,
            bottom: 20
        },
        style: {
            fontFamily: CHART_FONT_FAMILY
        }
    };
    const axisProps = {
        stroke: 'var(--text-muted)',
        fontSize: 11,
        tickLine: false,
        axisLine: false,
        tick: {
            fontFamily: CHART_FONT_FAMILY,
            fontSize: 11,
            fill: 'var(--text-muted)'
        }
    };
    const legendProps = {
        iconType: 'circle',
        wrapperStyle: {
            fontFamily: CHART_FONT_FAMILY,
            fontSize: '11px'
        }
    };
    const getChart = ()=>{
        switch(type){
            case 'treemap':
                const treemapData = data.map((d, index)=>({
                        name: String(d[xAxis]),
                        value: Number(d[yAxis]),
                        fill: activeColors[index % activeColors.length]
                    }));
                return /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$next$2f$dist$2f$server$2f$route$2d$modules$2f$app$2d$page$2f$vendored$2f$ssr$2f$react$2d$jsx$2d$dev$2d$runtime$2e$js__$5b$app$2d$ssr$5d$__$28$ecmascript$29$__["jsxDEV"])(__TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$next$2f$dist$2f$server$2f$route$2d$modules$2f$app$2d$page$2f$vendored$2f$ssr$2f$react$2d$jsx$2d$dev$2d$runtime$2e$js__$5b$app$2d$ssr$5d$__$28$ecmascript$29$__["Fragment"], {
                    children: [
                        /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$next$2f$dist$2f$server$2f$route$2d$modules$2f$app$2d$page$2f$vendored$2f$ssr$2f$react$2d$jsx$2d$dev$2d$runtime$2e$js__$5b$app$2d$ssr$5d$__$28$ecmascript$29$__["jsxDEV"])(__TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$recharts$2f$es6$2f$chart$2f$Treemap$2e$js__$5b$app$2d$ssr$5d$__$28$ecmascript$29$__["Treemap"], {
                            data: treemapData,
                            dataKey: "value",
                            nameKey: "name",
                            animationDuration: 1000,
                            content: renderTreemapNode
                        }, void 0, false, {
                            fileName: "[project]/src/components/visuals/ChartRenderer.tsx",
                            lineNumber: 331,
                            columnNumber: 25
                        }, this),
                        /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$next$2f$dist$2f$server$2f$route$2d$modules$2f$app$2d$page$2f$vendored$2f$ssr$2f$react$2d$jsx$2d$dev$2d$runtime$2e$js__$5b$app$2d$ssr$5d$__$28$ecmascript$29$__["jsxDEV"])(__TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$recharts$2f$es6$2f$component$2f$Tooltip$2e$js__$5b$app$2d$ssr$5d$__$28$ecmascript$29$__["Tooltip"], {
                            content: /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$next$2f$dist$2f$server$2f$route$2d$modules$2f$app$2d$page$2f$vendored$2f$ssr$2f$react$2d$jsx$2d$dev$2d$runtime$2e$js__$5b$app$2d$ssr$5d$__$28$ecmascript$29$__["jsxDEV"])(CustomTooltip, {}, void 0, false, {
                                fileName: "[project]/src/components/visuals/ChartRenderer.tsx",
                                lineNumber: 338,
                                columnNumber: 43
                            }, void 0),
                            isAnimationActive: false
                        }, void 0, false, {
                            fileName: "[project]/src/components/visuals/ChartRenderer.tsx",
                            lineNumber: 338,
                            columnNumber: 25
                        }, this)
                    ]
                }, void 0, true);
            case 'bar':
                const isHorizontal = orientation === 'horizontal';
                return /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$next$2f$dist$2f$server$2f$route$2d$modules$2f$app$2d$page$2f$vendored$2f$ssr$2f$react$2d$jsx$2d$dev$2d$runtime$2e$js__$5b$app$2d$ssr$5d$__$28$ecmascript$29$__["jsxDEV"])(__TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$recharts$2f$es6$2f$chart$2f$BarChart$2e$js__$5b$app$2d$ssr$5d$__$28$ecmascript$29$__["BarChart"], {
                    ...commonProps,
                    layout: isHorizontal ? 'vertical' : 'horizontal',
                    children: [
                        /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$next$2f$dist$2f$server$2f$route$2d$modules$2f$app$2d$page$2f$vendored$2f$ssr$2f$react$2d$jsx$2d$dev$2d$runtime$2e$js__$5b$app$2d$ssr$5d$__$28$ecmascript$29$__["jsxDEV"])(__TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$recharts$2f$es6$2f$cartesian$2f$CartesianGrid$2e$js__$5b$app$2d$ssr$5d$__$28$ecmascript$29$__["CartesianGrid"], {
                            strokeDasharray: "3 3",
                            stroke: "rgba(255,255,255,0.05)",
                            vertical: false
                        }, void 0, false, {
                            fileName: "[project]/src/components/visuals/ChartRenderer.tsx",
                            lineNumber: 346,
                            columnNumber: 25
                        }, this),
                        isHorizontal ? /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$next$2f$dist$2f$server$2f$route$2d$modules$2f$app$2d$page$2f$vendored$2f$ssr$2f$react$2d$jsx$2d$dev$2d$runtime$2e$js__$5b$app$2d$ssr$5d$__$28$ecmascript$29$__["jsxDEV"])(__TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$next$2f$dist$2f$server$2f$route$2d$modules$2f$app$2d$page$2f$vendored$2f$ssr$2f$react$2d$jsx$2d$dev$2d$runtime$2e$js__$5b$app$2d$ssr$5d$__$28$ecmascript$29$__["Fragment"], {
                            children: [
                                /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$next$2f$dist$2f$server$2f$route$2d$modules$2f$app$2d$page$2f$vendored$2f$ssr$2f$react$2d$jsx$2d$dev$2d$runtime$2e$js__$5b$app$2d$ssr$5d$__$28$ecmascript$29$__["jsxDEV"])(__TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$recharts$2f$es6$2f$cartesian$2f$XAxis$2e$js__$5b$app$2d$ssr$5d$__$28$ecmascript$29$__["XAxis"], {
                                    type: "number",
                                    ...axisProps,
                                    tickFormatter: (value)=>formatDisplayValue(value, yAxis)
                                }, void 0, false, {
                                    fileName: "[project]/src/components/visuals/ChartRenderer.tsx",
                                    lineNumber: 349,
                                    columnNumber: 33
                                }, this),
                                /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$next$2f$dist$2f$server$2f$route$2d$modules$2f$app$2d$page$2f$vendored$2f$ssr$2f$react$2d$jsx$2d$dev$2d$runtime$2e$js__$5b$app$2d$ssr$5d$__$28$ecmascript$29$__["jsxDEV"])(__TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$recharts$2f$es6$2f$cartesian$2f$YAxis$2e$js__$5b$app$2d$ssr$5d$__$28$ecmascript$29$__["YAxis"], {
                                    dataKey: xAxis,
                                    type: "category",
                                    ...axisProps,
                                    width: 100,
                                    tickFormatter: (value)=>formatDisplayValue(value, xAxis)
                                }, void 0, false, {
                                    fileName: "[project]/src/components/visuals/ChartRenderer.tsx",
                                    lineNumber: 350,
                                    columnNumber: 33
                                }, this)
                            ]
                        }, void 0, true) : /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$next$2f$dist$2f$server$2f$route$2d$modules$2f$app$2d$page$2f$vendored$2f$ssr$2f$react$2d$jsx$2d$dev$2d$runtime$2e$js__$5b$app$2d$ssr$5d$__$28$ecmascript$29$__["jsxDEV"])(__TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$next$2f$dist$2f$server$2f$route$2d$modules$2f$app$2d$page$2f$vendored$2f$ssr$2f$react$2d$jsx$2d$dev$2d$runtime$2e$js__$5b$app$2d$ssr$5d$__$28$ecmascript$29$__["Fragment"], {
                            children: [
                                /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$next$2f$dist$2f$server$2f$route$2d$modules$2f$app$2d$page$2f$vendored$2f$ssr$2f$react$2d$jsx$2d$dev$2d$runtime$2e$js__$5b$app$2d$ssr$5d$__$28$ecmascript$29$__["jsxDEV"])(__TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$recharts$2f$es6$2f$cartesian$2f$XAxis$2e$js__$5b$app$2d$ssr$5d$__$28$ecmascript$29$__["XAxis"], {
                                    dataKey: xAxis,
                                    ...axisProps,
                                    tickFormatter: (value)=>formatDisplayValue(value, xAxis)
                                }, void 0, false, {
                                    fileName: "[project]/src/components/visuals/ChartRenderer.tsx",
                                    lineNumber: 354,
                                    columnNumber: 33
                                }, this),
                                /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$next$2f$dist$2f$server$2f$route$2d$modules$2f$app$2d$page$2f$vendored$2f$ssr$2f$react$2d$jsx$2d$dev$2d$runtime$2e$js__$5b$app$2d$ssr$5d$__$28$ecmascript$29$__["jsxDEV"])(__TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$recharts$2f$es6$2f$cartesian$2f$YAxis$2e$js__$5b$app$2d$ssr$5d$__$28$ecmascript$29$__["YAxis"], {
                                    ...axisProps,
                                    tickFormatter: (value)=>formatDisplayValue(value, yAxis)
                                }, void 0, false, {
                                    fileName: "[project]/src/components/visuals/ChartRenderer.tsx",
                                    lineNumber: 355,
                                    columnNumber: 33
                                }, this)
                            ]
                        }, void 0, true),
                        /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$next$2f$dist$2f$server$2f$route$2d$modules$2f$app$2d$page$2f$vendored$2f$ssr$2f$react$2d$jsx$2d$dev$2d$runtime$2e$js__$5b$app$2d$ssr$5d$__$28$ecmascript$29$__["jsxDEV"])(__TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$recharts$2f$es6$2f$component$2f$Tooltip$2e$js__$5b$app$2d$ssr$5d$__$28$ecmascript$29$__["Tooltip"], {
                            content: /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$next$2f$dist$2f$server$2f$route$2d$modules$2f$app$2d$page$2f$vendored$2f$ssr$2f$react$2d$jsx$2d$dev$2d$runtime$2e$js__$5b$app$2d$ssr$5d$__$28$ecmascript$29$__["jsxDEV"])(CustomTooltip, {}, void 0, false, {
                                fileName: "[project]/src/components/visuals/ChartRenderer.tsx",
                                lineNumber: 358,
                                columnNumber: 43
                            }, void 0),
                            cursor: {
                                fill: 'rgba(255,255,255,0.02)'
                            },
                            isAnimationActive: false
                        }, void 0, false, {
                            fileName: "[project]/src/components/visuals/ChartRenderer.tsx",
                            lineNumber: 358,
                            columnNumber: 25
                        }, this),
                        /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$next$2f$dist$2f$server$2f$route$2d$modules$2f$app$2d$page$2f$vendored$2f$ssr$2f$react$2d$jsx$2d$dev$2d$runtime$2e$js__$5b$app$2d$ssr$5d$__$28$ecmascript$29$__["jsxDEV"])(__TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$recharts$2f$es6$2f$component$2f$Legend$2e$js__$5b$app$2d$ssr$5d$__$28$ecmascript$29$__["Legend"], {
                            ...legendProps
                        }, void 0, false, {
                            fileName: "[project]/src/components/visuals/ChartRenderer.tsx",
                            lineNumber: 359,
                            columnNumber: 25
                        }, this),
                        /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$next$2f$dist$2f$server$2f$route$2d$modules$2f$app$2d$page$2f$vendored$2f$ssr$2f$react$2d$jsx$2d$dev$2d$runtime$2e$js__$5b$app$2d$ssr$5d$__$28$ecmascript$29$__["jsxDEV"])(__TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$recharts$2f$es6$2f$cartesian$2f$Bar$2e$js__$5b$app$2d$ssr$5d$__$28$ecmascript$29$__["Bar"], {
                            dataKey: yAxis,
                            radius: isHorizontal ? [
                                0,
                                4,
                                4,
                                0
                            ] : [
                                4,
                                4,
                                0,
                                0
                            ],
                            animationDuration: 1000,
                            fill: activeColors[0] || '#8b5cf6',
                            name: formatDisplayValue(yAxis),
                            children: colorScheme === 'varied' || colorScheme === 'blues' ? data.map((_, index)=>/*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$next$2f$dist$2f$server$2f$route$2d$modules$2f$app$2d$page$2f$vendored$2f$ssr$2f$react$2d$jsx$2d$dev$2d$runtime$2e$js__$5b$app$2d$ssr$5d$__$28$ecmascript$29$__["jsxDEV"])(__TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$recharts$2f$es6$2f$component$2f$Cell$2e$js__$5b$app$2d$ssr$5d$__$28$ecmascript$29$__["Cell"], {
                                    fill: activeColors[index % activeColors.length] || activeColors[0] || '#8b5cf6'
                                }, `cell-${index}`, false, {
                                    fileName: "[project]/src/components/visuals/ChartRenderer.tsx",
                                    lineNumber: 369,
                                    columnNumber: 37
                                }, this)) : // For 'solid', the filling is handled by the Bar prop, 
                            // but we add a Cell for consistency in Recharts rendering if needed
                            data.map((_, index)=>/*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$next$2f$dist$2f$server$2f$route$2d$modules$2f$app$2d$page$2f$vendored$2f$ssr$2f$react$2d$jsx$2d$dev$2d$runtime$2e$js__$5b$app$2d$ssr$5d$__$28$ecmascript$29$__["jsxDEV"])(__TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$recharts$2f$es6$2f$component$2f$Cell$2e$js__$5b$app$2d$ssr$5d$__$28$ecmascript$29$__["Cell"], {
                                    fill: activeColors[0] || '#8b5cf6'
                                }, `cell-${index}`, false, {
                                    fileName: "[project]/src/components/visuals/ChartRenderer.tsx",
                                    lineNumber: 378,
                                    columnNumber: 37
                                }, this))
                        }, void 0, false, {
                            fileName: "[project]/src/components/visuals/ChartRenderer.tsx",
                            lineNumber: 360,
                            columnNumber: 25
                        }, this)
                    ]
                }, void 0, true, {
                    fileName: "[project]/src/components/visuals/ChartRenderer.tsx",
                    lineNumber: 345,
                    columnNumber: 21
                }, this);
            case 'line':
                return /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$next$2f$dist$2f$server$2f$route$2d$modules$2f$app$2d$page$2f$vendored$2f$ssr$2f$react$2d$jsx$2d$dev$2d$runtime$2e$js__$5b$app$2d$ssr$5d$__$28$ecmascript$29$__["jsxDEV"])(__TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$recharts$2f$es6$2f$chart$2f$LineChart$2e$js__$5b$app$2d$ssr$5d$__$28$ecmascript$29$__["LineChart"], {
                    ...commonProps,
                    children: [
                        /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$next$2f$dist$2f$server$2f$route$2d$modules$2f$app$2d$page$2f$vendored$2f$ssr$2f$react$2d$jsx$2d$dev$2d$runtime$2e$js__$5b$app$2d$ssr$5d$__$28$ecmascript$29$__["jsxDEV"])(__TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$recharts$2f$es6$2f$cartesian$2f$CartesianGrid$2e$js__$5b$app$2d$ssr$5d$__$28$ecmascript$29$__["CartesianGrid"], {
                            strokeDasharray: "3 3",
                            stroke: "rgba(255,255,255,0.05)",
                            vertical: false
                        }, void 0, false, {
                            fileName: "[project]/src/components/visuals/ChartRenderer.tsx",
                            lineNumber: 388,
                            columnNumber: 25
                        }, this),
                        /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$next$2f$dist$2f$server$2f$route$2d$modules$2f$app$2d$page$2f$vendored$2f$ssr$2f$react$2d$jsx$2d$dev$2d$runtime$2e$js__$5b$app$2d$ssr$5d$__$28$ecmascript$29$__["jsxDEV"])(__TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$recharts$2f$es6$2f$cartesian$2f$XAxis$2e$js__$5b$app$2d$ssr$5d$__$28$ecmascript$29$__["XAxis"], {
                            dataKey: xAxis,
                            ...axisProps
                        }, void 0, false, {
                            fileName: "[project]/src/components/visuals/ChartRenderer.tsx",
                            lineNumber: 389,
                            columnNumber: 25
                        }, this),
                        /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$next$2f$dist$2f$server$2f$route$2d$modules$2f$app$2d$page$2f$vendored$2f$ssr$2f$react$2d$jsx$2d$dev$2d$runtime$2e$js__$5b$app$2d$ssr$5d$__$28$ecmascript$29$__["jsxDEV"])(__TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$recharts$2f$es6$2f$cartesian$2f$YAxis$2e$js__$5b$app$2d$ssr$5d$__$28$ecmascript$29$__["YAxis"], {
                            ...axisProps
                        }, void 0, false, {
                            fileName: "[project]/src/components/visuals/ChartRenderer.tsx",
                            lineNumber: 390,
                            columnNumber: 25
                        }, this),
                        /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$next$2f$dist$2f$server$2f$route$2d$modules$2f$app$2d$page$2f$vendored$2f$ssr$2f$react$2d$jsx$2d$dev$2d$runtime$2e$js__$5b$app$2d$ssr$5d$__$28$ecmascript$29$__["jsxDEV"])(__TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$recharts$2f$es6$2f$component$2f$Tooltip$2e$js__$5b$app$2d$ssr$5d$__$28$ecmascript$29$__["Tooltip"], {
                            content: /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$next$2f$dist$2f$server$2f$route$2d$modules$2f$app$2d$page$2f$vendored$2f$ssr$2f$react$2d$jsx$2d$dev$2d$runtime$2e$js__$5b$app$2d$ssr$5d$__$28$ecmascript$29$__["jsxDEV"])(CustomTooltip, {}, void 0, false, {
                                fileName: "[project]/src/components/visuals/ChartRenderer.tsx",
                                lineNumber: 391,
                                columnNumber: 43
                            }, void 0),
                            isAnimationActive: false
                        }, void 0, false, {
                            fileName: "[project]/src/components/visuals/ChartRenderer.tsx",
                            lineNumber: 391,
                            columnNumber: 25
                        }, this),
                        /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$next$2f$dist$2f$server$2f$route$2d$modules$2f$app$2d$page$2f$vendored$2f$ssr$2f$react$2d$jsx$2d$dev$2d$runtime$2e$js__$5b$app$2d$ssr$5d$__$28$ecmascript$29$__["jsxDEV"])(__TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$recharts$2f$es6$2f$component$2f$Legend$2e$js__$5b$app$2d$ssr$5d$__$28$ecmascript$29$__["Legend"], {
                            ...legendProps
                        }, void 0, false, {
                            fileName: "[project]/src/components/visuals/ChartRenderer.tsx",
                            lineNumber: 392,
                            columnNumber: 25
                        }, this),
                        /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$next$2f$dist$2f$server$2f$route$2d$modules$2f$app$2d$page$2f$vendored$2f$ssr$2f$react$2d$jsx$2d$dev$2d$runtime$2e$js__$5b$app$2d$ssr$5d$__$28$ecmascript$29$__["jsxDEV"])(__TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$recharts$2f$es6$2f$cartesian$2f$Line$2e$js__$5b$app$2d$ssr$5d$__$28$ecmascript$29$__["Line"], {
                            type: "monotone",
                            dataKey: yAxis,
                            stroke: activeColors[0],
                            strokeWidth: 3,
                            dot: {
                                r: 4,
                                fill: activeColors[0],
                                strokeWidth: 2,
                                stroke: 'var(--background)'
                            },
                            activeDot: {
                                r: 6,
                                strokeWidth: 0
                            },
                            animationDuration: 1000,
                            name: formatDisplayValue(yAxis)
                        }, void 0, false, {
                            fileName: "[project]/src/components/visuals/ChartRenderer.tsx",
                            lineNumber: 393,
                            columnNumber: 25
                        }, this)
                    ]
                }, void 0, true, {
                    fileName: "[project]/src/components/visuals/ChartRenderer.tsx",
                    lineNumber: 387,
                    columnNumber: 21
                }, this);
            case 'area':
                return /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$next$2f$dist$2f$server$2f$route$2d$modules$2f$app$2d$page$2f$vendored$2f$ssr$2f$react$2d$jsx$2d$dev$2d$runtime$2e$js__$5b$app$2d$ssr$5d$__$28$ecmascript$29$__["jsxDEV"])(__TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$recharts$2f$es6$2f$chart$2f$AreaChart$2e$js__$5b$app$2d$ssr$5d$__$28$ecmascript$29$__["AreaChart"], {
                    ...commonProps,
                    children: [
                        /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$next$2f$dist$2f$server$2f$route$2d$modules$2f$app$2d$page$2f$vendored$2f$ssr$2f$react$2d$jsx$2d$dev$2d$runtime$2e$js__$5b$app$2d$ssr$5d$__$28$ecmascript$29$__["jsxDEV"])("defs", {
                            children: /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$next$2f$dist$2f$server$2f$route$2d$modules$2f$app$2d$page$2f$vendored$2f$ssr$2f$react$2d$jsx$2d$dev$2d$runtime$2e$js__$5b$app$2d$ssr$5d$__$28$ecmascript$29$__["jsxDEV"])("linearGradient", {
                                id: "colorValue",
                                x1: "0",
                                y1: "0",
                                x2: "0",
                                y2: "1",
                                children: [
                                    /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$next$2f$dist$2f$server$2f$route$2d$modules$2f$app$2d$page$2f$vendored$2f$ssr$2f$react$2d$jsx$2d$dev$2d$runtime$2e$js__$5b$app$2d$ssr$5d$__$28$ecmascript$29$__["jsxDEV"])("stop", {
                                        offset: "5%",
                                        stopColor: activeColors[0],
                                        stopOpacity: 0.3
                                    }, void 0, false, {
                                        fileName: "[project]/src/components/visuals/ChartRenderer.tsx",
                                        lineNumber: 402,
                                        columnNumber: 33
                                    }, this),
                                    /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$next$2f$dist$2f$server$2f$route$2d$modules$2f$app$2d$page$2f$vendored$2f$ssr$2f$react$2d$jsx$2d$dev$2d$runtime$2e$js__$5b$app$2d$ssr$5d$__$28$ecmascript$29$__["jsxDEV"])("stop", {
                                        offset: "95%",
                                        stopColor: activeColors[0],
                                        stopOpacity: 0
                                    }, void 0, false, {
                                        fileName: "[project]/src/components/visuals/ChartRenderer.tsx",
                                        lineNumber: 403,
                                        columnNumber: 33
                                    }, this)
                                ]
                            }, void 0, true, {
                                fileName: "[project]/src/components/visuals/ChartRenderer.tsx",
                                lineNumber: 401,
                                columnNumber: 29
                            }, this)
                        }, void 0, false, {
                            fileName: "[project]/src/components/visuals/ChartRenderer.tsx",
                            lineNumber: 400,
                            columnNumber: 25
                        }, this),
                        /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$next$2f$dist$2f$server$2f$route$2d$modules$2f$app$2d$page$2f$vendored$2f$ssr$2f$react$2d$jsx$2d$dev$2d$runtime$2e$js__$5b$app$2d$ssr$5d$__$28$ecmascript$29$__["jsxDEV"])(__TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$recharts$2f$es6$2f$cartesian$2f$CartesianGrid$2e$js__$5b$app$2d$ssr$5d$__$28$ecmascript$29$__["CartesianGrid"], {
                            strokeDasharray: "3 3",
                            stroke: "rgba(255,255,255,0.05)",
                            vertical: false
                        }, void 0, false, {
                            fileName: "[project]/src/components/visuals/ChartRenderer.tsx",
                            lineNumber: 406,
                            columnNumber: 25
                        }, this),
                        /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$next$2f$dist$2f$server$2f$route$2d$modules$2f$app$2d$page$2f$vendored$2f$ssr$2f$react$2d$jsx$2d$dev$2d$runtime$2e$js__$5b$app$2d$ssr$5d$__$28$ecmascript$29$__["jsxDEV"])(__TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$recharts$2f$es6$2f$cartesian$2f$XAxis$2e$js__$5b$app$2d$ssr$5d$__$28$ecmascript$29$__["XAxis"], {
                            dataKey: xAxis,
                            ...axisProps
                        }, void 0, false, {
                            fileName: "[project]/src/components/visuals/ChartRenderer.tsx",
                            lineNumber: 407,
                            columnNumber: 25
                        }, this),
                        /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$next$2f$dist$2f$server$2f$route$2d$modules$2f$app$2d$page$2f$vendored$2f$ssr$2f$react$2d$jsx$2d$dev$2d$runtime$2e$js__$5b$app$2d$ssr$5d$__$28$ecmascript$29$__["jsxDEV"])(__TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$recharts$2f$es6$2f$cartesian$2f$YAxis$2e$js__$5b$app$2d$ssr$5d$__$28$ecmascript$29$__["YAxis"], {
                            ...axisProps
                        }, void 0, false, {
                            fileName: "[project]/src/components/visuals/ChartRenderer.tsx",
                            lineNumber: 408,
                            columnNumber: 25
                        }, this),
                        /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$next$2f$dist$2f$server$2f$route$2d$modules$2f$app$2d$page$2f$vendored$2f$ssr$2f$react$2d$jsx$2d$dev$2d$runtime$2e$js__$5b$app$2d$ssr$5d$__$28$ecmascript$29$__["jsxDEV"])(__TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$recharts$2f$es6$2f$component$2f$Tooltip$2e$js__$5b$app$2d$ssr$5d$__$28$ecmascript$29$__["Tooltip"], {
                            content: /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$next$2f$dist$2f$server$2f$route$2d$modules$2f$app$2d$page$2f$vendored$2f$ssr$2f$react$2d$jsx$2d$dev$2d$runtime$2e$js__$5b$app$2d$ssr$5d$__$28$ecmascript$29$__["jsxDEV"])(CustomTooltip, {}, void 0, false, {
                                fileName: "[project]/src/components/visuals/ChartRenderer.tsx",
                                lineNumber: 409,
                                columnNumber: 43
                            }, void 0),
                            isAnimationActive: false
                        }, void 0, false, {
                            fileName: "[project]/src/components/visuals/ChartRenderer.tsx",
                            lineNumber: 409,
                            columnNumber: 25
                        }, this),
                        /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$next$2f$dist$2f$server$2f$route$2d$modules$2f$app$2d$page$2f$vendored$2f$ssr$2f$react$2d$jsx$2d$dev$2d$runtime$2e$js__$5b$app$2d$ssr$5d$__$28$ecmascript$29$__["jsxDEV"])(__TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$recharts$2f$es6$2f$component$2f$Legend$2e$js__$5b$app$2d$ssr$5d$__$28$ecmascript$29$__["Legend"], {
                            ...legendProps
                        }, void 0, false, {
                            fileName: "[project]/src/components/visuals/ChartRenderer.tsx",
                            lineNumber: 410,
                            columnNumber: 25
                        }, this),
                        /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$next$2f$dist$2f$server$2f$route$2d$modules$2f$app$2d$page$2f$vendored$2f$ssr$2f$react$2d$jsx$2d$dev$2d$runtime$2e$js__$5b$app$2d$ssr$5d$__$28$ecmascript$29$__["jsxDEV"])(__TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$recharts$2f$es6$2f$cartesian$2f$Area$2e$js__$5b$app$2d$ssr$5d$__$28$ecmascript$29$__["Area"], {
                            type: "monotone",
                            dataKey: yAxis,
                            stroke: activeColors[0],
                            fillOpacity: 1,
                            fill: "url(#colorValue)",
                            strokeWidth: 3,
                            animationDuration: 1000,
                            name: formatDisplayValue(yAxis)
                        }, void 0, false, {
                            fileName: "[project]/src/components/visuals/ChartRenderer.tsx",
                            lineNumber: 411,
                            columnNumber: 25
                        }, this)
                    ]
                }, void 0, true, {
                    fileName: "[project]/src/components/visuals/ChartRenderer.tsx",
                    lineNumber: 399,
                    columnNumber: 21
                }, this);
            case 'pie':
                return /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$next$2f$dist$2f$server$2f$route$2d$modules$2f$app$2d$page$2f$vendored$2f$ssr$2f$react$2d$jsx$2d$dev$2d$runtime$2e$js__$5b$app$2d$ssr$5d$__$28$ecmascript$29$__["jsxDEV"])(__TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$recharts$2f$es6$2f$chart$2f$PieChart$2e$js__$5b$app$2d$ssr$5d$__$28$ecmascript$29$__["PieChart"], {
                    style: {
                        fontFamily: CHART_FONT_FAMILY
                    },
                    children: [
                        /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$next$2f$dist$2f$server$2f$route$2d$modules$2f$app$2d$page$2f$vendored$2f$ssr$2f$react$2d$jsx$2d$dev$2d$runtime$2e$js__$5b$app$2d$ssr$5d$__$28$ecmascript$29$__["jsxDEV"])(__TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$recharts$2f$es6$2f$polar$2f$Pie$2e$js__$5b$app$2d$ssr$5d$__$28$ecmascript$29$__["Pie"], {
                            data: data,
                            dataKey: yAxis,
                            nameKey: xAxis,
                            cx: "50%",
                            cy: "50%",
                            innerRadius: "40%",
                            outerRadius: "70%",
                            paddingAngle: 5,
                            labelLine: false,
                            animationDuration: 1000,
                            children: data.map((_, index)=>/*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$next$2f$dist$2f$server$2f$route$2d$modules$2f$app$2d$page$2f$vendored$2f$ssr$2f$react$2d$jsx$2d$dev$2d$runtime$2e$js__$5b$app$2d$ssr$5d$__$28$ecmascript$29$__["jsxDEV"])(__TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$recharts$2f$es6$2f$component$2f$Cell$2e$js__$5b$app$2d$ssr$5d$__$28$ecmascript$29$__["Cell"], {
                                    fill: activeColors[index % activeColors.length],
                                    stroke: "transparent"
                                }, `cell-${index}`, false, {
                                    fileName: "[project]/src/components/visuals/ChartRenderer.tsx",
                                    lineNumber: 420,
                                    columnNumber: 33
                                }, this))
                        }, void 0, false, {
                            fileName: "[project]/src/components/visuals/ChartRenderer.tsx",
                            lineNumber: 418,
                            columnNumber: 25
                        }, this),
                        /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$next$2f$dist$2f$server$2f$route$2d$modules$2f$app$2d$page$2f$vendored$2f$ssr$2f$react$2d$jsx$2d$dev$2d$runtime$2e$js__$5b$app$2d$ssr$5d$__$28$ecmascript$29$__["jsxDEV"])(__TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$recharts$2f$es6$2f$component$2f$Tooltip$2e$js__$5b$app$2d$ssr$5d$__$28$ecmascript$29$__["Tooltip"], {
                            content: /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$next$2f$dist$2f$server$2f$route$2d$modules$2f$app$2d$page$2f$vendored$2f$ssr$2f$react$2d$jsx$2d$dev$2d$runtime$2e$js__$5b$app$2d$ssr$5d$__$28$ecmascript$29$__["jsxDEV"])(CustomTooltip, {}, void 0, false, {
                                fileName: "[project]/src/components/visuals/ChartRenderer.tsx",
                                lineNumber: 423,
                                columnNumber: 43
                            }, void 0),
                            isAnimationActive: false
                        }, void 0, false, {
                            fileName: "[project]/src/components/visuals/ChartRenderer.tsx",
                            lineNumber: 423,
                            columnNumber: 25
                        }, this),
                        /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$next$2f$dist$2f$server$2f$route$2d$modules$2f$app$2d$page$2f$vendored$2f$ssr$2f$react$2d$jsx$2d$dev$2d$runtime$2e$js__$5b$app$2d$ssr$5d$__$28$ecmascript$29$__["jsxDEV"])(__TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$recharts$2f$es6$2f$component$2f$Legend$2e$js__$5b$app$2d$ssr$5d$__$28$ecmascript$29$__["Legend"], {
                            ...legendProps,
                            layout: "horizontal",
                            align: "center",
                            verticalAlign: "bottom",
                            wrapperStyle: {
                                ...legendProps.wrapperStyle,
                                paddingTop: '20px',
                                fontSize: '10px'
                            }
                        }, void 0, false, {
                            fileName: "[project]/src/components/visuals/ChartRenderer.tsx",
                            lineNumber: 424,
                            columnNumber: 25
                        }, this)
                    ]
                }, void 0, true, {
                    fileName: "[project]/src/components/visuals/ChartRenderer.tsx",
                    lineNumber: 417,
                    columnNumber: 21
                }, this);
            default:
                return null;
        }
    };
    return /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$next$2f$dist$2f$server$2f$route$2d$modules$2f$app$2d$page$2f$vendored$2f$ssr$2f$react$2d$jsx$2d$dev$2d$runtime$2e$js__$5b$app$2d$ssr$5d$__$28$ecmascript$29$__["jsxDEV"])(__TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$recharts$2f$es6$2f$component$2f$ResponsiveContainer$2e$js__$5b$app$2d$ssr$5d$__$28$ecmascript$29$__["ResponsiveContainer"], {
        width: "100%",
        height: "100%",
        minWidth: 0,
        minHeight: 0,
        debounce: 100,
        children: getChart() || /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$next$2f$dist$2f$server$2f$route$2d$modules$2f$app$2d$page$2f$vendored$2f$ssr$2f$react$2d$jsx$2d$dev$2d$runtime$2e$js__$5b$app$2d$ssr$5d$__$28$ecmascript$29$__["jsxDEV"])("div", {
            style: {
                textAlign: 'center',
                paddingTop: '20%'
            },
            children: "Chart tipo no soportado"
        }, void 0, false, {
            fileName: "[project]/src/components/visuals/ChartRenderer.tsx",
            lineNumber: 434,
            columnNumber: 28
        }, this)
    }, void 0, false, {
        fileName: "[project]/src/components/visuals/ChartRenderer.tsx",
        lineNumber: 433,
        columnNumber: 9
    }, this);
}
}),
"[project]/src/components/canvas/ReportCanvas.tsx [app-ssr] (ecmascript)", ((__turbopack_context__) => {
"use strict";

__turbopack_context__.s([
    "default",
    ()=>__TURBOPACK__default__export__
]);
var __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$next$2f$dist$2f$server$2f$route$2d$modules$2f$app$2d$page$2f$vendored$2f$ssr$2f$react$2d$jsx$2d$dev$2d$runtime$2e$js__$5b$app$2d$ssr$5d$__$28$ecmascript$29$__ = __turbopack_context__.i("[project]/node_modules/next/dist/server/route-modules/app-page/vendored/ssr/react-jsx-dev-runtime.js [app-ssr] (ecmascript)");
var __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$styled$2d$jsx$2f$style$2e$js__$5b$app$2d$ssr$5d$__$28$ecmascript$29$__ = __turbopack_context__.i("[project]/node_modules/styled-jsx/style.js [app-ssr] (ecmascript)");
var __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$next$2f$dist$2f$server$2f$route$2d$modules$2f$app$2d$page$2f$vendored$2f$ssr$2f$react$2e$js__$5b$app$2d$ssr$5d$__$28$ecmascript$29$__ = __turbopack_context__.i("[project]/node_modules/next/dist/server/route-modules/app-page/vendored/ssr/react.js [app-ssr] (ecmascript)");
var __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$lucide$2d$react$2f$dist$2f$esm$2f$icons$2f$check$2e$js__$5b$app$2d$ssr$5d$__$28$ecmascript$29$__$3c$export__default__as__Check$3e$__ = __turbopack_context__.i("[project]/node_modules/lucide-react/dist/esm/icons/check.js [app-ssr] (ecmascript) <export default as Check>");
var __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$lucide$2d$react$2f$dist$2f$esm$2f$icons$2f$x$2e$js__$5b$app$2d$ssr$5d$__$28$ecmascript$29$__$3c$export__default__as__X$3e$__ = __turbopack_context__.i("[project]/node_modules/lucide-react/dist/esm/icons/x.js [app-ssr] (ecmascript) <export default as X>");
var __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$lucide$2d$react$2f$dist$2f$esm$2f$icons$2f$trash$2d$2$2e$js__$5b$app$2d$ssr$5d$__$28$ecmascript$29$__$3c$export__default__as__Trash2$3e$__ = __turbopack_context__.i("[project]/node_modules/lucide-react/dist/esm/icons/trash-2.js [app-ssr] (ecmascript) <export default as Trash2>");
var __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$lucide$2d$react$2f$dist$2f$esm$2f$icons$2f$settings$2e$js__$5b$app$2d$ssr$5d$__$28$ecmascript$29$__$3c$export__default__as__Settings$3e$__ = __turbopack_context__.i("[project]/node_modules/lucide-react/dist/esm/icons/settings.js [app-ssr] (ecmascript) <export default as Settings>");
var __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$lucide$2d$react$2f$dist$2f$esm$2f$icons$2f$copy$2e$js__$5b$app$2d$ssr$5d$__$28$ecmascript$29$__$3c$export__default__as__Copy$3e$__ = __turbopack_context__.i("[project]/node_modules/lucide-react/dist/esm/icons/copy.js [app-ssr] (ecmascript) <export default as Copy>");
var __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$lucide$2d$react$2f$dist$2f$esm$2f$icons$2f$chart$2d$column$2e$js__$5b$app$2d$ssr$5d$__$28$ecmascript$29$__$3c$export__default__as__BarChart3$3e$__ = __turbopack_context__.i("[project]/node_modules/lucide-react/dist/esm/icons/chart-column.js [app-ssr] (ecmascript) <export default as BarChart3>");
var __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$lucide$2d$react$2f$dist$2f$esm$2f$icons$2f$chart$2d$pie$2e$js__$5b$app$2d$ssr$5d$__$28$ecmascript$29$__$3c$export__default__as__PieChart$3e$__ = __turbopack_context__.i("[project]/node_modules/lucide-react/dist/esm/icons/chart-pie.js [app-ssr] (ecmascript) <export default as PieChart>");
var __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$lucide$2d$react$2f$dist$2f$esm$2f$icons$2f$chart$2d$line$2e$js__$5b$app$2d$ssr$5d$__$28$ecmascript$29$__$3c$export__default__as__LineChart$3e$__ = __turbopack_context__.i("[project]/node_modules/lucide-react/dist/esm/icons/chart-line.js [app-ssr] (ecmascript) <export default as LineChart>");
var __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$lucide$2d$react$2f$dist$2f$esm$2f$icons$2f$table$2e$js__$5b$app$2d$ssr$5d$__$28$ecmascript$29$__$3c$export__default__as__Table$3e$__ = __turbopack_context__.i("[project]/node_modules/lucide-react/dist/esm/icons/table.js [app-ssr] (ecmascript) <export default as Table>");
var __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$lucide$2d$react$2f$dist$2f$esm$2f$icons$2f$activity$2e$js__$5b$app$2d$ssr$5d$__$28$ecmascript$29$__$3c$export__default__as__Activity$3e$__ = __turbopack_context__.i("[project]/node_modules/lucide-react/dist/esm/icons/activity.js [app-ssr] (ecmascript) <export default as Activity>");
var __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$lucide$2d$react$2f$dist$2f$esm$2f$icons$2f$chevron$2d$down$2e$js__$5b$app$2d$ssr$5d$__$28$ecmascript$29$__$3c$export__default__as__ChevronDown$3e$__ = __turbopack_context__.i("[project]/node_modules/lucide-react/dist/esm/icons/chevron-down.js [app-ssr] (ecmascript) <export default as ChevronDown>");
var __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$lucide$2d$react$2f$dist$2f$esm$2f$icons$2f$chart$2d$area$2e$js__$5b$app$2d$ssr$5d$__$28$ecmascript$29$__$3c$export__default__as__ChartArea$3e$__ = __turbopack_context__.i("[project]/node_modules/lucide-react/dist/esm/icons/chart-area.js [app-ssr] (ecmascript) <export default as ChartArea>");
var __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$lucide$2d$react$2f$dist$2f$esm$2f$icons$2f$table$2d$cells$2d$merge$2e$js__$5b$app$2d$ssr$5d$__$28$ecmascript$29$__$3c$export__default__as__TableCellsMerge$3e$__ = __turbopack_context__.i("[project]/node_modules/lucide-react/dist/esm/icons/table-cells-merge.js [app-ssr] (ecmascript) <export default as TableCellsMerge>");
var __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$lucide$2d$react$2f$dist$2f$esm$2f$icons$2f$loader$2d$circle$2e$js__$5b$app$2d$ssr$5d$__$28$ecmascript$29$__$3c$export__default__as__Loader2$3e$__ = __turbopack_context__.i("[project]/node_modules/lucide-react/dist/esm/icons/loader-circle.js [app-ssr] (ecmascript) <export default as Loader2>");
var __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$lucide$2d$react$2f$dist$2f$esm$2f$icons$2f$chevron$2d$right$2e$js__$5b$app$2d$ssr$5d$__$28$ecmascript$29$__$3c$export__default__as__ChevronRight$3e$__ = __turbopack_context__.i("[project]/node_modules/lucide-react/dist/esm/icons/chevron-right.js [app-ssr] (ecmascript) <export default as ChevronRight>");
var __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$lucide$2d$react$2f$dist$2f$esm$2f$icons$2f$chevron$2d$left$2e$js__$5b$app$2d$ssr$5d$__$28$ecmascript$29$__$3c$export__default__as__ChevronLeft$3e$__ = __turbopack_context__.i("[project]/node_modules/lucide-react/dist/esm/icons/chevron-left.js [app-ssr] (ecmascript) <export default as ChevronLeft>");
var __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$lucide$2d$react$2f$dist$2f$esm$2f$icons$2f$save$2e$js__$5b$app$2d$ssr$5d$__$28$ecmascript$29$__$3c$export__default__as__Save$3e$__ = __turbopack_context__.i("[project]/node_modules/lucide-react/dist/esm/icons/save.js [app-ssr] (ecmascript) <export default as Save>");
var __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$lucide$2d$react$2f$dist$2f$esm$2f$icons$2f$circle$2d$check$2e$js__$5b$app$2d$ssr$5d$__$28$ecmascript$29$__$3c$export__default__as__CheckCircle2$3e$__ = __turbopack_context__.i("[project]/node_modules/lucide-react/dist/esm/icons/circle-check.js [app-ssr] (ecmascript) <export default as CheckCircle2>");
var __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$lucide$2d$react$2f$dist$2f$esm$2f$icons$2f$chevron$2d$up$2e$js__$5b$app$2d$ssr$5d$__$28$ecmascript$29$__$3c$export__default__as__ChevronUp$3e$__ = __turbopack_context__.i("[project]/node_modules/lucide-react/dist/esm/icons/chevron-up.js [app-ssr] (ecmascript) <export default as ChevronUp>");
var __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$lucide$2d$react$2f$dist$2f$esm$2f$icons$2f$map$2d$pinned$2e$js__$5b$app$2d$ssr$5d$__$28$ecmascript$29$__$3c$export__default__as__MapPinned$3e$__ = __turbopack_context__.i("[project]/node_modules/lucide-react/dist/esm/icons/map-pinned.js [app-ssr] (ecmascript) <export default as MapPinned>");
var __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$lucide$2d$react$2f$dist$2f$esm$2f$icons$2f$square$2d$stack$2e$js__$5b$app$2d$ssr$5d$__$28$ecmascript$29$__$3c$export__default__as__SquareStack$3e$__ = __turbopack_context__.i("[project]/node_modules/lucide-react/dist/esm/icons/square-stack.js [app-ssr] (ecmascript) <export default as SquareStack>");
var __TURBOPACK__imported__module__$5b$project$5d2f$src$2f$lib$2f$i18n$2f$LanguageContext$2e$tsx__$5b$app$2d$ssr$5d$__$28$ecmascript$29$__ = __turbopack_context__.i("[project]/src/lib/i18n/LanguageContext.tsx [app-ssr] (ecmascript)");
var __TURBOPACK__imported__module__$5b$project$5d2f$src$2f$components$2f$visuals$2f$ChartRenderer$2e$tsx__$5b$app$2d$ssr$5d$__$28$ecmascript$29$__ = __turbopack_context__.i("[project]/src/components/visuals/ChartRenderer.tsx [app-ssr] (ecmascript)");
var __TURBOPACK__imported__module__$5b$project$5d2f$src$2f$lib$2f$profiler$2e$ts__$5b$app$2d$ssr$5d$__$28$ecmascript$29$__ = __turbopack_context__.i("[project]/src/lib/profiler.ts [app-ssr] (ecmascript)");
var __TURBOPACK__imported__module__$5b$project$5d2f$src$2f$lib$2f$persistence$2e$ts__$5b$app$2d$ssr$5d$__$28$ecmascript$29$__ = __turbopack_context__.i("[project]/src/lib/persistence.ts [app-ssr] (ecmascript)");
var __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$react$2d$grid$2d$layout$2f$dist$2f$chunk$2d$XM2M6TC6$2e$mjs__$5b$app$2d$ssr$5d$__$28$ecmascript$29$__ = __turbopack_context__.i("[project]/node_modules/react-grid-layout/dist/chunk-XM2M6TC6.mjs [app-ssr] (ecmascript)");
var __TURBOPACK__imported__module__$5b$project$5d2f$src$2f$lib$2f$supabase$2e$ts__$5b$app$2d$ssr$5d$__$28$ecmascript$29$__ = __turbopack_context__.i("[project]/src/lib/supabase.ts [app-ssr] (ecmascript)");
'use client';
;
;
;
;
;
;
;
;
;
const ResponsiveGridLayoutComponent = __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$react$2d$grid$2d$layout$2f$dist$2f$chunk$2d$XM2M6TC6$2e$mjs__$5b$app$2d$ssr$5d$__$28$ecmascript$29$__["ResponsiveGridLayout"];
;
const WidgetCard = /*#__PURE__*/ __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$next$2f$dist$2f$server$2f$route$2d$modules$2f$app$2d$page$2f$vendored$2f$ssr$2f$react$2e$js__$5b$app$2d$ssr$5d$__$28$ecmascript$29$__["default"].memo(({ widget, isActive, globalFilters, columnsMeta, onSelect, onRemove })=>{
    const [data, setData] = (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$next$2f$dist$2f$server$2f$route$2d$modules$2f$app$2d$page$2f$vendored$2f$ssr$2f$react$2e$js__$5b$app$2d$ssr$5d$__$28$ecmascript$29$__["useState"])([]);
    const [loading, setLoading] = (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$next$2f$dist$2f$server$2f$route$2d$modules$2f$app$2d$page$2f$vendored$2f$ssr$2f$react$2e$js__$5b$app$2d$ssr$5d$__$28$ecmascript$29$__["useState"])(false);
    const [error, setError] = (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$next$2f$dist$2f$server$2f$route$2d$modules$2f$app$2d$page$2f$vendored$2f$ssr$2f$react$2e$js__$5b$app$2d$ssr$5d$__$28$ecmascript$29$__["useState"])(null);
    (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$next$2f$dist$2f$server$2f$route$2d$modules$2f$app$2d$page$2f$vendored$2f$ssr$2f$react$2e$js__$5b$app$2d$ssr$5d$__$28$ecmascript$29$__["useEffect"])(()=>{
        const fetchData = async ()=>{
            setLoading(true);
            setError(null);
            try {
                let query = '';
                const filtersToApply = globalFilters.filter((f)=>f.column && f.value !== null && f.value !== '');
                const whereClause = filtersToApply.length > 0 ? `WHERE ${filtersToApply.map((f)=>`"${f.column}" = '${String(f.value).replace(/'/g, "''")}'`).join(' AND ')}` : '';
                if (widget.type === 'card') {
                    const aggExpr = widget.aggregation === 'COUNT' ? `COUNT("${widget.yAxis}")` : `${widget.aggregation}(TRY_CAST("${widget.yAxis}" AS DOUBLE))`;
                    query = `SELECT ${aggExpr} as "${widget.yAxis}" FROM dataset ${whereClause}`;
                } else if (widget.type === 'map' && widget.latitudeField && widget.longitudeField) {
                    const metricExpr = widget.aggregation === 'NONE' ? `TRY_CAST("${widget.yAxis}" AS DOUBLE)` : widget.aggregation === 'COUNT' ? `COUNT("${widget.yAxis}")` : `${widget.aggregation}(TRY_CAST("${widget.yAxis}" AS DOUBLE))`;
                    const dimensionSelect = widget.xAxis ? `"${widget.xAxis}",` : '';
                    const groupByClause = widget.aggregation === 'NONE' ? '' : `GROUP BY ${widget.xAxis ? `"${widget.xAxis}",` : ''} "${widget.latitudeField}", "${widget.longitudeField}"`;
                    query = `
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
                } else if (widget.type === 'table' && widget.columns && widget.columns.length > 0) {
                    const colAggs = widget.columnAggregations || {};
                    const hasMetrics = Object.entries(colAggs).some(([col, agg])=>widget.columns?.includes(col) && agg !== 'NONE');
                    if (hasMetrics) {
                        const abbrevs = {
                            'SUM': 'SUM',
                            'AVG': 'AVG',
                            'COUNT': 'CNT',
                            'DISTINCT': 'DST'
                        };
                        const selects = widget.columns.map((c)=>{
                            const agg = colAggs[c] || 'NONE';
                            if (agg === 'NONE') return `"${c}"`;
                            const abbrev = abbrevs[agg] || agg;
                            if (agg === 'DISTINCT') return `COUNT(DISTINCT "${c}") as "${c} (${abbrev})"`;
                            if ([
                                'SUM',
                                'AVG'
                            ].includes(agg)) return `${agg}(TRY_CAST("${c}" AS DOUBLE)) as "${c} (${abbrev})"`;
                            return `${agg}("${c}") as "${c} (${abbrev})"`;
                        }).join(', ');
                        const dimensions = widget.columns.filter((c)=>(colAggs[c] || 'NONE') === 'NONE');
                        const groupByClause = dimensions.length > 0 ? `GROUP BY ${dimensions.map((d)=>`"${d}"`).join(', ')}` : '';
                        query = `SELECT ${selects} FROM dataset ${whereClause} ${groupByClause} LIMIT 50`;
                    } else {
                        const cols = widget.columns.map((c)=>`"${c}"`).join(', ');
                        query = `SELECT ${cols} FROM dataset ${whereClause} LIMIT 100`;
                    }
                } else if (widget.aggregation === 'NONE') {
                    const orderClause = widget.orderBy ? `ORDER BY "${widget.xAxis}" ${widget.orderBy}` : '';
                    const limitClause = widget.topN ? `LIMIT ${widget.topN}` : 'LIMIT 100';
                    query = `SELECT "${widget.xAxis}", "${widget.yAxis}" FROM dataset ${whereClause} ${orderClause} ${limitClause}`;
                } else {
                    const aggExpr = widget.aggregation === 'COUNT' ? `COUNT("${widget.yAxis}")` : `${widget.aggregation}(TRY_CAST("${widget.yAxis}" AS DOUBLE))`;
                    const orderCol = widget.orderBy === 'ASC' || widget.orderBy === 'DESC' ? `"${widget.yAxis}"` : `"${widget.xAxis}"`;
                    const orderDir = widget.orderBy || 'DESC';
                    const limitClause = widget.topN ? `LIMIT ${widget.topN}` : 'LIMIT 50';
                    query = `
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
                const result = await (0, __TURBOPACK__imported__module__$5b$project$5d2f$src$2f$lib$2f$profiler$2e$ts__$5b$app$2d$ssr$5d$__$28$ecmascript$29$__["runQuery"])(query);
                // Check if result is all nulls (often happens if TRY_CAST fails for all rows)
                const allNulls = result.length > 0 && result.every((row)=>row[widget.yAxis] === null);
                if (allNulls && widget.aggregation !== 'COUNT') {
                    setError(`Cannot perform ${widget.aggregation} on "${widget.yAxis}": Column is not numeric.`);
                    setData([]);
                } else {
                    setData(result);
                }
            } catch (err) {
                console.error('Error fetching widget data:', err);
                const msg = err instanceof Error ? err.message : '';
                if (msg.includes('No function matches')) {
                    setError(`Aggregation ${widget.aggregation} not supported for this column type.`);
                } else {
                    setError('Failed to fetch data. Check if column is compatible.');
                }
            } finally{
                setLoading(false);
            }
        };
        fetchData();
    }, [
        widget.xAxis,
        widget.yAxis,
        widget.aggregation,
        widget.columns,
        widget.type,
        widget.orderBy,
        widget.topN,
        globalFilters,
        widget.colorScheme,
        widget.customColor,
        widget.colorByCategory,
        widget.orientation,
        widget.columnAggregations
    ]);
    return /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$next$2f$dist$2f$server$2f$route$2d$modules$2f$app$2d$page$2f$vendored$2f$ssr$2f$react$2d$jsx$2d$dev$2d$runtime$2e$js__$5b$app$2d$ssr$5d$__$28$ecmascript$29$__["jsxDEV"])("div", {
        className: `glass glass-card ${isActive ? 'active-widget' : ''}`,
        onClick: onSelect,
        style: {
            display: 'flex',
            flexDirection: 'column',
            height: '100%'
        },
        children: [
            /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$next$2f$dist$2f$server$2f$route$2d$modules$2f$app$2d$page$2f$vendored$2f$ssr$2f$react$2d$jsx$2d$dev$2d$runtime$2e$js__$5b$app$2d$ssr$5d$__$28$ecmascript$29$__["jsxDEV"])("div", {
                style: {
                    display: 'flex',
                    justifyContent: 'space-between',
                    alignItems: 'center',
                    marginBottom: '16px'
                },
                children: [
                    /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$next$2f$dist$2f$server$2f$route$2d$modules$2f$app$2d$page$2f$vendored$2f$ssr$2f$react$2d$jsx$2d$dev$2d$runtime$2e$js__$5b$app$2d$ssr$5d$__$28$ecmascript$29$__["jsxDEV"])("div", {
                        style: {
                            flex: 1,
                            minWidth: 0
                        },
                        children: [
                            /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$next$2f$dist$2f$server$2f$route$2d$modules$2f$app$2d$page$2f$vendored$2f$ssr$2f$react$2d$jsx$2d$dev$2d$runtime$2e$js__$5b$app$2d$ssr$5d$__$28$ecmascript$29$__["jsxDEV"])("h5", {
                                style: {
                                    fontWeight: 600,
                                    fontSize: '0.9375rem',
                                    overflow: 'hidden',
                                    textOverflow: 'ellipsis',
                                    whiteSpace: 'nowrap'
                                },
                                children: widget.title
                            }, void 0, false, {
                                fileName: "[project]/src/components/canvas/ReportCanvas.tsx",
                                lineNumber: 204,
                                columnNumber: 21
                            }, ("TURBOPACK compile-time value", void 0)),
                            /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$next$2f$dist$2f$server$2f$route$2d$modules$2f$app$2d$page$2f$vendored$2f$ssr$2f$react$2d$jsx$2d$dev$2d$runtime$2e$js__$5b$app$2d$ssr$5d$__$28$ecmascript$29$__["jsxDEV"])("p", {
                                style: {
                                    fontSize: '0.7rem',
                                    color: 'var(--text-muted)'
                                },
                                children: widget.type === 'table' ? `${widget.columns?.length || 0} fields` : widget.type === 'card' ? `${widget.aggregation}(${widget.yAxis})` : widget.type === 'map' ? `${widget.yAxis} by ${widget.latitudeField}/${widget.longitudeField}` : widget.type === 'treemap' ? `TreeMap: ${widget.xAxis} x ${widget.yAxis}` : `${widget.aggregation !== 'NONE' ? `${widget.aggregation}(${widget.yAxis})` : widget.yAxis} by ${widget.xAxis}`
                            }, void 0, false, {
                                fileName: "[project]/src/components/canvas/ReportCanvas.tsx",
                                lineNumber: 205,
                                columnNumber: 21
                            }, ("TURBOPACK compile-time value", void 0))
                        ]
                    }, void 0, true, {
                        fileName: "[project]/src/components/canvas/ReportCanvas.tsx",
                        lineNumber: 203,
                        columnNumber: 17
                    }, ("TURBOPACK compile-time value", void 0)),
                    /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$next$2f$dist$2f$server$2f$route$2d$modules$2f$app$2d$page$2f$vendored$2f$ssr$2f$react$2d$jsx$2d$dev$2d$runtime$2e$js__$5b$app$2d$ssr$5d$__$28$ecmascript$29$__["jsxDEV"])("div", {
                        style: {
                            display: 'flex',
                            gap: '8px'
                        },
                        children: /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$next$2f$dist$2f$server$2f$route$2d$modules$2f$app$2d$page$2f$vendored$2f$ssr$2f$react$2d$jsx$2d$dev$2d$runtime$2e$js__$5b$app$2d$ssr$5d$__$28$ecmascript$29$__["jsxDEV"])("button", {
                            className: "nodrag",
                            onClick: (e)=>{
                                e.stopPropagation();
                                e.preventDefault();
                                onRemove(e);
                            },
                            onMouseDown: (e)=>{
                                e.stopPropagation();
                                e.preventDefault();
                            },
                            onPointerDown: (e)=>{
                                e.stopPropagation();
                                e.preventDefault();
                            },
                            style: {
                                background: 'rgba(255, 255, 255, 0.05)',
                                padding: '6px',
                                color: 'var(--text-muted)',
                                border: '1px solid var(--border)',
                                borderRadius: '4px',
                                cursor: 'pointer',
                                zIndex: 100,
                                display: 'flex',
                                alignItems: 'center',
                                justifyContent: 'center'
                            },
                            children: /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$next$2f$dist$2f$server$2f$route$2d$modules$2f$app$2d$page$2f$vendored$2f$ssr$2f$react$2d$jsx$2d$dev$2d$runtime$2e$js__$5b$app$2d$ssr$5d$__$28$ecmascript$29$__["jsxDEV"])(__TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$lucide$2d$react$2f$dist$2f$esm$2f$icons$2f$x$2e$js__$5b$app$2d$ssr$5d$__$28$ecmascript$29$__$3c$export__default__as__X$3e$__["X"], {
                                size: 16
                            }, void 0, false, {
                                fileName: "[project]/src/components/canvas/ReportCanvas.tsx",
                                lineNumber: 246,
                                columnNumber: 25
                            }, ("TURBOPACK compile-time value", void 0))
                        }, void 0, false, {
                            fileName: "[project]/src/components/canvas/ReportCanvas.tsx",
                            lineNumber: 218,
                            columnNumber: 21
                        }, ("TURBOPACK compile-time value", void 0))
                    }, void 0, false, {
                        fileName: "[project]/src/components/canvas/ReportCanvas.tsx",
                        lineNumber: 217,
                        columnNumber: 17
                    }, ("TURBOPACK compile-time value", void 0))
                ]
            }, void 0, true, {
                fileName: "[project]/src/components/canvas/ReportCanvas.tsx",
                lineNumber: 202,
                columnNumber: 13
            }, ("TURBOPACK compile-time value", void 0)),
            /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$next$2f$dist$2f$server$2f$route$2d$modules$2f$app$2d$page$2f$vendored$2f$ssr$2f$react$2d$jsx$2d$dev$2d$runtime$2e$js__$5b$app$2d$ssr$5d$__$28$ecmascript$29$__["jsxDEV"])("div", {
                style: {
                    flex: 1,
                    position: 'relative',
                    minHeight: 0,
                    overflow: 'hidden'
                },
                children: [
                    loading && /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$next$2f$dist$2f$server$2f$route$2d$modules$2f$app$2d$page$2f$vendored$2f$ssr$2f$react$2d$jsx$2d$dev$2d$runtime$2e$js__$5b$app$2d$ssr$5d$__$28$ecmascript$29$__["jsxDEV"])("div", {
                        style: {
                            position: 'absolute',
                            inset: 0,
                            display: 'flex',
                            alignItems: 'center',
                            justifyContent: 'center',
                            background: 'rgba(0,0,0,0.1)',
                            borderRadius: '8px',
                            zIndex: 10
                        },
                        children: /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$next$2f$dist$2f$server$2f$route$2d$modules$2f$app$2d$page$2f$vendored$2f$ssr$2f$react$2d$jsx$2d$dev$2d$runtime$2e$js__$5b$app$2d$ssr$5d$__$28$ecmascript$29$__["jsxDEV"])(__TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$lucide$2d$react$2f$dist$2f$esm$2f$icons$2f$loader$2d$circle$2e$js__$5b$app$2d$ssr$5d$__$28$ecmascript$29$__$3c$export__default__as__Loader2$3e$__["Loader2"], {
                            size: 32,
                            className: "animate-spin",
                            color: "var(--primary)"
                        }, void 0, false, {
                            fileName: "[project]/src/components/canvas/ReportCanvas.tsx",
                            lineNumber: 254,
                            columnNumber: 25
                        }, ("TURBOPACK compile-time value", void 0))
                    }, void 0, false, {
                        fileName: "[project]/src/components/canvas/ReportCanvas.tsx",
                        lineNumber: 253,
                        columnNumber: 21
                    }, ("TURBOPACK compile-time value", void 0)),
                    error ? /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$next$2f$dist$2f$server$2f$route$2d$modules$2f$app$2d$page$2f$vendored$2f$ssr$2f$react$2d$jsx$2d$dev$2d$runtime$2e$js__$5b$app$2d$ssr$5d$__$28$ecmascript$29$__["jsxDEV"])("div", {
                        style: {
                            display: 'flex',
                            alignItems: 'center',
                            justifyContent: 'center',
                            height: '100%',
                            color: '#f87171',
                            fontSize: '0.875rem'
                        },
                        children: error
                    }, void 0, false, {
                        fileName: "[project]/src/components/canvas/ReportCanvas.tsx",
                        lineNumber: 259,
                        columnNumber: 21
                    }, ("TURBOPACK compile-time value", void 0)) : /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$next$2f$dist$2f$server$2f$route$2d$modules$2f$app$2d$page$2f$vendored$2f$ssr$2f$react$2d$jsx$2d$dev$2d$runtime$2e$js__$5b$app$2d$ssr$5d$__$28$ecmascript$29$__["jsxDEV"])("div", {
                        style: {
                            flex: 1,
                            position: 'relative',
                            height: '100%',
                            minHeight: 0
                        },
                        children: /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$next$2f$dist$2f$server$2f$route$2d$modules$2f$app$2d$page$2f$vendored$2f$ssr$2f$react$2d$jsx$2d$dev$2d$runtime$2e$js__$5b$app$2d$ssr$5d$__$28$ecmascript$29$__["jsxDEV"])(__TURBOPACK__imported__module__$5b$project$5d2f$src$2f$components$2f$visuals$2f$ChartRenderer$2e$tsx__$5b$app$2d$ssr$5d$__$28$ecmascript$29$__["default"], {
                            type: widget.type,
                            data: data,
                            xAxis: widget.xAxis,
                            yAxis: widget.yAxis,
                            columnsMeta: columnsMeta,
                            widgetTitle: widget.title,
                            latitudeField: widget.latitudeField,
                            longitudeField: widget.longitudeField,
                            orientation: widget.orientation,
                            colorScheme: widget.colorScheme,
                            colorByCategory: widget.colorByCategory,
                            customColor: widget.customColor
                        }, void 0, false, {
                            fileName: "[project]/src/components/canvas/ReportCanvas.tsx",
                            lineNumber: 264,
                            columnNumber: 25
                        }, ("TURBOPACK compile-time value", void 0))
                    }, void 0, false, {
                        fileName: "[project]/src/components/canvas/ReportCanvas.tsx",
                        lineNumber: 263,
                        columnNumber: 21
                    }, ("TURBOPACK compile-time value", void 0))
                ]
            }, void 0, true, {
                fileName: "[project]/src/components/canvas/ReportCanvas.tsx",
                lineNumber: 251,
                columnNumber: 13
            }, ("TURBOPACK compile-time value", void 0))
        ]
    }, void 0, true, {
        fileName: "[project]/src/components/canvas/ReportCanvas.tsx",
        lineNumber: 197,
        columnNumber: 9
    }, ("TURBOPACK compile-time value", void 0));
});
WidgetCard.displayName = 'WidgetCard';
const ReportCanvas = /*#__PURE__*/ __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$next$2f$dist$2f$server$2f$route$2d$modules$2f$app$2d$page$2f$vendored$2f$ssr$2f$react$2e$js__$5b$app$2d$ssr$5d$__$28$ecmascript$29$__["default"].forwardRef(({ dataset, initialReportId, savedDatasets = [], onReportDeleted, onChangesStatusChange, onSwitchDataset }, ref)=>{
    const { t } = (0, __TURBOPACK__imported__module__$5b$project$5d2f$src$2f$lib$2f$i18n$2f$LanguageContext$2e$tsx__$5b$app$2d$ssr$5d$__$28$ecmascript$29$__["useTranslation"])();
    const [width, setWidth] = (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$next$2f$dist$2f$server$2f$route$2d$modules$2f$app$2d$page$2f$vendored$2f$ssr$2f$react$2e$js__$5b$app$2d$ssr$5d$__$28$ecmascript$29$__["useState"])(1200);
    const containerRef = __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$next$2f$dist$2f$server$2f$route$2d$modules$2f$app$2d$page$2f$vendored$2f$ssr$2f$react$2e$js__$5b$app$2d$ssr$5d$__$28$ecmascript$29$__["default"].useRef(null);
    const [isGridMounted, setIsGridMounted] = (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$next$2f$dist$2f$server$2f$route$2d$modules$2f$app$2d$page$2f$vendored$2f$ssr$2f$react$2e$js__$5b$app$2d$ssr$5d$__$28$ecmascript$29$__["useState"])(false);
    (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$next$2f$dist$2f$server$2f$route$2d$modules$2f$app$2d$page$2f$vendored$2f$ssr$2f$react$2e$js__$5b$app$2d$ssr$5d$__$28$ecmascript$29$__["useEffect"])(()=>{
        const resizeObserver = new ResizeObserver((entries)=>{
            for (const entry of entries){
                if (entry.target === containerRef.current) {
                    setWidth(entry.contentRect.width);
                }
            }
        });
        if (containerRef.current) {
            resizeObserver.observe(containerRef.current);
            setWidth(containerRef.current.offsetWidth);
            setIsGridMounted(true);
        }
        return ()=>resizeObserver.disconnect();
    }, []);
    const [widgets, setWidgets] = (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$next$2f$dist$2f$server$2f$route$2d$modules$2f$app$2d$page$2f$vendored$2f$ssr$2f$react$2e$js__$5b$app$2d$ssr$5d$__$28$ecmascript$29$__["useState"])([]);
    const layout = __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$next$2f$dist$2f$server$2f$route$2d$modules$2f$app$2d$page$2f$vendored$2f$ssr$2f$react$2e$js__$5b$app$2d$ssr$5d$__$28$ecmascript$29$__["default"].useMemo(()=>{
        return widgets.map((w)=>({
                i: w.id,
                x: w.x,
                y: w.y,
                w: w.w,
                h: w.h,
                minW: 1,
                maxW: 6,
                minH: 1,
                maxH: 6,
                resizeHandles: [
                    'se'
                ]
            }));
    }, [
        widgets
    ]);
    const onLayoutChange = __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$next$2f$dist$2f$server$2f$route$2d$modules$2f$app$2d$page$2f$vendored$2f$ssr$2f$react$2e$js__$5b$app$2d$ssr$5d$__$28$ecmascript$29$__["default"].useCallback((currentLayout)=>{
        setWidgets((prevWidgets)=>{
            let changed = false;
            const updated = prevWidgets.map((w)=>{
                const l = currentLayout.find((item)=>item.i === w.id);
                if (l && (l.x !== w.x || l.y !== w.y || l.w !== w.w || l.h !== w.h)) {
                    changed = true;
                    return {
                        ...w,
                        x: l.x,
                        y: l.y,
                        w: l.w,
                        h: l.h
                    };
                }
                return w;
            });
            return changed ? updated : prevWidgets;
        });
    }, []);
    const [selection, setSelection] = (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$next$2f$dist$2f$server$2f$route$2d$modules$2f$app$2d$page$2f$vendored$2f$ssr$2f$react$2e$js__$5b$app$2d$ssr$5d$__$28$ecmascript$29$__["useState"])({
        type: 'none'
    });
    const [isSaving, setIsSaving] = (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$next$2f$dist$2f$server$2f$route$2d$modules$2f$app$2d$page$2f$vendored$2f$ssr$2f$react$2e$js__$5b$app$2d$ssr$5d$__$28$ecmascript$29$__["useState"])(false);
    const [lastSaved, setLastSaved] = (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$next$2f$dist$2f$server$2f$route$2d$modules$2f$app$2d$page$2f$vendored$2f$ssr$2f$react$2e$js__$5b$app$2d$ssr$5d$__$28$ecmascript$29$__["useState"])(null);
    const [isSidebarCollapsed, setIsSidebarCollapsed] = (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$next$2f$dist$2f$server$2f$route$2d$modules$2f$app$2d$page$2f$vendored$2f$ssr$2f$react$2e$js__$5b$app$2d$ssr$5d$__$28$ecmascript$29$__["useState"])(false);
    const [user, setUser] = (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$next$2f$dist$2f$server$2f$route$2d$modules$2f$app$2d$page$2f$vendored$2f$ssr$2f$react$2e$js__$5b$app$2d$ssr$5d$__$28$ecmascript$29$__["useState"])(null); // Supabase User type can be complex, using any temporarily but scoped
    const [reportId, setReportId] = (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$next$2f$dist$2f$server$2f$route$2d$modules$2f$app$2d$page$2f$vendored$2f$ssr$2f$react$2e$js__$5b$app$2d$ssr$5d$__$28$ecmascript$29$__["useState"])(initialReportId || null);
    const [reportName, setReportName] = (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$next$2f$dist$2f$server$2f$route$2d$modules$2f$app$2d$page$2f$vendored$2f$ssr$2f$react$2e$js__$5b$app$2d$ssr$5d$__$28$ecmascript$29$__["useState"])(dataset.name);
    const [isReportSettingsOpen, setIsReportSettingsOpen] = (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$next$2f$dist$2f$server$2f$route$2d$modules$2f$app$2d$page$2f$vendored$2f$ssr$2f$react$2e$js__$5b$app$2d$ssr$5d$__$28$ecmascript$29$__["useState"])(false);
    const [hasUnsavedChanges, setHasUnsavedChanges] = (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$next$2f$dist$2f$server$2f$route$2d$modules$2f$app$2d$page$2f$vendored$2f$ssr$2f$react$2e$js__$5b$app$2d$ssr$5d$__$28$ecmascript$29$__["useState"])(false);
    const [lastSavedState, setLastSavedState] = (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$next$2f$dist$2f$server$2f$route$2d$modules$2f$app$2d$page$2f$vendored$2f$ssr$2f$react$2e$js__$5b$app$2d$ssr$5d$__$28$ecmascript$29$__["useState"])('');
    const [globalFilters, setGlobalFilters] = (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$next$2f$dist$2f$server$2f$route$2d$modules$2f$app$2d$page$2f$vendored$2f$ssr$2f$react$2e$js__$5b$app$2d$ssr$5d$__$28$ecmascript$29$__["useState"])([]);
    const [isCopied, setIsCopied] = (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$next$2f$dist$2f$server$2f$route$2d$modules$2f$app$2d$page$2f$vendored$2f$ssr$2f$react$2e$js__$5b$app$2d$ssr$5d$__$28$ecmascript$29$__["useState"])(false);
    const handleCopyURL = ()=>{
        const url = reportId ? `${("TURBOPACK compile-time falsy", 0) ? "TURBOPACK unreachable" : ''}/report/${reportId}` : '';
        if (url) {
            navigator.clipboard.writeText(url).then(()=>{
                setIsCopied(true);
                setTimeout(()=>setIsCopied(false), 2000);
            });
        }
    };
    // Expose methods to parent
    __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$next$2f$dist$2f$server$2f$route$2d$modules$2f$app$2d$page$2f$vendored$2f$ssr$2f$react$2e$js__$5b$app$2d$ssr$5d$__$28$ecmascript$29$__["default"].useImperativeHandle(ref, ()=>({
            handleSave,
            reportName
        }));
    // Track changes
    (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$next$2f$dist$2f$server$2f$route$2d$modules$2f$app$2d$page$2f$vendored$2f$ssr$2f$react$2e$js__$5b$app$2d$ssr$5d$__$28$ecmascript$29$__["useEffect"])(()=>{
        const currentState = JSON.stringify({
            widgets,
            reportName,
            globalFilters
        });
        if (lastSavedState && currentState !== lastSavedState) {
            setHasUnsavedChanges(true);
            onChangesStatusChange?.(true);
        } else {
            setHasUnsavedChanges(false);
            onChangesStatusChange?.(false);
        }
    }, [
        widgets,
        reportName,
        globalFilters,
        lastSavedState,
        onChangesStatusChange
    ]);
    // 1. Manage User Session
    (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$next$2f$dist$2f$server$2f$route$2d$modules$2f$app$2d$page$2f$vendored$2f$ssr$2f$react$2e$js__$5b$app$2d$ssr$5d$__$28$ecmascript$29$__["useEffect"])(()=>{
        // Initial session check
        __TURBOPACK__imported__module__$5b$project$5d2f$src$2f$lib$2f$supabase$2e$ts__$5b$app$2d$ssr$5d$__$28$ecmascript$29$__["supabase"].auth.getSession().then(({ data: { session } })=>{
            setUser(session?.user ?? null);
        });
        // Listen for auth changes
        const { data: { subscription } } = __TURBOPACK__imported__module__$5b$project$5d2f$src$2f$lib$2f$supabase$2e$ts__$5b$app$2d$ssr$5d$__$28$ecmascript$29$__["supabase"].auth.onAuthStateChange((_event, session)=>{
            setUser(session?.user ?? null);
        });
        return ()=>subscription.unsubscribe();
    }, []);
    // 2. Load Report Data
    const userId = user?.id;
    (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$next$2f$dist$2f$server$2f$route$2d$modules$2f$app$2d$page$2f$vendored$2f$ssr$2f$react$2e$js__$5b$app$2d$ssr$5d$__$28$ecmascript$29$__["useEffect"])(()=>{
        if (!dataset.id || !userId) {
            setLastSavedState(JSON.stringify({
                widgets: [],
                reportName: dataset.name,
                globalFilters: []
            }));
            return;
        }
        if (initialReportId) {
            (0, __TURBOPACK__imported__module__$5b$project$5d2f$src$2f$lib$2f$persistence$2e$ts__$5b$app$2d$ssr$5d$__$28$ecmascript$29$__["getReports"])(userId, dataset.id).then((reports)=>{
                const existingReport = reports.find((r)=>r.id === initialReportId);
                if (existingReport) {
                    setWidgets(existingReport.widgets);
                    setGlobalFilters(existingReport.filters || []);
                    setReportId(existingReport.id);
                    setReportName(existingReport.name);
                    setLastSaved(new Date(existingReport.updated_at || existingReport.created_at));
                    setLastSavedState(JSON.stringify({
                        widgets: existingReport.widgets,
                        reportName: existingReport.name,
                        globalFilters: existingReport.filters || []
                    }));
                } else {
                    // If ID was provided but not found, reset or keep current? 
                    // Mostly fails if report was deleted.
                    setWidgets([]);
                    setGlobalFilters([]);
                    setReportId(null);
                    setReportName(dataset.name);
                    setLastSavedState(JSON.stringify({
                        widgets: [],
                        reportName: dataset.name,
                        globalFilters: []
                    }));
                }
            });
        } else {
            // New report mode - clear everything
            setWidgets([]);
            setGlobalFilters([]);
            setReportId(null);
            setReportName(dataset.name);
            setLastSaved(null);
            setLastSavedState(JSON.stringify({
                widgets: [],
                reportName: dataset.name,
                globalFilters: []
            }));
        }
    }, [
        dataset.id,
        initialReportId,
        dataset.name,
        userId
    ]);
    const handleSave = async (isSaveAs = false)=>{
        if (!user || !dataset.id) return;
        let nameToSave = reportName;
        const isNewReport = !reportId || isSaveAs;
        if (isNewReport) {
            const canCreate = await (0, __TURBOPACK__imported__module__$5b$project$5d2f$src$2f$lib$2f$persistence$2e$ts__$5b$app$2d$ssr$5d$__$28$ecmascript$29$__["checkReportLimit"])(dataset.id);
            if (!canCreate) {
                alert('Límite de reportes por dataset alcanzado (3).');
                return;
            }
            const name = prompt(t('canvas.report_name_prompt'), isSaveAs ? `${reportName} (Copy)` : reportName);
            if (!name || name.trim() === '') {
                alert(t('canvas.report_name_required'));
                return;
            }
            nameToSave = name.trim();
        }
        setIsSaving(true);
        try {
            const reportData = {
                dataset_id: dataset.id,
                user_id: user.id,
                name: nameToSave,
                widgets: widgets,
                filters: globalFilters
            };
            if (!isNewReport) {
                reportData.id = reportId;
            }
            const saved = await (0, __TURBOPACK__imported__module__$5b$project$5d2f$src$2f$lib$2f$persistence$2e$ts__$5b$app$2d$ssr$5d$__$28$ecmascript$29$__["saveReport"])(reportData);
            if (saved && saved.id) {
                setReportId(saved.id);
                setReportName(nameToSave);
                setLastSavedState(JSON.stringify({
                    widgets: widgets,
                    reportName: nameToSave,
                    globalFilters: globalFilters
                }));
                setHasUnsavedChanges(false);
                onChangesStatusChange?.(false);
            }
            setLastSaved(new Date());
            setIsReportSettingsOpen(false);
        } catch (err) {
            console.error('Error saving report:', err);
            alert('Failed to save report.');
        } finally{
            setIsSaving(false);
        }
    };
    const addWidget = (type)=>{
        if (widgets.length >= 9) {
            alert(t('canvas.limit_reached'));
            return;
        }
        const numericCol = dataset.stats.find((s)=>[
                'BIGINT',
                'DOUBLE',
                'INTEGER',
                'DECIMAL'
            ].includes(s.type))?.column || dataset.columns[1]?.name;
        const categoricalCol = dataset.columns[0]?.name;
        const latitudeCol = dataset.columns.find((col)=>/^(lat|latitude)$/i.test(col.name))?.name || dataset.columns[0]?.name;
        const longitudeCol = dataset.columns.find((col)=>/^(lng|lon|longitude)$/i.test(col.name))?.name || dataset.columns[1]?.name || dataset.columns[0]?.name;
        // Horizontal filling logic: 3 columns per row
        const nextIndex = widgets.length;
        const x = nextIndex % 3;
        const y = Math.floor(nextIndex / 3) * 2;
        const newWidget = {
            id: Math.random().toString(36).substr(2, 9),
            type,
            title: type === 'pie' ? `Top 10 - ${numericCol} by ${categoricalCol}` : type === 'card' ? `Nuevo indicador de ${numericCol}` : type === 'map' ? `Nuevo mapa de ${numericCol}` : `Nuevo Gráfico de ${type}`,
            xAxis: categoricalCol,
            yAxis: numericCol,
            aggregation: type === 'map' ? 'SUM' : type === 'card' ? 'SUM' : 'SUM',
            columns: type === 'table' ? [
                categoricalCol,
                numericCol
            ] : undefined,
            latitudeField: type === 'map' ? latitudeCol : undefined,
            longitudeField: type === 'map' ? longitudeCol : undefined,
            x,
            y,
            w: type === 'card' ? 1 : type === 'map' ? 2 : 1,
            h: type === 'card' ? 2 : type === 'map' ? 3 : 3,
            topN: type === 'pie' ? 10 : undefined,
            colorScheme: 'varied',
            colorByCategory: true,
            orientation: type === 'bar' ? 'vertical' : undefined
        };
        setWidgets([
            ...widgets,
            newWidget
        ]);
        setSelection({
            type: 'widget',
            id: newWidget.id
        });
    };
    const removeWidget = (id, e)=>{
        if (e) e.stopPropagation();
        setWidgets(widgets.filter((w)=>w.id !== id));
        if (selection.type === 'widget' && selection.id === id) setSelection({
            type: 'none'
        });
    };
    const updateWidget = (id, updates)=>{
        setWidgets(widgets.map((w)=>{
            if (w.id === id) {
                const updated = {
                    ...w,
                    ...updates
                };
                // Handle dynamic title for Pie chart if TopN or column changes
                if (updated.type === 'pie' && (updates.topN || updates.xAxis || updates.yAxis)) {
                    updated.title = `Top ${updated.topN || 10} - ${updated.yAxis} by ${updated.xAxis}`;
                }
                return updated;
            }
            return w;
        }));
    };
    const activeWidget = selection.type === 'widget' ? widgets.find((w)=>w.id === selection.id) : null;
    const aggregations = [
        'SUM',
        'AVG',
        'COUNT',
        'MIN',
        'MAX',
        'NONE'
    ];
    const colorSchemes = [
        {
            id: 'varied',
            label: 'Varied (Auto)',
            icon: __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$lucide$2d$react$2f$dist$2f$esm$2f$icons$2f$activity$2e$js__$5b$app$2d$ssr$5d$__$28$ecmascript$29$__$3c$export__default__as__Activity$3e$__["Activity"]
        },
        {
            id: 'blues',
            label: 'Blues (Auto)',
            icon: __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$lucide$2d$react$2f$dist$2f$esm$2f$icons$2f$activity$2e$js__$5b$app$2d$ssr$5d$__$28$ecmascript$29$__$3c$export__default__as__Activity$3e$__["Activity"]
        },
        {
            id: 'solid',
            label: 'Solid (Single)',
            icon: __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$lucide$2d$react$2f$dist$2f$esm$2f$icons$2f$activity$2e$js__$5b$app$2d$ssr$5d$__$28$ecmascript$29$__$3c$export__default__as__Activity$3e$__["Activity"]
        }
    ];
    const handleDeleteReport = async ()=>{
        if (!reportId) return;
        if (window.confirm(t('canvas.confirm_delete'))) {
            try {
                if (user) {
                    await (0, __TURBOPACK__imported__module__$5b$project$5d2f$src$2f$lib$2f$persistence$2e$ts__$5b$app$2d$ssr$5d$__$28$ecmascript$29$__["deleteReport"])(reportId, user.id);
                    if (onReportDeleted) onReportDeleted();
                }
            } catch (err) {
                console.error('Error deleting report:', err);
                alert('No se pudo eliminar el reporte.');
            }
        }
    };
    const handleBackToVisuals = ()=>setSelection({
            type: 'none'
        });
    const addGlobalFilter = (column)=>{
        if (globalFilters.find((f)=>f.column === column)) return;
        setGlobalFilters([
            ...globalFilters,
            {
                id: Math.random().toString(36).substr(2, 9),
                column,
                value: null
            }
        ]);
    };
    const removeGlobalFilter = (id)=>{
        setGlobalFilters(globalFilters.filter((f)=>f.id !== id));
    };
    const updateGlobalFilterValue = (id, value)=>{
        setGlobalFilters(globalFilters.map((f)=>f.id === id ? {
                ...f,
                value
            } : f));
    };
    return /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$next$2f$dist$2f$server$2f$route$2d$modules$2f$app$2d$page$2f$vendored$2f$ssr$2f$react$2d$jsx$2d$dev$2d$runtime$2e$js__$5b$app$2d$ssr$5d$__$28$ecmascript$29$__["jsxDEV"])("div", {
        style: {
            display: 'flex',
            gap: '0',
            alignItems: 'stretch',
            minHeight: '100vh',
            marginLeft: '-18px',
            marginTop: '-18px'
        },
        className: "jsx-d9c01daba222d1ca",
        children: [
            /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$next$2f$dist$2f$server$2f$route$2d$modules$2f$app$2d$page$2f$vendored$2f$ssr$2f$react$2d$jsx$2d$dev$2d$runtime$2e$js__$5b$app$2d$ssr$5d$__$28$ecmascript$29$__["jsxDEV"])("div", {
                style: {
                    width: isSidebarCollapsed ? '80px' : '260px',
                    display: 'flex',
                    flexDirection: 'column',
                    position: 'sticky',
                    top: '0',
                    height: 'calc(100vh)',
                    overflow: 'hidden',
                    transition: 'width 0.3s cubic-bezier(0.4, 0, 0.2, 1)',
                    zIndex: 50
                },
                className: "jsx-d9c01daba222d1ca" + " " + `canvas-sidebar ${isSidebarCollapsed ? 'collapsed' : ''}`,
                children: [
                    /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$next$2f$dist$2f$server$2f$route$2d$modules$2f$app$2d$page$2f$vendored$2f$ssr$2f$react$2d$jsx$2d$dev$2d$runtime$2e$js__$5b$app$2d$ssr$5d$__$28$ecmascript$29$__["jsxDEV"])("button", {
                        onClick: ()=>setIsSidebarCollapsed(!isSidebarCollapsed),
                        style: {
                            position: 'absolute',
                            right: isSidebarCollapsed ? 'auto' : '-12px',
                            left: isSidebarCollapsed ? 'auto' : 'auto',
                            top: '40px',
                            background: 'rgba(255, 255, 255, 0.12)',
                            border: '1px solid rgba(255, 255, 255, 0.18)',
                            borderRadius: '999px',
                            width: '28px',
                            height: '28px',
                            display: 'flex',
                            alignItems: 'center',
                            justifyContent: 'center',
                            color: 'var(--text-muted)',
                            cursor: 'pointer',
                            zIndex: 10
                        },
                        className: "jsx-d9c01daba222d1ca" + " " + "sidebar-toggle",
                        children: isSidebarCollapsed ? /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$next$2f$dist$2f$server$2f$route$2d$modules$2f$app$2d$page$2f$vendored$2f$ssr$2f$react$2d$jsx$2d$dev$2d$runtime$2e$js__$5b$app$2d$ssr$5d$__$28$ecmascript$29$__["jsxDEV"])(__TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$lucide$2d$react$2f$dist$2f$esm$2f$icons$2f$chevron$2d$right$2e$js__$5b$app$2d$ssr$5d$__$28$ecmascript$29$__$3c$export__default__as__ChevronRight$3e$__["ChevronRight"], {
                            size: 14
                        }, void 0, false, {
                            fileName: "[project]/src/components/canvas/ReportCanvas.tsx",
                            lineNumber: 638,
                            columnNumber: 43
                        }, ("TURBOPACK compile-time value", void 0)) : /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$next$2f$dist$2f$server$2f$route$2d$modules$2f$app$2d$page$2f$vendored$2f$ssr$2f$react$2d$jsx$2d$dev$2d$runtime$2e$js__$5b$app$2d$ssr$5d$__$28$ecmascript$29$__["jsxDEV"])(__TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$lucide$2d$react$2f$dist$2f$esm$2f$icons$2f$chevron$2d$left$2e$js__$5b$app$2d$ssr$5d$__$28$ecmascript$29$__$3c$export__default__as__ChevronLeft$3e$__["ChevronLeft"], {
                            size: 14
                        }, void 0, false, {
                            fileName: "[project]/src/components/canvas/ReportCanvas.tsx",
                            lineNumber: 638,
                            columnNumber: 72
                        }, ("TURBOPACK compile-time value", void 0))
                    }, void 0, false, {
                        fileName: "[project]/src/components/canvas/ReportCanvas.tsx",
                        lineNumber: 617,
                        columnNumber: 17
                    }, ("TURBOPACK compile-time value", void 0)),
                    !isSidebarCollapsed ? /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$next$2f$dist$2f$server$2f$route$2d$modules$2f$app$2d$page$2f$vendored$2f$ssr$2f$react$2d$jsx$2d$dev$2d$runtime$2e$js__$5b$app$2d$ssr$5d$__$28$ecmascript$29$__["jsxDEV"])(__TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$next$2f$dist$2f$server$2f$route$2d$modules$2f$app$2d$page$2f$vendored$2f$ssr$2f$react$2d$jsx$2d$dev$2d$runtime$2e$js__$5b$app$2d$ssr$5d$__$28$ecmascript$29$__["Fragment"], {
                        children: [
                            user && /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$next$2f$dist$2f$server$2f$route$2d$modules$2f$app$2d$page$2f$vendored$2f$ssr$2f$react$2d$jsx$2d$dev$2d$runtime$2e$js__$5b$app$2d$ssr$5d$__$28$ecmascript$29$__["jsxDEV"])("div", {
                                style: {
                                    padding: '32px 24px 24px',
                                    borderBottom: '1px solid rgba(255, 255, 255, 0.08)',
                                    background: 'rgba(255,255,255,0.02)'
                                },
                                className: "jsx-d9c01daba222d1ca",
                                children: /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$next$2f$dist$2f$server$2f$route$2d$modules$2f$app$2d$page$2f$vendored$2f$ssr$2f$react$2d$jsx$2d$dev$2d$runtime$2e$js__$5b$app$2d$ssr$5d$__$28$ecmascript$29$__["jsxDEV"])("div", {
                                    style: {
                                        display: 'flex',
                                        flexDirection: 'column',
                                        gap: '12px',
                                        marginTop: '12px'
                                    },
                                    className: "jsx-d9c01daba222d1ca",
                                    children: [
                                        /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$next$2f$dist$2f$server$2f$route$2d$modules$2f$app$2d$page$2f$vendored$2f$ssr$2f$react$2d$jsx$2d$dev$2d$runtime$2e$js__$5b$app$2d$ssr$5d$__$28$ecmascript$29$__["jsxDEV"])("button", {
                                            onClick: ()=>handleSave(false),
                                            disabled: isSaving || !dataset.id,
                                            style: {
                                                width: '100%',
                                                padding: '12px',
                                                display: 'flex',
                                                alignItems: 'center',
                                                justifyContent: 'center',
                                                gap: '8px',
                                                background: isSaving ? 'var(--surface)' : 'var(--primary)',
                                                opacity: !dataset.id ? 0.5 : 1
                                            },
                                            className: "jsx-d9c01daba222d1ca" + " " + "btn-primary",
                                            children: [
                                                isSaving ? /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$next$2f$dist$2f$server$2f$route$2d$modules$2f$app$2d$page$2f$vendored$2f$ssr$2f$react$2d$jsx$2d$dev$2d$runtime$2e$js__$5b$app$2d$ssr$5d$__$28$ecmascript$29$__["jsxDEV"])(__TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$lucide$2d$react$2f$dist$2f$esm$2f$icons$2f$loader$2d$circle$2e$js__$5b$app$2d$ssr$5d$__$28$ecmascript$29$__$3c$export__default__as__Loader2$3e$__["Loader2"], {
                                                    size: 18,
                                                    className: "animate-spin"
                                                }, void 0, false, {
                                                    fileName: "[project]/src/components/canvas/ReportCanvas.tsx",
                                                    lineNumber: 667,
                                                    columnNumber: 45
                                                }, ("TURBOPACK compile-time value", void 0)) : /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$next$2f$dist$2f$server$2f$route$2d$modules$2f$app$2d$page$2f$vendored$2f$ssr$2f$react$2d$jsx$2d$dev$2d$runtime$2e$js__$5b$app$2d$ssr$5d$__$28$ecmascript$29$__["jsxDEV"])(__TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$lucide$2d$react$2f$dist$2f$esm$2f$icons$2f$save$2e$js__$5b$app$2d$ssr$5d$__$28$ecmascript$29$__$3c$export__default__as__Save$3e$__["Save"], {
                                                    size: 18
                                                }, void 0, false, {
                                                    fileName: "[project]/src/components/canvas/ReportCanvas.tsx",
                                                    lineNumber: 669,
                                                    columnNumber: 45
                                                }, ("TURBOPACK compile-time value", void 0)),
                                                isSaving ? t('common.loading') : reportId ? t('canvas.save') : t('canvas.save_report')
                                            ]
                                        }, void 0, true, {
                                            fileName: "[project]/src/components/canvas/ReportCanvas.tsx",
                                            lineNumber: 651,
                                            columnNumber: 37
                                        }, ("TURBOPACK compile-time value", void 0)),
                                        reportId && /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$next$2f$dist$2f$server$2f$route$2d$modules$2f$app$2d$page$2f$vendored$2f$ssr$2f$react$2d$jsx$2d$dev$2d$runtime$2e$js__$5b$app$2d$ssr$5d$__$28$ecmascript$29$__["jsxDEV"])("button", {
                                            onClick: ()=>handleSave(true),
                                            disabled: isSaving,
                                            style: {
                                                width: '100%',
                                                padding: '10px',
                                                display: 'flex',
                                                alignItems: 'center',
                                                justifyContent: 'center',
                                                gap: '8px',
                                                border: '1px solid var(--border)',
                                                color: 'var(--text-muted)'
                                            },
                                            className: "jsx-d9c01daba222d1ca" + " " + "btn-secondary",
                                            children: [
                                                /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$next$2f$dist$2f$server$2f$route$2d$modules$2f$app$2d$page$2f$vendored$2f$ssr$2f$react$2d$jsx$2d$dev$2d$runtime$2e$js__$5b$app$2d$ssr$5d$__$28$ecmascript$29$__["jsxDEV"])(__TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$lucide$2d$react$2f$dist$2f$esm$2f$icons$2f$save$2e$js__$5b$app$2d$ssr$5d$__$28$ecmascript$29$__$3c$export__default__as__Save$3e$__["Save"], {
                                                    size: 16
                                                }, void 0, false, {
                                                    fileName: "[project]/src/components/canvas/ReportCanvas.tsx",
                                                    lineNumber: 689,
                                                    columnNumber: 45
                                                }, ("TURBOPACK compile-time value", void 0)),
                                                t('canvas.save_as')
                                            ]
                                        }, void 0, true, {
                                            fileName: "[project]/src/components/canvas/ReportCanvas.tsx",
                                            lineNumber: 674,
                                            columnNumber: 41
                                        }, ("TURBOPACK compile-time value", void 0)),
                                        /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$next$2f$dist$2f$server$2f$route$2d$modules$2f$app$2d$page$2f$vendored$2f$ssr$2f$react$2d$jsx$2d$dev$2d$runtime$2e$js__$5b$app$2d$ssr$5d$__$28$ecmascript$29$__["jsxDEV"])("button", {
                                            onClick: ()=>setIsReportSettingsOpen(!isReportSettingsOpen),
                                            style: {
                                                width: '100%',
                                                padding: '10px',
                                                display: 'flex',
                                                alignItems: 'center',
                                                justifyContent: 'center',
                                                gap: '8px',
                                                border: isReportSettingsOpen ? '1px solid var(--primary)' : '1px solid var(--border)',
                                                color: isReportSettingsOpen ? 'var(--primary)' : 'var(--text-muted)'
                                            },
                                            className: "jsx-d9c01daba222d1ca" + " " + "btn-secondary",
                                            children: [
                                                /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$next$2f$dist$2f$server$2f$route$2d$modules$2f$app$2d$page$2f$vendored$2f$ssr$2f$react$2d$jsx$2d$dev$2d$runtime$2e$js__$5b$app$2d$ssr$5d$__$28$ecmascript$29$__["jsxDEV"])(__TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$lucide$2d$react$2f$dist$2f$esm$2f$icons$2f$settings$2e$js__$5b$app$2d$ssr$5d$__$28$ecmascript$29$__$3c$export__default__as__Settings$3e$__["Settings"], {
                                                    size: 18
                                                }, void 0, false, {
                                                    fileName: "[project]/src/components/canvas/ReportCanvas.tsx",
                                                    lineNumber: 707,
                                                    columnNumber: 41
                                                }, ("TURBOPACK compile-time value", void 0)),
                                                isReportSettingsOpen ? t('canvas.report_settings') : t('canvas.settings')
                                            ]
                                        }, void 0, true, {
                                            fileName: "[project]/src/components/canvas/ReportCanvas.tsx",
                                            lineNumber: 693,
                                            columnNumber: 37
                                        }, ("TURBOPACK compile-time value", void 0)),
                                        lastSaved && /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$next$2f$dist$2f$server$2f$route$2d$modules$2f$app$2d$page$2f$vendored$2f$ssr$2f$react$2d$jsx$2d$dev$2d$runtime$2e$js__$5b$app$2d$ssr$5d$__$28$ecmascript$29$__["jsxDEV"])("div", {
                                            style: {
                                                display: 'flex',
                                                alignItems: 'center',
                                                gap: '6px',
                                                fontSize: '0.75rem',
                                                color: 'var(--text-muted)',
                                                justifyContent: 'center'
                                            },
                                            className: "jsx-d9c01daba222d1ca",
                                            children: [
                                                /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$next$2f$dist$2f$server$2f$route$2d$modules$2f$app$2d$page$2f$vendored$2f$ssr$2f$react$2d$jsx$2d$dev$2d$runtime$2e$js__$5b$app$2d$ssr$5d$__$28$ecmascript$29$__["jsxDEV"])(__TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$lucide$2d$react$2f$dist$2f$esm$2f$icons$2f$circle$2d$check$2e$js__$5b$app$2d$ssr$5d$__$28$ecmascript$29$__$3c$export__default__as__CheckCircle2$3e$__["CheckCircle2"], {
                                                    size: 12,
                                                    color: "#10b981"
                                                }, void 0, false, {
                                                    fileName: "[project]/src/components/canvas/ReportCanvas.tsx",
                                                    lineNumber: 712,
                                                    columnNumber: 45
                                                }, ("TURBOPACK compile-time value", void 0)),
                                                t('canvas.saved_at'),
                                                " ",
                                                lastSaved.toLocaleTimeString([], {
                                                    hour: '2-digit',
                                                    minute: '2-digit'
                                                })
                                            ]
                                        }, void 0, true, {
                                            fileName: "[project]/src/components/canvas/ReportCanvas.tsx",
                                            lineNumber: 711,
                                            columnNumber: 41
                                        }, ("TURBOPACK compile-time value", void 0)),
                                        !dataset.id && /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$next$2f$dist$2f$server$2f$route$2d$modules$2f$app$2d$page$2f$vendored$2f$ssr$2f$react$2d$jsx$2d$dev$2d$runtime$2e$js__$5b$app$2d$ssr$5d$__$28$ecmascript$29$__["jsxDEV"])("p", {
                                            style: {
                                                fontSize: '0.65rem',
                                                color: '#fbbf24',
                                                textAlign: 'center'
                                            },
                                            className: "jsx-d9c01daba222d1ca",
                                            children: [
                                                "⚠️ ",
                                                t('canvas.temporary_dataset')
                                            ]
                                        }, void 0, true, {
                                            fileName: "[project]/src/components/canvas/ReportCanvas.tsx",
                                            lineNumber: 717,
                                            columnNumber: 41
                                        }, ("TURBOPACK compile-time value", void 0))
                                    ]
                                }, void 0, true, {
                                    fileName: "[project]/src/components/canvas/ReportCanvas.tsx",
                                    lineNumber: 650,
                                    columnNumber: 33
                                }, ("TURBOPACK compile-time value", void 0))
                            }, void 0, false, {
                                fileName: "[project]/src/components/canvas/ReportCanvas.tsx",
                                lineNumber: 645,
                                columnNumber: 29
                            }, ("TURBOPACK compile-time value", void 0)),
                            /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$next$2f$dist$2f$server$2f$route$2d$modules$2f$app$2d$page$2f$vendored$2f$ssr$2f$react$2d$jsx$2d$dev$2d$runtime$2e$js__$5b$app$2d$ssr$5d$__$28$ecmascript$29$__["jsxDEV"])("div", {
                                style: {
                                    padding: '24px 16px',
                                    display: 'flex',
                                    flexDirection: 'column',
                                    gap: '32px'
                                },
                                className: "jsx-d9c01daba222d1ca",
                                children: isReportSettingsOpen ? /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$next$2f$dist$2f$server$2f$route$2d$modules$2f$app$2d$page$2f$vendored$2f$ssr$2f$react$2d$jsx$2d$dev$2d$runtime$2e$js__$5b$app$2d$ssr$5d$__$28$ecmascript$29$__["jsxDEV"])("div", {
                                    className: "jsx-d9c01daba222d1ca" + " " + "animate-in slide-in-from-left duration-300",
                                    children: [
                                        /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$next$2f$dist$2f$server$2f$route$2d$modules$2f$app$2d$page$2f$vendored$2f$ssr$2f$react$2d$jsx$2d$dev$2d$runtime$2e$js__$5b$app$2d$ssr$5d$__$28$ecmascript$29$__["jsxDEV"])("h4", {
                                            style: {
                                                marginBottom: '16px',
                                                fontSize: '0.875rem',
                                                color: 'var(--text-muted)',
                                                textTransform: 'uppercase',
                                                letterSpacing: '0.05em'
                                            },
                                            className: "jsx-d9c01daba222d1ca",
                                            children: "Report Settings"
                                        }, void 0, false, {
                                            fileName: "[project]/src/components/canvas/ReportCanvas.tsx",
                                            lineNumber: 729,
                                            columnNumber: 37
                                        }, ("TURBOPACK compile-time value", void 0)),
                                        /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$next$2f$dist$2f$server$2f$route$2d$modules$2f$app$2d$page$2f$vendored$2f$ssr$2f$react$2d$jsx$2d$dev$2d$runtime$2e$js__$5b$app$2d$ssr$5d$__$28$ecmascript$29$__["jsxDEV"])("div", {
                                            style: {
                                                display: 'flex',
                                                flexDirection: 'column',
                                                gap: '20px'
                                            },
                                            className: "jsx-d9c01daba222d1ca",
                                            children: [
                                                /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$next$2f$dist$2f$server$2f$route$2d$modules$2f$app$2d$page$2f$vendored$2f$ssr$2f$react$2d$jsx$2d$dev$2d$runtime$2e$js__$5b$app$2d$ssr$5d$__$28$ecmascript$29$__["jsxDEV"])("div", {
                                                    className: "jsx-d9c01daba222d1ca",
                                                    children: [
                                                        /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$next$2f$dist$2f$server$2f$route$2d$modules$2f$app$2d$page$2f$vendored$2f$ssr$2f$react$2d$jsx$2d$dev$2d$runtime$2e$js__$5b$app$2d$ssr$5d$__$28$ecmascript$29$__["jsxDEV"])("label", {
                                                            style: {
                                                                fontSize: '0.75rem',
                                                                color: 'var(--text-muted)',
                                                                display: 'block',
                                                                marginBottom: '8px'
                                                            },
                                                            className: "jsx-d9c01daba222d1ca",
                                                            children: t('canvas.view_url')
                                                        }, void 0, false, {
                                                            fileName: "[project]/src/components/canvas/ReportCanvas.tsx",
                                                            lineNumber: 734,
                                                            columnNumber: 45
                                                        }, ("TURBOPACK compile-time value", void 0)),
                                                        /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$next$2f$dist$2f$server$2f$route$2d$modules$2f$app$2d$page$2f$vendored$2f$ssr$2f$react$2d$jsx$2d$dev$2d$runtime$2e$js__$5b$app$2d$ssr$5d$__$28$ecmascript$29$__["jsxDEV"])("div", {
                                                            style: {
                                                                position: 'relative',
                                                                display: 'flex',
                                                                alignItems: 'center'
                                                            },
                                                            className: "jsx-d9c01daba222d1ca",
                                                            children: [
                                                                /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$next$2f$dist$2f$server$2f$route$2d$modules$2f$app$2d$page$2f$vendored$2f$ssr$2f$react$2d$jsx$2d$dev$2d$runtime$2e$js__$5b$app$2d$ssr$5d$__$28$ecmascript$29$__["jsxDEV"])("input", {
                                                                    type: "text",
                                                                    readOnly: true,
                                                                    value: reportId ? `${("TURBOPACK compile-time falsy", 0) ? "TURBOPACK unreachable" : ''}/report/${reportId}` : t('canvas.no_widgets'),
                                                                    style: {
                                                                        width: '100%',
                                                                        padding: '10px',
                                                                        paddingRight: '40px',
                                                                        background: 'var(--surface-light)',
                                                                        border: '1px solid var(--border)',
                                                                        borderRadius: '8px',
                                                                        color: 'var(--text-muted)',
                                                                        fontSize: '0.75rem',
                                                                        outline: 'none'
                                                                    },
                                                                    className: "jsx-d9c01daba222d1ca"
                                                                }, void 0, false, {
                                                                    fileName: "[project]/src/components/canvas/ReportCanvas.tsx",
                                                                    lineNumber: 736,
                                                                    columnNumber: 49
                                                                }, ("TURBOPACK compile-time value", void 0)),
                                                                /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$next$2f$dist$2f$server$2f$route$2d$modules$2f$app$2d$page$2f$vendored$2f$ssr$2f$react$2d$jsx$2d$dev$2d$runtime$2e$js__$5b$app$2d$ssr$5d$__$28$ecmascript$29$__["jsxDEV"])("button", {
                                                                    onClick: handleCopyURL,
                                                                    disabled: !reportId,
                                                                    style: {
                                                                        position: 'absolute',
                                                                        right: '8px',
                                                                        background: isCopied ? 'rgba(34, 211, 238, 0.1)' : 'transparent',
                                                                        border: 'none',
                                                                        color: isCopied ? 'var(--accent)' : 'var(--text-muted)',
                                                                        cursor: reportId ? 'pointer' : 'default',
                                                                        padding: '6px',
                                                                        borderRadius: '6px',
                                                                        display: 'flex',
                                                                        alignItems: 'center',
                                                                        justifyContent: 'center',
                                                                        transition: 'all 0.2s',
                                                                        opacity: reportId ? 1 : 0.5
                                                                    },
                                                                    title: t('canvas.copy_url'),
                                                                    className: "jsx-d9c01daba222d1ca",
                                                                    children: isCopied ? /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$next$2f$dist$2f$server$2f$route$2d$modules$2f$app$2d$page$2f$vendored$2f$ssr$2f$react$2d$jsx$2d$dev$2d$runtime$2e$js__$5b$app$2d$ssr$5d$__$28$ecmascript$29$__["jsxDEV"])(__TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$lucide$2d$react$2f$dist$2f$esm$2f$icons$2f$check$2e$js__$5b$app$2d$ssr$5d$__$28$ecmascript$29$__$3c$export__default__as__Check$3e$__["Check"], {
                                                                        size: 14
                                                                    }, void 0, false, {
                                                                        fileName: "[project]/src/components/canvas/ReportCanvas.tsx",
                                                                        lineNumber: 772,
                                                                        columnNumber: 65
                                                                    }, ("TURBOPACK compile-time value", void 0)) : /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$next$2f$dist$2f$server$2f$route$2d$modules$2f$app$2d$page$2f$vendored$2f$ssr$2f$react$2d$jsx$2d$dev$2d$runtime$2e$js__$5b$app$2d$ssr$5d$__$28$ecmascript$29$__["jsxDEV"])(__TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$lucide$2d$react$2f$dist$2f$esm$2f$icons$2f$copy$2e$js__$5b$app$2d$ssr$5d$__$28$ecmascript$29$__$3c$export__default__as__Copy$3e$__["Copy"], {
                                                                        size: 14
                                                                    }, void 0, false, {
                                                                        fileName: "[project]/src/components/canvas/ReportCanvas.tsx",
                                                                        lineNumber: 772,
                                                                        columnNumber: 87
                                                                    }, ("TURBOPACK compile-time value", void 0))
                                                                }, void 0, false, {
                                                                    fileName: "[project]/src/components/canvas/ReportCanvas.tsx",
                                                                    lineNumber: 752,
                                                                    columnNumber: 49
                                                                }, ("TURBOPACK compile-time value", void 0))
                                                            ]
                                                        }, void 0, true, {
                                                            fileName: "[project]/src/components/canvas/ReportCanvas.tsx",
                                                            lineNumber: 735,
                                                            columnNumber: 45
                                                        }, ("TURBOPACK compile-time value", void 0)),
                                                        /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$next$2f$dist$2f$server$2f$route$2d$modules$2f$app$2d$page$2f$vendored$2f$ssr$2f$react$2d$jsx$2d$dev$2d$runtime$2e$js__$5b$app$2d$ssr$5d$__$28$ecmascript$29$__["jsxDEV"])("p", {
                                                            style: {
                                                                fontSize: '0.65rem',
                                                                color: 'var(--text-muted)',
                                                                marginTop: '8px'
                                                            },
                                                            className: "jsx-d9c01daba222d1ca",
                                                            children: t('canvas.public_url_note')
                                                        }, void 0, false, {
                                                            fileName: "[project]/src/components/canvas/ReportCanvas.tsx",
                                                            lineNumber: 775,
                                                            columnNumber: 45
                                                        }, ("TURBOPACK compile-time value", void 0))
                                                    ]
                                                }, void 0, true, {
                                                    fileName: "[project]/src/components/canvas/ReportCanvas.tsx",
                                                    lineNumber: 733,
                                                    columnNumber: 41
                                                }, ("TURBOPACK compile-time value", void 0)),
                                                /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$next$2f$dist$2f$server$2f$route$2d$modules$2f$app$2d$page$2f$vendored$2f$ssr$2f$react$2d$jsx$2d$dev$2d$runtime$2e$js__$5b$app$2d$ssr$5d$__$28$ecmascript$29$__["jsxDEV"])("div", {
                                                    style: {
                                                        paddingTop: '20px',
                                                        borderTop: '1px solid var(--border)'
                                                    },
                                                    className: "jsx-d9c01daba222d1ca",
                                                    children: /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$next$2f$dist$2f$server$2f$route$2d$modules$2f$app$2d$page$2f$vendored$2f$ssr$2f$react$2d$jsx$2d$dev$2d$runtime$2e$js__$5b$app$2d$ssr$5d$__$28$ecmascript$29$__["jsxDEV"])("button", {
                                                        onClick: handleDeleteReport,
                                                        disabled: !reportId,
                                                        style: {
                                                            width: '100%',
                                                            padding: '12px',
                                                            background: 'rgba(248, 113, 113, 0.1)',
                                                            border: '1px solid rgba(248, 113, 113, 0.2)',
                                                            borderRadius: '8px',
                                                            color: '#f87171',
                                                            display: 'flex',
                                                            alignItems: 'center',
                                                            justifyContent: 'center',
                                                            gap: '8px',
                                                            cursor: 'pointer',
                                                            fontSize: '0.875rem'
                                                        },
                                                        className: "jsx-d9c01daba222d1ca",
                                                        children: [
                                                            /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$next$2f$dist$2f$server$2f$route$2d$modules$2f$app$2d$page$2f$vendored$2f$ssr$2f$react$2d$jsx$2d$dev$2d$runtime$2e$js__$5b$app$2d$ssr$5d$__$28$ecmascript$29$__["jsxDEV"])(__TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$lucide$2d$react$2f$dist$2f$esm$2f$icons$2f$trash$2d$2$2e$js__$5b$app$2d$ssr$5d$__$28$ecmascript$29$__$3c$export__default__as__Trash2$3e$__["Trash2"], {
                                                                size: 18
                                                            }, void 0, false, {
                                                                fileName: "[project]/src/components/canvas/ReportCanvas.tsx",
                                                                lineNumber: 799,
                                                                columnNumber: 49
                                                            }, ("TURBOPACK compile-time value", void 0)),
                                                            t('canvas.delete_report')
                                                        ]
                                                    }, void 0, true, {
                                                        fileName: "[project]/src/components/canvas/ReportCanvas.tsx",
                                                        lineNumber: 781,
                                                        columnNumber: 45
                                                    }, ("TURBOPACK compile-time value", void 0))
                                                }, void 0, false, {
                                                    fileName: "[project]/src/components/canvas/ReportCanvas.tsx",
                                                    lineNumber: 780,
                                                    columnNumber: 41
                                                }, ("TURBOPACK compile-time value", void 0))
                                            ]
                                        }, void 0, true, {
                                            fileName: "[project]/src/components/canvas/ReportCanvas.tsx",
                                            lineNumber: 732,
                                            columnNumber: 37
                                        }, ("TURBOPACK compile-time value", void 0))
                                    ]
                                }, void 0, true, {
                                    fileName: "[project]/src/components/canvas/ReportCanvas.tsx",
                                    lineNumber: 728,
                                    columnNumber: 33
                                }, ("TURBOPACK compile-time value", void 0)) : /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$next$2f$dist$2f$server$2f$route$2d$modules$2f$app$2d$page$2f$vendored$2f$ssr$2f$react$2d$jsx$2d$dev$2d$runtime$2e$js__$5b$app$2d$ssr$5d$__$28$ecmascript$29$__["jsxDEV"])(__TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$next$2f$dist$2f$server$2f$route$2d$modules$2f$app$2d$page$2f$vendored$2f$ssr$2f$react$2d$jsx$2d$dev$2d$runtime$2e$js__$5b$app$2d$ssr$5d$__$28$ecmascript$29$__["Fragment"], {
                                    children: selection.type === 'filters' ? /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$next$2f$dist$2f$server$2f$route$2d$modules$2f$app$2d$page$2f$vendored$2f$ssr$2f$react$2d$jsx$2d$dev$2d$runtime$2e$js__$5b$app$2d$ssr$5d$__$28$ecmascript$29$__["jsxDEV"])("div", {
                                        className: "jsx-d9c01daba222d1ca" + " " + "animate-in slide-in-from-left duration-300",
                                        children: [
                                            /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$next$2f$dist$2f$server$2f$route$2d$modules$2f$app$2d$page$2f$vendored$2f$ssr$2f$react$2d$jsx$2d$dev$2d$runtime$2e$js__$5b$app$2d$ssr$5d$__$28$ecmascript$29$__["jsxDEV"])("div", {
                                                style: {
                                                    display: 'flex',
                                                    justifyContent: 'space-between',
                                                    alignItems: 'center',
                                                    marginBottom: '16px'
                                                },
                                                className: "jsx-d9c01daba222d1ca",
                                                children: [
                                                    /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$next$2f$dist$2f$server$2f$route$2d$modules$2f$app$2d$page$2f$vendored$2f$ssr$2f$react$2d$jsx$2d$dev$2d$runtime$2e$js__$5b$app$2d$ssr$5d$__$28$ecmascript$29$__["jsxDEV"])("h4", {
                                                        style: {
                                                            fontSize: '0.875rem',
                                                            color: 'var(--text-muted)',
                                                            textTransform: 'uppercase',
                                                            letterSpacing: '0.05em'
                                                        },
                                                        className: "jsx-d9c01daba222d1ca",
                                                        children: t('canvas.filters_config')
                                                    }, void 0, false, {
                                                        fileName: "[project]/src/components/canvas/ReportCanvas.tsx",
                                                        lineNumber: 810,
                                                        columnNumber: 49
                                                    }, ("TURBOPACK compile-time value", void 0)),
                                                    /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$next$2f$dist$2f$server$2f$route$2d$modules$2f$app$2d$page$2f$vendored$2f$ssr$2f$react$2d$jsx$2d$dev$2d$runtime$2e$js__$5b$app$2d$ssr$5d$__$28$ecmascript$29$__["jsxDEV"])("button", {
                                                        onClick: handleBackToVisuals,
                                                        style: {
                                                            background: 'transparent',
                                                            border: 'none',
                                                            color: 'var(--text-muted)',
                                                            cursor: 'pointer'
                                                        },
                                                        className: "jsx-d9c01daba222d1ca",
                                                        children: /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$next$2f$dist$2f$server$2f$route$2d$modules$2f$app$2d$page$2f$vendored$2f$ssr$2f$react$2d$jsx$2d$dev$2d$runtime$2e$js__$5b$app$2d$ssr$5d$__$28$ecmascript$29$__["jsxDEV"])(__TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$lucide$2d$react$2f$dist$2f$esm$2f$icons$2f$x$2e$js__$5b$app$2d$ssr$5d$__$28$ecmascript$29$__$3c$export__default__as__X$3e$__["X"], {
                                                            size: 14
                                                        }, void 0, false, {
                                                            fileName: "[project]/src/components/canvas/ReportCanvas.tsx",
                                                            lineNumber: 814,
                                                            columnNumber: 53
                                                        }, ("TURBOPACK compile-time value", void 0))
                                                    }, void 0, false, {
                                                        fileName: "[project]/src/components/canvas/ReportCanvas.tsx",
                                                        lineNumber: 813,
                                                        columnNumber: 49
                                                    }, ("TURBOPACK compile-time value", void 0))
                                                ]
                                            }, void 0, true, {
                                                fileName: "[project]/src/components/canvas/ReportCanvas.tsx",
                                                lineNumber: 809,
                                                columnNumber: 45
                                            }, ("TURBOPACK compile-time value", void 0)),
                                            /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$next$2f$dist$2f$server$2f$route$2d$modules$2f$app$2d$page$2f$vendored$2f$ssr$2f$react$2d$jsx$2d$dev$2d$runtime$2e$js__$5b$app$2d$ssr$5d$__$28$ecmascript$29$__["jsxDEV"])("div", {
                                                style: {
                                                    display: 'flex',
                                                    flexDirection: 'column',
                                                    gap: '16px'
                                                },
                                                className: "jsx-d9c01daba222d1ca",
                                                children: [
                                                    /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$next$2f$dist$2f$server$2f$route$2d$modules$2f$app$2d$page$2f$vendored$2f$ssr$2f$react$2d$jsx$2d$dev$2d$runtime$2e$js__$5b$app$2d$ssr$5d$__$28$ecmascript$29$__["jsxDEV"])("p", {
                                                        style: {
                                                            fontSize: '0.875rem',
                                                            color: 'var(--text-muted)'
                                                        },
                                                        className: "jsx-d9c01daba222d1ca",
                                                        children: "Drag and drop dataset fields into the Filter Bar at the top of the canvas to create global filters."
                                                    }, void 0, false, {
                                                        fileName: "[project]/src/components/canvas/ReportCanvas.tsx",
                                                        lineNumber: 818,
                                                        columnNumber: 49
                                                    }, ("TURBOPACK compile-time value", void 0)),
                                                    /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$next$2f$dist$2f$server$2f$route$2d$modules$2f$app$2d$page$2f$vendored$2f$ssr$2f$react$2d$jsx$2d$dev$2d$runtime$2e$js__$5b$app$2d$ssr$5d$__$28$ecmascript$29$__["jsxDEV"])("div", {
                                                        style: {
                                                            paddingTop: '16px',
                                                            borderTop: '1px solid var(--border)'
                                                        },
                                                        className: "jsx-d9c01daba222d1ca",
                                                        children: [
                                                            /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$next$2f$dist$2f$server$2f$route$2d$modules$2f$app$2d$page$2f$vendored$2f$ssr$2f$react$2d$jsx$2d$dev$2d$runtime$2e$js__$5b$app$2d$ssr$5d$__$28$ecmascript$29$__["jsxDEV"])("h5", {
                                                                style: {
                                                                    fontSize: '0.75rem',
                                                                    fontWeight: 600,
                                                                    marginBottom: '12px'
                                                                },
                                                                className: "jsx-d9c01daba222d1ca",
                                                                children: [
                                                                    t('canvas.active_filters'),
                                                                    " (",
                                                                    globalFilters.length,
                                                                    ")"
                                                                ]
                                                            }, void 0, true, {
                                                                fileName: "[project]/src/components/canvas/ReportCanvas.tsx",
                                                                lineNumber: 822,
                                                                columnNumber: 53
                                                            }, ("TURBOPACK compile-time value", void 0)),
                                                            /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$next$2f$dist$2f$server$2f$route$2d$modules$2f$app$2d$page$2f$vendored$2f$ssr$2f$react$2d$jsx$2d$dev$2d$runtime$2e$js__$5b$app$2d$ssr$5d$__$28$ecmascript$29$__["jsxDEV"])("div", {
                                                                style: {
                                                                    display: 'flex',
                                                                    flexDirection: 'column',
                                                                    gap: '8px'
                                                                },
                                                                className: "jsx-d9c01daba222d1ca",
                                                                children: globalFilters.map((f)=>/*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$next$2f$dist$2f$server$2f$route$2d$modules$2f$app$2d$page$2f$vendored$2f$ssr$2f$react$2d$jsx$2d$dev$2d$runtime$2e$js__$5b$app$2d$ssr$5d$__$28$ecmascript$29$__["jsxDEV"])("div", {
                                                                        style: {
                                                                            display: 'flex',
                                                                            justifyContent: 'space-between',
                                                                            alignItems: 'center',
                                                                            padding: '10px',
                                                                            background: 'var(--surface-light)',
                                                                            borderRadius: '8px',
                                                                            border: '1px solid var(--border)'
                                                                        },
                                                                        className: "jsx-d9c01daba222d1ca",
                                                                        children: [
                                                                            /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$next$2f$dist$2f$server$2f$route$2d$modules$2f$app$2d$page$2f$vendored$2f$ssr$2f$react$2d$jsx$2d$dev$2d$runtime$2e$js__$5b$app$2d$ssr$5d$__$28$ecmascript$29$__["jsxDEV"])("span", {
                                                                                style: {
                                                                                    fontSize: '0.8125rem'
                                                                                },
                                                                                className: "jsx-d9c01daba222d1ca",
                                                                                children: f.column
                                                                            }, void 0, false, {
                                                                                fileName: "[project]/src/components/canvas/ReportCanvas.tsx",
                                                                                lineNumber: 826,
                                                                                columnNumber: 65
                                                                            }, ("TURBOPACK compile-time value", void 0)),
                                                                            /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$next$2f$dist$2f$server$2f$route$2d$modules$2f$app$2d$page$2f$vendored$2f$ssr$2f$react$2d$jsx$2d$dev$2d$runtime$2e$js__$5b$app$2d$ssr$5d$__$28$ecmascript$29$__["jsxDEV"])("button", {
                                                                                onClick: ()=>removeGlobalFilter(f.id),
                                                                                style: {
                                                                                    background: 'transparent',
                                                                                    border: 'none',
                                                                                    color: '#f87171',
                                                                                    cursor: 'pointer'
                                                                                },
                                                                                className: "jsx-d9c01daba222d1ca",
                                                                                children: /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$next$2f$dist$2f$server$2f$route$2d$modules$2f$app$2d$page$2f$vendored$2f$ssr$2f$react$2d$jsx$2d$dev$2d$runtime$2e$js__$5b$app$2d$ssr$5d$__$28$ecmascript$29$__["jsxDEV"])(__TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$lucide$2d$react$2f$dist$2f$esm$2f$icons$2f$x$2e$js__$5b$app$2d$ssr$5d$__$28$ecmascript$29$__$3c$export__default__as__X$3e$__["X"], {
                                                                                    size: 14
                                                                                }, void 0, false, {
                                                                                    fileName: "[project]/src/components/canvas/ReportCanvas.tsx",
                                                                                    lineNumber: 828,
                                                                                    columnNumber: 69
                                                                                }, ("TURBOPACK compile-time value", void 0))
                                                                            }, void 0, false, {
                                                                                fileName: "[project]/src/components/canvas/ReportCanvas.tsx",
                                                                                lineNumber: 827,
                                                                                columnNumber: 65
                                                                            }, ("TURBOPACK compile-time value", void 0))
                                                                        ]
                                                                    }, f.id, true, {
                                                                        fileName: "[project]/src/components/canvas/ReportCanvas.tsx",
                                                                        lineNumber: 825,
                                                                        columnNumber: 61
                                                                    }, ("TURBOPACK compile-time value", void 0)))
                                                            }, void 0, false, {
                                                                fileName: "[project]/src/components/canvas/ReportCanvas.tsx",
                                                                lineNumber: 823,
                                                                columnNumber: 53
                                                            }, ("TURBOPACK compile-time value", void 0))
                                                        ]
                                                    }, void 0, true, {
                                                        fileName: "[project]/src/components/canvas/ReportCanvas.tsx",
                                                        lineNumber: 821,
                                                        columnNumber: 49
                                                    }, ("TURBOPACK compile-time value", void 0))
                                                ]
                                            }, void 0, true, {
                                                fileName: "[project]/src/components/canvas/ReportCanvas.tsx",
                                                lineNumber: 817,
                                                columnNumber: 45
                                            }, ("TURBOPACK compile-time value", void 0))
                                        ]
                                    }, void 0, true, {
                                        fileName: "[project]/src/components/canvas/ReportCanvas.tsx",
                                        lineNumber: 808,
                                        columnNumber: 41
                                    }, ("TURBOPACK compile-time value", void 0)) : activeWidget ? /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$next$2f$dist$2f$server$2f$route$2d$modules$2f$app$2d$page$2f$vendored$2f$ssr$2f$react$2d$jsx$2d$dev$2d$runtime$2e$js__$5b$app$2d$ssr$5d$__$28$ecmascript$29$__["jsxDEV"])("div", {
                                        className: "jsx-d9c01daba222d1ca" + " " + "animate-in slide-in-from-left duration-300",
                                        children: [
                                            /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$next$2f$dist$2f$server$2f$route$2d$modules$2f$app$2d$page$2f$vendored$2f$ssr$2f$react$2d$jsx$2d$dev$2d$runtime$2e$js__$5b$app$2d$ssr$5d$__$28$ecmascript$29$__["jsxDEV"])("div", {
                                                style: {
                                                    display: 'flex',
                                                    justifyContent: 'space-between',
                                                    alignItems: 'center',
                                                    marginBottom: '16px'
                                                },
                                                className: "jsx-d9c01daba222d1ca",
                                                children: [
                                                    /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$next$2f$dist$2f$server$2f$route$2d$modules$2f$app$2d$page$2f$vendored$2f$ssr$2f$react$2d$jsx$2d$dev$2d$runtime$2e$js__$5b$app$2d$ssr$5d$__$28$ecmascript$29$__["jsxDEV"])("h4", {
                                                        style: {
                                                            fontSize: '0.875rem',
                                                            color: 'var(--text-muted)',
                                                            textTransform: 'uppercase',
                                                            letterSpacing: '0.05em'
                                                        },
                                                        className: "jsx-d9c01daba222d1ca",
                                                        children: "Widget Settings"
                                                    }, void 0, false, {
                                                        fileName: "[project]/src/components/canvas/ReportCanvas.tsx",
                                                        lineNumber: 839,
                                                        columnNumber: 49
                                                    }, ("TURBOPACK compile-time value", void 0)),
                                                    /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$next$2f$dist$2f$server$2f$route$2d$modules$2f$app$2d$page$2f$vendored$2f$ssr$2f$react$2d$jsx$2d$dev$2d$runtime$2e$js__$5b$app$2d$ssr$5d$__$28$ecmascript$29$__["jsxDEV"])("button", {
                                                        onClick: handleBackToVisuals,
                                                        style: {
                                                            background: 'transparent',
                                                            border: 'none',
                                                            color: 'var(--text-muted)',
                                                            cursor: 'pointer'
                                                        },
                                                        className: "jsx-d9c01daba222d1ca",
                                                        children: /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$next$2f$dist$2f$server$2f$route$2d$modules$2f$app$2d$page$2f$vendored$2f$ssr$2f$react$2d$jsx$2d$dev$2d$runtime$2e$js__$5b$app$2d$ssr$5d$__$28$ecmascript$29$__["jsxDEV"])(__TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$lucide$2d$react$2f$dist$2f$esm$2f$icons$2f$x$2e$js__$5b$app$2d$ssr$5d$__$28$ecmascript$29$__$3c$export__default__as__X$3e$__["X"], {
                                                            size: 14
                                                        }, void 0, false, {
                                                            fileName: "[project]/src/components/canvas/ReportCanvas.tsx",
                                                            lineNumber: 843,
                                                            columnNumber: 53
                                                        }, ("TURBOPACK compile-time value", void 0))
                                                    }, void 0, false, {
                                                        fileName: "[project]/src/components/canvas/ReportCanvas.tsx",
                                                        lineNumber: 842,
                                                        columnNumber: 49
                                                    }, ("TURBOPACK compile-time value", void 0))
                                                ]
                                            }, void 0, true, {
                                                fileName: "[project]/src/components/canvas/ReportCanvas.tsx",
                                                lineNumber: 838,
                                                columnNumber: 45
                                            }, ("TURBOPACK compile-time value", void 0)),
                                            /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$next$2f$dist$2f$server$2f$route$2d$modules$2f$app$2d$page$2f$vendored$2f$ssr$2f$react$2d$jsx$2d$dev$2d$runtime$2e$js__$5b$app$2d$ssr$5d$__$28$ecmascript$29$__["jsxDEV"])("div", {
                                                style: {
                                                    display: 'flex',
                                                    flexDirection: 'column',
                                                    gap: '16px'
                                                },
                                                className: "jsx-d9c01daba222d1ca",
                                                children: [
                                                    /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$next$2f$dist$2f$server$2f$route$2d$modules$2f$app$2d$page$2f$vendored$2f$ssr$2f$react$2d$jsx$2d$dev$2d$runtime$2e$js__$5b$app$2d$ssr$5d$__$28$ecmascript$29$__["jsxDEV"])("div", {
                                                        className: "jsx-d9c01daba222d1ca",
                                                        children: [
                                                            /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$next$2f$dist$2f$server$2f$route$2d$modules$2f$app$2d$page$2f$vendored$2f$ssr$2f$react$2d$jsx$2d$dev$2d$runtime$2e$js__$5b$app$2d$ssr$5d$__$28$ecmascript$29$__["jsxDEV"])("label", {
                                                                style: {
                                                                    fontSize: '0.75rem',
                                                                    color: 'var(--text-muted)',
                                                                    display: 'block',
                                                                    marginBottom: '4px'
                                                                },
                                                                className: "jsx-d9c01daba222d1ca",
                                                                children: "Chart Type"
                                                            }, void 0, false, {
                                                                fileName: "[project]/src/components/canvas/ReportCanvas.tsx",
                                                                lineNumber: 848,
                                                                columnNumber: 53
                                                            }, ("TURBOPACK compile-time value", void 0)),
                                                            /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$next$2f$dist$2f$server$2f$route$2d$modules$2f$app$2d$page$2f$vendored$2f$ssr$2f$react$2d$jsx$2d$dev$2d$runtime$2e$js__$5b$app$2d$ssr$5d$__$28$ecmascript$29$__["jsxDEV"])("div", {
                                                                style: {
                                                                    display: 'grid',
                                                                    gridTemplateColumns: 'repeat(4, 1fr)',
                                                                    gap: '4px'
                                                                },
                                                                className: "jsx-d9c01daba222d1ca",
                                                                children: [
                                                                    {
                                                                        type: 'bar',
                                                                        icon: __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$lucide$2d$react$2f$dist$2f$esm$2f$icons$2f$chart$2d$column$2e$js__$5b$app$2d$ssr$5d$__$28$ecmascript$29$__$3c$export__default__as__BarChart3$3e$__["BarChart3"]
                                                                    },
                                                                    {
                                                                        type: 'line',
                                                                        icon: __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$lucide$2d$react$2f$dist$2f$esm$2f$icons$2f$chart$2d$line$2e$js__$5b$app$2d$ssr$5d$__$28$ecmascript$29$__$3c$export__default__as__LineChart$3e$__["LineChart"]
                                                                    },
                                                                    {
                                                                        type: 'pie',
                                                                        icon: __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$lucide$2d$react$2f$dist$2f$esm$2f$icons$2f$chart$2d$pie$2e$js__$5b$app$2d$ssr$5d$__$28$ecmascript$29$__$3c$export__default__as__PieChart$3e$__["PieChart"]
                                                                    },
                                                                    {
                                                                        type: 'area',
                                                                        icon: __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$lucide$2d$react$2f$dist$2f$esm$2f$icons$2f$chart$2d$area$2e$js__$5b$app$2d$ssr$5d$__$28$ecmascript$29$__$3c$export__default__as__ChartArea$3e$__["ChartArea"]
                                                                    },
                                                                    {
                                                                        type: 'treemap',
                                                                        icon: __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$lucide$2d$react$2f$dist$2f$esm$2f$icons$2f$table$2d$cells$2d$merge$2e$js__$5b$app$2d$ssr$5d$__$28$ecmascript$29$__$3c$export__default__as__TableCellsMerge$3e$__["TableCellsMerge"]
                                                                    },
                                                                    {
                                                                        type: 'table',
                                                                        icon: __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$lucide$2d$react$2f$dist$2f$esm$2f$icons$2f$table$2e$js__$5b$app$2d$ssr$5d$__$28$ecmascript$29$__$3c$export__default__as__Table$3e$__["Table"]
                                                                    },
                                                                    {
                                                                        type: 'card',
                                                                        icon: __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$lucide$2d$react$2f$dist$2f$esm$2f$icons$2f$square$2d$stack$2e$js__$5b$app$2d$ssr$5d$__$28$ecmascript$29$__$3c$export__default__as__SquareStack$3e$__["SquareStack"]
                                                                    },
                                                                    {
                                                                        type: 'map',
                                                                        icon: __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$lucide$2d$react$2f$dist$2f$esm$2f$icons$2f$map$2d$pinned$2e$js__$5b$app$2d$ssr$5d$__$28$ecmascript$29$__$3c$export__default__as__MapPinned$3e$__["MapPinned"]
                                                                    }
                                                                ].map((t)=>/*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$next$2f$dist$2f$server$2f$route$2d$modules$2f$app$2d$page$2f$vendored$2f$ssr$2f$react$2d$jsx$2d$dev$2d$runtime$2e$js__$5b$app$2d$ssr$5d$__$28$ecmascript$29$__["jsxDEV"])("button", {
                                                                        onClick: ()=>updateWidget(activeWidget.id, {
                                                                                type: t.type
                                                                            }),
                                                                        style: {
                                                                            padding: '8px',
                                                                            background: activeWidget.type === t.type ? 'var(--primary-glow)' : 'var(--surface)',
                                                                            border: activeWidget.type === t.type ? '1px solid var(--primary)' : '1px solid var(--border)',
                                                                            color: activeWidget.type === t.type ? 'var(--primary)' : 'var(--text-muted)',
                                                                            borderRadius: '6px',
                                                                            display: 'flex',
                                                                            alignItems: 'center',
                                                                            justifyContent: 'center'
                                                                        },
                                                                        className: "jsx-d9c01daba222d1ca",
                                                                        children: /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$next$2f$dist$2f$server$2f$route$2d$modules$2f$app$2d$page$2f$vendored$2f$ssr$2f$react$2d$jsx$2d$dev$2d$runtime$2e$js__$5b$app$2d$ssr$5d$__$28$ecmascript$29$__["jsxDEV"])(t.icon, {
                                                                            size: 16
                                                                        }, void 0, false, {
                                                                            fileName: "[project]/src/components/canvas/ReportCanvas.tsx",
                                                                            lineNumber: 874,
                                                                            columnNumber: 65
                                                                        }, ("TURBOPACK compile-time value", void 0))
                                                                    }, t.type, false, {
                                                                        fileName: "[project]/src/components/canvas/ReportCanvas.tsx",
                                                                        lineNumber: 860,
                                                                        columnNumber: 61
                                                                    }, ("TURBOPACK compile-time value", void 0)))
                                                            }, void 0, false, {
                                                                fileName: "[project]/src/components/canvas/ReportCanvas.tsx",
                                                                lineNumber: 849,
                                                                columnNumber: 53
                                                            }, ("TURBOPACK compile-time value", void 0))
                                                        ]
                                                    }, void 0, true, {
                                                        fileName: "[project]/src/components/canvas/ReportCanvas.tsx",
                                                        lineNumber: 847,
                                                        columnNumber: 49
                                                    }, ("TURBOPACK compile-time value", void 0)),
                                                    activeWidget.type === 'bar' && /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$next$2f$dist$2f$server$2f$route$2d$modules$2f$app$2d$page$2f$vendored$2f$ssr$2f$react$2d$jsx$2d$dev$2d$runtime$2e$js__$5b$app$2d$ssr$5d$__$28$ecmascript$29$__["jsxDEV"])("div", {
                                                        className: "jsx-d9c01daba222d1ca",
                                                        children: [
                                                            /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$next$2f$dist$2f$server$2f$route$2d$modules$2f$app$2d$page$2f$vendored$2f$ssr$2f$react$2d$jsx$2d$dev$2d$runtime$2e$js__$5b$app$2d$ssr$5d$__$28$ecmascript$29$__["jsxDEV"])("label", {
                                                                style: {
                                                                    fontSize: '0.75rem',
                                                                    color: 'var(--text-muted)',
                                                                    display: 'block',
                                                                    marginBottom: '4px'
                                                                },
                                                                className: "jsx-d9c01daba222d1ca",
                                                                children: "Orientation"
                                                            }, void 0, false, {
                                                                fileName: "[project]/src/components/canvas/ReportCanvas.tsx",
                                                                lineNumber: 882,
                                                                columnNumber: 57
                                                            }, ("TURBOPACK compile-time value", void 0)),
                                                            /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$next$2f$dist$2f$server$2f$route$2d$modules$2f$app$2d$page$2f$vendored$2f$ssr$2f$react$2d$jsx$2d$dev$2d$runtime$2e$js__$5b$app$2d$ssr$5d$__$28$ecmascript$29$__["jsxDEV"])("div", {
                                                                style: {
                                                                    display: 'grid',
                                                                    gridTemplateColumns: '1fr 1fr',
                                                                    gap: '8px'
                                                                },
                                                                className: "jsx-d9c01daba222d1ca",
                                                                children: [
                                                                    /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$next$2f$dist$2f$server$2f$route$2d$modules$2f$app$2d$page$2f$vendored$2f$ssr$2f$react$2d$jsx$2d$dev$2d$runtime$2e$js__$5b$app$2d$ssr$5d$__$28$ecmascript$29$__["jsxDEV"])("button", {
                                                                        onClick: ()=>updateWidget(activeWidget.id, {
                                                                                orientation: 'vertical'
                                                                            }),
                                                                        style: {
                                                                            padding: '8px',
                                                                            fontSize: '0.75rem',
                                                                            borderRadius: '6px',
                                                                            border: '1px solid var(--border)',
                                                                            background: activeWidget.orientation === 'vertical' ? 'var(--primary-glow)' : 'transparent',
                                                                            color: activeWidget.orientation === 'vertical' ? 'var(--primary)' : 'var(--text-muted)'
                                                                        },
                                                                        className: "jsx-d9c01daba222d1ca",
                                                                        children: "Column (V)"
                                                                    }, void 0, false, {
                                                                        fileName: "[project]/src/components/canvas/ReportCanvas.tsx",
                                                                        lineNumber: 884,
                                                                        columnNumber: 61
                                                                    }, ("TURBOPACK compile-time value", void 0)),
                                                                    /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$next$2f$dist$2f$server$2f$route$2d$modules$2f$app$2d$page$2f$vendored$2f$ssr$2f$react$2d$jsx$2d$dev$2d$runtime$2e$js__$5b$app$2d$ssr$5d$__$28$ecmascript$29$__["jsxDEV"])("button", {
                                                                        onClick: ()=>updateWidget(activeWidget.id, {
                                                                                orientation: 'horizontal'
                                                                            }),
                                                                        style: {
                                                                            padding: '8px',
                                                                            fontSize: '0.75rem',
                                                                            borderRadius: '6px',
                                                                            border: '1px solid var(--border)',
                                                                            background: activeWidget.orientation === 'horizontal' ? 'var(--primary-glow)' : 'transparent',
                                                                            color: activeWidget.orientation === 'horizontal' ? 'var(--primary)' : 'var(--text-muted)'
                                                                        },
                                                                        className: "jsx-d9c01daba222d1ca",
                                                                        children: "Bar (H)"
                                                                    }, void 0, false, {
                                                                        fileName: "[project]/src/components/canvas/ReportCanvas.tsx",
                                                                        lineNumber: 890,
                                                                        columnNumber: 61
                                                                    }, ("TURBOPACK compile-time value", void 0))
                                                                ]
                                                            }, void 0, true, {
                                                                fileName: "[project]/src/components/canvas/ReportCanvas.tsx",
                                                                lineNumber: 883,
                                                                columnNumber: 57
                                                            }, ("TURBOPACK compile-time value", void 0))
                                                        ]
                                                    }, void 0, true, {
                                                        fileName: "[project]/src/components/canvas/ReportCanvas.tsx",
                                                        lineNumber: 881,
                                                        columnNumber: 53
                                                    }, ("TURBOPACK compile-time value", void 0)),
                                                    /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$next$2f$dist$2f$server$2f$route$2d$modules$2f$app$2d$page$2f$vendored$2f$ssr$2f$react$2d$jsx$2d$dev$2d$runtime$2e$js__$5b$app$2d$ssr$5d$__$28$ecmascript$29$__["jsxDEV"])("div", {
                                                        className: "jsx-d9c01daba222d1ca",
                                                        children: [
                                                            /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$next$2f$dist$2f$server$2f$route$2d$modules$2f$app$2d$page$2f$vendored$2f$ssr$2f$react$2d$jsx$2d$dev$2d$runtime$2e$js__$5b$app$2d$ssr$5d$__$28$ecmascript$29$__["jsxDEV"])("label", {
                                                                style: {
                                                                    fontSize: '0.75rem',
                                                                    color: 'var(--text-muted)',
                                                                    display: 'block',
                                                                    marginBottom: '4px'
                                                                },
                                                                className: "jsx-d9c01daba222d1ca",
                                                                children: "Title"
                                                            }, void 0, false, {
                                                                fileName: "[project]/src/components/canvas/ReportCanvas.tsx",
                                                                lineNumber: 901,
                                                                columnNumber: 53
                                                            }, ("TURBOPACK compile-time value", void 0)),
                                                            /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$next$2f$dist$2f$server$2f$route$2d$modules$2f$app$2d$page$2f$vendored$2f$ssr$2f$react$2d$jsx$2d$dev$2d$runtime$2e$js__$5b$app$2d$ssr$5d$__$28$ecmascript$29$__["jsxDEV"])("input", {
                                                                type: "text",
                                                                value: activeWidget.title,
                                                                onChange: (e)=>updateWidget(activeWidget.id, {
                                                                        title: e.target.value
                                                                    }),
                                                                style: {
                                                                    width: '100%',
                                                                    padding: '8px',
                                                                    background: 'var(--surface)',
                                                                    border: '1px solid var(--border)',
                                                                    borderRadius: '6px',
                                                                    color: 'var(--foreground)',
                                                                    fontSize: '0.875rem'
                                                                },
                                                                className: "jsx-d9c01daba222d1ca"
                                                            }, void 0, false, {
                                                                fileName: "[project]/src/components/canvas/ReportCanvas.tsx",
                                                                lineNumber: 902,
                                                                columnNumber: 53
                                                            }, ("TURBOPACK compile-time value", void 0))
                                                        ]
                                                    }, void 0, true, {
                                                        fileName: "[project]/src/components/canvas/ReportCanvas.tsx",
                                                        lineNumber: 900,
                                                        columnNumber: 49
                                                    }, ("TURBOPACK compile-time value", void 0)),
                                                    [
                                                        'bar',
                                                        'pie',
                                                        'treemap'
                                                    ].includes(activeWidget.type) && /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$next$2f$dist$2f$server$2f$route$2d$modules$2f$app$2d$page$2f$vendored$2f$ssr$2f$react$2d$jsx$2d$dev$2d$runtime$2e$js__$5b$app$2d$ssr$5d$__$28$ecmascript$29$__["jsxDEV"])("div", {
                                                        className: "jsx-d9c01daba222d1ca",
                                                        children: [
                                                            /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$next$2f$dist$2f$server$2f$route$2d$modules$2f$app$2d$page$2f$vendored$2f$ssr$2f$react$2d$jsx$2d$dev$2d$runtime$2e$js__$5b$app$2d$ssr$5d$__$28$ecmascript$29$__["jsxDEV"])("label", {
                                                                style: {
                                                                    fontSize: '0.75rem',
                                                                    color: 'var(--text-muted)',
                                                                    display: 'block',
                                                                    marginBottom: '4px'
                                                                },
                                                                className: "jsx-d9c01daba222d1ca",
                                                                children: "Color Scheme"
                                                            }, void 0, false, {
                                                                fileName: "[project]/src/components/canvas/ReportCanvas.tsx",
                                                                lineNumber: 913,
                                                                columnNumber: 57
                                                            }, ("TURBOPACK compile-time value", void 0)),
                                                            /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$next$2f$dist$2f$server$2f$route$2d$modules$2f$app$2d$page$2f$vendored$2f$ssr$2f$react$2d$jsx$2d$dev$2d$runtime$2e$js__$5b$app$2d$ssr$5d$__$28$ecmascript$29$__["jsxDEV"])("div", {
                                                                style: {
                                                                    display: 'flex',
                                                                    flexDirection: 'column',
                                                                    gap: '4px'
                                                                },
                                                                className: "jsx-d9c01daba222d1ca",
                                                                children: colorSchemes.map((scheme)=>/*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$next$2f$dist$2f$server$2f$route$2d$modules$2f$app$2d$page$2f$vendored$2f$ssr$2f$react$2d$jsx$2d$dev$2d$runtime$2e$js__$5b$app$2d$ssr$5d$__$28$ecmascript$29$__["jsxDEV"])("button", {
                                                                        onClick: ()=>updateWidget(activeWidget.id, {
                                                                                colorScheme: scheme.id
                                                                            }),
                                                                        style: {
                                                                            padding: '8px 12px',
                                                                            background: activeWidget.colorScheme === scheme.id ? 'var(--primary-glow)' : 'var(--surface)',
                                                                            border: activeWidget.colorScheme === scheme.id ? '1px solid var(--primary)' : '1px solid var(--border)',
                                                                            borderRadius: '6px',
                                                                            display: 'flex',
                                                                            alignItems: 'center',
                                                                            gap: '8px',
                                                                            fontSize: '0.8125rem',
                                                                            color: activeWidget.colorScheme === scheme.id ? 'var(--primary)' : 'var(--text-muted)'
                                                                        },
                                                                        className: "jsx-d9c01daba222d1ca",
                                                                        children: [
                                                                            /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$next$2f$dist$2f$server$2f$route$2d$modules$2f$app$2d$page$2f$vendored$2f$ssr$2f$react$2d$jsx$2d$dev$2d$runtime$2e$js__$5b$app$2d$ssr$5d$__$28$ecmascript$29$__["jsxDEV"])(scheme.icon, {
                                                                                size: 14
                                                                            }, void 0, false, {
                                                                                fileName: "[project]/src/components/canvas/ReportCanvas.tsx",
                                                                                lineNumber: 931,
                                                                                columnNumber: 69
                                                                            }, ("TURBOPACK compile-time value", void 0)),
                                                                            " ",
                                                                            scheme.label
                                                                        ]
                                                                    }, scheme.id, true, {
                                                                        fileName: "[project]/src/components/canvas/ReportCanvas.tsx",
                                                                        lineNumber: 916,
                                                                        columnNumber: 65
                                                                    }, ("TURBOPACK compile-time value", void 0)))
                                                            }, void 0, false, {
                                                                fileName: "[project]/src/components/canvas/ReportCanvas.tsx",
                                                                lineNumber: 914,
                                                                columnNumber: 57
                                                            }, ("TURBOPACK compile-time value", void 0)),
                                                            activeWidget.colorScheme === 'solid' && /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$next$2f$dist$2f$server$2f$route$2d$modules$2f$app$2d$page$2f$vendored$2f$ssr$2f$react$2d$jsx$2d$dev$2d$runtime$2e$js__$5b$app$2d$ssr$5d$__$28$ecmascript$29$__["jsxDEV"])("div", {
                                                                style: {
                                                                    marginTop: '16px',
                                                                    display: 'flex',
                                                                    alignItems: 'center',
                                                                    gap: '12px',
                                                                    padding: '12px',
                                                                    background: 'var(--surface-light)',
                                                                    borderRadius: '8px',
                                                                    border: '1px solid var(--border)'
                                                                },
                                                                className: "jsx-d9c01daba222d1ca",
                                                                children: [
                                                                    /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$next$2f$dist$2f$server$2f$route$2d$modules$2f$app$2d$page$2f$vendored$2f$ssr$2f$react$2d$jsx$2d$dev$2d$runtime$2e$js__$5b$app$2d$ssr$5d$__$28$ecmascript$29$__["jsxDEV"])("label", {
                                                                        style: {
                                                                            fontSize: '0.75rem',
                                                                            color: 'var(--text-muted)',
                                                                            fontWeight: 600
                                                                        },
                                                                        className: "jsx-d9c01daba222d1ca",
                                                                        children: "Color Personalizado:"
                                                                    }, void 0, false, {
                                                                        fileName: "[project]/src/components/canvas/ReportCanvas.tsx",
                                                                        lineNumber: 938,
                                                                        columnNumber: 65
                                                                    }, ("TURBOPACK compile-time value", void 0)),
                                                                    /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$next$2f$dist$2f$server$2f$route$2d$modules$2f$app$2d$page$2f$vendored$2f$ssr$2f$react$2d$jsx$2d$dev$2d$runtime$2e$js__$5b$app$2d$ssr$5d$__$28$ecmascript$29$__["jsxDEV"])("input", {
                                                                        type: "color",
                                                                        value: activeWidget.customColor || '#8b5cf6',
                                                                        onChange: (e)=>updateWidget(activeWidget.id, {
                                                                                customColor: e.target.value
                                                                            }),
                                                                        style: {
                                                                            width: '32px',
                                                                            height: '32px',
                                                                            border: 'none',
                                                                            borderRadius: '4px',
                                                                            cursor: 'pointer',
                                                                            background: 'transparent'
                                                                        },
                                                                        className: "jsx-d9c01daba222d1ca"
                                                                    }, void 0, false, {
                                                                        fileName: "[project]/src/components/canvas/ReportCanvas.tsx",
                                                                        lineNumber: 939,
                                                                        columnNumber: 65
                                                                    }, ("TURBOPACK compile-time value", void 0)),
                                                                    /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$next$2f$dist$2f$server$2f$route$2d$modules$2f$app$2d$page$2f$vendored$2f$ssr$2f$react$2d$jsx$2d$dev$2d$runtime$2e$js__$5b$app$2d$ssr$5d$__$28$ecmascript$29$__["jsxDEV"])("span", {
                                                                        style: {
                                                                            fontSize: '0.75rem',
                                                                            fontFamily: 'monospace',
                                                                            color: 'var(--text-muted)'
                                                                        },
                                                                        className: "jsx-d9c01daba222d1ca",
                                                                        children: activeWidget.customColor || '#8b5cf6'
                                                                    }, void 0, false, {
                                                                        fileName: "[project]/src/components/canvas/ReportCanvas.tsx",
                                                                        lineNumber: 952,
                                                                        columnNumber: 65
                                                                    }, ("TURBOPACK compile-time value", void 0))
                                                                ]
                                                            }, void 0, true, {
                                                                fileName: "[project]/src/components/canvas/ReportCanvas.tsx",
                                                                lineNumber: 937,
                                                                columnNumber: 61
                                                            }, ("TURBOPACK compile-time value", void 0))
                                                        ]
                                                    }, void 0, true, {
                                                        fileName: "[project]/src/components/canvas/ReportCanvas.tsx",
                                                        lineNumber: 912,
                                                        columnNumber: 53
                                                    }, ("TURBOPACK compile-time value", void 0)),
                                                    activeWidget.type === 'table' ? /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$next$2f$dist$2f$server$2f$route$2d$modules$2f$app$2d$page$2f$vendored$2f$ssr$2f$react$2d$jsx$2d$dev$2d$runtime$2e$js__$5b$app$2d$ssr$5d$__$28$ecmascript$29$__["jsxDEV"])("div", {
                                                        style: {
                                                            display: 'flex',
                                                            flexDirection: 'column',
                                                            gap: '8px',
                                                            marginBottom: '16px'
                                                        },
                                                        className: "jsx-d9c01daba222d1ca",
                                                        children: [
                                                            /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$next$2f$dist$2f$server$2f$route$2d$modules$2f$app$2d$page$2f$vendored$2f$ssr$2f$react$2d$jsx$2d$dev$2d$runtime$2e$js__$5b$app$2d$ssr$5d$__$28$ecmascript$29$__["jsxDEV"])("label", {
                                                                style: {
                                                                    fontSize: '0.75rem',
                                                                    color: 'var(--text-muted)',
                                                                    display: 'block'
                                                                },
                                                                className: "jsx-d9c01daba222d1ca",
                                                                children: "Gestión de Columnas"
                                                            }, void 0, false, {
                                                                fileName: "[project]/src/components/canvas/ReportCanvas.tsx",
                                                                lineNumber: 962,
                                                                columnNumber: 57
                                                            }, ("TURBOPACK compile-time value", void 0)),
                                                            /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$next$2f$dist$2f$server$2f$route$2d$modules$2f$app$2d$page$2f$vendored$2f$ssr$2f$react$2d$jsx$2d$dev$2d$runtime$2e$js__$5b$app$2d$ssr$5d$__$28$ecmascript$29$__["jsxDEV"])("div", {
                                                                style: {
                                                                    display: 'flex',
                                                                    flexDirection: 'column',
                                                                    gap: '4px',
                                                                    maxHeight: '380px',
                                                                    overflowY: 'auto',
                                                                    padding: '10px',
                                                                    background: 'var(--surface)',
                                                                    border: '1px solid var(--border)',
                                                                    borderRadius: '8px'
                                                                },
                                                                className: "jsx-d9c01daba222d1ca",
                                                                children: (()=>{
                                                                    const selectedCols = activeWidget.columns || [];
                                                                    const availableCols = dataset.columns.filter((c)=>!selectedCols.includes(c.name));
                                                                    const allOrdered = [
                                                                        ...selectedCols.map((name)=>dataset.columns.find((c)=>c.name === name)),
                                                                        ...availableCols
                                                                    ];
                                                                    const abbrevs = {
                                                                        'SUM': 'SUM',
                                                                        'AVG': 'AVG',
                                                                        'COUNT': 'CNT',
                                                                        'DISTINCT': 'DST'
                                                                    };
                                                                    return allOrdered.map((col, idx)=>{
                                                                        if (!col) return null;
                                                                        const isSelected = selectedCols.includes(col.name);
                                                                        const selIdx = selectedCols.indexOf(col.name);
                                                                        const agg = activeWidget.columnAggregations?.[col.name] || 'NONE';
                                                                        return /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$next$2f$dist$2f$server$2f$route$2d$modules$2f$app$2d$page$2f$vendored$2f$ssr$2f$react$2d$jsx$2d$dev$2d$runtime$2e$js__$5b$app$2d$ssr$5d$__$28$ecmascript$29$__["jsxDEV"])("div", {
                                                                            style: {
                                                                                display: 'flex',
                                                                                alignItems: 'center',
                                                                                gap: '8px',
                                                                                padding: '6px 8px',
                                                                                background: isSelected ? 'rgba(255,255,255,0.03)' : 'transparent',
                                                                                borderRadius: '6px',
                                                                                border: '1px solid',
                                                                                borderColor: isSelected ? 'var(--border)' : 'transparent',
                                                                                transition: 'all 0.2s'
                                                                            },
                                                                            className: "jsx-d9c01daba222d1ca",
                                                                            children: [
                                                                                /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$next$2f$dist$2f$server$2f$route$2d$modules$2f$app$2d$page$2f$vendored$2f$ssr$2f$react$2d$jsx$2d$dev$2d$runtime$2e$js__$5b$app$2d$ssr$5d$__$28$ecmascript$29$__["jsxDEV"])("input", {
                                                                                    type: "checkbox",
                                                                                    checked: isSelected,
                                                                                    onChange: (e)=>{
                                                                                        const newCols = e.target.checked ? [
                                                                                            ...selectedCols,
                                                                                            col.name
                                                                                        ] : selectedCols.filter((c)=>c !== col.name);
                                                                                        updateWidget(activeWidget.id, {
                                                                                            columns: newCols
                                                                                        });
                                                                                    },
                                                                                    style: {
                                                                                        accentColor: 'var(--accent)',
                                                                                        cursor: 'pointer'
                                                                                    },
                                                                                    className: "jsx-d9c01daba222d1ca"
                                                                                }, void 0, false, {
                                                                                    fileName: "[project]/src/components/canvas/ReportCanvas.tsx",
                                                                                    lineNumber: 997,
                                                                                    columnNumber: 77
                                                                                }, ("TURBOPACK compile-time value", void 0)),
                                                                                /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$next$2f$dist$2f$server$2f$route$2d$modules$2f$app$2d$page$2f$vendored$2f$ssr$2f$react$2d$jsx$2d$dev$2d$runtime$2e$js__$5b$app$2d$ssr$5d$__$28$ecmascript$29$__["jsxDEV"])("div", {
                                                                                    style: {
                                                                                        flex: 1,
                                                                                        minWidth: 0,
                                                                                        display: 'flex',
                                                                                        alignItems: 'center',
                                                                                        gap: '6px'
                                                                                    },
                                                                                    className: "jsx-d9c01daba222d1ca",
                                                                                    children: [
                                                                                        /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$next$2f$dist$2f$server$2f$route$2d$modules$2f$app$2d$page$2f$vendored$2f$ssr$2f$react$2d$jsx$2d$dev$2d$runtime$2e$js__$5b$app$2d$ssr$5d$__$28$ecmascript$29$__["jsxDEV"])("span", {
                                                                                            style: {
                                                                                                fontSize: '0.8125rem',
                                                                                                fontWeight: isSelected ? 500 : 400,
                                                                                                color: isSelected ? 'var(--foreground)' : 'var(--text-muted)',
                                                                                                whiteSpace: 'nowrap',
                                                                                                overflow: 'hidden',
                                                                                                textOverflow: 'ellipsis'
                                                                                            },
                                                                                            className: "jsx-d9c01daba222d1ca",
                                                                                            children: col.name
                                                                                        }, void 0, false, {
                                                                                            fileName: "[project]/src/components/canvas/ReportCanvas.tsx",
                                                                                            lineNumber: 1010,
                                                                                            columnNumber: 81
                                                                                        }, ("TURBOPACK compile-time value", void 0)),
                                                                                        isSelected && agg !== 'NONE' && /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$next$2f$dist$2f$server$2f$route$2d$modules$2f$app$2d$page$2f$vendored$2f$ssr$2f$react$2d$jsx$2d$dev$2d$runtime$2e$js__$5b$app$2d$ssr$5d$__$28$ecmascript$29$__["jsxDEV"])("span", {
                                                                                            style: {
                                                                                                fontSize: '0.75rem',
                                                                                                color: 'var(--primary)',
                                                                                                opacity: 0.8,
                                                                                                marginLeft: '4px'
                                                                                            },
                                                                                            className: "jsx-d9c01daba222d1ca",
                                                                                            children: [
                                                                                                "(",
                                                                                                abbrevs[agg] || agg,
                                                                                                ")"
                                                                                            ]
                                                                                        }, void 0, true, {
                                                                                            fileName: "[project]/src/components/canvas/ReportCanvas.tsx",
                                                                                            lineNumber: 1021,
                                                                                            columnNumber: 85
                                                                                        }, ("TURBOPACK compile-time value", void 0))
                                                                                    ]
                                                                                }, void 0, true, {
                                                                                    fileName: "[project]/src/components/canvas/ReportCanvas.tsx",
                                                                                    lineNumber: 1009,
                                                                                    columnNumber: 77
                                                                                }, ("TURBOPACK compile-time value", void 0)),
                                                                                isSelected && /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$next$2f$dist$2f$server$2f$route$2d$modules$2f$app$2d$page$2f$vendored$2f$ssr$2f$react$2d$jsx$2d$dev$2d$runtime$2e$js__$5b$app$2d$ssr$5d$__$28$ecmascript$29$__["jsxDEV"])("div", {
                                                                                    style: {
                                                                                        display: 'flex',
                                                                                        alignItems: 'center',
                                                                                        gap: '2px'
                                                                                    },
                                                                                    className: "jsx-d9c01daba222d1ca",
                                                                                    children: [
                                                                                        /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$next$2f$dist$2f$server$2f$route$2d$modules$2f$app$2d$page$2f$vendored$2f$ssr$2f$react$2d$jsx$2d$dev$2d$runtime$2e$js__$5b$app$2d$ssr$5d$__$28$ecmascript$29$__["jsxDEV"])("select", {
                                                                                            value: agg,
                                                                                            onChange: (e)=>{
                                                                                                const newAggs = {
                                                                                                    ...activeWidget.columnAggregations || {},
                                                                                                    [col.name]: e.target.value
                                                                                                };
                                                                                                updateWidget(activeWidget.id, {
                                                                                                    columnAggregations: newAggs
                                                                                                });
                                                                                            },
                                                                                            style: {
                                                                                                background: 'rgba(255,255,255,0.05)',
                                                                                                border: '1px solid var(--border)',
                                                                                                borderRadius: '4px',
                                                                                                fontSize: '0.65rem',
                                                                                                padding: '1px 2px',
                                                                                                color: 'var(--text-muted)',
                                                                                                cursor: 'pointer',
                                                                                                marginRight: '4px'
                                                                                            },
                                                                                            className: "jsx-d9c01daba222d1ca",
                                                                                            children: [
                                                                                                /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$next$2f$dist$2f$server$2f$route$2d$modules$2f$app$2d$page$2f$vendored$2f$ssr$2f$react$2d$jsx$2d$dev$2d$runtime$2e$js__$5b$app$2d$ssr$5d$__$28$ecmascript$29$__["jsxDEV"])("option", {
                                                                                                    value: "NONE",
                                                                                                    className: "jsx-d9c01daba222d1ca",
                                                                                                    children: "NONE"
                                                                                                }, void 0, false, {
                                                                                                    fileName: "[project]/src/components/canvas/ReportCanvas.tsx",
                                                                                                    lineNumber: 1047,
                                                                                                    columnNumber: 89
                                                                                                }, ("TURBOPACK compile-time value", void 0)),
                                                                                                /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$next$2f$dist$2f$server$2f$route$2d$modules$2f$app$2d$page$2f$vendored$2f$ssr$2f$react$2d$jsx$2d$dev$2d$runtime$2e$js__$5b$app$2d$ssr$5d$__$28$ecmascript$29$__["jsxDEV"])("option", {
                                                                                                    value: "SUM",
                                                                                                    className: "jsx-d9c01daba222d1ca",
                                                                                                    children: "SUM"
                                                                                                }, void 0, false, {
                                                                                                    fileName: "[project]/src/components/canvas/ReportCanvas.tsx",
                                                                                                    lineNumber: 1048,
                                                                                                    columnNumber: 89
                                                                                                }, ("TURBOPACK compile-time value", void 0)),
                                                                                                /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$next$2f$dist$2f$server$2f$route$2d$modules$2f$app$2d$page$2f$vendored$2f$ssr$2f$react$2d$jsx$2d$dev$2d$runtime$2e$js__$5b$app$2d$ssr$5d$__$28$ecmascript$29$__["jsxDEV"])("option", {
                                                                                                    value: "AVG",
                                                                                                    className: "jsx-d9c01daba222d1ca",
                                                                                                    children: "AVG"
                                                                                                }, void 0, false, {
                                                                                                    fileName: "[project]/src/components/canvas/ReportCanvas.tsx",
                                                                                                    lineNumber: 1049,
                                                                                                    columnNumber: 89
                                                                                                }, ("TURBOPACK compile-time value", void 0)),
                                                                                                /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$next$2f$dist$2f$server$2f$route$2d$modules$2f$app$2d$page$2f$vendored$2f$ssr$2f$react$2d$jsx$2d$dev$2d$runtime$2e$js__$5b$app$2d$ssr$5d$__$28$ecmascript$29$__["jsxDEV"])("option", {
                                                                                                    value: "COUNT",
                                                                                                    className: "jsx-d9c01daba222d1ca",
                                                                                                    children: "COUNT"
                                                                                                }, void 0, false, {
                                                                                                    fileName: "[project]/src/components/canvas/ReportCanvas.tsx",
                                                                                                    lineNumber: 1050,
                                                                                                    columnNumber: 89
                                                                                                }, ("TURBOPACK compile-time value", void 0)),
                                                                                                /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$next$2f$dist$2f$server$2f$route$2d$modules$2f$app$2d$page$2f$vendored$2f$ssr$2f$react$2d$jsx$2d$dev$2d$runtime$2e$js__$5b$app$2d$ssr$5d$__$28$ecmascript$29$__["jsxDEV"])("option", {
                                                                                                    value: "DISTINCT",
                                                                                                    className: "jsx-d9c01daba222d1ca",
                                                                                                    children: "DISTINCT"
                                                                                                }, void 0, false, {
                                                                                                    fileName: "[project]/src/components/canvas/ReportCanvas.tsx",
                                                                                                    lineNumber: 1051,
                                                                                                    columnNumber: 89
                                                                                                }, ("TURBOPACK compile-time value", void 0))
                                                                                            ]
                                                                                        }, void 0, true, {
                                                                                            fileName: "[project]/src/components/canvas/ReportCanvas.tsx",
                                                                                            lineNumber: 1030,
                                                                                            columnNumber: 85
                                                                                        }, ("TURBOPACK compile-time value", void 0)),
                                                                                        /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$next$2f$dist$2f$server$2f$route$2d$modules$2f$app$2d$page$2f$vendored$2f$ssr$2f$react$2d$jsx$2d$dev$2d$runtime$2e$js__$5b$app$2d$ssr$5d$__$28$ecmascript$29$__["jsxDEV"])("button", {
                                                                                            disabled: selIdx === 0,
                                                                                            onClick: ()=>{
                                                                                                const newCols = [
                                                                                                    ...selectedCols
                                                                                                ];
                                                                                                [newCols[selIdx], newCols[selIdx - 1]] = [
                                                                                                    newCols[selIdx - 1],
                                                                                                    newCols[selIdx]
                                                                                                ];
                                                                                                updateWidget(activeWidget.id, {
                                                                                                    columns: newCols
                                                                                                });
                                                                                            },
                                                                                            style: {
                                                                                                padding: '2px',
                                                                                                color: selIdx === 0 ? 'rgba(255,255,255,0.1)' : 'var(--text-muted)',
                                                                                                background: 'transparent',
                                                                                                border: 'none',
                                                                                                cursor: selIdx === 0 ? 'default' : 'pointer'
                                                                                            },
                                                                                            className: "jsx-d9c01daba222d1ca",
                                                                                            children: /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$next$2f$dist$2f$server$2f$route$2d$modules$2f$app$2d$page$2f$vendored$2f$ssr$2f$react$2d$jsx$2d$dev$2d$runtime$2e$js__$5b$app$2d$ssr$5d$__$28$ecmascript$29$__["jsxDEV"])(__TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$lucide$2d$react$2f$dist$2f$esm$2f$icons$2f$chevron$2d$up$2e$js__$5b$app$2d$ssr$5d$__$28$ecmascript$29$__$3c$export__default__as__ChevronUp$3e$__["ChevronUp"], {
                                                                                                size: 12
                                                                                            }, void 0, false, {
                                                                                                fileName: "[project]/src/components/canvas/ReportCanvas.tsx",
                                                                                                lineNumber: 1063,
                                                                                                columnNumber: 89
                                                                                            }, ("TURBOPACK compile-time value", void 0))
                                                                                        }, void 0, false, {
                                                                                            fileName: "[project]/src/components/canvas/ReportCanvas.tsx",
                                                                                            lineNumber: 1054,
                                                                                            columnNumber: 85
                                                                                        }, ("TURBOPACK compile-time value", void 0)),
                                                                                        /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$next$2f$dist$2f$server$2f$route$2d$modules$2f$app$2d$page$2f$vendored$2f$ssr$2f$react$2d$jsx$2d$dev$2d$runtime$2e$js__$5b$app$2d$ssr$5d$__$28$ecmascript$29$__["jsxDEV"])("button", {
                                                                                            disabled: selIdx === selectedCols.length - 1,
                                                                                            onClick: ()=>{
                                                                                                const newCols = [
                                                                                                    ...selectedCols
                                                                                                ];
                                                                                                [newCols[selIdx], newCols[selIdx + 1]] = [
                                                                                                    newCols[selIdx + 1],
                                                                                                    newCols[selIdx]
                                                                                                ];
                                                                                                updateWidget(activeWidget.id, {
                                                                                                    columns: newCols
                                                                                                });
                                                                                            },
                                                                                            style: {
                                                                                                padding: '2px',
                                                                                                color: selIdx === selectedCols.length - 1 ? 'rgba(255,255,255,0.1)' : 'var(--text-muted)',
                                                                                                background: 'transparent',
                                                                                                border: 'none',
                                                                                                cursor: selIdx === selectedCols.length - 1 ? 'default' : 'pointer'
                                                                                            },
                                                                                            className: "jsx-d9c01daba222d1ca",
                                                                                            children: /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$next$2f$dist$2f$server$2f$route$2d$modules$2f$app$2d$page$2f$vendored$2f$ssr$2f$react$2d$jsx$2d$dev$2d$runtime$2e$js__$5b$app$2d$ssr$5d$__$28$ecmascript$29$__["jsxDEV"])(__TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$lucide$2d$react$2f$dist$2f$esm$2f$icons$2f$chevron$2d$down$2e$js__$5b$app$2d$ssr$5d$__$28$ecmascript$29$__$3c$export__default__as__ChevronDown$3e$__["ChevronDown"], {
                                                                                                size: 12
                                                                                            }, void 0, false, {
                                                                                                fileName: "[project]/src/components/canvas/ReportCanvas.tsx",
                                                                                                lineNumber: 1074,
                                                                                                columnNumber: 89
                                                                                            }, ("TURBOPACK compile-time value", void 0))
                                                                                        }, void 0, false, {
                                                                                            fileName: "[project]/src/components/canvas/ReportCanvas.tsx",
                                                                                            lineNumber: 1065,
                                                                                            columnNumber: 85
                                                                                        }, ("TURBOPACK compile-time value", void 0))
                                                                                    ]
                                                                                }, void 0, true, {
                                                                                    fileName: "[project]/src/components/canvas/ReportCanvas.tsx",
                                                                                    lineNumber: 1028,
                                                                                    columnNumber: 81
                                                                                }, ("TURBOPACK compile-time value", void 0))
                                                                            ]
                                                                        }, col.name, true, {
                                                                            fileName: "[project]/src/components/canvas/ReportCanvas.tsx",
                                                                            lineNumber: 986,
                                                                            columnNumber: 73
                                                                        }, ("TURBOPACK compile-time value", void 0));
                                                                    });
                                                                })()
                                                            }, void 0, false, {
                                                                fileName: "[project]/src/components/canvas/ReportCanvas.tsx",
                                                                lineNumber: 963,
                                                                columnNumber: 57
                                                            }, ("TURBOPACK compile-time value", void 0))
                                                        ]
                                                    }, void 0, true, {
                                                        fileName: "[project]/src/components/canvas/ReportCanvas.tsx",
                                                        lineNumber: 961,
                                                        columnNumber: 53
                                                    }, ("TURBOPACK compile-time value", void 0)) : activeWidget.type === 'card' ? /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$next$2f$dist$2f$server$2f$route$2d$modules$2f$app$2d$page$2f$vendored$2f$ssr$2f$react$2d$jsx$2d$dev$2d$runtime$2e$js__$5b$app$2d$ssr$5d$__$28$ecmascript$29$__["jsxDEV"])(__TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$next$2f$dist$2f$server$2f$route$2d$modules$2f$app$2d$page$2f$vendored$2f$ssr$2f$react$2d$jsx$2d$dev$2d$runtime$2e$js__$5b$app$2d$ssr$5d$__$28$ecmascript$29$__["Fragment"], {
                                                        children: [
                                                            /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$next$2f$dist$2f$server$2f$route$2d$modules$2f$app$2d$page$2f$vendored$2f$ssr$2f$react$2d$jsx$2d$dev$2d$runtime$2e$js__$5b$app$2d$ssr$5d$__$28$ecmascript$29$__["jsxDEV"])("div", {
                                                                className: "jsx-d9c01daba222d1ca",
                                                                children: [
                                                                    /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$next$2f$dist$2f$server$2f$route$2d$modules$2f$app$2d$page$2f$vendored$2f$ssr$2f$react$2d$jsx$2d$dev$2d$runtime$2e$js__$5b$app$2d$ssr$5d$__$28$ecmascript$29$__["jsxDEV"])("label", {
                                                                        style: {
                                                                            fontSize: '0.75rem',
                                                                            color: 'var(--text-muted)',
                                                                            display: 'block',
                                                                            marginBottom: '4px'
                                                                        },
                                                                        className: "jsx-d9c01daba222d1ca",
                                                                        children: "Value Field"
                                                                    }, void 0, false, {
                                                                        fileName: "[project]/src/components/canvas/ReportCanvas.tsx",
                                                                        lineNumber: 1087,
                                                                        columnNumber: 61
                                                                    }, ("TURBOPACK compile-time value", void 0)),
                                                                    /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$next$2f$dist$2f$server$2f$route$2d$modules$2f$app$2d$page$2f$vendored$2f$ssr$2f$react$2d$jsx$2d$dev$2d$runtime$2e$js__$5b$app$2d$ssr$5d$__$28$ecmascript$29$__["jsxDEV"])("select", {
                                                                        value: activeWidget.yAxis,
                                                                        onChange: (e)=>updateWidget(activeWidget.id, {
                                                                                yAxis: e.target.value
                                                                            }),
                                                                        style: {
                                                                            width: '100%',
                                                                            padding: '8px',
                                                                            background: 'var(--surface)',
                                                                            border: '1px solid var(--border)',
                                                                            borderRadius: '6px',
                                                                            color: 'var(--foreground)',
                                                                            fontSize: '0.875rem'
                                                                        },
                                                                        className: "jsx-d9c01daba222d1ca",
                                                                        children: dataset.columns.map((col)=>/*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$next$2f$dist$2f$server$2f$route$2d$modules$2f$app$2d$page$2f$vendored$2f$ssr$2f$react$2d$jsx$2d$dev$2d$runtime$2e$js__$5b$app$2d$ssr$5d$__$28$ecmascript$29$__["jsxDEV"])("option", {
                                                                                value: col.name,
                                                                                className: "jsx-d9c01daba222d1ca",
                                                                                children: col.name
                                                                            }, col.name, false, {
                                                                                fileName: "[project]/src/components/canvas/ReportCanvas.tsx",
                                                                                lineNumber: 1093,
                                                                                columnNumber: 93
                                                                            }, ("TURBOPACK compile-time value", void 0)))
                                                                    }, void 0, false, {
                                                                        fileName: "[project]/src/components/canvas/ReportCanvas.tsx",
                                                                        lineNumber: 1088,
                                                                        columnNumber: 61
                                                                    }, ("TURBOPACK compile-time value", void 0))
                                                                ]
                                                            }, void 0, true, {
                                                                fileName: "[project]/src/components/canvas/ReportCanvas.tsx",
                                                                lineNumber: 1086,
                                                                columnNumber: 57
                                                            }, ("TURBOPACK compile-time value", void 0)),
                                                            /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$next$2f$dist$2f$server$2f$route$2d$modules$2f$app$2d$page$2f$vendored$2f$ssr$2f$react$2d$jsx$2d$dev$2d$runtime$2e$js__$5b$app$2d$ssr$5d$__$28$ecmascript$29$__["jsxDEV"])("div", {
                                                                className: "jsx-d9c01daba222d1ca",
                                                                children: [
                                                                    /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$next$2f$dist$2f$server$2f$route$2d$modules$2f$app$2d$page$2f$vendored$2f$ssr$2f$react$2d$jsx$2d$dev$2d$runtime$2e$js__$5b$app$2d$ssr$5d$__$28$ecmascript$29$__["jsxDEV"])("label", {
                                                                        style: {
                                                                            fontSize: '0.75rem',
                                                                            color: 'var(--text-muted)',
                                                                            display: 'block',
                                                                            marginBottom: '4px'
                                                                        },
                                                                        className: "jsx-d9c01daba222d1ca",
                                                                        children: "Aggregation"
                                                                    }, void 0, false, {
                                                                        fileName: "[project]/src/components/canvas/ReportCanvas.tsx",
                                                                        lineNumber: 1097,
                                                                        columnNumber: 61
                                                                    }, ("TURBOPACK compile-time value", void 0)),
                                                                    /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$next$2f$dist$2f$server$2f$route$2d$modules$2f$app$2d$page$2f$vendored$2f$ssr$2f$react$2d$jsx$2d$dev$2d$runtime$2e$js__$5b$app$2d$ssr$5d$__$28$ecmascript$29$__["jsxDEV"])("select", {
                                                                        value: activeWidget.aggregation || 'SUM',
                                                                        onChange: (e)=>updateWidget(activeWidget.id, {
                                                                                aggregation: e.target.value
                                                                            }),
                                                                        style: {
                                                                            width: '100%',
                                                                            padding: '8px',
                                                                            background: 'var(--surface)',
                                                                            border: '1px solid var(--border)',
                                                                            borderRadius: '6px',
                                                                            color: 'var(--foreground)',
                                                                            fontSize: '0.875rem'
                                                                        },
                                                                        className: "jsx-d9c01daba222d1ca",
                                                                        children: aggregations.filter((agg)=>agg !== 'NONE').map((agg)=>/*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$next$2f$dist$2f$server$2f$route$2d$modules$2f$app$2d$page$2f$vendored$2f$ssr$2f$react$2d$jsx$2d$dev$2d$runtime$2e$js__$5b$app$2d$ssr$5d$__$28$ecmascript$29$__["jsxDEV"])("option", {
                                                                                value: agg,
                                                                                className: "jsx-d9c01daba222d1ca",
                                                                                children: agg
                                                                            }, agg, false, {
                                                                                fileName: "[project]/src/components/canvas/ReportCanvas.tsx",
                                                                                lineNumber: 1103,
                                                                                columnNumber: 120
                                                                            }, ("TURBOPACK compile-time value", void 0)))
                                                                    }, void 0, false, {
                                                                        fileName: "[project]/src/components/canvas/ReportCanvas.tsx",
                                                                        lineNumber: 1098,
                                                                        columnNumber: 61
                                                                    }, ("TURBOPACK compile-time value", void 0))
                                                                ]
                                                            }, void 0, true, {
                                                                fileName: "[project]/src/components/canvas/ReportCanvas.tsx",
                                                                lineNumber: 1096,
                                                                columnNumber: 57
                                                            }, ("TURBOPACK compile-time value", void 0))
                                                        ]
                                                    }, void 0, true) : activeWidget.type === 'map' ? /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$next$2f$dist$2f$server$2f$route$2d$modules$2f$app$2d$page$2f$vendored$2f$ssr$2f$react$2d$jsx$2d$dev$2d$runtime$2e$js__$5b$app$2d$ssr$5d$__$28$ecmascript$29$__["jsxDEV"])(__TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$next$2f$dist$2f$server$2f$route$2d$modules$2f$app$2d$page$2f$vendored$2f$ssr$2f$react$2d$jsx$2d$dev$2d$runtime$2e$js__$5b$app$2d$ssr$5d$__$28$ecmascript$29$__["Fragment"], {
                                                        children: [
                                                            /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$next$2f$dist$2f$server$2f$route$2d$modules$2f$app$2d$page$2f$vendored$2f$ssr$2f$react$2d$jsx$2d$dev$2d$runtime$2e$js__$5b$app$2d$ssr$5d$__$28$ecmascript$29$__["jsxDEV"])("div", {
                                                                className: "jsx-d9c01daba222d1ca",
                                                                children: [
                                                                    /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$next$2f$dist$2f$server$2f$route$2d$modules$2f$app$2d$page$2f$vendored$2f$ssr$2f$react$2d$jsx$2d$dev$2d$runtime$2e$js__$5b$app$2d$ssr$5d$__$28$ecmascript$29$__["jsxDEV"])("label", {
                                                                        style: {
                                                                            fontSize: '0.75rem',
                                                                            color: 'var(--text-muted)',
                                                                            display: 'block',
                                                                            marginBottom: '4px'
                                                                        },
                                                                        className: "jsx-d9c01daba222d1ca",
                                                                        children: "Label"
                                                                    }, void 0, false, {
                                                                        fileName: "[project]/src/components/canvas/ReportCanvas.tsx",
                                                                        lineNumber: 1110,
                                                                        columnNumber: 61
                                                                    }, ("TURBOPACK compile-time value", void 0)),
                                                                    /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$next$2f$dist$2f$server$2f$route$2d$modules$2f$app$2d$page$2f$vendored$2f$ssr$2f$react$2d$jsx$2d$dev$2d$runtime$2e$js__$5b$app$2d$ssr$5d$__$28$ecmascript$29$__["jsxDEV"])("select", {
                                                                        value: activeWidget.xAxis,
                                                                        onChange: (e)=>updateWidget(activeWidget.id, {
                                                                                xAxis: e.target.value
                                                                            }),
                                                                        style: {
                                                                            width: '100%',
                                                                            padding: '8px',
                                                                            background: 'var(--surface)',
                                                                            border: '1px solid var(--border)',
                                                                            borderRadius: '6px',
                                                                            color: 'var(--foreground)',
                                                                            fontSize: '0.875rem'
                                                                        },
                                                                        className: "jsx-d9c01daba222d1ca",
                                                                        children: dataset.columns.map((col)=>/*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$next$2f$dist$2f$server$2f$route$2d$modules$2f$app$2d$page$2f$vendored$2f$ssr$2f$react$2d$jsx$2d$dev$2d$runtime$2e$js__$5b$app$2d$ssr$5d$__$28$ecmascript$29$__["jsxDEV"])("option", {
                                                                                value: col.name,
                                                                                className: "jsx-d9c01daba222d1ca",
                                                                                children: col.name
                                                                            }, col.name, false, {
                                                                                fileName: "[project]/src/components/canvas/ReportCanvas.tsx",
                                                                                lineNumber: 1116,
                                                                                columnNumber: 93
                                                                            }, ("TURBOPACK compile-time value", void 0)))
                                                                    }, void 0, false, {
                                                                        fileName: "[project]/src/components/canvas/ReportCanvas.tsx",
                                                                        lineNumber: 1111,
                                                                        columnNumber: 61
                                                                    }, ("TURBOPACK compile-time value", void 0))
                                                                ]
                                                            }, void 0, true, {
                                                                fileName: "[project]/src/components/canvas/ReportCanvas.tsx",
                                                                lineNumber: 1109,
                                                                columnNumber: 57
                                                            }, ("TURBOPACK compile-time value", void 0)),
                                                            /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$next$2f$dist$2f$server$2f$route$2d$modules$2f$app$2d$page$2f$vendored$2f$ssr$2f$react$2d$jsx$2d$dev$2d$runtime$2e$js__$5b$app$2d$ssr$5d$__$28$ecmascript$29$__["jsxDEV"])("div", {
                                                                style: {
                                                                    display: 'grid',
                                                                    gridTemplateColumns: '1fr 1fr',
                                                                    gap: '8px'
                                                                },
                                                                className: "jsx-d9c01daba222d1ca",
                                                                children: [
                                                                    /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$next$2f$dist$2f$server$2f$route$2d$modules$2f$app$2d$page$2f$vendored$2f$ssr$2f$react$2d$jsx$2d$dev$2d$runtime$2e$js__$5b$app$2d$ssr$5d$__$28$ecmascript$29$__["jsxDEV"])("div", {
                                                                        className: "jsx-d9c01daba222d1ca",
                                                                        children: [
                                                                            /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$next$2f$dist$2f$server$2f$route$2d$modules$2f$app$2d$page$2f$vendored$2f$ssr$2f$react$2d$jsx$2d$dev$2d$runtime$2e$js__$5b$app$2d$ssr$5d$__$28$ecmascript$29$__["jsxDEV"])("label", {
                                                                                style: {
                                                                                    fontSize: '0.75rem',
                                                                                    color: 'var(--text-muted)',
                                                                                    display: 'block',
                                                                                    marginBottom: '4px'
                                                                                },
                                                                                className: "jsx-d9c01daba222d1ca",
                                                                                children: "Latitude"
                                                                            }, void 0, false, {
                                                                                fileName: "[project]/src/components/canvas/ReportCanvas.tsx",
                                                                                lineNumber: 1121,
                                                                                columnNumber: 65
                                                                            }, ("TURBOPACK compile-time value", void 0)),
                                                                            /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$next$2f$dist$2f$server$2f$route$2d$modules$2f$app$2d$page$2f$vendored$2f$ssr$2f$react$2d$jsx$2d$dev$2d$runtime$2e$js__$5b$app$2d$ssr$5d$__$28$ecmascript$29$__["jsxDEV"])("select", {
                                                                                value: activeWidget.latitudeField || '',
                                                                                onChange: (e)=>updateWidget(activeWidget.id, {
                                                                                        latitudeField: e.target.value
                                                                                    }),
                                                                                style: {
                                                                                    width: '100%',
                                                                                    padding: '8px',
                                                                                    background: 'var(--surface)',
                                                                                    border: '1px solid var(--border)',
                                                                                    borderRadius: '6px',
                                                                                    color: 'var(--foreground)',
                                                                                    fontSize: '0.875rem'
                                                                                },
                                                                                className: "jsx-d9c01daba222d1ca",
                                                                                children: dataset.columns.map((col)=>/*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$next$2f$dist$2f$server$2f$route$2d$modules$2f$app$2d$page$2f$vendored$2f$ssr$2f$react$2d$jsx$2d$dev$2d$runtime$2e$js__$5b$app$2d$ssr$5d$__$28$ecmascript$29$__["jsxDEV"])("option", {
                                                                                        value: col.name,
                                                                                        className: "jsx-d9c01daba222d1ca",
                                                                                        children: col.name
                                                                                    }, col.name, false, {
                                                                                        fileName: "[project]/src/components/canvas/ReportCanvas.tsx",
                                                                                        lineNumber: 1127,
                                                                                        columnNumber: 97
                                                                                    }, ("TURBOPACK compile-time value", void 0)))
                                                                            }, void 0, false, {
                                                                                fileName: "[project]/src/components/canvas/ReportCanvas.tsx",
                                                                                lineNumber: 1122,
                                                                                columnNumber: 65
                                                                            }, ("TURBOPACK compile-time value", void 0))
                                                                        ]
                                                                    }, void 0, true, {
                                                                        fileName: "[project]/src/components/canvas/ReportCanvas.tsx",
                                                                        lineNumber: 1120,
                                                                        columnNumber: 61
                                                                    }, ("TURBOPACK compile-time value", void 0)),
                                                                    /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$next$2f$dist$2f$server$2f$route$2d$modules$2f$app$2d$page$2f$vendored$2f$ssr$2f$react$2d$jsx$2d$dev$2d$runtime$2e$js__$5b$app$2d$ssr$5d$__$28$ecmascript$29$__["jsxDEV"])("div", {
                                                                        className: "jsx-d9c01daba222d1ca",
                                                                        children: [
                                                                            /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$next$2f$dist$2f$server$2f$route$2d$modules$2f$app$2d$page$2f$vendored$2f$ssr$2f$react$2d$jsx$2d$dev$2d$runtime$2e$js__$5b$app$2d$ssr$5d$__$28$ecmascript$29$__["jsxDEV"])("label", {
                                                                                style: {
                                                                                    fontSize: '0.75rem',
                                                                                    color: 'var(--text-muted)',
                                                                                    display: 'block',
                                                                                    marginBottom: '4px'
                                                                                },
                                                                                className: "jsx-d9c01daba222d1ca",
                                                                                children: "Longitude"
                                                                            }, void 0, false, {
                                                                                fileName: "[project]/src/components/canvas/ReportCanvas.tsx",
                                                                                lineNumber: 1131,
                                                                                columnNumber: 65
                                                                            }, ("TURBOPACK compile-time value", void 0)),
                                                                            /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$next$2f$dist$2f$server$2f$route$2d$modules$2f$app$2d$page$2f$vendored$2f$ssr$2f$react$2d$jsx$2d$dev$2d$runtime$2e$js__$5b$app$2d$ssr$5d$__$28$ecmascript$29$__["jsxDEV"])("select", {
                                                                                value: activeWidget.longitudeField || '',
                                                                                onChange: (e)=>updateWidget(activeWidget.id, {
                                                                                        longitudeField: e.target.value
                                                                                    }),
                                                                                style: {
                                                                                    width: '100%',
                                                                                    padding: '8px',
                                                                                    background: 'var(--surface)',
                                                                                    border: '1px solid var(--border)',
                                                                                    borderRadius: '6px',
                                                                                    color: 'var(--foreground)',
                                                                                    fontSize: '0.875rem'
                                                                                },
                                                                                className: "jsx-d9c01daba222d1ca",
                                                                                children: dataset.columns.map((col)=>/*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$next$2f$dist$2f$server$2f$route$2d$modules$2f$app$2d$page$2f$vendored$2f$ssr$2f$react$2d$jsx$2d$dev$2d$runtime$2e$js__$5b$app$2d$ssr$5d$__$28$ecmascript$29$__["jsxDEV"])("option", {
                                                                                        value: col.name,
                                                                                        className: "jsx-d9c01daba222d1ca",
                                                                                        children: col.name
                                                                                    }, col.name, false, {
                                                                                        fileName: "[project]/src/components/canvas/ReportCanvas.tsx",
                                                                                        lineNumber: 1137,
                                                                                        columnNumber: 97
                                                                                    }, ("TURBOPACK compile-time value", void 0)))
                                                                            }, void 0, false, {
                                                                                fileName: "[project]/src/components/canvas/ReportCanvas.tsx",
                                                                                lineNumber: 1132,
                                                                                columnNumber: 65
                                                                            }, ("TURBOPACK compile-time value", void 0))
                                                                        ]
                                                                    }, void 0, true, {
                                                                        fileName: "[project]/src/components/canvas/ReportCanvas.tsx",
                                                                        lineNumber: 1130,
                                                                        columnNumber: 61
                                                                    }, ("TURBOPACK compile-time value", void 0))
                                                                ]
                                                            }, void 0, true, {
                                                                fileName: "[project]/src/components/canvas/ReportCanvas.tsx",
                                                                lineNumber: 1119,
                                                                columnNumber: 57
                                                            }, ("TURBOPACK compile-time value", void 0)),
                                                            /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$next$2f$dist$2f$server$2f$route$2d$modules$2f$app$2d$page$2f$vendored$2f$ssr$2f$react$2d$jsx$2d$dev$2d$runtime$2e$js__$5b$app$2d$ssr$5d$__$28$ecmascript$29$__["jsxDEV"])("div", {
                                                                className: "jsx-d9c01daba222d1ca",
                                                                children: [
                                                                    /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$next$2f$dist$2f$server$2f$route$2d$modules$2f$app$2d$page$2f$vendored$2f$ssr$2f$react$2d$jsx$2d$dev$2d$runtime$2e$js__$5b$app$2d$ssr$5d$__$28$ecmascript$29$__["jsxDEV"])("label", {
                                                                        style: {
                                                                            fontSize: '0.75rem',
                                                                            color: 'var(--text-muted)',
                                                                            display: 'block',
                                                                            marginBottom: '4px'
                                                                        },
                                                                        className: "jsx-d9c01daba222d1ca",
                                                                        children: "Value"
                                                                    }, void 0, false, {
                                                                        fileName: "[project]/src/components/canvas/ReportCanvas.tsx",
                                                                        lineNumber: 1142,
                                                                        columnNumber: 61
                                                                    }, ("TURBOPACK compile-time value", void 0)),
                                                                    /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$next$2f$dist$2f$server$2f$route$2d$modules$2f$app$2d$page$2f$vendored$2f$ssr$2f$react$2d$jsx$2d$dev$2d$runtime$2e$js__$5b$app$2d$ssr$5d$__$28$ecmascript$29$__["jsxDEV"])("select", {
                                                                        value: activeWidget.yAxis,
                                                                        onChange: (e)=>updateWidget(activeWidget.id, {
                                                                                yAxis: e.target.value
                                                                            }),
                                                                        style: {
                                                                            width: '100%',
                                                                            padding: '8px',
                                                                            background: 'var(--surface)',
                                                                            border: '1px solid var(--border)',
                                                                            borderRadius: '6px',
                                                                            color: 'var(--foreground)',
                                                                            fontSize: '0.875rem'
                                                                        },
                                                                        className: "jsx-d9c01daba222d1ca",
                                                                        children: dataset.columns.map((col)=>/*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$next$2f$dist$2f$server$2f$route$2d$modules$2f$app$2d$page$2f$vendored$2f$ssr$2f$react$2d$jsx$2d$dev$2d$runtime$2e$js__$5b$app$2d$ssr$5d$__$28$ecmascript$29$__["jsxDEV"])("option", {
                                                                                value: col.name,
                                                                                className: "jsx-d9c01daba222d1ca",
                                                                                children: col.name
                                                                            }, col.name, false, {
                                                                                fileName: "[project]/src/components/canvas/ReportCanvas.tsx",
                                                                                lineNumber: 1148,
                                                                                columnNumber: 93
                                                                            }, ("TURBOPACK compile-time value", void 0)))
                                                                    }, void 0, false, {
                                                                        fileName: "[project]/src/components/canvas/ReportCanvas.tsx",
                                                                        lineNumber: 1143,
                                                                        columnNumber: 61
                                                                    }, ("TURBOPACK compile-time value", void 0))
                                                                ]
                                                            }, void 0, true, {
                                                                fileName: "[project]/src/components/canvas/ReportCanvas.tsx",
                                                                lineNumber: 1141,
                                                                columnNumber: 57
                                                            }, ("TURBOPACK compile-time value", void 0)),
                                                            /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$next$2f$dist$2f$server$2f$route$2d$modules$2f$app$2d$page$2f$vendored$2f$ssr$2f$react$2d$jsx$2d$dev$2d$runtime$2e$js__$5b$app$2d$ssr$5d$__$28$ecmascript$29$__["jsxDEV"])("div", {
                                                                style: {
                                                                    display: 'grid',
                                                                    gridTemplateColumns: '1fr 1fr',
                                                                    gap: '8px'
                                                                },
                                                                className: "jsx-d9c01daba222d1ca",
                                                                children: [
                                                                    /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$next$2f$dist$2f$server$2f$route$2d$modules$2f$app$2d$page$2f$vendored$2f$ssr$2f$react$2d$jsx$2d$dev$2d$runtime$2e$js__$5b$app$2d$ssr$5d$__$28$ecmascript$29$__["jsxDEV"])("div", {
                                                                        className: "jsx-d9c01daba222d1ca",
                                                                        children: [
                                                                            /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$next$2f$dist$2f$server$2f$route$2d$modules$2f$app$2d$page$2f$vendored$2f$ssr$2f$react$2d$jsx$2d$dev$2d$runtime$2e$js__$5b$app$2d$ssr$5d$__$28$ecmascript$29$__["jsxDEV"])("label", {
                                                                                style: {
                                                                                    fontSize: '0.75rem',
                                                                                    color: 'var(--text-muted)',
                                                                                    display: 'block',
                                                                                    marginBottom: '4px'
                                                                                },
                                                                                className: "jsx-d9c01daba222d1ca",
                                                                                children: "Aggregation"
                                                                            }, void 0, false, {
                                                                                fileName: "[project]/src/components/canvas/ReportCanvas.tsx",
                                                                                lineNumber: 1153,
                                                                                columnNumber: 65
                                                                            }, ("TURBOPACK compile-time value", void 0)),
                                                                            /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$next$2f$dist$2f$server$2f$route$2d$modules$2f$app$2d$page$2f$vendored$2f$ssr$2f$react$2d$jsx$2d$dev$2d$runtime$2e$js__$5b$app$2d$ssr$5d$__$28$ecmascript$29$__["jsxDEV"])("select", {
                                                                                value: activeWidget.aggregation || 'SUM',
                                                                                onChange: (e)=>updateWidget(activeWidget.id, {
                                                                                        aggregation: e.target.value
                                                                                    }),
                                                                                style: {
                                                                                    width: '100%',
                                                                                    padding: '8px',
                                                                                    background: 'var(--surface)',
                                                                                    border: '1px solid var(--border)',
                                                                                    borderRadius: '6px',
                                                                                    color: 'var(--foreground)',
                                                                                    fontSize: '0.875rem'
                                                                                },
                                                                                className: "jsx-d9c01daba222d1ca",
                                                                                children: aggregations.map((agg)=>/*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$next$2f$dist$2f$server$2f$route$2d$modules$2f$app$2d$page$2f$vendored$2f$ssr$2f$react$2d$jsx$2d$dev$2d$runtime$2e$js__$5b$app$2d$ssr$5d$__$28$ecmascript$29$__["jsxDEV"])("option", {
                                                                                        value: agg,
                                                                                        className: "jsx-d9c01daba222d1ca",
                                                                                        children: agg
                                                                                    }, agg, false, {
                                                                                        fileName: "[project]/src/components/canvas/ReportCanvas.tsx",
                                                                                        lineNumber: 1159,
                                                                                        columnNumber: 94
                                                                                    }, ("TURBOPACK compile-time value", void 0)))
                                                                            }, void 0, false, {
                                                                                fileName: "[project]/src/components/canvas/ReportCanvas.tsx",
                                                                                lineNumber: 1154,
                                                                                columnNumber: 65
                                                                            }, ("TURBOPACK compile-time value", void 0))
                                                                        ]
                                                                    }, void 0, true, {
                                                                        fileName: "[project]/src/components/canvas/ReportCanvas.tsx",
                                                                        lineNumber: 1152,
                                                                        columnNumber: 61
                                                                    }, ("TURBOPACK compile-time value", void 0)),
                                                                    /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$next$2f$dist$2f$server$2f$route$2d$modules$2f$app$2d$page$2f$vendored$2f$ssr$2f$react$2d$jsx$2d$dev$2d$runtime$2e$js__$5b$app$2d$ssr$5d$__$28$ecmascript$29$__["jsxDEV"])("div", {
                                                                        className: "jsx-d9c01daba222d1ca",
                                                                        children: [
                                                                            /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$next$2f$dist$2f$server$2f$route$2d$modules$2f$app$2d$page$2f$vendored$2f$ssr$2f$react$2d$jsx$2d$dev$2d$runtime$2e$js__$5b$app$2d$ssr$5d$__$28$ecmascript$29$__["jsxDEV"])("label", {
                                                                                style: {
                                                                                    fontSize: '0.75rem',
                                                                                    color: 'var(--text-muted)',
                                                                                    display: 'block',
                                                                                    marginBottom: '4px'
                                                                                },
                                                                                className: "jsx-d9c01daba222d1ca",
                                                                                children: "Top N"
                                                                            }, void 0, false, {
                                                                                fileName: "[project]/src/components/canvas/ReportCanvas.tsx",
                                                                                lineNumber: 1163,
                                                                                columnNumber: 65
                                                                            }, ("TURBOPACK compile-time value", void 0)),
                                                                            /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$next$2f$dist$2f$server$2f$route$2d$modules$2f$app$2d$page$2f$vendored$2f$ssr$2f$react$2d$jsx$2d$dev$2d$runtime$2e$js__$5b$app$2d$ssr$5d$__$28$ecmascript$29$__["jsxDEV"])("input", {
                                                                                type: "number",
                                                                                value: activeWidget.topN || '',
                                                                                placeholder: "500",
                                                                                onChange: (e)=>updateWidget(activeWidget.id, {
                                                                                        topN: e.target.value ? parseInt(e.target.value) : undefined
                                                                                    }),
                                                                                style: {
                                                                                    width: '100%',
                                                                                    padding: '8px',
                                                                                    background: 'var(--surface)',
                                                                                    border: '1px solid var(--border)',
                                                                                    borderRadius: '6px',
                                                                                    color: 'var(--foreground)',
                                                                                    fontSize: '0.875rem'
                                                                                },
                                                                                className: "jsx-d9c01daba222d1ca"
                                                                            }, void 0, false, {
                                                                                fileName: "[project]/src/components/canvas/ReportCanvas.tsx",
                                                                                lineNumber: 1164,
                                                                                columnNumber: 65
                                                                            }, ("TURBOPACK compile-time value", void 0))
                                                                        ]
                                                                    }, void 0, true, {
                                                                        fileName: "[project]/src/components/canvas/ReportCanvas.tsx",
                                                                        lineNumber: 1162,
                                                                        columnNumber: 61
                                                                    }, ("TURBOPACK compile-time value", void 0))
                                                                ]
                                                            }, void 0, true, {
                                                                fileName: "[project]/src/components/canvas/ReportCanvas.tsx",
                                                                lineNumber: 1151,
                                                                columnNumber: 57
                                                            }, ("TURBOPACK compile-time value", void 0))
                                                        ]
                                                    }, void 0, true) : /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$next$2f$dist$2f$server$2f$route$2d$modules$2f$app$2d$page$2f$vendored$2f$ssr$2f$react$2d$jsx$2d$dev$2d$runtime$2e$js__$5b$app$2d$ssr$5d$__$28$ecmascript$29$__["jsxDEV"])(__TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$next$2f$dist$2f$server$2f$route$2d$modules$2f$app$2d$page$2f$vendored$2f$ssr$2f$react$2d$jsx$2d$dev$2d$runtime$2e$js__$5b$app$2d$ssr$5d$__$28$ecmascript$29$__["Fragment"], {
                                                        children: [
                                                            /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$next$2f$dist$2f$server$2f$route$2d$modules$2f$app$2d$page$2f$vendored$2f$ssr$2f$react$2d$jsx$2d$dev$2d$runtime$2e$js__$5b$app$2d$ssr$5d$__$28$ecmascript$29$__["jsxDEV"])("div", {
                                                                className: "jsx-d9c01daba222d1ca",
                                                                children: [
                                                                    /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$next$2f$dist$2f$server$2f$route$2d$modules$2f$app$2d$page$2f$vendored$2f$ssr$2f$react$2d$jsx$2d$dev$2d$runtime$2e$js__$5b$app$2d$ssr$5d$__$28$ecmascript$29$__["jsxDEV"])("label", {
                                                                        style: {
                                                                            fontSize: '0.75rem',
                                                                            color: 'var(--text-muted)',
                                                                            display: 'block',
                                                                            marginBottom: '4px'
                                                                        },
                                                                        className: "jsx-d9c01daba222d1ca",
                                                                        children: "X-Axis (Dimensión)"
                                                                    }, void 0, false, {
                                                                        fileName: "[project]/src/components/canvas/ReportCanvas.tsx",
                                                                        lineNumber: 1177,
                                                                        columnNumber: 61
                                                                    }, ("TURBOPACK compile-time value", void 0)),
                                                                    /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$next$2f$dist$2f$server$2f$route$2d$modules$2f$app$2d$page$2f$vendored$2f$ssr$2f$react$2d$jsx$2d$dev$2d$runtime$2e$js__$5b$app$2d$ssr$5d$__$28$ecmascript$29$__["jsxDEV"])("select", {
                                                                        value: activeWidget.xAxis,
                                                                        onChange: (e)=>updateWidget(activeWidget.id, {
                                                                                xAxis: e.target.value
                                                                            }),
                                                                        style: {
                                                                            width: '100%',
                                                                            padding: '8px',
                                                                            background: 'var(--surface)',
                                                                            border: '1px solid var(--border)',
                                                                            borderRadius: '6px',
                                                                            color: 'var(--foreground)',
                                                                            fontSize: '0.875rem'
                                                                        },
                                                                        className: "jsx-d9c01daba222d1ca",
                                                                        children: dataset.columns.map((col)=>/*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$next$2f$dist$2f$server$2f$route$2d$modules$2f$app$2d$page$2f$vendored$2f$ssr$2f$react$2d$jsx$2d$dev$2d$runtime$2e$js__$5b$app$2d$ssr$5d$__$28$ecmascript$29$__["jsxDEV"])("option", {
                                                                                value: col.name,
                                                                                className: "jsx-d9c01daba222d1ca",
                                                                                children: col.name
                                                                            }, col.name, false, {
                                                                                fileName: "[project]/src/components/canvas/ReportCanvas.tsx",
                                                                                lineNumber: 1183,
                                                                                columnNumber: 93
                                                                            }, ("TURBOPACK compile-time value", void 0)))
                                                                    }, void 0, false, {
                                                                        fileName: "[project]/src/components/canvas/ReportCanvas.tsx",
                                                                        lineNumber: 1178,
                                                                        columnNumber: 61
                                                                    }, ("TURBOPACK compile-time value", void 0))
                                                                ]
                                                            }, void 0, true, {
                                                                fileName: "[project]/src/components/canvas/ReportCanvas.tsx",
                                                                lineNumber: 1176,
                                                                columnNumber: 57
                                                            }, ("TURBOPACK compile-time value", void 0)),
                                                            /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$next$2f$dist$2f$server$2f$route$2d$modules$2f$app$2d$page$2f$vendored$2f$ssr$2f$react$2d$jsx$2d$dev$2d$runtime$2e$js__$5b$app$2d$ssr$5d$__$28$ecmascript$29$__["jsxDEV"])("div", {
                                                                className: "jsx-d9c01daba222d1ca",
                                                                children: [
                                                                    /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$next$2f$dist$2f$server$2f$route$2d$modules$2f$app$2d$page$2f$vendored$2f$ssr$2f$react$2d$jsx$2d$dev$2d$runtime$2e$js__$5b$app$2d$ssr$5d$__$28$ecmascript$29$__["jsxDEV"])("label", {
                                                                        style: {
                                                                            fontSize: '0.75rem',
                                                                            color: 'var(--text-muted)',
                                                                            display: 'block',
                                                                            marginBottom: '4px'
                                                                        },
                                                                        className: "jsx-d9c01daba222d1ca",
                                                                        children: [
                                                                            "Y-Axis (",
                                                                            activeWidget.type === 'treemap' ? 'Dimensión 2' : 'Value',
                                                                            ")"
                                                                        ]
                                                                    }, void 0, true, {
                                                                        fileName: "[project]/src/components/canvas/ReportCanvas.tsx",
                                                                        lineNumber: 1187,
                                                                        columnNumber: 61
                                                                    }, ("TURBOPACK compile-time value", void 0)),
                                                                    /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$next$2f$dist$2f$server$2f$route$2d$modules$2f$app$2d$page$2f$vendored$2f$ssr$2f$react$2d$jsx$2d$dev$2d$runtime$2e$js__$5b$app$2d$ssr$5d$__$28$ecmascript$29$__["jsxDEV"])("select", {
                                                                        value: activeWidget.yAxis,
                                                                        onChange: (e)=>updateWidget(activeWidget.id, {
                                                                                yAxis: e.target.value
                                                                            }),
                                                                        style: {
                                                                            width: '100%',
                                                                            padding: '8px',
                                                                            background: 'var(--surface)',
                                                                            border: '1px solid var(--border)',
                                                                            borderRadius: '6px',
                                                                            color: 'var(--foreground)',
                                                                            fontSize: '0.875rem'
                                                                        },
                                                                        className: "jsx-d9c01daba222d1ca",
                                                                        children: dataset.columns.map((col)=>/*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$next$2f$dist$2f$server$2f$route$2d$modules$2f$app$2d$page$2f$vendored$2f$ssr$2f$react$2d$jsx$2d$dev$2d$runtime$2e$js__$5b$app$2d$ssr$5d$__$28$ecmascript$29$__["jsxDEV"])("option", {
                                                                                value: col.name,
                                                                                className: "jsx-d9c01daba222d1ca",
                                                                                children: col.name
                                                                            }, col.name, false, {
                                                                                fileName: "[project]/src/components/canvas/ReportCanvas.tsx",
                                                                                lineNumber: 1193,
                                                                                columnNumber: 93
                                                                            }, ("TURBOPACK compile-time value", void 0)))
                                                                    }, void 0, false, {
                                                                        fileName: "[project]/src/components/canvas/ReportCanvas.tsx",
                                                                        lineNumber: 1188,
                                                                        columnNumber: 61
                                                                    }, ("TURBOPACK compile-time value", void 0))
                                                                ]
                                                            }, void 0, true, {
                                                                fileName: "[project]/src/components/canvas/ReportCanvas.tsx",
                                                                lineNumber: 1186,
                                                                columnNumber: 57
                                                            }, ("TURBOPACK compile-time value", void 0)),
                                                            activeWidget.type !== 'treemap' && /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$next$2f$dist$2f$server$2f$route$2d$modules$2f$app$2d$page$2f$vendored$2f$ssr$2f$react$2d$jsx$2d$dev$2d$runtime$2e$js__$5b$app$2d$ssr$5d$__$28$ecmascript$29$__["jsxDEV"])("div", {
                                                                className: "jsx-d9c01daba222d1ca",
                                                                children: [
                                                                    /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$next$2f$dist$2f$server$2f$route$2d$modules$2f$app$2d$page$2f$vendored$2f$ssr$2f$react$2d$jsx$2d$dev$2d$runtime$2e$js__$5b$app$2d$ssr$5d$__$28$ecmascript$29$__["jsxDEV"])("label", {
                                                                        style: {
                                                                            fontSize: '0.75rem',
                                                                            color: 'var(--text-muted)',
                                                                            display: 'block',
                                                                            marginBottom: '4px'
                                                                        },
                                                                        className: "jsx-d9c01daba222d1ca",
                                                                        children: "Aggregation"
                                                                    }, void 0, false, {
                                                                        fileName: "[project]/src/components/canvas/ReportCanvas.tsx",
                                                                        lineNumber: 1198,
                                                                        columnNumber: 65
                                                                    }, ("TURBOPACK compile-time value", void 0)),
                                                                    /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$next$2f$dist$2f$server$2f$route$2d$modules$2f$app$2d$page$2f$vendored$2f$ssr$2f$react$2d$jsx$2d$dev$2d$runtime$2e$js__$5b$app$2d$ssr$5d$__$28$ecmascript$29$__["jsxDEV"])("select", {
                                                                        value: activeWidget.aggregation || 'NONE',
                                                                        onChange: (e)=>updateWidget(activeWidget.id, {
                                                                                aggregation: e.target.value
                                                                            }),
                                                                        style: {
                                                                            width: '100%',
                                                                            padding: '8px',
                                                                            background: 'var(--surface)',
                                                                            border: '1px solid var(--border)',
                                                                            borderRadius: '6px',
                                                                            color: 'var(--foreground)',
                                                                            fontSize: '0.875rem'
                                                                        },
                                                                        className: "jsx-d9c01daba222d1ca",
                                                                        children: aggregations.map((agg)=>/*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$next$2f$dist$2f$server$2f$route$2d$modules$2f$app$2d$page$2f$vendored$2f$ssr$2f$react$2d$jsx$2d$dev$2d$runtime$2e$js__$5b$app$2d$ssr$5d$__$28$ecmascript$29$__["jsxDEV"])("option", {
                                                                                value: agg,
                                                                                className: "jsx-d9c01daba222d1ca",
                                                                                children: agg
                                                                            }, agg, false, {
                                                                                fileName: "[project]/src/components/canvas/ReportCanvas.tsx",
                                                                                lineNumber: 1204,
                                                                                columnNumber: 94
                                                                            }, ("TURBOPACK compile-time value", void 0)))
                                                                    }, void 0, false, {
                                                                        fileName: "[project]/src/components/canvas/ReportCanvas.tsx",
                                                                        lineNumber: 1199,
                                                                        columnNumber: 65
                                                                    }, ("TURBOPACK compile-time value", void 0))
                                                                ]
                                                            }, void 0, true, {
                                                                fileName: "[project]/src/components/canvas/ReportCanvas.tsx",
                                                                lineNumber: 1197,
                                                                columnNumber: 61
                                                            }, ("TURBOPACK compile-time value", void 0)),
                                                            /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$next$2f$dist$2f$server$2f$route$2d$modules$2f$app$2d$page$2f$vendored$2f$ssr$2f$react$2d$jsx$2d$dev$2d$runtime$2e$js__$5b$app$2d$ssr$5d$__$28$ecmascript$29$__["jsxDEV"])("div", {
                                                                style: {
                                                                    display: 'grid',
                                                                    gridTemplateColumns: '1fr 1fr',
                                                                    gap: '8px'
                                                                },
                                                                className: "jsx-d9c01daba222d1ca",
                                                                children: [
                                                                    /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$next$2f$dist$2f$server$2f$route$2d$modules$2f$app$2d$page$2f$vendored$2f$ssr$2f$react$2d$jsx$2d$dev$2d$runtime$2e$js__$5b$app$2d$ssr$5d$__$28$ecmascript$29$__["jsxDEV"])("div", {
                                                                        className: "jsx-d9c01daba222d1ca",
                                                                        children: [
                                                                            /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$next$2f$dist$2f$server$2f$route$2d$modules$2f$app$2d$page$2f$vendored$2f$ssr$2f$react$2d$jsx$2d$dev$2d$runtime$2e$js__$5b$app$2d$ssr$5d$__$28$ecmascript$29$__["jsxDEV"])("label", {
                                                                                style: {
                                                                                    fontSize: '0.75rem',
                                                                                    color: 'var(--text-muted)',
                                                                                    display: 'block',
                                                                                    marginBottom: '4px'
                                                                                },
                                                                                className: "jsx-d9c01daba222d1ca",
                                                                                children: "Order"
                                                                            }, void 0, false, {
                                                                                fileName: "[project]/src/components/canvas/ReportCanvas.tsx",
                                                                                lineNumber: 1210,
                                                                                columnNumber: 65
                                                                            }, ("TURBOPACK compile-time value", void 0)),
                                                                            /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$next$2f$dist$2f$server$2f$route$2d$modules$2f$app$2d$page$2f$vendored$2f$ssr$2f$react$2d$jsx$2d$dev$2d$runtime$2e$js__$5b$app$2d$ssr$5d$__$28$ecmascript$29$__["jsxDEV"])("select", {
                                                                                value: activeWidget.orderBy || '',
                                                                                onChange: (e)=>updateWidget(activeWidget.id, {
                                                                                        orderBy: e.target.value || undefined
                                                                                    }),
                                                                                style: {
                                                                                    width: '100%',
                                                                                    padding: '8px',
                                                                                    background: 'var(--surface)',
                                                                                    border: '1px solid var(--border)',
                                                                                    borderRadius: '6px',
                                                                                    color: 'var(--foreground)',
                                                                                    fontSize: '0.875rem'
                                                                                },
                                                                                className: "jsx-d9c01daba222d1ca",
                                                                                children: [
                                                                                    /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$next$2f$dist$2f$server$2f$route$2d$modules$2f$app$2d$page$2f$vendored$2f$ssr$2f$react$2d$jsx$2d$dev$2d$runtime$2e$js__$5b$app$2d$ssr$5d$__$28$ecmascript$29$__["jsxDEV"])("option", {
                                                                                        value: "",
                                                                                        className: "jsx-d9c01daba222d1ca",
                                                                                        children: "None"
                                                                                    }, void 0, false, {
                                                                                        fileName: "[project]/src/components/canvas/ReportCanvas.tsx",
                                                                                        lineNumber: 1216,
                                                                                        columnNumber: 69
                                                                                    }, ("TURBOPACK compile-time value", void 0)),
                                                                                    /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$next$2f$dist$2f$server$2f$route$2d$modules$2f$app$2d$page$2f$vendored$2f$ssr$2f$react$2d$jsx$2d$dev$2d$runtime$2e$js__$5b$app$2d$ssr$5d$__$28$ecmascript$29$__["jsxDEV"])("option", {
                                                                                        value: "ASC",
                                                                                        className: "jsx-d9c01daba222d1ca",
                                                                                        children: "Ascending"
                                                                                    }, void 0, false, {
                                                                                        fileName: "[project]/src/components/canvas/ReportCanvas.tsx",
                                                                                        lineNumber: 1217,
                                                                                        columnNumber: 69
                                                                                    }, ("TURBOPACK compile-time value", void 0)),
                                                                                    /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$next$2f$dist$2f$server$2f$route$2d$modules$2f$app$2d$page$2f$vendored$2f$ssr$2f$react$2d$jsx$2d$dev$2d$runtime$2e$js__$5b$app$2d$ssr$5d$__$28$ecmascript$29$__["jsxDEV"])("option", {
                                                                                        value: "DESC",
                                                                                        className: "jsx-d9c01daba222d1ca",
                                                                                        children: "Descending"
                                                                                    }, void 0, false, {
                                                                                        fileName: "[project]/src/components/canvas/ReportCanvas.tsx",
                                                                                        lineNumber: 1218,
                                                                                        columnNumber: 69
                                                                                    }, ("TURBOPACK compile-time value", void 0))
                                                                                ]
                                                                            }, void 0, true, {
                                                                                fileName: "[project]/src/components/canvas/ReportCanvas.tsx",
                                                                                lineNumber: 1211,
                                                                                columnNumber: 65
                                                                            }, ("TURBOPACK compile-time value", void 0))
                                                                        ]
                                                                    }, void 0, true, {
                                                                        fileName: "[project]/src/components/canvas/ReportCanvas.tsx",
                                                                        lineNumber: 1209,
                                                                        columnNumber: 61
                                                                    }, ("TURBOPACK compile-time value", void 0)),
                                                                    /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$next$2f$dist$2f$server$2f$route$2d$modules$2f$app$2d$page$2f$vendored$2f$ssr$2f$react$2d$jsx$2d$dev$2d$runtime$2e$js__$5b$app$2d$ssr$5d$__$28$ecmascript$29$__["jsxDEV"])("div", {
                                                                        className: "jsx-d9c01daba222d1ca",
                                                                        children: [
                                                                            /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$next$2f$dist$2f$server$2f$route$2d$modules$2f$app$2d$page$2f$vendored$2f$ssr$2f$react$2d$jsx$2d$dev$2d$runtime$2e$js__$5b$app$2d$ssr$5d$__$28$ecmascript$29$__["jsxDEV"])("label", {
                                                                                style: {
                                                                                    fontSize: '0.75rem',
                                                                                    color: 'var(--text-muted)',
                                                                                    display: 'block',
                                                                                    marginBottom: '4px'
                                                                                },
                                                                                className: "jsx-d9c01daba222d1ca",
                                                                                children: "Top N"
                                                                            }, void 0, false, {
                                                                                fileName: "[project]/src/components/canvas/ReportCanvas.tsx",
                                                                                lineNumber: 1222,
                                                                                columnNumber: 65
                                                                            }, ("TURBOPACK compile-time value", void 0)),
                                                                            /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$next$2f$dist$2f$server$2f$route$2d$modules$2f$app$2d$page$2f$vendored$2f$ssr$2f$react$2d$jsx$2d$dev$2d$runtime$2e$js__$5b$app$2d$ssr$5d$__$28$ecmascript$29$__["jsxDEV"])("input", {
                                                                                type: "number",
                                                                                value: activeWidget.topN || '',
                                                                                placeholder: "All",
                                                                                onChange: (e)=>updateWidget(activeWidget.id, {
                                                                                        topN: e.target.value ? parseInt(e.target.value) : undefined
                                                                                    }),
                                                                                style: {
                                                                                    width: '100%',
                                                                                    padding: '8px',
                                                                                    background: 'var(--surface)',
                                                                                    border: '1px solid var(--border)',
                                                                                    borderRadius: '6px',
                                                                                    color: 'var(--foreground)',
                                                                                    fontSize: '0.875rem'
                                                                                },
                                                                                className: "jsx-d9c01daba222d1ca"
                                                                            }, void 0, false, {
                                                                                fileName: "[project]/src/components/canvas/ReportCanvas.tsx",
                                                                                lineNumber: 1223,
                                                                                columnNumber: 65
                                                                            }, ("TURBOPACK compile-time value", void 0))
                                                                        ]
                                                                    }, void 0, true, {
                                                                        fileName: "[project]/src/components/canvas/ReportCanvas.tsx",
                                                                        lineNumber: 1221,
                                                                        columnNumber: 61
                                                                    }, ("TURBOPACK compile-time value", void 0))
                                                                ]
                                                            }, void 0, true, {
                                                                fileName: "[project]/src/components/canvas/ReportCanvas.tsx",
                                                                lineNumber: 1208,
                                                                columnNumber: 57
                                                            }, ("TURBOPACK compile-time value", void 0))
                                                        ]
                                                    }, void 0, true)
                                                ]
                                            }, void 0, true, {
                                                fileName: "[project]/src/components/canvas/ReportCanvas.tsx",
                                                lineNumber: 846,
                                                columnNumber: 45
                                            }, ("TURBOPACK compile-time value", void 0))
                                        ]
                                    }, void 0, true, {
                                        fileName: "[project]/src/components/canvas/ReportCanvas.tsx",
                                        lineNumber: 837,
                                        columnNumber: 41
                                    }, ("TURBOPACK compile-time value", void 0)) : /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$next$2f$dist$2f$server$2f$route$2d$modules$2f$app$2d$page$2f$vendored$2f$ssr$2f$react$2d$jsx$2d$dev$2d$runtime$2e$js__$5b$app$2d$ssr$5d$__$28$ecmascript$29$__["jsxDEV"])(__TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$next$2f$dist$2f$server$2f$route$2d$modules$2f$app$2d$page$2f$vendored$2f$ssr$2f$react$2d$jsx$2d$dev$2d$runtime$2e$js__$5b$app$2d$ssr$5d$__$28$ecmascript$29$__["Fragment"], {
                                        children: [
                                            /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$next$2f$dist$2f$server$2f$route$2d$modules$2f$app$2d$page$2f$vendored$2f$ssr$2f$react$2d$jsx$2d$dev$2d$runtime$2e$js__$5b$app$2d$ssr$5d$__$28$ecmascript$29$__["jsxDEV"])("div", {
                                                className: "jsx-d9c01daba222d1ca",
                                                children: [
                                                    /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$next$2f$dist$2f$server$2f$route$2d$modules$2f$app$2d$page$2f$vendored$2f$ssr$2f$react$2d$jsx$2d$dev$2d$runtime$2e$js__$5b$app$2d$ssr$5d$__$28$ecmascript$29$__["jsxDEV"])("div", {
                                                        style: {
                                                            display: 'flex',
                                                            justifyContent: 'space-between',
                                                            alignItems: 'center',
                                                            marginBottom: '16px'
                                                        },
                                                        className: "jsx-d9c01daba222d1ca",
                                                        children: /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$next$2f$dist$2f$server$2f$route$2d$modules$2f$app$2d$page$2f$vendored$2f$ssr$2f$react$2d$jsx$2d$dev$2d$runtime$2e$js__$5b$app$2d$ssr$5d$__$28$ecmascript$29$__["jsxDEV"])("h4", {
                                                            style: {
                                                                fontSize: '0.875rem',
                                                                color: 'var(--text-muted)',
                                                                textTransform: 'uppercase',
                                                                letterSpacing: '0.05em'
                                                            },
                                                            className: "jsx-d9c01daba222d1ca",
                                                            children: t('canvas.visualizations')
                                                        }, void 0, false, {
                                                            fileName: "[project]/src/components/canvas/ReportCanvas.tsx",
                                                            lineNumber: 1240,
                                                            columnNumber: 53
                                                        }, ("TURBOPACK compile-time value", void 0))
                                                    }, void 0, false, {
                                                        fileName: "[project]/src/components/canvas/ReportCanvas.tsx",
                                                        lineNumber: 1239,
                                                        columnNumber: 49
                                                    }, ("TURBOPACK compile-time value", void 0)),
                                                    /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$next$2f$dist$2f$server$2f$route$2d$modules$2f$app$2d$page$2f$vendored$2f$ssr$2f$react$2d$jsx$2d$dev$2d$runtime$2e$js__$5b$app$2d$ssr$5d$__$28$ecmascript$29$__["jsxDEV"])("div", {
                                                        style: {
                                                            display: 'grid',
                                                            gridTemplateColumns: 'repeat(4, minmax(0, 1fr))',
                                                            gap: '10px'
                                                        },
                                                        className: "jsx-d9c01daba222d1ca",
                                                        children: [
                                                            {
                                                                type: 'bar',
                                                                icon: __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$lucide$2d$react$2f$dist$2f$esm$2f$icons$2f$chart$2d$column$2e$js__$5b$app$2d$ssr$5d$__$28$ecmascript$29$__$3c$export__default__as__BarChart3$3e$__["BarChart3"],
                                                                label: t('canvas.visuals.bar')
                                                            },
                                                            {
                                                                type: 'line',
                                                                icon: __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$lucide$2d$react$2f$dist$2f$esm$2f$icons$2f$chart$2d$line$2e$js__$5b$app$2d$ssr$5d$__$28$ecmascript$29$__$3c$export__default__as__LineChart$3e$__["LineChart"],
                                                                label: t('canvas.visuals.line')
                                                            },
                                                            {
                                                                type: 'pie',
                                                                icon: __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$lucide$2d$react$2f$dist$2f$esm$2f$icons$2f$chart$2d$pie$2e$js__$5b$app$2d$ssr$5d$__$28$ecmascript$29$__$3c$export__default__as__PieChart$3e$__["PieChart"],
                                                                label: t('canvas.visuals.pie')
                                                            },
                                                            {
                                                                type: 'area',
                                                                icon: __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$lucide$2d$react$2f$dist$2f$esm$2f$icons$2f$chart$2d$area$2e$js__$5b$app$2d$ssr$5d$__$28$ecmascript$29$__$3c$export__default__as__ChartArea$3e$__["ChartArea"],
                                                                label: t('canvas.visuals.area')
                                                            },
                                                            {
                                                                type: 'treemap',
                                                                icon: __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$lucide$2d$react$2f$dist$2f$esm$2f$icons$2f$table$2d$cells$2d$merge$2e$js__$5b$app$2d$ssr$5d$__$28$ecmascript$29$__$3c$export__default__as__TableCellsMerge$3e$__["TableCellsMerge"],
                                                                label: t('canvas.visuals.treemap')
                                                            },
                                                            {
                                                                type: 'table',
                                                                icon: __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$lucide$2d$react$2f$dist$2f$esm$2f$icons$2f$table$2e$js__$5b$app$2d$ssr$5d$__$28$ecmascript$29$__$3c$export__default__as__Table$3e$__["Table"],
                                                                label: t('canvas.visuals.table')
                                                            },
                                                            {
                                                                type: 'card',
                                                                icon: __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$lucide$2d$react$2f$dist$2f$esm$2f$icons$2f$square$2d$stack$2e$js__$5b$app$2d$ssr$5d$__$28$ecmascript$29$__$3c$export__default__as__SquareStack$3e$__["SquareStack"],
                                                                label: t('canvas.visuals.card')
                                                            },
                                                            {
                                                                type: 'map',
                                                                icon: __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$lucide$2d$react$2f$dist$2f$esm$2f$icons$2f$map$2d$pinned$2e$js__$5b$app$2d$ssr$5d$__$28$ecmascript$29$__$3c$export__default__as__MapPinned$3e$__["MapPinned"],
                                                                label: t('canvas.visuals.map')
                                                            }
                                                        ].map((item)=>/*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$next$2f$dist$2f$server$2f$route$2d$modules$2f$app$2d$page$2f$vendored$2f$ssr$2f$react$2d$jsx$2d$dev$2d$runtime$2e$js__$5b$app$2d$ssr$5d$__$28$ecmascript$29$__["jsxDEV"])("button", {
                                                                onClick: ()=>addWidget(item.type),
                                                                title: item.label,
                                                                "aria-label": item.label,
                                                                style: {
                                                                    padding: '0',
                                                                    width: '100%',
                                                                    aspectRatio: '1 / 1',
                                                                    background: 'rgba(255, 255, 255, 0.08)',
                                                                    border: '1px solid var(--border)',
                                                                    borderRadius: '12px',
                                                                    display: 'flex',
                                                                    alignItems: 'center',
                                                                    justifyContent: 'center',
                                                                    cursor: 'pointer',
                                                                    transition: 'all 0.2s',
                                                                    opacity: widgets.length >= 9 ? 0.5 : 1
                                                                },
                                                                disabled: widgets.length >= 9,
                                                                className: "jsx-d9c01daba222d1ca" + " " + "visual-type-btn",
                                                                children: /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$next$2f$dist$2f$server$2f$route$2d$modules$2f$app$2d$page$2f$vendored$2f$ssr$2f$react$2d$jsx$2d$dev$2d$runtime$2e$js__$5b$app$2d$ssr$5d$__$28$ecmascript$29$__["jsxDEV"])(item.icon, {
                                                                    size: 20,
                                                                    color: "var(--primary)",
                                                                    strokeWidth: 1.8
                                                                }, void 0, false, {
                                                                    fileName: "[project]/src/components/canvas/ReportCanvas.tsx",
                                                                    lineNumber: 1277,
                                                                    columnNumber: 61
                                                                }, ("TURBOPACK compile-time value", void 0))
                                                            }, item.type, false, {
                                                                fileName: "[project]/src/components/canvas/ReportCanvas.tsx",
                                                                lineNumber: 1255,
                                                                columnNumber: 57
                                                            }, ("TURBOPACK compile-time value", void 0)))
                                                    }, void 0, false, {
                                                        fileName: "[project]/src/components/canvas/ReportCanvas.tsx",
                                                        lineNumber: 1244,
                                                        columnNumber: 49
                                                    }, ("TURBOPACK compile-time value", void 0))
                                                ]
                                            }, void 0, true, {
                                                fileName: "[project]/src/components/canvas/ReportCanvas.tsx",
                                                lineNumber: 1238,
                                                columnNumber: 45
                                            }, ("TURBOPACK compile-time value", void 0)),
                                            /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$next$2f$dist$2f$server$2f$route$2d$modules$2f$app$2d$page$2f$vendored$2f$ssr$2f$react$2d$jsx$2d$dev$2d$runtime$2e$js__$5b$app$2d$ssr$5d$__$28$ecmascript$29$__["jsxDEV"])("div", {
                                                style: {
                                                    marginTop: '32px'
                                                },
                                                className: "jsx-d9c01daba222d1ca",
                                                children: [
                                                    /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$next$2f$dist$2f$server$2f$route$2d$modules$2f$app$2d$page$2f$vendored$2f$ssr$2f$react$2d$jsx$2d$dev$2d$runtime$2e$js__$5b$app$2d$ssr$5d$__$28$ecmascript$29$__["jsxDEV"])("h4", {
                                                        style: {
                                                            marginBottom: '16px',
                                                            fontSize: '0.875rem',
                                                            color: 'var(--text-muted)',
                                                            textTransform: 'uppercase',
                                                            letterSpacing: '0.05em'
                                                        },
                                                        className: "jsx-d9c01daba222d1ca",
                                                        children: t('canvas.fields')
                                                    }, void 0, false, {
                                                        fileName: "[project]/src/components/canvas/ReportCanvas.tsx",
                                                        lineNumber: 1285,
                                                        columnNumber: 49
                                                    }, ("TURBOPACK compile-time value", void 0)),
                                                    /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$next$2f$dist$2f$server$2f$route$2d$modules$2f$app$2d$page$2f$vendored$2f$ssr$2f$react$2d$jsx$2d$dev$2d$runtime$2e$js__$5b$app$2d$ssr$5d$__$28$ecmascript$29$__["jsxDEV"])("div", {
                                                        style: {
                                                            display: 'flex',
                                                            flexDirection: 'column',
                                                            gap: '8px'
                                                        },
                                                        className: "jsx-d9c01daba222d1ca",
                                                        children: dataset.columns.map((col)=>/*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$next$2f$dist$2f$server$2f$route$2d$modules$2f$app$2d$page$2f$vendored$2f$ssr$2f$react$2d$jsx$2d$dev$2d$runtime$2e$js__$5b$app$2d$ssr$5d$__$28$ecmascript$29$__["jsxDEV"])("div", {
                                                                draggable: true,
                                                                onDragStart: (e)=>e.dataTransfer.setData('columnName', col.name),
                                                                style: {
                                                                    padding: '10px 14px',
                                                                    fontSize: '0.8125rem',
                                                                    cursor: 'grab',
                                                                    display: 'flex',
                                                                    alignItems: 'center',
                                                                    gap: '10px',
                                                                    border: '1px solid var(--border)',
                                                                    background: 'var(--surface)'
                                                                },
                                                                className: "jsx-d9c01daba222d1ca" + " " + "glass glass-card",
                                                                children: [
                                                                    /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$next$2f$dist$2f$server$2f$route$2d$modules$2f$app$2d$page$2f$vendored$2f$ssr$2f$react$2d$jsx$2d$dev$2d$runtime$2e$js__$5b$app$2d$ssr$5d$__$28$ecmascript$29$__["jsxDEV"])("span", {
                                                                        style: {
                                                                            color: 'var(--text-muted)',
                                                                            opacity: 0.5
                                                                        },
                                                                        className: "jsx-d9c01daba222d1ca",
                                                                        children: "⠿"
                                                                    }, void 0, false, {
                                                                        fileName: "[project]/src/components/canvas/ReportCanvas.tsx",
                                                                        lineNumber: 1306,
                                                                        columnNumber: 61
                                                                    }, ("TURBOPACK compile-time value", void 0)),
                                                                    /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$next$2f$dist$2f$server$2f$route$2d$modules$2f$app$2d$page$2f$vendored$2f$ssr$2f$react$2d$jsx$2d$dev$2d$runtime$2e$js__$5b$app$2d$ssr$5d$__$28$ecmascript$29$__["jsxDEV"])("span", {
                                                                        style: {
                                                                            flex: 1,
                                                                            overflow: 'hidden',
                                                                            textOverflow: 'ellipsis'
                                                                        },
                                                                        className: "jsx-d9c01daba222d1ca",
                                                                        children: col.name
                                                                    }, void 0, false, {
                                                                        fileName: "[project]/src/components/canvas/ReportCanvas.tsx",
                                                                        lineNumber: 1307,
                                                                        columnNumber: 61
                                                                    }, ("TURBOPACK compile-time value", void 0)),
                                                                    /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$next$2f$dist$2f$server$2f$route$2d$modules$2f$app$2d$page$2f$vendored$2f$ssr$2f$react$2d$jsx$2d$dev$2d$runtime$2e$js__$5b$app$2d$ssr$5d$__$28$ecmascript$29$__["jsxDEV"])("span", {
                                                                        style: {
                                                                            fontSize: '10px',
                                                                            background: 'var(--surface-light)',
                                                                            padding: '2px 6px',
                                                                            borderRadius: '4px',
                                                                            color: 'var(--primary)'
                                                                        },
                                                                        className: "jsx-d9c01daba222d1ca",
                                                                        children: col.type
                                                                    }, void 0, false, {
                                                                        fileName: "[project]/src/components/canvas/ReportCanvas.tsx",
                                                                        lineNumber: 1308,
                                                                        columnNumber: 61
                                                                    }, ("TURBOPACK compile-time value", void 0))
                                                                ]
                                                            }, col.name, true, {
                                                                fileName: "[project]/src/components/canvas/ReportCanvas.tsx",
                                                                lineNumber: 1290,
                                                                columnNumber: 57
                                                            }, ("TURBOPACK compile-time value", void 0)))
                                                    }, void 0, false, {
                                                        fileName: "[project]/src/components/canvas/ReportCanvas.tsx",
                                                        lineNumber: 1288,
                                                        columnNumber: 49
                                                    }, ("TURBOPACK compile-time value", void 0))
                                                ]
                                            }, void 0, true, {
                                                fileName: "[project]/src/components/canvas/ReportCanvas.tsx",
                                                lineNumber: 1284,
                                                columnNumber: 45
                                            }, ("TURBOPACK compile-time value", void 0))
                                        ]
                                    }, void 0, true)
                                }, void 0, false)
                            }, void 0, false, {
                                fileName: "[project]/src/components/canvas/ReportCanvas.tsx",
                                lineNumber: 726,
                                columnNumber: 25
                            }, ("TURBOPACK compile-time value", void 0))
                        ]
                    }, void 0, true) : /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$next$2f$dist$2f$server$2f$route$2d$modules$2f$app$2d$page$2f$vendored$2f$ssr$2f$react$2d$jsx$2d$dev$2d$runtime$2e$js__$5b$app$2d$ssr$5d$__$28$ecmascript$29$__["jsxDEV"])("div", {
                        style: {
                            display: 'flex',
                            flexDirection: 'column',
                            alignItems: 'center',
                            gap: '20px',
                            marginTop: '48px',
                            padding: '0 8px'
                        },
                        className: "jsx-d9c01daba222d1ca",
                        children: [
                            /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$next$2f$dist$2f$server$2f$route$2d$modules$2f$app$2d$page$2f$vendored$2f$ssr$2f$react$2d$jsx$2d$dev$2d$runtime$2e$js__$5b$app$2d$ssr$5d$__$28$ecmascript$29$__["jsxDEV"])("button", {
                                onClick: ()=>handleSave(false),
                                disabled: isSaving || !dataset.id,
                                title: "Save Report",
                                style: {
                                    background: 'transparent',
                                    border: 'none',
                                    color: 'var(--primary)',
                                    cursor: 'pointer',
                                    marginBottom: '12px'
                                },
                                className: "jsx-d9c01daba222d1ca",
                                children: isSaving ? /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$next$2f$dist$2f$server$2f$route$2d$modules$2f$app$2d$page$2f$vendored$2f$ssr$2f$react$2d$jsx$2d$dev$2d$runtime$2e$js__$5b$app$2d$ssr$5d$__$28$ecmascript$29$__["jsxDEV"])(__TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$lucide$2d$react$2f$dist$2f$esm$2f$icons$2f$loader$2d$circle$2e$js__$5b$app$2d$ssr$5d$__$28$ecmascript$29$__$3c$export__default__as__Loader2$3e$__["Loader2"], {
                                    size: 24,
                                    className: "animate-spin"
                                }, void 0, false, {
                                    fileName: "[project]/src/components/canvas/ReportCanvas.tsx",
                                    lineNumber: 1335,
                                    columnNumber: 41
                                }, ("TURBOPACK compile-time value", void 0)) : /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$next$2f$dist$2f$server$2f$route$2d$modules$2f$app$2d$page$2f$vendored$2f$ssr$2f$react$2d$jsx$2d$dev$2d$runtime$2e$js__$5b$app$2d$ssr$5d$__$28$ecmascript$29$__["jsxDEV"])(__TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$lucide$2d$react$2f$dist$2f$esm$2f$icons$2f$save$2e$js__$5b$app$2d$ssr$5d$__$28$ecmascript$29$__$3c$export__default__as__Save$3e$__["Save"], {
                                    size: 24
                                }, void 0, false, {
                                    fileName: "[project]/src/components/canvas/ReportCanvas.tsx",
                                    lineNumber: 1335,
                                    columnNumber: 90
                                }, ("TURBOPACK compile-time value", void 0))
                            }, void 0, false, {
                                fileName: "[project]/src/components/canvas/ReportCanvas.tsx",
                                lineNumber: 1323,
                                columnNumber: 25
                            }, ("TURBOPACK compile-time value", void 0)),
                            [
                                'bar',
                                'line',
                                'pie',
                                'area',
                                'treemap',
                                'table',
                                'card',
                                'map'
                            ].map((type)=>{
                                const iconMap = {
                                    bar: __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$lucide$2d$react$2f$dist$2f$esm$2f$icons$2f$chart$2d$column$2e$js__$5b$app$2d$ssr$5d$__$28$ecmascript$29$__$3c$export__default__as__BarChart3$3e$__["BarChart3"],
                                    line: __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$lucide$2d$react$2f$dist$2f$esm$2f$icons$2f$chart$2d$line$2e$js__$5b$app$2d$ssr$5d$__$28$ecmascript$29$__$3c$export__default__as__LineChart$3e$__["LineChart"],
                                    pie: __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$lucide$2d$react$2f$dist$2f$esm$2f$icons$2f$chart$2d$pie$2e$js__$5b$app$2d$ssr$5d$__$28$ecmascript$29$__$3c$export__default__as__PieChart$3e$__["PieChart"],
                                    area: __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$lucide$2d$react$2f$dist$2f$esm$2f$icons$2f$chart$2d$area$2e$js__$5b$app$2d$ssr$5d$__$28$ecmascript$29$__$3c$export__default__as__ChartArea$3e$__["ChartArea"],
                                    table: __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$lucide$2d$react$2f$dist$2f$esm$2f$icons$2f$table$2e$js__$5b$app$2d$ssr$5d$__$28$ecmascript$29$__$3c$export__default__as__Table$3e$__["Table"],
                                    treemap: __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$lucide$2d$react$2f$dist$2f$esm$2f$icons$2f$table$2d$cells$2d$merge$2e$js__$5b$app$2d$ssr$5d$__$28$ecmascript$29$__$3c$export__default__as__TableCellsMerge$3e$__["TableCellsMerge"],
                                    card: __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$lucide$2d$react$2f$dist$2f$esm$2f$icons$2f$square$2d$stack$2e$js__$5b$app$2d$ssr$5d$__$28$ecmascript$29$__$3c$export__default__as__SquareStack$3e$__["SquareStack"],
                                    map: __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$lucide$2d$react$2f$dist$2f$esm$2f$icons$2f$map$2d$pinned$2e$js__$5b$app$2d$ssr$5d$__$28$ecmascript$29$__$3c$export__default__as__MapPinned$3e$__["MapPinned"]
                                };
                                const Icon = iconMap[type];
                                return /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$next$2f$dist$2f$server$2f$route$2d$modules$2f$app$2d$page$2f$vendored$2f$ssr$2f$react$2d$jsx$2d$dev$2d$runtime$2e$js__$5b$app$2d$ssr$5d$__$28$ecmascript$29$__["jsxDEV"])("button", {
                                    onClick: ()=>{
                                        addWidget(type);
                                        setIsSidebarCollapsed(false);
                                    },
                                    title: type,
                                    style: {
                                        background: 'transparent',
                                        border: 'none',
                                        cursor: 'pointer',
                                        color: 'var(--text-muted)',
                                        transition: 'color 0.2s'
                                    },
                                    className: "jsx-d9c01daba222d1ca"
                                }, type, false, {
                                    fileName: "[project]/src/components/canvas/ReportCanvas.tsx",
                                    lineNumber: 1342,
                                    columnNumber: 33
                                }, ("TURBOPACK compile-time value", void 0));
                            })
                        ]
                    }, void 0, true, {
                        fileName: "[project]/src/components/canvas/ReportCanvas.tsx",
                        lineNumber: 1322,
                        columnNumber: 21
                    }, ("TURBOPACK compile-time value", void 0))
                ]
            }, void 0, true, {
                fileName: "[project]/src/components/canvas/ReportCanvas.tsx",
                lineNumber: 606,
                columnNumber: 13
            }, ("TURBOPACK compile-time value", void 0)),
            /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$next$2f$dist$2f$server$2f$route$2d$modules$2f$app$2d$page$2f$vendored$2f$ssr$2f$react$2d$jsx$2d$dev$2d$runtime$2e$js__$5b$app$2d$ssr$5d$__$28$ecmascript$29$__["jsxDEV"])("div", {
                style: {
                    flex: 1,
                    position: 'relative',
                    padding: '0 40px 40px',
                    minHeight: 'calc(100vh - 36px)',
                    background: 'var(--background)',
                    overflow: 'visible'
                },
                className: "jsx-d9c01daba222d1ca",
                children: [
                    /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$next$2f$dist$2f$server$2f$route$2d$modules$2f$app$2d$page$2f$vendored$2f$ssr$2f$react$2d$jsx$2d$dev$2d$runtime$2e$js__$5b$app$2d$ssr$5d$__$28$ecmascript$29$__["jsxDEV"])("div", {
                        style: {
                            position: 'sticky',
                            top: 0,
                            zIndex: 100,
                            background: 'rgba(10, 10, 15, 0.8)',
                            backdropFilter: 'blur(12px)',
                            padding: '40px 0 20px',
                            margin: '0 0 24px',
                            borderBottom: '1px solid rgba(255, 255, 255, 0.05)'
                        },
                        className: "jsx-d9c01daba222d1ca",
                        children: [
                            /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$next$2f$dist$2f$server$2f$route$2d$modules$2f$app$2d$page$2f$vendored$2f$ssr$2f$react$2d$jsx$2d$dev$2d$runtime$2e$js__$5b$app$2d$ssr$5d$__$28$ecmascript$29$__["jsxDEV"])("div", {
                                style: {
                                    marginBottom: '24px',
                                    display: 'flex',
                                    justifyContent: 'space-between',
                                    alignItems: 'center'
                                },
                                className: "jsx-d9c01daba222d1ca",
                                children: [
                                    /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$next$2f$dist$2f$server$2f$route$2d$modules$2f$app$2d$page$2f$vendored$2f$ssr$2f$react$2d$jsx$2d$dev$2d$runtime$2e$js__$5b$app$2d$ssr$5d$__$28$ecmascript$29$__["jsxDEV"])("div", {
                                        className: "jsx-d9c01daba222d1ca",
                                        children: [
                                            /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$next$2f$dist$2f$server$2f$route$2d$modules$2f$app$2d$page$2f$vendored$2f$ssr$2f$react$2d$jsx$2d$dev$2d$runtime$2e$js__$5b$app$2d$ssr$5d$__$28$ecmascript$29$__["jsxDEV"])("div", {
                                                style: {
                                                    display: 'flex',
                                                    alignItems: 'center',
                                                    gap: '8px',
                                                    marginBottom: '8px',
                                                    color: 'var(--primary)'
                                                },
                                                className: "jsx-d9c01daba222d1ca",
                                                children: [
                                                    /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$next$2f$dist$2f$server$2f$route$2d$modules$2f$app$2d$page$2f$vendored$2f$ssr$2f$react$2d$jsx$2d$dev$2d$runtime$2e$js__$5b$app$2d$ssr$5d$__$28$ecmascript$29$__["jsxDEV"])(__TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$lucide$2d$react$2f$dist$2f$esm$2f$icons$2f$activity$2e$js__$5b$app$2d$ssr$5d$__$28$ecmascript$29$__$3c$export__default__as__Activity$3e$__["Activity"], {
                                                        size: 18
                                                    }, void 0, false, {
                                                        fileName: "[project]/src/components/canvas/ReportCanvas.tsx",
                                                        lineNumber: 1385,
                                                        columnNumber: 33
                                                    }, ("TURBOPACK compile-time value", void 0)),
                                                    /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$next$2f$dist$2f$server$2f$route$2d$modules$2f$app$2d$page$2f$vendored$2f$ssr$2f$react$2d$jsx$2d$dev$2d$runtime$2e$js__$5b$app$2d$ssr$5d$__$28$ecmascript$29$__["jsxDEV"])("span", {
                                                        style: {
                                                            fontSize: '0.75rem',
                                                            fontWeight: 600,
                                                            textTransform: 'uppercase',
                                                            letterSpacing: '0.1em'
                                                        },
                                                        className: "jsx-d9c01daba222d1ca",
                                                        children: t('sidebar.reports')
                                                    }, void 0, false, {
                                                        fileName: "[project]/src/components/canvas/ReportCanvas.tsx",
                                                        lineNumber: 1386,
                                                        columnNumber: 33
                                                    }, ("TURBOPACK compile-time value", void 0))
                                                ]
                                            }, void 0, true, {
                                                fileName: "[project]/src/components/canvas/ReportCanvas.tsx",
                                                lineNumber: 1384,
                                                columnNumber: 29
                                            }, ("TURBOPACK compile-time value", void 0)),
                                            /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$next$2f$dist$2f$server$2f$route$2d$modules$2f$app$2d$page$2f$vendored$2f$ssr$2f$react$2d$jsx$2d$dev$2d$runtime$2e$js__$5b$app$2d$ssr$5d$__$28$ecmascript$29$__["jsxDEV"])("h2", {
                                                style: {
                                                    fontSize: '1.75rem',
                                                    fontWeight: 700
                                                },
                                                className: "jsx-d9c01daba222d1ca",
                                                children: reportName
                                            }, void 0, false, {
                                                fileName: "[project]/src/components/canvas/ReportCanvas.tsx",
                                                lineNumber: 1388,
                                                columnNumber: 29
                                            }, ("TURBOPACK compile-time value", void 0))
                                        ]
                                    }, void 0, true, {
                                        fileName: "[project]/src/components/canvas/ReportCanvas.tsx",
                                        lineNumber: 1383,
                                        columnNumber: 25
                                    }, ("TURBOPACK compile-time value", void 0)),
                                    hasUnsavedChanges && /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$next$2f$dist$2f$server$2f$route$2d$modules$2f$app$2d$page$2f$vendored$2f$ssr$2f$react$2d$jsx$2d$dev$2d$runtime$2e$js__$5b$app$2d$ssr$5d$__$28$ecmascript$29$__["jsxDEV"])("div", {
                                        style: {
                                            padding: '6px 12px',
                                            background: 'rgba(251, 191, 36, 0.1)',
                                            border: '1px solid rgba(251, 191, 36, 0.2)',
                                            borderRadius: '20px',
                                            fontSize: '0.75rem',
                                            color: '#fbbf24',
                                            display: 'flex',
                                            alignItems: 'center',
                                            gap: '6px'
                                        },
                                        className: "jsx-d9c01daba222d1ca",
                                        children: [
                                            /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$next$2f$dist$2f$server$2f$route$2d$modules$2f$app$2d$page$2f$vendored$2f$ssr$2f$react$2d$jsx$2d$dev$2d$runtime$2e$js__$5b$app$2d$ssr$5d$__$28$ecmascript$29$__["jsxDEV"])("div", {
                                                style: {
                                                    width: '6px',
                                                    height: '6px',
                                                    borderRadius: '50%',
                                                    background: '#fbbf24'
                                                },
                                                className: "jsx-d9c01daba222d1ca"
                                            }, void 0, false, {
                                                fileName: "[project]/src/components/canvas/ReportCanvas.tsx",
                                                lineNumber: 1392,
                                                columnNumber: 33
                                            }, ("TURBOPACK compile-time value", void 0)),
                                            "Cambios sin guardar"
                                        ]
                                    }, void 0, true, {
                                        fileName: "[project]/src/components/canvas/ReportCanvas.tsx",
                                        lineNumber: 1391,
                                        columnNumber: 29
                                    }, ("TURBOPACK compile-time value", void 0))
                                ]
                            }, void 0, true, {
                                fileName: "[project]/src/components/canvas/ReportCanvas.tsx",
                                lineNumber: 1382,
                                columnNumber: 21
                            }, ("TURBOPACK compile-time value", void 0)),
                            /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$next$2f$dist$2f$server$2f$route$2d$modules$2f$app$2d$page$2f$vendored$2f$ssr$2f$react$2d$jsx$2d$dev$2d$runtime$2e$js__$5b$app$2d$ssr$5d$__$28$ecmascript$29$__["jsxDEV"])("div", {
                                onClick: (e)=>{
                                    e.stopPropagation();
                                    setSelection({
                                        type: 'filters'
                                    });
                                },
                                onDragOver: (e)=>e.preventDefault(),
                                onDrop: (e)=>{
                                    const columnName = e.dataTransfer.getData('columnName');
                                    if (columnName) addGlobalFilter(columnName);
                                },
                                style: {
                                    height: '54px',
                                    background: selection.type === 'filters' ? 'rgba(139, 92, 246, 0.08)' : 'rgba(255,255,255,0.03)',
                                    border: selection.type === 'filters' ? '1px solid var(--primary)' : '1px solid rgba(255, 255, 255, 0.05)',
                                    borderRadius: '12px',
                                    display: 'flex',
                                    alignItems: 'center',
                                    padding: '0 16px',
                                    gap: '12px',
                                    transition: 'all 0.2s',
                                    cursor: 'pointer'
                                },
                                className: "jsx-d9c01daba222d1ca",
                                children: [
                                    /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$next$2f$dist$2f$server$2f$route$2d$modules$2f$app$2d$page$2f$vendored$2f$ssr$2f$react$2d$jsx$2d$dev$2d$runtime$2e$js__$5b$app$2d$ssr$5d$__$28$ecmascript$29$__["jsxDEV"])("div", {
                                        style: {
                                            fontSize: '0.7rem',
                                            color: 'var(--text-muted)',
                                            display: 'flex',
                                            alignItems: 'center',
                                            gap: '8px',
                                            marginRight: '4px',
                                            fontWeight: 600
                                        },
                                        className: "jsx-d9c01daba222d1ca",
                                        children: [
                                            /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$next$2f$dist$2f$server$2f$route$2d$modules$2f$app$2d$page$2f$vendored$2f$ssr$2f$react$2d$jsx$2d$dev$2d$runtime$2e$js__$5b$app$2d$ssr$5d$__$28$ecmascript$29$__["jsxDEV"])(__TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$lucide$2d$react$2f$dist$2f$esm$2f$icons$2f$settings$2e$js__$5b$app$2d$ssr$5d$__$28$ecmascript$29$__$3c$export__default__as__Settings$3e$__["Settings"], {
                                                size: 14
                                            }, void 0, false, {
                                                fileName: "[project]/src/components/canvas/ReportCanvas.tsx",
                                                lineNumber: 1420,
                                                columnNumber: 29
                                            }, ("TURBOPACK compile-time value", void 0)),
                                            " ",
                                            t('canvas.filters').toUpperCase()
                                        ]
                                    }, void 0, true, {
                                        fileName: "[project]/src/components/canvas/ReportCanvas.tsx",
                                        lineNumber: 1419,
                                        columnNumber: 25
                                    }, ("TURBOPACK compile-time value", void 0)),
                                    globalFilters.length === 0 ? /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$next$2f$dist$2f$server$2f$route$2d$modules$2f$app$2d$page$2f$vendored$2f$ssr$2f$react$2d$jsx$2d$dev$2d$runtime$2e$js__$5b$app$2d$ssr$5d$__$28$ecmascript$29$__["jsxDEV"])("span", {
                                        style: {
                                            fontSize: '0.8125rem',
                                            color: 'var(--text-muted)',
                                            opacity: 0.5
                                        },
                                        className: "jsx-d9c01daba222d1ca",
                                        children: t('canvas.filter_bar_empty')
                                    }, void 0, false, {
                                        fileName: "[project]/src/components/canvas/ReportCanvas.tsx",
                                        lineNumber: 1423,
                                        columnNumber: 29
                                    }, ("TURBOPACK compile-time value", void 0)) : /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$next$2f$dist$2f$server$2f$route$2d$modules$2f$app$2d$page$2f$vendored$2f$ssr$2f$react$2d$jsx$2d$dev$2d$runtime$2e$js__$5b$app$2d$ssr$5d$__$28$ecmascript$29$__["jsxDEV"])("div", {
                                        style: {
                                            display: 'flex',
                                            gap: '8px',
                                            overflowX: 'auto',
                                            paddingBottom: '2px',
                                            flex: 1
                                        },
                                        className: "jsx-d9c01daba222d1ca" + " " + "hide-scrollbar",
                                        children: globalFilters.map((filter)=>{
                                            const uniqueValues = Array.from(new Set(dataset.preview.map((row)=>String(row[filter.column])))).slice(0, 50);
                                            return /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$next$2f$dist$2f$server$2f$route$2d$modules$2f$app$2d$page$2f$vendored$2f$ssr$2f$react$2d$jsx$2d$dev$2d$runtime$2e$js__$5b$app$2d$ssr$5d$__$28$ecmascript$29$__["jsxDEV"])("div", {
                                                style: {
                                                    display: 'flex',
                                                    alignItems: 'center',
                                                    gap: '8px',
                                                    background: 'rgba(255, 255, 255, 0.05)',
                                                    padding: '4px 10px',
                                                    borderRadius: '8px',
                                                    border: '1px solid rgba(255, 255, 255, 0.1)',
                                                    whiteSpace: 'nowrap'
                                                },
                                                onClick: (e)=>e.stopPropagation(),
                                                className: "jsx-d9c01daba222d1ca",
                                                children: [
                                                    /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$next$2f$dist$2f$server$2f$route$2d$modules$2f$app$2d$page$2f$vendored$2f$ssr$2f$react$2d$jsx$2d$dev$2d$runtime$2e$js__$5b$app$2d$ssr$5d$__$28$ecmascript$29$__["jsxDEV"])("span", {
                                                        style: {
                                                            fontSize: '0.75rem',
                                                            fontWeight: 600
                                                        },
                                                        className: "jsx-d9c01daba222d1ca",
                                                        children: [
                                                            filter.column,
                                                            ":"
                                                        ]
                                                    }, void 0, true, {
                                                        fileName: "[project]/src/components/canvas/ReportCanvas.tsx",
                                                        lineNumber: 1430,
                                                        columnNumber: 45
                                                    }, ("TURBOPACK compile-time value", void 0)),
                                                    /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$next$2f$dist$2f$server$2f$route$2d$modules$2f$app$2d$page$2f$vendored$2f$ssr$2f$react$2d$jsx$2d$dev$2d$runtime$2e$js__$5b$app$2d$ssr$5d$__$28$ecmascript$29$__["jsxDEV"])("select", {
                                                        value: filter.value || '',
                                                        onChange: (e)=>updateGlobalFilterValue(filter.id, e.target.value || null),
                                                        style: {
                                                            background: 'transparent',
                                                            border: 'none',
                                                            fontSize: '0.75rem',
                                                            color: 'var(--primary)',
                                                            fontWeight: 600,
                                                            outline: 'none',
                                                            cursor: 'pointer'
                                                        },
                                                        className: "jsx-d9c01daba222d1ca",
                                                        children: [
                                                            /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$next$2f$dist$2f$server$2f$route$2d$modules$2f$app$2d$page$2f$vendored$2f$ssr$2f$react$2d$jsx$2d$dev$2d$runtime$2e$js__$5b$app$2d$ssr$5d$__$28$ecmascript$29$__["jsxDEV"])("option", {
                                                                value: "",
                                                                className: "jsx-d9c01daba222d1ca",
                                                                children: t('canvas.all')
                                                            }, void 0, false, {
                                                                fileName: "[project]/src/components/canvas/ReportCanvas.tsx",
                                                                lineNumber: 1436,
                                                                columnNumber: 49
                                                            }, ("TURBOPACK compile-time value", void 0)),
                                                            uniqueValues.map((v)=>/*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$next$2f$dist$2f$server$2f$route$2d$modules$2f$app$2d$page$2f$vendored$2f$ssr$2f$react$2d$jsx$2d$dev$2d$runtime$2e$js__$5b$app$2d$ssr$5d$__$28$ecmascript$29$__["jsxDEV"])("option", {
                                                                    value: v,
                                                                    className: "jsx-d9c01daba222d1ca",
                                                                    children: v
                                                                }, v, false, {
                                                                    fileName: "[project]/src/components/canvas/ReportCanvas.tsx",
                                                                    lineNumber: 1437,
                                                                    columnNumber: 72
                                                                }, ("TURBOPACK compile-time value", void 0)))
                                                        ]
                                                    }, void 0, true, {
                                                        fileName: "[project]/src/components/canvas/ReportCanvas.tsx",
                                                        lineNumber: 1431,
                                                        columnNumber: 45
                                                    }, ("TURBOPACK compile-time value", void 0)),
                                                    /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$next$2f$dist$2f$server$2f$route$2d$modules$2f$app$2d$page$2f$vendored$2f$ssr$2f$react$2d$jsx$2d$dev$2d$runtime$2e$js__$5b$app$2d$ssr$5d$__$28$ecmascript$29$__["jsxDEV"])("button", {
                                                        onClick: ()=>removeGlobalFilter(filter.id),
                                                        style: {
                                                            background: 'transparent',
                                                            border: 'none',
                                                            padding: 0,
                                                            color: 'var(--text-muted)',
                                                            cursor: 'pointer',
                                                            display: 'flex'
                                                        },
                                                        className: "jsx-d9c01daba222d1ca",
                                                        children: /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$next$2f$dist$2f$server$2f$route$2d$modules$2f$app$2d$page$2f$vendored$2f$ssr$2f$react$2d$jsx$2d$dev$2d$runtime$2e$js__$5b$app$2d$ssr$5d$__$28$ecmascript$29$__["jsxDEV"])(__TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$lucide$2d$react$2f$dist$2f$esm$2f$icons$2f$x$2e$js__$5b$app$2d$ssr$5d$__$28$ecmascript$29$__$3c$export__default__as__X$3e$__["X"], {
                                                            size: 12
                                                        }, void 0, false, {
                                                            fileName: "[project]/src/components/canvas/ReportCanvas.tsx",
                                                            lineNumber: 1440,
                                                            columnNumber: 49
                                                        }, ("TURBOPACK compile-time value", void 0))
                                                    }, void 0, false, {
                                                        fileName: "[project]/src/components/canvas/ReportCanvas.tsx",
                                                        lineNumber: 1439,
                                                        columnNumber: 45
                                                    }, ("TURBOPACK compile-time value", void 0))
                                                ]
                                            }, filter.id, true, {
                                                fileName: "[project]/src/components/canvas/ReportCanvas.tsx",
                                                lineNumber: 1429,
                                                columnNumber: 41
                                            }, ("TURBOPACK compile-time value", void 0));
                                        })
                                    }, void 0, false, {
                                        fileName: "[project]/src/components/canvas/ReportCanvas.tsx",
                                        lineNumber: 1425,
                                        columnNumber: 29
                                    }, ("TURBOPACK compile-time value", void 0))
                                ]
                            }, void 0, true, {
                                fileName: "[project]/src/components/canvas/ReportCanvas.tsx",
                                lineNumber: 1399,
                                columnNumber: 21
                            }, ("TURBOPACK compile-time value", void 0))
                        ]
                    }, void 0, true, {
                        fileName: "[project]/src/components/canvas/ReportCanvas.tsx",
                        lineNumber: 1371,
                        columnNumber: 17
                    }, ("TURBOPACK compile-time value", void 0)),
                    /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$next$2f$dist$2f$server$2f$route$2d$modules$2f$app$2d$page$2f$vendored$2f$ssr$2f$react$2d$jsx$2d$dev$2d$runtime$2e$js__$5b$app$2d$ssr$5d$__$28$ecmascript$29$__["jsxDEV"])("div", {
                        style: {
                            flex: 1,
                            position: 'relative',
                            minHeight: 0,
                            paddingBottom: '40px'
                        },
                        onClick: (e)=>{
                            if (e.target === e.currentTarget) handleBackToVisuals();
                        },
                        className: "jsx-d9c01daba222d1ca",
                        children: /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$next$2f$dist$2f$server$2f$route$2d$modules$2f$app$2d$page$2f$vendored$2f$ssr$2f$react$2d$jsx$2d$dev$2d$runtime$2e$js__$5b$app$2d$ssr$5d$__$28$ecmascript$29$__["jsxDEV"])("div", {
                            ref: containerRef,
                            style: {
                                position: 'relative',
                                width: '100%',
                                minHeight: '600px',
                                overflow: 'visible'
                            },
                            onClick: (e)=>{
                                if (e.target === e.currentTarget) handleBackToVisuals();
                            },
                            className: "jsx-d9c01daba222d1ca",
                            children: widgets.length === 0 ? /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$next$2f$dist$2f$server$2f$route$2d$modules$2f$app$2d$page$2f$vendored$2f$ssr$2f$react$2d$jsx$2d$dev$2d$runtime$2e$js__$5b$app$2d$ssr$5d$__$28$ecmascript$29$__["jsxDEV"])("div", {
                                style: {
                                    position: 'absolute',
                                    top: '40%',
                                    left: '50%',
                                    transform: 'translate(-50%, -50%)',
                                    textAlign: 'center',
                                    opacity: 0.3
                                },
                                className: "jsx-d9c01daba222d1ca",
                                children: [
                                    /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$next$2f$dist$2f$server$2f$route$2d$modules$2f$app$2d$page$2f$vendored$2f$ssr$2f$react$2d$jsx$2d$dev$2d$runtime$2e$js__$5b$app$2d$ssr$5d$__$28$ecmascript$29$__["jsxDEV"])(__TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$lucide$2d$react$2f$dist$2f$esm$2f$icons$2f$chart$2d$column$2e$js__$5b$app$2d$ssr$5d$__$28$ecmascript$29$__$3c$export__default__as__BarChart3$3e$__["BarChart3"], {
                                        size: 64,
                                        style: {
                                            marginBottom: '16px'
                                        }
                                    }, void 0, false, {
                                        fileName: "[project]/src/components/canvas/ReportCanvas.tsx",
                                        lineNumber: 1479,
                                        columnNumber: 33
                                    }, ("TURBOPACK compile-time value", void 0)),
                                    /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$next$2f$dist$2f$server$2f$route$2d$modules$2f$app$2d$page$2f$vendored$2f$ssr$2f$react$2d$jsx$2d$dev$2d$runtime$2e$js__$5b$app$2d$ssr$5d$__$28$ecmascript$29$__["jsxDEV"])("p", {
                                        className: "jsx-d9c01daba222d1ca",
                                        children: "Select a visual type to start building your report"
                                    }, void 0, false, {
                                        fileName: "[project]/src/components/canvas/ReportCanvas.tsx",
                                        lineNumber: 1480,
                                        columnNumber: 33
                                    }, ("TURBOPACK compile-time value", void 0))
                                ]
                            }, void 0, true, {
                                fileName: "[project]/src/components/canvas/ReportCanvas.tsx",
                                lineNumber: 1471,
                                columnNumber: 29
                            }, ("TURBOPACK compile-time value", void 0)) : isGridMounted && /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$next$2f$dist$2f$server$2f$route$2d$modules$2f$app$2d$page$2f$vendored$2f$ssr$2f$react$2d$jsx$2d$dev$2d$runtime$2e$js__$5b$app$2d$ssr$5d$__$28$ecmascript$29$__["jsxDEV"])(ResponsiveGridLayoutComponent, {
                                className: "layout",
                                layouts: {
                                    lg: layout
                                },
                                breakpoints: {
                                    lg: 1200,
                                    md: 996,
                                    sm: 768,
                                    xs: 480,
                                    xxs: 0
                                },
                                cols: {
                                    lg: 3,
                                    md: 3,
                                    sm: 2,
                                    xs: 1,
                                    xxs: 1
                                },
                                rowHeight: 150,
                                width: width,
                                margin: [
                                    24,
                                    24
                                ],
                                containerPadding: [
                                    0,
                                    0
                                ],
                                onLayoutChange: onLayoutChange,
                                draggableHandle: ".glass-card",
                                useCSSTransforms: true,
                                children: widgets.map((widget)=>/*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$next$2f$dist$2f$server$2f$route$2d$modules$2f$app$2d$page$2f$vendored$2f$ssr$2f$react$2d$jsx$2d$dev$2d$runtime$2e$js__$5b$app$2d$ssr$5d$__$28$ecmascript$29$__["jsxDEV"])("div", {
                                        onClick: (e)=>{
                                            e.stopPropagation();
                                            setSelection({
                                                type: 'widget',
                                                id: widget.id
                                            });
                                        },
                                        className: "jsx-d9c01daba222d1ca",
                                        children: /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$next$2f$dist$2f$server$2f$route$2d$modules$2f$app$2d$page$2f$vendored$2f$ssr$2f$react$2d$jsx$2d$dev$2d$runtime$2e$js__$5b$app$2d$ssr$5d$__$28$ecmascript$29$__["jsxDEV"])(WidgetCard, {
                                            widget: widget,
                                            isActive: selection.type === 'widget' && selection.id === widget.id,
                                            globalFilters: globalFilters,
                                            columnsMeta: dataset.columns,
                                            onSelect: ()=>setSelection({
                                                    type: 'widget',
                                                    id: widget.id
                                                }),
                                            onRemove: (e)=>removeWidget(widget.id, e)
                                        }, void 0, false, {
                                            fileName: "[project]/src/components/canvas/ReportCanvas.tsx",
                                            lineNumber: 1499,
                                            columnNumber: 45
                                        }, ("TURBOPACK compile-time value", void 0))
                                    }, widget.id, false, {
                                        fileName: "[project]/src/components/canvas/ReportCanvas.tsx",
                                        lineNumber: 1498,
                                        columnNumber: 41
                                    }, ("TURBOPACK compile-time value", void 0)))
                            }, void 0, false, {
                                fileName: "[project]/src/components/canvas/ReportCanvas.tsx",
                                lineNumber: 1484,
                                columnNumber: 33
                            }, ("TURBOPACK compile-time value", void 0))
                        }, void 0, false, {
                            fileName: "[project]/src/components/canvas/ReportCanvas.tsx",
                            lineNumber: 1458,
                            columnNumber: 21
                        }, ("TURBOPACK compile-time value", void 0))
                    }, void 0, false, {
                        fileName: "[project]/src/components/canvas/ReportCanvas.tsx",
                        lineNumber: 1451,
                        columnNumber: 17
                    }, ("TURBOPACK compile-time value", void 0))
                ]
            }, void 0, true, {
                fileName: "[project]/src/components/canvas/ReportCanvas.tsx",
                lineNumber: 1360,
                columnNumber: 13
            }, ("TURBOPACK compile-time value", void 0)),
            /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$next$2f$dist$2f$server$2f$route$2d$modules$2f$app$2d$page$2f$vendored$2f$ssr$2f$react$2d$jsx$2d$dev$2d$runtime$2e$js__$5b$app$2d$ssr$5d$__$28$ecmascript$29$__["jsxDEV"])(__TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$styled$2d$jsx$2f$style$2e$js__$5b$app$2d$ssr$5d$__$28$ecmascript$29$__["default"], {
                id: "d9c01daba222d1ca",
                children: '.active-widget.jsx-d9c01daba222d1ca{box-shadow:0 0 25px #8b5cf64d;border-color:var(--primary)!important}.canvas-sidebar.jsx-d9c01daba222d1ca{-webkit-backdrop-filter:blur(30px)saturate(170%);background:linear-gradient(#ffffff26,#ffffff0f);border-left:1px solid #ffffff0a;border-right:1px solid #ffffff1f;flex-shrink:0;margin-left:0;position:sticky;box-shadow:inset -1px 0 #ffffff0f}.canvas-sidebar.collapsed.jsx-d9c01daba222d1ca .sidebar-toggle.jsx-d9c01daba222d1ca{position:absolute;transform:none;top:24px!important;right:-12px!important}.sidebar-toggle.jsx-d9c01daba222d1ca:hover{color:var(--foreground)!important;background:#ffffff2e!important;border-color:#ffffff4d!important}.react-resizable-handle{cursor:nwse-resize!important;z-index:20!important;background-image:none!important;width:16px!important;height:16px!important;bottom:8px!important;left:auto!important;right:8px!important}.react-resizable-handle:after{content:"";border-right:2px solid var(--primary);border-bottom:2px solid var(--primary);opacity:.5;width:8px;height:8px;position:absolute;bottom:0;right:0}.react-resizable-handle:hover{opacity:1;transform:scale(1.1)}.react-grid-placeholder{background:var(--primary-glow)!important;opacity:.2!important;border-radius:20px!important}.ds-option.jsx-d9c01daba222d1ca:hover{border-color:var(--primary);background:var(--primary-glow);transform:translateY(-2px)}.visual-type-btn.jsx-d9c01daba222d1ca:hover:not(:disabled){transform:translateY(-1px);background:#ffffff24!important;border-color:#ffffff3d!important}'
            }, void 0, false, void 0, ("TURBOPACK compile-time value", void 0))
        ]
    }, void 0, true, {
        fileName: "[project]/src/components/canvas/ReportCanvas.tsx",
        lineNumber: 604,
        columnNumber: 9
    }, ("TURBOPACK compile-time value", void 0));
});
ReportCanvas.displayName = 'ReportCanvas';
const __TURBOPACK__default__export__ = ReportCanvas;
}),
"[project]/src/components/auth/Auth.tsx [app-ssr] (ecmascript)", ((__turbopack_context__) => {
"use strict";

__turbopack_context__.s([
    "default",
    ()=>Auth
]);
var __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$next$2f$dist$2f$server$2f$route$2d$modules$2f$app$2d$page$2f$vendored$2f$ssr$2f$react$2d$jsx$2d$dev$2d$runtime$2e$js__$5b$app$2d$ssr$5d$__$28$ecmascript$29$__ = __turbopack_context__.i("[project]/node_modules/next/dist/server/route-modules/app-page/vendored/ssr/react-jsx-dev-runtime.js [app-ssr] (ecmascript)");
var __TURBOPACK__imported__module__$5b$project$5d2f$src$2f$lib$2f$supabase$2e$ts__$5b$app$2d$ssr$5d$__$28$ecmascript$29$__ = __turbopack_context__.i("[project]/src/lib/supabase.ts [app-ssr] (ecmascript)");
var __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$framer$2d$motion$2f$dist$2f$es$2f$render$2f$components$2f$motion$2f$proxy$2e$mjs__$5b$app$2d$ssr$5d$__$28$ecmascript$29$__ = __turbopack_context__.i("[project]/node_modules/framer-motion/dist/es/render/components/motion/proxy.mjs [app-ssr] (ecmascript)");
var __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$lucide$2d$react$2f$dist$2f$esm$2f$icons$2f$log$2d$in$2e$js__$5b$app$2d$ssr$5d$__$28$ecmascript$29$__$3c$export__default__as__LogIn$3e$__ = __turbopack_context__.i("[project]/node_modules/lucide-react/dist/esm/icons/log-in.js [app-ssr] (ecmascript) <export default as LogIn>");
'use client';
;
;
;
;
function Auth() {
    const handleGoogleLogin = async ()=>{
        const { error } = await __TURBOPACK__imported__module__$5b$project$5d2f$src$2f$lib$2f$supabase$2e$ts__$5b$app$2d$ssr$5d$__$28$ecmascript$29$__["supabase"].auth.signInWithOAuth({
            provider: 'google',
            options: {
                redirectTo: `${window.location.origin}/auth/callback`
            }
        });
        if (error) console.error('Error logging in:', error.message);
    };
    return /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$next$2f$dist$2f$server$2f$route$2d$modules$2f$app$2d$page$2f$vendored$2f$ssr$2f$react$2d$jsx$2d$dev$2d$runtime$2e$js__$5b$app$2d$ssr$5d$__$28$ecmascript$29$__["jsxDEV"])(__TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$framer$2d$motion$2f$dist$2f$es$2f$render$2f$components$2f$motion$2f$proxy$2e$mjs__$5b$app$2d$ssr$5d$__$28$ecmascript$29$__["motion"].button, {
        whileHover: {
            scale: 1.05
        },
        whileTap: {
            scale: 0.95
        },
        onClick: handleGoogleLogin,
        className: "glass-card",
        style: {
            display: 'flex',
            alignItems: 'center',
            gap: '8px',
            padding: '12px 20px',
            background: 'linear-gradient(180deg, rgba(255,255,255,0.96), rgba(227,236,255,0.88))',
            color: '#08111f',
            border: '1px solid rgba(255,255,255,0.32)',
            borderRadius: '18px',
            cursor: 'pointer',
            fontWeight: 600,
            boxShadow: '0 18px 36px rgba(116, 161, 255, 0.2), inset 0 1px 0 rgba(255,255,255,0.6)'
        },
        children: [
            /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$next$2f$dist$2f$server$2f$route$2d$modules$2f$app$2d$page$2f$vendored$2f$ssr$2f$react$2d$jsx$2d$dev$2d$runtime$2e$js__$5b$app$2d$ssr$5d$__$28$ecmascript$29$__["jsxDEV"])(__TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$lucide$2d$react$2f$dist$2f$esm$2f$icons$2f$log$2d$in$2e$js__$5b$app$2d$ssr$5d$__$28$ecmascript$29$__$3c$export__default__as__LogIn$3e$__["LogIn"], {
                size: 18
            }, void 0, false, {
                fileName: "[project]/src/components/auth/Auth.tsx",
                lineNumber: 38,
                columnNumber: 13
            }, this),
            /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$next$2f$dist$2f$server$2f$route$2d$modules$2f$app$2d$page$2f$vendored$2f$ssr$2f$react$2d$jsx$2d$dev$2d$runtime$2e$js__$5b$app$2d$ssr$5d$__$28$ecmascript$29$__["jsxDEV"])("span", {
                children: "Login with Google"
            }, void 0, false, {
                fileName: "[project]/src/components/auth/Auth.tsx",
                lineNumber: 39,
                columnNumber: 13
            }, this)
        ]
    }, void 0, true, {
        fileName: "[project]/src/components/auth/Auth.tsx",
        lineNumber: 19,
        columnNumber: 9
    }, this);
}
}),
"[project]/src/components/auth/LoginView.tsx [app-ssr] (ecmascript)", ((__turbopack_context__) => {
"use strict";

__turbopack_context__.s([
    "default",
    ()=>LoginView
]);
var __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$next$2f$dist$2f$server$2f$route$2d$modules$2f$app$2d$page$2f$vendored$2f$ssr$2f$react$2d$jsx$2d$dev$2d$runtime$2e$js__$5b$app$2d$ssr$5d$__$28$ecmascript$29$__ = __turbopack_context__.i("[project]/node_modules/next/dist/server/route-modules/app-page/vendored/ssr/react-jsx-dev-runtime.js [app-ssr] (ecmascript)");
var __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$styled$2d$jsx$2f$style$2e$js__$5b$app$2d$ssr$5d$__$28$ecmascript$29$__ = __turbopack_context__.i("[project]/node_modules/styled-jsx/style.js [app-ssr] (ecmascript)");
var __TURBOPACK__imported__module__$5b$project$5d2f$src$2f$components$2f$auth$2f$Auth$2e$tsx__$5b$app$2d$ssr$5d$__$28$ecmascript$29$__ = __turbopack_context__.i("[project]/src/components/auth/Auth.tsx [app-ssr] (ecmascript)");
var __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$framer$2d$motion$2f$dist$2f$es$2f$render$2f$components$2f$motion$2f$proxy$2e$mjs__$5b$app$2d$ssr$5d$__$28$ecmascript$29$__ = __turbopack_context__.i("[project]/node_modules/framer-motion/dist/es/render/components/motion/proxy.mjs [app-ssr] (ecmascript)");
var __TURBOPACK__imported__module__$5b$project$5d2f$src$2f$lib$2f$i18n$2f$LanguageContext$2e$tsx__$5b$app$2d$ssr$5d$__$28$ecmascript$29$__ = __turbopack_context__.i("[project]/src/lib/i18n/LanguageContext.tsx [app-ssr] (ecmascript)");
'use client';
;
;
;
;
;
function LoginView() {
    const { t } = (0, __TURBOPACK__imported__module__$5b$project$5d2f$src$2f$lib$2f$i18n$2f$LanguageContext$2e$tsx__$5b$app$2d$ssr$5d$__$28$ecmascript$29$__["useTranslation"])();
    return /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$next$2f$dist$2f$server$2f$route$2d$modules$2f$app$2d$page$2f$vendored$2f$ssr$2f$react$2d$jsx$2d$dev$2d$runtime$2e$js__$5b$app$2d$ssr$5d$__$28$ecmascript$29$__["jsxDEV"])("div", {
        className: "jsx-2fbfe0e312b1f1bb" + " " + "login-container",
        children: [
            /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$next$2f$dist$2f$server$2f$route$2d$modules$2f$app$2d$page$2f$vendored$2f$ssr$2f$react$2d$jsx$2d$dev$2d$runtime$2e$js__$5b$app$2d$ssr$5d$__$28$ecmascript$29$__["jsxDEV"])("div", {
                className: "jsx-2fbfe0e312b1f1bb" + " " + "background-glow"
            }, void 0, false, {
                fileName: "[project]/src/components/auth/LoginView.tsx",
                lineNumber: 13,
                columnNumber: 13
            }, this),
            /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$next$2f$dist$2f$server$2f$route$2d$modules$2f$app$2d$page$2f$vendored$2f$ssr$2f$react$2d$jsx$2d$dev$2d$runtime$2e$js__$5b$app$2d$ssr$5d$__$28$ecmascript$29$__["jsxDEV"])(__TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$framer$2d$motion$2f$dist$2f$es$2f$render$2f$components$2f$motion$2f$proxy$2e$mjs__$5b$app$2d$ssr$5d$__$28$ecmascript$29$__["motion"].div, {
                initial: {
                    opacity: 0,
                    y: 20
                },
                animate: {
                    opacity: 1,
                    y: 0
                },
                transition: {
                    duration: 0.8
                },
                className: "login-card glass-card",
                children: [
                    /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$next$2f$dist$2f$server$2f$route$2d$modules$2f$app$2d$page$2f$vendored$2f$ssr$2f$react$2d$jsx$2d$dev$2d$runtime$2e$js__$5b$app$2d$ssr$5d$__$28$ecmascript$29$__["jsxDEV"])("div", {
                        className: "jsx-2fbfe0e312b1f1bb" + " " + "logo-section",
                        children: [
                            /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$next$2f$dist$2f$server$2f$route$2d$modules$2f$app$2d$page$2f$vendored$2f$ssr$2f$react$2d$jsx$2d$dev$2d$runtime$2e$js__$5b$app$2d$ssr$5d$__$28$ecmascript$29$__["jsxDEV"])("div", {
                                className: "jsx-2fbfe0e312b1f1bb" + " " + "logo-orb-large"
                            }, void 0, false, {
                                fileName: "[project]/src/components/auth/LoginView.tsx",
                                lineNumber: 22,
                                columnNumber: 21
                            }, this),
                            /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$next$2f$dist$2f$server$2f$route$2d$modules$2f$app$2d$page$2f$vendored$2f$ssr$2f$react$2d$jsx$2d$dev$2d$runtime$2e$js__$5b$app$2d$ssr$5d$__$28$ecmascript$29$__["jsxDEV"])("h1", {
                                className: "jsx-2fbfe0e312b1f1bb" + " " + "logo-text-large",
                                children: "Sphere"
                            }, void 0, false, {
                                fileName: "[project]/src/components/auth/LoginView.tsx",
                                lineNumber: 23,
                                columnNumber: 21
                            }, this)
                        ]
                    }, void 0, true, {
                        fileName: "[project]/src/components/auth/LoginView.tsx",
                        lineNumber: 21,
                        columnNumber: 17
                    }, this),
                    /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$next$2f$dist$2f$server$2f$route$2d$modules$2f$app$2d$page$2f$vendored$2f$ssr$2f$react$2d$jsx$2d$dev$2d$runtime$2e$js__$5b$app$2d$ssr$5d$__$28$ecmascript$29$__["jsxDEV"])("div", {
                        className: "jsx-2fbfe0e312b1f1bb" + " " + "content-section",
                        children: [
                            /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$next$2f$dist$2f$server$2f$route$2d$modules$2f$app$2d$page$2f$vendored$2f$ssr$2f$react$2d$jsx$2d$dev$2d$runtime$2e$js__$5b$app$2d$ssr$5d$__$28$ecmascript$29$__["jsxDEV"])("h2", {
                                className: "jsx-2fbfe0e312b1f1bb" + " " + "welcome-text",
                                children: t('auth.welcome')
                            }, void 0, false, {
                                fileName: "[project]/src/components/auth/LoginView.tsx",
                                lineNumber: 27,
                                columnNumber: 21
                            }, this),
                            /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$next$2f$dist$2f$server$2f$route$2d$modules$2f$app$2d$page$2f$vendored$2f$ssr$2f$react$2d$jsx$2d$dev$2d$runtime$2e$js__$5b$app$2d$ssr$5d$__$28$ecmascript$29$__["jsxDEV"])("p", {
                                className: "jsx-2fbfe0e312b1f1bb" + " " + "welcome-subtext",
                                children: t('auth.welcome_sub')
                            }, void 0, false, {
                                fileName: "[project]/src/components/auth/LoginView.tsx",
                                lineNumber: 28,
                                columnNumber: 21
                            }, this)
                        ]
                    }, void 0, true, {
                        fileName: "[project]/src/components/auth/LoginView.tsx",
                        lineNumber: 26,
                        columnNumber: 17
                    }, this),
                    /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$next$2f$dist$2f$server$2f$route$2d$modules$2f$app$2d$page$2f$vendored$2f$ssr$2f$react$2d$jsx$2d$dev$2d$runtime$2e$js__$5b$app$2d$ssr$5d$__$28$ecmascript$29$__["jsxDEV"])("div", {
                        className: "jsx-2fbfe0e312b1f1bb" + " " + "auth-section",
                        children: /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$next$2f$dist$2f$server$2f$route$2d$modules$2f$app$2d$page$2f$vendored$2f$ssr$2f$react$2d$jsx$2d$dev$2d$runtime$2e$js__$5b$app$2d$ssr$5d$__$28$ecmascript$29$__["jsxDEV"])(__TURBOPACK__imported__module__$5b$project$5d2f$src$2f$components$2f$auth$2f$Auth$2e$tsx__$5b$app$2d$ssr$5d$__$28$ecmascript$29$__["default"], {}, void 0, false, {
                            fileName: "[project]/src/components/auth/LoginView.tsx",
                            lineNumber: 34,
                            columnNumber: 21
                        }, this)
                    }, void 0, false, {
                        fileName: "[project]/src/components/auth/LoginView.tsx",
                        lineNumber: 33,
                        columnNumber: 17
                    }, this),
                    /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$next$2f$dist$2f$server$2f$route$2d$modules$2f$app$2d$page$2f$vendored$2f$ssr$2f$react$2d$jsx$2d$dev$2d$runtime$2e$js__$5b$app$2d$ssr$5d$__$28$ecmascript$29$__["jsxDEV"])("div", {
                        className: "jsx-2fbfe0e312b1f1bb" + " " + "features-mini",
                        children: [
                            /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$next$2f$dist$2f$server$2f$route$2d$modules$2f$app$2d$page$2f$vendored$2f$ssr$2f$react$2d$jsx$2d$dev$2d$runtime$2e$js__$5b$app$2d$ssr$5d$__$28$ecmascript$29$__["jsxDEV"])("div", {
                                className: "jsx-2fbfe0e312b1f1bb" + " " + "feature-dot",
                                children: /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$next$2f$dist$2f$server$2f$route$2d$modules$2f$app$2d$page$2f$vendored$2f$ssr$2f$react$2d$jsx$2d$dev$2d$runtime$2e$js__$5b$app$2d$ssr$5d$__$28$ecmascript$29$__["jsxDEV"])("span", {
                                    className: "jsx-2fbfe0e312b1f1bb",
                                    children: t('auth.features.formats')
                                }, void 0, false, {
                                    fileName: "[project]/src/components/auth/LoginView.tsx",
                                    lineNumber: 38,
                                    columnNumber: 50
                                }, this)
                            }, void 0, false, {
                                fileName: "[project]/src/components/auth/LoginView.tsx",
                                lineNumber: 38,
                                columnNumber: 21
                            }, this),
                            /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$next$2f$dist$2f$server$2f$route$2d$modules$2f$app$2d$page$2f$vendored$2f$ssr$2f$react$2d$jsx$2d$dev$2d$runtime$2e$js__$5b$app$2d$ssr$5d$__$28$ecmascript$29$__["jsxDEV"])("div", {
                                className: "jsx-2fbfe0e312b1f1bb" + " " + "feature-dot",
                                children: /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$next$2f$dist$2f$server$2f$route$2d$modules$2f$app$2d$page$2f$vendored$2f$ssr$2f$react$2d$jsx$2d$dev$2d$runtime$2e$js__$5b$app$2d$ssr$5d$__$28$ecmascript$29$__["jsxDEV"])("span", {
                                    className: "jsx-2fbfe0e312b1f1bb",
                                    children: t('auth.features.speed')
                                }, void 0, false, {
                                    fileName: "[project]/src/components/auth/LoginView.tsx",
                                    lineNumber: 39,
                                    columnNumber: 50
                                }, this)
                            }, void 0, false, {
                                fileName: "[project]/src/components/auth/LoginView.tsx",
                                lineNumber: 39,
                                columnNumber: 21
                            }, this),
                            /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$next$2f$dist$2f$server$2f$route$2d$modules$2f$app$2d$page$2f$vendored$2f$ssr$2f$react$2d$jsx$2d$dev$2d$runtime$2e$js__$5b$app$2d$ssr$5d$__$28$ecmascript$29$__["jsxDEV"])("div", {
                                className: "jsx-2fbfe0e312b1f1bb" + " " + "feature-dot",
                                children: /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$next$2f$dist$2f$server$2f$route$2d$modules$2f$app$2d$page$2f$vendored$2f$ssr$2f$react$2d$jsx$2d$dev$2d$runtime$2e$js__$5b$app$2d$ssr$5d$__$28$ecmascript$29$__["jsxDEV"])("span", {
                                    className: "jsx-2fbfe0e312b1f1bb",
                                    children: t('auth.features.visuals')
                                }, void 0, false, {
                                    fileName: "[project]/src/components/auth/LoginView.tsx",
                                    lineNumber: 40,
                                    columnNumber: 50
                                }, this)
                            }, void 0, false, {
                                fileName: "[project]/src/components/auth/LoginView.tsx",
                                lineNumber: 40,
                                columnNumber: 21
                            }, this)
                        ]
                    }, void 0, true, {
                        fileName: "[project]/src/components/auth/LoginView.tsx",
                        lineNumber: 37,
                        columnNumber: 17
                    }, this)
                ]
            }, void 0, true, {
                fileName: "[project]/src/components/auth/LoginView.tsx",
                lineNumber: 15,
                columnNumber: 13
            }, this),
            /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$next$2f$dist$2f$server$2f$route$2d$modules$2f$app$2d$page$2f$vendored$2f$ssr$2f$react$2d$jsx$2d$dev$2d$runtime$2e$js__$5b$app$2d$ssr$5d$__$28$ecmascript$29$__["jsxDEV"])(__TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$styled$2d$jsx$2f$style$2e$js__$5b$app$2d$ssr$5d$__$28$ecmascript$29$__["default"], {
                id: "2fbfe0e312b1f1bb",
                children: '.login-container.jsx-2fbfe0e312b1f1bb{background:radial-gradient(circle at 0 0,#8fb4ff33,#0000 28%),radial-gradient(circle at 100% 100%,#9df4ff2e,#0000 26%),linear-gradient(#0d1729 0%,#08111f 100%);justify-content:center;align-items:center;width:100vw;height:100vh;padding:24px;display:flex;position:relative;overflow:hidden}.background-glow.jsx-2fbfe0e312b1f1bb{background:radial-gradient(circle,#ffffff38 0%,var(--primary-glow)28%,transparent 72%);opacity:.75;filter:blur(110px);pointer-events:none;width:600px;height:600px;position:absolute;top:50%;left:50%;transform:translate(-50%,-50%)}.login-card.jsx-2fbfe0e312b1f1bb{text-align:center;z-index:10;border:1px solid #ffffff2e;flex-direction:column;align-items:center;width:100%;max-width:480px;padding:60px 40px;display:flex;box-shadow:0 28px 80px #070f1d5c,inset 0 1px #ffffff38}.logo-orb-large.jsx-2fbfe0e312b1f1bb{background:radial-gradient(circle at 30% 30%,#ffffffd9,#ffffff38 30%,transparent 32%),linear-gradient(135deg,var(--primary),var(--secondary));width:80px;height:80px;box-shadow:0 24px 50px var(--primary-glow),inset 0 1px 0 #ffffff61;border-radius:50%;margin-bottom:24px;animation:6s ease-in-out infinite floatOrb;position:relative}.logo-orb-large.jsx-2fbfe0e312b1f1bb:after{content:"";filter:blur(2px);background:#ffffff4d;border-radius:50%;width:20px;height:20px;position:absolute;top:10px;left:10px}.logo-text-large.jsx-2fbfe0e312b1f1bb{letter-spacing:-.06em;-webkit-text-fill-color:transparent;background:linear-gradient(90deg,#fff,#d8e6ff);-webkit-background-clip:text;margin-bottom:32px;font-size:3rem;font-weight:800}.content-section.jsx-2fbfe0e312b1f1bb{margin-bottom:40px}.welcome-text.jsx-2fbfe0e312b1f1bb{color:#fff;margin-bottom:12px;font-size:1.5rem;font-weight:600}.welcome-subtext.jsx-2fbfe0e312b1f1bb{color:var(--text-muted);font-size:1rem;line-height:1.6}.auth-section.jsx-2fbfe0e312b1f1bb{justify-content:center;width:100%;margin-bottom:48px;display:flex}.features-mini.jsx-2fbfe0e312b1f1bb{flex-wrap:wrap;justify-content:center;gap:16px;display:flex}.feature-dot.jsx-2fbfe0e312b1f1bb{color:#e6eefc;background:#ffffff14;border:1px solid #ffffff24;border-radius:999px;padding:6px 14px;font-size:.75rem;font-weight:600;box-shadow:inset 0 1px #ffffff29}@keyframes floatOrb{0%,to{transform:translateY(0)}50%{transform:translateY(-6px)}}'
            }, void 0, false, void 0, this)
        ]
    }, void 0, true, {
        fileName: "[project]/src/components/auth/LoginView.tsx",
        lineNumber: 12,
        columnNumber: 9
    }, this);
}
}),
"[project]/src/components/ui/ThreeDotMenu.tsx [app-ssr] (ecmascript)", ((__turbopack_context__) => {
"use strict";

__turbopack_context__.s([
    "default",
    ()=>ThreeDotMenu
]);
var __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$next$2f$dist$2f$server$2f$route$2d$modules$2f$app$2d$page$2f$vendored$2f$ssr$2f$react$2d$jsx$2d$dev$2d$runtime$2e$js__$5b$app$2d$ssr$5d$__$28$ecmascript$29$__ = __turbopack_context__.i("[project]/node_modules/next/dist/server/route-modules/app-page/vendored/ssr/react-jsx-dev-runtime.js [app-ssr] (ecmascript)");
var __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$styled$2d$jsx$2f$style$2e$js__$5b$app$2d$ssr$5d$__$28$ecmascript$29$__ = __turbopack_context__.i("[project]/node_modules/styled-jsx/style.js [app-ssr] (ecmascript)");
var __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$next$2f$dist$2f$server$2f$route$2d$modules$2f$app$2d$page$2f$vendored$2f$ssr$2f$react$2e$js__$5b$app$2d$ssr$5d$__$28$ecmascript$29$__ = __turbopack_context__.i("[project]/node_modules/next/dist/server/route-modules/app-page/vendored/ssr/react.js [app-ssr] (ecmascript)");
var __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$next$2f$dist$2f$server$2f$route$2d$modules$2f$app$2d$page$2f$vendored$2f$ssr$2f$react$2d$dom$2e$js__$5b$app$2d$ssr$5d$__$28$ecmascript$29$__ = __turbopack_context__.i("[project]/node_modules/next/dist/server/route-modules/app-page/vendored/ssr/react-dom.js [app-ssr] (ecmascript)");
var __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$lucide$2d$react$2f$dist$2f$esm$2f$icons$2f$ellipsis$2d$vertical$2e$js__$5b$app$2d$ssr$5d$__$28$ecmascript$29$__$3c$export__default__as__MoreVertical$3e$__ = __turbopack_context__.i("[project]/node_modules/lucide-react/dist/esm/icons/ellipsis-vertical.js [app-ssr] (ecmascript) <export default as MoreVertical>");
'use client';
;
;
;
;
;
function ThreeDotMenu({ items }) {
    const [isOpen, setIsOpen] = (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$next$2f$dist$2f$server$2f$route$2d$modules$2f$app$2d$page$2f$vendored$2f$ssr$2f$react$2e$js__$5b$app$2d$ssr$5d$__$28$ecmascript$29$__["useState"])(false);
    const [coords, setCoords] = (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$next$2f$dist$2f$server$2f$route$2d$modules$2f$app$2d$page$2f$vendored$2f$ssr$2f$react$2e$js__$5b$app$2d$ssr$5d$__$28$ecmascript$29$__["useState"])({
        top: 0,
        left: 0
    });
    const menuRef = (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$next$2f$dist$2f$server$2f$route$2d$modules$2f$app$2d$page$2f$vendored$2f$ssr$2f$react$2e$js__$5b$app$2d$ssr$5d$__$28$ecmascript$29$__["useRef"])(null);
    const triggerRef = (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$next$2f$dist$2f$server$2f$route$2d$modules$2f$app$2d$page$2f$vendored$2f$ssr$2f$react$2e$js__$5b$app$2d$ssr$5d$__$28$ecmascript$29$__["useRef"])(null);
    const updateCoords = ()=>{
        if (triggerRef.current) {
            const rect = triggerRef.current.getBoundingClientRect();
            setCoords({
                top: rect.bottom + window.scrollY,
                left: rect.right - 160 + window.scrollX // 160 is min-width
            });
        }
    };
    (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$next$2f$dist$2f$server$2f$route$2d$modules$2f$app$2d$page$2f$vendored$2f$ssr$2f$react$2e$js__$5b$app$2d$ssr$5d$__$28$ecmascript$29$__["useEffect"])(()=>{
        if (isOpen) {
            updateCoords();
            window.addEventListener('scroll', updateCoords);
            window.addEventListener('resize', updateCoords);
        }
        return ()=>{
            window.removeEventListener('scroll', updateCoords);
            window.removeEventListener('resize', updateCoords);
        };
    }, [
        isOpen
    ]);
    (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$next$2f$dist$2f$server$2f$route$2d$modules$2f$app$2d$page$2f$vendored$2f$ssr$2f$react$2e$js__$5b$app$2d$ssr$5d$__$28$ecmascript$29$__["useEffect"])(()=>{
        const handleClickOutside = (event)=>{
            if (menuRef.current && !menuRef.current.contains(event.target) && triggerRef.current && !triggerRef.current.contains(event.target)) {
                setIsOpen(false);
            }
        };
        if (isOpen) {
            document.addEventListener('mousedown', handleClickOutside);
        }
        return ()=>{
            document.removeEventListener('mousedown', handleClickOutside);
        };
    }, [
        isOpen
    ]);
    return /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$next$2f$dist$2f$server$2f$route$2d$modules$2f$app$2d$page$2f$vendored$2f$ssr$2f$react$2d$jsx$2d$dev$2d$runtime$2e$js__$5b$app$2d$ssr$5d$__$28$ecmascript$29$__["jsxDEV"])("div", {
        onClick: (e)=>e.stopPropagation(),
        className: "jsx-30b5fb6127ede67e" + " " + "three-dot-menu",
        children: [
            /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$next$2f$dist$2f$server$2f$route$2d$modules$2f$app$2d$page$2f$vendored$2f$ssr$2f$react$2d$jsx$2d$dev$2d$runtime$2e$js__$5b$app$2d$ssr$5d$__$28$ecmascript$29$__["jsxDEV"])("button", {
                ref: triggerRef,
                onClick: (e)=>{
                    e.stopPropagation();
                    e.preventDefault();
                    setIsOpen(!isOpen);
                },
                "aria-label": "Actions",
                className: "jsx-30b5fb6127ede67e" + " " + "menu-toggle",
                children: /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$next$2f$dist$2f$server$2f$route$2d$modules$2f$app$2d$page$2f$vendored$2f$ssr$2f$react$2d$jsx$2d$dev$2d$runtime$2e$js__$5b$app$2d$ssr$5d$__$28$ecmascript$29$__["jsxDEV"])(__TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$lucide$2d$react$2f$dist$2f$esm$2f$icons$2f$ellipsis$2d$vertical$2e$js__$5b$app$2d$ssr$5d$__$28$ecmascript$29$__$3c$export__default__as__MoreVertical$3e$__["MoreVertical"], {
                    size: 18
                }, void 0, false, {
                    fileName: "[project]/src/components/ui/ThreeDotMenu.tsx",
                    lineNumber: 74,
                    columnNumber: 17
                }, this)
            }, void 0, false, {
                fileName: "[project]/src/components/ui/ThreeDotMenu.tsx",
                lineNumber: 64,
                columnNumber: 13
            }, this),
            isOpen && typeof document !== 'undefined' && /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$next$2f$dist$2f$server$2f$route$2d$modules$2f$app$2d$page$2f$vendored$2f$ssr$2f$react$2d$dom$2e$js__$5b$app$2d$ssr$5d$__$28$ecmascript$29$__["createPortal"])(/*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$next$2f$dist$2f$server$2f$route$2d$modules$2f$app$2d$page$2f$vendored$2f$ssr$2f$react$2d$jsx$2d$dev$2d$runtime$2e$js__$5b$app$2d$ssr$5d$__$28$ecmascript$29$__["jsxDEV"])("div", {
                ref: menuRef,
                style: {
                    position: 'absolute',
                    top: `${coords.top + 8}px`,
                    left: `${coords.left}px`,
                    zIndex: 9999
                },
                className: "jsx-30b5fb6127ede67e" + " " + "menu-dropdown glass-card animate-in zoom-in duration-150",
                children: items.map((item, index)=>/*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$next$2f$dist$2f$server$2f$route$2d$modules$2f$app$2d$page$2f$vendored$2f$ssr$2f$react$2d$jsx$2d$dev$2d$runtime$2e$js__$5b$app$2d$ssr$5d$__$28$ecmascript$29$__["jsxDEV"])("button", {
                        onClick: (e)=>{
                            e.stopPropagation();
                            e.preventDefault();
                            item.onClick();
                            setIsOpen(false);
                        },
                        className: "jsx-30b5fb6127ede67e" + " " + `menu-item ${item.variant === 'danger' ? 'danger' : ''}`,
                        children: [
                            item.icon,
                            /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$next$2f$dist$2f$server$2f$route$2d$modules$2f$app$2d$page$2f$vendored$2f$ssr$2f$react$2d$jsx$2d$dev$2d$runtime$2e$js__$5b$app$2d$ssr$5d$__$28$ecmascript$29$__["jsxDEV"])("span", {
                                className: "jsx-30b5fb6127ede67e",
                                children: item.label
                            }, void 0, false, {
                                fileName: "[project]/src/components/ui/ThreeDotMenu.tsx",
                                lineNumber: 100,
                                columnNumber: 29
                            }, this)
                        ]
                    }, index, true, {
                        fileName: "[project]/src/components/ui/ThreeDotMenu.tsx",
                        lineNumber: 89,
                        columnNumber: 25
                    }, this))
            }, void 0, false, {
                fileName: "[project]/src/components/ui/ThreeDotMenu.tsx",
                lineNumber: 78,
                columnNumber: 17
            }, this), document.body),
            /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$next$2f$dist$2f$server$2f$route$2d$modules$2f$app$2d$page$2f$vendored$2f$ssr$2f$react$2d$jsx$2d$dev$2d$runtime$2e$js__$5b$app$2d$ssr$5d$__$28$ecmascript$29$__["jsxDEV"])(__TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$styled$2d$jsx$2f$style$2e$js__$5b$app$2d$ssr$5d$__$28$ecmascript$29$__["default"], {
                id: "30b5fb6127ede67e",
                children: ".three-dot-menu.jsx-30b5fb6127ede67e{display:inline-block;position:relative}.menu-toggle.jsx-30b5fb6127ede67e{color:var(--text-muted);cursor:pointer;background:#ffffff0f;border:1px solid #ffffff1f;border-radius:14px;justify-content:center;align-items:center;padding:6px;transition:all .28s;display:flex;box-shadow:inset 0 1px #ffffff24}.menu-toggle.jsx-30b5fb6127ede67e:hover{color:var(--foreground);background:#ffffff1f;border-color:#ffffff38}.menu-dropdown.jsx-30b5fb6127ede67e{-webkit-backdrop-filter:blur(28px)saturate(180%);background:linear-gradient(#ffffff29,#ffffff14);border:1px solid #ffffff29;border-radius:22px;min-width:160px;padding:8px;box-shadow:0 22px 44px #070f1d4d,inset 0 1px #ffffff2e}.menu-item.jsx-30b5fb6127ede67e{color:#f1f7ffd1;cursor:pointer;text-align:left;background:0 0;border:none;border-radius:14px;align-items:center;gap:12px;width:100%;padding:10px 12px;font-size:.875rem;transition:all .28s;display:flex}.menu-item.jsx-30b5fb6127ede67e:hover{color:var(--foreground);background:#ffffff1a}.menu-item.danger.jsx-30b5fb6127ede67e{color:#f87171}.menu-item.danger.jsx-30b5fb6127ede67e:hover{color:#ef4444;background:#f8717124}"
            }, void 0, false, void 0, this)
        ]
    }, void 0, true, {
        fileName: "[project]/src/components/ui/ThreeDotMenu.tsx",
        lineNumber: 63,
        columnNumber: 9
    }, this);
}
}),
"[project]/src/components/layout/SettingsView.tsx [app-ssr] (ecmascript)", ((__turbopack_context__) => {
"use strict";

__turbopack_context__.s([
    "default",
    ()=>SettingsView
]);
var __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$next$2f$dist$2f$server$2f$route$2d$modules$2f$app$2d$page$2f$vendored$2f$ssr$2f$react$2d$jsx$2d$dev$2d$runtime$2e$js__$5b$app$2d$ssr$5d$__$28$ecmascript$29$__ = __turbopack_context__.i("[project]/node_modules/next/dist/server/route-modules/app-page/vendored/ssr/react-jsx-dev-runtime.js [app-ssr] (ecmascript)");
var __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$styled$2d$jsx$2f$style$2e$js__$5b$app$2d$ssr$5d$__$28$ecmascript$29$__ = __turbopack_context__.i("[project]/node_modules/styled-jsx/style.js [app-ssr] (ecmascript)");
var __TURBOPACK__imported__module__$5b$project$5d2f$src$2f$lib$2f$i18n$2f$LanguageContext$2e$tsx__$5b$app$2d$ssr$5d$__$28$ecmascript$29$__ = __turbopack_context__.i("[project]/src/lib/i18n/LanguageContext.tsx [app-ssr] (ecmascript)");
var __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$lucide$2d$react$2f$dist$2f$esm$2f$icons$2f$globe$2e$js__$5b$app$2d$ssr$5d$__$28$ecmascript$29$__$3c$export__default__as__Globe$3e$__ = __turbopack_context__.i("[project]/node_modules/lucide-react/dist/esm/icons/globe.js [app-ssr] (ecmascript) <export default as Globe>");
'use client';
;
;
;
;
function SettingsView() {
    const { language, setLanguage, t } = (0, __TURBOPACK__imported__module__$5b$project$5d2f$src$2f$lib$2f$i18n$2f$LanguageContext$2e$tsx__$5b$app$2d$ssr$5d$__$28$ecmascript$29$__["useTranslation"])();
    return /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$next$2f$dist$2f$server$2f$route$2d$modules$2f$app$2d$page$2f$vendored$2f$ssr$2f$react$2d$jsx$2d$dev$2d$runtime$2e$js__$5b$app$2d$ssr$5d$__$28$ecmascript$29$__["jsxDEV"])("div", {
        style: {
            padding: '40px',
            maxWidth: '800px'
        },
        className: "jsx-66612cf5bc3e52d6",
        children: [
            /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$next$2f$dist$2f$server$2f$route$2d$modules$2f$app$2d$page$2f$vendored$2f$ssr$2f$react$2d$jsx$2d$dev$2d$runtime$2e$js__$5b$app$2d$ssr$5d$__$28$ecmascript$29$__["jsxDEV"])("header", {
                style: {
                    marginBottom: '48px'
                },
                className: "jsx-66612cf5bc3e52d6",
                children: /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$next$2f$dist$2f$server$2f$route$2d$modules$2f$app$2d$page$2f$vendored$2f$ssr$2f$react$2d$jsx$2d$dev$2d$runtime$2e$js__$5b$app$2d$ssr$5d$__$28$ecmascript$29$__["jsxDEV"])("h1", {
                    style: {
                        fontSize: '2.5rem',
                        fontWeight: 700,
                        marginBottom: '8px'
                    },
                    className: "jsx-66612cf5bc3e52d6",
                    children: t('settings.title')
                }, void 0, false, {
                    fileName: "[project]/src/components/layout/SettingsView.tsx",
                    lineNumber: 13,
                    columnNumber: 17
                }, this)
            }, void 0, false, {
                fileName: "[project]/src/components/layout/SettingsView.tsx",
                lineNumber: 12,
                columnNumber: 13
            }, this),
            /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$next$2f$dist$2f$server$2f$route$2d$modules$2f$app$2d$page$2f$vendored$2f$ssr$2f$react$2d$jsx$2d$dev$2d$runtime$2e$js__$5b$app$2d$ssr$5d$__$28$ecmascript$29$__["jsxDEV"])("section", {
                style: {
                    padding: '32px'
                },
                className: "jsx-66612cf5bc3e52d6" + " " + "glass-card",
                children: [
                    /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$next$2f$dist$2f$server$2f$route$2d$modules$2f$app$2d$page$2f$vendored$2f$ssr$2f$react$2d$jsx$2d$dev$2d$runtime$2e$js__$5b$app$2d$ssr$5d$__$28$ecmascript$29$__["jsxDEV"])("div", {
                        style: {
                            display: 'flex',
                            alignItems: 'center',
                            gap: '16px',
                            marginBottom: '24px'
                        },
                        className: "jsx-66612cf5bc3e52d6",
                        children: [
                            /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$next$2f$dist$2f$server$2f$route$2d$modules$2f$app$2d$page$2f$vendored$2f$ssr$2f$react$2d$jsx$2d$dev$2d$runtime$2e$js__$5b$app$2d$ssr$5d$__$28$ecmascript$29$__["jsxDEV"])("div", {
                                className: "jsx-66612cf5bc3e52d6" + " " + "icon-wrapper",
                                children: /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$next$2f$dist$2f$server$2f$route$2d$modules$2f$app$2d$page$2f$vendored$2f$ssr$2f$react$2d$jsx$2d$dev$2d$runtime$2e$js__$5b$app$2d$ssr$5d$__$28$ecmascript$29$__["jsxDEV"])(__TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$lucide$2d$react$2f$dist$2f$esm$2f$icons$2f$globe$2e$js__$5b$app$2d$ssr$5d$__$28$ecmascript$29$__$3c$export__default__as__Globe$3e$__["Globe"], {
                                    size: 24
                                }, void 0, false, {
                                    fileName: "[project]/src/components/layout/SettingsView.tsx",
                                    lineNumber: 21,
                                    columnNumber: 25
                                }, this)
                            }, void 0, false, {
                                fileName: "[project]/src/components/layout/SettingsView.tsx",
                                lineNumber: 20,
                                columnNumber: 21
                            }, this),
                            /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$next$2f$dist$2f$server$2f$route$2d$modules$2f$app$2d$page$2f$vendored$2f$ssr$2f$react$2d$jsx$2d$dev$2d$runtime$2e$js__$5b$app$2d$ssr$5d$__$28$ecmascript$29$__["jsxDEV"])("div", {
                                className: "jsx-66612cf5bc3e52d6",
                                children: [
                                    /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$next$2f$dist$2f$server$2f$route$2d$modules$2f$app$2d$page$2f$vendored$2f$ssr$2f$react$2d$jsx$2d$dev$2d$runtime$2e$js__$5b$app$2d$ssr$5d$__$28$ecmascript$29$__["jsxDEV"])("h2", {
                                        style: {
                                            fontSize: '1.25rem',
                                            fontWeight: 600,
                                            color: '#fff'
                                        },
                                        className: "jsx-66612cf5bc3e52d6",
                                        children: t('settings.language')
                                    }, void 0, false, {
                                        fileName: "[project]/src/components/layout/SettingsView.tsx",
                                        lineNumber: 24,
                                        columnNumber: 25
                                    }, this),
                                    /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$next$2f$dist$2f$server$2f$route$2d$modules$2f$app$2d$page$2f$vendored$2f$ssr$2f$react$2d$jsx$2d$dev$2d$runtime$2e$js__$5b$app$2d$ssr$5d$__$28$ecmascript$29$__["jsxDEV"])("p", {
                                        style: {
                                            color: 'var(--text-muted)',
                                            fontSize: '0.875rem'
                                        },
                                        className: "jsx-66612cf5bc3e52d6",
                                        children: t('settings.select_language')
                                    }, void 0, false, {
                                        fileName: "[project]/src/components/layout/SettingsView.tsx",
                                        lineNumber: 27,
                                        columnNumber: 25
                                    }, this)
                                ]
                            }, void 0, true, {
                                fileName: "[project]/src/components/layout/SettingsView.tsx",
                                lineNumber: 23,
                                columnNumber: 21
                            }, this)
                        ]
                    }, void 0, true, {
                        fileName: "[project]/src/components/layout/SettingsView.tsx",
                        lineNumber: 19,
                        columnNumber: 17
                    }, this),
                    /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$next$2f$dist$2f$server$2f$route$2d$modules$2f$app$2d$page$2f$vendored$2f$ssr$2f$react$2d$jsx$2d$dev$2d$runtime$2e$js__$5b$app$2d$ssr$5d$__$28$ecmascript$29$__["jsxDEV"])("div", {
                        style: {
                            display: 'flex',
                            gap: '12px'
                        },
                        className: "jsx-66612cf5bc3e52d6",
                        children: [
                            /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$next$2f$dist$2f$server$2f$route$2d$modules$2f$app$2d$page$2f$vendored$2f$ssr$2f$react$2d$jsx$2d$dev$2d$runtime$2e$js__$5b$app$2d$ssr$5d$__$28$ecmascript$29$__["jsxDEV"])("button", {
                                onClick: ()=>setLanguage('en'),
                                className: "jsx-66612cf5bc3e52d6" + " " + `lang-btn ${language === 'en' ? 'active' : ''}`,
                                children: t('settings.english')
                            }, void 0, false, {
                                fileName: "[project]/src/components/layout/SettingsView.tsx",
                                lineNumber: 34,
                                columnNumber: 21
                            }, this),
                            /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$next$2f$dist$2f$server$2f$route$2d$modules$2f$app$2d$page$2f$vendored$2f$ssr$2f$react$2d$jsx$2d$dev$2d$runtime$2e$js__$5b$app$2d$ssr$5d$__$28$ecmascript$29$__["jsxDEV"])("button", {
                                onClick: ()=>setLanguage('es'),
                                className: "jsx-66612cf5bc3e52d6" + " " + `lang-btn ${language === 'es' ? 'active' : ''}`,
                                children: t('settings.spanish')
                            }, void 0, false, {
                                fileName: "[project]/src/components/layout/SettingsView.tsx",
                                lineNumber: 40,
                                columnNumber: 21
                            }, this)
                        ]
                    }, void 0, true, {
                        fileName: "[project]/src/components/layout/SettingsView.tsx",
                        lineNumber: 33,
                        columnNumber: 17
                    }, this)
                ]
            }, void 0, true, {
                fileName: "[project]/src/components/layout/SettingsView.tsx",
                lineNumber: 18,
                columnNumber: 13
            }, this),
            /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$next$2f$dist$2f$server$2f$route$2d$modules$2f$app$2d$page$2f$vendored$2f$ssr$2f$react$2d$jsx$2d$dev$2d$runtime$2e$js__$5b$app$2d$ssr$5d$__$28$ecmascript$29$__["jsxDEV"])(__TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$styled$2d$jsx$2f$style$2e$js__$5b$app$2d$ssr$5d$__$28$ecmascript$29$__["default"], {
                id: "66612cf5bc3e52d6",
                children: ".icon-wrapper.jsx-66612cf5bc3e52d6{color:#fff;background:linear-gradient(#ffffff29,#ffffff14);border:1px solid #ffffff1f;border-radius:18px;justify-content:center;align-items:center;padding:12px;display:flex;box-shadow:inset 0 1px #ffffff2e}.lang-btn.jsx-66612cf5bc3e52d6{color:var(--foreground);cursor:pointer;background:#ffffff14;border:1px solid #ffffff24;border-radius:18px;flex:1;padding:16px;font-weight:600;transition:all .28s;box-shadow:inset 0 1px #ffffff24}.lang-btn.jsx-66612cf5bc3e52d6:hover{background:#ffffff1f;border-color:#ffffff3d;transform:translateY(-1px)}.lang-btn.active.jsx-66612cf5bc3e52d6{color:#fff;background:linear-gradient(#a6c4ff47,#89b6ff29);border-color:#c4d9ff47;box-shadow:0 18px 34px #74a1ff29,inset 0 1px #fff3}"
            }, void 0, false, void 0, this)
        ]
    }, void 0, true, {
        fileName: "[project]/src/components/layout/SettingsView.tsx",
        lineNumber: 11,
        columnNumber: 9
    }, this);
}
}),
"[project]/src/components/Dashboard.tsx [app-ssr] (ecmascript)", ((__turbopack_context__) => {
"use strict";

__turbopack_context__.s([
    "default",
    ()=>Dashboard
]);
var __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$next$2f$dist$2f$server$2f$route$2d$modules$2f$app$2d$page$2f$vendored$2f$ssr$2f$react$2d$jsx$2d$dev$2d$runtime$2e$js__$5b$app$2d$ssr$5d$__$28$ecmascript$29$__ = __turbopack_context__.i("[project]/node_modules/next/dist/server/route-modules/app-page/vendored/ssr/react-jsx-dev-runtime.js [app-ssr] (ecmascript)");
var __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$styled$2d$jsx$2f$style$2e$js__$5b$app$2d$ssr$5d$__$28$ecmascript$29$__ = __turbopack_context__.i("[project]/node_modules/styled-jsx/style.js [app-ssr] (ecmascript)");
var __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$next$2f$dist$2f$server$2f$route$2d$modules$2f$app$2d$page$2f$vendored$2f$ssr$2f$react$2e$js__$5b$app$2d$ssr$5d$__$28$ecmascript$29$__ = __turbopack_context__.i("[project]/node_modules/next/dist/server/route-modules/app-page/vendored/ssr/react.js [app-ssr] (ecmascript)");
var __TURBOPACK__imported__module__$5b$project$5d2f$src$2f$lib$2f$supabase$2e$ts__$5b$app$2d$ssr$5d$__$28$ecmascript$29$__ = __turbopack_context__.i("[project]/src/lib/supabase.ts [app-ssr] (ecmascript)");
var __TURBOPACK__imported__module__$5b$project$5d2f$src$2f$lib$2f$persistence$2e$ts__$5b$app$2d$ssr$5d$__$28$ecmascript$29$__ = __turbopack_context__.i("[project]/src/lib/persistence.ts [app-ssr] (ecmascript)");
var __TURBOPACK__imported__module__$5b$project$5d2f$src$2f$lib$2f$profiler$2e$ts__$5b$app$2d$ssr$5d$__$28$ecmascript$29$__ = __turbopack_context__.i("[project]/src/lib/profiler.ts [app-ssr] (ecmascript)");
var __TURBOPACK__imported__module__$5b$project$5d2f$src$2f$components$2f$layout$2f$DashboardLayout$2e$tsx__$5b$app$2d$ssr$5d$__$28$ecmascript$29$__ = __turbopack_context__.i("[project]/src/components/layout/DashboardLayout.tsx [app-ssr] (ecmascript)");
var __TURBOPACK__imported__module__$5b$project$5d2f$src$2f$components$2f$upload$2f$FileDropzone$2e$tsx__$5b$app$2d$ssr$5d$__$28$ecmascript$29$__ = __turbopack_context__.i("[project]/src/components/upload/FileDropzone.tsx [app-ssr] (ecmascript)");
var __TURBOPACK__imported__module__$5b$project$5d2f$src$2f$components$2f$ui$2f$DataTable$2e$tsx__$5b$app$2d$ssr$5d$__$28$ecmascript$29$__ = __turbopack_context__.i("[project]/src/components/ui/DataTable.tsx [app-ssr] (ecmascript)");
var __TURBOPACK__imported__module__$5b$project$5d2f$src$2f$components$2f$canvas$2f$ReportCanvas$2e$tsx__$5b$app$2d$ssr$5d$__$28$ecmascript$29$__ = __turbopack_context__.i("[project]/src/components/canvas/ReportCanvas.tsx [app-ssr] (ecmascript)");
var __TURBOPACK__imported__module__$5b$project$5d2f$src$2f$components$2f$auth$2f$LoginView$2e$tsx__$5b$app$2d$ssr$5d$__$28$ecmascript$29$__ = __turbopack_context__.i("[project]/src/components/auth/LoginView.tsx [app-ssr] (ecmascript)");
var __TURBOPACK__imported__module__$5b$project$5d2f$src$2f$components$2f$ui$2f$ThreeDotMenu$2e$tsx__$5b$app$2d$ssr$5d$__$28$ecmascript$29$__ = __turbopack_context__.i("[project]/src/components/ui/ThreeDotMenu.tsx [app-ssr] (ecmascript)");
var __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$lucide$2d$react$2f$dist$2f$esm$2f$icons$2f$arrow$2d$right$2e$js__$5b$app$2d$ssr$5d$__$28$ecmascript$29$__$3c$export__default__as__ArrowRight$3e$__ = __turbopack_context__.i("[project]/node_modules/lucide-react/dist/esm/icons/arrow-right.js [app-ssr] (ecmascript) <export default as ArrowRight>");
var __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$lucide$2d$react$2f$dist$2f$esm$2f$icons$2f$activity$2e$js__$5b$app$2d$ssr$5d$__$28$ecmascript$29$__$3c$export__default__as__Activity$3e$__ = __turbopack_context__.i("[project]/node_modules/lucide-react/dist/esm/icons/activity.js [app-ssr] (ecmascript) <export default as Activity>");
var __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$lucide$2d$react$2f$dist$2f$esm$2f$icons$2f$database$2e$js__$5b$app$2d$ssr$5d$__$28$ecmascript$29$__$3c$export__default__as__Database$3e$__ = __turbopack_context__.i("[project]/node_modules/lucide-react/dist/esm/icons/database.js [app-ssr] (ecmascript) <export default as Database>");
var __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$lucide$2d$react$2f$dist$2f$esm$2f$icons$2f$file$2d$text$2e$js__$5b$app$2d$ssr$5d$__$28$ecmascript$29$__$3c$export__default__as__FileText$3e$__ = __turbopack_context__.i("[project]/node_modules/lucide-react/dist/esm/icons/file-text.js [app-ssr] (ecmascript) <export default as FileText>");
var __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$lucide$2d$react$2f$dist$2f$esm$2f$icons$2f$plus$2e$js__$5b$app$2d$ssr$5d$__$28$ecmascript$29$__$3c$export__default__as__Plus$3e$__ = __turbopack_context__.i("[project]/node_modules/lucide-react/dist/esm/icons/plus.js [app-ssr] (ecmascript) <export default as Plus>");
var __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$lucide$2d$react$2f$dist$2f$esm$2f$icons$2f$pen$2e$js__$5b$app$2d$ssr$5d$__$28$ecmascript$29$__$3c$export__default__as__Edit2$3e$__ = __turbopack_context__.i("[project]/node_modules/lucide-react/dist/esm/icons/pen.js [app-ssr] (ecmascript) <export default as Edit2>");
var __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$lucide$2d$react$2f$dist$2f$esm$2f$icons$2f$external$2d$link$2e$js__$5b$app$2d$ssr$5d$__$28$ecmascript$29$__$3c$export__default__as__ExternalLink$3e$__ = __turbopack_context__.i("[project]/node_modules/lucide-react/dist/esm/icons/external-link.js [app-ssr] (ecmascript) <export default as ExternalLink>");
var __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$lucide$2d$react$2f$dist$2f$esm$2f$icons$2f$trash$2d$2$2e$js__$5b$app$2d$ssr$5d$__$28$ecmascript$29$__$3c$export__default__as__Trash2$3e$__ = __turbopack_context__.i("[project]/node_modules/lucide-react/dist/esm/icons/trash-2.js [app-ssr] (ecmascript) <export default as Trash2>");
var __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$lucide$2d$react$2f$dist$2f$esm$2f$icons$2f$hash$2e$js__$5b$app$2d$ssr$5d$__$28$ecmascript$29$__$3c$export__default__as__Hash$3e$__ = __turbopack_context__.i("[project]/node_modules/lucide-react/dist/esm/icons/hash.js [app-ssr] (ecmascript) <export default as Hash>");
var __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$lucide$2d$react$2f$dist$2f$esm$2f$icons$2f$a$2d$large$2d$small$2e$js__$5b$app$2d$ssr$5d$__$28$ecmascript$29$__$3c$export__default__as__ALargeSmall$3e$__ = __turbopack_context__.i("[project]/node_modules/lucide-react/dist/esm/icons/a-large-small.js [app-ssr] (ecmascript) <export default as ALargeSmall>");
var __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$lucide$2d$react$2f$dist$2f$esm$2f$icons$2f$calendar$2e$js__$5b$app$2d$ssr$5d$__$28$ecmascript$29$__$3c$export__default__as__Calendar$3e$__ = __turbopack_context__.i("[project]/node_modules/lucide-react/dist/esm/icons/calendar.js [app-ssr] (ecmascript) <export default as Calendar>");
var __TURBOPACK__imported__module__$5b$project$5d2f$src$2f$lib$2f$i18n$2f$LanguageContext$2e$tsx__$5b$app$2d$ssr$5d$__$28$ecmascript$29$__ = __turbopack_context__.i("[project]/src/lib/i18n/LanguageContext.tsx [app-ssr] (ecmascript)");
var __TURBOPACK__imported__module__$5b$project$5d2f$src$2f$components$2f$layout$2f$SettingsView$2e$tsx__$5b$app$2d$ssr$5d$__$28$ecmascript$29$__ = __turbopack_context__.i("[project]/src/components/layout/SettingsView.tsx [app-ssr] (ecmascript)");
var __TURBOPACK__imported__module__$5b$project$5d2f$src$2f$lib$2f$dateUtils$2e$ts__$5b$app$2d$ssr$5d$__$28$ecmascript$29$__ = __turbopack_context__.i("[project]/src/lib/dateUtils.ts [app-ssr] (ecmascript)");
'use client';
;
;
;
;
;
;
;
;
;
;
;
;
;
;
;
;
function DashboardContent() {
    const { t } = (0, __TURBOPACK__imported__module__$5b$project$5d2f$src$2f$lib$2f$i18n$2f$LanguageContext$2e$tsx__$5b$app$2d$ssr$5d$__$28$ecmascript$29$__["useTranslation"])();
    const [activeView, setActiveView] = (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$next$2f$dist$2f$server$2f$route$2d$modules$2f$app$2d$page$2f$vendored$2f$ssr$2f$react$2e$js__$5b$app$2d$ssr$5d$__$28$ecmascript$29$__["useState"])('home');
    const [step, setStep] = (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$next$2f$dist$2f$server$2f$route$2d$modules$2f$app$2d$page$2f$vendored$2f$ssr$2f$react$2e$js__$5b$app$2d$ssr$5d$__$28$ecmascript$29$__["useState"])('main');
    const [dataset, setDataset] = (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$next$2f$dist$2f$server$2f$route$2d$modules$2f$app$2d$page$2f$vendored$2f$ssr$2f$react$2e$js__$5b$app$2d$ssr$5d$__$28$ecmascript$29$__["useState"])(null);
    const [isProfiling, setIsProfiling] = (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$next$2f$dist$2f$server$2f$route$2d$modules$2f$app$2d$page$2f$vendored$2f$ssr$2f$react$2e$js__$5b$app$2d$ssr$5d$__$28$ecmascript$29$__["useState"])(false);
    const [user, setUser] = (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$next$2f$dist$2f$server$2f$route$2d$modules$2f$app$2d$page$2f$vendored$2f$ssr$2f$react$2e$js__$5b$app$2d$ssr$5d$__$28$ecmascript$29$__["useState"])(undefined);
    const [savedDatasets, setSavedDatasets] = (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$next$2f$dist$2f$server$2f$route$2d$modules$2f$app$2d$page$2f$vendored$2f$ssr$2f$react$2e$js__$5b$app$2d$ssr$5d$__$28$ecmascript$29$__["useState"])([]);
    const [savedReports, setSavedReports] = (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$next$2f$dist$2f$server$2f$route$2d$modules$2f$app$2d$page$2f$vendored$2f$ssr$2f$react$2e$js__$5b$app$2d$ssr$5d$__$28$ecmascript$29$__["useState"])([]);
    const [isLoadingSaved, setIsLoadingSaved] = (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$next$2f$dist$2f$server$2f$route$2d$modules$2f$app$2d$page$2f$vendored$2f$ssr$2f$react$2e$js__$5b$app$2d$ssr$5d$__$28$ecmascript$29$__["useState"])(false);
    const [previewView, setPreviewView] = (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$next$2f$dist$2f$server$2f$route$2d$modules$2f$app$2d$page$2f$vendored$2f$ssr$2f$react$2e$js__$5b$app$2d$ssr$5d$__$28$ecmascript$29$__["useState"])('preview');
    const [initialReportId, setInitialReportId] = (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$next$2f$dist$2f$server$2f$route$2d$modules$2f$app$2d$page$2f$vendored$2f$ssr$2f$react$2e$js__$5b$app$2d$ssr$5d$__$28$ecmascript$29$__["useState"])(null);
    const [hasUnsavedChanges, setHasUnsavedChanges] = (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$next$2f$dist$2f$server$2f$route$2d$modules$2f$app$2d$page$2f$vendored$2f$ssr$2f$react$2e$js__$5b$app$2d$ssr$5d$__$28$ecmascript$29$__["useState"])(false);
    const [showConfirmModal, setShowConfirmModal] = (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$next$2f$dist$2f$server$2f$route$2d$modules$2f$app$2d$page$2f$vendored$2f$ssr$2f$react$2e$js__$5b$app$2d$ssr$5d$__$28$ecmascript$29$__["useState"])(false);
    const [pendingNavigation, setPendingNavigation] = (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$next$2f$dist$2f$server$2f$route$2d$modules$2f$app$2d$page$2f$vendored$2f$ssr$2f$react$2e$js__$5b$app$2d$ssr$5d$__$28$ecmascript$29$__["useState"])(null);
    const [pendingExcelFile, setPendingExcelFile] = (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$next$2f$dist$2f$server$2f$route$2d$modules$2f$app$2d$page$2f$vendored$2f$ssr$2f$react$2e$js__$5b$app$2d$ssr$5d$__$28$ecmascript$29$__["useState"])(null);
    const [availableSheets, setAvailableSheets] = (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$next$2f$dist$2f$server$2f$route$2d$modules$2f$app$2d$page$2f$vendored$2f$ssr$2f$react$2e$js__$5b$app$2d$ssr$5d$__$28$ecmascript$29$__["useState"])([]);
    const [selectedSheet, setSelectedSheet] = (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$next$2f$dist$2f$server$2f$route$2d$modules$2f$app$2d$page$2f$vendored$2f$ssr$2f$react$2e$js__$5b$app$2d$ssr$5d$__$28$ecmascript$29$__["useState"])('');
    const canvasRef = __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$next$2f$dist$2f$server$2f$route$2d$modules$2f$app$2d$page$2f$vendored$2f$ssr$2f$react$2e$js__$5b$app$2d$ssr$5d$__$28$ecmascript$29$__["default"].useRef(null);
    const handleViewChange = (view)=>{
        if (hasUnsavedChanges) {
            setPendingNavigation({
                view,
                step: 'main'
            });
            setShowConfirmModal(true);
            return;
        }
        setActiveView(view);
        setStep('main');
        setInitialReportId(null);
    };
    const confirmNavigation = (action)=>{
        if (action === 'cancel') {
            setShowConfirmModal(false);
            setPendingNavigation(null);
            return;
        }
        if (action === 'discard') {
            setHasUnsavedChanges(false);
            if (pendingNavigation) {
                executePendingNavigation();
            } else {
                setStep('main');
                setInitialReportId(null);
                setShowConfirmModal(false);
            }
            return;
        }
        if (action === 'save' || action === 'saveAs') {
            if (canvasRef.current) {
                canvasRef.current.handleSave(action === 'saveAs').then(()=>{
                    setHasUnsavedChanges(false);
                    if (user) fetchSavedReports(user.id); // Refresh reports after save
                    executePendingNavigation();
                });
            }
            return;
        }
    };
    const executePendingNavigation = ()=>{
        if (pendingNavigation) {
            if (pendingNavigation.view) setActiveView(pendingNavigation.view);
            // Default to 'main' step if not specified, crucial for exiting canvas
            setStep(pendingNavigation.step || 'main');
            setInitialReportId(null);
        } else {
            setStep('main');
            setInitialReportId(null);
        }
        setShowConfirmModal(false);
        setPendingNavigation(null);
    };
    (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$next$2f$dist$2f$server$2f$route$2d$modules$2f$app$2d$page$2f$vendored$2f$ssr$2f$react$2e$js__$5b$app$2d$ssr$5d$__$28$ecmascript$29$__["useEffect"])(()=>{
        let isInitialFetch = true;
        const { data: { subscription } } = __TURBOPACK__imported__module__$5b$project$5d2f$src$2f$lib$2f$supabase$2e$ts__$5b$app$2d$ssr$5d$__$28$ecmascript$29$__["supabase"].auth.onAuthStateChange(async (event, session)=>{
            console.log('Auth event:', event, !!session);
            const currentUser = session?.user ?? null;
            // Set user state
            setUser(currentUser);
            if (currentUser) {
                if (isInitialFetch || event === 'SIGNED_IN' || event === 'INITIAL_SESSION') {
                    fetchSavedDatasets(currentUser.id);
                    fetchSavedReports(currentUser.id);
                    isInitialFetch = false;
                }
            } else if (event === 'INITIAL_SESSION' || event === 'SIGNED_OUT') {
                setSavedDatasets([]);
                // Wait a bit to ensure we didn't just miss a fast redirect
                setTimeout(()=>{
                    setUser((prev)=>prev === undefined ? null : prev);
                }, 600);
            }
        });
        return ()=>subscription.unsubscribe();
    }, []);
    const fetchSavedDatasets = async (userId)=>{
        const uid = userId || user?.id;
        if (!uid) return;
        setIsLoadingSaved(true);
        const data = await (0, __TURBOPACK__imported__module__$5b$project$5d2f$src$2f$lib$2f$persistence$2e$ts__$5b$app$2d$ssr$5d$__$28$ecmascript$29$__["getDatasets"])(uid);
        setSavedDatasets(data);
        setIsLoadingSaved(false);
    };
    const fetchSavedReports = async (userId)=>{
        const uid = userId || user?.id;
        if (!uid) return;
        const data = await (0, __TURBOPACK__imported__module__$5b$project$5d2f$src$2f$lib$2f$persistence$2e$ts__$5b$app$2d$ssr$5d$__$28$ecmascript$29$__["getReports"])(uid);
        setSavedReports(data);
    };
    const handleLogout = async ()=>{
        await __TURBOPACK__imported__module__$5b$project$5d2f$src$2f$lib$2f$supabase$2e$ts__$5b$app$2d$ssr$5d$__$28$ecmascript$29$__["supabase"].auth.signOut();
    };
    const handleFileSelect = async (file)=>{
        if (!user) return;
        const canUpload = await (0, __TURBOPACK__imported__module__$5b$project$5d2f$src$2f$lib$2f$persistence$2e$ts__$5b$app$2d$ssr$5d$__$28$ecmascript$29$__["checkDatasetLimit"])(user.id);
        if (!canUpload) {
            alert('Límite de datasets alcanzado (3).');
            return;
        }
        const extension = file.name.split('.').pop()?.toLowerCase();
        if (extension === 'xlsx' || extension === 'xls') {
            try {
                const sheets = await (0, __TURBOPACK__imported__module__$5b$project$5d2f$src$2f$lib$2f$profiler$2e$ts__$5b$app$2d$ssr$5d$__$28$ecmascript$29$__["getExcelSheetNames"])(file);
                if (sheets.length > 1) {
                    setPendingExcelFile(file);
                    setAvailableSheets(sheets);
                    setSelectedSheet(sheets[0]);
                    setStep('main'); // Just to be sure we are in a clean state
                    // We'll use a new step or conditional rendering in 'upload' view
                    setActiveView('upload');
                    return;
                }
            } catch (err) {
                console.error('Error reading Excel sheets:', err);
            }
        }
        await processFile(file);
    };
    const processFile = async (file, sheetName)=>{
        if (!user) return;
        setIsProfiling(true);
        setStep('profiling');
        try {
            const profile = await (0, __TURBOPACK__imported__module__$5b$project$5d2f$src$2f$lib$2f$profiler$2e$ts__$5b$app$2d$ssr$5d$__$28$ecmascript$29$__["profileFile"])(file, sheetName);
            const datasetName = sheetName ? `${file.name} (${sheetName})` : file.name;
            const datasetData = {
                name: datasetName,
                ...profile
            };
            setDataset(datasetData);
            if (user) {
                const url = await (0, __TURBOPACK__imported__module__$5b$project$5d2f$src$2f$lib$2f$persistence$2e$ts__$5b$app$2d$ssr$5d$__$28$ecmascript$29$__["uploadFile"])(file, user.id);
                if (url) {
                    const savedDs = await (0, __TURBOPACK__imported__module__$5b$project$5d2f$src$2f$lib$2f$persistence$2e$ts__$5b$app$2d$ssr$5d$__$28$ecmascript$29$__["saveDataset"])({
                        user_id: user.id,
                        name: datasetName,
                        file_url: url,
                        sheet_name: sheetName,
                        columns: profile.columns,
                        stats: profile.stats
                    });
                    setDataset({
                        id: savedDs.id,
                        name: datasetName,
                        ...profile
                    });
                    fetchSavedDatasets(user.id);
                }
            }
        } catch (err) {
            console.error('Error profiling file:', err);
            alert('Failed to process file.');
            setStep('main');
        } finally{
            setIsProfiling(false);
            setPendingExcelFile(null);
            setAvailableSheets([]);
        }
    };
    const handleLoadSavedDataset = async (saved)=>{
        setIsProfiling(true);
        setStep('profiling');
        try {
            const profile = await (0, __TURBOPACK__imported__module__$5b$project$5d2f$src$2f$lib$2f$profiler$2e$ts__$5b$app$2d$ssr$5d$__$28$ecmascript$29$__["profileFromUrl"])(saved.file_url, saved.name, saved.sheet_name);
            setDataset({
                id: saved.id,
                name: saved.name,
                ...profile
            });
        } catch (err) {
            console.error('Error loading saved dataset:', err);
            alert('Failed to load saved dataset.');
            setStep('main');
        } finally{
            setIsProfiling(false);
        }
    };
    const handleLoadSavedReport = async (report)=>{
        setIsProfiling(true);
        setStep('profiling');
        try {
            // 1. Find the dataset metadata
            let ds = savedDatasets.find((d)=>d.id === report.dataset_id);
            if (!ds && user) {
                const datasets = await (0, __TURBOPACK__imported__module__$5b$project$5d2f$src$2f$lib$2f$persistence$2e$ts__$5b$app$2d$ssr$5d$__$28$ecmascript$29$__["getDatasets"])(user.id);
                ds = datasets.find((d)=>d.id === report.dataset_id);
            }
            if (!ds) throw new Error('Dataset no encontrado');
            const profile = await (0, __TURBOPACK__imported__module__$5b$project$5d2f$src$2f$lib$2f$profiler$2e$ts__$5b$app$2d$ssr$5d$__$28$ecmascript$29$__["profileFromUrl"])(ds.file_url, ds.name, ds.sheet_name);
            setDataset({
                id: ds.id,
                name: ds.name,
                ...profile
            });
            // 2. Switch to canvas
            setInitialReportId(report.id);
            setStep('canvas');
        } catch (err) {
            console.error('Error loading report:', err);
            alert('Fallo al cargar el reporte.');
            setStep('main');
        } finally{
            setIsProfiling(false);
        }
    };
    const handleDeleteDataset = async (ds)=>{
        console.log('handleDeleteDataset triggered for:', ds.id);
        const reportsUsingDs = savedReports.filter((r)=>r.dataset_id === ds.id);
        if (reportsUsingDs.length > 0) {
            const names = reportsUsingDs.map((r)=>`"${r.name}"`).join(', ');
            alert(`No se puede eliminar este dataset porque está siendo usado por los reportes: ${names}. Elimina los reportes primero.`);
            return;
        }
        if (window.confirm('¿Estás seguro de que deseas eliminar este dataset y todos sus datos?')) {
            try {
                setIsProfiling(true);
                console.log('Confirmation received, deleting from Supabase:', ds.id);
                if (user) await (0, __TURBOPACK__imported__module__$5b$project$5d2f$src$2f$lib$2f$persistence$2e$ts__$5b$app$2d$ssr$5d$__$28$ecmascript$29$__["deleteDataset"])(ds.id, ds.file_url, user.id);
                console.log('Deletion successful, updating local state and refetching...');
                // 1. Update local state immediately for fast UI feedback
                setSavedDatasets((prev)=>prev.filter((d)=>d.id !== ds.id));
                // 2. Refetch to sync with DB
                if (user) {
                    const updatedDatasets = await (0, __TURBOPACK__imported__module__$5b$project$5d2f$src$2f$lib$2f$persistence$2e$ts__$5b$app$2d$ssr$5d$__$28$ecmascript$29$__["getDatasets"])(user.id);
                    setSavedDatasets(updatedDatasets);
                }
                // Explicitly clear the current dataset if it was the one deleted
                if (dataset?.id === ds.id) {
                    setDataset(null);
                    setStep('main');
                }
                alert('Dataset eliminado correctamente.');
            } catch (err) {
                console.error('Error in handleDeleteDataset:', err);
                alert(`Error al eliminar el dataset: ${err.message || 'Error desconocido'}`);
            } finally{
                setIsProfiling(false);
            }
        }
    };
    const handleDeleteReport = async (reportId)=>{
        if (confirm('¿Estás seguro de que deseas eliminar este reporte?')) {
            try {
                if (user) await (0, __TURBOPACK__imported__module__$5b$project$5d2f$src$2f$lib$2f$persistence$2e$ts__$5b$app$2d$ssr$5d$__$28$ecmascript$29$__["deleteReport"])(reportId, user.id);
                if (user) fetchSavedReports(user.id);
            } catch (error) {
                alert('Error al eliminar el reporte.');
            }
        }
    };
    const handleRenameReport = async (report)=>{
        const newName = prompt('Nuevo nombre para el reporte:', report.name);
        if (newName && newName.trim() !== '' && newName !== report.name) {
            try {
                if (user) await (0, __TURBOPACK__imported__module__$5b$project$5d2f$src$2f$lib$2f$persistence$2e$ts__$5b$app$2d$ssr$5d$__$28$ecmascript$29$__["updateReportName"])(report.id, newName.trim(), user.id);
                if (user) fetchSavedReports(user.id);
            } catch  {
                alert('Error al eliminar el reporte.');
            }
        }
    };
    if (user === undefined) {
        return /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$next$2f$dist$2f$server$2f$route$2d$modules$2f$app$2d$page$2f$vendored$2f$ssr$2f$react$2d$jsx$2d$dev$2d$runtime$2e$js__$5b$app$2d$ssr$5d$__$28$ecmascript$29$__["jsxDEV"])("div", {
            style: {
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                height: '100vh',
                background: 'var(--background)'
            },
            className: "jsx-9626265f2ba9c813",
            children: [
                /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$next$2f$dist$2f$server$2f$route$2d$modules$2f$app$2d$page$2f$vendored$2f$ssr$2f$react$2d$jsx$2d$dev$2d$runtime$2e$js__$5b$app$2d$ssr$5d$__$28$ecmascript$29$__["jsxDEV"])("div", {
                    style: {
                        color: 'var(--primary)',
                        textAlign: 'center'
                    },
                    className: "jsx-9626265f2ba9c813" + " " + "animate-pulse",
                    children: [
                        /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$next$2f$dist$2f$server$2f$route$2d$modules$2f$app$2d$page$2f$vendored$2f$ssr$2f$react$2d$jsx$2d$dev$2d$runtime$2e$js__$5b$app$2d$ssr$5d$__$28$ecmascript$29$__["jsxDEV"])("div", {
                            style: {
                                width: '40px',
                                height: '40px',
                                margin: '0 auto 16px'
                            },
                            className: "jsx-9626265f2ba9c813" + " " + "logo-orb"
                        }, void 0, false, {
                            fileName: "[project]/src/components/Dashboard.tsx",
                            lineNumber: 326,
                            columnNumber: 21
                        }, this),
                        /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$next$2f$dist$2f$server$2f$route$2d$modules$2f$app$2d$page$2f$vendored$2f$ssr$2f$react$2d$jsx$2d$dev$2d$runtime$2e$js__$5b$app$2d$ssr$5d$__$28$ecmascript$29$__["jsxDEV"])("p", {
                            className: "jsx-9626265f2ba9c813",
                            children: "Preparando tu espacio..."
                        }, void 0, false, {
                            fileName: "[project]/src/components/Dashboard.tsx",
                            lineNumber: 327,
                            columnNumber: 21
                        }, this)
                    ]
                }, void 0, true, {
                    fileName: "[project]/src/components/Dashboard.tsx",
                    lineNumber: 325,
                    columnNumber: 17
                }, this),
                /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$next$2f$dist$2f$server$2f$route$2d$modules$2f$app$2d$page$2f$vendored$2f$ssr$2f$react$2d$jsx$2d$dev$2d$runtime$2e$js__$5b$app$2d$ssr$5d$__$28$ecmascript$29$__["jsxDEV"])(__TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$styled$2d$jsx$2f$style$2e$js__$5b$app$2d$ssr$5d$__$28$ecmascript$29$__["default"], {
                    id: "9626265f2ba9c813",
                    children: ".logo-orb.jsx-9626265f2ba9c813{background:linear-gradient(135deg,var(--primary),var(--secondary));box-shadow:0 0 20px var(--primary-glow);border-radius:50%}"
                }, void 0, false, void 0, this)
            ]
        }, void 0, true, {
            fileName: "[project]/src/components/Dashboard.tsx",
            lineNumber: 324,
            columnNumber: 13
        }, this);
    }
    if (!user) {
        return /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$next$2f$dist$2f$server$2f$route$2d$modules$2f$app$2d$page$2f$vendored$2f$ssr$2f$react$2d$jsx$2d$dev$2d$runtime$2e$js__$5b$app$2d$ssr$5d$__$28$ecmascript$29$__["jsxDEV"])(__TURBOPACK__imported__module__$5b$project$5d2f$src$2f$components$2f$auth$2f$LoginView$2e$tsx__$5b$app$2d$ssr$5d$__$28$ecmascript$29$__["default"], {}, void 0, false, {
            fileName: "[project]/src/components/Dashboard.tsx",
            lineNumber: 341,
            columnNumber: 16
        }, this);
    }
    const renderContent = ()=>{
        if (step === 'canvas' && dataset) {
            return /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$next$2f$dist$2f$server$2f$route$2d$modules$2f$app$2d$page$2f$vendored$2f$ssr$2f$react$2d$jsx$2d$dev$2d$runtime$2e$js__$5b$app$2d$ssr$5d$__$28$ecmascript$29$__["jsxDEV"])(__TURBOPACK__imported__module__$5b$project$5d2f$src$2f$components$2f$canvas$2f$ReportCanvas$2e$tsx__$5b$app$2d$ssr$5d$__$28$ecmascript$29$__["default"], {
                ref: canvasRef,
                dataset: dataset,
                initialReportId: initialReportId,
                savedDatasets: savedDatasets,
                onChangesStatusChange: (val)=>setHasUnsavedChanges(val),
                onSwitchDataset: (ds)=>{
                    setHasUnsavedChanges(false);
                    handleLoadSavedDataset(ds);
                }
            }, void 0, false, {
                fileName: "[project]/src/components/Dashboard.tsx",
                lineNumber: 347,
                columnNumber: 17
            }, this);
        }
        if (step === 'profiling' && dataset) {
            return /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$next$2f$dist$2f$server$2f$route$2d$modules$2f$app$2d$page$2f$vendored$2f$ssr$2f$react$2d$jsx$2d$dev$2d$runtime$2e$js__$5b$app$2d$ssr$5d$__$28$ecmascript$29$__["jsxDEV"])("div", {
                style: {
                    padding: '40px'
                },
                className: "jsx-7cbd180c60748226" + " " + "animate-in fade-in duration-500",
                children: [
                    /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$next$2f$dist$2f$server$2f$route$2d$modules$2f$app$2d$page$2f$vendored$2f$ssr$2f$react$2d$jsx$2d$dev$2d$runtime$2e$js__$5b$app$2d$ssr$5d$__$28$ecmascript$29$__["jsxDEV"])("div", {
                        style: {
                            display: 'flex',
                            justifyContent: 'space-between',
                            alignItems: 'center',
                            marginBottom: '32px'
                        },
                        className: "jsx-7cbd180c60748226",
                        children: [
                            /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$next$2f$dist$2f$server$2f$route$2d$modules$2f$app$2d$page$2f$vendored$2f$ssr$2f$react$2d$jsx$2d$dev$2d$runtime$2e$js__$5b$app$2d$ssr$5d$__$28$ecmascript$29$__["jsxDEV"])("div", {
                                className: "jsx-7cbd180c60748226",
                                children: [
                                    /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$next$2f$dist$2f$server$2f$route$2d$modules$2f$app$2d$page$2f$vendored$2f$ssr$2f$react$2d$jsx$2d$dev$2d$runtime$2e$js__$5b$app$2d$ssr$5d$__$28$ecmascript$29$__["jsxDEV"])("h2", {
                                        style: {
                                            fontSize: '1.5rem',
                                            fontWeight: 600,
                                            color: '#fff'
                                        },
                                        className: "jsx-7cbd180c60748226",
                                        children: dataset.name
                                    }, void 0, false, {
                                        fileName: "[project]/src/components/Dashboard.tsx",
                                        lineNumber: 366,
                                        columnNumber: 29
                                    }, this),
                                    /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$next$2f$dist$2f$server$2f$route$2d$modules$2f$app$2d$page$2f$vendored$2f$ssr$2f$react$2d$jsx$2d$dev$2d$runtime$2e$js__$5b$app$2d$ssr$5d$__$28$ecmascript$29$__["jsxDEV"])("div", {
                                        style: {
                                            display: 'flex',
                                            gap: '8px',
                                            marginTop: '12px'
                                        },
                                        className: "jsx-7cbd180c60748226",
                                        children: [
                                            /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$next$2f$dist$2f$server$2f$route$2d$modules$2f$app$2d$page$2f$vendored$2f$ssr$2f$react$2d$jsx$2d$dev$2d$runtime$2e$js__$5b$app$2d$ssr$5d$__$28$ecmascript$29$__["jsxDEV"])("button", {
                                                onClick: ()=>setPreviewView('preview'),
                                                className: "jsx-7cbd180c60748226" + " " + `tab-btn ${previewView === 'preview' ? 'active' : ''}`,
                                                children: "Previsualización"
                                            }, void 0, false, {
                                                fileName: "[project]/src/components/Dashboard.tsx",
                                                lineNumber: 368,
                                                columnNumber: 33
                                            }, this),
                                            /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$next$2f$dist$2f$server$2f$route$2d$modules$2f$app$2d$page$2f$vendored$2f$ssr$2f$react$2d$jsx$2d$dev$2d$runtime$2e$js__$5b$app$2d$ssr$5d$__$28$ecmascript$29$__["jsxDEV"])("button", {
                                                onClick: ()=>setPreviewView('stats'),
                                                className: "jsx-7cbd180c60748226" + " " + `tab-btn ${previewView === 'stats' ? 'active' : ''}`,
                                                children: "Estadísticas"
                                            }, void 0, false, {
                                                fileName: "[project]/src/components/Dashboard.tsx",
                                                lineNumber: 374,
                                                columnNumber: 33
                                            }, this)
                                        ]
                                    }, void 0, true, {
                                        fileName: "[project]/src/components/Dashboard.tsx",
                                        lineNumber: 367,
                                        columnNumber: 29
                                    }, this)
                                ]
                            }, void 0, true, {
                                fileName: "[project]/src/components/Dashboard.tsx",
                                lineNumber: 365,
                                columnNumber: 25
                            }, this),
                            /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$next$2f$dist$2f$server$2f$route$2d$modules$2f$app$2d$page$2f$vendored$2f$ssr$2f$react$2d$jsx$2d$dev$2d$runtime$2e$js__$5b$app$2d$ssr$5d$__$28$ecmascript$29$__["jsxDEV"])("div", {
                                style: {
                                    display: 'flex',
                                    gap: '16px'
                                },
                                className: "jsx-7cbd180c60748226",
                                children: [
                                    /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$next$2f$dist$2f$server$2f$route$2d$modules$2f$app$2d$page$2f$vendored$2f$ssr$2f$react$2d$jsx$2d$dev$2d$runtime$2e$js__$5b$app$2d$ssr$5d$__$28$ecmascript$29$__["jsxDEV"])("button", {
                                        onClick: ()=>setStep('main'),
                                        style: {
                                            padding: '12px 24px',
                                            display: 'flex',
                                            alignItems: 'center',
                                            gap: '8px',
                                            background: 'rgba(255,255,255,0.05)',
                                            border: '1px solid var(--border)',
                                            color: 'var(--text-muted)'
                                        },
                                        className: "jsx-7cbd180c60748226" + " " + "btn-secondary",
                                        children: "Cerrar"
                                    }, void 0, false, {
                                        fileName: "[project]/src/components/Dashboard.tsx",
                                        lineNumber: 383,
                                        columnNumber: 29
                                    }, this),
                                    /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$next$2f$dist$2f$server$2f$route$2d$modules$2f$app$2d$page$2f$vendored$2f$ssr$2f$react$2d$jsx$2d$dev$2d$runtime$2e$js__$5b$app$2d$ssr$5d$__$28$ecmascript$29$__["jsxDEV"])("button", {
                                        onClick: ()=>setStep('canvas'),
                                        style: {
                                            padding: '12px 28px',
                                            display: 'flex',
                                            alignItems: 'center',
                                            gap: '10px',
                                            fontSize: '1rem',
                                            fontWeight: 600,
                                            boxShadow: '0 4px 15px var(--primary-glow)'
                                        },
                                        className: "jsx-7cbd180c60748226" + " " + "btn-primary",
                                        children: [
                                            "Crear Reporte ",
                                            /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$next$2f$dist$2f$server$2f$route$2d$modules$2f$app$2d$page$2f$vendored$2f$ssr$2f$react$2d$jsx$2d$dev$2d$runtime$2e$js__$5b$app$2d$ssr$5d$__$28$ecmascript$29$__["jsxDEV"])(__TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$lucide$2d$react$2f$dist$2f$esm$2f$icons$2f$arrow$2d$right$2e$js__$5b$app$2d$ssr$5d$__$28$ecmascript$29$__$3c$export__default__as__ArrowRight$3e$__["ArrowRight"], {
                                                size: 20
                                            }, void 0, false, {
                                                fileName: "[project]/src/components/Dashboard.tsx",
                                                lineNumber: 411,
                                                columnNumber: 47
                                            }, this)
                                        ]
                                    }, void 0, true, {
                                        fileName: "[project]/src/components/Dashboard.tsx",
                                        lineNumber: 398,
                                        columnNumber: 29
                                    }, this)
                                ]
                            }, void 0, true, {
                                fileName: "[project]/src/components/Dashboard.tsx",
                                lineNumber: 382,
                                columnNumber: 25
                            }, this)
                        ]
                    }, void 0, true, {
                        fileName: "[project]/src/components/Dashboard.tsx",
                        lineNumber: 364,
                        columnNumber: 21
                    }, this),
                    previewView === 'stats' ? /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$next$2f$dist$2f$server$2f$route$2d$modules$2f$app$2d$page$2f$vendored$2f$ssr$2f$react$2d$jsx$2d$dev$2d$runtime$2e$js__$5b$app$2d$ssr$5d$__$28$ecmascript$29$__["jsxDEV"])("div", {
                        style: {
                            display: 'grid',
                            gridTemplateColumns: 'repeat(auto-fill, minmax(300px, 1fr))',
                            gap: '20px'
                        },
                        className: "jsx-7cbd180c60748226",
                        children: dataset.stats.map((col)=>{
                            const Icon = col.type === 'DATE' || col.type === 'TIMESTAMP' ? __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$lucide$2d$react$2f$dist$2f$esm$2f$icons$2f$calendar$2e$js__$5b$app$2d$ssr$5d$__$28$ecmascript$29$__$3c$export__default__as__Calendar$3e$__["Calendar"] : [
                                'BIGINT',
                                'DOUBLE',
                                'INTEGER',
                                'DECIMAL'
                            ].includes(col.type) ? __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$lucide$2d$react$2f$dist$2f$esm$2f$icons$2f$hash$2e$js__$5b$app$2d$ssr$5d$__$28$ecmascript$29$__$3c$export__default__as__Hash$3e$__["Hash"] : __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$lucide$2d$react$2f$dist$2f$esm$2f$icons$2f$a$2d$large$2d$small$2e$js__$5b$app$2d$ssr$5d$__$28$ecmascript$29$__$3c$export__default__as__ALargeSmall$3e$__["ALargeSmall"];
                            return /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$next$2f$dist$2f$server$2f$route$2d$modules$2f$app$2d$page$2f$vendored$2f$ssr$2f$react$2d$jsx$2d$dev$2d$runtime$2e$js__$5b$app$2d$ssr$5d$__$28$ecmascript$29$__["jsxDEV"])("div", {
                                style: {
                                    padding: '24px'
                                },
                                className: "jsx-7cbd180c60748226" + " " + "glass-card stat-card",
                                children: [
                                    /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$next$2f$dist$2f$server$2f$route$2d$modules$2f$app$2d$page$2f$vendored$2f$ssr$2f$react$2d$jsx$2d$dev$2d$runtime$2e$js__$5b$app$2d$ssr$5d$__$28$ecmascript$29$__["jsxDEV"])("div", {
                                        style: {
                                            display: 'flex',
                                            justifyContent: 'space-between',
                                            alignItems: 'flex-start',
                                            marginBottom: '20px'
                                        },
                                        className: "jsx-7cbd180c60748226",
                                        children: [
                                            /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$next$2f$dist$2f$server$2f$route$2d$modules$2f$app$2d$page$2f$vendored$2f$ssr$2f$react$2d$jsx$2d$dev$2d$runtime$2e$js__$5b$app$2d$ssr$5d$__$28$ecmascript$29$__["jsxDEV"])("div", {
                                                style: {
                                                    display: 'flex',
                                                    alignItems: 'center',
                                                    gap: '10px'
                                                },
                                                className: "jsx-7cbd180c60748226",
                                                children: [
                                                    /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$next$2f$dist$2f$server$2f$route$2d$modules$2f$app$2d$page$2f$vendored$2f$ssr$2f$react$2d$jsx$2d$dev$2d$runtime$2e$js__$5b$app$2d$ssr$5d$__$28$ecmascript$29$__["jsxDEV"])("div", {
                                                        className: "jsx-7cbd180c60748226" + " " + "stat-icon-wrapper",
                                                        children: /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$next$2f$dist$2f$server$2f$route$2d$modules$2f$app$2d$page$2f$vendored$2f$ssr$2f$react$2d$jsx$2d$dev$2d$runtime$2e$js__$5b$app$2d$ssr$5d$__$28$ecmascript$29$__["jsxDEV"])(Icon, {
                                                            size: 16,
                                                            className: "jsx-7cbd180c60748226"
                                                        }, void 0, false, {
                                                            fileName: "[project]/src/components/Dashboard.tsx",
                                                            lineNumber: 427,
                                                            columnNumber: 53
                                                        }, this)
                                                    }, void 0, false, {
                                                        fileName: "[project]/src/components/Dashboard.tsx",
                                                        lineNumber: 426,
                                                        columnNumber: 49
                                                    }, this),
                                                    /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$next$2f$dist$2f$server$2f$route$2d$modules$2f$app$2d$page$2f$vendored$2f$ssr$2f$react$2d$jsx$2d$dev$2d$runtime$2e$js__$5b$app$2d$ssr$5d$__$28$ecmascript$29$__["jsxDEV"])("span", {
                                                        style: {
                                                            fontWeight: 600,
                                                            fontSize: '1rem',
                                                            color: '#fff'
                                                        },
                                                        className: "jsx-7cbd180c60748226",
                                                        children: col.column
                                                    }, void 0, false, {
                                                        fileName: "[project]/src/components/Dashboard.tsx",
                                                        lineNumber: 429,
                                                        columnNumber: 49
                                                    }, this)
                                                ]
                                            }, void 0, true, {
                                                fileName: "[project]/src/components/Dashboard.tsx",
                                                lineNumber: 425,
                                                columnNumber: 45
                                            }, this),
                                            /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$next$2f$dist$2f$server$2f$route$2d$modules$2f$app$2d$page$2f$vendored$2f$ssr$2f$react$2d$jsx$2d$dev$2d$runtime$2e$js__$5b$app$2d$ssr$5d$__$28$ecmascript$29$__["jsxDEV"])("span", {
                                                className: "jsx-7cbd180c60748226" + " " + "badge",
                                                children: col.type
                                            }, void 0, false, {
                                                fileName: "[project]/src/components/Dashboard.tsx",
                                                lineNumber: 431,
                                                columnNumber: 45
                                            }, this)
                                        ]
                                    }, void 0, true, {
                                        fileName: "[project]/src/components/Dashboard.tsx",
                                        lineNumber: 424,
                                        columnNumber: 41
                                    }, this),
                                    /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$next$2f$dist$2f$server$2f$route$2d$modules$2f$app$2d$page$2f$vendored$2f$ssr$2f$react$2d$jsx$2d$dev$2d$runtime$2e$js__$5b$app$2d$ssr$5d$__$28$ecmascript$29$__["jsxDEV"])("div", {
                                        style: {
                                            display: 'grid',
                                            gridTemplateColumns: '1fr 1fr',
                                            gap: '16px'
                                        },
                                        className: "jsx-7cbd180c60748226",
                                        children: [
                                            /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$next$2f$dist$2f$server$2f$route$2d$modules$2f$app$2d$page$2f$vendored$2f$ssr$2f$react$2d$jsx$2d$dev$2d$runtime$2e$js__$5b$app$2d$ssr$5d$__$28$ecmascript$29$__["jsxDEV"])("div", {
                                                className: "jsx-7cbd180c60748226" + " " + "stat-item",
                                                children: [
                                                    /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$next$2f$dist$2f$server$2f$route$2d$modules$2f$app$2d$page$2f$vendored$2f$ssr$2f$react$2d$jsx$2d$dev$2d$runtime$2e$js__$5b$app$2d$ssr$5d$__$28$ecmascript$29$__["jsxDEV"])("p", {
                                                        className: "jsx-7cbd180c60748226" + " " + "stat-label",
                                                        children: "Únicos"
                                                    }, void 0, false, {
                                                        fileName: "[project]/src/components/Dashboard.tsx",
                                                        lineNumber: 435,
                                                        columnNumber: 49
                                                    }, this),
                                                    /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$next$2f$dist$2f$server$2f$route$2d$modules$2f$app$2d$page$2f$vendored$2f$ssr$2f$react$2d$jsx$2d$dev$2d$runtime$2e$js__$5b$app$2d$ssr$5d$__$28$ecmascript$29$__["jsxDEV"])("p", {
                                                        className: "jsx-7cbd180c60748226" + " " + "stat-value",
                                                        children: col.unique
                                                    }, void 0, false, {
                                                        fileName: "[project]/src/components/Dashboard.tsx",
                                                        lineNumber: 436,
                                                        columnNumber: 49
                                                    }, this)
                                                ]
                                            }, void 0, true, {
                                                fileName: "[project]/src/components/Dashboard.tsx",
                                                lineNumber: 434,
                                                columnNumber: 45
                                            }, this),
                                            /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$next$2f$dist$2f$server$2f$route$2d$modules$2f$app$2d$page$2f$vendored$2f$ssr$2f$react$2d$jsx$2d$dev$2d$runtime$2e$js__$5b$app$2d$ssr$5d$__$28$ecmascript$29$__["jsxDEV"])("div", {
                                                className: "jsx-7cbd180c60748226" + " " + "stat-item",
                                                children: [
                                                    /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$next$2f$dist$2f$server$2f$route$2d$modules$2f$app$2d$page$2f$vendored$2f$ssr$2f$react$2d$jsx$2d$dev$2d$runtime$2e$js__$5b$app$2d$ssr$5d$__$28$ecmascript$29$__["jsxDEV"])("p", {
                                                        className: "jsx-7cbd180c60748226" + " " + "stat-label",
                                                        children: "Nulos"
                                                    }, void 0, false, {
                                                        fileName: "[project]/src/components/Dashboard.tsx",
                                                        lineNumber: 439,
                                                        columnNumber: 49
                                                    }, this),
                                                    /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$next$2f$dist$2f$server$2f$route$2d$modules$2f$app$2d$page$2f$vendored$2f$ssr$2f$react$2d$jsx$2d$dev$2d$runtime$2e$js__$5b$app$2d$ssr$5d$__$28$ecmascript$29$__["jsxDEV"])("p", {
                                                        style: {
                                                            color: col.nulls > 0 ? '#f87171' : 'inherit'
                                                        },
                                                        className: "jsx-7cbd180c60748226" + " " + "stat-value",
                                                        children: col.nulls
                                                    }, void 0, false, {
                                                        fileName: "[project]/src/components/Dashboard.tsx",
                                                        lineNumber: 440,
                                                        columnNumber: 49
                                                    }, this)
                                                ]
                                            }, void 0, true, {
                                                fileName: "[project]/src/components/Dashboard.tsx",
                                                lineNumber: 438,
                                                columnNumber: 45
                                            }, this)
                                        ]
                                    }, void 0, true, {
                                        fileName: "[project]/src/components/Dashboard.tsx",
                                        lineNumber: 433,
                                        columnNumber: 41
                                    }, this)
                                ]
                            }, col.column, true, {
                                fileName: "[project]/src/components/Dashboard.tsx",
                                lineNumber: 423,
                                columnNumber: 37
                            }, this);
                        })
                    }, void 0, false, {
                        fileName: "[project]/src/components/Dashboard.tsx",
                        lineNumber: 417,
                        columnNumber: 25
                    }, this) : /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$next$2f$dist$2f$server$2f$route$2d$modules$2f$app$2d$page$2f$vendored$2f$ssr$2f$react$2d$jsx$2d$dev$2d$runtime$2e$js__$5b$app$2d$ssr$5d$__$28$ecmascript$29$__["jsxDEV"])("div", {
                        style: {
                            overflow: 'hidden'
                        },
                        className: "jsx-7cbd180c60748226" + " " + "glass-card",
                        children: /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$next$2f$dist$2f$server$2f$route$2d$modules$2f$app$2d$page$2f$vendored$2f$ssr$2f$react$2d$jsx$2d$dev$2d$runtime$2e$js__$5b$app$2d$ssr$5d$__$28$ecmascript$29$__["jsxDEV"])(__TURBOPACK__imported__module__$5b$project$5d2f$src$2f$components$2f$ui$2f$DataTable$2e$tsx__$5b$app$2d$ssr$5d$__$28$ecmascript$29$__["default"], {
                            columns: dataset.columns,
                            data: dataset.preview
                        }, void 0, false, {
                            fileName: "[project]/src/components/Dashboard.tsx",
                            lineNumber: 449,
                            columnNumber: 29
                        }, this)
                    }, void 0, false, {
                        fileName: "[project]/src/components/Dashboard.tsx",
                        lineNumber: 448,
                        columnNumber: 25
                    }, this),
                    /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$next$2f$dist$2f$server$2f$route$2d$modules$2f$app$2d$page$2f$vendored$2f$ssr$2f$react$2d$jsx$2d$dev$2d$runtime$2e$js__$5b$app$2d$ssr$5d$__$28$ecmascript$29$__["jsxDEV"])(__TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$styled$2d$jsx$2f$style$2e$js__$5b$app$2d$ssr$5d$__$28$ecmascript$29$__["default"], {
                        id: "7cbd180c60748226",
                        children: ".tab-btn.jsx-7cbd180c60748226{color:#eef5ffb8;cursor:pointer;background:#ffffff14;border:1px solid #ffffff24;border-radius:999px;padding:8px 18px;box-shadow:inset 0 1px #ffffff24}.tab-btn.active.jsx-7cbd180c60748226{color:#fff;background:linear-gradient(#a6c4ff47,#89b6ff29);border-color:#c4d9ff42}.badge.jsx-7cbd180c60748226{color:#fff;background:#ffffff1a;border:1px solid #ffffff24;border-radius:999px;padding:5px 10px;font-size:.7rem}.stat-card.jsx-7cbd180c60748226{background:linear-gradient(#ffffff24 0%,#ffffff0f 100%);border:1px solid #ffffff24;transition:all .3s cubic-bezier(.4,0,.2,1);position:relative;overflow:hidden}.stat-card.jsx-7cbd180c60748226:hover{background:linear-gradient(#ffffff29 0%,#ffffff12 100%);border-color:#ffffff3d;transform:translateY(-4px);box-shadow:0 24px 44px #070f1d47}.stat-icon-wrapper.jsx-7cbd180c60748226{color:#fff;background:#ffffff1a;border:1px solid #ffffff24;border-radius:14px;justify-content:center;align-items:center;padding:8px;display:flex}.stat-item.jsx-7cbd180c60748226{background:#ffffff0f;border:1px solid #ffffff1f;border-radius:18px;padding:12px}.stat-label.jsx-7cbd180c60748226{color:var(--text-muted);text-transform:uppercase;letter-spacing:.05em;margin-bottom:4px;font-size:.7rem}.stat-value.jsx-7cbd180c60748226{color:#fff;font-size:1.25rem;font-weight:700}"
                    }, void 0, false, void 0, this)
                ]
            }, void 0, true, {
                fileName: "[project]/src/components/Dashboard.tsx",
                lineNumber: 363,
                columnNumber: 17
            }, this);
        }
        switch(activeView){
            case 'home':
                return /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$next$2f$dist$2f$server$2f$route$2d$modules$2f$app$2d$page$2f$vendored$2f$ssr$2f$react$2d$jsx$2d$dev$2d$runtime$2e$js__$5b$app$2d$ssr$5d$__$28$ecmascript$29$__["jsxDEV"])("div", {
                    style: {
                        padding: '40px'
                    },
                    className: "jsx-3b69ab0ed6f69500",
                    children: [
                        /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$next$2f$dist$2f$server$2f$route$2d$modules$2f$app$2d$page$2f$vendored$2f$ssr$2f$react$2d$jsx$2d$dev$2d$runtime$2e$js__$5b$app$2d$ssr$5d$__$28$ecmascript$29$__["jsxDEV"])("header", {
                            style: {
                                marginBottom: '48px'
                            },
                            className: "jsx-3b69ab0ed6f69500",
                            children: [
                                /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$next$2f$dist$2f$server$2f$route$2d$modules$2f$app$2d$page$2f$vendored$2f$ssr$2f$react$2d$jsx$2d$dev$2d$runtime$2e$js__$5b$app$2d$ssr$5d$__$28$ecmascript$29$__["jsxDEV"])("h1", {
                                    style: {
                                        fontSize: '2.5rem',
                                        fontWeight: 700,
                                        marginBottom: '8px'
                                    },
                                    className: "jsx-3b69ab0ed6f69500",
                                    children: [
                                        t('dashboard.welcome'),
                                        ", ",
                                        /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$next$2f$dist$2f$server$2f$route$2d$modules$2f$app$2d$page$2f$vendored$2f$ssr$2f$react$2d$jsx$2d$dev$2d$runtime$2e$js__$5b$app$2d$ssr$5d$__$28$ecmascript$29$__["jsxDEV"])("span", {
                                            className: "jsx-3b69ab0ed6f69500" + " " + "gradient-text",
                                            children: user.user_metadata.full_name?.split(' ')[0] || 'Usuario'
                                        }, void 0, false, {
                                            fileName: "[project]/src/components/Dashboard.tsx",
                                            lineNumber: 528,
                                            columnNumber: 59
                                        }, this)
                                    ]
                                }, void 0, true, {
                                    fileName: "[project]/src/components/Dashboard.tsx",
                                    lineNumber: 527,
                                    columnNumber: 29
                                }, this),
                                /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$next$2f$dist$2f$server$2f$route$2d$modules$2f$app$2d$page$2f$vendored$2f$ssr$2f$react$2d$jsx$2d$dev$2d$runtime$2e$js__$5b$app$2d$ssr$5d$__$28$ecmascript$29$__["jsxDEV"])("p", {
                                    style: {
                                        color: 'var(--text-muted)',
                                        fontSize: '1.125rem'
                                    },
                                    className: "jsx-3b69ab0ed6f69500",
                                    children: t('dashboard.welcome_sub')
                                }, void 0, false, {
                                    fileName: "[project]/src/components/Dashboard.tsx",
                                    lineNumber: 530,
                                    columnNumber: 29
                                }, this)
                            ]
                        }, void 0, true, {
                            fileName: "[project]/src/components/Dashboard.tsx",
                            lineNumber: 526,
                            columnNumber: 25
                        }, this),
                        /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$next$2f$dist$2f$server$2f$route$2d$modules$2f$app$2d$page$2f$vendored$2f$ssr$2f$react$2d$jsx$2d$dev$2d$runtime$2e$js__$5b$app$2d$ssr$5d$__$28$ecmascript$29$__["jsxDEV"])("div", {
                            style: {
                                display: 'grid',
                                gridTemplateColumns: '1fr 1fr',
                                gap: '32px',
                                marginBottom: '48px'
                            },
                            className: "jsx-3b69ab0ed6f69500",
                            children: [
                                /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$next$2f$dist$2f$server$2f$route$2d$modules$2f$app$2d$page$2f$vendored$2f$ssr$2f$react$2d$jsx$2d$dev$2d$runtime$2e$js__$5b$app$2d$ssr$5d$__$28$ecmascript$29$__["jsxDEV"])("div", {
                                    onClick: ()=>setActiveView('upload'),
                                    className: "jsx-3b69ab0ed6f69500" + " " + "glass-card action-card",
                                    children: [
                                        /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$next$2f$dist$2f$server$2f$route$2d$modules$2f$app$2d$page$2f$vendored$2f$ssr$2f$react$2d$jsx$2d$dev$2d$runtime$2e$js__$5b$app$2d$ssr$5d$__$28$ecmascript$29$__["jsxDEV"])("div", {
                                            className: "jsx-3b69ab0ed6f69500" + " " + "card-icon",
                                            children: /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$next$2f$dist$2f$server$2f$route$2d$modules$2f$app$2d$page$2f$vendored$2f$ssr$2f$react$2d$jsx$2d$dev$2d$runtime$2e$js__$5b$app$2d$ssr$5d$__$28$ecmascript$29$__["jsxDEV"])(__TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$lucide$2d$react$2f$dist$2f$esm$2f$icons$2f$plus$2e$js__$5b$app$2d$ssr$5d$__$28$ecmascript$29$__$3c$export__default__as__Plus$3e$__["Plus"], {
                                                size: 32
                                            }, void 0, false, {
                                                fileName: "[project]/src/components/Dashboard.tsx",
                                                lineNumber: 535,
                                                columnNumber: 60
                                            }, this)
                                        }, void 0, false, {
                                            fileName: "[project]/src/components/Dashboard.tsx",
                                            lineNumber: 535,
                                            columnNumber: 33
                                        }, this),
                                        /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$next$2f$dist$2f$server$2f$route$2d$modules$2f$app$2d$page$2f$vendored$2f$ssr$2f$react$2d$jsx$2d$dev$2d$runtime$2e$js__$5b$app$2d$ssr$5d$__$28$ecmascript$29$__["jsxDEV"])("div", {
                                            className: "jsx-3b69ab0ed6f69500",
                                            children: [
                                                /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$next$2f$dist$2f$server$2f$route$2d$modules$2f$app$2d$page$2f$vendored$2f$ssr$2f$react$2d$jsx$2d$dev$2d$runtime$2e$js__$5b$app$2d$ssr$5d$__$28$ecmascript$29$__["jsxDEV"])("h3", {
                                                    className: "jsx-3b69ab0ed6f69500",
                                                    children: t('dashboard.new_dataset')
                                                }, void 0, false, {
                                                    fileName: "[project]/src/components/Dashboard.tsx",
                                                    lineNumber: 537,
                                                    columnNumber: 37
                                                }, this),
                                                /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$next$2f$dist$2f$server$2f$route$2d$modules$2f$app$2d$page$2f$vendored$2f$ssr$2f$react$2d$jsx$2d$dev$2d$runtime$2e$js__$5b$app$2d$ssr$5d$__$28$ecmascript$29$__["jsxDEV"])("p", {
                                                    className: "jsx-3b69ab0ed6f69500",
                                                    children: t('dashboard.new_dataset_sub')
                                                }, void 0, false, {
                                                    fileName: "[project]/src/components/Dashboard.tsx",
                                                    lineNumber: 538,
                                                    columnNumber: 37
                                                }, this)
                                            ]
                                        }, void 0, true, {
                                            fileName: "[project]/src/components/Dashboard.tsx",
                                            lineNumber: 536,
                                            columnNumber: 33
                                        }, this)
                                    ]
                                }, void 0, true, {
                                    fileName: "[project]/src/components/Dashboard.tsx",
                                    lineNumber: 534,
                                    columnNumber: 29
                                }, this),
                                /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$next$2f$dist$2f$server$2f$route$2d$modules$2f$app$2d$page$2f$vendored$2f$ssr$2f$react$2d$jsx$2d$dev$2d$runtime$2e$js__$5b$app$2d$ssr$5d$__$28$ecmascript$29$__["jsxDEV"])("div", {
                                    onClick: ()=>setActiveView('datasets'),
                                    className: "jsx-3b69ab0ed6f69500" + " " + "glass-card action-card",
                                    children: [
                                        /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$next$2f$dist$2f$server$2f$route$2d$modules$2f$app$2d$page$2f$vendored$2f$ssr$2f$react$2d$jsx$2d$dev$2d$runtime$2e$js__$5b$app$2d$ssr$5d$__$28$ecmascript$29$__["jsxDEV"])("div", {
                                            className: "jsx-3b69ab0ed6f69500" + " " + "card-icon",
                                            children: /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$next$2f$dist$2f$server$2f$route$2d$modules$2f$app$2d$page$2f$vendored$2f$ssr$2f$react$2d$jsx$2d$dev$2d$runtime$2e$js__$5b$app$2d$ssr$5d$__$28$ecmascript$29$__["jsxDEV"])(__TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$lucide$2d$react$2f$dist$2f$esm$2f$icons$2f$database$2e$js__$5b$app$2d$ssr$5d$__$28$ecmascript$29$__$3c$export__default__as__Database$3e$__["Database"], {
                                                size: 32
                                            }, void 0, false, {
                                                fileName: "[project]/src/components/Dashboard.tsx",
                                                lineNumber: 542,
                                                columnNumber: 60
                                            }, this)
                                        }, void 0, false, {
                                            fileName: "[project]/src/components/Dashboard.tsx",
                                            lineNumber: 542,
                                            columnNumber: 33
                                        }, this),
                                        /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$next$2f$dist$2f$server$2f$route$2d$modules$2f$app$2d$page$2f$vendored$2f$ssr$2f$react$2d$jsx$2d$dev$2d$runtime$2e$js__$5b$app$2d$ssr$5d$__$28$ecmascript$29$__["jsxDEV"])("div", {
                                            className: "jsx-3b69ab0ed6f69500",
                                            children: [
                                                /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$next$2f$dist$2f$server$2f$route$2d$modules$2f$app$2d$page$2f$vendored$2f$ssr$2f$react$2d$jsx$2d$dev$2d$runtime$2e$js__$5b$app$2d$ssr$5d$__$28$ecmascript$29$__["jsxDEV"])("h3", {
                                                    className: "jsx-3b69ab0ed6f69500",
                                                    children: t('dashboard.explore_data')
                                                }, void 0, false, {
                                                    fileName: "[project]/src/components/Dashboard.tsx",
                                                    lineNumber: 544,
                                                    columnNumber: 37
                                                }, this),
                                                /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$next$2f$dist$2f$server$2f$route$2d$modules$2f$app$2d$page$2f$vendored$2f$ssr$2f$react$2d$jsx$2d$dev$2d$runtime$2e$js__$5b$app$2d$ssr$5d$__$28$ecmascript$29$__["jsxDEV"])("p", {
                                                    className: "jsx-3b69ab0ed6f69500",
                                                    children: t('dashboard.explore_data_sub')
                                                }, void 0, false, {
                                                    fileName: "[project]/src/components/Dashboard.tsx",
                                                    lineNumber: 545,
                                                    columnNumber: 37
                                                }, this)
                                            ]
                                        }, void 0, true, {
                                            fileName: "[project]/src/components/Dashboard.tsx",
                                            lineNumber: 543,
                                            columnNumber: 33
                                        }, this)
                                    ]
                                }, void 0, true, {
                                    fileName: "[project]/src/components/Dashboard.tsx",
                                    lineNumber: 541,
                                    columnNumber: 29
                                }, this)
                            ]
                        }, void 0, true, {
                            fileName: "[project]/src/components/Dashboard.tsx",
                            lineNumber: 533,
                            columnNumber: 25
                        }, this),
                        savedReports.length > 0 && /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$next$2f$dist$2f$server$2f$route$2d$modules$2f$app$2d$page$2f$vendored$2f$ssr$2f$react$2d$jsx$2d$dev$2d$runtime$2e$js__$5b$app$2d$ssr$5d$__$28$ecmascript$29$__["jsxDEV"])("section", {
                            className: "jsx-3b69ab0ed6f69500",
                            children: [
                                /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$next$2f$dist$2f$server$2f$route$2d$modules$2f$app$2d$page$2f$vendored$2f$ssr$2f$react$2d$jsx$2d$dev$2d$runtime$2e$js__$5b$app$2d$ssr$5d$__$28$ecmascript$29$__["jsxDEV"])("div", {
                                    style: {
                                        display: 'flex',
                                        alignItems: 'center',
                                        gap: '12px',
                                        marginBottom: '24px'
                                    },
                                    className: "jsx-3b69ab0ed6f69500",
                                    children: [
                                        /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$next$2f$dist$2f$server$2f$route$2d$modules$2f$app$2d$page$2f$vendored$2f$ssr$2f$react$2d$jsx$2d$dev$2d$runtime$2e$js__$5b$app$2d$ssr$5d$__$28$ecmascript$29$__["jsxDEV"])(__TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$lucide$2d$react$2f$dist$2f$esm$2f$icons$2f$activity$2e$js__$5b$app$2d$ssr$5d$__$28$ecmascript$29$__$3c$export__default__as__Activity$3e$__["Activity"], {
                                            size: 20,
                                            color: "var(--accent)"
                                        }, void 0, false, {
                                            fileName: "[project]/src/components/Dashboard.tsx",
                                            lineNumber: 553,
                                            columnNumber: 37
                                        }, this),
                                        /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$next$2f$dist$2f$server$2f$route$2d$modules$2f$app$2d$page$2f$vendored$2f$ssr$2f$react$2d$jsx$2d$dev$2d$runtime$2e$js__$5b$app$2d$ssr$5d$__$28$ecmascript$29$__["jsxDEV"])("h2", {
                                            style: {
                                                fontSize: '1.25rem',
                                                fontWeight: 600
                                            },
                                            className: "jsx-3b69ab0ed6f69500",
                                            children: t('dashboard.recent_reports')
                                        }, void 0, false, {
                                            fileName: "[project]/src/components/Dashboard.tsx",
                                            lineNumber: 554,
                                            columnNumber: 37
                                        }, this)
                                    ]
                                }, void 0, true, {
                                    fileName: "[project]/src/components/Dashboard.tsx",
                                    lineNumber: 552,
                                    columnNumber: 33
                                }, this),
                                /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$next$2f$dist$2f$server$2f$route$2d$modules$2f$app$2d$page$2f$vendored$2f$ssr$2f$react$2d$jsx$2d$dev$2d$runtime$2e$js__$5b$app$2d$ssr$5d$__$28$ecmascript$29$__["jsxDEV"])("div", {
                                    style: {
                                        display: 'grid',
                                        gridTemplateColumns: 'repeat(auto-fill, minmax(280px, 1fr))',
                                        gap: '20px'
                                    },
                                    className: "jsx-3b69ab0ed6f69500",
                                    children: savedReports.slice(0, 3).map((report)=>/*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$next$2f$dist$2f$server$2f$route$2d$modules$2f$app$2d$page$2f$vendored$2f$ssr$2f$react$2d$jsx$2d$dev$2d$runtime$2e$js__$5b$app$2d$ssr$5d$__$28$ecmascript$29$__["jsxDEV"])("div", {
                                            onClick: ()=>handleLoadSavedReport(report),
                                            className: "jsx-3b69ab0ed6f69500" + " " + "glass-card ds-card",
                                            children: [
                                                /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$next$2f$dist$2f$server$2f$route$2d$modules$2f$app$2d$page$2f$vendored$2f$ssr$2f$react$2d$jsx$2d$dev$2d$runtime$2e$js__$5b$app$2d$ssr$5d$__$28$ecmascript$29$__["jsxDEV"])("div", {
                                                    style: {
                                                        color: 'var(--accent)'
                                                    },
                                                    className: "jsx-3b69ab0ed6f69500" + " " + "ds-icon",
                                                    children: /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$next$2f$dist$2f$server$2f$route$2d$modules$2f$app$2d$page$2f$vendored$2f$ssr$2f$react$2d$jsx$2d$dev$2d$runtime$2e$js__$5b$app$2d$ssr$5d$__$28$ecmascript$29$__["jsxDEV"])(__TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$lucide$2d$react$2f$dist$2f$esm$2f$icons$2f$activity$2e$js__$5b$app$2d$ssr$5d$__$28$ecmascript$29$__$3c$export__default__as__Activity$3e$__["Activity"], {
                                                        size: 20
                                                    }, void 0, false, {
                                                        fileName: "[project]/src/components/Dashboard.tsx",
                                                        lineNumber: 559,
                                                        columnNumber: 105
                                                    }, this)
                                                }, void 0, false, {
                                                    fileName: "[project]/src/components/Dashboard.tsx",
                                                    lineNumber: 559,
                                                    columnNumber: 45
                                                }, this),
                                                /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$next$2f$dist$2f$server$2f$route$2d$modules$2f$app$2d$page$2f$vendored$2f$ssr$2f$react$2d$jsx$2d$dev$2d$runtime$2e$js__$5b$app$2d$ssr$5d$__$28$ecmascript$29$__["jsxDEV"])("div", {
                                                    className: "jsx-3b69ab0ed6f69500" + " " + "ds-info",
                                                    children: [
                                                        /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$next$2f$dist$2f$server$2f$route$2d$modules$2f$app$2d$page$2f$vendored$2f$ssr$2f$react$2d$jsx$2d$dev$2d$runtime$2e$js__$5b$app$2d$ssr$5d$__$28$ecmascript$29$__["jsxDEV"])("h4", {
                                                            className: "jsx-3b69ab0ed6f69500",
                                                            children: report.name
                                                        }, void 0, false, {
                                                            fileName: "[project]/src/components/Dashboard.tsx",
                                                            lineNumber: 561,
                                                            columnNumber: 49
                                                        }, this),
                                                        /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$next$2f$dist$2f$server$2f$route$2d$modules$2f$app$2d$page$2f$vendored$2f$ssr$2f$react$2d$jsx$2d$dev$2d$runtime$2e$js__$5b$app$2d$ssr$5d$__$28$ecmascript$29$__["jsxDEV"])("p", {
                                                            className: "jsx-3b69ab0ed6f69500",
                                                            children: (0, __TURBOPACK__imported__module__$5b$project$5d2f$src$2f$lib$2f$dateUtils$2e$ts__$5b$app$2d$ssr$5d$__$28$ecmascript$29$__["formatDate"])(report.created_at)
                                                        }, void 0, false, {
                                                            fileName: "[project]/src/components/Dashboard.tsx",
                                                            lineNumber: 562,
                                                            columnNumber: 49
                                                        }, this)
                                                    ]
                                                }, void 0, true, {
                                                    fileName: "[project]/src/components/Dashboard.tsx",
                                                    lineNumber: 560,
                                                    columnNumber: 45
                                                }, this)
                                            ]
                                        }, report.id, true, {
                                            fileName: "[project]/src/components/Dashboard.tsx",
                                            lineNumber: 558,
                                            columnNumber: 41
                                        }, this))
                                }, void 0, false, {
                                    fileName: "[project]/src/components/Dashboard.tsx",
                                    lineNumber: 556,
                                    columnNumber: 33
                                }, this)
                            ]
                        }, void 0, true, {
                            fileName: "[project]/src/components/Dashboard.tsx",
                            lineNumber: 551,
                            columnNumber: 29
                        }, this),
                        /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$next$2f$dist$2f$server$2f$route$2d$modules$2f$app$2d$page$2f$vendored$2f$ssr$2f$react$2d$jsx$2d$dev$2d$runtime$2e$js__$5b$app$2d$ssr$5d$__$28$ecmascript$29$__["jsxDEV"])(__TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$styled$2d$jsx$2f$style$2e$js__$5b$app$2d$ssr$5d$__$28$ecmascript$29$__["default"], {
                            id: "3b69ab0ed6f69500",
                            children: ".action-card.jsx-3b69ab0ed6f69500{cursor:pointer;align-items:center;gap:24px;padding:32px;transition:all .28s;display:flex}.action-card.jsx-3b69ab0ed6f69500:hover{border-color:#ffffff3d;transform:translateY(-4px)}.card-icon.jsx-3b69ab0ed6f69500{color:#fff}.ds-card.jsx-3b69ab0ed6f69500{cursor:pointer;align-items:center;gap:16px;padding:16px;display:flex}.ds-icon.jsx-3b69ab0ed6f69500{color:#fff;background:#ffffff1a;border:1px solid #ffffff1f;border-radius:16px;padding:10px}.ds-info.jsx-3b69ab0ed6f69500 h4.jsx-3b69ab0ed6f69500{margin:0;font-size:.9375rem}.ds-info.jsx-3b69ab0ed6f69500 p.jsx-3b69ab0ed6f69500{color:var(--text-muted);margin:0;font-size:.8125rem}"
                        }, void 0, false, void 0, this)
                    ]
                }, void 0, true, {
                    fileName: "[project]/src/components/Dashboard.tsx",
                    lineNumber: 525,
                    columnNumber: 21
                }, this);
            case 'datasets':
                return /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$next$2f$dist$2f$server$2f$route$2d$modules$2f$app$2d$page$2f$vendored$2f$ssr$2f$react$2d$jsx$2d$dev$2d$runtime$2e$js__$5b$app$2d$ssr$5d$__$28$ecmascript$29$__["jsxDEV"])("div", {
                    style: {
                        padding: '40px'
                    },
                    className: "jsx-c2851189ca2202f0",
                    children: [
                        /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$next$2f$dist$2f$server$2f$route$2d$modules$2f$app$2d$page$2f$vendored$2f$ssr$2f$react$2d$jsx$2d$dev$2d$runtime$2e$js__$5b$app$2d$ssr$5d$__$28$ecmascript$29$__["jsxDEV"])("header", {
                            style: {
                                marginBottom: '32px',
                                display: 'flex',
                                justifyContent: 'space-between',
                                alignItems: 'flex-end'
                            },
                            className: "jsx-c2851189ca2202f0",
                            children: [
                                /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$next$2f$dist$2f$server$2f$route$2d$modules$2f$app$2d$page$2f$vendored$2f$ssr$2f$react$2d$jsx$2d$dev$2d$runtime$2e$js__$5b$app$2d$ssr$5d$__$28$ecmascript$29$__["jsxDEV"])("div", {
                                    className: "jsx-c2851189ca2202f0",
                                    children: [
                                        /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$next$2f$dist$2f$server$2f$route$2d$modules$2f$app$2d$page$2f$vendored$2f$ssr$2f$react$2d$jsx$2d$dev$2d$runtime$2e$js__$5b$app$2d$ssr$5d$__$28$ecmascript$29$__["jsxDEV"])("h2", {
                                            style: {
                                                fontSize: '1.75rem',
                                                fontWeight: 600
                                            },
                                            className: "jsx-c2851189ca2202f0",
                                            children: t('dashboard.my_datasets')
                                        }, void 0, false, {
                                            fileName: "[project]/src/components/Dashboard.tsx",
                                            lineNumber: 599,
                                            columnNumber: 33
                                        }, this),
                                        /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$next$2f$dist$2f$server$2f$route$2d$modules$2f$app$2d$page$2f$vendored$2f$ssr$2f$react$2d$jsx$2d$dev$2d$runtime$2e$js__$5b$app$2d$ssr$5d$__$28$ecmascript$29$__["jsxDEV"])("p", {
                                            style: {
                                                color: 'var(--text-muted)'
                                            },
                                            className: "jsx-c2851189ca2202f0",
                                            children: t('dashboard.my_datasets_sub')
                                        }, void 0, false, {
                                            fileName: "[project]/src/components/Dashboard.tsx",
                                            lineNumber: 600,
                                            columnNumber: 33
                                        }, this)
                                    ]
                                }, void 0, true, {
                                    fileName: "[project]/src/components/Dashboard.tsx",
                                    lineNumber: 598,
                                    columnNumber: 29
                                }, this),
                                /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$next$2f$dist$2f$server$2f$route$2d$modules$2f$app$2d$page$2f$vendored$2f$ssr$2f$react$2d$jsx$2d$dev$2d$runtime$2e$js__$5b$app$2d$ssr$5d$__$28$ecmascript$29$__["jsxDEV"])("div", {
                                    style: {
                                        display: 'flex',
                                        alignItems: 'center',
                                        gap: '16px'
                                    },
                                    className: "jsx-c2851189ca2202f0",
                                    children: [
                                        /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$next$2f$dist$2f$server$2f$route$2d$modules$2f$app$2d$page$2f$vendored$2f$ssr$2f$react$2d$jsx$2d$dev$2d$runtime$2e$js__$5b$app$2d$ssr$5d$__$28$ecmascript$29$__["jsxDEV"])("button", {
                                            style: {
                                                display: 'flex',
                                                alignItems: 'center',
                                                gap: '8px',
                                                padding: '8px 16px'
                                            },
                                            onClick: ()=>handleViewChange('upload'),
                                            className: "jsx-c2851189ca2202f0" + " " + "btn-primary",
                                            children: [
                                                /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$next$2f$dist$2f$server$2f$route$2d$modules$2f$app$2d$page$2f$vendored$2f$ssr$2f$react$2d$jsx$2d$dev$2d$runtime$2e$js__$5b$app$2d$ssr$5d$__$28$ecmascript$29$__["jsxDEV"])(__TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$lucide$2d$react$2f$dist$2f$esm$2f$icons$2f$plus$2e$js__$5b$app$2d$ssr$5d$__$28$ecmascript$29$__$3c$export__default__as__Plus$3e$__["Plus"], {
                                                    size: 18
                                                }, void 0, false, {
                                                    fileName: "[project]/src/components/Dashboard.tsx",
                                                    lineNumber: 608,
                                                    columnNumber: 37
                                                }, this),
                                                t('dashboard.new_dataset')
                                            ]
                                        }, void 0, true, {
                                            fileName: "[project]/src/components/Dashboard.tsx",
                                            lineNumber: 603,
                                            columnNumber: 33
                                        }, this),
                                        /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$next$2f$dist$2f$server$2f$route$2d$modules$2f$app$2d$page$2f$vendored$2f$ssr$2f$react$2d$jsx$2d$dev$2d$runtime$2e$js__$5b$app$2d$ssr$5d$__$28$ecmascript$29$__["jsxDEV"])("div", {
                                            style: {
                                                fontSize: '0.875rem',
                                                color: savedDatasets.length >= 3 ? '#fbbf24' : 'var(--text-muted)',
                                                background: 'var(--surface)',
                                                padding: '4px 12px',
                                                borderRadius: '20px',
                                                border: '1px solid var(--border)'
                                            },
                                            className: "jsx-c2851189ca2202f0",
                                            children: [
                                                savedDatasets.length,
                                                "/3 ",
                                                t('dashboard.my_datasets')
                                            ]
                                        }, void 0, true, {
                                            fileName: "[project]/src/components/Dashboard.tsx",
                                            lineNumber: 611,
                                            columnNumber: 33
                                        }, this)
                                    ]
                                }, void 0, true, {
                                    fileName: "[project]/src/components/Dashboard.tsx",
                                    lineNumber: 602,
                                    columnNumber: 29
                                }, this)
                            ]
                        }, void 0, true, {
                            fileName: "[project]/src/components/Dashboard.tsx",
                            lineNumber: 597,
                            columnNumber: 25
                        }, this),
                        isLoadingSaved ? /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$next$2f$dist$2f$server$2f$route$2d$modules$2f$app$2d$page$2f$vendored$2f$ssr$2f$react$2d$jsx$2d$dev$2d$runtime$2e$js__$5b$app$2d$ssr$5d$__$28$ecmascript$29$__["jsxDEV"])("p", {
                            className: "jsx-c2851189ca2202f0",
                            children: "Cargando..."
                        }, void 0, false, {
                            fileName: "[project]/src/components/Dashboard.tsx",
                            lineNumber: 618,
                            columnNumber: 29
                        }, this) : savedDatasets.length > 0 ? /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$next$2f$dist$2f$server$2f$route$2d$modules$2f$app$2d$page$2f$vendored$2f$ssr$2f$react$2d$jsx$2d$dev$2d$runtime$2e$js__$5b$app$2d$ssr$5d$__$28$ecmascript$29$__["jsxDEV"])("div", {
                            style: {
                                display: 'grid',
                                gridTemplateColumns: 'repeat(auto-fill, minmax(300px, 1fr))',
                                gap: '24px'
                            },
                            className: "jsx-c2851189ca2202f0",
                            children: savedDatasets.map((ds)=>/*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$next$2f$dist$2f$server$2f$route$2d$modules$2f$app$2d$page$2f$vendored$2f$ssr$2f$react$2d$jsx$2d$dev$2d$runtime$2e$js__$5b$app$2d$ssr$5d$__$28$ecmascript$29$__["jsxDEV"])("div", {
                                    onClick: (e)=>{
                                        // Only trigger if not clicking on the menu or its children
                                        if (!e.target.closest('.three-dot-menu')) {
                                            handleLoadSavedDataset(ds);
                                        }
                                    },
                                    className: "jsx-c2851189ca2202f0" + " " + "glass-card ds-item",
                                    children: [
                                        /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$next$2f$dist$2f$server$2f$route$2d$modules$2f$app$2d$page$2f$vendored$2f$ssr$2f$react$2d$jsx$2d$dev$2d$runtime$2e$js__$5b$app$2d$ssr$5d$__$28$ecmascript$29$__["jsxDEV"])("div", {
                                            style: {
                                                display: 'flex',
                                                justifyContent: 'space-between',
                                                marginBottom: '16px'
                                            },
                                            className: "jsx-c2851189ca2202f0",
                                            children: [
                                                /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$next$2f$dist$2f$server$2f$route$2d$modules$2f$app$2d$page$2f$vendored$2f$ssr$2f$react$2d$jsx$2d$dev$2d$runtime$2e$js__$5b$app$2d$ssr$5d$__$28$ecmascript$29$__["jsxDEV"])(__TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$lucide$2d$react$2f$dist$2f$esm$2f$icons$2f$file$2d$text$2e$js__$5b$app$2d$ssr$5d$__$28$ecmascript$29$__$3c$export__default__as__FileText$3e$__["FileText"], {
                                                    size: 24,
                                                    color: "var(--primary)"
                                                }, void 0, false, {
                                                    fileName: "[project]/src/components/Dashboard.tsx",
                                                    lineNumber: 633,
                                                    columnNumber: 45
                                                }, this),
                                                /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$next$2f$dist$2f$server$2f$route$2d$modules$2f$app$2d$page$2f$vendored$2f$ssr$2f$react$2d$jsx$2d$dev$2d$runtime$2e$js__$5b$app$2d$ssr$5d$__$28$ecmascript$29$__["jsxDEV"])("div", {
                                                    style: {
                                                        display: 'flex',
                                                        alignItems: 'center',
                                                        gap: '8px'
                                                    },
                                                    className: "jsx-c2851189ca2202f0",
                                                    children: [
                                                        /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$next$2f$dist$2f$server$2f$route$2d$modules$2f$app$2d$page$2f$vendored$2f$ssr$2f$react$2d$jsx$2d$dev$2d$runtime$2e$js__$5b$app$2d$ssr$5d$__$28$ecmascript$29$__["jsxDEV"])("span", {
                                                            style: {
                                                                fontSize: '0.75rem',
                                                                color: 'var(--text-muted)'
                                                            },
                                                            className: "jsx-c2851189ca2202f0",
                                                            children: (0, __TURBOPACK__imported__module__$5b$project$5d2f$src$2f$lib$2f$dateUtils$2e$ts__$5b$app$2d$ssr$5d$__$28$ecmascript$29$__["formatDate"])(ds.created_at)
                                                        }, void 0, false, {
                                                            fileName: "[project]/src/components/Dashboard.tsx",
                                                            lineNumber: 635,
                                                            columnNumber: 49
                                                        }, this),
                                                        /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$next$2f$dist$2f$server$2f$route$2d$modules$2f$app$2d$page$2f$vendored$2f$ssr$2f$react$2d$jsx$2d$dev$2d$runtime$2e$js__$5b$app$2d$ssr$5d$__$28$ecmascript$29$__["jsxDEV"])(__TURBOPACK__imported__module__$5b$project$5d2f$src$2f$components$2f$ui$2f$ThreeDotMenu$2e$tsx__$5b$app$2d$ssr$5d$__$28$ecmascript$29$__["default"], {
                                                            items: [
                                                                {
                                                                    label: t('common.open'),
                                                                    icon: /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$next$2f$dist$2f$server$2f$route$2d$modules$2f$app$2d$page$2f$vendored$2f$ssr$2f$react$2d$jsx$2d$dev$2d$runtime$2e$js__$5b$app$2d$ssr$5d$__$28$ecmascript$29$__["jsxDEV"])(__TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$lucide$2d$react$2f$dist$2f$esm$2f$icons$2f$external$2d$link$2e$js__$5b$app$2d$ssr$5d$__$28$ecmascript$29$__$3c$export__default__as__ExternalLink$3e$__["ExternalLink"], {
                                                                        size: 16
                                                                    }, void 0, false, {
                                                                        fileName: "[project]/src/components/Dashboard.tsx",
                                                                        lineNumber: 639,
                                                                        columnNumber: 86
                                                                    }, void 0),
                                                                    onClick: ()=>handleLoadSavedDataset(ds)
                                                                },
                                                                {
                                                                    label: t('common.delete'),
                                                                    icon: /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$next$2f$dist$2f$server$2f$route$2d$modules$2f$app$2d$page$2f$vendored$2f$ssr$2f$react$2d$jsx$2d$dev$2d$runtime$2e$js__$5b$app$2d$ssr$5d$__$28$ecmascript$29$__["jsxDEV"])(__TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$lucide$2d$react$2f$dist$2f$esm$2f$icons$2f$trash$2d$2$2e$js__$5b$app$2d$ssr$5d$__$28$ecmascript$29$__$3c$export__default__as__Trash2$3e$__["Trash2"], {
                                                                        size: 16
                                                                    }, void 0, false, {
                                                                        fileName: "[project]/src/components/Dashboard.tsx",
                                                                        lineNumber: 640,
                                                                        columnNumber: 88
                                                                    }, void 0),
                                                                    onClick: ()=>handleDeleteDataset(ds),
                                                                    variant: 'danger'
                                                                }
                                                            ]
                                                        }, void 0, false, {
                                                            fileName: "[project]/src/components/Dashboard.tsx",
                                                            lineNumber: 638,
                                                            columnNumber: 49
                                                        }, this)
                                                    ]
                                                }, void 0, true, {
                                                    fileName: "[project]/src/components/Dashboard.tsx",
                                                    lineNumber: 634,
                                                    columnNumber: 45
                                                }, this)
                                            ]
                                        }, void 0, true, {
                                            fileName: "[project]/src/components/Dashboard.tsx",
                                            lineNumber: 632,
                                            columnNumber: 41
                                        }, this),
                                        /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$next$2f$dist$2f$server$2f$route$2d$modules$2f$app$2d$page$2f$vendored$2f$ssr$2f$react$2d$jsx$2d$dev$2d$runtime$2e$js__$5b$app$2d$ssr$5d$__$28$ecmascript$29$__["jsxDEV"])("h3", {
                                            style: {
                                                fontSize: '1rem',
                                                marginBottom: '8px'
                                            },
                                            className: "jsx-c2851189ca2202f0",
                                            children: ds.name
                                        }, void 0, false, {
                                            fileName: "[project]/src/components/Dashboard.tsx",
                                            lineNumber: 644,
                                            columnNumber: 41
                                        }, this),
                                        /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$next$2f$dist$2f$server$2f$route$2d$modules$2f$app$2d$page$2f$vendored$2f$ssr$2f$react$2d$jsx$2d$dev$2d$runtime$2e$js__$5b$app$2d$ssr$5d$__$28$ecmascript$29$__["jsxDEV"])("p", {
                                            style: {
                                                fontSize: '0.8125rem',
                                                color: 'var(--text-muted)'
                                            },
                                            className: "jsx-c2851189ca2202f0",
                                            children: [
                                                ds.columns?.length || 0,
                                                " Columnas • ",
                                                ds.stats?.length || 0,
                                                " Métricas detectadas"
                                            ]
                                        }, void 0, true, {
                                            fileName: "[project]/src/components/Dashboard.tsx",
                                            lineNumber: 645,
                                            columnNumber: 41
                                        }, this)
                                    ]
                                }, ds.id, true, {
                                    fileName: "[project]/src/components/Dashboard.tsx",
                                    lineNumber: 622,
                                    columnNumber: 37
                                }, this))
                        }, void 0, false, {
                            fileName: "[project]/src/components/Dashboard.tsx",
                            lineNumber: 620,
                            columnNumber: 29
                        }, this) : /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$next$2f$dist$2f$server$2f$route$2d$modules$2f$app$2d$page$2f$vendored$2f$ssr$2f$react$2d$jsx$2d$dev$2d$runtime$2e$js__$5b$app$2d$ssr$5d$__$28$ecmascript$29$__["jsxDEV"])("div", {
                            style: {
                                padding: '60px',
                                textAlign: 'center'
                            },
                            className: "jsx-c2851189ca2202f0" + " " + "glass-card",
                            children: [
                                /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$next$2f$dist$2f$server$2f$route$2d$modules$2f$app$2d$page$2f$vendored$2f$ssr$2f$react$2d$jsx$2d$dev$2d$runtime$2e$js__$5b$app$2d$ssr$5d$__$28$ecmascript$29$__["jsxDEV"])(__TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$lucide$2d$react$2f$dist$2f$esm$2f$icons$2f$database$2e$js__$5b$app$2d$ssr$5d$__$28$ecmascript$29$__$3c$export__default__as__Database$3e$__["Database"], {
                                    size: 48,
                                    color: "var(--text-muted)",
                                    style: {
                                        marginBottom: '16px'
                                    }
                                }, void 0, false, {
                                    fileName: "[project]/src/components/Dashboard.tsx",
                                    lineNumber: 653,
                                    columnNumber: 33
                                }, this),
                                /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$next$2f$dist$2f$server$2f$route$2d$modules$2f$app$2d$page$2f$vendored$2f$ssr$2f$react$2d$jsx$2d$dev$2d$runtime$2e$js__$5b$app$2d$ssr$5d$__$28$ecmascript$29$__["jsxDEV"])("h3", {
                                    className: "jsx-c2851189ca2202f0",
                                    children: t('dashboard.no_datasets')
                                }, void 0, false, {
                                    fileName: "[project]/src/components/Dashboard.tsx",
                                    lineNumber: 654,
                                    columnNumber: 33
                                }, this),
                                /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$next$2f$dist$2f$server$2f$route$2d$modules$2f$app$2d$page$2f$vendored$2f$ssr$2f$react$2d$jsx$2d$dev$2d$runtime$2e$js__$5b$app$2d$ssr$5d$__$28$ecmascript$29$__["jsxDEV"])("button", {
                                    style: {
                                        marginTop: '20px'
                                    },
                                    onClick: ()=>setActiveView('upload'),
                                    className: "jsx-c2851189ca2202f0" + " " + "btn-primary",
                                    children: t('dashboard.start_now')
                                }, void 0, false, {
                                    fileName: "[project]/src/components/Dashboard.tsx",
                                    lineNumber: 655,
                                    columnNumber: 33
                                }, this)
                            ]
                        }, void 0, true, {
                            fileName: "[project]/src/components/Dashboard.tsx",
                            lineNumber: 652,
                            columnNumber: 29
                        }, this),
                        /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$next$2f$dist$2f$server$2f$route$2d$modules$2f$app$2d$page$2f$vendored$2f$ssr$2f$react$2d$jsx$2d$dev$2d$runtime$2e$js__$5b$app$2d$ssr$5d$__$28$ecmascript$29$__["jsxDEV"])(__TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$styled$2d$jsx$2f$style$2e$js__$5b$app$2d$ssr$5d$__$28$ecmascript$29$__["default"], {
                            id: "c2851189ca2202f0",
                            children: ".ds-item.jsx-c2851189ca2202f0{cursor:pointer;padding:24px;transition:all .2s}.ds-item.jsx-c2851189ca2202f0:hover{border-color:#ffffff3d;transform:translateY(-2px)}"
                        }, void 0, false, void 0, this)
                    ]
                }, void 0, true, {
                    fileName: "[project]/src/components/Dashboard.tsx",
                    lineNumber: 596,
                    columnNumber: 21
                }, this);
            case 'upload':
                return /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$next$2f$dist$2f$server$2f$route$2d$modules$2f$app$2d$page$2f$vendored$2f$ssr$2f$react$2d$jsx$2d$dev$2d$runtime$2e$js__$5b$app$2d$ssr$5d$__$28$ecmascript$29$__["jsxDEV"])("div", {
                    style: {
                        padding: '40px',
                        maxWidth: '800px',
                        margin: '0 auto'
                    },
                    children: [
                        /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$next$2f$dist$2f$server$2f$route$2d$modules$2f$app$2d$page$2f$vendored$2f$ssr$2f$react$2d$jsx$2d$dev$2d$runtime$2e$js__$5b$app$2d$ssr$5d$__$28$ecmascript$29$__["jsxDEV"])("header", {
                            style: {
                                marginBottom: '32px',
                                textAlign: 'center'
                            },
                            children: [
                                /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$next$2f$dist$2f$server$2f$route$2d$modules$2f$app$2d$page$2f$vendored$2f$ssr$2f$react$2d$jsx$2d$dev$2d$runtime$2e$js__$5b$app$2d$ssr$5d$__$28$ecmascript$29$__["jsxDEV"])("h2", {
                                    style: {
                                        fontSize: '1.75rem',
                                        fontWeight: 600
                                    },
                                    children: "Subir Dataset"
                                }, void 0, false, {
                                    fileName: "[project]/src/components/Dashboard.tsx",
                                    lineNumber: 668,
                                    columnNumber: 29
                                }, this),
                                /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$next$2f$dist$2f$server$2f$route$2d$modules$2f$app$2d$page$2f$vendored$2f$ssr$2f$react$2d$jsx$2d$dev$2d$runtime$2e$js__$5b$app$2d$ssr$5d$__$28$ecmascript$29$__["jsxDEV"])("p", {
                                    style: {
                                        color: 'var(--text-muted)'
                                    },
                                    children: "Aceptamos CSV, Excel (xlsx) y JSON."
                                }, void 0, false, {
                                    fileName: "[project]/src/components/Dashboard.tsx",
                                    lineNumber: 669,
                                    columnNumber: 29
                                }, this)
                            ]
                        }, void 0, true, {
                            fileName: "[project]/src/components/Dashboard.tsx",
                            lineNumber: 667,
                            columnNumber: 25
                        }, this),
                        pendingExcelFile && availableSheets.length > 1 ? /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$next$2f$dist$2f$server$2f$route$2d$modules$2f$app$2d$page$2f$vendored$2f$ssr$2f$react$2d$jsx$2d$dev$2d$runtime$2e$js__$5b$app$2d$ssr$5d$__$28$ecmascript$29$__["jsxDEV"])("div", {
                            className: "glass-card animate-in fade-in slide-in-from-bottom-4 duration-500",
                            style: {
                                padding: '32px'
                            },
                            children: [
                                /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$next$2f$dist$2f$server$2f$route$2d$modules$2f$app$2d$page$2f$vendored$2f$ssr$2f$react$2d$jsx$2d$dev$2d$runtime$2e$js__$5b$app$2d$ssr$5d$__$28$ecmascript$29$__["jsxDEV"])("div", {
                                    style: {
                                        textAlign: 'center',
                                        marginBottom: '24px'
                                    },
                                    children: [
                                        /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$next$2f$dist$2f$server$2f$route$2d$modules$2f$app$2d$page$2f$vendored$2f$ssr$2f$react$2d$jsx$2d$dev$2d$runtime$2e$js__$5b$app$2d$ssr$5d$__$28$ecmascript$29$__["jsxDEV"])("div", {
                                            className: "ds-icon",
                                            style: {
                                                margin: '0 auto 16px',
                                                width: 'fit-content'
                                            },
                                            children: /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$next$2f$dist$2f$server$2f$route$2d$modules$2f$app$2d$page$2f$vendored$2f$ssr$2f$react$2d$jsx$2d$dev$2d$runtime$2e$js__$5b$app$2d$ssr$5d$__$28$ecmascript$29$__["jsxDEV"])(__TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$lucide$2d$react$2f$dist$2f$esm$2f$icons$2f$file$2d$text$2e$js__$5b$app$2d$ssr$5d$__$28$ecmascript$29$__$3c$export__default__as__FileText$3e$__["FileText"], {
                                                size: 32,
                                                color: "var(--primary)"
                                            }, void 0, false, {
                                                fileName: "[project]/src/components/Dashboard.tsx",
                                                lineNumber: 676,
                                                columnNumber: 41
                                            }, this)
                                        }, void 0, false, {
                                            fileName: "[project]/src/components/Dashboard.tsx",
                                            lineNumber: 675,
                                            columnNumber: 37
                                        }, this),
                                        /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$next$2f$dist$2f$server$2f$route$2d$modules$2f$app$2d$page$2f$vendored$2f$ssr$2f$react$2d$jsx$2d$dev$2d$runtime$2e$js__$5b$app$2d$ssr$5d$__$28$ecmascript$29$__["jsxDEV"])("h3", {
                                            style: {
                                                fontSize: '1.25rem',
                                                marginBottom: '8px'
                                            },
                                            children: "Selecciona una hoja"
                                        }, void 0, false, {
                                            fileName: "[project]/src/components/Dashboard.tsx",
                                            lineNumber: 678,
                                            columnNumber: 37
                                        }, this),
                                        /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$next$2f$dist$2f$server$2f$route$2d$modules$2f$app$2d$page$2f$vendored$2f$ssr$2f$react$2d$jsx$2d$dev$2d$runtime$2e$js__$5b$app$2d$ssr$5d$__$28$ecmascript$29$__["jsxDEV"])("p", {
                                            style: {
                                                color: 'var(--text-muted)',
                                                fontSize: '0.9375rem'
                                            },
                                            children: [
                                                'El archivo "',
                                                pendingExcelFile.name,
                                                '" contiene varias hojas. ¿Cuál deseas importar?'
                                            ]
                                        }, void 0, true, {
                                            fileName: "[project]/src/components/Dashboard.tsx",
                                            lineNumber: 679,
                                            columnNumber: 37
                                        }, this)
                                    ]
                                }, void 0, true, {
                                    fileName: "[project]/src/components/Dashboard.tsx",
                                    lineNumber: 674,
                                    columnNumber: 33
                                }, this),
                                /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$next$2f$dist$2f$server$2f$route$2d$modules$2f$app$2d$page$2f$vendored$2f$ssr$2f$react$2d$jsx$2d$dev$2d$runtime$2e$js__$5b$app$2d$ssr$5d$__$28$ecmascript$29$__["jsxDEV"])("div", {
                                    style: {
                                        display: 'grid',
                                        gridTemplateColumns: 'repeat(auto-fill, minmax(180px, 1fr))',
                                        gap: '12px',
                                        marginBottom: '24px'
                                    },
                                    children: availableSheets.map((sheet)=>/*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$next$2f$dist$2f$server$2f$route$2d$modules$2f$app$2d$page$2f$vendored$2f$ssr$2f$react$2d$jsx$2d$dev$2d$runtime$2e$js__$5b$app$2d$ssr$5d$__$28$ecmascript$29$__["jsxDEV"])("button", {
                                            onClick: ()=>setSelectedSheet(sheet),
                                            style: {
                                                padding: '12px 16px',
                                                borderRadius: '12px',
                                                border: '1px solid',
                                                borderColor: selectedSheet === sheet ? 'var(--primary)' : 'var(--border)',
                                                background: selectedSheet === sheet ? 'rgba(139, 92, 246, 0.1)' : 'var(--surface)',
                                                color: selectedSheet === sheet ? 'var(--primary)' : 'var(--text)',
                                                textAlign: 'left',
                                                cursor: 'pointer',
                                                transition: 'all 0.2s',
                                                fontWeight: selectedSheet === sheet ? 600 : 400,
                                                display: 'flex',
                                                alignItems: 'center',
                                                gap: '8px'
                                            },
                                            children: [
                                                /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$next$2f$dist$2f$server$2f$route$2d$modules$2f$app$2d$page$2f$vendored$2f$ssr$2f$react$2d$jsx$2d$dev$2d$runtime$2e$js__$5b$app$2d$ssr$5d$__$28$ecmascript$29$__["jsxDEV"])("div", {
                                                    style: {
                                                        width: '8px',
                                                        height: '8px',
                                                        borderRadius: '50%',
                                                        background: selectedSheet === sheet ? 'var(--primary)' : 'transparent',
                                                        border: selectedSheet === sheet ? 'none' : '1px solid var(--text-muted)'
                                                    }
                                                }, void 0, false, {
                                                    fileName: "[project]/src/components/Dashboard.tsx",
                                                    lineNumber: 705,
                                                    columnNumber: 45
                                                }, this),
                                                sheet
                                            ]
                                        }, sheet, true, {
                                            fileName: "[project]/src/components/Dashboard.tsx",
                                            lineNumber: 686,
                                            columnNumber: 41
                                        }, this))
                                }, void 0, false, {
                                    fileName: "[project]/src/components/Dashboard.tsx",
                                    lineNumber: 684,
                                    columnNumber: 33
                                }, this),
                                /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$next$2f$dist$2f$server$2f$route$2d$modules$2f$app$2d$page$2f$vendored$2f$ssr$2f$react$2d$jsx$2d$dev$2d$runtime$2e$js__$5b$app$2d$ssr$5d$__$28$ecmascript$29$__["jsxDEV"])("div", {
                                    style: {
                                        display: 'flex',
                                        gap: '12px'
                                    },
                                    children: [
                                        /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$next$2f$dist$2f$server$2f$route$2d$modules$2f$app$2d$page$2f$vendored$2f$ssr$2f$react$2d$jsx$2d$dev$2d$runtime$2e$js__$5b$app$2d$ssr$5d$__$28$ecmascript$29$__["jsxDEV"])("button", {
                                            className: "btn-secondary",
                                            style: {
                                                flex: 1,
                                                padding: '12px'
                                            },
                                            onClick: ()=>{
                                                setPendingExcelFile(null);
                                                setAvailableSheets([]);
                                            },
                                            children: "Cancelar"
                                        }, void 0, false, {
                                            fileName: "[project]/src/components/Dashboard.tsx",
                                            lineNumber: 712,
                                            columnNumber: 37
                                        }, this),
                                        /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$next$2f$dist$2f$server$2f$route$2d$modules$2f$app$2d$page$2f$vendored$2f$ssr$2f$react$2d$jsx$2d$dev$2d$runtime$2e$js__$5b$app$2d$ssr$5d$__$28$ecmascript$29$__["jsxDEV"])("button", {
                                            className: "btn-primary",
                                            style: {
                                                flex: 2,
                                                padding: '12px'
                                            },
                                            onClick: ()=>processFile(pendingExcelFile, selectedSheet),
                                            children: "Importar hoja seleccionada"
                                        }, void 0, false, {
                                            fileName: "[project]/src/components/Dashboard.tsx",
                                            lineNumber: 722,
                                            columnNumber: 37
                                        }, this)
                                    ]
                                }, void 0, true, {
                                    fileName: "[project]/src/components/Dashboard.tsx",
                                    lineNumber: 711,
                                    columnNumber: 33
                                }, this)
                            ]
                        }, void 0, true, {
                            fileName: "[project]/src/components/Dashboard.tsx",
                            lineNumber: 673,
                            columnNumber: 29
                        }, this) : /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$next$2f$dist$2f$server$2f$route$2d$modules$2f$app$2d$page$2f$vendored$2f$ssr$2f$react$2d$jsx$2d$dev$2d$runtime$2e$js__$5b$app$2d$ssr$5d$__$28$ecmascript$29$__["jsxDEV"])(__TURBOPACK__imported__module__$5b$project$5d2f$src$2f$components$2f$upload$2f$FileDropzone$2e$tsx__$5b$app$2d$ssr$5d$__$28$ecmascript$29$__["default"], {
                            onFileSelect: handleFileSelect
                        }, void 0, false, {
                            fileName: "[project]/src/components/Dashboard.tsx",
                            lineNumber: 732,
                            columnNumber: 29
                        }, this),
                        isProfiling && /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$next$2f$dist$2f$server$2f$route$2d$modules$2f$app$2d$page$2f$vendored$2f$ssr$2f$react$2d$jsx$2d$dev$2d$runtime$2e$js__$5b$app$2d$ssr$5d$__$28$ecmascript$29$__["jsxDEV"])("div", {
                            style: {
                                marginTop: '24px',
                                textAlign: 'center'
                            },
                            children: /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$next$2f$dist$2f$server$2f$route$2d$modules$2f$app$2d$page$2f$vendored$2f$ssr$2f$react$2d$jsx$2d$dev$2d$runtime$2e$js__$5b$app$2d$ssr$5d$__$28$ecmascript$29$__["jsxDEV"])("p", {
                                className: "animate-pulse",
                                children: "Procesando archivo..."
                            }, void 0, false, {
                                fileName: "[project]/src/components/Dashboard.tsx",
                                lineNumber: 737,
                                columnNumber: 33
                            }, this)
                        }, void 0, false, {
                            fileName: "[project]/src/components/Dashboard.tsx",
                            lineNumber: 736,
                            columnNumber: 29
                        }, this)
                    ]
                }, void 0, true, {
                    fileName: "[project]/src/components/Dashboard.tsx",
                    lineNumber: 666,
                    columnNumber: 21
                }, this);
            case 'reports':
                return /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$next$2f$dist$2f$server$2f$route$2d$modules$2f$app$2d$page$2f$vendored$2f$ssr$2f$react$2d$jsx$2d$dev$2d$runtime$2e$js__$5b$app$2d$ssr$5d$__$28$ecmascript$29$__["jsxDEV"])("div", {
                    style: {
                        padding: '40px'
                    },
                    className: "jsx-946dc2e5f22701ea",
                    children: [
                        /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$next$2f$dist$2f$server$2f$route$2d$modules$2f$app$2d$page$2f$vendored$2f$ssr$2f$react$2d$jsx$2d$dev$2d$runtime$2e$js__$5b$app$2d$ssr$5d$__$28$ecmascript$29$__["jsxDEV"])("header", {
                            style: {
                                marginBottom: '32px',
                                display: 'flex',
                                justifyContent: 'space-between',
                                alignItems: 'flex-end'
                            },
                            className: "jsx-946dc2e5f22701ea",
                            children: [
                                /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$next$2f$dist$2f$server$2f$route$2d$modules$2f$app$2d$page$2f$vendored$2f$ssr$2f$react$2d$jsx$2d$dev$2d$runtime$2e$js__$5b$app$2d$ssr$5d$__$28$ecmascript$29$__["jsxDEV"])("div", {
                                    className: "jsx-946dc2e5f22701ea",
                                    children: [
                                        /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$next$2f$dist$2f$server$2f$route$2d$modules$2f$app$2d$page$2f$vendored$2f$ssr$2f$react$2d$jsx$2d$dev$2d$runtime$2e$js__$5b$app$2d$ssr$5d$__$28$ecmascript$29$__["jsxDEV"])("h2", {
                                            style: {
                                                fontSize: '1.75rem',
                                                fontWeight: 600
                                            },
                                            className: "jsx-946dc2e5f22701ea",
                                            children: t('dashboard.my_reports')
                                        }, void 0, false, {
                                            fileName: "[project]/src/components/Dashboard.tsx",
                                            lineNumber: 747,
                                            columnNumber: 33
                                        }, this),
                                        /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$next$2f$dist$2f$server$2f$route$2d$modules$2f$app$2d$page$2f$vendored$2f$ssr$2f$react$2d$jsx$2d$dev$2d$runtime$2e$js__$5b$app$2d$ssr$5d$__$28$ecmascript$29$__["jsxDEV"])("p", {
                                            style: {
                                                color: 'var(--text-muted)'
                                            },
                                            className: "jsx-946dc2e5f22701ea",
                                            children: t('dashboard.my_reports_sub')
                                        }, void 0, false, {
                                            fileName: "[project]/src/components/Dashboard.tsx",
                                            lineNumber: 748,
                                            columnNumber: 33
                                        }, this)
                                    ]
                                }, void 0, true, {
                                    fileName: "[project]/src/components/Dashboard.tsx",
                                    lineNumber: 746,
                                    columnNumber: 29
                                }, this),
                                /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$next$2f$dist$2f$server$2f$route$2d$modules$2f$app$2d$page$2f$vendored$2f$ssr$2f$react$2d$jsx$2d$dev$2d$runtime$2e$js__$5b$app$2d$ssr$5d$__$28$ecmascript$29$__["jsxDEV"])("div", {
                                    style: {
                                        fontSize: '0.875rem',
                                        color: savedReports.length >= 10 ? '#fbbf24' : 'var(--text-muted)',
                                        background: 'var(--surface)',
                                        padding: '4px 12px',
                                        borderRadius: '20px',
                                        border: '1px solid var(--border)'
                                    },
                                    className: "jsx-946dc2e5f22701ea",
                                    children: [
                                        savedReports.length,
                                        " ",
                                        t('dashboard.my_reports')
                                    ]
                                }, void 0, true, {
                                    fileName: "[project]/src/components/Dashboard.tsx",
                                    lineNumber: 750,
                                    columnNumber: 29
                                }, this)
                            ]
                        }, void 0, true, {
                            fileName: "[project]/src/components/Dashboard.tsx",
                            lineNumber: 745,
                            columnNumber: 25
                        }, this),
                        savedReports.length > 0 ? /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$next$2f$dist$2f$server$2f$route$2d$modules$2f$app$2d$page$2f$vendored$2f$ssr$2f$react$2d$jsx$2d$dev$2d$runtime$2e$js__$5b$app$2d$ssr$5d$__$28$ecmascript$29$__["jsxDEV"])("div", {
                            style: {
                                display: 'grid',
                                gridTemplateColumns: 'repeat(auto-fill, minmax(320px, 1fr))',
                                gap: '24px'
                            },
                            className: "jsx-946dc2e5f22701ea",
                            children: savedReports.map((report)=>/*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$next$2f$dist$2f$server$2f$route$2d$modules$2f$app$2d$page$2f$vendored$2f$ssr$2f$react$2d$jsx$2d$dev$2d$runtime$2e$js__$5b$app$2d$ssr$5d$__$28$ecmascript$29$__["jsxDEV"])("div", {
                                    onClick: (e)=>{
                                        // Only trigger if not clicking on the menu or its children
                                        if (!e.target.closest('.three-dot-menu')) {
                                            handleLoadSavedReport(report);
                                        }
                                    },
                                    className: "jsx-946dc2e5f22701ea" + " " + "glass-card report-item",
                                    children: [
                                        /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$next$2f$dist$2f$server$2f$route$2d$modules$2f$app$2d$page$2f$vendored$2f$ssr$2f$react$2d$jsx$2d$dev$2d$runtime$2e$js__$5b$app$2d$ssr$5d$__$28$ecmascript$29$__["jsxDEV"])("div", {
                                            style: {
                                                display: 'flex',
                                                justifyContent: 'space-between',
                                                marginBottom: '16px'
                                            },
                                            className: "jsx-946dc2e5f22701ea",
                                            children: [
                                                /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$next$2f$dist$2f$server$2f$route$2d$modules$2f$app$2d$page$2f$vendored$2f$ssr$2f$react$2d$jsx$2d$dev$2d$runtime$2e$js__$5b$app$2d$ssr$5d$__$28$ecmascript$29$__["jsxDEV"])(__TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$lucide$2d$react$2f$dist$2f$esm$2f$icons$2f$activity$2e$js__$5b$app$2d$ssr$5d$__$28$ecmascript$29$__$3c$export__default__as__Activity$3e$__["Activity"], {
                                                    size: 24,
                                                    color: "var(--accent)"
                                                }, void 0, false, {
                                                    fileName: "[project]/src/components/Dashboard.tsx",
                                                    lineNumber: 769,
                                                    columnNumber: 45
                                                }, this),
                                                /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$next$2f$dist$2f$server$2f$route$2d$modules$2f$app$2d$page$2f$vendored$2f$ssr$2f$react$2d$jsx$2d$dev$2d$runtime$2e$js__$5b$app$2d$ssr$5d$__$28$ecmascript$29$__["jsxDEV"])("div", {
                                                    style: {
                                                        display: 'flex',
                                                        alignItems: 'center',
                                                        gap: '8px'
                                                    },
                                                    className: "jsx-946dc2e5f22701ea",
                                                    children: [
                                                        /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$next$2f$dist$2f$server$2f$route$2d$modules$2f$app$2d$page$2f$vendored$2f$ssr$2f$react$2d$jsx$2d$dev$2d$runtime$2e$js__$5b$app$2d$ssr$5d$__$28$ecmascript$29$__["jsxDEV"])("span", {
                                                            style: {
                                                                fontSize: '0.75rem',
                                                                color: 'var(--text-muted)'
                                                            },
                                                            className: "jsx-946dc2e5f22701ea",
                                                            children: (0, __TURBOPACK__imported__module__$5b$project$5d2f$src$2f$lib$2f$dateUtils$2e$ts__$5b$app$2d$ssr$5d$__$28$ecmascript$29$__["formatDate"])(report.created_at)
                                                        }, void 0, false, {
                                                            fileName: "[project]/src/components/Dashboard.tsx",
                                                            lineNumber: 771,
                                                            columnNumber: 49
                                                        }, this),
                                                        /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$next$2f$dist$2f$server$2f$route$2d$modules$2f$app$2d$page$2f$vendored$2f$ssr$2f$react$2d$jsx$2d$dev$2d$runtime$2e$js__$5b$app$2d$ssr$5d$__$28$ecmascript$29$__["jsxDEV"])(__TURBOPACK__imported__module__$5b$project$5d2f$src$2f$components$2f$ui$2f$ThreeDotMenu$2e$tsx__$5b$app$2d$ssr$5d$__$28$ecmascript$29$__["default"], {
                                                            items: [
                                                                {
                                                                    label: t('common.open'),
                                                                    icon: /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$next$2f$dist$2f$server$2f$route$2d$modules$2f$app$2d$page$2f$vendored$2f$ssr$2f$react$2d$jsx$2d$dev$2d$runtime$2e$js__$5b$app$2d$ssr$5d$__$28$ecmascript$29$__["jsxDEV"])(__TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$lucide$2d$react$2f$dist$2f$esm$2f$icons$2f$external$2d$link$2e$js__$5b$app$2d$ssr$5d$__$28$ecmascript$29$__$3c$export__default__as__ExternalLink$3e$__["ExternalLink"], {
                                                                        size: 16
                                                                    }, void 0, false, {
                                                                        fileName: "[project]/src/components/Dashboard.tsx",
                                                                        lineNumber: 775,
                                                                        columnNumber: 86
                                                                    }, void 0),
                                                                    onClick: ()=>handleLoadSavedReport(report)
                                                                },
                                                                {
                                                                    label: t('common.rename'),
                                                                    icon: /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$next$2f$dist$2f$server$2f$route$2d$modules$2f$app$2d$page$2f$vendored$2f$ssr$2f$react$2d$jsx$2d$dev$2d$runtime$2e$js__$5b$app$2d$ssr$5d$__$28$ecmascript$29$__["jsxDEV"])(__TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$lucide$2d$react$2f$dist$2f$esm$2f$icons$2f$pen$2e$js__$5b$app$2d$ssr$5d$__$28$ecmascript$29$__$3c$export__default__as__Edit2$3e$__["Edit2"], {
                                                                        size: 16
                                                                    }, void 0, false, {
                                                                        fileName: "[project]/src/components/Dashboard.tsx",
                                                                        lineNumber: 776,
                                                                        columnNumber: 88
                                                                    }, void 0),
                                                                    onClick: ()=>handleRenameReport(report)
                                                                },
                                                                {
                                                                    label: t('common.delete'),
                                                                    icon: /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$next$2f$dist$2f$server$2f$route$2d$modules$2f$app$2d$page$2f$vendored$2f$ssr$2f$react$2d$jsx$2d$dev$2d$runtime$2e$js__$5b$app$2d$ssr$5d$__$28$ecmascript$29$__["jsxDEV"])(__TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$lucide$2d$react$2f$dist$2f$esm$2f$icons$2f$trash$2d$2$2e$js__$5b$app$2d$ssr$5d$__$28$ecmascript$29$__$3c$export__default__as__Trash2$3e$__["Trash2"], {
                                                                        size: 16
                                                                    }, void 0, false, {
                                                                        fileName: "[project]/src/components/Dashboard.tsx",
                                                                        lineNumber: 777,
                                                                        columnNumber: 88
                                                                    }, void 0),
                                                                    onClick: ()=>handleDeleteReport(report.id),
                                                                    variant: 'danger'
                                                                }
                                                            ]
                                                        }, void 0, false, {
                                                            fileName: "[project]/src/components/Dashboard.tsx",
                                                            lineNumber: 774,
                                                            columnNumber: 49
                                                        }, this)
                                                    ]
                                                }, void 0, true, {
                                                    fileName: "[project]/src/components/Dashboard.tsx",
                                                    lineNumber: 770,
                                                    columnNumber: 45
                                                }, this)
                                            ]
                                        }, void 0, true, {
                                            fileName: "[project]/src/components/Dashboard.tsx",
                                            lineNumber: 768,
                                            columnNumber: 41
                                        }, this),
                                        /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$next$2f$dist$2f$server$2f$route$2d$modules$2f$app$2d$page$2f$vendored$2f$ssr$2f$react$2d$jsx$2d$dev$2d$runtime$2e$js__$5b$app$2d$ssr$5d$__$28$ecmascript$29$__["jsxDEV"])("h3", {
                                            style: {
                                                fontSize: '1.125rem',
                                                marginBottom: '8px'
                                            },
                                            className: "jsx-946dc2e5f22701ea",
                                            children: report.name
                                        }, void 0, false, {
                                            fileName: "[project]/src/components/Dashboard.tsx",
                                            lineNumber: 781,
                                            columnNumber: 41
                                        }, this),
                                        /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$next$2f$dist$2f$server$2f$route$2d$modules$2f$app$2d$page$2f$vendored$2f$ssr$2f$react$2d$jsx$2d$dev$2d$runtime$2e$js__$5b$app$2d$ssr$5d$__$28$ecmascript$29$__["jsxDEV"])("div", {
                                            style: {
                                                display: 'flex',
                                                alignItems: 'center',
                                                gap: '8px',
                                                marginTop: '16px'
                                            },
                                            className: "jsx-946dc2e5f22701ea",
                                            children: /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$next$2f$dist$2f$server$2f$route$2d$modules$2f$app$2d$page$2f$vendored$2f$ssr$2f$react$2d$jsx$2d$dev$2d$runtime$2e$js__$5b$app$2d$ssr$5d$__$28$ecmascript$29$__["jsxDEV"])("span", {
                                                style: {
                                                    fontSize: '0.75rem',
                                                    color: 'var(--text-muted)'
                                                },
                                                className: "jsx-946dc2e5f22701ea",
                                                children: savedDatasets.find((d)=>d.id === report.dataset_id)?.name || 'Dataset asociado'
                                            }, void 0, false, {
                                                fileName: "[project]/src/components/Dashboard.tsx",
                                                lineNumber: 783,
                                                columnNumber: 45
                                            }, this)
                                        }, void 0, false, {
                                            fileName: "[project]/src/components/Dashboard.tsx",
                                            lineNumber: 782,
                                            columnNumber: 41
                                        }, this)
                                    ]
                                }, report.id, true, {
                                    fileName: "[project]/src/components/Dashboard.tsx",
                                    lineNumber: 758,
                                    columnNumber: 37
                                }, this))
                        }, void 0, false, {
                            fileName: "[project]/src/components/Dashboard.tsx",
                            lineNumber: 756,
                            columnNumber: 29
                        }, this) : /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$next$2f$dist$2f$server$2f$route$2d$modules$2f$app$2d$page$2f$vendored$2f$ssr$2f$react$2d$jsx$2d$dev$2d$runtime$2e$js__$5b$app$2d$ssr$5d$__$28$ecmascript$29$__["jsxDEV"])("div", {
                            style: {
                                padding: '60px',
                                textAlign: 'center'
                            },
                            className: "jsx-946dc2e5f22701ea" + " " + "glass-card",
                            children: [
                                /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$next$2f$dist$2f$server$2f$route$2d$modules$2f$app$2d$page$2f$vendored$2f$ssr$2f$react$2d$jsx$2d$dev$2d$runtime$2e$js__$5b$app$2d$ssr$5d$__$28$ecmascript$29$__["jsxDEV"])(__TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$lucide$2d$react$2f$dist$2f$esm$2f$icons$2f$activity$2e$js__$5b$app$2d$ssr$5d$__$28$ecmascript$29$__$3c$export__default__as__Activity$3e$__["Activity"], {
                                    size: 48,
                                    color: "var(--text-muted)",
                                    style: {
                                        marginBottom: '16px'
                                    }
                                }, void 0, false, {
                                    fileName: "[project]/src/components/Dashboard.tsx",
                                    lineNumber: 792,
                                    columnNumber: 33
                                }, this),
                                /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$next$2f$dist$2f$server$2f$route$2d$modules$2f$app$2d$page$2f$vendored$2f$ssr$2f$react$2d$jsx$2d$dev$2d$runtime$2e$js__$5b$app$2d$ssr$5d$__$28$ecmascript$29$__["jsxDEV"])("h3", {
                                    className: "jsx-946dc2e5f22701ea",
                                    children: t('dashboard.no_reports')
                                }, void 0, false, {
                                    fileName: "[project]/src/components/Dashboard.tsx",
                                    lineNumber: 793,
                                    columnNumber: 33
                                }, this),
                                /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$next$2f$dist$2f$server$2f$route$2d$modules$2f$app$2d$page$2f$vendored$2f$ssr$2f$react$2d$jsx$2d$dev$2d$runtime$2e$js__$5b$app$2d$ssr$5d$__$28$ecmascript$29$__["jsxDEV"])("p", {
                                    style: {
                                        color: 'var(--text-muted)',
                                        marginTop: '8px'
                                    },
                                    className: "jsx-946dc2e5f22701ea",
                                    children: t('dashboard.no_reports_sub')
                                }, void 0, false, {
                                    fileName: "[project]/src/components/Dashboard.tsx",
                                    lineNumber: 794,
                                    columnNumber: 33
                                }, this),
                                /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$next$2f$dist$2f$server$2f$route$2d$modules$2f$app$2d$page$2f$vendored$2f$ssr$2f$react$2d$jsx$2d$dev$2d$runtime$2e$js__$5b$app$2d$ssr$5d$__$28$ecmascript$29$__["jsxDEV"])("button", {
                                    style: {
                                        marginTop: '24px'
                                    },
                                    onClick: ()=>handleViewChange('upload'),
                                    className: "jsx-946dc2e5f22701ea" + " " + "btn-primary",
                                    children: t('dashboard.start_now')
                                }, void 0, false, {
                                    fileName: "[project]/src/components/Dashboard.tsx",
                                    lineNumber: 795,
                                    columnNumber: 33
                                }, this)
                            ]
                        }, void 0, true, {
                            fileName: "[project]/src/components/Dashboard.tsx",
                            lineNumber: 791,
                            columnNumber: 29
                        }, this),
                        /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$next$2f$dist$2f$server$2f$route$2d$modules$2f$app$2d$page$2f$vendored$2f$ssr$2f$react$2d$jsx$2d$dev$2d$runtime$2e$js__$5b$app$2d$ssr$5d$__$28$ecmascript$29$__["jsxDEV"])(__TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$styled$2d$jsx$2f$style$2e$js__$5b$app$2d$ssr$5d$__$28$ecmascript$29$__["default"], {
                            id: "946dc2e5f22701ea",
                            children: '.report-item.jsx-946dc2e5f22701ea{cursor:pointer;padding:24px;transition:all .2s;position:relative;overflow:hidden}.report-item.jsx-946dc2e5f22701ea:hover{border-color:#ffffff3d;transform:translateY(-4px)}.report-item.jsx-946dc2e5f22701ea:after{content:"";opacity:0;background:linear-gradient(90deg,#0000,#ffffffbf,#0000);width:100%;height:2px;transition:opacity .2s;position:absolute;bottom:0;left:0}.report-item.jsx-946dc2e5f22701ea:hover:after{opacity:1}.badge-small.jsx-946dc2e5f22701ea{background:var(--surface-light);color:var(--accent);border-radius:4px;padding:4px 8px;font-size:.65rem}'
                        }, void 0, false, void 0, this)
                    ]
                }, void 0, true, {
                    fileName: "[project]/src/components/Dashboard.tsx",
                    lineNumber: 744,
                    columnNumber: 21
                }, this);
            case 'settings':
                return /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$next$2f$dist$2f$server$2f$route$2d$modules$2f$app$2d$page$2f$vendored$2f$ssr$2f$react$2d$jsx$2d$dev$2d$runtime$2e$js__$5b$app$2d$ssr$5d$__$28$ecmascript$29$__["jsxDEV"])(__TURBOPACK__imported__module__$5b$project$5d2f$src$2f$components$2f$layout$2f$SettingsView$2e$tsx__$5b$app$2d$ssr$5d$__$28$ecmascript$29$__["default"], {}, void 0, false, {
                    fileName: "[project]/src/components/Dashboard.tsx",
                    lineNumber: 814,
                    columnNumber: 24
                }, this);
            default:
                return null;
        }
    };
    return /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$next$2f$dist$2f$server$2f$route$2d$modules$2f$app$2d$page$2f$vendored$2f$ssr$2f$react$2d$jsx$2d$dev$2d$runtime$2e$js__$5b$app$2d$ssr$5d$__$28$ecmascript$29$__["jsxDEV"])(__TURBOPACK__imported__module__$5b$project$5d2f$src$2f$components$2f$layout$2f$DashboardLayout$2e$tsx__$5b$app$2d$ssr$5d$__$28$ecmascript$29$__["default"], {
        activeView: activeView,
        onViewChange: handleViewChange,
        onLogout: handleLogout,
        userName: user.user_metadata.full_name || user.email,
        children: [
            renderContent(),
            showConfirmModal && /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$next$2f$dist$2f$server$2f$route$2d$modules$2f$app$2d$page$2f$vendored$2f$ssr$2f$react$2d$jsx$2d$dev$2d$runtime$2e$js__$5b$app$2d$ssr$5d$__$28$ecmascript$29$__["jsxDEV"])("div", {
                style: {
                    position: 'fixed',
                    inset: 0,
                    zIndex: 100,
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'center',
                    background: 'rgba(0,0,0,0.8)',
                    backdropFilter: 'blur(8px)'
                },
                children: /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$next$2f$dist$2f$server$2f$route$2d$modules$2f$app$2d$page$2f$vendored$2f$ssr$2f$react$2d$jsx$2d$dev$2d$runtime$2e$js__$5b$app$2d$ssr$5d$__$28$ecmascript$29$__["jsxDEV"])("div", {
                    className: "glass-card",
                    style: {
                        padding: '32px',
                        maxWidth: '450px',
                        width: '90%',
                        border: '1px solid var(--border)'
                    },
                    children: [
                        /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$next$2f$dist$2f$server$2f$route$2d$modules$2f$app$2d$page$2f$vendored$2f$ssr$2f$react$2d$jsx$2d$dev$2d$runtime$2e$js__$5b$app$2d$ssr$5d$__$28$ecmascript$29$__["jsxDEV"])("h3", {
                            style: {
                                fontSize: '1.25rem',
                                marginBottom: '12px'
                            },
                            children: "Cambios sin guardar"
                        }, void 0, false, {
                            fileName: "[project]/src/components/Dashboard.tsx",
                            lineNumber: 842,
                            columnNumber: 25
                        }, this),
                        /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$next$2f$dist$2f$server$2f$route$2d$modules$2f$app$2d$page$2f$vendored$2f$ssr$2f$react$2d$jsx$2d$dev$2d$runtime$2e$js__$5b$app$2d$ssr$5d$__$28$ecmascript$29$__["jsxDEV"])("p", {
                            style: {
                                color: 'var(--text-muted)',
                                marginBottom: '24px',
                                fontSize: '0.9375rem',
                                lineHeight: '1.5'
                            },
                            children: "Tienes cambios pendientes en tu reporte. ¿Qué deseas hacer antes de salir?"
                        }, void 0, false, {
                            fileName: "[project]/src/components/Dashboard.tsx",
                            lineNumber: 843,
                            columnNumber: 25
                        }, this),
                        /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$next$2f$dist$2f$server$2f$route$2d$modules$2f$app$2d$page$2f$vendored$2f$ssr$2f$react$2d$jsx$2d$dev$2d$runtime$2e$js__$5b$app$2d$ssr$5d$__$28$ecmascript$29$__["jsxDEV"])("div", {
                            style: {
                                display: 'flex',
                                flexDirection: 'column',
                                gap: '10px'
                            },
                            children: [
                                /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$next$2f$dist$2f$server$2f$route$2d$modules$2f$app$2d$page$2f$vendored$2f$ssr$2f$react$2d$jsx$2d$dev$2d$runtime$2e$js__$5b$app$2d$ssr$5d$__$28$ecmascript$29$__["jsxDEV"])("button", {
                                    className: "btn-primary",
                                    onClick: ()=>confirmNavigation('save'),
                                    style: {
                                        padding: '12px'
                                    },
                                    children: "Guardar y salir"
                                }, void 0, false, {
                                    fileName: "[project]/src/components/Dashboard.tsx",
                                    lineNumber: 847,
                                    columnNumber: 29
                                }, this),
                                canvasRef.current?.reportName && /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$next$2f$dist$2f$server$2f$route$2d$modules$2f$app$2d$page$2f$vendored$2f$ssr$2f$react$2d$jsx$2d$dev$2d$runtime$2e$js__$5b$app$2d$ssr$5d$__$28$ecmascript$29$__["jsxDEV"])("button", {
                                    className: "btn-secondary",
                                    onClick: ()=>confirmNavigation('saveAs'),
                                    style: {
                                        padding: '12px',
                                        background: 'rgba(255,255,255,0.05)',
                                        border: '1px solid var(--border)',
                                        color: '#ffffffff'
                                    },
                                    children: "Guardar como..."
                                }, void 0, false, {
                                    fileName: "[project]/src/components/Dashboard.tsx",
                                    lineNumber: 855,
                                    columnNumber: 33
                                }, this),
                                /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$next$2f$dist$2f$server$2f$route$2d$modules$2f$app$2d$page$2f$vendored$2f$ssr$2f$react$2d$jsx$2d$dev$2d$runtime$2e$js__$5b$app$2d$ssr$5d$__$28$ecmascript$29$__["jsxDEV"])("button", {
                                    onClick: ()=>confirmNavigation('discard'),
                                    style: {
                                        padding: '12px',
                                        background: 'transparent',
                                        border: 'none',
                                        color: '#f87171',
                                        cursor: 'pointer',
                                        fontSize: '0.875rem'
                                    },
                                    children: "Descartar cambios"
                                }, void 0, false, {
                                    fileName: "[project]/src/components/Dashboard.tsx",
                                    lineNumber: 863,
                                    columnNumber: 29
                                }, this),
                                /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$next$2f$dist$2f$server$2f$route$2d$modules$2f$app$2d$page$2f$vendored$2f$ssr$2f$react$2d$jsx$2d$dev$2d$runtime$2e$js__$5b$app$2d$ssr$5d$__$28$ecmascript$29$__["jsxDEV"])("button", {
                                    onClick: ()=>confirmNavigation('cancel'),
                                    style: {
                                        padding: '12px',
                                        background: 'transparent',
                                        border: 'none',
                                        color: 'var(--text-muted)',
                                        cursor: 'pointer',
                                        fontSize: '0.875rem'
                                    },
                                    children: "Cancelar"
                                }, void 0, false, {
                                    fileName: "[project]/src/components/Dashboard.tsx",
                                    lineNumber: 869,
                                    columnNumber: 29
                                }, this)
                            ]
                        }, void 0, true, {
                            fileName: "[project]/src/components/Dashboard.tsx",
                            lineNumber: 846,
                            columnNumber: 25
                        }, this)
                    ]
                }, void 0, true, {
                    fileName: "[project]/src/components/Dashboard.tsx",
                    lineNumber: 841,
                    columnNumber: 21
                }, this)
            }, void 0, false, {
                fileName: "[project]/src/components/Dashboard.tsx",
                lineNumber: 831,
                columnNumber: 17
            }, this)
        ]
    }, void 0, true, {
        fileName: "[project]/src/components/Dashboard.tsx",
        lineNumber: 821,
        columnNumber: 9
    }, this);
}
function Dashboard() {
    return /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$next$2f$dist$2f$server$2f$route$2d$modules$2f$app$2d$page$2f$vendored$2f$ssr$2f$react$2d$jsx$2d$dev$2d$runtime$2e$js__$5b$app$2d$ssr$5d$__$28$ecmascript$29$__["jsxDEV"])(DashboardContent, {}, void 0, false, {
        fileName: "[project]/src/components/Dashboard.tsx",
        lineNumber: 884,
        columnNumber: 12
    }, this);
}
}),
];

//# sourceMappingURL=%5Broot-of-the-server%5D__0b56601c._.js.map