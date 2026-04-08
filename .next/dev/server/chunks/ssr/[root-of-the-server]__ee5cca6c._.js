module.exports = [
"[externals]/next/dist/server/app-render/action-async-storage.external.js [external] (next/dist/server/app-render/action-async-storage.external.js, cjs)", ((__turbopack_context__, module, exports) => {

const mod = __turbopack_context__.x("next/dist/server/app-render/action-async-storage.external.js", () => require("next/dist/server/app-render/action-async-storage.external.js"));

module.exports = mod;
}),
"[externals]/next/dist/server/app-render/work-unit-async-storage.external.js [external] (next/dist/server/app-render/work-unit-async-storage.external.js, cjs)", ((__turbopack_context__, module, exports) => {

const mod = __turbopack_context__.x("next/dist/server/app-render/work-unit-async-storage.external.js", () => require("next/dist/server/app-render/work-unit-async-storage.external.js"));

module.exports = mod;
}),
"[externals]/next/dist/server/app-render/work-async-storage.external.js [external] (next/dist/server/app-render/work-async-storage.external.js, cjs)", ((__turbopack_context__, module, exports) => {

const mod = __turbopack_context__.x("next/dist/server/app-render/work-async-storage.external.js", () => require("next/dist/server/app-render/work-async-storage.external.js"));

module.exports = mod;
}),
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
'use client';
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
function ChartRenderer({ type, data, xAxis, yAxis, orientation = 'vertical', colorScheme = 'varied', colorByCategory = true, colors = DEFAULT_COLORS, customColor }) {
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
                    lineNumber: 69,
                    columnNumber: 21
                }, this)
            }, void 0, false, {
                fileName: "[project]/src/components/visuals/ChartRenderer.tsx",
                lineNumber: 68,
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
                    lineNumber: 80,
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
                    children: name
                }, void 0, false, {
                    fileName: "[project]/src/components/visuals/ChartRenderer.tsx",
                    lineNumber: 81,
                    columnNumber: 17
                }, this)
            ]
        }, void 0, true, {
            fileName: "[project]/src/components/visuals/ChartRenderer.tsx",
            lineNumber: 79,
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
        lineNumber: 102,
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
            lineNumber: 105,
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
                        children: label || data.name
                    }, void 0, false, {
                        fileName: "[project]/src/components/visuals/ChartRenderer.tsx",
                        lineNumber: 113,
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
                                    children: entry.value
                                }, void 0, false, {
                                    fileName: "[project]/src/components/visuals/ChartRenderer.tsx",
                                    lineNumber: 116,
                                    columnNumber: 54
                                }, this)
                            ]
                        }, index, true, {
                            fileName: "[project]/src/components/visuals/ChartRenderer.tsx",
                            lineNumber: 115,
                            columnNumber: 25
                        }, this))
                ]
            }, void 0, true, {
                fileName: "[project]/src/components/visuals/ChartRenderer.tsx",
                lineNumber: 112,
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
                                    lineNumber: 133,
                                    columnNumber: 33
                                }, this))
                        }, void 0, false, {
                            fileName: "[project]/src/components/visuals/ChartRenderer.tsx",
                            lineNumber: 131,
                            columnNumber: 25
                        }, this)
                    }, void 0, false, {
                        fileName: "[project]/src/components/visuals/ChartRenderer.tsx",
                        lineNumber: 130,
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
                                        children: typeof row[col] === 'number' ? row[col].toLocaleString() : String(row[col])
                                    }, col, false, {
                                        fileName: "[project]/src/components/visuals/ChartRenderer.tsx",
                                        lineNumber: 141,
                                        columnNumber: 37
                                    }, this))
                            }, i, false, {
                                fileName: "[project]/src/components/visuals/ChartRenderer.tsx",
                                lineNumber: 139,
                                columnNumber: 29
                            }, this))
                    }, void 0, false, {
                        fileName: "[project]/src/components/visuals/ChartRenderer.tsx",
                        lineNumber: 137,
                        columnNumber: 21
                    }, this)
                ]
            }, void 0, true, {
                fileName: "[project]/src/components/visuals/ChartRenderer.tsx",
                lineNumber: 129,
                columnNumber: 17
            }, this)
        }, void 0, false, {
            fileName: "[project]/src/components/visuals/ChartRenderer.tsx",
            lineNumber: 128,
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
                            lineNumber: 182,
                            columnNumber: 25
                        }, this),
                        /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$next$2f$dist$2f$server$2f$route$2d$modules$2f$app$2d$page$2f$vendored$2f$ssr$2f$react$2d$jsx$2d$dev$2d$runtime$2e$js__$5b$app$2d$ssr$5d$__$28$ecmascript$29$__["jsxDEV"])(__TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$recharts$2f$es6$2f$component$2f$Tooltip$2e$js__$5b$app$2d$ssr$5d$__$28$ecmascript$29$__["Tooltip"], {
                            content: /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$next$2f$dist$2f$server$2f$route$2d$modules$2f$app$2d$page$2f$vendored$2f$ssr$2f$react$2d$jsx$2d$dev$2d$runtime$2e$js__$5b$app$2d$ssr$5d$__$28$ecmascript$29$__["jsxDEV"])(CustomTooltip, {}, void 0, false, {
                                fileName: "[project]/src/components/visuals/ChartRenderer.tsx",
                                lineNumber: 189,
                                columnNumber: 43
                            }, void 0),
                            isAnimationActive: false
                        }, void 0, false, {
                            fileName: "[project]/src/components/visuals/ChartRenderer.tsx",
                            lineNumber: 189,
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
                            lineNumber: 197,
                            columnNumber: 25
                        }, this),
                        isHorizontal ? /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$next$2f$dist$2f$server$2f$route$2d$modules$2f$app$2d$page$2f$vendored$2f$ssr$2f$react$2d$jsx$2d$dev$2d$runtime$2e$js__$5b$app$2d$ssr$5d$__$28$ecmascript$29$__["jsxDEV"])(__TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$next$2f$dist$2f$server$2f$route$2d$modules$2f$app$2d$page$2f$vendored$2f$ssr$2f$react$2d$jsx$2d$dev$2d$runtime$2e$js__$5b$app$2d$ssr$5d$__$28$ecmascript$29$__["Fragment"], {
                            children: [
                                /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$next$2f$dist$2f$server$2f$route$2d$modules$2f$app$2d$page$2f$vendored$2f$ssr$2f$react$2d$jsx$2d$dev$2d$runtime$2e$js__$5b$app$2d$ssr$5d$__$28$ecmascript$29$__["jsxDEV"])(__TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$recharts$2f$es6$2f$cartesian$2f$XAxis$2e$js__$5b$app$2d$ssr$5d$__$28$ecmascript$29$__["XAxis"], {
                                    type: "number",
                                    ...axisProps
                                }, void 0, false, {
                                    fileName: "[project]/src/components/visuals/ChartRenderer.tsx",
                                    lineNumber: 200,
                                    columnNumber: 33
                                }, this),
                                /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$next$2f$dist$2f$server$2f$route$2d$modules$2f$app$2d$page$2f$vendored$2f$ssr$2f$react$2d$jsx$2d$dev$2d$runtime$2e$js__$5b$app$2d$ssr$5d$__$28$ecmascript$29$__["jsxDEV"])(__TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$recharts$2f$es6$2f$cartesian$2f$YAxis$2e$js__$5b$app$2d$ssr$5d$__$28$ecmascript$29$__["YAxis"], {
                                    dataKey: xAxis,
                                    type: "category",
                                    ...axisProps,
                                    width: 100
                                }, void 0, false, {
                                    fileName: "[project]/src/components/visuals/ChartRenderer.tsx",
                                    lineNumber: 201,
                                    columnNumber: 33
                                }, this)
                            ]
                        }, void 0, true) : /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$next$2f$dist$2f$server$2f$route$2d$modules$2f$app$2d$page$2f$vendored$2f$ssr$2f$react$2d$jsx$2d$dev$2d$runtime$2e$js__$5b$app$2d$ssr$5d$__$28$ecmascript$29$__["jsxDEV"])(__TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$next$2f$dist$2f$server$2f$route$2d$modules$2f$app$2d$page$2f$vendored$2f$ssr$2f$react$2d$jsx$2d$dev$2d$runtime$2e$js__$5b$app$2d$ssr$5d$__$28$ecmascript$29$__["Fragment"], {
                            children: [
                                /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$next$2f$dist$2f$server$2f$route$2d$modules$2f$app$2d$page$2f$vendored$2f$ssr$2f$react$2d$jsx$2d$dev$2d$runtime$2e$js__$5b$app$2d$ssr$5d$__$28$ecmascript$29$__["jsxDEV"])(__TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$recharts$2f$es6$2f$cartesian$2f$XAxis$2e$js__$5b$app$2d$ssr$5d$__$28$ecmascript$29$__["XAxis"], {
                                    dataKey: xAxis,
                                    ...axisProps
                                }, void 0, false, {
                                    fileName: "[project]/src/components/visuals/ChartRenderer.tsx",
                                    lineNumber: 205,
                                    columnNumber: 33
                                }, this),
                                /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$next$2f$dist$2f$server$2f$route$2d$modules$2f$app$2d$page$2f$vendored$2f$ssr$2f$react$2d$jsx$2d$dev$2d$runtime$2e$js__$5b$app$2d$ssr$5d$__$28$ecmascript$29$__["jsxDEV"])(__TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$recharts$2f$es6$2f$cartesian$2f$YAxis$2e$js__$5b$app$2d$ssr$5d$__$28$ecmascript$29$__["YAxis"], {
                                    ...axisProps
                                }, void 0, false, {
                                    fileName: "[project]/src/components/visuals/ChartRenderer.tsx",
                                    lineNumber: 206,
                                    columnNumber: 33
                                }, this)
                            ]
                        }, void 0, true),
                        /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$next$2f$dist$2f$server$2f$route$2d$modules$2f$app$2d$page$2f$vendored$2f$ssr$2f$react$2d$jsx$2d$dev$2d$runtime$2e$js__$5b$app$2d$ssr$5d$__$28$ecmascript$29$__["jsxDEV"])(__TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$recharts$2f$es6$2f$component$2f$Tooltip$2e$js__$5b$app$2d$ssr$5d$__$28$ecmascript$29$__["Tooltip"], {
                            content: /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$next$2f$dist$2f$server$2f$route$2d$modules$2f$app$2d$page$2f$vendored$2f$ssr$2f$react$2d$jsx$2d$dev$2d$runtime$2e$js__$5b$app$2d$ssr$5d$__$28$ecmascript$29$__["jsxDEV"])(CustomTooltip, {}, void 0, false, {
                                fileName: "[project]/src/components/visuals/ChartRenderer.tsx",
                                lineNumber: 209,
                                columnNumber: 43
                            }, void 0),
                            cursor: {
                                fill: 'rgba(255,255,255,0.02)'
                            },
                            isAnimationActive: false
                        }, void 0, false, {
                            fileName: "[project]/src/components/visuals/ChartRenderer.tsx",
                            lineNumber: 209,
                            columnNumber: 25
                        }, this),
                        /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$next$2f$dist$2f$server$2f$route$2d$modules$2f$app$2d$page$2f$vendored$2f$ssr$2f$react$2d$jsx$2d$dev$2d$runtime$2e$js__$5b$app$2d$ssr$5d$__$28$ecmascript$29$__["jsxDEV"])(__TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$recharts$2f$es6$2f$component$2f$Legend$2e$js__$5b$app$2d$ssr$5d$__$28$ecmascript$29$__["Legend"], {
                            ...legendProps
                        }, void 0, false, {
                            fileName: "[project]/src/components/visuals/ChartRenderer.tsx",
                            lineNumber: 210,
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
                            children: colorScheme === 'varied' || colorScheme === 'blues' ? data.map((_, index)=>/*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$next$2f$dist$2f$server$2f$route$2d$modules$2f$app$2d$page$2f$vendored$2f$ssr$2f$react$2d$jsx$2d$dev$2d$runtime$2e$js__$5b$app$2d$ssr$5d$__$28$ecmascript$29$__["jsxDEV"])(__TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$recharts$2f$es6$2f$component$2f$Cell$2e$js__$5b$app$2d$ssr$5d$__$28$ecmascript$29$__["Cell"], {
                                    fill: activeColors[index % activeColors.length] || activeColors[0] || '#8b5cf6'
                                }, `cell-${index}`, false, {
                                    fileName: "[project]/src/components/visuals/ChartRenderer.tsx",
                                    lineNumber: 219,
                                    columnNumber: 37
                                }, this)) : // For 'solid', the filling is handled by the Bar prop, 
                            // but we add a Cell for consistency in Recharts rendering if needed
                            data.map((_, index)=>/*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$next$2f$dist$2f$server$2f$route$2d$modules$2f$app$2d$page$2f$vendored$2f$ssr$2f$react$2d$jsx$2d$dev$2d$runtime$2e$js__$5b$app$2d$ssr$5d$__$28$ecmascript$29$__["jsxDEV"])(__TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$recharts$2f$es6$2f$component$2f$Cell$2e$js__$5b$app$2d$ssr$5d$__$28$ecmascript$29$__["Cell"], {
                                    fill: activeColors[0] || '#8b5cf6'
                                }, `cell-${index}`, false, {
                                    fileName: "[project]/src/components/visuals/ChartRenderer.tsx",
                                    lineNumber: 228,
                                    columnNumber: 37
                                }, this))
                        }, void 0, false, {
                            fileName: "[project]/src/components/visuals/ChartRenderer.tsx",
                            lineNumber: 211,
                            columnNumber: 25
                        }, this)
                    ]
                }, void 0, true, {
                    fileName: "[project]/src/components/visuals/ChartRenderer.tsx",
                    lineNumber: 196,
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
                            lineNumber: 238,
                            columnNumber: 25
                        }, this),
                        /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$next$2f$dist$2f$server$2f$route$2d$modules$2f$app$2d$page$2f$vendored$2f$ssr$2f$react$2d$jsx$2d$dev$2d$runtime$2e$js__$5b$app$2d$ssr$5d$__$28$ecmascript$29$__["jsxDEV"])(__TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$recharts$2f$es6$2f$cartesian$2f$XAxis$2e$js__$5b$app$2d$ssr$5d$__$28$ecmascript$29$__["XAxis"], {
                            dataKey: xAxis,
                            ...axisProps
                        }, void 0, false, {
                            fileName: "[project]/src/components/visuals/ChartRenderer.tsx",
                            lineNumber: 239,
                            columnNumber: 25
                        }, this),
                        /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$next$2f$dist$2f$server$2f$route$2d$modules$2f$app$2d$page$2f$vendored$2f$ssr$2f$react$2d$jsx$2d$dev$2d$runtime$2e$js__$5b$app$2d$ssr$5d$__$28$ecmascript$29$__["jsxDEV"])(__TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$recharts$2f$es6$2f$cartesian$2f$YAxis$2e$js__$5b$app$2d$ssr$5d$__$28$ecmascript$29$__["YAxis"], {
                            ...axisProps
                        }, void 0, false, {
                            fileName: "[project]/src/components/visuals/ChartRenderer.tsx",
                            lineNumber: 240,
                            columnNumber: 25
                        }, this),
                        /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$next$2f$dist$2f$server$2f$route$2d$modules$2f$app$2d$page$2f$vendored$2f$ssr$2f$react$2d$jsx$2d$dev$2d$runtime$2e$js__$5b$app$2d$ssr$5d$__$28$ecmascript$29$__["jsxDEV"])(__TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$recharts$2f$es6$2f$component$2f$Tooltip$2e$js__$5b$app$2d$ssr$5d$__$28$ecmascript$29$__["Tooltip"], {
                            content: /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$next$2f$dist$2f$server$2f$route$2d$modules$2f$app$2d$page$2f$vendored$2f$ssr$2f$react$2d$jsx$2d$dev$2d$runtime$2e$js__$5b$app$2d$ssr$5d$__$28$ecmascript$29$__["jsxDEV"])(CustomTooltip, {}, void 0, false, {
                                fileName: "[project]/src/components/visuals/ChartRenderer.tsx",
                                lineNumber: 241,
                                columnNumber: 43
                            }, void 0),
                            isAnimationActive: false
                        }, void 0, false, {
                            fileName: "[project]/src/components/visuals/ChartRenderer.tsx",
                            lineNumber: 241,
                            columnNumber: 25
                        }, this),
                        /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$next$2f$dist$2f$server$2f$route$2d$modules$2f$app$2d$page$2f$vendored$2f$ssr$2f$react$2d$jsx$2d$dev$2d$runtime$2e$js__$5b$app$2d$ssr$5d$__$28$ecmascript$29$__["jsxDEV"])(__TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$recharts$2f$es6$2f$component$2f$Legend$2e$js__$5b$app$2d$ssr$5d$__$28$ecmascript$29$__["Legend"], {
                            ...legendProps
                        }, void 0, false, {
                            fileName: "[project]/src/components/visuals/ChartRenderer.tsx",
                            lineNumber: 242,
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
                            animationDuration: 1000
                        }, void 0, false, {
                            fileName: "[project]/src/components/visuals/ChartRenderer.tsx",
                            lineNumber: 243,
                            columnNumber: 25
                        }, this)
                    ]
                }, void 0, true, {
                    fileName: "[project]/src/components/visuals/ChartRenderer.tsx",
                    lineNumber: 237,
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
                                        lineNumber: 252,
                                        columnNumber: 33
                                    }, this),
                                    /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$next$2f$dist$2f$server$2f$route$2d$modules$2f$app$2d$page$2f$vendored$2f$ssr$2f$react$2d$jsx$2d$dev$2d$runtime$2e$js__$5b$app$2d$ssr$5d$__$28$ecmascript$29$__["jsxDEV"])("stop", {
                                        offset: "95%",
                                        stopColor: activeColors[0],
                                        stopOpacity: 0
                                    }, void 0, false, {
                                        fileName: "[project]/src/components/visuals/ChartRenderer.tsx",
                                        lineNumber: 253,
                                        columnNumber: 33
                                    }, this)
                                ]
                            }, void 0, true, {
                                fileName: "[project]/src/components/visuals/ChartRenderer.tsx",
                                lineNumber: 251,
                                columnNumber: 29
                            }, this)
                        }, void 0, false, {
                            fileName: "[project]/src/components/visuals/ChartRenderer.tsx",
                            lineNumber: 250,
                            columnNumber: 25
                        }, this),
                        /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$next$2f$dist$2f$server$2f$route$2d$modules$2f$app$2d$page$2f$vendored$2f$ssr$2f$react$2d$jsx$2d$dev$2d$runtime$2e$js__$5b$app$2d$ssr$5d$__$28$ecmascript$29$__["jsxDEV"])(__TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$recharts$2f$es6$2f$cartesian$2f$CartesianGrid$2e$js__$5b$app$2d$ssr$5d$__$28$ecmascript$29$__["CartesianGrid"], {
                            strokeDasharray: "3 3",
                            stroke: "rgba(255,255,255,0.05)",
                            vertical: false
                        }, void 0, false, {
                            fileName: "[project]/src/components/visuals/ChartRenderer.tsx",
                            lineNumber: 256,
                            columnNumber: 25
                        }, this),
                        /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$next$2f$dist$2f$server$2f$route$2d$modules$2f$app$2d$page$2f$vendored$2f$ssr$2f$react$2d$jsx$2d$dev$2d$runtime$2e$js__$5b$app$2d$ssr$5d$__$28$ecmascript$29$__["jsxDEV"])(__TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$recharts$2f$es6$2f$cartesian$2f$XAxis$2e$js__$5b$app$2d$ssr$5d$__$28$ecmascript$29$__["XAxis"], {
                            dataKey: xAxis,
                            ...axisProps
                        }, void 0, false, {
                            fileName: "[project]/src/components/visuals/ChartRenderer.tsx",
                            lineNumber: 257,
                            columnNumber: 25
                        }, this),
                        /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$next$2f$dist$2f$server$2f$route$2d$modules$2f$app$2d$page$2f$vendored$2f$ssr$2f$react$2d$jsx$2d$dev$2d$runtime$2e$js__$5b$app$2d$ssr$5d$__$28$ecmascript$29$__["jsxDEV"])(__TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$recharts$2f$es6$2f$cartesian$2f$YAxis$2e$js__$5b$app$2d$ssr$5d$__$28$ecmascript$29$__["YAxis"], {
                            ...axisProps
                        }, void 0, false, {
                            fileName: "[project]/src/components/visuals/ChartRenderer.tsx",
                            lineNumber: 258,
                            columnNumber: 25
                        }, this),
                        /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$next$2f$dist$2f$server$2f$route$2d$modules$2f$app$2d$page$2f$vendored$2f$ssr$2f$react$2d$jsx$2d$dev$2d$runtime$2e$js__$5b$app$2d$ssr$5d$__$28$ecmascript$29$__["jsxDEV"])(__TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$recharts$2f$es6$2f$component$2f$Tooltip$2e$js__$5b$app$2d$ssr$5d$__$28$ecmascript$29$__["Tooltip"], {
                            content: /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$next$2f$dist$2f$server$2f$route$2d$modules$2f$app$2d$page$2f$vendored$2f$ssr$2f$react$2d$jsx$2d$dev$2d$runtime$2e$js__$5b$app$2d$ssr$5d$__$28$ecmascript$29$__["jsxDEV"])(CustomTooltip, {}, void 0, false, {
                                fileName: "[project]/src/components/visuals/ChartRenderer.tsx",
                                lineNumber: 259,
                                columnNumber: 43
                            }, void 0),
                            isAnimationActive: false
                        }, void 0, false, {
                            fileName: "[project]/src/components/visuals/ChartRenderer.tsx",
                            lineNumber: 259,
                            columnNumber: 25
                        }, this),
                        /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$next$2f$dist$2f$server$2f$route$2d$modules$2f$app$2d$page$2f$vendored$2f$ssr$2f$react$2d$jsx$2d$dev$2d$runtime$2e$js__$5b$app$2d$ssr$5d$__$28$ecmascript$29$__["jsxDEV"])(__TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$recharts$2f$es6$2f$component$2f$Legend$2e$js__$5b$app$2d$ssr$5d$__$28$ecmascript$29$__["Legend"], {
                            ...legendProps
                        }, void 0, false, {
                            fileName: "[project]/src/components/visuals/ChartRenderer.tsx",
                            lineNumber: 260,
                            columnNumber: 25
                        }, this),
                        /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$next$2f$dist$2f$server$2f$route$2d$modules$2f$app$2d$page$2f$vendored$2f$ssr$2f$react$2d$jsx$2d$dev$2d$runtime$2e$js__$5b$app$2d$ssr$5d$__$28$ecmascript$29$__["jsxDEV"])(__TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$recharts$2f$es6$2f$cartesian$2f$Area$2e$js__$5b$app$2d$ssr$5d$__$28$ecmascript$29$__["Area"], {
                            type: "monotone",
                            dataKey: yAxis,
                            stroke: activeColors[0],
                            fillOpacity: 1,
                            fill: "url(#colorValue)",
                            strokeWidth: 3,
                            animationDuration: 1000
                        }, void 0, false, {
                            fileName: "[project]/src/components/visuals/ChartRenderer.tsx",
                            lineNumber: 261,
                            columnNumber: 25
                        }, this)
                    ]
                }, void 0, true, {
                    fileName: "[project]/src/components/visuals/ChartRenderer.tsx",
                    lineNumber: 249,
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
                                    lineNumber: 270,
                                    columnNumber: 33
                                }, this))
                        }, void 0, false, {
                            fileName: "[project]/src/components/visuals/ChartRenderer.tsx",
                            lineNumber: 268,
                            columnNumber: 25
                        }, this),
                        /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$next$2f$dist$2f$server$2f$route$2d$modules$2f$app$2d$page$2f$vendored$2f$ssr$2f$react$2d$jsx$2d$dev$2d$runtime$2e$js__$5b$app$2d$ssr$5d$__$28$ecmascript$29$__["jsxDEV"])(__TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$recharts$2f$es6$2f$component$2f$Tooltip$2e$js__$5b$app$2d$ssr$5d$__$28$ecmascript$29$__["Tooltip"], {
                            content: /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$next$2f$dist$2f$server$2f$route$2d$modules$2f$app$2d$page$2f$vendored$2f$ssr$2f$react$2d$jsx$2d$dev$2d$runtime$2e$js__$5b$app$2d$ssr$5d$__$28$ecmascript$29$__["jsxDEV"])(CustomTooltip, {}, void 0, false, {
                                fileName: "[project]/src/components/visuals/ChartRenderer.tsx",
                                lineNumber: 273,
                                columnNumber: 43
                            }, void 0),
                            isAnimationActive: false
                        }, void 0, false, {
                            fileName: "[project]/src/components/visuals/ChartRenderer.tsx",
                            lineNumber: 273,
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
                            lineNumber: 274,
                            columnNumber: 25
                        }, this)
                    ]
                }, void 0, true, {
                    fileName: "[project]/src/components/visuals/ChartRenderer.tsx",
                    lineNumber: 267,
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
            lineNumber: 284,
            columnNumber: 28
        }, this)
    }, void 0, false, {
        fileName: "[project]/src/components/visuals/ChartRenderer.tsx",
        lineNumber: 283,
        columnNumber: 9
    }, this);
}
}),
"[project]/src/app/report/[id]/page.tsx [app-ssr] (ecmascript)", ((__turbopack_context__) => {
"use strict";

__turbopack_context__.s([
    "default",
    ()=>ReportPage
]);
var __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$next$2f$dist$2f$server$2f$route$2d$modules$2f$app$2d$page$2f$vendored$2f$ssr$2f$react$2d$jsx$2d$dev$2d$runtime$2e$js__$5b$app$2d$ssr$5d$__$28$ecmascript$29$__ = __turbopack_context__.i("[project]/node_modules/next/dist/server/route-modules/app-page/vendored/ssr/react-jsx-dev-runtime.js [app-ssr] (ecmascript)");
var __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$styled$2d$jsx$2f$style$2e$js__$5b$app$2d$ssr$5d$__$28$ecmascript$29$__ = __turbopack_context__.i("[project]/node_modules/styled-jsx/style.js [app-ssr] (ecmascript)");
var __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$next$2f$dist$2f$server$2f$route$2d$modules$2f$app$2d$page$2f$vendored$2f$ssr$2f$react$2e$js__$5b$app$2d$ssr$5d$__$28$ecmascript$29$__ = __turbopack_context__.i("[project]/node_modules/next/dist/server/route-modules/app-page/vendored/ssr/react.js [app-ssr] (ecmascript)");
var __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$next$2f$navigation$2e$js__$5b$app$2d$ssr$5d$__$28$ecmascript$29$__ = __turbopack_context__.i("[project]/node_modules/next/navigation.js [app-ssr] (ecmascript)");
var __TURBOPACK__imported__module__$5b$project$5d2f$src$2f$lib$2f$persistence$2e$ts__$5b$app$2d$ssr$5d$__$28$ecmascript$29$__ = __turbopack_context__.i("[project]/src/lib/persistence.ts [app-ssr] (ecmascript)");
var __TURBOPACK__imported__module__$5b$project$5d2f$src$2f$lib$2f$profiler$2e$ts__$5b$app$2d$ssr$5d$__$28$ecmascript$29$__ = __turbopack_context__.i("[project]/src/lib/profiler.ts [app-ssr] (ecmascript)");
var __TURBOPACK__imported__module__$5b$project$5d2f$src$2f$components$2f$visuals$2f$ChartRenderer$2e$tsx__$5b$app$2d$ssr$5d$__$28$ecmascript$29$__ = __turbopack_context__.i("[project]/src/components/visuals/ChartRenderer.tsx [app-ssr] (ecmascript)");
var __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$lucide$2d$react$2f$dist$2f$esm$2f$icons$2f$loader$2d$circle$2e$js__$5b$app$2d$ssr$5d$__$28$ecmascript$29$__$3c$export__default__as__Loader2$3e$__ = __turbopack_context__.i("[project]/node_modules/lucide-react/dist/esm/icons/loader-circle.js [app-ssr] (ecmascript) <export default as Loader2>");
var __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$lucide$2d$react$2f$dist$2f$esm$2f$icons$2f$chart$2d$column$2e$js__$5b$app$2d$ssr$5d$__$28$ecmascript$29$__$3c$export__default__as__BarChart3$3e$__ = __turbopack_context__.i("[project]/node_modules/lucide-react/dist/esm/icons/chart-column.js [app-ssr] (ecmascript) <export default as BarChart3>");
var __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$lucide$2d$react$2f$dist$2f$esm$2f$icons$2f$globe$2e$js__$5b$app$2d$ssr$5d$__$28$ecmascript$29$__$3c$export__default__as__Globe$3e$__ = __turbopack_context__.i("[project]/node_modules/lucide-react/dist/esm/icons/globe.js [app-ssr] (ecmascript) <export default as Globe>");
var __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$react$2d$grid$2d$layout$2f$dist$2f$chunk$2d$XM2M6TC6$2e$mjs__$5b$app$2d$ssr$5d$__$28$ecmascript$29$__ = __turbopack_context__.i("[project]/node_modules/react-grid-layout/dist/chunk-XM2M6TC6.mjs [app-ssr] (ecmascript)");
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
function PublicWidget({ widget, isInitialized }) {
    const [data, setData] = (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$next$2f$dist$2f$server$2f$route$2d$modules$2f$app$2d$page$2f$vendored$2f$ssr$2f$react$2e$js__$5b$app$2d$ssr$5d$__$28$ecmascript$29$__["useState"])([]);
    const [loading, setLoading] = (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$next$2f$dist$2f$server$2f$route$2d$modules$2f$app$2d$page$2f$vendored$2f$ssr$2f$react$2e$js__$5b$app$2d$ssr$5d$__$28$ecmascript$29$__["useState"])(true);
    const [error, setError] = (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$next$2f$dist$2f$server$2f$route$2d$modules$2f$app$2d$page$2f$vendored$2f$ssr$2f$react$2e$js__$5b$app$2d$ssr$5d$__$28$ecmascript$29$__["useState"])(null);
    (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$next$2f$dist$2f$server$2f$route$2d$modules$2f$app$2d$page$2f$vendored$2f$ssr$2f$react$2e$js__$5b$app$2d$ssr$5d$__$28$ecmascript$29$__["useEffect"])(()=>{
        if (!isInitialized) return;
        const fetchData = async ()=>{
            setLoading(true);
            setError(null);
            try {
                let query = '';
                if (widget.type === 'table' && widget.columns && widget.columns.length > 0) {
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
                        query = `SELECT ${selects} FROM dataset ${groupByClause} LIMIT 50`;
                    } else {
                        const cols = widget.columns.map((c)=>`"${c}"`).join(', ');
                        query = `SELECT ${cols} FROM dataset LIMIT 100`;
                    }
                } else if (widget.aggregation === 'NONE') {
                    const orderClause = widget.orderBy ? `ORDER BY "${widget.xAxis}" ${widget.orderBy}` : '';
                    const limitClause = widget.topN ? `LIMIT ${widget.topN}` : 'LIMIT 100';
                    query = `SELECT "${widget.xAxis}", "${widget.yAxis}" FROM dataset ${orderClause} ${limitClause}`;
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
                        GROUP BY "${widget.xAxis}"
                        ORDER BY ${orderCol} ${orderDir}
                        ${limitClause}
                    `;
                }
                const result = await (0, __TURBOPACK__imported__module__$5b$project$5d2f$src$2f$lib$2f$profiler$2e$ts__$5b$app$2d$ssr$5d$__$28$ecmascript$29$__["runQuery"])(query);
                setData(result);
            } catch (err) {
                console.error('Error fetching widget data:', err);
                setError('Error al cargar datos');
            } finally{
                setLoading(false);
            }
        };
        fetchData();
    }, [
        widget,
        isInitialized
    ]);
    return /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$next$2f$dist$2f$server$2f$route$2d$modules$2f$app$2d$page$2f$vendored$2f$ssr$2f$react$2d$jsx$2d$dev$2d$runtime$2e$js__$5b$app$2d$ssr$5d$__$28$ecmascript$29$__["jsxDEV"])("div", {
        className: "glass glass-card",
        style: {
            padding: '24px',
            height: '100%',
            display: 'flex',
            flexDirection: 'column',
            boxSizing: 'border-box'
        },
        children: [
            /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$next$2f$dist$2f$server$2f$route$2d$modules$2f$app$2d$page$2f$vendored$2f$ssr$2f$react$2d$jsx$2d$dev$2d$runtime$2e$js__$5b$app$2d$ssr$5d$__$28$ecmascript$29$__["jsxDEV"])("div", {
                style: {
                    marginBottom: '16px'
                },
                children: [
                    /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$next$2f$dist$2f$server$2f$route$2d$modules$2f$app$2d$page$2f$vendored$2f$ssr$2f$react$2d$jsx$2d$dev$2d$runtime$2e$js__$5b$app$2d$ssr$5d$__$28$ecmascript$29$__["jsxDEV"])("h3", {
                        style: {
                            fontSize: '1.125rem',
                            fontWeight: 600
                        },
                        children: widget.title
                    }, void 0, false, {
                        fileName: "[project]/src/app/report/[id]/page.tsx",
                        lineNumber: 106,
                        columnNumber: 17
                    }, this),
                    /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$next$2f$dist$2f$server$2f$route$2d$modules$2f$app$2d$page$2f$vendored$2f$ssr$2f$react$2d$jsx$2d$dev$2d$runtime$2e$js__$5b$app$2d$ssr$5d$__$28$ecmascript$29$__["jsxDEV"])("p", {
                        style: {
                            fontSize: '0.75rem',
                            color: 'var(--text-muted)'
                        },
                        children: widget.type === 'table' ? 'Vista de tabla' : `${widget.xAxis} vs ${widget.yAxis}`
                    }, void 0, false, {
                        fileName: "[project]/src/app/report/[id]/page.tsx",
                        lineNumber: 107,
                        columnNumber: 17
                    }, this)
                ]
            }, void 0, true, {
                fileName: "[project]/src/app/report/[id]/page.tsx",
                lineNumber: 105,
                columnNumber: 13
            }, this),
            /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$next$2f$dist$2f$server$2f$route$2d$modules$2f$app$2d$page$2f$vendored$2f$ssr$2f$react$2d$jsx$2d$dev$2d$runtime$2e$js__$5b$app$2d$ssr$5d$__$28$ecmascript$29$__["jsxDEV"])("div", {
                style: {
                    flex: 1,
                    position: 'relative',
                    width: '100%',
                    height: '100%',
                    minHeight: '250px'
                },
                children: loading ? /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$next$2f$dist$2f$server$2f$route$2d$modules$2f$app$2d$page$2f$vendored$2f$ssr$2f$react$2d$jsx$2d$dev$2d$runtime$2e$js__$5b$app$2d$ssr$5d$__$28$ecmascript$29$__["jsxDEV"])("div", {
                    style: {
                        display: 'flex',
                        alignItems: 'center',
                        justifyContent: 'center',
                        height: '100%'
                    },
                    children: /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$next$2f$dist$2f$server$2f$route$2d$modules$2f$app$2d$page$2f$vendored$2f$ssr$2f$react$2d$jsx$2d$dev$2d$runtime$2e$js__$5b$app$2d$ssr$5d$__$28$ecmascript$29$__["jsxDEV"])(__TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$lucide$2d$react$2f$dist$2f$esm$2f$icons$2f$loader$2d$circle$2e$js__$5b$app$2d$ssr$5d$__$28$ecmascript$29$__$3c$export__default__as__Loader2$3e$__["Loader2"], {
                        className: "animate-spin",
                        color: "var(--primary)"
                    }, void 0, false, {
                        fileName: "[project]/src/app/report/[id]/page.tsx",
                        lineNumber: 114,
                        columnNumber: 25
                    }, this)
                }, void 0, false, {
                    fileName: "[project]/src/app/report/[id]/page.tsx",
                    lineNumber: 113,
                    columnNumber: 21
                }, this) : error ? /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$next$2f$dist$2f$server$2f$route$2d$modules$2f$app$2d$page$2f$vendored$2f$ssr$2f$react$2d$jsx$2d$dev$2d$runtime$2e$js__$5b$app$2d$ssr$5d$__$28$ecmascript$29$__["jsxDEV"])("div", {
                    style: {
                        display: 'flex',
                        alignItems: 'center',
                        justifyContent: 'center',
                        height: '100%',
                        color: '#f87171'
                    },
                    children: error
                }, void 0, false, {
                    fileName: "[project]/src/app/report/[id]/page.tsx",
                    lineNumber: 117,
                    columnNumber: 21
                }, this) : /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$next$2f$dist$2f$server$2f$route$2d$modules$2f$app$2d$page$2f$vendored$2f$ssr$2f$react$2d$jsx$2d$dev$2d$runtime$2e$js__$5b$app$2d$ssr$5d$__$28$ecmascript$29$__["jsxDEV"])(__TURBOPACK__imported__module__$5b$project$5d2f$src$2f$components$2f$visuals$2f$ChartRenderer$2e$tsx__$5b$app$2d$ssr$5d$__$28$ecmascript$29$__["default"], {
                    type: widget.type,
                    data: data,
                    xAxis: widget.xAxis,
                    yAxis: widget.yAxis,
                    colorScheme: widget.colorScheme,
                    colorByCategory: widget.colorByCategory,
                    customColor: widget.customColor
                }, void 0, false, {
                    fileName: "[project]/src/app/report/[id]/page.tsx",
                    lineNumber: 121,
                    columnNumber: 21
                }, this)
            }, void 0, false, {
                fileName: "[project]/src/app/report/[id]/page.tsx",
                lineNumber: 111,
                columnNumber: 13
            }, this)
        ]
    }, void 0, true, {
        fileName: "[project]/src/app/report/[id]/page.tsx",
        lineNumber: 104,
        columnNumber: 9
    }, this);
}
PublicWidget.displayName = 'PublicWidget';
function ReportPage() {
    const { id } = (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$next$2f$navigation$2e$js__$5b$app$2d$ssr$5d$__$28$ecmascript$29$__["useParams"])();
    const [report, setReport] = (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$next$2f$dist$2f$server$2f$route$2d$modules$2f$app$2d$page$2f$vendored$2f$ssr$2f$react$2e$js__$5b$app$2d$ssr$5d$__$28$ecmascript$29$__["useState"])(null);
    const [loading, setLoading] = (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$next$2f$dist$2f$server$2f$route$2d$modules$2f$app$2d$page$2f$vendored$2f$ssr$2f$react$2e$js__$5b$app$2d$ssr$5d$__$28$ecmascript$29$__["useState"])(true);
    const [error, setError] = (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$next$2f$dist$2f$server$2f$route$2d$modules$2f$app$2d$page$2f$vendored$2f$ssr$2f$react$2e$js__$5b$app$2d$ssr$5d$__$28$ecmascript$29$__["useState"])(null);
    const [theme, setTheme] = (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$next$2f$dist$2f$server$2f$route$2d$modules$2f$app$2d$page$2f$vendored$2f$ssr$2f$react$2e$js__$5b$app$2d$ssr$5d$__$28$ecmascript$29$__["useState"])('dark');
    const [isInitialized, setIsInitialized] = (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$next$2f$dist$2f$server$2f$route$2d$modules$2f$app$2d$page$2f$vendored$2f$ssr$2f$react$2e$js__$5b$app$2d$ssr$5d$__$28$ecmascript$29$__["useState"])(false);
    (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$next$2f$dist$2f$server$2f$route$2d$modules$2f$app$2d$page$2f$vendored$2f$ssr$2f$react$2e$js__$5b$app$2d$ssr$5d$__$28$ecmascript$29$__["useEffect"])(()=>{
        if (!id) return;
        const loadData = async ()=>{
            try {
                const reportData = await (0, __TURBOPACK__imported__module__$5b$project$5d2f$src$2f$lib$2f$persistence$2e$ts__$5b$app$2d$ssr$5d$__$28$ecmascript$29$__["getReportById"])(id);
                if (!reportData) {
                    setError('Reporte no encontrado');
                    setLoading(false);
                    return;
                }
                setReport(reportData);
                const dataset = await (0, __TURBOPACK__imported__module__$5b$project$5d2f$src$2f$lib$2f$persistence$2e$ts__$5b$app$2d$ssr$5d$__$28$ecmascript$29$__["getDatasetById"])(reportData.dataset_id);
                if (dataset) {
                    await (0, __TURBOPACK__imported__module__$5b$project$5d2f$src$2f$lib$2f$profiler$2e$ts__$5b$app$2d$ssr$5d$__$28$ecmascript$29$__["profileFromUrl"])(dataset.file_url, dataset.name, dataset.sheet_name);
                    setIsInitialized(true);
                } else {
                    setError('Dataset no encontrado');
                }
                setLoading(false);
            } catch (error) {
                console.error('Error loading public report:', error);
                setError('Error cargando el reporte');
                setLoading(false);
            }
        };
        loadData();
    }, [
        id
    ]);
    if (loading) {
        return /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$next$2f$dist$2f$server$2f$route$2d$modules$2f$app$2d$page$2f$vendored$2f$ssr$2f$react$2d$jsx$2d$dev$2d$runtime$2e$js__$5b$app$2d$ssr$5d$__$28$ecmascript$29$__["jsxDEV"])("div", {
            style: {
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                height: '100vh',
                background: theme === 'dark' ? 'var(--background)' : '#f8fafc',
                color: theme === 'dark' ? 'white' : '#1e293b'
            },
            children: /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$next$2f$dist$2f$server$2f$route$2d$modules$2f$app$2d$page$2f$vendored$2f$ssr$2f$react$2d$jsx$2d$dev$2d$runtime$2e$js__$5b$app$2d$ssr$5d$__$28$ecmascript$29$__["jsxDEV"])("div", {
                style: {
                    textAlign: 'center'
                },
                children: [
                    /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$next$2f$dist$2f$server$2f$route$2d$modules$2f$app$2d$page$2f$vendored$2f$ssr$2f$react$2d$jsx$2d$dev$2d$runtime$2e$js__$5b$app$2d$ssr$5d$__$28$ecmascript$29$__["jsxDEV"])(__TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$lucide$2d$react$2f$dist$2f$esm$2f$icons$2f$loader$2d$circle$2e$js__$5b$app$2d$ssr$5d$__$28$ecmascript$29$__$3c$export__default__as__Loader2$3e$__["Loader2"], {
                        size: 48,
                        className: "animate-spin",
                        color: "var(--primary)",
                        style: {
                            margin: '0 auto 24px'
                        }
                    }, void 0, false, {
                        fileName: "[project]/src/app/report/[id]/page.tsx",
                        lineNumber: 187,
                        columnNumber: 21
                    }, this),
                    /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$next$2f$dist$2f$server$2f$route$2d$modules$2f$app$2d$page$2f$vendored$2f$ssr$2f$react$2d$jsx$2d$dev$2d$runtime$2e$js__$5b$app$2d$ssr$5d$__$28$ecmascript$29$__["jsxDEV"])("p", {
                        style: {
                            color: theme === 'dark' ? 'var(--text-muted)' : '#64748b'
                        },
                        children: "Cargando reporte público..."
                    }, void 0, false, {
                        fileName: "[project]/src/app/report/[id]/page.tsx",
                        lineNumber: 188,
                        columnNumber: 21
                    }, this)
                ]
            }, void 0, true, {
                fileName: "[project]/src/app/report/[id]/page.tsx",
                lineNumber: 186,
                columnNumber: 17
            }, this)
        }, void 0, false, {
            fileName: "[project]/src/app/report/[id]/page.tsx",
            lineNumber: 178,
            columnNumber: 13
        }, this);
    }
    if (error || !report) {
        return /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$next$2f$dist$2f$server$2f$route$2d$modules$2f$app$2d$page$2f$vendored$2f$ssr$2f$react$2d$jsx$2d$dev$2d$runtime$2e$js__$5b$app$2d$ssr$5d$__$28$ecmascript$29$__["jsxDEV"])("div", {
            style: {
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                height: '100vh',
                background: 'var(--background)',
                color: 'white'
            },
            children: /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$next$2f$dist$2f$server$2f$route$2d$modules$2f$app$2d$page$2f$vendored$2f$ssr$2f$react$2d$jsx$2d$dev$2d$runtime$2e$js__$5b$app$2d$ssr$5d$__$28$ecmascript$29$__["jsxDEV"])("div", {
                style: {
                    textAlign: 'center'
                },
                children: [
                    /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$next$2f$dist$2f$server$2f$route$2d$modules$2f$app$2d$page$2f$vendored$2f$ssr$2f$react$2d$jsx$2d$dev$2d$runtime$2e$js__$5b$app$2d$ssr$5d$__$28$ecmascript$29$__["jsxDEV"])(__TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$lucide$2d$react$2f$dist$2f$esm$2f$icons$2f$chart$2d$column$2e$js__$5b$app$2d$ssr$5d$__$28$ecmascript$29$__$3c$export__default__as__BarChart3$3e$__["BarChart3"], {
                        size: 64,
                        color: "#f87171",
                        style: {
                            margin: '0 auto 24px'
                        }
                    }, void 0, false, {
                        fileName: "[project]/src/app/report/[id]/page.tsx",
                        lineNumber: 198,
                        columnNumber: 21
                    }, this),
                    /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$next$2f$dist$2f$server$2f$route$2d$modules$2f$app$2d$page$2f$vendored$2f$ssr$2f$react$2d$jsx$2d$dev$2d$runtime$2e$js__$5b$app$2d$ssr$5d$__$28$ecmascript$29$__["jsxDEV"])("h2", {
                        style: {
                            fontSize: '1.5rem',
                            fontWeight: 600
                        },
                        children: error || 'No pudimos encontrar este reporte'
                    }, void 0, false, {
                        fileName: "[project]/src/app/report/[id]/page.tsx",
                        lineNumber: 199,
                        columnNumber: 21
                    }, this),
                    /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$next$2f$dist$2f$server$2f$route$2d$modules$2f$app$2d$page$2f$vendored$2f$ssr$2f$react$2d$jsx$2d$dev$2d$runtime$2e$js__$5b$app$2d$ssr$5d$__$28$ecmascript$29$__["jsxDEV"])("p", {
                        style: {
                            color: 'var(--text-muted)',
                            marginTop: '8px'
                        },
                        children: "El enlace podría ser incorrecto o el reporte ya no existe."
                    }, void 0, false, {
                        fileName: "[project]/src/app/report/[id]/page.tsx",
                        lineNumber: 200,
                        columnNumber: 21
                    }, this)
                ]
            }, void 0, true, {
                fileName: "[project]/src/app/report/[id]/page.tsx",
                lineNumber: 197,
                columnNumber: 17
            }, this)
        }, void 0, false, {
            fileName: "[project]/src/app/report/[id]/page.tsx",
            lineNumber: 196,
            columnNumber: 13
        }, this);
    }
    return /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$next$2f$dist$2f$server$2f$route$2d$modules$2f$app$2d$page$2f$vendored$2f$ssr$2f$react$2d$jsx$2d$dev$2d$runtime$2e$js__$5b$app$2d$ssr$5d$__$28$ecmascript$29$__["jsxDEV"])("div", {
        style: {
            height: '100vh',
            overflowY: 'auto',
            background: theme === 'dark' ? 'var(--background)' : '#f8fafc',
            color: theme === 'dark' ? 'white' : '#1e293b',
            padding: '0 20px 40px',
            transition: 'background 0.3s, color 0.3s',
            position: 'relative'
        },
        className: __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$styled$2d$jsx$2f$style$2e$js__$5b$app$2d$ssr$5d$__$28$ecmascript$29$__["default"].dynamic([
            [
                "3c27e5af9983e283",
                [
                    theme === 'dark' ? 'linear-gradient(180deg, rgba(255,255,255,0.14), rgba(255,255,255,0.06))' : 'linear-gradient(180deg, rgba(255,255,255,0.88), rgba(255,255,255,0.74))',
                    theme === 'dark' ? 'rgba(255, 255, 255, 0.16)' : 'rgba(148, 163, 184, 0.22)',
                    theme === 'light' ? '#1e293b !important' : 'inherit',
                    theme === 'light' ? '#1e293b' : 'white',
                    theme === 'light' ? `
                    :root {
                        --text-muted: #64748b;
                        --foreground: #1e293b;
                        --surface: #ffffff;
                        --border: #e2e8f0;
                    }
                ` : ''
                ]
            ]
        ]),
        children: [
            /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$next$2f$dist$2f$server$2f$route$2d$modules$2f$app$2d$page$2f$vendored$2f$ssr$2f$react$2d$jsx$2d$dev$2d$runtime$2e$js__$5b$app$2d$ssr$5d$__$28$ecmascript$29$__["jsxDEV"])("div", {
                style: {
                    maxWidth: '1200px',
                    margin: '0 auto'
                },
                className: __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$styled$2d$jsx$2f$style$2e$js__$5b$app$2d$ssr$5d$__$28$ecmascript$29$__["default"].dynamic([
                    [
                        "3c27e5af9983e283",
                        [
                            theme === 'dark' ? 'linear-gradient(180deg, rgba(255,255,255,0.14), rgba(255,255,255,0.06))' : 'linear-gradient(180deg, rgba(255,255,255,0.88), rgba(255,255,255,0.74))',
                            theme === 'dark' ? 'rgba(255, 255, 255, 0.16)' : 'rgba(148, 163, 184, 0.22)',
                            theme === 'light' ? '#1e293b !important' : 'inherit',
                            theme === 'light' ? '#1e293b' : 'white',
                            theme === 'light' ? `
                    :root {
                        --text-muted: #64748b;
                        --foreground: #1e293b;
                        --surface: #ffffff;
                        --border: #e2e8f0;
                    }
                ` : ''
                        ]
                    ]
                ]),
                children: [
                    /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$next$2f$dist$2f$server$2f$route$2d$modules$2f$app$2d$page$2f$vendored$2f$ssr$2f$react$2d$jsx$2d$dev$2d$runtime$2e$js__$5b$app$2d$ssr$5d$__$28$ecmascript$29$__["jsxDEV"])("header", {
                        style: {
                            position: 'sticky',
                            top: 0,
                            zIndex: 100,
                            marginBottom: '48px',
                            display: 'flex',
                            justifyContent: 'space-between',
                            alignItems: 'flex-start',
                            padding: '40px 0 24px',
                            background: theme === 'dark' ? 'rgba(10, 10, 15, 0.8)' : 'rgba(248, 250, 252, 0.8)',
                            backdropFilter: 'blur(12px)',
                            borderBottom: `1px solid ${theme === 'dark' ? 'rgba(255, 255, 255, 0.05)' : 'rgba(0, 0, 0, 0.05)'}`
                        },
                        className: __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$styled$2d$jsx$2f$style$2e$js__$5b$app$2d$ssr$5d$__$28$ecmascript$29$__["default"].dynamic([
                            [
                                "3c27e5af9983e283",
                                [
                                    theme === 'dark' ? 'linear-gradient(180deg, rgba(255,255,255,0.14), rgba(255,255,255,0.06))' : 'linear-gradient(180deg, rgba(255,255,255,0.88), rgba(255,255,255,0.74))',
                                    theme === 'dark' ? 'rgba(255, 255, 255, 0.16)' : 'rgba(148, 163, 184, 0.22)',
                                    theme === 'light' ? '#1e293b !important' : 'inherit',
                                    theme === 'light' ? '#1e293b' : 'white',
                                    theme === 'light' ? `
                    :root {
                        --text-muted: #64748b;
                        --foreground: #1e293b;
                        --surface: #ffffff;
                        --border: #e2e8f0;
                    }
                ` : ''
                                ]
                            ]
                        ]),
                        children: [
                            /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$next$2f$dist$2f$server$2f$route$2d$modules$2f$app$2d$page$2f$vendored$2f$ssr$2f$react$2d$jsx$2d$dev$2d$runtime$2e$js__$5b$app$2d$ssr$5d$__$28$ecmascript$29$__["jsxDEV"])("div", {
                                className: __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$styled$2d$jsx$2f$style$2e$js__$5b$app$2d$ssr$5d$__$28$ecmascript$29$__["default"].dynamic([
                                    [
                                        "3c27e5af9983e283",
                                        [
                                            theme === 'dark' ? 'linear-gradient(180deg, rgba(255,255,255,0.14), rgba(255,255,255,0.06))' : 'linear-gradient(180deg, rgba(255,255,255,0.88), rgba(255,255,255,0.74))',
                                            theme === 'dark' ? 'rgba(255, 255, 255, 0.16)' : 'rgba(148, 163, 184, 0.22)',
                                            theme === 'light' ? '#1e293b !important' : 'inherit',
                                            theme === 'light' ? '#1e293b' : 'white',
                                            theme === 'light' ? `
                    :root {
                        --text-muted: #64748b;
                        --foreground: #1e293b;
                        --surface: #ffffff;
                        --border: #e2e8f0;
                    }
                ` : ''
                                        ]
                                    ]
                                ]),
                                children: [
                                    /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$next$2f$dist$2f$server$2f$route$2d$modules$2f$app$2d$page$2f$vendored$2f$ssr$2f$react$2d$jsx$2d$dev$2d$runtime$2e$js__$5b$app$2d$ssr$5d$__$28$ecmascript$29$__["jsxDEV"])("div", {
                                        style: {
                                            display: 'flex',
                                            alignItems: 'center',
                                            gap: '8px',
                                            marginBottom: '12px',
                                            color: 'var(--primary)'
                                        },
                                        className: __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$styled$2d$jsx$2f$style$2e$js__$5b$app$2d$ssr$5d$__$28$ecmascript$29$__["default"].dynamic([
                                            [
                                                "3c27e5af9983e283",
                                                [
                                                    theme === 'dark' ? 'linear-gradient(180deg, rgba(255,255,255,0.14), rgba(255,255,255,0.06))' : 'linear-gradient(180deg, rgba(255,255,255,0.88), rgba(255,255,255,0.74))',
                                                    theme === 'dark' ? 'rgba(255, 255, 255, 0.16)' : 'rgba(148, 163, 184, 0.22)',
                                                    theme === 'light' ? '#1e293b !important' : 'inherit',
                                                    theme === 'light' ? '#1e293b' : 'white',
                                                    theme === 'light' ? `
                    :root {
                        --text-muted: #64748b;
                        --foreground: #1e293b;
                        --surface: #ffffff;
                        --border: #e2e8f0;
                    }
                ` : ''
                                                ]
                                            ]
                                        ]),
                                        children: [
                                            /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$next$2f$dist$2f$server$2f$route$2d$modules$2f$app$2d$page$2f$vendored$2f$ssr$2f$react$2d$jsx$2d$dev$2d$runtime$2e$js__$5b$app$2d$ssr$5d$__$28$ecmascript$29$__["jsxDEV"])(__TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$lucide$2d$react$2f$dist$2f$esm$2f$icons$2f$globe$2e$js__$5b$app$2d$ssr$5d$__$28$ecmascript$29$__$3c$export__default__as__Globe$3e$__["Globe"], {
                                                size: 18
                                            }, void 0, false, {
                                                fileName: "[project]/src/app/report/[id]/page.tsx",
                                                lineNumber: 232,
                                                columnNumber: 29
                                            }, this),
                                            /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$next$2f$dist$2f$server$2f$route$2d$modules$2f$app$2d$page$2f$vendored$2f$ssr$2f$react$2d$jsx$2d$dev$2d$runtime$2e$js__$5b$app$2d$ssr$5d$__$28$ecmascript$29$__["jsxDEV"])("span", {
                                                style: {
                                                    fontSize: '0.875rem',
                                                    fontWeight: 600,
                                                    textTransform: 'uppercase',
                                                    letterSpacing: '0.1em'
                                                },
                                                className: __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$styled$2d$jsx$2f$style$2e$js__$5b$app$2d$ssr$5d$__$28$ecmascript$29$__["default"].dynamic([
                                                    [
                                                        "3c27e5af9983e283",
                                                        [
                                                            theme === 'dark' ? 'linear-gradient(180deg, rgba(255,255,255,0.14), rgba(255,255,255,0.06))' : 'linear-gradient(180deg, rgba(255,255,255,0.88), rgba(255,255,255,0.74))',
                                                            theme === 'dark' ? 'rgba(255, 255, 255, 0.16)' : 'rgba(148, 163, 184, 0.22)',
                                                            theme === 'light' ? '#1e293b !important' : 'inherit',
                                                            theme === 'light' ? '#1e293b' : 'white',
                                                            theme === 'light' ? `
                    :root {
                        --text-muted: #64748b;
                        --foreground: #1e293b;
                        --surface: #ffffff;
                        --border: #e2e8f0;
                    }
                ` : ''
                                                        ]
                                                    ]
                                                ]),
                                                children: "Vista Pública"
                                            }, void 0, false, {
                                                fileName: "[project]/src/app/report/[id]/page.tsx",
                                                lineNumber: 233,
                                                columnNumber: 29
                                            }, this)
                                        ]
                                    }, void 0, true, {
                                        fileName: "[project]/src/app/report/[id]/page.tsx",
                                        lineNumber: 231,
                                        columnNumber: 25
                                    }, this),
                                    /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$next$2f$dist$2f$server$2f$route$2d$modules$2f$app$2d$page$2f$vendored$2f$ssr$2f$react$2d$jsx$2d$dev$2d$runtime$2e$js__$5b$app$2d$ssr$5d$__$28$ecmascript$29$__["jsxDEV"])("h1", {
                                        style: {
                                            fontSize: '2.5rem',
                                            fontWeight: 700
                                        },
                                        className: __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$styled$2d$jsx$2f$style$2e$js__$5b$app$2d$ssr$5d$__$28$ecmascript$29$__["default"].dynamic([
                                            [
                                                "3c27e5af9983e283",
                                                [
                                                    theme === 'dark' ? 'linear-gradient(180deg, rgba(255,255,255,0.14), rgba(255,255,255,0.06))' : 'linear-gradient(180deg, rgba(255,255,255,0.88), rgba(255,255,255,0.74))',
                                                    theme === 'dark' ? 'rgba(255, 255, 255, 0.16)' : 'rgba(148, 163, 184, 0.22)',
                                                    theme === 'light' ? '#1e293b !important' : 'inherit',
                                                    theme === 'light' ? '#1e293b' : 'white',
                                                    theme === 'light' ? `
                    :root {
                        --text-muted: #64748b;
                        --foreground: #1e293b;
                        --surface: #ffffff;
                        --border: #e2e8f0;
                    }
                ` : ''
                                                ]
                                            ]
                                        ]),
                                        children: report.name
                                    }, void 0, false, {
                                        fileName: "[project]/src/app/report/[id]/page.tsx",
                                        lineNumber: 235,
                                        columnNumber: 25
                                    }, this),
                                    /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$next$2f$dist$2f$server$2f$route$2d$modules$2f$app$2d$page$2f$vendored$2f$ssr$2f$react$2d$jsx$2d$dev$2d$runtime$2e$js__$5b$app$2d$ssr$5d$__$28$ecmascript$29$__["jsxDEV"])("p", {
                                        style: {
                                            color: theme === 'dark' ? 'var(--text-muted)' : '#64748b',
                                            marginTop: '8px'
                                        },
                                        className: __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$styled$2d$jsx$2f$style$2e$js__$5b$app$2d$ssr$5d$__$28$ecmascript$29$__["default"].dynamic([
                                            [
                                                "3c27e5af9983e283",
                                                [
                                                    theme === 'dark' ? 'linear-gradient(180deg, rgba(255,255,255,0.14), rgba(255,255,255,0.06))' : 'linear-gradient(180deg, rgba(255,255,255,0.88), rgba(255,255,255,0.74))',
                                                    theme === 'dark' ? 'rgba(255, 255, 255, 0.16)' : 'rgba(148, 163, 184, 0.22)',
                                                    theme === 'light' ? '#1e293b !important' : 'inherit',
                                                    theme === 'light' ? '#1e293b' : 'white',
                                                    theme === 'light' ? `
                    :root {
                        --text-muted: #64748b;
                        --foreground: #1e293b;
                        --surface: #ffffff;
                        --border: #e2e8f0;
                    }
                ` : ''
                                                ]
                                            ]
                                        ]),
                                        children: "Interactúa con los datos visualizados en tiempo real."
                                    }, void 0, false, {
                                        fileName: "[project]/src/app/report/[id]/page.tsx",
                                        lineNumber: 236,
                                        columnNumber: 25
                                    }, this)
                                ]
                            }, void 0, true, {
                                fileName: "[project]/src/app/report/[id]/page.tsx",
                                lineNumber: 230,
                                columnNumber: 21
                            }, this),
                            /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$next$2f$dist$2f$server$2f$route$2d$modules$2f$app$2d$page$2f$vendored$2f$ssr$2f$react$2d$jsx$2d$dev$2d$runtime$2e$js__$5b$app$2d$ssr$5d$__$28$ecmascript$29$__["jsxDEV"])("button", {
                                onClick: ()=>setTheme(theme === 'dark' ? 'light' : 'dark'),
                                style: {
                                    padding: '8px 16px',
                                    background: theme === 'dark' ? 'rgba(255,255,255,0.05)' : '#fff',
                                    border: '1px solid var(--border)',
                                    borderRadius: '20px',
                                    cursor: 'pointer',
                                    display: 'flex',
                                    alignItems: 'center',
                                    gap: '8px',
                                    fontSize: '0.875rem',
                                    fontWeight: 500,
                                    boxShadow: theme === 'light' ? '0 2px 10px rgba(0,0,0,0.05)' : 'none',
                                    color: theme === 'dark' ? '#fff' : '#1e293b'
                                },
                                className: __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$styled$2d$jsx$2f$style$2e$js__$5b$app$2d$ssr$5d$__$28$ecmascript$29$__["default"].dynamic([
                                    [
                                        "3c27e5af9983e283",
                                        [
                                            theme === 'dark' ? 'linear-gradient(180deg, rgba(255,255,255,0.14), rgba(255,255,255,0.06))' : 'linear-gradient(180deg, rgba(255,255,255,0.88), rgba(255,255,255,0.74))',
                                            theme === 'dark' ? 'rgba(255, 255, 255, 0.16)' : 'rgba(148, 163, 184, 0.22)',
                                            theme === 'light' ? '#1e293b !important' : 'inherit',
                                            theme === 'light' ? '#1e293b' : 'white',
                                            theme === 'light' ? `
                    :root {
                        --text-muted: #64748b;
                        --foreground: #1e293b;
                        --surface: #ffffff;
                        --border: #e2e8f0;
                    }
                ` : ''
                                        ]
                                    ]
                                ]),
                                children: theme === 'dark' ? '🌙 Modo Oscuro' : '☀️ Modo Claro'
                            }, void 0, false, {
                                fileName: "[project]/src/app/report/[id]/page.tsx",
                                lineNumber: 240,
                                columnNumber: 21
                            }, this)
                        ]
                    }, void 0, true, {
                        fileName: "[project]/src/app/report/[id]/page.tsx",
                        lineNumber: 217,
                        columnNumber: 17
                    }, this),
                    /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$next$2f$dist$2f$server$2f$route$2d$modules$2f$app$2d$page$2f$vendored$2f$ssr$2f$react$2d$jsx$2d$dev$2d$runtime$2e$js__$5b$app$2d$ssr$5d$__$28$ecmascript$29$__["jsxDEV"])("div", {
                        style: {
                            position: 'relative',
                            width: '100%',
                            minHeight: '600px'
                        },
                        className: __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$styled$2d$jsx$2f$style$2e$js__$5b$app$2d$ssr$5d$__$28$ecmascript$29$__["default"].dynamic([
                            [
                                "3c27e5af9983e283",
                                [
                                    theme === 'dark' ? 'linear-gradient(180deg, rgba(255,255,255,0.14), rgba(255,255,255,0.06))' : 'linear-gradient(180deg, rgba(255,255,255,0.88), rgba(255,255,255,0.74))',
                                    theme === 'dark' ? 'rgba(255, 255, 255, 0.16)' : 'rgba(148, 163, 184, 0.22)',
                                    theme === 'light' ? '#1e293b !important' : 'inherit',
                                    theme === 'light' ? '#1e293b' : 'white',
                                    theme === 'light' ? `
                    :root {
                        --text-muted: #64748b;
                        --foreground: #1e293b;
                        --surface: #ffffff;
                        --border: #e2e8f0;
                    }
                ` : ''
                                ]
                            ]
                        ]),
                        children: /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$next$2f$dist$2f$server$2f$route$2d$modules$2f$app$2d$page$2f$vendored$2f$ssr$2f$react$2d$jsx$2d$dev$2d$runtime$2e$js__$5b$app$2d$ssr$5d$__$28$ecmascript$29$__["jsxDEV"])(__TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$react$2d$grid$2d$layout$2f$dist$2f$chunk$2d$XM2M6TC6$2e$mjs__$5b$app$2d$ssr$5d$__$28$ecmascript$29$__["ResponsiveGridLayout"], {
                            className: "layout",
                            layouts: {
                                lg: report.widgets.map((w)=>({
                                        i: w.id,
                                        x: w.x,
                                        y: w.y,
                                        w: w.w,
                                        h: w.h,
                                        static: true
                                    }))
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
                            rowHeight: 120,
                            width: 1200,
                            margin: [
                                24,
                                24
                            ],
                            containerPadding: [
                                0,
                                0
                            ],
                            dragConfig: {
                                enabled: false
                            },
                            resizeConfig: {
                                enabled: false
                            },
                            children: report.widgets.map((widget)=>/*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$next$2f$dist$2f$server$2f$route$2d$modules$2f$app$2d$page$2f$vendored$2f$ssr$2f$react$2d$jsx$2d$dev$2d$runtime$2e$js__$5b$app$2d$ssr$5d$__$28$ecmascript$29$__["jsxDEV"])("div", {
                                    className: __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$styled$2d$jsx$2f$style$2e$js__$5b$app$2d$ssr$5d$__$28$ecmascript$29$__["default"].dynamic([
                                        [
                                            "3c27e5af9983e283",
                                            [
                                                theme === 'dark' ? 'linear-gradient(180deg, rgba(255,255,255,0.14), rgba(255,255,255,0.06))' : 'linear-gradient(180deg, rgba(255,255,255,0.88), rgba(255,255,255,0.74))',
                                                theme === 'dark' ? 'rgba(255, 255, 255, 0.16)' : 'rgba(148, 163, 184, 0.22)',
                                                theme === 'light' ? '#1e293b !important' : 'inherit',
                                                theme === 'light' ? '#1e293b' : 'white',
                                                theme === 'light' ? `
                    :root {
                        --text-muted: #64748b;
                        --foreground: #1e293b;
                        --surface: #ffffff;
                        --border: #e2e8f0;
                    }
                ` : ''
                                            ]
                                        ]
                                    ]),
                                    children: /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$next$2f$dist$2f$server$2f$route$2d$modules$2f$app$2d$page$2f$vendored$2f$ssr$2f$react$2d$jsx$2d$dev$2d$runtime$2e$js__$5b$app$2d$ssr$5d$__$28$ecmascript$29$__["jsxDEV"])(PublicWidget, {
                                        widget: widget,
                                        isInitialized: isInitialized
                                    }, void 0, false, {
                                        fileName: "[project]/src/app/report/[id]/page.tsx",
                                        lineNumber: 285,
                                        columnNumber: 33
                                    }, this)
                                }, widget.id, false, {
                                    fileName: "[project]/src/app/report/[id]/page.tsx",
                                    lineNumber: 284,
                                    columnNumber: 29
                                }, this))
                        }, void 0, false, {
                            fileName: "[project]/src/app/report/[id]/page.tsx",
                            lineNumber: 262,
                            columnNumber: 21
                        }, this)
                    }, void 0, false, {
                        fileName: "[project]/src/app/report/[id]/page.tsx",
                        lineNumber: 261,
                        columnNumber: 17
                    }, this),
                    /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$next$2f$dist$2f$server$2f$route$2d$modules$2f$app$2d$page$2f$vendored$2f$ssr$2f$react$2d$jsx$2d$dev$2d$runtime$2e$js__$5b$app$2d$ssr$5d$__$28$ecmascript$29$__["jsxDEV"])("footer", {
                        style: {
                            marginTop: '80px',
                            borderTop: `1px solid ${theme === 'dark' ? 'var(--border)' : '#e2e8f0'}`,
                            paddingTop: '32px',
                            textAlign: 'center'
                        },
                        className: __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$styled$2d$jsx$2f$style$2e$js__$5b$app$2d$ssr$5d$__$28$ecmascript$29$__["default"].dynamic([
                            [
                                "3c27e5af9983e283",
                                [
                                    theme === 'dark' ? 'linear-gradient(180deg, rgba(255,255,255,0.14), rgba(255,255,255,0.06))' : 'linear-gradient(180deg, rgba(255,255,255,0.88), rgba(255,255,255,0.74))',
                                    theme === 'dark' ? 'rgba(255, 255, 255, 0.16)' : 'rgba(148, 163, 184, 0.22)',
                                    theme === 'light' ? '#1e293b !important' : 'inherit',
                                    theme === 'light' ? '#1e293b' : 'white',
                                    theme === 'light' ? `
                    :root {
                        --text-muted: #64748b;
                        --foreground: #1e293b;
                        --surface: #ffffff;
                        --border: #e2e8f0;
                    }
                ` : ''
                                ]
                            ]
                        ]),
                        children: /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$next$2f$dist$2f$server$2f$route$2d$modules$2f$app$2d$page$2f$vendored$2f$ssr$2f$react$2d$jsx$2d$dev$2d$runtime$2e$js__$5b$app$2d$ssr$5d$__$28$ecmascript$29$__["jsxDEV"])("p", {
                            style: {
                                fontSize: '0.875rem',
                                color: theme === 'dark' ? 'var(--text-muted)' : '#64748b'
                            },
                            className: __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$styled$2d$jsx$2f$style$2e$js__$5b$app$2d$ssr$5d$__$28$ecmascript$29$__["default"].dynamic([
                                [
                                    "3c27e5af9983e283",
                                    [
                                        theme === 'dark' ? 'linear-gradient(180deg, rgba(255,255,255,0.14), rgba(255,255,255,0.06))' : 'linear-gradient(180deg, rgba(255,255,255,0.88), rgba(255,255,255,0.74))',
                                        theme === 'dark' ? 'rgba(255, 255, 255, 0.16)' : 'rgba(148, 163, 184, 0.22)',
                                        theme === 'light' ? '#1e293b !important' : 'inherit',
                                        theme === 'light' ? '#1e293b' : 'white',
                                        theme === 'light' ? `
                    :root {
                        --text-muted: #64748b;
                        --foreground: #1e293b;
                        --surface: #ffffff;
                        --border: #e2e8f0;
                    }
                ` : ''
                                    ]
                                ]
                            ]),
                            children: [
                                "Generado con ",
                                /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$next$2f$dist$2f$server$2f$route$2d$modules$2f$app$2d$page$2f$vendored$2f$ssr$2f$react$2d$jsx$2d$dev$2d$runtime$2e$js__$5b$app$2d$ssr$5d$__$28$ecmascript$29$__["jsxDEV"])("span", {
                                    style: {
                                        fontWeight: 700
                                    },
                                    className: __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$styled$2d$jsx$2f$style$2e$js__$5b$app$2d$ssr$5d$__$28$ecmascript$29$__["default"].dynamic([
                                        [
                                            "3c27e5af9983e283",
                                            [
                                                theme === 'dark' ? 'linear-gradient(180deg, rgba(255,255,255,0.14), rgba(255,255,255,0.06))' : 'linear-gradient(180deg, rgba(255,255,255,0.88), rgba(255,255,255,0.74))',
                                                theme === 'dark' ? 'rgba(255, 255, 255, 0.16)' : 'rgba(148, 163, 184, 0.22)',
                                                theme === 'light' ? '#1e293b !important' : 'inherit',
                                                theme === 'light' ? '#1e293b' : 'white',
                                                theme === 'light' ? `
                    :root {
                        --text-muted: #64748b;
                        --foreground: #1e293b;
                        --surface: #ffffff;
                        --border: #e2e8f0;
                    }
                ` : ''
                                            ]
                                        ]
                                    ]) + " " + "gradient-text",
                                    children: "Sphere"
                                }, void 0, false, {
                                    fileName: "[project]/src/app/report/[id]/page.tsx",
                                    lineNumber: 293,
                                    columnNumber: 38
                                }, this),
                                " • Herramientas de análisis rápido."
                            ]
                        }, void 0, true, {
                            fileName: "[project]/src/app/report/[id]/page.tsx",
                            lineNumber: 292,
                            columnNumber: 21
                        }, this)
                    }, void 0, false, {
                        fileName: "[project]/src/app/report/[id]/page.tsx",
                        lineNumber: 291,
                        columnNumber: 17
                    }, this)
                ]
            }, void 0, true, {
                fileName: "[project]/src/app/report/[id]/page.tsx",
                lineNumber: 216,
                columnNumber: 13
            }, this),
            /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$next$2f$dist$2f$server$2f$route$2d$modules$2f$app$2d$page$2f$vendored$2f$ssr$2f$react$2d$jsx$2d$dev$2d$runtime$2e$js__$5b$app$2d$ssr$5d$__$28$ecmascript$29$__["jsxDEV"])(__TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$styled$2d$jsx$2f$style$2e$js__$5b$app$2d$ssr$5d$__$28$ecmascript$29$__["default"], {
                id: "3c27e5af9983e283",
                dynamic: [
                    theme === 'dark' ? 'linear-gradient(180deg, rgba(255,255,255,0.14), rgba(255,255,255,0.06))' : 'linear-gradient(180deg, rgba(255,255,255,0.88), rgba(255,255,255,0.74))',
                    theme === 'dark' ? 'rgba(255, 255, 255, 0.16)' : 'rgba(148, 163, 184, 0.22)',
                    theme === 'light' ? '#1e293b !important' : 'inherit',
                    theme === 'light' ? '#1e293b' : 'white',
                    theme === 'light' ? `
                    :root {
                        --text-muted: #64748b;
                        --foreground: #1e293b;
                        --surface: #ffffff;
                        --border: #e2e8f0;
                    }
                ` : ''
                ],
                children: `.glass-card{background:${theme === 'dark' ? 'linear-gradient(180deg, rgba(255,255,255,0.14), rgba(255,255,255,0.06))' : 'linear-gradient(180deg, rgba(255,255,255,0.88), rgba(255,255,255,0.74))'};-webkit-backdrop-filter:blur(28px)saturate(180%);backdrop-filter:blur(28px)saturate(180%);border:1px solid ${theme === 'dark' ? 'rgba(255, 255, 255, 0.16)' : 'rgba(148, 163, 184, 0.22)'};color:${theme === 'light' ? '#1e293b !important' : 'inherit'};border-radius:28px;box-shadow:0 24px 60px #070f1d29,inset 0 1px #ffffff38}.glass-card h3{color:${theme === 'light' ? '#1e293b' : 'white'}}.gradient-text{background:linear-gradient(135deg,var(--primary),var(--accent));-webkit-text-fill-color:transparent;-webkit-background-clip:text;background-clip:text}`
            }, void 0, false, void 0, this)
        ]
    }, void 0, true, {
        fileName: "[project]/src/app/report/[id]/page.tsx",
        lineNumber: 207,
        columnNumber: 9
    }, this);
}
}),
];

//# sourceMappingURL=%5Broot-of-the-server%5D__ee5cca6c._.js.map