import { supabase } from './supabase';
import { appLogger } from './logger';
import type { GlobalFilter, ReportPresentation, Widget } from './widgets/types';
import type { DatasetProcessingProgress, DatasetRow } from './analytics/types';
import {
    normalizedArtifactPathsFromManifest,
    sha256Blob,
    storagePathFromReference,
    uploadPartitionedNormalizedArtifact,
    type NormalizedArtifactDescriptor
} from './datasetArtifacts';

const SINGLE_NORMALIZED_ARTIFACT_LIMIT = 16 * 1024 * 1024;

export type DatasetImportFailureStage = 'uploading' | 'metadata' | 'persisting' | 'finalizing';

export class DatasetImportError extends Error {
    stage: DatasetImportFailureStage;
    code: string;
    diagnostics?: Record<string, unknown>;

    constructor(stage: DatasetImportFailureStage, code: string, message: string, diagnostics?: Record<string, unknown>) {
        super(message);
        this.name = 'DatasetImportError';
        this.stage = stage;
        this.code = code;
        this.diagnostics = diagnostics;
    }
}

export interface SavedDataset {
    id: string;
    user_id: string;
    name: string;
    file_url: string;
    normalized_file_url?: string;
    analytics_manifest_url?: string;
    normalized_table_name?: string;
    columns: { name: string; type: string }[];
    stats: {
        column: string;
        type: string;
        min: unknown;
        max: unknown;
        total: number;
        nulls: number;
        unique: number;
    }[];
    sheet_name?: string;
    created_at: string;
}

export interface SavedReport {
    id: string;
    user_id: string;
    name: string;
    dataset_id: string;
    widgets: Widget[];
    filters?: GlobalFilter[];
    presentation?: ReportPresentation;
    created_at: string;
}

export const REPORTS_PER_DATASET_LIMIT = 3;
export const DATASETS_PER_USER_LIMIT = 3;
export const WIDGETS_PER_REPORT_LIMIT = 9;
export const REPORT_LIMIT_MESSAGE = `No se puede continuar. Este dataset ya alcanzó el límite de ${REPORTS_PER_DATASET_LIMIT} reportes.`;
export const DATASET_LIMIT_MESSAGE = `No se puede continuar. Tu cuenta ya alcanzó el límite de ${DATASETS_PER_USER_LIMIT} datasets.`;

export type AccountRole = 'standard' | 'superadmin';

export interface AccountLimits {
    role: AccountRole;
    subscriptionPlan: 'free' | 'pro' | 'enterprise';
    status: 'active';
    maxDatasets: number | null;
    maxReportsPerDataset: number | null;
    maxWidgetsPerReport: number;
}

export interface DatasetDeleteDependencies {
    reportCount: number;
    reportNames: string[];
    storyCount: number;
    storyNames: string[];
}

const STANDARD_ACCOUNT_LIMITS: AccountLimits = {
    role: 'standard',
    subscriptionPlan: 'free',
    status: 'active',
    maxDatasets: DATASETS_PER_USER_LIMIT,
    maxReportsPerDataset: REPORTS_PER_DATASET_LIMIT,
    maxWidgetsPerReport: WIDGETS_PER_REPORT_LIMIT
};

export class ReportLimitError extends Error {
    constructor() {
        super(REPORT_LIMIT_MESSAGE);
        this.name = 'ReportLimitError';
    }
}

export class DatasetLimitError extends Error {
    constructor() {
        super(DATASET_LIMIT_MESSAGE);
        this.name = 'DatasetLimitError';
    }
}

export class AccountSuspendedError extends Error {
    constructor() {
        super('Esta cuenta de Sphere está suspendida.');
        this.name = 'AccountSuspendedError';
    }
}

export class DatasetDependencyError extends Error {
    dependencies: DatasetDeleteDependencies;

    constructor(dependencies: DatasetDeleteDependencies, message?: string) {
        super(message || formatDatasetDependencyMessage(dependencies));
        this.name = 'DatasetDependencyError';
        this.dependencies = dependencies;
    }
}

function isReportLimitDatabaseError(error: { message?: string; details?: string } | null) {
    return Boolean(error && `${error.message || ''} ${error.details || ''}`.includes('REPORT_LIMIT_REACHED'));
}

function isDatasetLimitDatabaseError(error: { message?: string; details?: string } | null) {
    return Boolean(error && `${error.message || ''} ${error.details || ''}`.includes('DATASET_LIMIT_REACHED'));
}

function normalizeDatasetDependencies(value: unknown): DatasetDeleteDependencies {
    const data = (value && typeof value === 'object' ? value : {}) as Record<string, unknown>;
    const reportNames = data.report_names ?? data.reportNames;
    const storyNames = data.story_names ?? data.storyNames;
    return {
        reportCount: Number(data.report_count ?? data.reportCount ?? 0),
        reportNames: Array.isArray(reportNames)
            ? reportNames.filter((name): name is string => typeof name === 'string')
            : [],
        storyCount: Number(data.story_count ?? data.storyCount ?? 0),
        storyNames: Array.isArray(storyNames)
            ? storyNames.filter((name): name is string => typeof name === 'string')
            : []
    };
}

export function formatDatasetDependencyMessage(dependencies: DatasetDeleteDependencies) {
    if (dependencies.reportCount > 0) {
        const names = dependencies.reportNames.length ? ` Reportes: ${dependencies.reportNames.join(', ')}.` : '';
        return `No se puede eliminar este dataset porque está siendo utilizado por ${dependencies.reportCount} ${dependencies.reportCount === 1 ? 'reporte' : 'reportes'}.${names} Debes eliminar primero los reportes asociados.`;
    }
    if (dependencies.storyCount > 0) {
        const names = dependencies.storyNames.length ? ` Stories: ${dependencies.storyNames.join(', ')}.` : '';
        return `No se puede eliminar este dataset porque está siendo utilizado por ${dependencies.storyCount} ${dependencies.storyCount === 1 ? 'Story' : 'Stories'}.${names} Debes eliminar primero las Stories asociadas.`;
    }
    return 'El dataset tiene dependencias y no se puede eliminar.';
}

export async function getCurrentAccountLimits(): Promise<AccountLimits> {
    const { data, error } = await supabase.rpc('get_current_user_limits');
    if (error) {
        const errorText = `${error.code || ''} ${error.message || ''} ${error.details || ''}`;
        if (errorText.includes('ACCOUNT_SUSPENDED')) {
            throw new AccountSuspendedError();
        }
        appLogger.warn('auth', 'FETCH_ACCOUNT_LIMITS_FAILED', 'Could not load role-based account limits; using standard limits.', {
            once: true,
            error
        });
        return STANDARD_ACCOUNT_LIMITS;
    }

    const limits = (data && typeof data === 'object' ? data : {}) as Record<string, unknown>;
    const role: AccountRole = limits.role === 'superadmin' ? 'superadmin' : 'standard';
    return {
        role,
        subscriptionPlan: limits.subscription_plan === 'pro' || limits.subscription_plan === 'enterprise'
            ? limits.subscription_plan
            : 'free',
        status: 'active',
        maxDatasets: role === 'superadmin' || limits.max_datasets === null ? null : Number(limits.max_datasets ?? DATASETS_PER_USER_LIMIT),
        maxReportsPerDataset: role === 'superadmin' || limits.max_reports_per_dataset === null ? null : Number(limits.max_reports_per_dataset ?? REPORTS_PER_DATASET_LIMIT),
        maxWidgetsPerReport: Number(limits.max_widgets_per_report ?? WIDGETS_PER_REPORT_LIMIT)
    };
}

/**
 * Uploads a raw data file to Supabase Storage
 */
export async function uploadFile(file: File, userId: string): Promise<string | null> {
    const fileExt = file.name.split('.').pop();
    const fileName = `${Math.random().toString(36).substring(2)}.${fileExt}`;
    const filePath = `${userId}/datasets/${fileName}`;

    const { error: uploadError } = await supabase.storage
        .from('files')
        .upload(filePath, file);

    if (uploadError) {
        appLogger.error('ingestion', 'UPLOAD_RAW_FILE_FAILED', 'Failed to upload raw dataset file.', { error: uploadError });
        return null;
    }

    return filePath;
}

export function deriveDatasetArtifactUrls(rawFileUrl: string) {
    const lastDot = rawFileUrl.lastIndexOf('.');
    if (lastDot === -1) return null;

    return {
        normalized_file_url: `${rawFileUrl.slice(0, lastDot)}__normalized.csv`,
        analytics_manifest_url: `${rawFileUrl.slice(0, lastDot)}__analytics.json`
    };
}

export async function uploadDatasetAssets(
    file: File,
    userId: string,
    artifacts?: { normalizedCsv: string | Blob; manifest: unknown },
    onProgress?: (completed: number, total: number) => void
): Promise<{
    fileUrl: string;
    normalizedFileUrl?: string | null;
    analyticsManifestUrl: string;
    normalizedArtifact?: NormalizedArtifactDescriptor;
    storagePaths: string[];
}> {
    const fileExt = file.name.split('.').pop();
    const baseName = crypto.randomUUID();
    const rawPath = `${userId}/datasets/${baseName}.${fileExt}`;
    const uploadedPaths: string[] = [];
    let normalizedFileUrl: string | null = null;
    let normalizedArtifact: NormalizedArtifactDescriptor | undefined;
    const manifestPath = `${userId}/datasets/${baseName}__analytics.json`;

    const upload = async (path: string, body: Blob, contentType: string) => {
        const { error } = await supabase.storage.from('files').upload(path, body, {
            contentType,
            upsert: true
        });
        if (error) {
            throw new DatasetImportError('uploading', 'STORAGE_OBJECT_UPLOAD_FAILED', `No se pudo guardar el artefacto ${path.split('/').at(-1)}.`, {
                storageCode: error.name,
                storageMessage: error.message,
                objectBytes: body.size
            });
        }
        uploadedPaths.push(path);
    };

    try {
        await upload(rawPath, file, file.type || 'application/octet-stream');
        onProgress?.(1, 3);
        const fileUrl = rawPath;
        if (!artifacts) {
            throw new DatasetImportError('uploading', 'NORMALIZED_ARTIFACT_MISSING', 'No se generó el artefacto normalizado obligatorio.');
        }

        const normalizedCsvBlob = artifacts.normalizedCsv instanceof Blob
            ? artifacts.normalizedCsv
            : new Blob([artifacts.normalizedCsv], { type: 'text/csv;charset=utf-8' });
        const manifest = artifacts.manifest && typeof artifacts.manifest === 'object'
            ? artifacts.manifest as Record<string, unknown>
            : {};
        const stats = Array.isArray(manifest.stats) ? manifest.stats as Array<{ total?: unknown }> : [];
        const columns = Array.isArray(manifest.columns) ? manifest.columns : [];
        const totals = new Set(stats.map((stat) => Number(stat.total)));
        if (totals.size !== 1 || !Number.isInteger([...totals][0]) || columns.length === 0) {
            throw new DatasetImportError('uploading', 'NORMALIZED_MANIFEST_INVALID', 'El manifest analítico no contiene un conteo de filas y columnas consistente.');
        }
        const rowCount = [...totals][0];

        if (normalizedCsvBlob.size <= SINGLE_NORMALIZED_ARTIFACT_LIMIT) {
            const normalizedPath = `${userId}/datasets/${baseName}__normalized.csv`;
            const checksum = await sha256Blob(normalizedCsvBlob);
            await upload(normalizedPath, normalizedCsvBlob, 'text/csv;charset=utf-8');
            const partsChecksum = await sha256Blob(new Blob([`0:${checksum}:${checksum}`]));
            normalizedArtifact = {
                version: 1,
                format: 'csv',
                sourceBytes: normalizedCsvBlob.size,
                rowCount,
                columnCount: columns.length,
                partSize: normalizedCsvBlob.size,
                partsChecksum,
                parts: [{
                    index: 0,
                    path: normalizedPath,
                    encoding: 'identity',
                    sourceBytes: normalizedCsvBlob.size,
                    storedBytes: normalizedCsvBlob.size,
                    sourceSha256: checksum,
                    storedSha256: checksum
                }]
            };
            normalizedFileUrl = normalizedPath;
            onProgress?.(2, 3);
        } else {
            normalizedArtifact = await uploadPartitionedNormalizedArtifact({
                blob: normalizedCsvBlob,
                basePath: `${userId}/datasets/${baseName}__normalized`,
                rowCount,
                columnCount: columns.length,
                upload,
                onProgress: (completed, total) => onProgress?.(1 + completed, total + 2)
            });
        }

        const enrichedManifest = { ...manifest, normalized_artifact: normalizedArtifact };
        await upload(
            manifestPath,
            new Blob([JSON.stringify(enrichedManifest)], { type: 'application/json;charset=utf-8' }),
            'application/json;charset=utf-8'
        );
        onProgress?.(normalizedArtifact.parts.length + 2, normalizedArtifact.parts.length + 2);
        const analyticsManifestUrl = manifestPath;
        return {
            fileUrl,
            normalizedFileUrl,
            analyticsManifestUrl,
            normalizedArtifact,
            storagePaths: [...uploadedPaths]
        };
    } catch (error) {
        if (uploadedPaths.length) {
            const { error: cleanupError } = await supabase.storage.from('files').remove(uploadedPaths);
            if (cleanupError) {
                appLogger.warn('ingestion', 'ROLLBACK_DATASET_ASSETS_FAILED', 'Could not remove partially uploaded dataset artifacts.', {
                    error: cleanupError,
                    meta: { assetCount: uploadedPaths.length }
                });
            }
        }
        if (error instanceof DatasetImportError) throw error;
        throw new DatasetImportError('uploading', 'DATASET_ASSET_UPLOAD_FAILED', 'No se pudieron guardar los archivos del dataset.', {
            cause: error instanceof Error ? error.message : String(error)
        });
    }
}

export async function cleanupUploadedDatasetAssets(assets: {
    fileUrl?: string | null;
    normalizedFileUrl?: string | null;
    analyticsManifestUrl?: string | null;
    storagePaths?: string[];
}) {
    const paths = [assets.fileUrl, assets.normalizedFileUrl, assets.analyticsManifestUrl]
        .map(storagePathFromReference)
        .filter((path): path is string => Boolean(path));
    const allPaths = Array.from(new Set([...paths, ...(assets.storagePaths || [])]));
    if (!allPaths.length) return;
    const { error } = await supabase.storage.from('files').remove(allPaths);
    if (error) {
        appLogger.warn('ingestion', 'ROLLBACK_DATASET_ASSETS_FAILED', 'Could not remove uploaded dataset assets after a failed import.', {
            error,
            meta: { assetCount: allPaths.length }
        });
    }
}

async function fetchNormalizedArtifactPaths(manifestUrl?: string | null) {
    if (!manifestUrl) return [];
    try {
        const manifestPath = storagePathFromReference(manifestUrl);
        if (manifestPath) {
            const { data, error } = await supabase.storage.from('files').download(manifestPath);
            if (error || !data) return [];
            return normalizedArtifactPathsFromManifest(JSON.parse(await data.text()));
        }
        const response = await fetch(manifestUrl, { cache: 'no-store' });
        if (!response.ok) return [];
        return normalizedArtifactPathsFromManifest(await response.json());
    } catch (error) {
        appLogger.warn('ingestion', 'READ_DATASET_ARTIFACT_MANIFEST_FAILED', 'Could not read normalized artifact paths before cleanup.', {
            error
        });
        return [];
    }
}

function postgresErrorDiagnostics(payload: unknown, httpStatus?: number) {
    const error = payload && typeof payload === 'object' ? payload as Record<string, unknown> : {};
    return {
        httpStatus,
        postgresCode: typeof error.code === 'string' ? error.code : undefined,
        details: typeof error.details === 'string' ? error.details : undefined,
        hint: typeof error.hint === 'string' ? error.hint : undefined,
        message: typeof error.message === 'string' ? error.message : undefined
    };
}

async function completeNormalizedDatasetSync(sessionId: string) {
    const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
    const anonKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;
    const { data: { session }, error: sessionError } = await supabase.auth.getSession();
    if (!supabaseUrl || !anonKey || sessionError || !session?.access_token) {
        throw new DatasetImportError('finalizing', 'FINALIZE_AUTH_MISSING', 'La sesión expiró antes de finalizar el dataset.');
    }

    const response = await fetch(`${supabaseUrl}/rest/v1/rpc/complete_normalized_dataset_sync`, {
        method: 'POST',
        headers: {
            apikey: anonKey,
            Authorization: `Bearer ${session.access_token}`,
            'Content-Type': 'application/json'
        },
        body: JSON.stringify({ p_session_id: sessionId })
    });
    const payload = await response.json().catch(() => null) as unknown;
    if (!response.ok) {
        const diagnostics = postgresErrorDiagnostics(payload, response.status);
        throw new DatasetImportError(
            'finalizing',
            'NORMALIZED_DATASET_FINALIZE_FAILED',
            diagnostics.postgresCode === '57014'
                ? 'La finalización del dataset excedió el tiempo permitido por la base de datos.'
                : 'La base de datos rechazó la finalización del dataset.',
            diagnostics
        );
    }
    return payload;
}

export async function syncNormalizedDataset(
    datasetId: string,
    columns: { name: string; type: string }[],
    rows: DatasetRow[],
    onProgress?: (progress: DatasetProcessingProgress) => void
): Promise<string> {
    const chunkSize = 5_000;
    onProgress?.({ stage: 'persisting', progress: 0, processedRows: 0, totalRows: rows.length });

    if (rows.length <= chunkSize * 2) {
        const { data, error } = await supabase.rpc('sync_normalized_dataset', {
            p_dataset_id: datasetId,
            p_columns: columns,
            p_rows: rows
        });

        if (error) {
            const diagnostics = postgresErrorDiagnostics(error);
            throw new DatasetImportError('persisting', 'SYNC_NORMALIZED_DATASET_FAILED', 'No se pudieron persistir las filas del dataset.', diagnostics);
        }
        if (typeof data !== 'string') {
            throw new DatasetImportError('persisting', 'SYNC_NORMALIZED_DATASET_INVALID_RESPONSE', 'La base de datos no confirmó la tabla analítica.');
        }
        onProgress?.({ stage: 'finalizing', progress: 1, processedRows: rows.length, totalRows: rows.length });
        return data;
    }

    let sessionId: string | null = null;
    try {
        const { data: beginData, error: beginError } = await supabase.rpc('begin_normalized_dataset_sync', {
            p_dataset_id: datasetId,
            p_chunk_size: chunkSize
        });
        if (beginError) throw beginError;
        const begin = (beginData && typeof beginData === 'object' ? beginData : {}) as Record<string, unknown>;
        sessionId = typeof begin.session_id === 'string' ? begin.session_id : null;
        const expectedRows = Number(begin.expected_rows);
        const expectedChunks = Number(begin.expected_chunks);
        if (!sessionId || expectedRows !== rows.length || expectedChunks !== Math.ceil(rows.length / chunkSize)) {
            throw new Error('Normalized dataset sync session does not match the profiled dataset.');
        }

        for (let start = 0; start < rows.length; start += chunkSize) {
            const chunk = rows.slice(start, Math.min(start + chunkSize, rows.length));
            const chunkIndex = Math.floor(start / chunkSize);
            const { data: appendData, error: appendError } = await supabase.rpc('append_normalized_dataset_rows', {
                p_session_id: sessionId,
                p_chunk_index: chunkIndex,
                p_rows: chunk
            });
            if (appendError) throw appendError;
            const confirmation = (appendData && typeof appendData === 'object' ? appendData : {}) as Record<string, unknown>;
            if (Number(confirmation.chunk_index) !== chunkIndex
                || Number(confirmation.row_count) !== chunk.length
                || typeof confirmation.checksum !== 'string') {
                throw new Error(`Normalized dataset chunk ${chunkIndex} was not confirmed correctly.`);
            }
            const processedRows = Math.min(start + chunk.length, rows.length);
            onProgress?.({
                stage: 'persisting',
                progress: processedRows / rows.length,
                processedRows,
                totalRows: rows.length
            });
        }

        onProgress?.({ stage: 'finalizing', progress: 0, processedRows: rows.length, totalRows: rows.length });
        const completeData = await completeNormalizedDatasetSync(sessionId);
        const completed = (completeData && typeof completeData === 'object' ? completeData : {}) as Record<string, unknown>;
        const tableName = typeof completed.table_name === 'string' ? completed.table_name : null;
        if (!tableName || Number(completed.row_count) !== rows.length || typeof completed.content_checksum !== 'string') {
            throw new Error('Normalized dataset final integrity confirmation is invalid.');
        }
        appLogger.info('analytics', 'NORMALIZED_DATASET_FINALIZED', 'Normalized dataset finalization completed.', {
            meta: {
                datasetId,
                sessionId,
                rowCount: rows.length,
                chunkCount: typeof completed.chunk_count === 'number' ? completed.chunk_count : undefined,
                timingsMs: completed.timings_ms
            }
        });
        onProgress?.({ stage: 'finalizing', progress: 1, processedRows: rows.length, totalRows: rows.length });
        return tableName;
    } catch (error) {
        if (sessionId) {
            const { error: abortError } = await supabase.rpc('abort_normalized_dataset_sync', { p_session_id: sessionId });
            if (abortError) {
                appLogger.warn('analytics', 'ABORT_NORMALIZED_DATASET_SYNC_FAILED', 'Failed to abort a normalized dataset sync session.', {
                    error: abortError,
                    meta: { datasetId, sessionId }
                });
            }
        }
        const importError = error instanceof DatasetImportError
            ? error
            : new DatasetImportError('persisting', 'SYNC_NORMALIZED_DATASET_CHUNKED_FAILED', 'No se pudieron persistir todos los bloques del dataset.', postgresErrorDiagnostics(error));
        appLogger.warn('analytics', 'SYNC_NORMALIZED_DATASET_CHUNKED_FAILED', 'Failed to sync normalized dataset chunks into analytics storage.', {
            error,
            meta: { datasetId, sessionId, rowCount: rows.length, chunkSize, stage: importError.stage, code: importError.code, ...importError.diagnostics }
        });
        throw importError;
    }
}

/**
 * Sanitizes an object to be JSON-safe by converting BigInt to Number
 */
function sanitizeForJSON<T>(obj: T): T {
    if (obj === null || obj === undefined) return obj;
    if (typeof obj === 'bigint') return Number(obj) as T;
    if (Array.isArray(obj)) return obj.map(sanitizeForJSON) as T;
    if (typeof obj === 'object') {
        const sanitized: Record<string, unknown> = {};
        for (const [key, value] of Object.entries(obj)) {
            sanitized[key] = sanitizeForJSON(value);
        }
        return sanitized as T;
    }
    return obj;
}

/**
 * Saves dataset metadata to the database
 */
export async function saveDataset(dataset: Omit<SavedDataset, 'id' | 'created_at'>) {
    const sanitizedDataset = sanitizeForJSON(dataset);
    const metadataWithoutOptionalColumns = { ...sanitizedDataset };
    delete metadataWithoutOptionalColumns.sheet_name;
    delete metadataWithoutOptionalColumns.normalized_file_url;
    delete metadataWithoutOptionalColumns.analytics_manifest_url;
    
    // We try to save with sheet_name, but if it fails we fall back to saving without it
    // to avoid breaking the entire flow if the DB column isn't ready yet.
    const { data, error } = await supabase
        .from('datasets')
        .insert([sanitizedDataset])
        .select()
        .single();

    if (error && error.code === 'PGRST204') {
        appLogger.warn('ingestion', 'DATASET_OPTIONAL_COLUMNS_MISSING', 'Some optional dataset columns were not found. Falling back to save without them.', {
            once: true,
            error
        });
        const { data: retryData, error: retryError } = await supabase
            .from('datasets')
            .insert([metadataWithoutOptionalColumns])
            .select()
            .single();
        
        if (retryError) {
            if (isDatasetLimitDatabaseError(retryError)) throw new DatasetLimitError();
            throw retryError;
        }
        return retryData;
    }

    if (error) {
        if (isDatasetLimitDatabaseError(error)) throw new DatasetLimitError();
        appLogger.error('ingestion', 'SAVE_DATASET_METADATA_FAILED', 'Failed to save dataset metadata.', { error });
        throw error;
    }

    return data;
}

/**
 * Fetches all datasets for the current user
 */
export async function getDatasets(userId: string): Promise<SavedDataset[]> {
    const { data, error } = await supabase
        .from('datasets')
        .select('*')
        .eq('user_id', userId)
        .order('created_at', { ascending: false });

    if (error) {
        appLogger.error('ingestion', 'FETCH_DATASETS_FAILED', 'Failed to fetch datasets.', { error });
        return [];
    }

    return data || [];
}

/**
 * Saves or updates a report
 */
export async function saveReport(report: Omit<SavedReport, 'created_at'> | Omit<SavedReport, 'id' | 'created_at'>) {
    const reportWithoutPresentation = { ...report };
    delete reportWithoutPresentation.presentation;
    const isUpdate = 'id' in report && Boolean(report.id);
    const persist = (payload: typeof report | typeof reportWithoutPresentation) => {
        const table = supabase.from('reports');
        if (isUpdate) {
            const { id, ...updates } = payload as SavedReport;
            return table
                .update(updates)
                .eq('id', id)
                .eq('user_id', report.user_id)
                .select()
                .single();
        }
        return table.insert([payload]).select().single();
    };

    const { data, error } = await persist(report);

    if (error && error.code === 'PGRST204') {
        appLogger.warn('analytics', 'REPORT_OPTIONAL_COLUMNS_MISSING', 'Some optional report columns were not found. Falling back to save without them.', {
            once: true,
            error
        });

        const { data: retryData, error: retryError } = await persist(reportWithoutPresentation);

        if (retryError) {
            if (isReportLimitDatabaseError(retryError)) throw new ReportLimitError();
            appLogger.error('analytics', 'SAVE_REPORT_FAILED', 'Failed to save report after fallback retry.', { error: retryError });
            throw retryError;
        }

        return retryData;
    }

    if (error) {
        if (isReportLimitDatabaseError(error)) throw new ReportLimitError();
        appLogger.error('analytics', 'SAVE_REPORT_FAILED', 'Failed to save report.', { error });
        throw error;
    }

    return data;
}

/**
 * Fetches reports for a specific dataset or all user reports, filtered by user
 */
export async function getReports(userId: string, datasetId?: string): Promise<SavedReport[]> {
    let query = supabase
        .from('reports')
        .select('*')
        .eq('user_id', userId)
        .order('created_at', { ascending: false });

    if (datasetId) {
        query = query.eq('dataset_id', datasetId);
    }

    const { data, error } = await query;

    if (error) {
        appLogger.error('analytics', 'FETCH_REPORTS_FAILED', 'Failed to fetch reports.', { error });
        throw error;
    }

    return data || [];
}

/**
 * Fetches a single report by ID
 */
export async function getReportById(reportId: string): Promise<SavedReport | null> {
    const { data, error } = await supabase
        .from('reports')
        .select('*')
        .eq('id', reportId)
        .single();

    if (error) {
        appLogger.error('analytics', 'FETCH_REPORT_BY_ID_FAILED', 'Failed to fetch report by id.', { error, meta: { reportId } });
        return null;
    }

    return data;
}

/**
 * Fetches a single dataset by ID
 */
export async function getDatasetById(datasetId: string): Promise<SavedDataset | null> {
    const { data, error } = await supabase
        .from('datasets')
        .select('*')
        .eq('id', datasetId)
        .single();

    if (error) {
        appLogger.error('ingestion', 'FETCH_DATASET_BY_ID_FAILED', 'Failed to fetch dataset by id.', { error, meta: { datasetId } });
        return null;
    }

    return data;
}

/**
 * Deletes a report from the database, ensuring it belongs to the user
 */
export async function deleteReport(reportId: string, userId: string) {
    const { data, error } = await supabase.rpc('delete_report_lifecycle', { p_report_id: reportId });

    if (error || data !== true) {
        appLogger.error('analytics', 'DELETE_REPORT_FAILED', 'Failed to delete report.', { error, meta: { reportId, userId } });
        throw error || new Error('Report not found or not owned by current user.');
    }
}

/**
 * Deletes a dataset and its associated file from storage, ensuring it belongs to the user
 */
export async function deleteDataset(datasetId: string, fileUrl: string, userId: string) {
    const { data: { session } } = await supabase.auth.getSession();
    if (!session?.access_token) throw new Error('Authenticated session required to delete dataset.');

    const existingDataset = await getDatasetById(datasetId);
    const partitionPaths = await fetchNormalizedArtifactPaths(existingDataset?.analytics_manifest_url);
    const response = await fetch(`/api/lifecycle/dataset-artifacts/${datasetId}`, {
        method: 'DELETE',
        headers: { Authorization: `Bearer ${session.access_token}` }
    });
    if (!response.ok) {
        const payload = await response.json().catch(() => null) as { error?: string; dependencies?: unknown } | null;
        const dependencies = normalizeDatasetDependencies(payload?.dependencies);
        const error = response.status === 409
            ? new DatasetDependencyError(dependencies, payload?.error)
            : new Error(payload?.error || 'Dataset could not be deleted.');
        appLogger.error('ingestion', 'DELETE_DATASET_DB_FAILED', 'Failed to delete dataset from database.', { error, meta: { datasetId, userId } });
        throw error;
    }

    const lifecycle = await response.json() as {
        file_url?: string | null;
        normalized_file_url?: string | null;
        analytics_manifest_url?: string | null;
    };

    // Storage cannot participate in the Postgres transaction. Remove only the
    // owned dataset artifacts returned by the lifecycle RPC after DB success.
    try {
        const urls = [lifecycle.file_url || fileUrl, lifecycle.normalized_file_url, lifecycle.analytics_manifest_url];
        const paths = Array.from(new Set([
            ...partitionPaths,
            ...urls
            .map(storagePathFromReference)
            .filter((path): path is string => Boolean(path))
        ]));
        if (paths.length) {
            const { error: storageError } = await supabase.storage.from('files').remove(paths);
            if (storageError) throw storageError;
        }
    } catch (err) {
        appLogger.warn('ingestion', 'DELETE_DATASET_STORAGE_FAILED', 'Failed to delete dataset files from storage.', { error: err, meta: { datasetId } });
    }
}

/**
 * Updates a report's name, ensuring it belongs to the user
 */
export async function updateReportName(reportId: string, name: string, userId: string) {
    const { data, error } = await supabase
        .from('reports')
        .update({ name })
        .eq('id', reportId)
        .eq('user_id', userId)
        .select('id, name')
        .single();

    if (error) {
        appLogger.error('analytics', 'UPDATE_REPORT_NAME_FAILED', 'Failed to update report name.', { error, meta: { reportId, userId } });
        throw error;
    }
    return data;
}

/**
 * Checks if a user has reached the dataset limit (3)
 */
export async function checkDatasetLimit(userId: string): Promise<boolean> {
    const limits = await getCurrentAccountLimits();
    if (limits.maxDatasets === null) return true;

    const { count, error } = await supabase
        .from('datasets')
        .select('*', { count: 'exact', head: true })
        .eq('user_id', userId);

    if (error) {
        appLogger.error('ingestion', 'COUNT_DATASETS_FAILED', 'Failed to count datasets.', { error, meta: { userId } });
        return false;
    }
    return (count || 0) < limits.maxDatasets;
}

/**
 * Checks if a dataset has reached the report limit (3)
 */
export async function checkReportLimit(datasetId: string, userId: string): Promise<boolean> {
    const limits = await getCurrentAccountLimits();
    if (limits.maxReportsPerDataset === null) return true;

    const { count, error } = await supabase
        .from('reports')
        .select('*', { count: 'exact', head: true })
        .eq('dataset_id', datasetId)
        .eq('user_id', userId);

    if (error) {
        appLogger.error('analytics', 'COUNT_REPORTS_FAILED', 'Failed to count reports.', { error, meta: { datasetId, userId } });
        throw error;
    }
    return (count || 0) < limits.maxReportsPerDataset;
}

export async function getDatasetDeleteDependencies(datasetId: string): Promise<DatasetDeleteDependencies> {
    const { data, error } = await supabase.rpc('get_dataset_delete_dependencies', { p_dataset_id: datasetId });
    if (error) {
        appLogger.error('ingestion', 'CHECK_DATASET_DEPENDENCIES_FAILED', 'Could not inspect dataset dependencies.', {
            error,
            meta: { datasetId }
        });
        throw error;
    }
    if (!data) throw new Error('Dataset not found or not owned by current user.');
    return normalizeDatasetDependencies(data);
}
