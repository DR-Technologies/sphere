import { describe, expect, it } from 'vitest';
import { createStoryExportCacheKey } from './exportCache';
import { STORY_RENDER_MODEL_VERSION, STORY_SCHEMA_VERSION, type MaterializedStory, type StoryDefinition } from './types';

const story: StoryDefinition = {
  schemaVersion: STORY_SCHEMA_VERSION,
  userId: 'user-1',
  datasetId: 'dataset-1',
  title: 'Story',
  subtitle: 'Subtitle',
  templateId: 'modern',
  motionPresetId: 'smooth',
  pacingPresetId: 'standard',
  orientation: 'landscape',
  locale: 'es',
  timeZone: 'America/Bogota',
  scenes: [{
    id: 'scene-1',
    kind: 'intro',
    renderer: 'hero-text',
    title: 'Intro',
    subtitle: 'Start',
    layout: 'hero',
    transition: 'fade',
    durationMode: 'auto',
    source: { kind: 'none' }
  }]
};

const materializedStory: MaterializedStory = {
  schemaVersion: STORY_SCHEMA_VERSION,
  renderModelVersion: STORY_RENDER_MODEL_VERSION,
  datasetId: story.datasetId,
  title: story.title,
  subtitle: story.subtitle,
  templateId: story.templateId,
  motionPresetId: story.motionPresetId,
  pacingPresetId: story.pacingPresetId,
  orientation: story.orientation,
  locale: story.locale,
  timeZone: story.timeZone,
  generatedAt: '2026-01-01T00:00:00.000Z',
  scenes: [{
    sceneId: 'scene-1',
    bindingKind: 'none',
    renderModel: {
      renderModelVersion: STORY_RENDER_MODEL_VERSION,
      sceneId: 'scene-1',
      renderer: 'hero-text',
      layout: 'hero',
      copy: { title: 'Intro', subtitle: 'Start' },
      theme: { templateId: 'modern' },
      motion: { motionPresetId: 'smooth', transition: 'fade' },
      data: {}
    }
  }]
};

describe('Story export cache key', () => {
  it('is stable across materialization timestamps and invalidates visual changes', async () => {
    const params = { story, materializedStory, orientation: 'landscape' as const, width: 1920, height: 1080, fps: 24 };
    const first = await createStoryExportCacheKey(params);
    const second = await createStoryExportCacheKey({
      ...params,
      materializedStory: { ...materializedStory, generatedAt: '2026-02-01T00:00:00.000Z' }
    });
    const changedTheme = await createStoryExportCacheKey({
      ...params,
      story: { ...story, templateId: 'dark' },
      materializedStory: { ...materializedStory, templateId: 'dark' }
    });

    expect(first).toBe(second);
    expect(changedTheme).not.toBe(first);
  });
});
