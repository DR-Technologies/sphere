import { describe, expect, it } from 'vitest';
import fs from 'node:fs/promises';
import path from 'node:path';
import { supabaseAnalyticsProvider } from '@/lib/analytics/providers/supabaseProvider';
import { buildQuickResultRecommendation } from '@/lib/quickResult/recommendation';
import { generateAutomaticStory } from './generator';

const fixturesDir = path.resolve(process.cwd(), 'tests/fixtures');

async function loadProfile(name: string, dateFormat?: 'DD/MM/YYYY') {
  const content = await fs.readFile(path.join(fixturesDir, name));
  const file = new File([content], name, { type: 'text/csv' });
  const profile = await supabaseAnalyticsProvider.profileFile(file, dateFormat ? { dateFormat } : undefined);
  const recommendation = buildQuickResultRecommendation({
    name: file.name,
    columns: profile.columns,
    stats: profile.stats
  });

  return {
    profile,
    recommendation
  };
}

describe('automatic story generator', () => {
  it('creates a simple story with intro, kpi, evolution, ranking and no race for Dataset A', async () => {
    const { profile, recommendation } = await loadProfile('dataset-a-simple.csv', 'DD/MM/YYYY');
    const story = generateAutomaticStory({
      dataset: {
        id: 'dataset-a',
        name: 'dataset-a-simple.csv',
        columns: profile.columns,
        preview: profile.preview
      },
      widgets: recommendation.widgets,
      presentation: recommendation.presentation,
      userId: 'user-1'
    });

    expect(story.scenes.map((scene) => scene.kind)).toEqual(['intro', 'kpi', 'evolution', 'ranking', 'composition']);
    expect(story.scenes.some((scene) => scene.kind === 'race')).toBe(false);
  });

  it('does not generate race for sparse temporal business datasets', async () => {
    const { profile, recommendation } = await loadProfile('dataset-b-empresarial.csv', 'DD/MM/YYYY');
    const story = generateAutomaticStory({
      dataset: {
        id: 'dataset-b',
        name: 'dataset-b-empresarial.csv',
        columns: profile.columns,
        preview: profile.preview
      },
      widgets: recommendation.widgets,
      presentation: recommendation.presentation,
      userId: 'user-1'
    });

    expect(story.scenes.some((scene) => scene.kind === 'race')).toBe(false);
    expect(story.scenes.some((scene) => scene.kind === 'ranking')).toBe(true);
  });

  it('generates race for datasets with enough temporal continuity and category coverage', async () => {
    const { profile, recommendation } = await loadProfile('dataset-c-visual.csv');
    const story = generateAutomaticStory({
      dataset: {
        id: 'dataset-c',
        name: 'dataset-c-visual.csv',
        columns: profile.columns,
        preview: profile.preview
      },
      widgets: recommendation.widgets,
      presentation: recommendation.presentation,
      userId: 'user-1'
    });

    expect(story.scenes.some((scene) => scene.kind === 'race')).toBe(true);
    expect(story.scenes.some((scene) => scene.kind === 'composition')).toBe(false);
    expect(story.scenes.length).toBeLessThanOrEqual(6);
  });

  it('creates a reasonable story without time fields', () => {
    const recommendation = buildQuickResultRecommendation({
      name: 'pipeline.csv',
      columns: [
        { name: 'Segment', type: 'VARCHAR', semanticRole: 'dimension' },
        { name: 'Revenue', type: 'DOUBLE', semanticRole: 'currency' },
        { name: 'Units', type: 'INTEGER', semanticRole: 'measure' }
      ],
      stats: [
        { column: 'Segment', type: 'VARCHAR', min: 'A', max: 'Z', total: 8, nulls: 0, unique: 4 },
        { column: 'Revenue', type: 'DOUBLE', min: 10, max: 99, total: 8, nulls: 0, unique: 8 },
        { column: 'Units', type: 'INTEGER', min: 1, max: 9, total: 8, nulls: 0, unique: 6 }
      ]
    });

    const story = generateAutomaticStory({
      dataset: {
        id: 'dataset-no-time',
        name: 'pipeline.csv',
        columns: [
          { name: 'Segment', type: 'VARCHAR', semanticRole: 'dimension' },
          { name: 'Revenue', type: 'DOUBLE', semanticRole: 'currency' },
          { name: 'Units', type: 'INTEGER', semanticRole: 'measure' }
        ],
        preview: [
          { Segment: 'SMB', Revenue: 1200 },
          { Segment: 'Mid', Revenue: 2600 },
          { Segment: 'Enterprise', Revenue: 5100 }
        ]
      },
      widgets: recommendation.widgets,
      presentation: recommendation.presentation,
      userId: 'user-1'
    });

    expect(story.scenes.map((scene) => scene.kind)).toEqual(['intro', 'kpi', 'ranking', 'composition']);
  });
});
