import { describe, expect, it } from 'vitest';
import { getTemplateTokens } from '@/lib/visualSystem';
import { generateAutomaticStory } from './generator';
import { materializeStory } from './materialize';
import { STORY_RENDER_MODEL_VERSION, STORY_SCHEMA_VERSION } from './types';

describe('story contracts', () => {
  it('generates a story definition without persisting widget objects inside scenes', () => {
    const story = generateAutomaticStory({
      dataset: {
        id: 'dataset-1',
        name: 'ventas.csv',
        columns: [
          { name: 'Fecha', type: 'DATE', semanticRole: 'datetime' },
          { name: 'Categoria', type: 'VARCHAR', semanticRole: 'dimension' },
          { name: 'Ventas', type: 'DOUBLE', semanticRole: 'measure' }
        ]
      },
      widgets: [
        {
          id: 'card-1',
          type: 'card',
          title: 'Ventas',
          xAxis: 'Categoria',
          yAxis: 'Ventas',
          aggregation: 'SUM',
          x: 0,
          y: 0,
          w: 4,
          h: 2
        },
        {
          id: 'line-1',
          type: 'line',
          title: 'Ventas por Fecha',
          xAxis: 'Fecha',
          yAxis: 'Ventas',
          aggregation: 'SUM',
          x: 0,
          y: 0,
          w: 6,
          h: 3
        },
        {
          id: 'bar-1',
          type: 'bar',
          title: 'Ventas por Categoria',
          xAxis: 'Categoria',
          yAxis: 'Ventas',
          aggregation: 'SUM',
          x: 0,
          y: 0,
          w: 6,
          h: 3
        }
      ],
      presentation: {
        title: 'Ventas 2026',
        subtitle: 'Resumen automático',
        templateId: 'modern',
        source: 'quick-result'
      },
      userId: 'user-1',
      sourceReportId: 'report-1'
    });

    expect(story.schemaVersion).toBe(STORY_SCHEMA_VERSION);
    expect(story.sourceReportId).toBe('report-1');
    expect(story.templateId).toBe('modern');
    expect(story.scenes.length).toBeGreaterThanOrEqual(4);
    expect(story.scenes.some((scene) => scene.source.kind === 'metric')).toBe(true);
    expect(story.scenes.every((scene) => !('widget' in scene.source))).toBe(true);
  });

  it('materializes a story using render models with explicit versions and template tokens', async () => {
    const story = {
      schemaVersion: STORY_SCHEMA_VERSION,
      userId: 'user-1',
      datasetId: 'dataset-1',
      title: 'Story',
      subtitle: 'Subtitle',
      templateId: 'editorial' as const,
      motionPresetId: 'smooth' as const,
      pacingPresetId: 'standard' as const,
      orientation: 'landscape' as const,
      scenes: [
        {
          id: 'scene-1',
          kind: 'intro' as const,
          renderer: 'hero-text' as const,
          title: 'Intro',
          subtitle: 'Start',
          layout: 'hero' as const,
          transition: 'fade' as const,
          durationMode: 'auto' as const,
          source: { kind: 'none' as const }
        }
      ]
    };

    const materialized = await materializeStory(story, { columnsMeta: [] });

    expect(materialized.renderModelVersion).toBe(STORY_RENDER_MODEL_VERSION);
    expect(materialized.scenes).toHaveLength(1);
    expect(materialized.scenes[0].renderModel.theme.templateId).toBe('editorial');
    expect(getTemplateTokens(materialized.templateId).accent).toBeTruthy();
  });
});
