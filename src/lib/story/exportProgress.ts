import type { StoryExportJobPhase, StoryOrientation } from './types';

export const STORY_EXPORT_FPS = 24;
export const STORY_EXPORT_VIEWPORTS: Record<StoryOrientation, { width: number; height: number }> = {
  landscape: { width: 1920, height: 1080 },
  portrait: { width: 1080, height: 1920 }
};

export function computeStoryExportFrameCount(durationMs: number, fps: number) {
  if (!Number.isFinite(durationMs) || durationMs <= 0 || !Number.isFinite(fps) || fps <= 0) {
    return 1;
  }

  return Math.max(1, Math.ceil((durationMs / 1000) * fps));
}

export function buildStoryExportFrameTimeline(durationMs: number, fps: number) {
  const frameCount = computeStoryExportFrameCount(durationMs, fps);
  if (frameCount === 1) {
    return {
      frameCount,
      timeMs: [Math.max(0, Math.round(durationMs))]
    };
  }

  const timeMs = Array.from({ length: frameCount }, (_, index) => {
    if (index === frameCount - 1) {
      return Math.max(0, Math.round(durationMs));
    }

    const progress = index / (frameCount - 1);
    return Math.max(0, Math.round(progress * durationMs));
  });

  return {
    frameCount,
    timeMs
  };
}

export function getStoryExportProgress(currentFrame: number, totalFrames: number) {
  if (!Number.isFinite(currentFrame) || !Number.isFinite(totalFrames) || totalFrames <= 0) {
    return 0;
  }

  return Math.max(0, Math.min(currentFrame / totalFrames, 1));
}

export function shouldPersistStoryExportHeartbeat(frameIndex: number, totalFrames: number) {
  if (frameIndex <= 0) return true;
  if (frameIndex >= totalFrames - 1) return true;
  return frameIndex % 6 === 0;
}

export function getStoryExportPhaseTimeoutMs(phase: StoryExportJobPhase) {
  switch (phase) {
    case 'queued':
      return 2 * 60 * 1000;
    case 'preparing':
      return 3 * 60 * 1000;
    case 'rendering_frames':
      return 20 * 60 * 1000;
    case 'encoding':
      return 10 * 60 * 1000;
    case 'completed':
    case 'failed':
      return Number.POSITIVE_INFINITY;
    default:
      return 10 * 60 * 1000;
  }
}

export function isStoryExportJobStale(phase: StoryExportJobPhase, heartbeatAt: string | null | undefined, nowMs = Date.now()) {
  if (!heartbeatAt) return false;
  const heartbeatMs = Date.parse(heartbeatAt);
  if (!Number.isFinite(heartbeatMs)) return false;
  return nowMs - heartbeatMs > getStoryExportPhaseTimeoutMs(phase);
}
