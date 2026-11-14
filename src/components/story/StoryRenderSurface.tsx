'use client';

import React from 'react';
import { flushSync } from 'react-dom';
import StoryFrameView from './StoryFrameView';
import type { MaterializedStory, StoryDefinition } from '@/lib/story/types';

interface StoryRenderSurfaceProps {
  story: StoryDefinition;
  materializedStory: MaterializedStory;
  initialTimeMs: number;
  width: number;
  height: number;
}

declare global {
  interface Window {
    __SPHERE_STORY_RENDER__?: {
      setTimeMs: (timeMs: number) => void;
      renderFrame: (timeMs: number) => Promise<void>;
      getCurrentTimeMs: () => number;
      getTotalDurationMs: () => number;
      getActiveSceneId: () => string;
    };
  }
}

export default function StoryRenderSurface({
  story,
  materializedStory,
  initialTimeMs,
  width,
  height
}: StoryRenderSurfaceProps) {
  const [timeMs, setTimeMs] = React.useState(initialTimeMs);

  React.useEffect(() => {
    setTimeMs(initialTimeMs);
  }, [initialTimeMs]);

  React.useEffect(() => {
    window.__SPHERE_STORY_RENDER__ = {
      setTimeMs,
      renderFrame: async (nextTimeMs: number) => {
        flushSync(() => setTimeMs(nextTimeMs));
        await document.fonts.ready;
        await new Promise<void>((resolve) => requestAnimationFrame(() => resolve()));
      },
      getCurrentTimeMs: () => timeMs,
      getTotalDurationMs: () => {
        const element = document.querySelector('[data-story-total-duration-ms]');
        if (!(element instanceof HTMLElement)) return 0;
        const parsed = Number(element.dataset.storyTotalDurationMs || 0);
        return Number.isFinite(parsed) ? parsed : 0;
      },
      getActiveSceneId: () => {
        const element = document.querySelector('[data-story-active-scene-id]');
        return element instanceof HTMLElement ? element.dataset.storyActiveSceneId || '' : '';
      }
    };

    return () => {
      delete window.__SPHERE_STORY_RENDER__;
    };
  }, [timeMs]);

  return (
    <StoryFrameView
      story={story}
      materializedStory={materializedStory}
      timeMs={timeMs}
      width={width}
      height={height}
    />
  );
}
