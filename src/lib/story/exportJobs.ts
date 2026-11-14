import { appLogger } from '@/lib/logger';
import { supabase } from '@/lib/supabase';
import type { StoryExportJob, StoryOrientation } from './types';

interface StoryExportJobRow {
  id: string;
  story_id: string;
  user_id: string;
  status: StoryExportJob['status'];
  phase: StoryExportJob['phase'];
  orientation: StoryOrientation;
  render_token: string;
  file_name?: string | null;
  output_path?: string | null;
  output_size_bytes?: number | null;
  duration_ms?: number | null;
  frame_count?: number | null;
  current_frame?: number | null;
  current_time_ms?: number | null;
  progress?: number | null;
  fps: number;
  render_time_ms?: number | null;
  frame_render_time_ms?: number | null;
  encoding_time_ms?: number | null;
  error?: string | null;
  technical_metadata: Record<string, unknown>;
  created_at?: string;
  started_at?: string | null;
  completed_at?: string | null;
  heartbeat_at?: string | null;
  updated_at?: string;
}

function fromRow(row: StoryExportJobRow): StoryExportJob {
  return {
    id: row.id,
    storyId: row.story_id,
    userId: row.user_id,
    status: row.status,
    phase: row.phase,
    orientation: row.orientation,
    renderToken: row.render_token,
    fileName: row.file_name,
    outputPath: row.output_path,
    outputSizeBytes: row.output_size_bytes,
    durationMs: row.duration_ms,
    frameCount: row.frame_count,
    currentFrame: row.current_frame,
    currentTimeMs: row.current_time_ms,
    progress: row.progress,
    fps: row.fps,
    renderTimeMs: row.render_time_ms,
    frameRenderTimeMs: row.frame_render_time_ms,
    encodingTimeMs: row.encoding_time_ms,
    error: row.error,
    technicalMetadata: row.technical_metadata || {},
    createdAt: row.created_at,
    startedAt: row.started_at,
    completedAt: row.completed_at,
    heartbeatAt: row.heartbeat_at,
    updatedAt: row.updated_at
  };
}

export async function createStoryExportJob(params: {
  storyId: string;
  userId: string;
  orientation: StoryOrientation;
  cacheKey: string;
  forceNew?: boolean;
}) {
  if (!params.forceNew) {
    const { data: cachedData, error: cachedError } = await supabase
      .from('story_export_jobs')
      .select('*')
      .eq('story_id', params.storyId)
      .eq('orientation', params.orientation)
      .eq('status', 'completed')
      .contains('technical_metadata', { cacheKey: params.cacheKey })
      .order('completed_at', { ascending: false })
      .limit(1);

    if (cachedError) {
      appLogger.warn('story', 'FETCH_CACHED_STORY_EXPORT_JOB_FAILED', 'Failed to check reusable Story exports.', {
        error: cachedError,
        meta: { storyId: params.storyId, orientation: params.orientation }
      });
    }

    if (cachedData?.[0]) {
      return {
        job: fromRow(cachedData[0] as StoryExportJobRow),
        isNew: false,
        cacheHit: true
      };
    }
  }

  const { data: existingData, error: existingError } = await supabase
    .from('story_export_jobs')
    .select('*')
    .eq('story_id', params.storyId)
    .eq('orientation', params.orientation)
    .in('status', ['queued', 'processing'])
    .contains('technical_metadata', { cacheKey: params.cacheKey })
    .order('created_at', { ascending: false })
    .limit(1);

  if (existingError) {
    appLogger.warn('story', 'FETCH_ACTIVE_STORY_EXPORT_JOB_FAILED', 'Failed to check active story export jobs before creating a new one.', {
      error: existingError,
      meta: { storyId: params.storyId, orientation: params.orientation }
    });
  }

  if (existingData?.[0]) {
    return {
      job: fromRow(existingData[0] as StoryExportJobRow),
      isNew: false,
      cacheHit: false
    };
  }

  const payload = {
    story_id: params.storyId,
    user_id: params.userId,
    status: 'queued',
    phase: 'queued',
    orientation: params.orientation,
    render_token: crypto.randomUUID().replace(/-/g, ''),
    fps: 24,
    progress: 0,
    technical_metadata: { cacheKey: params.cacheKey },
    created_at: new Date().toISOString(),
    updated_at: new Date().toISOString()
  };

  const { data, error } = await supabase
    .from('story_export_jobs')
    .insert([payload])
    .select('*')
    .single();

  if (error) {
    if (error.code === '23505') {
      const { data: concurrentData, error: concurrentError } = await supabase
        .from('story_export_jobs')
        .select('*')
        .eq('story_id', params.storyId)
        .eq('orientation', params.orientation)
        .in('status', ['queued', 'processing'])
        .contains('technical_metadata', { cacheKey: params.cacheKey })
        .order('created_at', { ascending: false })
        .limit(1);

      if (!concurrentError && concurrentData?.[0]) {
        return {
          job: fromRow(concurrentData[0] as StoryExportJobRow),
          isNew: false,
          cacheHit: false
        };
      }
    }
    appLogger.error('story', 'CREATE_STORY_EXPORT_JOB_FAILED', 'Failed to create story export job.', { error, meta: { storyId: params.storyId } });
    throw error;
  }

  return {
    job: fromRow(data as StoryExportJobRow),
    isNew: true,
    cacheHit: false
  };
}

export async function getStoryExportJobs(storyId: string) {
  const { data, error } = await supabase
    .from('story_export_jobs')
    .select('*')
    .eq('story_id', storyId)
    .order('created_at', { ascending: false });

  if (error) {
    appLogger.warn('story', 'FETCH_STORY_EXPORT_JOBS_FAILED', 'Failed to fetch story export jobs.', { error, meta: { storyId } });
    return [];
  }

  return ((data || []) as StoryExportJobRow[]).map(fromRow);
}
