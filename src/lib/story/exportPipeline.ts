import { chromium, type Browser, type BrowserContext, type Page } from 'playwright';
import { spawn } from 'node:child_process';
import fs from 'node:fs/promises';
import path from 'node:path';
import process from 'node:process';
import { appLogger } from '@/lib/logger';
import { createServerSupabaseClient } from '@/lib/supabaseServer';
import {
  ensureExportRoot,
  getFramesDir,
  getMp4Path,
  getStoryExportFileSize,
  prepareExportJobFiles,
  readExportPayload,
  readLocalJobStatus,
  writeLocalJobStatus
} from './exportStore';
import {
  buildStoryExportFrameTimeline,
  getStoryExportProgress,
  shouldPersistStoryExportHeartbeat,
  STORY_EXPORT_FPS,
  STORY_EXPORT_VIEWPORTS
} from './exportProgress';
import { getStoryTotalDuration } from './playback';
import type { MaterializedStory, StoryDefinition, StoryExportJobPhase, StoryOrientation } from './types';

const STORY_FRAME_JPEG_QUALITY = 90;

function hrtimeMs() {
  return Number(process.hrtime.bigint()) / 1_000_000;
}

let sharedBrowserPromise: Promise<Browser> | null = null;
const activeStoryExportJobs = new Set<string>();

async function getSharedBrowser() {
  if (!sharedBrowserPromise) {
    sharedBrowserPromise = chromium.launch({ headless: true }).then((browser) => {
      browser.on('disconnected', () => {
        sharedBrowserPromise = null;
      });
      return browser;
    }).catch((error) => {
      sharedBrowserPromise = null;
      throw error;
    });
  }
  return sharedBrowserPromise;
}

async function commandExists(command: string) {
  return new Promise<boolean>((resolve) => {
    const child = spawn('sh', ['-lc', `command -v ${command}`], { stdio: 'ignore' });
    child.on('exit', (code) => resolve(code === 0));
  });
}

async function updateJobRecord(accessToken: string | undefined, jobId: string, patch: Record<string, unknown>) {
  if (!accessToken) return;

  const supabase = createServerSupabaseClient(accessToken);
  const { error } = await supabase
    .from('story_export_jobs')
    .update({
      ...patch,
      updated_at: new Date().toISOString()
    })
    .eq('id', jobId);

  if (error) {
    appLogger.warn('story', 'UPDATE_STORY_EXPORT_JOB_FAILED', 'Failed to update story export job state.', {
      error,
      meta: { jobId, patchKeys: Object.keys(patch) }
    });
  }
}

async function writeJobProgress(params: {
  jobId: string;
  accessToken?: string;
  status: 'queued' | 'processing' | 'completed' | 'failed';
  phase: StoryExportJobPhase;
  fps?: number;
  durationMs?: number | null;
  frameCount?: number | null;
  currentFrame?: number | null;
  currentTimeMs?: number | null;
  progress?: number | null;
  renderTimeMs?: number | null;
  frameRenderTimeMs?: number | null;
  encodingTimeMs?: number | null;
  fileName?: string | null;
  outputPath?: string | null;
  outputSizeBytes?: number | null;
  error?: string | null;
  technicalMetadata?: Record<string, unknown>;
  startedAt?: string | null;
  completedAt?: string | null;
  persistRemote?: boolean;
}) {
  const timestamp = new Date().toISOString();
  await writeLocalJobStatus(params.jobId, {
    jobId: params.jobId,
    status: params.status,
    phase: params.phase,
    fps: params.fps ?? STORY_EXPORT_FPS,
    durationMs: params.durationMs ?? null,
    frameCount: params.frameCount ?? null,
    currentFrame: params.currentFrame ?? null,
    currentTimeMs: params.currentTimeMs ?? null,
    progress: params.progress ?? null,
    renderTimeMs: params.renderTimeMs ?? null,
    frameRenderTimeMs: params.frameRenderTimeMs ?? null,
    encodingTimeMs: params.encodingTimeMs ?? null,
    fileName: params.fileName ?? null,
    outputPath: params.outputPath ?? null,
    outputSizeBytes: params.outputSizeBytes ?? null,
    error: params.error ?? null,
    technicalMetadata: params.technicalMetadata ?? {},
    startedAt: params.startedAt ?? null,
    completedAt: params.completedAt ?? null,
    heartbeatAt: timestamp,
    updatedAt: timestamp
  });

  if (params.persistRemote && params.accessToken) {
    const remotePatch: Record<string, unknown> = {
      status: params.status,
      phase: params.phase,
      fps: params.fps ?? STORY_EXPORT_FPS,
      duration_ms: params.durationMs ?? null,
      frame_count: params.frameCount ?? null,
      current_frame: params.currentFrame ?? null,
      current_time_ms: params.currentTimeMs ?? null,
      progress: params.progress ?? null,
      render_time_ms: params.renderTimeMs ?? null,
      frame_render_time_ms: params.frameRenderTimeMs ?? null,
      encoding_time_ms: params.encodingTimeMs ?? null,
      file_name: params.fileName ?? null,
      output_path: params.outputPath ?? null,
      output_size_bytes: params.outputSizeBytes ?? null,
      error: params.error ?? null,
      started_at: params.startedAt ?? null,
      completed_at: params.completedAt ?? null,
      heartbeat_at: timestamp
    };
    if (params.technicalMetadata !== undefined) {
      remotePatch.technical_metadata = params.technicalMetadata;
    }
    await updateJobRecord(params.accessToken, params.jobId, remotePatch);
  }
}

export async function queueStoryExportJob(params: {
  jobId: string;
  renderToken: string;
  story: StoryDefinition;
  materializedStory: MaterializedStory;
  orientation: StoryOrientation;
  accessToken?: string;
  origin: string;
  mockMode?: boolean;
  cacheKey?: string;
}) {
  if (activeStoryExportJobs.has(params.jobId)) {
    appLogger.warn('story', 'STORY_EXPORT_ALREADY_QUEUED', 'Duplicate Story export start request ignored.', {
      meta: { jobId: params.jobId }
    });
    return;
  }
  activeStoryExportJobs.add(params.jobId);
  const viewport = STORY_EXPORT_VIEWPORTS[params.orientation];
  try {
    await ensureExportRoot();
    await prepareExportJobFiles({
      jobId: params.jobId,
      renderToken: params.renderToken,
      story: params.story,
      materializedStory: params.materializedStory,
      orientation: params.orientation,
      width: viewport.width,
      height: viewport.height,
      fps: STORY_EXPORT_FPS,
      cacheKey: params.cacheKey
    });

    await writeLocalJobStatus(params.jobId, {
      jobId: params.jobId,
      status: 'queued',
      phase: 'queued',
      fps: STORY_EXPORT_FPS,
      progress: 0,
      updatedAt: new Date().toISOString()
    });

    if (!params.mockMode) {
      await updateJobRecord(params.accessToken, params.jobId, {
        status: 'queued',
        phase: 'queued',
        orientation: params.orientation,
        fps: STORY_EXPORT_FPS,
        progress: 0,
        error: null
      });
    }

    void processStoryExportJob({
      jobId: params.jobId,
      origin: params.origin,
      accessToken: params.accessToken,
      mockMode: params.mockMode
    }).catch((error) => {
      appLogger.error('story', 'PROCESS_STORY_EXPORT_JOB_UNHANDLED', 'Unhandled story export processing failure.', {
        error,
        meta: { jobId: params.jobId }
      });
    }).finally(() => {
      activeStoryExportJobs.delete(params.jobId);
    });
  } catch (error) {
    activeStoryExportJobs.delete(params.jobId);
    throw error;
  }
}

export async function processStoryExportJob(params: {
  jobId: string;
  origin: string;
  accessToken?: string;
  mockMode?: boolean;
}) {
  const existingStatus = await readLocalJobStatus(params.jobId);
  if (existingStatus && existingStatus.status === 'processing' && existingStatus.phase !== 'failed' && existingStatus.phase !== 'completed') {
    appLogger.warn('story', 'STORY_EXPORT_ALREADY_PROCESSING', 'Story export job is already processing; skipping duplicate worker start.', {
      meta: { jobId: params.jobId, phase: existingStatus.phase }
    });
    return;
  }

  const startedAt = new Date().toISOString();
  const pipelineStartedMs = hrtimeMs();
  let context: BrowserContext | null = null;
  let page: Page | null = null;
  await writeJobProgress({
    jobId: params.jobId,
    accessToken: params.accessToken,
    status: 'processing',
    phase: 'preparing',
    fps: STORY_EXPORT_FPS,
    progress: 0,
    startedAt,
    persistRemote: !params.mockMode
  });

  try {
    const payload = await readExportPayload(params.jobId);
    if (params.mockMode) {
      const totalDurationMs = Math.min(getStoryDurationForMock(payload.story), 1200);
      const { frameCount } = buildStoryExportFrameTimeline(totalDurationMs, STORY_EXPORT_FPS);
      const completedAt = new Date().toISOString();
      const fileName = `${sanitizeFileName(payload.story.title || 'sphere-story')}-${payload.orientation}.mp4`;
      const outputPath = getMp4Path(payload.jobId);
      const mockBuffer = Buffer.from('sphere-story-export-mock');

      await fs.writeFile(outputPath, mockBuffer);
      await writeJobProgress({
        jobId: payload.jobId,
        status: 'completed',
        phase: 'completed',
        fps: STORY_EXPORT_FPS,
        startedAt,
        completedAt,
        fileName,
        outputPath,
        outputSizeBytes: mockBuffer.byteLength,
        durationMs: totalDurationMs,
        frameCount,
        currentFrame: frameCount,
        currentTimeMs: totalDurationMs,
        progress: 1,
        renderTimeMs: 10,
        frameRenderTimeMs: 5,
        encodingTimeMs: 5,
        technicalMetadata: {
          width: payload.width,
          height: payload.height,
          mockMode: true
        }
      });
      return;
    }

    const ffmpegAvailable = await commandExists('ffmpeg');
    if (!ffmpegAvailable) {
      throw new Error('FFmpeg is not available in the current environment.');
    }

    const browser = await getSharedBrowser();
    context = await browser.newContext({
      viewport: {
        width: payload.width,
        height: payload.height
      },
      deviceScaleFactor: 1
    });
    page = await context.newPage();

    const renderUrl = new URL(`/story/render/${payload.jobId}`, params.origin);
    renderUrl.searchParams.set('token', payload.renderToken);
    renderUrl.searchParams.set('width', String(payload.width));
    renderUrl.searchParams.set('height', String(payload.height));
    renderUrl.searchParams.set('timeMs', '0');

    await page.goto(renderUrl.toString(), { waitUntil: 'networkidle' });
    await page.addStyleTag({ content: 'nextjs-portal { display: none !important; }' });
    await page.waitForSelector('[data-story-ready="true"]');
    await page.waitForFunction(() => Boolean(window.__SPHERE_STORY_RENDER__));
    await page.evaluate(() => document.fonts.ready);
    const initializationTimeMs = Math.round(hrtimeMs() - pipelineStartedMs);

    const totalDurationMsRaw = await page.locator('[data-story-ready="true"]').getAttribute('data-story-total-duration-ms');
    const totalDurationMsRawNumber = Number(totalDurationMsRaw || 0);
    if (!Number.isFinite(totalDurationMsRawNumber) || totalDurationMsRawNumber <= 0) {
      throw new Error(`Invalid Story duration for export job ${payload.jobId}.`);
    }

    const totalDurationMs = totalDurationMsRawNumber;
    const { frameCount, timeMs: frameTimes } = buildStoryExportFrameTimeline(totalDurationMs, STORY_EXPORT_FPS);
    const renderStartMs = hrtimeMs();
    let peakRssBytes = process.memoryUsage().rss;
    let lastRenderedFrame = 0;

    await writeJobProgress({
      jobId: payload.jobId,
      accessToken: params.accessToken,
      status: 'processing',
      phase: 'rendering_frames',
      fps: STORY_EXPORT_FPS,
      startedAt,
      durationMs: totalDurationMs,
      frameCount,
      currentFrame: 0,
      currentTimeMs: 0,
      progress: 0,
      technicalMetadata: {
        width: payload.width,
        height: payload.height,
        cacheKey: payload.cacheKey,
        initializationTimeMs,
        frameFormat: 'jpeg',
        frameQuality: STORY_FRAME_JPEG_QUALITY
      },
      persistRemote: !params.mockMode
    });

    for (let frameIndex = 0; frameIndex < frameCount; frameIndex += 1) {
      const timeMs = frameTimes[frameIndex];
      await page.evaluate(async (nextTimeMs) => {
        const api = window.__SPHERE_STORY_RENDER__;
        if (!api) {
          throw new Error('Story render API is not available.');
        }
        await api.renderFrame(nextTimeMs);
      }, timeMs);
      peakRssBytes = Math.max(peakRssBytes, process.memoryUsage().rss);

      const framePath = path.join(getFramesDir(payload.jobId), `frame-${String(frameIndex + 1).padStart(4, '0')}.jpg`);
      await page.screenshot({ path: framePath, type: 'jpeg', quality: STORY_FRAME_JPEG_QUALITY, fullPage: false });
      lastRenderedFrame = frameIndex + 1;

      if (shouldPersistStoryExportHeartbeat(frameIndex, frameCount)) {
        await writeJobProgress({
          jobId: payload.jobId,
          accessToken: params.accessToken,
          status: 'processing',
          phase: 'rendering_frames',
          fps: STORY_EXPORT_FPS,
          startedAt,
          durationMs: totalDurationMs,
          frameCount,
          currentFrame: lastRenderedFrame,
          currentTimeMs: timeMs,
          progress: getStoryExportProgress(lastRenderedFrame, frameCount),
          technicalMetadata: {
            width: payload.width,
            height: payload.height,
            cacheKey: payload.cacheKey,
            initializationTimeMs,
            frameFormat: 'jpeg',
            frameQuality: STORY_FRAME_JPEG_QUALITY
          },
          persistRemote: !params.mockMode
        });
      }
    }

    const frameRenderTimeMs = Math.round(hrtimeMs() - renderStartMs);

    await writeJobProgress({
      jobId: payload.jobId,
      accessToken: params.accessToken,
      status: 'processing',
      phase: 'encoding',
      fps: STORY_EXPORT_FPS,
      startedAt,
      durationMs: totalDurationMs,
      frameCount,
      currentFrame: frameCount,
      currentTimeMs: totalDurationMs,
      progress: 1,
      frameRenderTimeMs,
      technicalMetadata: {
        width: payload.width,
        height: payload.height,
        peakRssBytes,
        cacheKey: payload.cacheKey,
        initializationTimeMs,
        frameFormat: 'jpeg',
        frameQuality: STORY_FRAME_JPEG_QUALITY
      },
      persistRemote: !params.mockMode
    });

    const { encodingTimeMs, stderrText } = await encodeMp4(payload.jobId);
    const outputSizeBytes = await getStoryExportFileSize(payload.jobId);
    if (!outputSizeBytes || outputSizeBytes <= 0) {
      throw new Error('Encoded MP4 file is missing or empty.');
    }
    const completedAt = new Date().toISOString();
    const fileName = `${sanitizeFileName(payload.story.title || 'sphere-story')}-${payload.orientation}.mp4`;

    const cleanupStartedMs = hrtimeMs();
    await fs.rm(getFramesDir(payload.jobId), { recursive: true, force: true });
    const frameCleanupTimeMs = Math.round(hrtimeMs() - cleanupStartedMs);
    const metadata = {
      width: payload.width,
      height: payload.height,
      peakRssBytes,
      stderrText,
      cacheKey: payload.cacheKey,
      initializationTimeMs,
      frameFormat: 'jpeg',
      frameQuality: STORY_FRAME_JPEG_QUALITY,
      artifactStorage: 'local-filesystem',
      artifactPersistenceTimeMs: 0,
      uploadTimeMs: 0,
      frameCleanupTimeMs,
      totalPipelineTimeMs: Math.round(hrtimeMs() - pipelineStartedMs)
    };

    await writeJobProgress({
      jobId: payload.jobId,
      accessToken: params.accessToken,
      status: 'completed',
      phase: 'completed',
      fps: STORY_EXPORT_FPS,
      startedAt,
      completedAt,
      fileName,
      outputPath: getMp4Path(payload.jobId),
      outputSizeBytes,
      durationMs: totalDurationMs,
      frameCount,
      currentFrame: frameCount,
      currentTimeMs: totalDurationMs,
      progress: 1,
      renderTimeMs: frameRenderTimeMs + encodingTimeMs,
      frameRenderTimeMs,
      encodingTimeMs,
      technicalMetadata: metadata,
      persistRemote: !params.mockMode
    });
  } catch (error) {
    const message = error instanceof Error ? error.message : 'Story export failed.';
    const completedAt = new Date().toISOString();
    await writeJobProgress({
      jobId: params.jobId,
      accessToken: params.accessToken,
      status: 'failed',
      phase: 'failed',
      fps: STORY_EXPORT_FPS,
      startedAt,
      completedAt,
      error: message,
      persistRemote: !params.mockMode
    });

    appLogger.error('story', 'STORY_EXPORT_JOB_FAILED', 'Story export job failed.', {
      error,
      meta: { jobId: params.jobId }
    });
  } finally {
    await page?.close().catch(() => undefined);
    await context?.close().catch(() => undefined);
  }
}

function getStoryDurationForMock(story: StoryDefinition) {
  return Math.max(1000, getStoryTotalDuration(story));
}

function sanitizeFileName(value: string) {
  return value
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/^-+|-+$/g, '')
    .slice(0, 48) || 'story';
}

async function encodeMp4(jobId: string) {
  const inputPattern = path.join(getFramesDir(jobId), 'frame-%04d.jpg');
  const mp4Path = getMp4Path(jobId);
  const startedAt = hrtimeMs();
  let stderrText = '';

  await new Promise<void>((resolve, reject) => {
    const ffmpeg = spawn('ffmpeg', [
      '-y',
      '-framerate', String(STORY_EXPORT_FPS),
      '-i', inputPattern,
      '-c:v', 'libx264',
      '-preset', 'fast',
      '-crf', '18',
      '-pix_fmt', 'yuv420p',
      '-movflags', '+faststart',
      mp4Path
    ], { stdio: ['ignore', 'ignore', 'pipe'] });

    ffmpeg.stderr.on('data', (chunk) => {
      stderrText += chunk.toString();
    });

    ffmpeg.on('exit', (code) => {
      if (code === 0) {
        resolve();
      } else {
        reject(new Error(`ffmpeg exited with code ${code}: ${stderrText.trim() || 'unknown error'}`));
      }
    });
  });

  return {
    encodingTimeMs: Math.round(hrtimeMs() - startedAt),
    stderrText: stderrText.trim() || null
  };
}
