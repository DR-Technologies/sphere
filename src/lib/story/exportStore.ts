import fs from 'node:fs/promises';
import path from 'node:path';
import type { MaterializedStory, StoryDefinition, StoryExportJob, StoryExportJobPhase, StoryOrientation } from './types';

interface StoryExportPayload {
  jobId: string;
  renderToken: string;
  story: StoryDefinition;
  materializedStory: MaterializedStory;
  orientation: StoryOrientation;
  width: number;
  height: number;
  fps: number;
  cacheKey?: string;
}

interface LocalJobStatus {
  jobId: string;
  status: StoryExportJob['status'];
  phase: StoryExportJobPhase;
  error?: string | null;
  fileName?: string | null;
  outputPath?: string | null;
  outputSizeBytes?: number | null;
  durationMs?: number | null;
  frameCount?: number | null;
  currentFrame?: number | null;
  currentTimeMs?: number | null;
  progress?: number | null;
  fps: number;
  renderTimeMs?: number | null;
  frameRenderTimeMs?: number | null;
  encodingTimeMs?: number | null;
  technicalMetadata?: Record<string, unknown>;
  startedAt?: string | null;
  completedAt?: string | null;
  heartbeatAt?: string | null;
  updatedAt: string;
}

const EXPORT_ROOT = path.resolve(process.cwd(), 'artifacts/story-exports');

function getJobDir(jobId: string) {
  return path.join(EXPORT_ROOT, jobId);
}

function getPayloadPath(jobId: string) {
  return path.join(getJobDir(jobId), 'payload.json');
}

function getStatusPath(jobId: string) {
  return path.join(getJobDir(jobId), 'status.json');
}

export function getFramesDir(jobId: string) {
  return path.join(getJobDir(jobId), 'frames');
}

export function getMp4Path(jobId: string) {
  return path.join(getJobDir(jobId), 'story.mp4');
}

export async function deleteExportJobFiles(jobId: string) {
  await fs.rm(getJobDir(jobId), { recursive: true, force: true });
}

export async function ensureExportRoot() {
  await fs.mkdir(EXPORT_ROOT, { recursive: true });
}

export async function prepareExportJobFiles(payload: StoryExportPayload) {
  const jobDir = getJobDir(payload.jobId);
  await fs.rm(jobDir, { recursive: true, force: true });
  await fs.mkdir(getFramesDir(payload.jobId), { recursive: true });
  await fs.writeFile(getPayloadPath(payload.jobId), JSON.stringify(payload, null, 2), 'utf8');
  await writeLocalJobStatus(payload.jobId, {
    jobId: payload.jobId,
    status: 'queued',
    phase: 'queued',
    fps: payload.fps,
    progress: 0,
    updatedAt: new Date().toISOString()
  });
}

export async function readExportPayload(jobId: string) {
  const content = await fs.readFile(getPayloadPath(jobId), 'utf8');
  return JSON.parse(content) as StoryExportPayload;
}

export async function writeLocalJobStatus(jobId: string, status: LocalJobStatus) {
  const statusPath = getStatusPath(jobId);
  const temporaryPath = `${statusPath}.${process.pid}.${crypto.randomUUID()}.tmp`;
  await fs.writeFile(temporaryPath, JSON.stringify(status, null, 2), 'utf8');
  await fs.rename(temporaryPath, statusPath);
}

export async function readLocalJobStatus(jobId: string) {
  try {
    const content = await fs.readFile(getStatusPath(jobId), 'utf8');
    return JSON.parse(content) as LocalJobStatus;
  } catch {
    return null;
  }
}

export async function readStoryExportFile(jobId: string) {
  return fs.readFile(getMp4Path(jobId));
}

export async function getStoryExportFileSize(jobId: string) {
  const stats = await fs.stat(getMp4Path(jobId));
  return stats.size;
}
