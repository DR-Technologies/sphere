import { getAnalyticsProvider } from './analytics/provider';
import { isSameDatasetProgress } from './analytics/progress';
import { resolvePrivateFileUrl } from './storage/files';
import type {
    DatasetImportOptions,
    DatasetProfileExecutionOptions,
    DatasetProfileResult,
    DatasetProcessingProgress,
    ProfileFromUrlOptions
} from './analytics/types';

type ProfileWorkerResponse =
    | { type: 'progress'; progress: DatasetProcessingProgress }
    | { type: 'complete'; result: DatasetProfileResult }
    | { type: 'error'; error: { name: string; message: string; stack?: string } };

function canUseProfileWorker() {
    return typeof window !== 'undefined' && typeof Worker !== 'undefined';
}

async function profileFileInWorker(
    file: File,
    options: DatasetImportOptions | undefined,
    execution: DatasetProfileExecutionOptions | undefined
) {
    return new Promise<DatasetProfileResult>((resolve, reject) => {
        const worker = new Worker(new URL('./analytics/workers/profile.worker.ts', import.meta.url), { type: 'module' });
        let lastProgress: DatasetProcessingProgress | null = null;
        worker.onmessage = (event: MessageEvent<ProfileWorkerResponse>) => {
            if (event.data.type === 'progress') {
                if (isSameDatasetProgress(lastProgress, event.data.progress)) return;
                lastProgress = event.data.progress;
                execution?.onProgress?.(event.data.progress);
                return;
            }
            worker.terminate();
            if (event.data.type === 'complete') {
                resolve(event.data.result);
                return;
            }
            const error = new Error(event.data.error.message);
            error.name = event.data.error.name;
            error.stack = event.data.error.stack;
            reject(error);
        };
        worker.onerror = (event) => {
            worker.terminate();
            reject(new Error(event.message || 'Dataset profiling worker failed.'));
        };
        worker.postMessage({ file, options });
    });
}

export async function profileFile(file: File, options?: DatasetImportOptions, execution?: DatasetProfileExecutionOptions) {
    if (canUseProfileWorker()) {
        return profileFileInWorker(file, options, execution);
    }
    return getAnalyticsProvider().profileFile(file, options, execution);
}

export async function runQuery(query: string, options?: { datasetId?: string }) {
    return getAnalyticsProvider().runQuery(query, options);
}

export async function profileFromUrl(url: string, name: string, sheetName?: string, options?: ProfileFromUrlOptions) {
    if (canUseProfileWorker()) {
        const sourceReference = options?.normalizedFileUrl || url;
        const sourceUrl = await resolvePrivateFileUrl(sourceReference);
        const response = await fetch(sourceUrl);
        if (!response.ok) throw new Error(`No se pudo abrir el archivo del dataset (${response.status}).`);
        const blob = await response.blob();
        const file = new File([blob], options?.normalizedFileUrl ? 'normalized.csv' : name, { type: blob.type });
        return profileFileInWorker(file, { sheetName }, undefined);
    }
    return getAnalyticsProvider().profileFromUrl(url, name, sheetName, options);
}

export async function getExcelSheetNames(file: File) {
    return getAnalyticsProvider().getExcelSheetNames(file);
}
