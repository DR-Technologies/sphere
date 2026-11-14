import { afterEach, describe, expect, it, vi } from 'vitest';
import { createThrottledProgressReporter, isSameDatasetProgress } from './progress';

describe('dataset progress delivery', () => {
  afterEach(() => vi.useRealTimers());

  it('deduplicates identical progress states', () => {
    const progress = { stage: 'profiling' as const, progress: 0.25, processedRows: 25, totalRows: 100 };
    expect(isSameDatasetProgress(progress, { ...progress })).toBe(true);
    expect(isSameDatasetProgress(progress, { ...progress, processedRows: 26 })).toBe(false);
  });

  it('throttles repeated updates while preserving stages and terminal states', () => {
    vi.useFakeTimers();
    const delivered: number[] = [];
    const reporter = createThrottledProgressReporter((progress) => delivered.push(progress.progress), 100);

    reporter.report({ stage: 'profiling', progress: 0 });
    reporter.report({ stage: 'profiling', progress: 0.1 });
    reporter.report({ stage: 'profiling', progress: 0.2 });
    expect(delivered).toEqual([0]);

    vi.advanceTimersByTime(100);
    expect(delivered).toEqual([0, 0.2]);

    reporter.report({ stage: 'profiling', progress: 1 });
    reporter.report({ stage: 'normalizing', progress: 0 });
    expect(delivered).toEqual([0, 0.2, 1, 0]);
    reporter.dispose();
  });

  it('flushes the latest pending state before completion', () => {
    vi.useFakeTimers();
    const delivered: number[] = [];
    const reporter = createThrottledProgressReporter((progress) => delivered.push(progress.progress), 100);
    reporter.report({ stage: 'normalizing', progress: 0 });
    reporter.report({ stage: 'normalizing', progress: 0.75 });
    reporter.flush();
    expect(delivered).toEqual([0, 0.75]);
    reporter.dispose();
  });
});
