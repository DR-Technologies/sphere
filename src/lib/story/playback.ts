import { createStorySceneTiming, getScenePhase, getSceneWeight, type StorySceneTiming } from './motion';
import type { StoryDefinition, StoryFrameState, StoryPlaybackState, StoryScenePlaybackState } from './types';

export interface StoryPlaybackTimelineEntry {
  sceneId: string;
  sceneIndex: number;
  startMs: number;
  endMs: number;
  timing: StorySceneTiming;
}

export interface StoryPlaybackControllerState {
  currentTimeMs: number;
  isPlaying: boolean;
  lastTickAtMs: number | null;
}

export type StoryPlaybackControllerAction =
  | { type: 'play'; nowMs: number }
  | { type: 'pause' }
  | { type: 'seek'; timeMs: number }
  | { type: 'tick'; nowMs: number; totalDurationMs: number }
  | { type: 'reset' };

function clamp(value: number, min: number, max: number) {
  return Math.max(min, Math.min(value, max));
}

function resolveScenePlaybackState(entry: StoryPlaybackTimelineEntry, globalTimeMs: number, isActive: boolean): StoryScenePlaybackState {
  const sceneTimeMs = clamp(globalTimeMs - entry.startMs, 0, entry.timing.durationMs);
  const phase = getScenePhase(entry.timing, sceneTimeMs);
  const sceneProgress = entry.timing.durationMs > 0 ? clamp(sceneTimeMs / entry.timing.durationMs, 0, 1) : 1;
  const enterProgress = entry.timing.enterMs > 0 ? clamp(sceneTimeMs / entry.timing.enterMs, 0, 1) : 1;
  const mainProgress = entry.timing.mainMs > 0
    ? clamp((sceneTimeMs - entry.timing.enterMs) / entry.timing.mainMs, 0, 1)
    : phase === 'main' ? 1 : 0;
  const exitStartMs = entry.timing.enterMs + entry.timing.mainMs;
  const exitProgress = entry.timing.exitMs > 0
    ? clamp((sceneTimeMs - exitStartMs) / entry.timing.exitMs, 0, 1)
    : phase === 'exit' ? 1 : 0;
  const transitionProgress = entry.timing.overlapMs > 0
    ? clamp((sceneTimeMs - (entry.timing.durationMs - entry.timing.overlapMs)) / entry.timing.overlapMs, 0, 1)
    : 0;

  return {
    sceneId: entry.sceneId,
    sceneIndex: entry.sceneIndex,
    sceneStartMs: entry.startMs,
    sceneEndMs: entry.endMs,
    sceneTimeMs,
    sceneProgress,
    phase,
    enterProgress,
    mainProgress,
    exitProgress,
    transitionProgress,
    isActive
  };
}

export function createPlaybackControllerState(): StoryPlaybackControllerState {
  return {
    currentTimeMs: 0,
    isPlaying: false,
    lastTickAtMs: null
  };
}

export function reducePlaybackController(
  state: StoryPlaybackControllerState,
  action: StoryPlaybackControllerAction
): StoryPlaybackControllerState {
  if (action.type === 'reset') {
    return createPlaybackControllerState();
  }

  if (action.type === 'play') {
    return {
      ...state,
      isPlaying: true,
      lastTickAtMs: action.nowMs
    };
  }

  if (action.type === 'pause') {
    return {
      ...state,
      isPlaying: false,
      lastTickAtMs: null
    };
  }

  if (action.type === 'seek') {
    return {
      ...state,
      currentTimeMs: Math.max(0, action.timeMs)
    };
  }

  if (!state.isPlaying) {
    return state;
  }

  const lastTickAtMs = state.lastTickAtMs ?? action.nowMs;
  const deltaMs = Math.max(0, action.nowMs - lastTickAtMs);
  const nextTimeMs = clamp(state.currentTimeMs + deltaMs, 0, action.totalDurationMs);

  return {
    currentTimeMs: nextTimeMs,
    isPlaying: nextTimeMs < action.totalDurationMs,
    lastTickAtMs: action.nowMs
  };
}

export function buildStoryPlaybackTimeline(story: StoryDefinition): StoryPlaybackTimelineEntry[] {
  const totalWeight = story.scenes.reduce((sum, scene) => sum + getSceneWeight(scene.kind), 0);
  let cursor = 0;

  return story.scenes.map((scene, index) => {
    const timing = createStorySceneTiming({
      scene,
      motionPresetId: story.motionPresetId,
      pacingPresetId: story.pacingPresetId,
      totalWeight
    });

    const entry = {
      sceneId: scene.id,
      sceneIndex: index,
      startMs: cursor,
      endMs: cursor + timing.durationMs,
      timing
    };

    cursor = entry.endMs - timing.overlapMs;
    return entry;
  });
}

export function getStoryTotalDuration(story: StoryDefinition) {
  const timeline = buildStoryPlaybackTimeline(story);
  return timeline.length ? timeline[timeline.length - 1].endMs : 0;
}

export function getStoryPlaybackState(story: StoryDefinition, currentTimeMs: number): StoryPlaybackState {
  const timeline = buildStoryPlaybackTimeline(story);
  const totalDurationMs = timeline.length ? timeline[timeline.length - 1].endMs : 0;

  if (timeline.length === 0) {
    return {
      totalDurationMs: 0,
      globalTimeMs: 0,
      activeSceneIndex: -1,
      activeSceneId: '',
      sceneStartMs: 0,
      sceneEndMs: 0,
      sceneTimeMs: 0,
      sceneProgress: 1,
      phase: 'main',
      enterProgress: 1,
      mainProgress: 1,
      exitProgress: 1,
      transitionProgress: 1,
      isFirstScene: true,
      isLastScene: true,
      isComplete: true
    };
  }

  const boundedTime = clamp(currentTimeMs, 0, totalDurationMs);
  const active = timeline.filter((entry) => entry.startMs <= boundedTime).at(-1) || timeline[0];
  const sceneState = resolveScenePlaybackState(active, boundedTime, true);

  return {
    totalDurationMs,
    globalTimeMs: boundedTime,
    activeSceneIndex: active.sceneIndex,
    activeSceneId: active.sceneId,
    sceneStartMs: active.startMs,
    sceneEndMs: active.endMs,
    sceneTimeMs: sceneState.sceneTimeMs,
    sceneProgress: sceneState.sceneProgress,
    phase: sceneState.phase,
    enterProgress: sceneState.enterProgress,
    mainProgress: sceneState.mainProgress,
    exitProgress: sceneState.exitProgress,
    transitionProgress: sceneState.transitionProgress,
    isFirstScene: active.sceneIndex === 0,
    isLastScene: active.sceneIndex === timeline.length - 1,
    isComplete: boundedTime >= totalDurationMs
  };
}

export function getVisibleScenePlaybackStates(story: StoryDefinition, currentTimeMs: number): StoryScenePlaybackState[] {
  const timeline = buildStoryPlaybackTimeline(story);
  const totalDurationMs = timeline.length ? timeline[timeline.length - 1].endMs : 0;
  const boundedTime = clamp(currentTimeMs, 0, totalDurationMs);
  const activeSceneId = getStoryPlaybackState(story, boundedTime).activeSceneId;

  return timeline
    .filter((entry) => boundedTime >= entry.startMs && boundedTime <= entry.endMs)
    .map((entry) => resolveScenePlaybackState(entry, boundedTime, entry.sceneId === activeSceneId));
}

export function getStoryFrameState(story: StoryDefinition, currentTimeMs: number): StoryFrameState {
  return {
    playback: getStoryPlaybackState(story, currentTimeMs),
    visibleScenes: getVisibleScenePlaybackStates(story, currentTimeMs)
  };
}
