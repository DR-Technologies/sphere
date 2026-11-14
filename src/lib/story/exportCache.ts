import type { MaterializedStory, StoryDefinition, StoryOrientation } from './types';

function stableSerialize(value: unknown): string {
  if (value === null || typeof value !== 'object') return JSON.stringify(value);
  if (Array.isArray(value)) return `[${value.map(stableSerialize).join(',')}]`;

  const record = value as Record<string, unknown>;
  return `{${Object.keys(record)
    .sort()
    .map((key) => `${JSON.stringify(key)}:${stableSerialize(record[key])}`)
    .join(',')}}`;
}

export async function createStoryExportCacheKey(params: {
  story: StoryDefinition;
  materializedStory: MaterializedStory;
  orientation: StoryOrientation;
  width: number;
  height: number;
  fps: number;
}) {
  const payload = stableSerialize({
    profile: 'sphere-mp4-v1',
    orientation: params.orientation,
    width: params.width,
    height: params.height,
    fps: params.fps,
    story: {
      schemaVersion: params.story.schemaVersion,
      title: params.story.title,
      subtitle: params.story.subtitle,
      templateId: params.story.templateId,
      motionPresetId: params.story.motionPresetId,
      pacingPresetId: params.story.pacingPresetId,
      locale: params.story.locale,
      timeZone: params.story.timeZone,
      scenes: params.story.scenes
    },
    materializedStory: {
      schemaVersion: params.materializedStory.schemaVersion,
      renderModelVersion: params.materializedStory.renderModelVersion,
      templateId: params.materializedStory.templateId,
      motionPresetId: params.materializedStory.motionPresetId,
      pacingPresetId: params.materializedStory.pacingPresetId,
      locale: params.materializedStory.locale,
      timeZone: params.materializedStory.timeZone,
      scenes: params.materializedStory.scenes
    }
  });
  const digest = await crypto.subtle.digest('SHA-256', new TextEncoder().encode(payload));
  return Array.from(new Uint8Array(digest), (byte) => byte.toString(16).padStart(2, '0')).join('');
}
