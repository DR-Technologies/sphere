import { describe, expect, it } from 'vitest';
import {
  buildStoryExportFrameTimeline,
  computeStoryExportFrameCount,
  getStoryExportProgress,
  isStoryExportJobStale,
  shouldPersistStoryExportHeartbeat
} from './exportProgress';

describe('story export progress helpers', () => {
  it('computes a finite frame count from duration and fps', () => {
    expect(computeStoryExportFrameCount(10_114, 24)).toBe(243);
  });

  it('builds a deterministic frame timeline that ends exactly at story duration', () => {
    const timeline = buildStoryExportFrameTimeline(10_114, 24);

    expect(timeline.frameCount).toBe(243);
    expect(timeline.timeMs).toHaveLength(243);
    expect(timeline.timeMs[0]).toBe(0);
    expect(timeline.timeMs.at(-1)).toBe(10_114);
    expect(Math.max(...timeline.timeMs)).toBe(10_114);
    expect(timeline.timeMs.every((time, index) => index === 0 || time >= timeline.timeMs[index - 1]!)).toBe(true);
  });

  it('derives rendering progress from current and total frames', () => {
    expect(getStoryExportProgress(0, 243)).toBe(0);
    expect(getStoryExportProgress(122, 243)).toBeCloseTo(122 / 243, 5);
    expect(getStoryExportProgress(243, 243)).toBe(1);
  });

  it('persists heartbeats on first, periodic and last frames', () => {
    expect(shouldPersistStoryExportHeartbeat(0, 243)).toBe(true);
    expect(shouldPersistStoryExportHeartbeat(6, 243)).toBe(true);
    expect(shouldPersistStoryExportHeartbeat(7, 243)).toBe(false);
    expect(shouldPersistStoryExportHeartbeat(242, 243)).toBe(true);
  });

  it('detects stale jobs using phase-specific timeout windows', () => {
    const now = Date.parse('2026-07-28T20:00:00.000Z');
    expect(isStoryExportJobStale('rendering_frames', '2026-07-28T19:30:00.000Z', now)).toBe(true);
    expect(isStoryExportJobStale('rendering_frames', '2026-07-28T19:50:30.000Z', now)).toBe(false);
    expect(isStoryExportJobStale('encoding', '2026-07-28T19:40:00.000Z', now)).toBe(true);
    expect(isStoryExportJobStale('completed', '2026-07-28T10:00:00.000Z', now)).toBe(false);
  });
});
