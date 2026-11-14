import type { DatasetProcessingProgress } from './types';

export function isSameDatasetProgress(
  left: DatasetProcessingProgress | null | undefined,
  right: DatasetProcessingProgress | null | undefined
) {
  if (left === right) return true;
  if (!left || !right) return false;
  return left.stage === right.stage
    && left.progress === right.progress
    && left.overallProgress === right.overallProgress
    && left.processedRows === right.processedRows
    && left.totalRows === right.totalRows;
}

export function createThrottledProgressReporter(
  deliver: (progress: DatasetProcessingProgress) => void,
  intervalMs = 100
) {
  let lastDelivered: DatasetProcessingProgress | null = null;
  let pending: DatasetProcessingProgress | null = null;
  let timer: ReturnType<typeof setTimeout> | null = null;
  let lastDeliveredAt = 0;
  let closed = false;

  const clearTimer = () => {
    if (timer !== null) clearTimeout(timer);
    timer = null;
  };

  const emit = (progress: DatasetProcessingProgress) => {
    if (closed || isSameDatasetProgress(lastDelivered, progress)) return;
    lastDelivered = progress;
    lastDeliveredAt = performance.now();
    deliver(progress);
  };

  const flush = () => {
    clearTimer();
    if (!pending) return;
    const progress = pending;
    pending = null;
    emit(progress);
  };

  const report = (progress: DatasetProcessingProgress) => {
    if (closed || isSameDatasetProgress(lastDelivered, progress) || isSameDatasetProgress(pending, progress)) return;

    const stageChanged = lastDelivered?.stage !== progress.stage;
    const stageCompleted = progress.progress >= 1;
    const elapsed = performance.now() - lastDeliveredAt;
    if (!lastDelivered || stageChanged || stageCompleted || elapsed >= intervalMs) {
      pending = null;
      clearTimer();
      emit(progress);
      return;
    }

    pending = progress;
    if (timer === null) {
      timer = setTimeout(flush, Math.max(0, intervalMs - elapsed));
    }
  };

  const dispose = () => {
    closed = true;
    pending = null;
    clearTimer();
  };

  return { report, flush, dispose };
}
