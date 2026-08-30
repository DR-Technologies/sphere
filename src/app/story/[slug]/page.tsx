'use client';

import React from 'react';
import { useParams } from 'next/navigation';
import { Loader2, Play, Pause, ChevronLeft, ChevronRight } from 'lucide-react';
import StoryFrameView from '@/components/story/StoryFrameView';
import StoryStage from '@/components/story/StoryStage';
import { getPublishedStorySnapshotBySlug } from '@/lib/story/publishing';
import { buildStoryPlaybackTimeline, createPlaybackControllerState, getStoryTotalDuration, reducePlaybackController } from '@/lib/story/playback';
import { getTemplateTokens, SPHERE_VISUAL_SYSTEM } from '@/lib/visualSystem';
import SphereLogo from '@/components/brand/SphereLogo';

const VIEWPORTS = {
  landscape: { width: 1120, height: 630, label: '16:9' },
  portrait: { width: 540, height: 960, label: '9:16' }
} as const;

function getScenePreviewTime(startMs: number, enterMs: number, incomingOverlapMs = 0) {
  return startMs + incomingOverlapMs + Math.max(120, Math.min(260, Math.round(enterMs * 0.55)));
}

export default function PublicStoryPage() {
  const { slug } = useParams<{ slug: string }>();
  const [snapshot, setSnapshot] = React.useState<Awaited<ReturnType<typeof getPublishedStorySnapshotBySlug>> | null>(null);
  const [loading, setLoading] = React.useState(true);
  const [error, setError] = React.useState<string | null>(null);
  const [controller, dispatch] = React.useReducer(reducePlaybackController, undefined, createPlaybackControllerState);

  React.useEffect(() => {
    if (!slug) return;

    getPublishedStorySnapshotBySlug(slug)
      .then((data) => {
        if (!data) {
          setError('Esta Story no existe o fue revocada.');
          setLoading(false);
          return;
        }
        setSnapshot(data);
        setLoading(false);
      })
      .catch(() => {
        setError('No se pudo cargar la Story pública.');
        setLoading(false);
      });
  }, [slug]);

  const story = snapshot?.storyDefinition || null;
  const materializedStory = snapshot?.materializedStory || null;
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

  if (loading) {
    return (
      <div style={{ minHeight: '100vh', display: 'grid', placeItems: 'center', background: '#09111d', color: '#f8fafc' }}>
        <Loader2 size={28} className="animate-spin" />
      </div>
    );
  }

  if (!snapshot || !story || !materializedStory) {
    return (
      <div style={{ minHeight: '100vh', display: 'grid', placeItems: 'center', background: '#09111d', color: '#fda4af', padding: 24, textAlign: 'center' }}>
        {error}
      </div>
    );
  }

  const currentTimeMs = Math.max(0, Math.min(controller.currentTimeMs, totalDurationMs));
  const timeline = buildStoryPlaybackTimeline(story);
  const activeSceneIndex = timeline.findIndex((entry) => entry.sceneId === timeline.filter((item) => item.startMs <= currentTimeMs).at(-1)?.sceneId);
  const template = getTemplateTokens(story.templateId);
  const viewport = VIEWPORTS[story.orientation];
  const shell = SPHERE_VISUAL_SYSTEM.shell;

  const goToScene = (index: number) => {
    const target = timeline[index];
    if (!target) return;
    const previousEntry = timeline[Math.max(0, target.sceneIndex - 1)];
    dispatch({
      type: 'seek',
      timeMs: getScenePreviewTime(target.startMs, target.timing.enterMs, target.sceneIndex > 0 ? previousEntry?.timing.overlapMs || 0 : 0)
    });
  };

  return (
    <div style={{ minHeight: '100vh', background: template.background, color: template.text, padding: 'min(24px, 4vw)' }}>
      <div style={{ maxWidth: 1400, margin: '0 auto', display: 'grid', gap: 18 }}>
        <header style={{
          borderRadius: shell.cardRadius,
          border: `1px solid ${template.border}`,
          background: template.surface,
          padding: 24,
          backdropFilter: 'blur(24px)',
          WebkitBackdropFilter: 'blur(24px)',
          boxShadow: '0 18px 38px rgba(3,7,18,0.26)'
        }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: 10, color: template.accent, fontSize: '0.76rem', textTransform: 'uppercase', letterSpacing: '0.16em', fontWeight: 700, marginBottom: 10 }}>
            <SphereLogo width={78} height={18} appearance={story.templateId === 'dark' ? 'dark' : 'light'} />
            <span>Story</span>
          </div>
          <h1 style={{ fontSize: 'clamp(2rem, 4vw, 3.2rem)', lineHeight: 0.94, marginBottom: 10 }}>{story.title}</h1>
          <p style={{ margin: 0, color: template.mutedText, maxWidth: 760, lineHeight: 1.6 }}>{story.subtitle}</p>
        </header>

        <section style={{
          borderRadius: shell.cardRadius,
          border: `1px solid ${template.border}`,
          background: template.surface,
          padding: 20,
          display: 'grid',
          gap: 16,
          boxShadow: '0 18px 38px rgba(3,7,18,0.26)'
        }}>
          <div style={{ display: 'flex', justifyContent: 'space-between', gap: 12, alignItems: 'center', flexWrap: 'wrap' }}>
            <div style={{ display: 'grid', gap: 4 }}>
              <span style={{ color: template.mutedText, fontSize: '0.82rem', letterSpacing: '0.08em', textTransform: 'uppercase' }}>
                Scene {Math.max(1, activeSceneIndex + 1)} / {story.scenes.length} · {viewport.label}
              </span>
              <strong>{story.scenes[Math.max(0, activeSceneIndex)]?.title || story.title}</strong>
            </div>
            <div style={{ display: 'flex', gap: 10, flexWrap: 'wrap' }}>
              <button type="button" className="story-public-btn" onClick={() => goToScene(Math.max(0, activeSceneIndex - 1))} disabled={activeSceneIndex <= 0}>
                <ChevronLeft size={16} />
                Previous
              </button>
              <button
                type="button"
                className="story-public-btn story-public-btn-primary"
                onClick={() => {
                  if (controller.isPlaying) {
                    dispatch({ type: 'pause' });
                  } else {
                    dispatch({ type: 'play', nowMs: performance.now() });
                  }
                }}
              >
                {controller.isPlaying ? <Pause size={16} /> : <Play size={16} />}
                {controller.isPlaying ? 'Pause' : 'Play'}
              </button>
              <button type="button" className="story-public-btn" onClick={() => goToScene(Math.min(story.scenes.length - 1, activeSceneIndex + 1))} disabled={activeSceneIndex >= story.scenes.length - 1}>
                Next
                <ChevronRight size={16} />
              </button>
            </div>
          </div>

          <div
            style={{
              display: 'grid',
              placeItems: 'center',
              minWidth: 0,
              width: '100%',
              maxWidth: story.orientation === 'portrait' ? 900 : '100%',
              margin: story.orientation === 'portrait' ? '0 auto' : undefined
            }}
          >
            <StoryStage
              width={viewport.width}
              height={viewport.height}
              maxHeight={story.orientation === 'portrait' ? '90vh' : '74vh'}
              align="center"
            >
              <StoryFrameView
                story={story}
                materializedStory={materializedStory}
                timeMs={currentTimeMs}
                width={viewport.width}
                height={viewport.height}
              />
            </StoryStage>
          </div>

          <div style={{ display: 'grid', gap: 8 }}>
            <input
              type="range"
              min={0}
              max={Math.max(0, totalDurationMs)}
              value={currentTimeMs}
              onChange={(event) => dispatch({ type: 'seek', timeMs: Number(event.target.value) })}
            />
            <div style={{ display: 'flex', justifyContent: 'space-between', color: template.mutedText, fontSize: '0.88rem' }}>
              <span>{Math.round(currentTimeMs / 100) / 10}s</span>
              <span>{Math.round(totalDurationMs / 100) / 10}s</span>
            </div>
          </div>
        </section>
      </div>

      <style jsx>{`
        .story-public-btn {
          display: inline-flex;
          align-items: center;
          gap: 8px;
          padding: 10px 14px;
          border-radius: 999px;
          border: 1px solid ${template.border};
          background: rgba(255,255,255,0.04);
          color: ${template.text};
          cursor: pointer;
        }
        .story-public-btn-primary {
          background: linear-gradient(180deg, ${template.accent}, rgba(255,255,255,0.16));
          color: ${template.accentContrast};
          border-color: transparent;
          font-weight: 700;
        }
        .story-public-btn:disabled {
          opacity: 0.45;
          cursor: not-allowed;
        }
        @media (max-width: 640px) {
          .story-public-btn {
            width: 100%;
            justify-content: center;
          }
        }
      `}</style>
    </div>
  );
}
