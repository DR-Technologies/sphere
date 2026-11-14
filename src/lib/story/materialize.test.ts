import { describe, expect, it } from 'vitest';
import { buildCompositionFrames, buildRaceFrames } from './materialize';
import { STORY_SCHEMA_VERSION, type StoryCompositionBinding, type StoryDefinition, type StoryRaceBinding } from './types';

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
  locale: 'es',
  timeZone: 'America/Bogota',
  scenes: []
};

const rows = [
  { Fecha: '2024-12-01', Categoria: 'A', Ventas: 30 },
  { Fecha: '2024-11-01', Categoria: 'A', Ventas: 75 },
  { Fecha: '2024-12-01', Categoria: 'B', Ventas: 70 },
  { Fecha: '2024-11-01', Categoria: 'B', Ventas: 25 }
];

describe('Story temporal materialization', () => {
  it('orders race frames chronologically', () => {
    const binding: StoryRaceBinding = {
      kind: 'race',
      timeField: 'Fecha',
      categoryField: 'Categoria',
      measureField: 'Ventas',
      aggregation: 'SUM',
      topN: 5
    };
    const frames = buildRaceFrames(rows, binding, story);
    expect(frames.map((frame) => frame.key)).toEqual(['2024-11-01', '2024-12-01']);
  });

  it('calculates composition shares independently for each period', () => {
    const binding: StoryCompositionBinding = {
      kind: 'composition',
      timeField: 'Fecha',
      categoryField: 'Categoria',
      measureField: 'Ventas',
      aggregation: 'SUM',
      topN: 6
    };
    const frames = buildCompositionFrames(rows, binding, story);
    expect(frames.map((frame) => frame.key)).toEqual(['2024-11-01', '2024-12-01']);
    expect(frames[0].items.find((item) => item.key === 'A')?.share).toBeCloseTo(0.75);
    expect(frames[1].items.find((item) => item.key === 'A')?.share).toBeCloseTo(0.3);
    expect(frames.every((frame) => frame.items.reduce((sum, item) => sum + item.share, 0) === 1)).toBe(true);
  });
});
