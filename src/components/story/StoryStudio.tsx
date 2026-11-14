'use client';

import React from 'react';
import {
  ArrowLeft,
  CheckCircle2,
  ChevronLeft,
  ChevronRight,
  Clapperboard,
  Copy,
  ExternalLink,
  GripHorizontal,
  Loader2,
  Pause,
  Play,
  Sparkles,
  Trash2,
  Upload
} from 'lucide-react';
import StoryFrameView from './StoryFrameView';
import StoryStage from './StoryStage';
import { supabase } from '@/lib/supabase';
import { appLogger, getErrorMessage } from '@/lib/logger';
import { createAutomaticStoryDraft, moveStoryScene, removeStoryScene, updateStorySceneCopy } from '@/lib/story/createDraft';
import { STORY_MOTION_PRESETS, STORY_PACING_TARGET_MS } from '@/lib/story/motion';
import { buildStoryPlaybackTimeline, createPlaybackControllerState, getStoryTotalDuration, reducePlaybackController } from '@/lib/story/playback';
import { materializeStory, recomposeMaterializedStory } from '@/lib/story/materialize';
import { createStoryExportJob, getStoryExportJobs } from '@/lib/story/exportJobs';
import { createStoryExportCacheKey } from '@/lib/story/exportCache';
import { STORY_EXPORT_FPS, STORY_EXPORT_VIEWPORTS } from '@/lib/story/exportProgress';
import { getPublicStoryUrl, getPublishedStorySnapshotByStoryId, publishStorySnapshot, revokePublishedStorySnapshot } from '@/lib/story/publishing';
import { deleteStory, saveStory, type SavedStoryRecord } from '@/lib/story/persistence';
import type { DatasetRow } from '@/lib/analytics/types';
import type { DatasetColumnMeta, ReportPresentation, Widget } from '@/lib/widgets/types';
import type {
  MaterializedStory,
  MotionPresetId,
  StoryDefinition,
  StoryExportJob,
  StoryOrientation,
  StoryPacingPresetId
} from '@/lib/story/types';
import type { PresentationTemplateId } from '@/lib/visualSystem';
import { QUICK_RESULT_TEMPLATES } from '@/lib/quickResult/templates';
import { useTranslation } from '@/lib/i18n/LanguageContext';

interface StoryStudioProps {
  dataset: {
    id?: string;
    name: string;
    columns: DatasetColumnMeta[];
    preview?: DatasetRow[];
  };
  widgets?: Widget[];
  presentation?: ReportPresentation | null;
  userId: string;
  sourceReportId?: string | null;
  initialStory?: StoryDefinition | null;
  onBack: () => void;
  onStorySaved?: (story: SavedStoryRecord) => void;
  onStoryDeleted?: (storyId: string) => void;
}

const STORY_ORIENTATIONS: Array<{ id: StoryOrientation; label: string; description: string; width: number; height: number }> = [
  { id: 'landscape', label: '16:9', description: 'Landscape', width: 1120, height: 630 },
  { id: 'portrait', label: '9:16', description: 'Portrait', width: 540, height: 960 }
];

function getOrientationViewport(orientation: StoryOrientation) {
  return STORY_ORIENTATIONS.find((item) => item.id === orientation) || STORY_ORIENTATIONS[0];
}

function getSceneKindLabel(kind: StoryDefinition['scenes'][number]['kind']) {
  switch (kind) {
    case 'intro':
      return 'Intro';
    case 'kpi':
      return 'KPI';
    case 'evolution':
      return 'Evolution';
    case 'ranking':
      return 'Ranking';
    case 'race':
      return 'Race';
    case 'composition':
      return 'Composition';
    case 'outro':
      return 'Outro';
    default:
      return kind;
  }
}

function isE2EMockMode() {
  if (typeof window === 'undefined') return false;
  return window.localStorage.getItem('sphere_e2e_mock') === '1';
}

async function getCurrentAccessToken() {
  const { data: { session } } = await supabase.auth.getSession();
  return session?.access_token || '';
}

function cloneMaterializedForOrientation(materializedStory: MaterializedStory, orientation: StoryOrientation) {
  return {
    ...materializedStory,
    orientation
  };
}

function getScenePreviewTime(startMs: number, enterMs: number, incomingOverlapMs = 0) {
  return startMs + incomingOverlapMs + Math.max(120, Math.min(260, Math.round(enterMs * 0.55)));
}

function getExportJobSummary(job: StoryExportJob) {
  if (job.status === 'failed') {
    return `Export failed · ${job.error || 'No pudimos generar el video.'}`;
  }

  if (job.status === 'completed') {
    return `Ready · ${job.frameCount || 0} frames · ${(((job.outputSizeBytes || 0) / 1024) / 1024).toFixed(1)} MB`;
  }

  if (job.phase === 'rendering_frames') {
    const progress = Math.round((job.progress || 0) * 100);
    return `Rendering video — ${progress}%${job.currentFrame && job.frameCount ? ` · ${job.currentFrame}/${job.frameCount} frames` : ''}`;
  }

  if (job.phase === 'encoding') {
    return 'Encoding video...';
  }

  if (job.phase === 'preparing') {
    return 'Preparing...';
  }

  return 'Preparing...';
}

export default function StoryStudio({
  dataset,
  widgets = [],
  presentation = null,
  userId,
  sourceReportId = null,
  initialStory = null,
  onBack,
  onStorySaved,
  onStoryDeleted
}: StoryStudioProps) {
  const { language } = useTranslation();
  const timeZone = React.useMemo(() => Intl.DateTimeFormat().resolvedOptions().timeZone || 'UTC', []);
  const [story, setStory] = React.useState<StoryDefinition | null>(initialStory);
  const [materializedStory, setMaterializedStory] = React.useState<MaterializedStory | null>(null);
  const [selectedSceneId, setSelectedSceneId] = React.useState<string | null>(initialStory?.scenes[0]?.id || null);
  const [isLoading, setIsLoading] = React.useState(true);
  const [error, setError] = React.useState<string | null>(null);
  const [controller, dispatch] = React.useReducer(reducePlaybackController, undefined, createPlaybackControllerState);
  const [isSaving, setIsSaving] = React.useState(false);
  const [saveMessage, setSaveMessage] = React.useState<string | null>(null);
  const [isDirty, setIsDirty] = React.useState(false);
  const [publishedSlug, setPublishedSlug] = React.useState<string | null>(null);
  const [publishMessage, setPublishMessage] = React.useState<string | null>(null);
  const [exportJobs, setExportJobs] = React.useState<StoryExportJob[]>([]);
  const [isExporting, setIsExporting] = React.useState(false);
  const [isPublishing, setIsPublishing] = React.useState(false);
  const [downloadingJobId, setDownloadingJobId] = React.useState<string | null>(null);

  const loadPublicationAndJobs = React.useCallback(async (storyId: string) => {
    const [publication, jobs] = await Promise.all([
      getPublishedStorySnapshotByStoryId(storyId),
      getStoryExportJobs(storyId)
    ]);

    setPublishedSlug(publication?.slug || null);
    setExportJobs(jobs);
  }, []);

  React.useEffect(() => {
    let cancelled = false;

    async function load() {
      if (!dataset.id) {
        setError('Dataset no disponible para Story.');
        setIsLoading(false);
        return;
      }

      try {
        setIsLoading(true);
        setError(null);

        if (initialStory) {
          const localizedStory = {
            ...initialStory,
            locale: initialStory.locale || language,
            timeZone: initialStory.timeZone || timeZone
          };
          const materialized = await materializeStory(localizedStory, {
            columnsMeta: dataset.columns,
            previewRows: dataset.preview
          });

          if (cancelled) return;
          setStory(localizedStory);
          setMaterializedStory(materialized);
          setSelectedSceneId(localizedStory.scenes[0]?.id || null);
          if (initialStory.id) {
            void loadPublicationAndJobs(initialStory.id);
          }
          setSaveMessage('Story cargada.');
        } else {
          const draft = await createAutomaticStoryDraft({
            dataset: {
              id: dataset.id,
              name: dataset.name,
              columns: dataset.columns,
              preview: dataset.preview
            },
            widgets,
            presentation: presentation || {
              title: dataset.name,
              subtitle: '',
              templateId: 'modern',
              source: 'quick-result'
            },
            userId,
            sourceReportId,
            locale: language,
            timeZone
          });

          if (cancelled) return;

          const saved = await saveStory(draft.story);
          if (cancelled) return;

          setStory(saved.storyDefinition);
          setMaterializedStory(draft.materializedStory);
          setSelectedSceneId(saved.storyDefinition.scenes[0]?.id || null);
          setSaveMessage('Story guardada automáticamente.');
          onStorySaved?.(saved);
          void loadPublicationAndJobs(saved.id);
        }
      } catch (err) {
        appLogger.error('story', 'LOAD_STORY_STUDIO_FAILED', 'Failed to load Story Studio.', {
          error: err,
          meta: { datasetId: dataset.id, initialStoryId: initialStory?.id }
        });
        if (!cancelled) {
          setError(getErrorMessage(err, 'No se pudo preparar la Story.'));
        }
      } finally {
        if (!cancelled) {
          setIsLoading(false);
        }
      }
    }

    load();
    return () => {
      cancelled = true;
    };
  }, [
    dataset.columns,
    dataset.id,
    dataset.name,
    dataset.preview,
    initialStory,
    language,
    loadPublicationAndJobs,
    onStorySaved,
    presentation,
    sourceReportId,
    timeZone,
    userId,
    widgets
  ]);

  const totalDurationMs = React.useMemo(() => (story ? getStoryTotalDuration(story) : 0), [story]);

  React.useEffect(() => {
    if (!story) return undefined;

    let frameId = 0;
    const tick = (now: number) => {
      dispatch({ type: 'tick', nowMs: now, totalDurationMs });
      frameId = window.requestAnimationFrame(tick);
    };

    frameId = window.requestAnimationFrame(tick);
    return () => window.cancelAnimationFrame(frameId);
  }, [story, totalDurationMs]);

  React.useEffect(() => {
    if (!story || !story.id || !isDirty) return undefined;

    const timer = window.setTimeout(async () => {
      try {
        setIsSaving(true);
        const saved = await saveStory(story);
        setStory(saved.storyDefinition);
        setSaveMessage('Todos los cambios guardados.');
        setIsDirty(false);
        onStorySaved?.(saved);
      } catch (err) {
        setSaveMessage('No pudimos guardar los cambios.');
        appLogger.error('story', 'AUTOSAVE_STORY_FAILED', 'Failed to autosave story.', {
          error: err,
          meta: { storyId: story.id }
        });
      } finally {
        setIsSaving(false);
      }
    }, 900);

    return () => window.clearTimeout(timer);
  }, [isDirty, onStorySaved, story]);

  React.useEffect(() => {
    const activeJob = exportJobs.find((job) => job.status === 'queued' || job.status === 'processing');
    if (!activeJob) return undefined;

    let cancelled = false;
    const timer = window.setInterval(async () => {
      try {
        const accessToken = await getCurrentAccessToken();
        const response = await fetch(`/api/story-exports/${activeJob.id}`, {
          headers: {
            ...(accessToken ? { Authorization: `Bearer ${accessToken}` } : {}),
            ...(isE2EMockMode() ? { 'x-sphere-e2e-mock': '1' } : {})
          }
        });

        if (!response.ok) return;
        const payload = await response.json();
        if (cancelled) return;

        setExportJobs((current) => current.map((job) => job.id === activeJob.id ? {
          ...job,
          status: payload.status,
          phase: payload.phase || job.phase,
          fileName: payload.file_name || payload.fileName || null,
          outputPath: payload.output_path || payload.outputPath || null,
          outputSizeBytes: payload.output_size_bytes || payload.outputSizeBytes || null,
          durationMs: payload.duration_ms || payload.durationMs || null,
          frameCount: payload.frame_count || payload.frameCount || null,
          currentFrame: payload.current_frame || payload.currentFrame || null,
          currentTimeMs: payload.current_time_ms || payload.currentTimeMs || null,
          progress: typeof payload.progress === 'number' ? payload.progress : job.progress,
          fps: payload.fps || job.fps,
          renderTimeMs: payload.render_time_ms || payload.renderTimeMs || null,
          frameRenderTimeMs: payload.frame_render_time_ms || payload.frameRenderTimeMs || null,
          encodingTimeMs: payload.encoding_time_ms || payload.encodingTimeMs || null,
          error: payload.error || null,
          completedAt: payload.completed_at || payload.completedAt || null,
          startedAt: payload.started_at || payload.startedAt || null,
          heartbeatAt: payload.heartbeat_at || payload.heartbeatAt || null,
          technicalMetadata: payload.technical_metadata || payload.technicalMetadata || {}
        } : job));
      } catch (err) {
        appLogger.warn('story', 'POLL_STORY_EXPORT_JOB_FAILED', 'Failed to poll story export job.', {
          error: err,
          meta: { jobId: activeJob.id }
        });
      }
    }, 1000);

    return () => {
      cancelled = true;
      window.clearInterval(timer);
    };
  }, [exportJobs]);

  const currentTimeMs = Math.max(0, Math.min(controller.currentTimeMs, totalDurationMs));
  const timeline = React.useMemo(() => (story ? buildStoryPlaybackTimeline(story) : []), [story]);
  const activeSceneId = timeline.filter((item) => item.startMs <= currentTimeMs).at(-1)?.sceneId || null;
  const currentScene = story?.scenes.find((scene) => scene.id === (selectedSceneId || activeSceneId || story.scenes[0]?.id));

  React.useEffect(() => {
    if (!selectedSceneId && activeSceneId) {
      setSelectedSceneId(activeSceneId);
    }
  }, [activeSceneId, selectedSceneId]);

  const orientationViewport = getOrientationViewport(story?.orientation || 'landscape');

  const applyStory = React.useCallback((updater: (current: StoryDefinition) => StoryDefinition) => {
    setStory((currentStory) => {
      if (!currentStory) return currentStory;
      const nextStory = updater(currentStory);
      setMaterializedStory((currentMaterialized) => {
        if (!currentMaterialized) return currentMaterialized;
        return recomposeMaterializedStory(nextStory, currentMaterialized);
      });
      setIsDirty(true);
      setSaveMessage('Tienes cambios pendientes...');
      return nextStory;
    });
  }, []);

  const goToScene = React.useCallback((sceneId: string) => {
    setSelectedSceneId(sceneId);
    const entry = timeline.find((item) => item.sceneId === sceneId);
    if (entry) {
      const previousEntry = timeline[Math.max(0, entry.sceneIndex - 1)];
      dispatch({
        type: 'seek',
        timeMs: getScenePreviewTime(entry.startMs, entry.timing.enterMs, entry.sceneIndex > 0 ? previousEntry?.timing.overlapMs || 0 : 0)
      });
    }
  }, [timeline]);

  const handlePrevious = React.useCallback(() => {
    if (!story) return;
    const currentIndex = Math.max(0, story.scenes.findIndex((scene) => scene.id === (activeSceneId || story.scenes[0]?.id)));
    const previousIndex = Math.max(0, currentIndex - 1);
    const target = timeline[previousIndex];
    if (target) {
      setSelectedSceneId(target.sceneId);
      const previousEntry = timeline[Math.max(0, target.sceneIndex - 1)];
      dispatch({
        type: 'seek',
        timeMs: getScenePreviewTime(target.startMs, target.timing.enterMs, target.sceneIndex > 0 ? previousEntry?.timing.overlapMs || 0 : 0)
      });
    }
  }, [activeSceneId, story, timeline]);

  const handleNext = React.useCallback(() => {
    if (!story) return;
    const currentIndex = Math.max(0, story.scenes.findIndex((scene) => scene.id === (activeSceneId || story.scenes[0]?.id)));
    const nextIndex = Math.min(timeline.length - 1, currentIndex + 1);
    const target = timeline[nextIndex];
    if (target) {
      setSelectedSceneId(target.sceneId);
      const previousEntry = timeline[Math.max(0, target.sceneIndex - 1)];
      dispatch({
        type: 'seek',
        timeMs: getScenePreviewTime(target.startMs, target.timing.enterMs, target.sceneIndex > 0 ? previousEntry?.timing.overlapMs || 0 : 0)
      });
    }
  }, [activeSceneId, story, timeline]);

  const handlePlayPause = React.useCallback(() => {
    if (controller.isPlaying) {
      dispatch({ type: 'pause' });
    } else {
      dispatch({ type: 'play', nowMs: performance.now() });
    }
  }, [controller.isPlaying]);

  const handlePublish = React.useCallback(async () => {
    if (!story || !materializedStory) return;

    try {
      setIsPublishing(true);
      const snapshot = await publishStorySnapshot({
        story,
        columnsMeta: dataset.columns,
        materializedStory,
        existingSlug: publishedSlug
      });
      setPublishedSlug(snapshot.slug);
      setPublishMessage(publishedSlug ? 'Story republicada.' : 'Story publicada.');
    } catch (err) {
      setPublishMessage('No se pudo publicar esta Story.');
      appLogger.error('story', 'PUBLISH_STORY_FAILED', 'Failed to publish story from Story Studio.', {
        error: err,
        meta: { storyId: story.id }
      });
    } finally {
      setIsPublishing(false);
    }
  }, [dataset.columns, materializedStory, publishedSlug, story]);

  const handleUnpublish = React.useCallback(async () => {
    if (!publishedSlug) return;

    try {
      await revokePublishedStorySnapshot(publishedSlug);
      setPublishedSlug(null);
      setPublishMessage('Publicación revocada.');
    } catch (err) {
      setPublishMessage('No se pudo revocar la publicación.');
      appLogger.error('story', 'UNPUBLISH_STORY_FAILED', 'Failed to revoke public Story.', {
        error: err,
        meta: { slug: publishedSlug }
      });
    }
  }, [publishedSlug]);

  const handleExport = React.useCallback(async (orientation: StoryOrientation, forceNew = false) => {
    if (!story?.id || !materializedStory) return;

    try {
      setIsExporting(true);
      const exportStory = { ...story, orientation };
      const exportMaterialized = cloneMaterializedForOrientation(materializedStory, orientation);
      const viewport = STORY_EXPORT_VIEWPORTS[orientation];
      const cacheKey = await createStoryExportCacheKey({
        story: exportStory,
        materializedStory: exportMaterialized,
        orientation,
        width: viewport.width,
        height: viewport.height,
        fps: STORY_EXPORT_FPS
      });
      const created = await createStoryExportJob({
        storyId: story.id,
        userId,
        orientation,
        cacheKey,
        forceNew
      });

      setExportJobs((current) => [created.job, ...current.filter((job) => job.id !== created.job.id)]);
      if (!created.isNew) {
        if (created.cacheHit) setSaveMessage('Video existente listo para descargar.');
        return;
      }
      const accessToken = await getCurrentAccessToken();

      await fetch('/api/story-exports/start', {
        method: 'POST',
        headers: {
          'content-type': 'application/json'
        },
        body: JSON.stringify({
          jobId: created.job.id,
          renderToken: created.job.renderToken,
          story: exportStory,
          materializedStory: exportMaterialized,
          orientation,
          cacheKey,
          accessToken,
          mockMode: isE2EMockMode()
        })
      });
    } catch (err) {
      appLogger.error('story', 'EXPORT_STORY_VIDEO_FAILED', 'Failed to queue story export job.', {
        error: err,
        meta: { storyId: story?.id, orientation }
      });
    } finally {
      setIsExporting(false);
    }
  }, [materializedStory, story, userId]);

  const handleDeleteCurrentStory = React.useCallback(async () => {
    if (!story?.id) return;
    if (!window.confirm('¿Eliminar esta Story guardada?')) return;

    try {
      await deleteStory(story.id, userId);
      onStoryDeleted?.(story.id);
      onBack();
    } catch (err) {
      setSaveMessage('No pudimos eliminar esta Story.');
      appLogger.error('story', 'DELETE_CURRENT_STORY_FAILED', 'Failed to delete current story from Story Studio.', {
        error: err,
        meta: { storyId: story.id }
      });
    }
  }, [onBack, onStoryDeleted, story, userId]);

  const downloadExport = React.useCallback(async (jobId: string) => {
    const startedAt = performance.now();
    setDownloadingJobId(jobId);
    try {
      const accessToken = await getCurrentAccessToken();
      const response = await fetch(`/api/story-exports/${jobId}/download`, {
        headers: {
          ...(accessToken ? { Authorization: `Bearer ${accessToken}` } : {}),
          ...(isE2EMockMode() ? { 'x-sphere-e2e-mock': '1' } : {})
        }
      });

      if (!response.ok) {
        setSaveMessage('El archivo exportado ya no está disponible. Usa Retry para generarlo nuevamente.');
        setExportJobs((current) => current.map((job) => job.id === jobId ? { ...job, status: 'failed', phase: 'failed', error: 'Export artifact unavailable.' } : job));
        return;
      }
      const blob = await response.blob();
      const url = URL.createObjectURL(blob);
      const anchor = document.createElement('a');
      anchor.href = url;
      anchor.download = exportJobs.find((job) => job.id === jobId)?.fileName || 'sphere-story.mp4';
      anchor.click();
      URL.revokeObjectURL(url);
      appLogger.info('story', 'STORY_EXPORT_DOWNLOAD_COMPLETED', 'Story export downloaded.', {
        meta: { jobId, downloadTimeMs: Math.round(performance.now() - startedAt), sizeBytes: blob.size }
      });
    } finally {
      setDownloadingJobId(null);
    }
  }, [exportJobs]);

  if (isLoading) {
    return (
      <div style={{ minHeight: '100%', display: 'grid', placeItems: 'center', padding: 32 }}>
        <div style={{ display: 'grid', gap: 12, justifyItems: 'center', color: 'var(--text-muted)' }}>
          <Loader2 size={28} className="animate-spin" />
          <strong style={{ color: 'var(--text-primary)', fontSize: '1.05rem' }}>
            {initialStory ? 'Abriendo Story…' : 'Creando Story automáticamente…'}
          </strong>
          <span>{initialStory ? 'Estamos recuperando tu historia visual.' : 'Estamos organizando una narrativa visual con tu dataset.'}</span>
        </div>
      </div>
    );
  }

  if (error || !story || !materializedStory) {
    return (
      <div style={{ minHeight: '100%', display: 'grid', placeItems: 'center', padding: 32 }}>
        <div style={{ maxWidth: 480, display: 'grid', gap: 14, justifyItems: 'center', textAlign: 'center' }}>
          <Clapperboard size={28} />
          <strong style={{ fontSize: '1.1rem' }}>No pudimos preparar esta Story.</strong>
          <span style={{ color: 'var(--text-muted)' }}>{error || 'Intenta volver y generar nuevamente.'}</span>
          <button type="button" className="story-chip active" onClick={onBack}>
            <ArrowLeft size={14} />
            Volver
          </button>
        </div>
        <style jsx>{baseStyles}</style>
      </div>
    );
  }

  const activeSceneIndex = Math.max(0, story.scenes.findIndex((scene) => scene.id === (activeSceneId || story.scenes[0]?.id)));

  return (
    <div className="story-page">
      <div className="story-shell">
        <header className="story-header">
          <div className="story-header-copy">
            <button type="button" className="ghost-action" onClick={onBack}>
              <ArrowLeft size={16} />
              Quick Result
            </button>
            <div className="story-eyebrow">
              <Sparkles size={14} />
              Story Mode
            </div>
            <h1>{story.title}</h1>
            <p>{story.subtitle}</p>
          </div>

          <div className="story-header-actions">
            <div className="story-chip-group">
              {QUICK_RESULT_TEMPLATES.map((template) => (
                <button
                  key={template.id}
                  type="button"
                  className={`story-chip ${story.templateId === template.id ? 'active' : ''}`}
                  onClick={() => applyStory((current) => ({ ...current, templateId: template.id as PresentationTemplateId }))}
                >
                  {template.name}
                </button>
              ))}
            </div>

            <div className="story-chip-group">
              {STORY_MOTION_PRESETS.map((preset) => (
                <button
                  key={preset.id}
                  type="button"
                  className={`story-chip ${story.motionPresetId === preset.id ? 'active' : ''}`}
                  onClick={() => applyStory((current) => ({ ...current, motionPresetId: preset.id as MotionPresetId }))}
                >
                  {preset.name}
                </button>
              ))}
            </div>

            <div className="story-chip-group">
              {Object.entries(STORY_PACING_TARGET_MS).map(([pacingId]) => (
                <button
                  key={pacingId}
                  type="button"
                  className={`story-chip ${story.pacingPresetId === pacingId ? 'active' : ''}`}
                  onClick={() => applyStory((current) => ({ ...current, pacingPresetId: pacingId as StoryPacingPresetId }))}
                >
                  {pacingId === 'short' ? 'Short' : pacingId === 'extended' ? 'Extended' : 'Standard'}
                </button>
              ))}
            </div>

            <div className="story-chip-group">
              {STORY_ORIENTATIONS.map((orientation) => (
                <button
                  key={orientation.id}
                  type="button"
                  className={`story-chip ${story.orientation === orientation.id ? 'active' : ''}`}
                  onClick={() => applyStory((current) => ({ ...current, orientation: orientation.id }))}
                >
                  {orientation.label}
                </button>
              ))}
            </div>

            <div className="story-top-actions">
              <button type="button" className="ghost-action primary" onClick={handlePublish} disabled={isPublishing}>
                <Upload size={16} />
                {isPublishing ? 'Publishing…' : publishedSlug ? 'Republish' : 'Publish'}
              </button>
              <button type="button" className="ghost-action" onClick={() => handleExport('landscape')} disabled={isExporting}>
                <Clapperboard size={16} />
                Export 16:9
              </button>
              <button type="button" className="ghost-action" onClick={() => handleExport('portrait')} disabled={isExporting}>
                <Clapperboard size={16} />
                Export 9:16
              </button>
              <button type="button" className="ghost-action danger" onClick={handleDeleteCurrentStory}>
                <Trash2 size={16} />
                Delete
              </button>
            </div>

            <div className="story-status-row">
              <span className={`status-pill ${isSaving ? 'saving' : isDirty ? 'dirty' : 'saved'}`}>
                {isSaving ? 'Saving…' : isDirty ? 'Pending changes' : 'Saved'}
              </span>
              {saveMessage ? <span className="status-note">{saveMessage}</span> : null}
              {publishMessage ? <span className="status-note">{publishMessage}</span> : null}
              {publishedSlug ? (
                <>
                  <button type="button" className="inline-link" onClick={() => navigator.clipboard.writeText(getPublicStoryUrl(publishedSlug))}>
                    <Copy size={14} />
                    Copy Public URL
                  </button>
                  <a className="inline-link" href={getPublicStoryUrl(publishedSlug)} target="_blank" rel="noreferrer">
                    <ExternalLink size={14} />
                    Open Public Story
                  </a>
                  <button type="button" className="inline-link danger" onClick={handleUnpublish}>
                    <Trash2 size={14} />
                    Unpublish
                  </button>
                </>
              ) : null}
            </div>
          </div>
        </header>

        <section className="story-stage-panel">
          <div className="story-stage-toolbar">
            <div className="story-stage-status">
              <span>{activeSceneIndex + 1} / {story.scenes.length}</span>
              <strong>{currentScene?.title || story.title}</strong>
            </div>
            <div className="story-stage-controls">
              <button
                type="button"
                className="ghost-action"
                onClick={handlePrevious}
                disabled={activeSceneIndex <= 0}
                aria-label="Previous scene"
                data-testid="story-previous-button"
              >
                <ChevronLeft size={16} />
                Previous
              </button>
              <button
                type="button"
                className="ghost-action primary"
                onClick={handlePlayPause}
                aria-label={controller.isPlaying ? 'Pause story' : 'Play story'}
                data-testid="story-play-toggle"
              >
                {controller.isPlaying ? <Pause size={16} /> : <Play size={16} />}
                {controller.isPlaying ? 'Pause' : 'Play'}
              </button>
              <button
                type="button"
                className="ghost-action"
                onClick={handleNext}
                disabled={activeSceneIndex >= story.scenes.length - 1}
                aria-label="Next scene"
                data-testid="story-next-button"
              >
                Next
                <ChevronRight size={16} />
              </button>
            </div>
          </div>

          <div
            className={`story-preview ${story.orientation}`}
            style={{
              width: '100%',
              maxWidth: story.orientation === 'portrait' ? 920 : '100%',
              margin: story.orientation === 'portrait' ? '0 auto' : undefined
            }}
          >
            <StoryStage
              width={orientationViewport.width}
              height={orientationViewport.height}
              maxHeight={story.orientation === 'portrait' ? '90vh' : '72vh'}
              align="center"
            >
              <StoryFrameView
                story={story}
                materializedStory={materializedStory}
                timeMs={currentTimeMs}
                width={orientationViewport.width}
                height={orientationViewport.height}
              />
            </StoryStage>
          </div>

          <div className="story-progress-block">
            <input
              type="range"
              min={0}
              max={Math.max(0, totalDurationMs)}
              value={currentTimeMs}
              onChange={(event) => dispatch({ type: 'seek', timeMs: Number(event.target.value) })}
            />
            <div className="story-progress-meta">
              <span>{Math.round(currentTimeMs / 100) / 10}s</span>
              <span>{Math.round(totalDurationMs / 100) / 10}s</span>
            </div>
          </div>
        </section>

        <section className="story-bottom-grid">
          <div className="story-scenes-panel">
            <div className="panel-heading">
              <div>
                <strong>Scenes</strong>
                <p>Selecciona, reordena o elimina escenas sin entrar a un editor técnico.</p>
              </div>
            </div>

            <div className="scene-list">
              {story.scenes.map((scene, index) => (
                <div
                  key={scene.id}
                  className={`scene-card ${selectedSceneId === scene.id ? 'active' : ''}`}
                  data-scene-id={scene.id}
                  data-scene-kind={scene.kind}
                  onClick={() => goToScene(scene.id)}
                >
                  <div className="scene-card-copy">
                    <span className="scene-index">{index + 1}</span>
                    <div>
                      <strong>{getSceneKindLabel(scene.kind)}</strong>
                      <p>{scene.title}</p>
                    </div>
                  </div>
                  <div className="scene-card-actions">
                    <button
                      type="button"
                      className="icon-action"
                      onClick={(event) => {
                        event.stopPropagation();
                        const nextStory = moveStoryScene(story, scene.id, -1);
                        applyStory(() => nextStory);
                        setSelectedSceneId(nextStory.scenes[Math.max(0, index - 1)]?.id || nextStory.scenes[0]?.id || null);
                      }}
                      aria-label="Mover escena arriba"
                      disabled={index === 0}
                    >
                      <ChevronLeft size={14} />
                    </button>
                    <button
                      type="button"
                      className="icon-action"
                      onClick={(event) => {
                        event.stopPropagation();
                        const nextStory = moveStoryScene(story, scene.id, 1);
                        applyStory(() => nextStory);
                        setSelectedSceneId(nextStory.scenes[Math.min(nextStory.scenes.length - 1, index + 1)]?.id || null);
                      }}
                      aria-label="Mover escena abajo"
                      disabled={index === story.scenes.length - 1}
                    >
                      <ChevronRight size={14} />
                    </button>
                    <button
                      type="button"
                      className="icon-action danger"
                      onClick={(event) => {
                        event.stopPropagation();
                        const nextStory = removeStoryScene(story, scene.id);
                        applyStory(() => nextStory);
                        setSelectedSceneId(nextStory.scenes[Math.max(0, index - 1)]?.id || nextStory.scenes[0]?.id || null);
                        dispatch({ type: 'seek', timeMs: 0 });
                      }}
                      aria-label="Eliminar escena"
                      disabled={story.scenes.length <= 1}
                    >
                      <Trash2 size={14} />
                    </button>
                  </div>
                </div>
              ))}
            </div>
          </div>

          <div className="story-settings-panel">
            <div className="panel-heading">
              <div>
                <strong>Light Edit</strong>
                <p>Copy, ritmo y estado de publicación/export de la Story actual.</p>
              </div>
              <GripHorizontal size={16} />
            </div>

            {currentScene ? (
              <div className="story-settings-form">
                <label>
                  Scene title
                  <input
                    value={currentScene.title}
                    onChange={(event) => {
                      const nextStory = updateStorySceneCopy(story, currentScene.id, { title: event.target.value });
                      applyStory(() => nextStory);
                    }}
                  />
                </label>
                <label>
                  Scene subtitle
                  <textarea
                    value={currentScene.subtitle}
                    onChange={(event) => {
                      const nextStory = updateStorySceneCopy(story, currentScene.id, { subtitle: event.target.value });
                      applyStory(() => nextStory);
                    }}
                  />
                </label>
                <label>
                  Story title
                  <input
                    value={story.title}
                    onChange={(event) => applyStory((current) => ({ ...current, title: event.target.value }))}
                  />
                </label>
                <label>
                  Story subtitle
                  <textarea
                    value={story.subtitle}
                    onChange={(event) => applyStory((current) => ({ ...current, subtitle: event.target.value }))}
                  />
                </label>
              </div>
            ) : null}

            <div className="story-exports-panel">
              <div className="panel-subheading">
                <strong>Exports</strong>
                <span>Estado de video y descarga</span>
              </div>
              {exportJobs.length === 0 ? (
                <div className="story-empty-state">Aún no has exportado esta Story.</div>
              ) : (
                <div className="story-export-list">
                  {exportJobs.map((job) => (
                    <div key={job.id} className="story-export-item">
                      <div>
                        <strong>{job.orientation === 'portrait' ? 'Vertical 9:16' : 'Landscape 16:9'}</strong>
                        <p>{getExportJobSummary(job)}</p>
                      </div>
                      {job.status === 'completed' ? (
                        <button type="button" className="ghost-action" onClick={() => downloadExport(job.id)} disabled={downloadingJobId === job.id}>
                          {downloadingJobId === job.id ? <Loader2 size={16} className="animate-spin" /> : <CheckCircle2 size={16} />}
                          {downloadingJobId === job.id ? 'Downloading…' : 'Download'}
                        </button>
                      ) : job.status === 'failed' ? (
                        <button type="button" className="ghost-action" onClick={() => handleExport(job.orientation, true)}>
                          <Clapperboard size={16} />
                          Retry
                        </button>
                      ) : null}
                    </div>
                  ))}
                </div>
              )}
            </div>
          </div>
        </section>
      </div>

      <style jsx>{baseStyles}</style>
    </div>
  );
}

const baseStyles = `
  .story-page {
    min-height: 100%;
    padding: 18px 20px 24px;
    background: var(--background);
    color: var(--text-primary);
  }
  .story-shell {
    max-width: 1480px;
    margin: 0 auto;
    display: grid;
    gap: 20px;
  }
  .story-header,
  .story-stage-panel,
  .story-scenes-panel,
  .story-settings-panel {
    border: 1px solid var(--border);
    background: var(--surface);
    border-radius: 18px;
    backdrop-filter: blur(16px) saturate(120%);
    -webkit-backdrop-filter: blur(16px) saturate(120%);
    box-shadow: var(--shadow-soft);
  }
  .story-header {
    padding: 20px 22px;
    display: grid;
    gap: 16px;
  }
  .story-header h1 {
    margin: 10px 0 6px;
    font-size: clamp(2rem, 4vw, 3.2rem);
    line-height: 0.94;
  }
  .story-header p {
    margin: 0;
    color: var(--text-muted);
    max-width: 720px;
    line-height: 1.65;
  }
  .story-eyebrow {
    display: inline-flex;
    align-items: center;
    gap: 8px;
    font-size: 0.76rem;
    letter-spacing: 0.16em;
    text-transform: uppercase;
    color: var(--primary);
    font-weight: 700;
  }
  .story-header-actions {
    display: grid;
    gap: 10px;
  }
  .story-chip-group,
  .story-top-actions {
    display: flex;
    flex-wrap: wrap;
    gap: 8px;
  }
  .story-status-row {
    display: flex;
    flex-wrap: wrap;
    gap: 12px;
    align-items: center;
  }
  .status-pill {
    display: inline-flex;
    align-items: center;
    gap: 8px;
    padding: 8px 12px;
    border-radius: 999px;
    font-size: 0.82rem;
    border: 1px solid var(--border);
  }
  .status-pill.saved {
    background: rgba(34, 197, 94, 0.12);
    color: #86efac;
  }
  .status-pill.dirty {
    background: rgba(251, 191, 36, 0.12);
    color: #fcd34d;
  }
  .status-pill.saving {
    background: rgba(125, 211, 252, 0.12);
    color: #7dd3fc;
  }
  .status-note {
    color: var(--text-muted);
    font-size: 0.88rem;
  }
  .inline-link {
    display: inline-flex;
    align-items: center;
    gap: 6px;
    border: none;
    background: transparent;
    color: var(--text-muted);
    cursor: pointer;
    text-decoration: none;
    padding: 0;
    font: inherit;
  }
  .inline-link.danger {
    color: var(--danger-text);
  }
  .story-chip,
  .ghost-action,
  .icon-action {
    border-radius: 999px;
    border: 1px solid var(--border);
    background: var(--surface-light);
    color: var(--text-primary);
    cursor: pointer;
    display: inline-flex;
    align-items: center;
    gap: 8px;
  }
  .story-chip {
    padding: 8px 12px;
    font-size: 0.88rem;
  }
  .story-chip.active,
  .ghost-action.primary {
    background: linear-gradient(180deg, var(--primary), var(--primary));
    color: var(--shell-inverse-text);
    border-color: var(--primary);
    font-weight: 700;
    box-shadow: 0 12px 24px var(--primary-glow);
  }
  .ghost-action {
    padding: 10px 14px;
    width: fit-content;
  }
  .story-stage-panel {
    padding: 16px 18px 18px;
    display: grid;
    gap: 14px;
  }
  .story-stage-toolbar {
    display: flex;
    justify-content: space-between;
    gap: 16px;
    flex-wrap: wrap;
    align-items: center;
  }
  .story-stage-status {
    display: grid;
    gap: 4px;
  }
  .story-stage-status span {
    color: var(--text-muted);
    font-size: 0.84rem;
    letter-spacing: 0.08em;
    text-transform: uppercase;
  }
  .story-stage-status strong {
    font-size: 1.12rem;
  }
  .story-stage-controls {
    display: flex;
    gap: 10px;
    flex-wrap: wrap;
  }
  .story-preview {
    display: grid;
    place-items: center;
    min-width: 0;
  }
  .story-progress-block {
    display: grid;
    gap: 8px;
  }
  .story-progress-block input {
    width: 100%;
  }
  .story-progress-meta {
    display: flex;
    justify-content: space-between;
    color: var(--text-muted);
    font-size: 0.88rem;
  }
  .story-bottom-grid {
    display: grid;
    grid-template-columns: minmax(0, 1.15fr) minmax(320px, 0.85fr);
    gap: 20px;
  }
  .story-scenes-panel,
  .story-settings-panel {
    padding: 16px;
    display: grid;
    gap: 16px;
  }
  .panel-heading,
  .panel-subheading {
    display: flex;
    align-items: center;
    justify-content: space-between;
    gap: 12px;
  }
  .panel-heading strong,
  .panel-subheading strong {
    display: block;
    font-size: 1rem;
    margin-bottom: 4px;
  }
  .panel-heading p,
  .panel-subheading span {
    margin: 0;
    color: var(--text-muted);
    font-size: 0.9rem;
  }
  .scene-list,
  .story-export-list {
    display: grid;
    gap: 10px;
  }
  .scene-card,
  .story-export-item {
    border: 1px solid var(--border);
    border-radius: 14px;
    padding: 14px;
    display: flex;
    align-items: center;
    justify-content: space-between;
    gap: 12px;
    background: var(--surface-light);
  }
  .scene-card {
    cursor: pointer;
  }
  .scene-card.active {
    border-color: rgba(173, 198, 255, 0.22);
    box-shadow: 0 14px 26px rgba(0,0,0,0.12);
  }
  .scene-card-copy {
    display: flex;
    align-items: center;
    gap: 12px;
    min-width: 0;
  }
  .scene-index {
    width: 28px;
    height: 28px;
    border-radius: 50%;
    display: grid;
    place-items: center;
    background: rgba(255,255,255,0.07);
    color: var(--text-muted);
    font-size: 0.8rem;
    flex: none;
  }
  .scene-card-copy strong {
    display: block;
    font-size: 0.88rem;
    color: var(--primary);
    text-transform: uppercase;
    letter-spacing: 0.1em;
    margin-bottom: 4px;
  }
  .scene-card-copy p,
  .story-export-item p {
    margin: 0;
    color: var(--text-muted);
  }
  .scene-card-actions {
    display: flex;
    gap: 8px;
    flex: none;
  }
  .icon-action {
    width: 34px;
    height: 34px;
    justify-content: center;
    padding: 0;
  }
  .icon-action:disabled,
  .ghost-action:disabled {
    opacity: 0.45;
    cursor: not-allowed;
  }
  .icon-action.danger {
    color: var(--danger-text);
  }
  .ghost-action.danger {
    color: var(--danger-text);
  }
  .story-settings-form {
    display: grid;
    gap: 14px;
  }
  .story-settings-form label {
    display: grid;
    gap: 8px;
    font-size: 0.92rem;
    color: var(--text-muted);
  }
  .story-settings-form input,
  .story-settings-form textarea {
    border-radius: 10px;
    border: 1px solid var(--border);
    background: var(--surface-light);
    color: var(--text-primary);
    padding: 12px 14px;
    font: inherit;
  }
  .story-settings-form textarea {
    min-height: 92px;
    resize: vertical;
  }
  .story-empty-state {
    border-radius: 12px;
    border: 1px dashed var(--border);
    padding: 16px;
    color: var(--text-muted);
    text-align: center;
  }
  @media (max-width: 1180px) {
    .story-bottom-grid {
      grid-template-columns: 1fr;
    }
  }
  @media (max-width: 720px) {
    .story-page {
      padding: 14px;
    }
    .story-header,
    .story-stage-panel,
    .story-scenes-panel,
    .story-settings-panel {
      padding: 14px;
    }
    .story-top-actions,
    .story-chip-group,
    .story-stage-controls {
      gap: 8px;
    }
    .ghost-action,
    .story-chip {
      width: 100%;
      justify-content: center;
    }
  }
`;
