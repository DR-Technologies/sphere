import type { PresentationTemplateId } from '@/lib/visualSystem';
import type { AggregationType } from '@/lib/widgets/types';

export const STORY_SCHEMA_VERSION = 1;
export const STORY_RENDER_MODEL_VERSION = 1;

export type MotionPresetId = 'smooth' | 'dynamic' | 'cinematic';
export type StoryPacingPresetId = 'short' | 'standard' | 'extended';
export type StoryOrientation = 'landscape' | 'portrait';
export type StoryTransitionPresetId = 'fade' | 'lift' | 'slide';
export type StorySceneKind = 'intro' | 'kpi' | 'evolution' | 'ranking' | 'race' | 'composition' | 'outro';
export type StoryRendererId = 'hero-text' | 'kpi-counter' | 'line-evolution' | 'bar-ranking' | 'bar-race' | 'composition-evolution';
export type StoryLayoutVariant = 'hero' | 'focus' | 'split' | 'cover';
export type StoryDurationMode = 'auto' | 'fixed';
export type StoryPlaybackPhase = 'enter' | 'main' | 'exit';
export type SceneBindingKind = 'none' | 'metric' | 'series' | 'ranking' | 'race' | 'composition';
export type StoryValueFormatKind = 'number' | 'currency' | 'percentage';

export interface StoryNoBinding {
  kind: 'none';
}

export interface StoryMetricBinding {
  kind: 'metric';
  measureField: string;
  aggregation: AggregationType;
  labelField?: string;
  sourceWidgetId?: string;
}

export interface StorySeriesBinding {
  kind: 'series';
  dimensionField: string;
  measureField: string;
  aggregation: AggregationType;
  sourceWidgetId?: string;
}

export interface StoryRankingBinding {
  kind: 'ranking';
  categoryField: string;
  measureField: string;
  aggregation: AggregationType;
  topN?: number;
  sourceWidgetId?: string;
}

export interface StoryRaceBinding {
  kind: 'race';
  timeField: string;
  categoryField: string;
  measureField: string;
  aggregation: AggregationType;
  topN: number;
  sourceWidgetId?: string;
}

export interface StoryCompositionBinding {
  kind: 'composition';
  categoryField: string;
  measureField: string;
  aggregation: AggregationType;
  timeField?: string;
  topN?: number;
  sourceWidgetId?: string;
}

export type StorySceneBinding =
  | StoryNoBinding
  | StoryMetricBinding
  | StorySeriesBinding
  | StoryRankingBinding
  | StoryRaceBinding
  | StoryCompositionBinding;

export interface StorySceneDefinition {
  id: string;
  kind: StorySceneKind;
  renderer: StoryRendererId;
  title: string;
  subtitle: string;
  layout: StoryLayoutVariant;
  transition: StoryTransitionPresetId;
  durationMode: StoryDurationMode;
  durationMs?: number;
  templateId?: PresentationTemplateId;
  motionPresetId?: MotionPresetId;
  source: StorySceneBinding;
  options?: Record<string, unknown>;
}

export interface StoryDefinition {
  id?: string;
  schemaVersion: number;
  userId: string;
  datasetId: string;
  sourceReportId?: string | null;
  title: string;
  subtitle: string;
  templateId: PresentationTemplateId;
  motionPresetId: MotionPresetId;
  pacingPresetId: StoryPacingPresetId;
  orientation: StoryOrientation;
  scenes: StorySceneDefinition[];
  createdAt?: string;
  updatedAt?: string;
}

export interface StoryCopyBlock {
  title: string;
  subtitle: string;
}

export interface StoryValueFormat {
  kind: StoryValueFormatKind;
  maximumFractionDigits?: number;
  compact?: boolean;
  prefix?: string;
  suffix?: string;
}

export interface SceneThemeRef {
  templateId: PresentationTemplateId;
}

export interface SceneMotionRef {
  motionPresetId: MotionPresetId;
  transition: StoryTransitionPresetId;
}

export interface KpiDatum {
  label: string;
  value: number;
  formattedValue?: string;
  unit?: string;
  format?: StoryValueFormat;
}

export interface LineDatum {
  key: string;
  label: string;
  value: number;
}

export interface RankedDatum {
  key: string;
  label: string;
  value: number;
  rank: number;
  color?: string;
}

export interface CompositionDatum {
  key: string;
  label: string;
  value: number;
  share: number;
  color?: string;
}

export interface RaceFrame {
  key: string;
  label: string;
  items: RankedDatum[];
}

export interface CompositionFrame {
  key: string;
  label: string;
  items: CompositionDatum[];
}

export interface BaseVisualizationRenderModel {
  renderModelVersion: number;
  sceneId: string;
  renderer: StoryRendererId;
  layout: StoryLayoutVariant;
  copy: StoryCopyBlock;
  theme: SceneThemeRef;
  motion: SceneMotionRef;
}

export interface HeroSceneRenderModel extends BaseVisualizationRenderModel {
  renderer: 'hero-text';
  data: {
    eyebrow?: string;
  };
}

export interface KpiSceneRenderModel extends BaseVisualizationRenderModel {
  renderer: 'kpi-counter';
  data: {
    metric: KpiDatum;
  };
}

export interface LineSceneRenderModel extends BaseVisualizationRenderModel {
  renderer: 'line-evolution';
  data: {
    points: LineDatum[];
    dimensionField: string;
    measureField: string;
    valueFormat?: StoryValueFormat;
  };
}

export interface RankingSceneRenderModel extends BaseVisualizationRenderModel {
  renderer: 'bar-ranking';
  data: {
    items: RankedDatum[];
    categoryField: string;
    measureField: string;
    valueFormat?: StoryValueFormat;
  };
}

export interface RaceSceneRenderModel extends BaseVisualizationRenderModel {
  renderer: 'bar-race';
  data: {
    timeField: string;
    categoryField: string;
    measureField: string;
    frames: RaceFrame[];
    valueFormat?: StoryValueFormat;
  };
}

export interface CompositionSceneRenderModel extends BaseVisualizationRenderModel {
  renderer: 'composition-evolution';
  data: {
    frames: CompositionFrame[];
    categoryField: string;
    measureField: string;
    timeField?: string;
    valueFormat?: StoryValueFormat;
  };
}

export type VisualizationRenderModel =
  | HeroSceneRenderModel
  | KpiSceneRenderModel
  | LineSceneRenderModel
  | RankingSceneRenderModel
  | RaceSceneRenderModel
  | CompositionSceneRenderModel;

export interface MaterializedScene {
  sceneId: string;
  bindingKind: SceneBindingKind;
  renderModel: VisualizationRenderModel;
  warning?: string | null;
  emptyState?: string | null;
}

export interface MaterializedStory {
  schemaVersion: number;
  renderModelVersion: number;
  storyId?: string;
  datasetId: string;
  title: string;
  subtitle: string;
  templateId: PresentationTemplateId;
  motionPresetId: MotionPresetId;
  pacingPresetId: StoryPacingPresetId;
  orientation: StoryOrientation;
  scenes: MaterializedScene[];
  generatedAt: string;
}

export interface StoryPlaybackState {
  totalDurationMs: number;
  globalTimeMs: number;
  activeSceneIndex: number;
  activeSceneId: string;
  sceneStartMs: number;
  sceneEndMs: number;
  sceneTimeMs: number;
  sceneProgress: number;
  phase: StoryPlaybackPhase;
  enterProgress: number;
  mainProgress: number;
  exitProgress: number;
  transitionProgress: number;
  isFirstScene: boolean;
  isLastScene: boolean;
  isComplete: boolean;
}

export interface StoryScenePlaybackState {
  sceneId: string;
  sceneIndex: number;
  sceneStartMs: number;
  sceneEndMs: number;
  sceneTimeMs: number;
  sceneProgress: number;
  phase: StoryPlaybackPhase;
  enterProgress: number;
  mainProgress: number;
  exitProgress: number;
  transitionProgress: number;
  isActive: boolean;
}

export interface StoryFrameState {
  playback: StoryPlaybackState;
  visibleScenes: StoryScenePlaybackState[];
}

export interface StoryPublicationSnapshot {
  id: string;
  slug: string;
  storyId?: string | null;
  datasetId: string;
  userId?: string;
  storyDefinition: StoryDefinition;
  materializedStory: MaterializedStory;
  publishedAt?: string;
  revokedAt?: string | null;
  createdAt?: string;
  updatedAt?: string;
}

export type StoryExportJobStatus = 'queued' | 'processing' | 'completed' | 'failed';
export type StoryExportJobPhase = 'queued' | 'preparing' | 'rendering_frames' | 'encoding' | 'completed' | 'failed';

export interface StoryExportJob {
  id: string;
  storyId: string;
  userId: string;
  status: StoryExportJobStatus;
  phase: StoryExportJobPhase;
  orientation: StoryOrientation;
  renderToken: string;
  fileName?: string | null;
  outputPath?: string | null;
  outputSizeBytes?: number | null;
  durationMs?: number | null;
  frameCount?: number | null;
  currentFrame?: number | null;
  currentTimeMs?: number | null;
  progress?: number | null;
  fps: number;
  renderTimeMs?: number | null;
  frameRenderTimeMs?: number | null;
  encodingTimeMs?: number | null;
  error?: string | null;
  technicalMetadata: Record<string, unknown>;
  createdAt?: string;
  startedAt?: string | null;
  completedAt?: string | null;
  heartbeatAt?: string | null;
  updatedAt?: string;
}
