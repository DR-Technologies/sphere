import { describe, expect, it } from 'vitest';
import {
  buildStoryPlaybackTimeline,
  createPlaybackControllerState,
  getStoryFrameState,
  getStoryPlaybackState,
  getStoryTotalDuration,
  reducePlaybackController
} from './playback';
import { STORY_SCHEMA_VERSION, type StoryDefinition } from './types';

const twoSceneStory: StoryDefinition = {
  schemaVersion: STORY_SCHEMA_VERSION,
  userId: 'user-1',
  datasetId: 'dataset-1',
  title: 'Story',
  subtitle: 'Subtitle',
  templateId: 'modern',
  motionPresetId: 'smooth',
  pacingPresetId: 'standard',
  orientation: 'landscape',
  scenes: [
    {
      id: 'scene-1',
      kind: 'intro',
      renderer: 'hero-text',
      title: 'Intro',
      subtitle: 'Start',
      layout: 'hero',
      transition: 'fade',
      durationMode: 'fixed',
      durationMs: 2000,
      source: { kind: 'none' }
    },
    {
      id: 'scene-2',
      kind: 'kpi',
      renderer: 'kpi-counter',
      title: 'KPI',
      subtitle: 'Value',
      layout: 'focus',
      transition: 'lift',
      durationMode: 'fixed',
      durationMs: 2000,
      source: { kind: 'metric', measureField: 'Ventas', aggregation: 'SUM' }
    }
  ]
};

describe('story playback', () => {
  it('builds a deterministic timeline with overlap-aware total duration', () => {
    const timeline = buildStoryPlaybackTimeline(twoSceneStory);

    expect(timeline).toHaveLength(2);
    expect(timeline[0].startMs).toBe(0);
    expect(timeline[0].endMs).toBe(2000);
    expect(timeline[1].startMs).toBeLessThan(2000);
    expect(getStoryTotalDuration(twoSceneStory)).toBe(timeline[1].endMs);
  });

  it('returns equal playback state for equal time', () => {
    expect(getStoryPlaybackState(twoSceneStory, 1300)).toEqual(getStoryPlaybackState(twoSceneStory, 1300));
  });

  it('supports time zero, mid-scene, end-scene, transition, scene changes and final state', () => {
    const start = getStoryPlaybackState(twoSceneStory, 0);
    const middle = getStoryPlaybackState(twoSceneStory, 1000);
    const secondScene = getStoryPlaybackState(twoSceneStory, 2100);
    const finalState = getStoryPlaybackState(twoSceneStory, getStoryTotalDuration(twoSceneStory));

    expect(start.activeSceneId).toBe('scene-1');
    expect(start.phase).toBe('enter');
    expect(middle.phase).toBe('main');
    expect(secondScene.activeSceneId).toBe('scene-2');
    expect(finalState.isComplete).toBe(true);
    expect(finalState.activeSceneId).toBe('scene-2');
  });

  it('returns visible overlap scenes during transitions', () => {
    const frame = getStoryFrameState(twoSceneStory, 1900);
    expect(frame.visibleScenes.length).toBeGreaterThanOrEqual(1);
  });

  it('supports stories with no scenes', () => {
    const emptyStory: StoryDefinition = {
      ...twoSceneStory,
      scenes: []
    };

    const state = getStoryPlaybackState(emptyStory, 0);
    expect(state.activeSceneIndex).toBe(-1);
    expect(state.isComplete).toBe(true);
    expect(getStoryFrameState(emptyStory, 0).visibleScenes).toEqual([]);
  });

  it('supports stories with one scene', () => {
    const oneSceneStory: StoryDefinition = {
      ...twoSceneStory,
      scenes: [twoSceneStory.scenes[0]]
    };

    const state = getStoryPlaybackState(oneSceneStory, 500);
    expect(state.activeSceneId).toBe('scene-1');
    expect(state.isLastScene).toBe(true);
  });

  it('keeps a five-scene Standard story near the 20-24 second product target', () => {
    const kinds = ['intro', 'kpi', 'evolution', 'ranking', 'composition'] as const;
    const fiveSceneStory: StoryDefinition = {
      ...twoSceneStory,
      scenes: kinds.map((kind, index) => ({
        ...twoSceneStory.scenes[index === 0 ? 0 : 1],
        id: `scene-${index + 1}`,
        kind,
        renderer: kind === 'intro'
          ? 'hero-text'
          : kind === 'kpi'
            ? 'kpi-counter'
            : kind === 'evolution'
              ? 'line-evolution'
              : kind === 'ranking'
                ? 'bar-ranking'
                : 'composition-evolution',
        durationMode: 'auto',
        durationMs: undefined
      })) as StoryDefinition['scenes']
    };

    expect(getStoryTotalDuration(fiveSceneStory)).toBeGreaterThanOrEqual(20_000);
    expect(getStoryTotalDuration(fiveSceneStory)).toBeLessThanOrEqual(24_000);
  });
});

describe('story playback controller', () => {
  it('supports play, pause, resume and seek in both directions', () => {
    const totalDurationMs = getStoryTotalDuration(twoSceneStory);
    let state = createPlaybackControllerState();

    state = reducePlaybackController(state, { type: 'play', nowMs: 1000 });
    state = reducePlaybackController(state, { type: 'tick', nowMs: 1300, totalDurationMs });
    expect(state.currentTimeMs).toBe(300);
    expect(state.isPlaying).toBe(true);

    state = reducePlaybackController(state, { type: 'pause' });
    expect(state.isPlaying).toBe(false);

    state = reducePlaybackController(state, { type: 'seek', timeMs: 1400 });
    expect(state.currentTimeMs).toBe(1400);

    state = reducePlaybackController(state, { type: 'seek', timeMs: 200 });
    expect(state.currentTimeMs).toBe(200);

    state = reducePlaybackController(state, { type: 'play', nowMs: 2000 });
    state = reducePlaybackController(state, { type: 'tick', nowMs: 2300, totalDurationMs });
    expect(state.currentTimeMs).toBe(500);
    expect(state.isPlaying).toBe(true);
  });

  it('stops automatically at the end of the story', () => {
    const totalDurationMs = getStoryTotalDuration(twoSceneStory);
    let state = createPlaybackControllerState();

    state = reducePlaybackController(state, { type: 'play', nowMs: 0 });
    state = reducePlaybackController(state, { type: 'tick', nowMs: totalDurationMs + 5000, totalDurationMs });

    expect(state.currentTimeMs).toBe(totalDurationMs);
    expect(state.isPlaying).toBe(false);
  });
});
