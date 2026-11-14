import { describe, expect, it } from 'vitest';
import { getStoryFrameState } from './playback';
import { resolveVisibleSceneLayers } from './renderState';
import { STORY_RENDER_MODEL_VERSION, STORY_SCHEMA_VERSION, type MaterializedStory, type StoryDefinition } from './types';

const story: StoryDefinition = {
  schemaVersion: STORY_SCHEMA_VERSION,
  userId: 'user-1',
  datasetId: 'dataset-1',
  title: 'Story',
  subtitle: '',
  templateId: 'modern',
  motionPresetId: 'smooth',
  pacingPresetId: 'standard',
  orientation: 'landscape',
  scenes: [
    { id: 'intro', kind: 'intro', renderer: 'hero-text', title: 'Intro', subtitle: '', layout: 'hero', transition: 'fade', durationMode: 'fixed', durationMs: 2000, source: { kind: 'none' } },
    { id: 'kpi', kind: 'kpi', renderer: 'kpi-counter', title: 'KPI', subtitle: '', layout: 'focus', transition: 'lift', durationMode: 'fixed', durationMs: 2000, source: { kind: 'metric', measureField: 'Ventas', aggregation: 'SUM' } }
  ]
};

const materialized: MaterializedStory = {
  schemaVersion: STORY_SCHEMA_VERSION,
  renderModelVersion: STORY_RENDER_MODEL_VERSION,
  datasetId: story.datasetId,
  title: story.title,
  subtitle: '',
  templateId: 'modern',
  motionPresetId: 'smooth',
  pacingPresetId: 'standard',
  orientation: 'landscape',
  generatedAt: '2026-01-01T00:00:00.000Z',
  scenes: [
    { sceneId: 'intro', bindingKind: 'none', renderModel: { renderModelVersion: STORY_RENDER_MODEL_VERSION, sceneId: 'intro', renderer: 'hero-text', layout: 'hero', copy: { title: 'Intro', subtitle: '' }, theme: { templateId: 'modern' }, motion: { motionPresetId: 'smooth', transition: 'fade' }, data: {} } },
    { sceneId: 'kpi', bindingKind: 'metric', renderModel: { renderModelVersion: STORY_RENDER_MODEL_VERSION, sceneId: 'kpi', renderer: 'kpi-counter', layout: 'focus', copy: { title: 'KPI', subtitle: '' }, theme: { templateId: 'modern' }, motion: { motionPresetId: 'smooth', transition: 'lift' }, data: { metric: { label: 'Ventas', value: 100 } } } }
  ]
};

describe('Story transition compositing', () => {
  it('derives deterministic complementary layer opacity during overlap', () => {
    const frame = getStoryFrameState(story, 1990);
    const first = resolveVisibleSceneLayers(materialized, frame);
    const second = resolveVisibleSceneLayers(materialized, getStoryFrameState(story, 1990));

    expect(first).toEqual(second);
    if (first.length === 2) {
      expect(first[0].opacity + first[1].opacity).toBeCloseTo(1, 5);
      expect(first.every((layer) => layer.opacity <= 1)).toBe(true);
    }
  });
});
