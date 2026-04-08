import { supabase } from './supabase';

export interface SavedDataset {
    id: string;
    user_id: string;
    name: string;
    file_url: string;
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
        console.error('Error uploading file:', uploadError.message);
        return null;
    }

    const { data: { publicUrl } } = supabase.storage
        .from('files')
        .getPublicUrl(filePath);

    return publicUrl;
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
    const { sheet_name, ...metadataWithoutSheet } = sanitizedDataset;
    
    // We try to save with sheet_name, but if it fails we fall back to saving without it
    // to avoid breaking the entire flow if the DB column isn't ready yet.
    const { data, error } = await supabase
        .from('datasets')
        .insert([sanitizedDataset])
        .select()
        .single();

    if (error && error.code === 'PGRST204') {
        console.warn('Column sheet_name not found in datasets table. Falling back to save without it.');
        const { data: retryData, error: retryError } = await supabase
            .from('datasets')
            .insert([metadataWithoutSheet])
            .select()
            .single();
        
        if (retryError) throw retryError;
        return retryData;
    }

    if (error) {
        console.error('Error saving dataset metadata:', error.message);
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
        console.error('Error fetching datasets:', error.message);
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
        console.error('Error saving report:', error.message);
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
        console.error('Error fetching reports:', error.message);
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
        console.error('Error fetching report by ID:', error.message);
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
        console.error('Error fetching dataset by ID:', error.message);
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
        console.error('Error deleting report:', error.message);
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
        console.error('Error deleting dataset from DB:', dbError.message);
        throw dbError;
    }

    // 2. Delete from storage (optional but recommended)
    try {
        const path = fileUrl.split('/storage/v1/object/public/files/')[1];
        if (path) {
            await supabase.storage.from('files').remove([path]);
        }
    } catch (err) {
        console.warn('Failed to delete file from storage:', err);
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
        console.error('Error updating report name:', error.message);
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

    if (error) return false;
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

    if (error) return false;
    return (count || 0) < 3;
}
