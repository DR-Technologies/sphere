import { getAnalyticsProvider } from './analytics/provider';
import type { DatasetImportOptions, ProfileFromUrlOptions } from './analytics/types';

export async function profileFile(file: File, options?: DatasetImportOptions) {
    return getAnalyticsProvider().profileFile(file, options);
}

export async function runQuery(query: string, options?: { datasetId?: string }) {
    return getAnalyticsProvider().runQuery(query, options);
}

export async function profileFromUrl(url: string, name: string, sheetName?: string, options?: ProfileFromUrlOptions) {
    return getAnalyticsProvider().profileFromUrl(url, name, sheetName, options);
}

export async function getExcelSheetNames(file: File) {
    return getAnalyticsProvider().getExcelSheetNames(file);
}
