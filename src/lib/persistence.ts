import { supabase } from './supabase';
import { appLogger } from './logger';

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
    widgets: any[];
    filters?: any[]; // Global filters for the report
    created_at: string;
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

    const { data: { publicUrl } } = supabase.storage
        .from('files')
        .getPublicUrl(filePath);

    return publicUrl;
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
    artifacts?: { normalizedCsv: string; manifest: unknown }
): Promise<{ fileUrl: string | null; normalizedFileUrl?: string | null; analyticsManifestUrl?: string | null }> {
    const fileExt = file.name.split('.').pop();
    const baseName = Math.random().toString(36).substring(2);
    const rawPath = `${userId}/datasets/${baseName}.${fileExt}`;

    const { error: rawUploadError } = await supabase.storage
        .from('files')
        .upload(rawPath, file);

    if (rawUploadError) {
        appLogger.error('ingestion', 'UPLOAD_DATASET_ASSET_FAILED', 'Failed to upload dataset asset.', { error: rawUploadError });
        return { fileUrl: null };
    }

    const { data: { publicUrl: fileUrl } } = supabase.storage
        .from('files')
        .getPublicUrl(rawPath);

    let normalizedFileUrl: string | null = null;
    let analyticsManifestUrl: string | null = null;

    if (artifacts) {
        const normalizedPath = `${userId}/datasets/${baseName}__normalized.csv`;
        const manifestPath = `${userId}/datasets/${baseName}__analytics.json`;

        const { error: normalizedUploadError } = await supabase.storage
            .from('files')
            .upload(normalizedPath, new Blob([artifacts.normalizedCsv], { type: 'text/csv;charset=utf-8' }), {
                contentType: 'text/csv',
                upsert: true
            });

        if (normalizedUploadError) {
            appLogger.warn('ingestion', 'UPLOAD_NORMALIZED_ARTIFACT_FAILED', 'Failed to upload normalized dataset artifact.', { error: normalizedUploadError });
        } else {
            normalizedFileUrl = supabase.storage.from('files').getPublicUrl(normalizedPath).data.publicUrl;
        }

        const { error: manifestUploadError } = await supabase.storage
            .from('files')
            .upload(manifestPath, new Blob([JSON.stringify(artifacts.manifest, null, 2)], { type: 'application/json;charset=utf-8' }), {
                contentType: 'application/json',
                upsert: true
            });

        if (manifestUploadError) {
            appLogger.warn('ingestion', 'UPLOAD_ANALYTICS_MANIFEST_FAILED', 'Failed to upload analytics manifest artifact.', { error: manifestUploadError });
        } else {
            analyticsManifestUrl = supabase.storage.from('files').getPublicUrl(manifestPath).data.publicUrl;
        }
    }

    return { fileUrl, normalizedFileUrl, analyticsManifestUrl };
}

export async function syncNormalizedDataset(
    datasetId: string,
    columns: { name: string; type: string }[],
    rows: Record<string, any>[]
): Promise<string | null> {
    const { data, error } = await supabase.rpc('sync_normalized_dataset', {
        p_dataset_id: datasetId,
        p_columns: columns,
        p_rows: rows
    });

    if (error) {
        appLogger.warn('analytics', 'SYNC_NORMALIZED_DATASET_FAILED', 'Failed to sync normalized dataset into analytics storage.', { error });
        return null;
    }

    return typeof data === 'string' ? data : null;
}

/**
 * Sanitizes an object to be JSON-safe by converting BigInt to Number
 */
function sanitizeForJSON(obj: unknown): any {
    if (obj === null || obj === undefined) return obj;
    if (typeof obj === 'bigint') return Number(obj);
    if (Array.isArray(obj)) return obj.map(sanitizeForJSON);
    if (typeof obj === 'object') {
        const sanitized: Record<string, any> = {};
        for (const [key, value] of Object.entries(obj)) {
            sanitized[key] = sanitizeForJSON(value);
        }
        return sanitized;
    }
    return obj;
}

/**
 * Saves dataset metadata to the database
 */
export async function saveDataset(dataset: Omit<SavedDataset, 'id' | 'created_at'>) {
    const sanitizedDataset = sanitizeForJSON(dataset);
    const { sheet_name, normalized_file_url, analytics_manifest_url, ...metadataWithoutOptionalColumns } = sanitizedDataset;
    
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
        
        if (retryError) throw retryError;
        return retryData;
    }

    if (error) {
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
    const { data, error } = await supabase
        .from('reports')
        .upsert([report])
        .select()
        .single();

    if (error) {
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
        return [];
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
    const { error } = await supabase
        .from('reports')
        .delete()
        .eq('id', reportId)
        .eq('user_id', userId);

    if (error) {
        appLogger.error('analytics', 'DELETE_REPORT_FAILED', 'Failed to delete report.', { error, meta: { reportId, userId } });
        throw error;
    }
}

/**
 * Deletes a dataset and its associated file from storage, ensuring it belongs to the user
 */
export async function deleteDataset(datasetId: string, fileUrl: string, userId: string) {
    // 1. Delete from database
    const { error: dbError } = await supabase
        .from('datasets')
        .delete()
        .eq('id', datasetId)
        .eq('user_id', userId);

    if (dbError) {
        appLogger.error('ingestion', 'DELETE_DATASET_DB_FAILED', 'Failed to delete dataset from database.', { error: dbError, meta: { datasetId, userId } });
        throw dbError;
    }

    // 2. Delete from storage (optional but recommended)
    try {
        const path = fileUrl.split('/storage/v1/object/public/files/')[1];
        if (path) {
            const extensionIndex = path.lastIndexOf('.');
            const basePath = extensionIndex === -1 ? path : path.slice(0, extensionIndex);
            const derivedPaths = extensionIndex === -1
                ? [path]
                : [path, `${basePath}__normalized.csv`, `${basePath}__analytics.json`];
            await supabase.storage.from('files').remove(derivedPaths);
        }
    } catch (err) {
        appLogger.warn('ingestion', 'DELETE_DATASET_STORAGE_FAILED', 'Failed to delete dataset files from storage.', { error: err, meta: { datasetId } });
    }
}

/**
 * Updates a report's name, ensuring it belongs to the user
 */
export async function updateReportName(reportId: string, name: string, userId: string) {
    const { error } = await supabase
        .from('reports')
        .update({ name })
        .eq('id', reportId)
        .eq('user_id', userId);

    if (error) {
        appLogger.error('analytics', 'UPDATE_REPORT_NAME_FAILED', 'Failed to update report name.', { error, meta: { reportId, userId } });
        throw error;
    }
}

/**
 * Checks if a user has reached the dataset limit (3)
 */
export async function checkDatasetLimit(userId: string): Promise<boolean> {
    const { count, error } = await supabase
        .from('datasets')
        .select('*', { count: 'exact', head: true })
        .eq('user_id', userId);

    if (error) {
        appLogger.error('ingestion', 'COUNT_DATASETS_FAILED', 'Failed to count datasets.', { error, meta: { userId } });
        return false;
    }
    return (count || 0) < 3;
}

/**
 * Checks if a dataset has reached the report limit (3)
 */
export async function checkReportLimit(datasetId: string): Promise<boolean> {
    const { count, error } = await supabase
        .from('reports')
        .select('*', { count: 'exact', head: true })
        .eq('dataset_id', datasetId);

    if (error) {
        appLogger.error('analytics', 'COUNT_REPORTS_FAILED', 'Failed to count reports.', { error, meta: { datasetId } });
        return false;
    }
    return (count || 0) < 3;
}
