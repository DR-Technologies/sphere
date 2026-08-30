import { SPHERE_VISUAL_SYSTEM } from '@/lib/visualSystem';
import type {
  MotionPresetId,
  StoryPacingPresetId,
  StoryPlaybackPhase,
  StorySceneDefinition,
  StorySceneKind,
  StoryTransitionPresetId
} from './types';

export interface StoryMotionPreset {
  id: MotionPresetId;
  name: string;
  description: string;
  entrance: {
    durationMs: number;
    ease: [number, number, number, number];
    y: number;
    scale: number;
  };
  emphasis: {
    durationMs: number;
    ease: [number, number, number, number];
    staggerMs: number;
  };
  exit: {
    durationMs: number;
    ease: [number, number, number, number];
    y: number;
  };
}

export interface StorySceneTiming {
  sceneId: string;
  durationMs: number;
  enterMs: number;
  mainMs: number;
  exitMs: number;
  overlapMs: number;
}

const SECOND = 1000;

export const STORY_MOTION_PRESETS: StoryMotionPreset[] = [
  {
    id: 'smooth',
    name: 'Smooth',
    description: 'Transiciones suaves, limpias y continuas.',
    entrance: {
      durationMs: Math.round(SPHERE_VISUAL_SYSTEM.motion.medium * SECOND),
      ease: SPHERE_VISUAL_SYSTEM.motion.easeStandard,
      y: 20,
      scale: 0.98
    },
    emphasis: {
      durationMs: Math.round(SPHERE_VISUAL_SYSTEM.motion.slow * SECOND),
      ease: SPHERE_VISUAL_SYSTEM.motion.easeEmphasis,
      staggerMs: 80
    },
    exit: {
      durationMs: Math.round(SPHERE_VISUAL_SYSTEM.motion.fast * SECOND),
      ease: SPHERE_VISUAL_SYSTEM.motion.easeStandard,
      y: -12
    }
  },
  {
    id: 'dynamic',
    name: 'Dynamic',
    description: 'Más energía, más ritmo y cambios más marcados.',
    entrance: {
      durationMs: Math.round(SPHERE_VISUAL_SYSTEM.motion.fast * SECOND),
      ease: SPHERE_VISUAL_SYSTEM.motion.easeEntrance,
      y: 28,
      scale: 0.96
    },
    emphasis: {
      durationMs: Math.round(SPHERE_VISUAL_SYSTEM.motion.medium * SECOND),
      ease: SPHERE_VISUAL_SYSTEM.motion.easeEmphasis,
      staggerMs: 50
    },
    exit: {
      durationMs: Math.round(SPHERE_VISUAL_SYSTEM.motion.fast * SECOND),
      ease: SPHERE_VISUAL_SYSTEM.motion.easeEntrance,
      y: -24
    }
  },
  {
    id: 'cinematic',
    name: 'Cinematic',
    description: 'Más aire, más presencia y sensación editorial.',
    entrance: {
      durationMs: Math.round(SPHERE_VISUAL_SYSTEM.motion.slow * SECOND),
      ease: SPHERE_VISUAL_SYSTEM.motion.easeEntrance,
      y: 36,
      scale: 0.94
    },
    emphasis: {
      durationMs: Math.round(SPHERE_VISUAL_SYSTEM.motion.dramatic * SECOND),
      ease: SPHERE_VISUAL_SYSTEM.motion.easeEmphasis,
      staggerMs: 120
    },
    exit: {
      durationMs: Math.round(SPHERE_VISUAL_SYSTEM.motion.medium * SECOND),
      ease: SPHERE_VISUAL_SYSTEM.motion.easeStandard,
      y: -32
    }
  }
];

export const STORY_PACING_TARGET_MS: Record<StoryPacingPresetId, number> = {
  short: 15_000,
  standard: 30_000,
  extended: 60_000
};

const SCENE_WEIGHT_BY_KIND: Record<StorySceneKind, number> = {
  intro: 1.2,
  kpi: 1.6,
  evolution: 2.4,
  ranking: 2.1,
  race: 2.8,
  composition: 2.1,
  outro: 1.2
};

const TRANSITION_OVERLAP_RATIO: Record<StoryTransitionPresetId, number> = {
  fade: 0.2,
  lift: 0.16,
  slide: 0.14
};

export function getStoryMotionPreset(presetId: MotionPresetId) {
  return STORY_MOTION_PRESETS.find((preset) => preset.id === presetId) || STORY_MOTION_PRESETS[0];
}

export function getSceneWeight(kind: StorySceneKind) {
  return SCENE_WEIGHT_BY_KIND[kind] || 1.8;
}

export function resolveSceneDurationMs(params: {
  scene: StorySceneDefinition;
  pacingPresetId: StoryPacingPresetId;
  totalWeight: number;
}) {
  const { scene, pacingPresetId, totalWeight } = params;
  if (scene.durationMode === 'fixed' && scene.durationMs && scene.durationMs > 0) {
    return scene.durationMs;
  }

  const target = STORY_PACING_TARGET_MS[pacingPresetId];
  return Math.max(1200, Math.round((target * getSceneWeight(scene.kind)) / Math.max(1, totalWeight)));
}

export function createStorySceneTiming(params: {
  scene: StorySceneDefinition;
  motionPresetId: MotionPresetId;
  pacingPresetId: StoryPacingPresetId;
  totalWeight: number;
}) {
  const { scene, motionPresetId, pacingPresetId, totalWeight } = params;
  const motionPreset = getStoryMotionPreset(scene.motionPresetId || motionPresetId);
  const durationMs = resolveSceneDurationMs({ scene, pacingPresetId, totalWeight });
  const enterMs = Math.min(motionPreset.entrance.durationMs, Math.max(250, Math.round(durationMs * 0.24)));
  const exitMs = Math.min(motionPreset.exit.durationMs, Math.max(200, Math.round(durationMs * 0.2)));
  const mainMs = Math.max(0, durationMs - enterMs - exitMs);
  const overlapMs = Math.min(Math.round(exitMs * TRANSITION_OVERLAP_RATIO[scene.transition]), Math.round(durationMs * 0.12));

  return {
    sceneId: scene.id,
    durationMs,
    enterMs,
    mainMs,
    exitMs,
    overlapMs
  } satisfies StorySceneTiming;
}

export function getScenePhase(timing: StorySceneTiming, sceneTimeMs: number): StoryPlaybackPhase {
  if (sceneTimeMs <= timing.enterMs) return 'enter';
  if (sceneTimeMs >= timing.enterMs + timing.mainMs) return 'exit';
  return 'main';
}
