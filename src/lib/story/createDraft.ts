import type { DatasetRow } from '@/lib/analytics/types';
import type { DatasetColumnMeta, ReportPresentation, Widget } from '@/lib/widgets/types';
import { generateAutomaticStory } from './generator';
import { materializeStory, pruneMaterializedStory } from './materialize';
import type { MotionPresetId, StoryDefinition, StoryPacingPresetId } from './types';

interface StoryDraftDataset {
  id: string;
  name: string;
  columns: DatasetColumnMeta[];
  preview?: DatasetRow[];
}

export async function createAutomaticStoryDraft(params: {
  dataset: StoryDraftDataset;
  widgets: Widget[];
  presentation: ReportPresentation;
  userId: string;
  sourceReportId?: string | null;
  motionPresetId?: MotionPresetId;
  pacingPresetId?: StoryPacingPresetId;
}) {
  const story = generateAutomaticStory({
    dataset: params.dataset,
    widgets: params.widgets,
    presentation: params.presentation,
    userId: params.userId,
    sourceReportId: params.sourceReportId,
    motionPresetId: params.motionPresetId,
    pacingPresetId: params.pacingPresetId
  });

  const materializedStory = await materializeStory(story, {
    columnsMeta: params.dataset.columns,
    previewRows: params.dataset.preview
  });

  return pruneMaterializedStory(story, materializedStory);
}

export function updateStorySceneCopy(story: StoryDefinition, sceneId: string, patch: { title?: string; subtitle?: string }) {
  return {
    ...story,
    scenes: story.scenes.map((scene) => scene.id === sceneId
      ? {
        ...scene,
        title: patch.title ?? scene.title,
        subtitle: patch.subtitle ?? scene.subtitle
      }
      : scene)
  };
}

export function moveStoryScene(story: StoryDefinition, sceneId: string, direction: -1 | 1) {
  const index = story.scenes.findIndex((scene) => scene.id === sceneId);
  const targetIndex = index + direction;
  if (index < 0 || targetIndex < 0 || targetIndex >= story.scenes.length) return story;

  const scenes = [...story.scenes];
  [scenes[index], scenes[targetIndex]] = [scenes[targetIndex], scenes[index]];

  return {
    ...story,
    scenes
  };
}

export function removeStoryScene(story: StoryDefinition, sceneId: string) {
  return {
    ...story,
    scenes: story.scenes.filter((scene) => scene.id !== sceneId)
  };
}
