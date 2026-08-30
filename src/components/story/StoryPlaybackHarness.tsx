'use client';

import React from 'react';
import { Pause, Play, RotateCcw } from 'lucide-react';
import PresentationRenderer from './PresentationRenderer';
import { createStoryHarnessFixture } from '@/lib/story/harness';
import {
  createPlaybackControllerState,
  getStoryFrameState,
  getStoryTotalDuration,
  reducePlaybackController
} from '@/lib/story/playback';
import type { MotionPresetId, StoryOrientation } from '@/lib/story/types';
import type { PresentationTemplateId } from '@/lib/visualSystem';

interface StoryPlaybackHarnessProps {
  templateId: PresentationTemplateId;
  motionPresetId: MotionPresetId;
  orientation: StoryOrientation;
  fixedTimeMs?: number | null;
  width: number;
  height: number;
  showChrome?: boolean;
}

export default function StoryPlaybackHarness({
  templateId,
  motionPresetId,
  orientation,
  fixedTimeMs = null,
  width,
  height,
  showChrome = true
}: StoryPlaybackHarnessProps) {
  const fixture = React.useMemo(() => createStoryHarnessFixture({
    templateId,
    motionPresetId,
    orientation
  }), [motionPresetId, orientation, templateId]);

  const totalDurationMs = React.useMemo(() => getStoryTotalDuration(fixture.story), [fixture.story]);
  const [controller, dispatch] = React.useReducer(reducePlaybackController, undefined, createPlaybackControllerState);
  const isFixed = fixedTimeMs !== null && fixedTimeMs !== undefined;
  const [externalTimeMs, setExternalTimeMs] = React.useState(() => fixedTimeMs ?? 0);

  React.useEffect(() => {
    if (isFixed) {
      setExternalTimeMs(fixedTimeMs ?? 0);
    }
  }, [fixedTimeMs, isFixed]);

  React.useEffect(() => {
    if (isFixed) return undefined;

    let frameId = 0;
    const tick = (now: number) => {
      dispatch({ type: 'tick', nowMs: now, totalDurationMs });
      frameId = window.requestAnimationFrame(tick);
    };

    frameId = window.requestAnimationFrame(tick);
    return () => window.cancelAnimationFrame(frameId);
  }, [isFixed, totalDurationMs]);

  const currentTimeMs = isFixed
    ? Math.max(0, Math.min(externalTimeMs, totalDurationMs))
    : controller.currentTimeMs;
  const frameState = React.useMemo(() => getStoryFrameState(fixture.story, currentTimeMs), [currentTimeMs, fixture.story]);

  React.useEffect(() => {
    if (showChrome || typeof window === 'undefined') return undefined;

    const api = {
      setTimeMs: (timeMs: number) => setExternalTimeMs(timeMs),
      getCurrentTimeMs: () => currentTimeMs,
      getTotalDurationMs: () => totalDurationMs,
      getActiveSceneId: () => frameState.playback.activeSceneId
    };

    Object.assign(window, {
      __SPHERE_STORY_RENDER__: api
    });

    return () => {
      delete (window as Window & { __SPHERE_STORY_RENDER__?: typeof api }).__SPHERE_STORY_RENDER__;
    };
  }, [currentTimeMs, frameState.playback.activeSceneId, showChrome, totalDurationMs]);

  const togglePlayback = () => {
    if (isFixed) return;
    if (controller.isPlaying) {
      dispatch({ type: 'pause' });
    } else {
      dispatch({ type: 'play', nowMs: performance.now() });
    }
  };

  const handleSeek = (event: React.ChangeEvent<HTMLInputElement>) => {
    dispatch({ type: 'seek', timeMs: Number(event.target.value) });
  };

  const handleReset = () => {
    dispatch({ type: 'reset' });
  };

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: 18, alignItems: 'center' }}>
      {showChrome && (
        <div style={{
          width: width,
          maxWidth: '100%',
          display: 'flex',
          flexDirection: 'column',
          gap: 12,
          padding: '16px 18px',
          borderRadius: 22,
          border: '1px solid rgba(255,255,255,0.12)',
          background: 'rgba(9,15,28,0.7)',
          color: 'white'
        }}
        >
          <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', gap: 12, flexWrap: 'wrap' }}>
            <div>
              <div style={{ fontSize: 12, letterSpacing: '0.18em', textTransform: 'uppercase', color: 'rgba(255,255,255,0.62)', marginBottom: 4 }}>
                Story Harness
              </div>
              <div style={{ fontSize: 22, fontWeight: 700 }}>
                {fixture.story.title}
              </div>
            </div>
            <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
              <button type="button" onClick={togglePlayback} style={buttonStyle}>
                {controller.isPlaying ? <Pause size={16} /> : <Play size={16} />}
                {controller.isPlaying ? 'Pause' : 'Play'}
              </button>
              <button type="button" onClick={handleReset} style={buttonStyle}>
                <RotateCcw size={16} />
                Reset
              </button>
            </div>
          </div>

          <div style={{ display: 'grid', gridTemplateColumns: '1fr auto', gap: 12, alignItems: 'center' }}>
            <input
              type="range"
              min={0}
              max={totalDurationMs}
              value={currentTimeMs}
              onChange={handleSeek}
              style={{ width: '100%' }}
            />
            <div style={{ fontSize: 14, fontVariantNumeric: 'tabular-nums', color: 'rgba(255,255,255,0.76)' }}>
              {Math.round(currentTimeMs)} / {Math.round(totalDurationMs)} ms
            </div>
          </div>
        </div>
      )}

      <div
        data-story-ready="true"
        data-story-current-time-ms={Math.round(currentTimeMs)}
        data-story-total-duration-ms={Math.round(totalDurationMs)}
        data-story-active-scene-id={frameState.playback.activeSceneId}
      >
        <PresentationRenderer
          story={fixture.materializedStory}
          timeMs={currentTimeMs}
          frameState={frameState}
          width={width}
          height={height}
        />
      </div>
    </div>
  );
}

const buttonStyle: React.CSSProperties = {
  display: 'inline-flex',
  alignItems: 'center',
  gap: 8,
  borderRadius: 999,
  border: '1px solid rgba(255,255,255,0.14)',
  background: 'rgba(255,255,255,0.08)',
  color: 'white',
  padding: '10px 14px',
  cursor: 'pointer'
};
