'use client';

import React from 'react';
import PresentationRenderer from './PresentationRenderer';
import { buildStoryPlaybackTimeline, getStoryFrameState } from '@/lib/story/playback';
import type { MaterializedStory, StoryDefinition } from '@/lib/story/types';

interface StoryFrameViewProps {
  story: StoryDefinition;
  materializedStory: MaterializedStory;
  timeMs: number;
  width: number;
  height: number;
}

export default function StoryFrameView({
  story,
  materializedStory,
  timeMs,
  width,
  height
}: StoryFrameViewProps) {
  const frameState = React.useMemo(() => getStoryFrameState(story, timeMs), [story, timeMs]);
  const timeline = React.useMemo(() => buildStoryPlaybackTimeline(story), [story]);

  return (
    <div
      data-story-ready="true"
      data-story-orientation={story.orientation}
      data-story-current-time-ms={Math.round(timeMs)}
      data-story-total-duration-ms={Math.round(frameState.playback.totalDurationMs)}
      data-story-active-scene-id={frameState.playback.activeSceneId}
      data-story-visible-scene-ids={frameState.visibleScenes.map((scene) => scene.sceneId).join(',')}
      data-story-scene-phase={frameState.playback.phase}
      data-story-transition-progress={frameState.playback.transitionProgress.toFixed(4)}
      data-story-timeline={JSON.stringify(timeline.map((entry) => ({
        sceneId: entry.sceneId,
        sceneIndex: entry.sceneIndex,
        startMs: entry.startMs,
        endMs: entry.endMs,
        overlapMs: entry.timing.overlapMs
      })))}
    >
      <PresentationRenderer
        story={materializedStory}
        timeMs={timeMs}
        frameState={frameState}
        width={width}
        height={height}
      />
    </div>
  );
}
