import { getStoryMotionPreset } from './motion';
import { evaluateCubicBezier } from './easing';
import type { MaterializedScene, MaterializedStory, StoryFrameState, StoryScenePlaybackState } from './types';

export interface SceneLayerRenderState {
  scene: MaterializedScene;
  playback: StoryScenePlaybackState;
  opacity: number;
  translateY: number;
  scale: number;
  contentProgress: number;
}

function clamp01(value: number) {
  return Math.max(0, Math.min(1, value));
}

function resolveContentProgress(playback: StoryScenePlaybackState) {
  if (playback.phase === 'enter') {
    return clamp01(0.22 + playback.enterProgress * 0.74);
  }
  if (playback.phase === 'main') {
    return clamp01(0.62 + playback.mainProgress * 0.38);
  }
  return clamp01(1 - playback.exitProgress * 0.9);
}

export function resolveSceneLayerRenderState(scene: MaterializedScene, playback: StoryScenePlaybackState): SceneLayerRenderState {
  const preset = getStoryMotionPreset(scene.renderModel.motion.motionPresetId);
  const enterEase = evaluateCubicBezier(preset.entrance.ease, playback.enterProgress);
  const exitEase = evaluateCubicBezier(preset.exit.ease, playback.exitProgress);

  let opacity = 1;
  let translateY = 0;
  let scale = 1;

  if (playback.phase === 'enter') {
    opacity = 0.42 + enterEase * 0.58;
    translateY = preset.entrance.y * 0.36 * (1 - enterEase);
    scale = preset.entrance.scale + (1 - preset.entrance.scale) * 0.96 * enterEase;
  } else if (playback.phase === 'exit') {
    opacity = 0.58 - exitEase * 0.56;
    translateY = preset.exit.y * 1.1 * exitEase;
    scale = 1 - (1 - preset.entrance.scale) * 0.72 * exitEase;
  }

  return {
    scene,
    playback,
    opacity: clamp01(opacity),
    translateY,
    scale,
    contentProgress: resolveContentProgress(playback)
  };
}

export function resolveVisibleSceneLayers(materializedStory: MaterializedStory, frame: StoryFrameState) {
  const scenesById = new Map(materializedStory.scenes.map((scene) => [scene.sceneId, scene]));

  return frame.visibleScenes
    .map((visible) => {
      const scene = scenesById.get(visible.sceneId);
      if (!scene) return null;
      return resolveSceneLayerRenderState(scene, visible);
    })
    .filter((layer): layer is SceneLayerRenderState => Boolean(layer))
    .sort((left, right) => left.playback.sceneIndex - right.playback.sceneIndex);
}
