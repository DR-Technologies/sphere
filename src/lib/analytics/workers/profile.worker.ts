import { supabaseAnalyticsProvider } from '../providers/supabaseProvider';
import { createThrottledProgressReporter } from '../progress';
import type { DatasetImportOptions, DatasetProcessingProgress } from '../types';

interface ProfileWorkerRequest {
  file: File;
  options?: DatasetImportOptions;
}

type ProfileWorkerResponse =
  | { type: 'progress'; progress: DatasetProcessingProgress }
  | { type: 'complete'; result: Awaited<ReturnType<typeof supabaseAnalyticsProvider.profileFile>> }
  | { type: 'error'; error: { name: string; message: string; stack?: string } };

self.onmessage = async (event: MessageEvent<ProfileWorkerRequest>) => {
  const progressReporter = createThrottledProgressReporter((progress) => {
    self.postMessage({ type: 'progress', progress } satisfies ProfileWorkerResponse);
  });
  try {
    const result = await supabaseAnalyticsProvider.profileFile(event.data.file, event.data.options, {
      onProgress: progressReporter.report
    });
    progressReporter.flush();
    progressReporter.dispose();
    self.postMessage({ type: 'complete', result } satisfies ProfileWorkerResponse);
  } catch (error) {
    progressReporter.dispose();
    const normalized = error instanceof Error
      ? { name: error.name, message: error.message, stack: error.stack }
      : { name: 'Error', message: 'Dataset profiling failed.' };
    self.postMessage({ type: 'error', error: normalized } satisfies ProfileWorkerResponse);
  }
};

export {};
