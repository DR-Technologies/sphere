import {
  STORY_RENDER_MODEL_VERSION,
  STORY_SCHEMA_VERSION,
  type MaterializedStory,
  type MotionPresetId,
  type StoryDefinition,
  type StoryOrientation,
  type StoryPacingPresetId
} from './types';
import type { PresentationTemplateId } from '@/lib/visualSystem';

function createStoryDefinition(params: {
  templateId: PresentationTemplateId;
  motionPresetId: MotionPresetId;
  orientation: StoryOrientation;
  pacingPresetId?: StoryPacingPresetId;
}) {
  const { templateId, motionPresetId, orientation, pacingPresetId = 'standard' } = params;

  return {
    schemaVersion: STORY_SCHEMA_VERSION,
    userId: 'harness-user',
    datasetId: 'harness-dataset',
    title: 'Sphere M2 Playback Spike',
    subtitle: 'Intro, KPI y Line Evolution con clock determinístico.',
    templateId,
    motionPresetId,
    pacingPresetId,
    orientation,
    scenes: [
      {
        id: 'scene-1',
        kind: 'intro',
        renderer: 'hero-text',
        title: 'Sphere Story',
        subtitle: 'Una historia visual controlada por tiempo global.',
        layout: 'hero',
        transition: 'fade',
        durationMode: 'fixed',
        durationMs: 2600,
        source: { kind: 'none' },
        options: { eyebrow: 'Playback Harness' }
      },
      {
        id: 'scene-2',
        kind: 'kpi',
        renderer: 'kpi-counter',
        title: 'Ingresos totales',
        subtitle: 'SUM(Revenue)',
        layout: 'focus',
        transition: 'lift',
        durationMode: 'fixed',
        durationMs: 3400,
        source: {
          kind: 'metric',
          measureField: 'Revenue',
          aggregation: 'SUM',
          labelField: 'Total'
        }
      },
      {
        id: 'scene-3',
        kind: 'evolution',
        renderer: 'line-evolution',
        title: 'Revenue por mes',
        subtitle: 'SUM(Revenue) por Month',
        layout: 'focus',
        transition: 'slide',
        durationMode: 'fixed',
        durationMs: 4200,
        source: {
          kind: 'series',
          dimensionField: 'Month',
          measureField: 'Revenue',
          aggregation: 'SUM'
        }
      }
    ]
  } satisfies StoryDefinition;
}

export function createStoryHarnessFixture(params?: {
  templateId?: PresentationTemplateId;
  motionPresetId?: MotionPresetId;
  orientation?: StoryOrientation;
}) {
  const templateId = params?.templateId || 'modern';
  const motionPresetId = params?.motionPresetId || 'smooth';
  const orientation = params?.orientation || 'landscape';
  const story = createStoryDefinition({ templateId, motionPresetId, orientation });

  const materializedStory: MaterializedStory = {
    schemaVersion: STORY_SCHEMA_VERSION,
    renderModelVersion: STORY_RENDER_MODEL_VERSION,
    storyId: 'harness-story',
    datasetId: story.datasetId,
    title: story.title,
    subtitle: story.subtitle,
    templateId: story.templateId,
    motionPresetId: story.motionPresetId,
    pacingPresetId: story.pacingPresetId,
    orientation: story.orientation,
    generatedAt: '2026-07-28T12:00:00.000Z',
    scenes: [
      {
        sceneId: 'scene-1',
        bindingKind: 'none',
        emptyState: null,
        renderModel: {
          renderModelVersion: STORY_RENDER_MODEL_VERSION,
          sceneId: 'scene-1',
          renderer: 'hero-text',
          layout: 'hero',
          copy: {
            title: 'Sphere Story',
            subtitle: 'Una historia visual controlada por tiempo global.'
          },
          theme: {
            templateId
          },
          motion: {
            motionPresetId,
            transition: 'fade'
          },
          data: {
            eyebrow: 'Playback Harness'
          }
        }
      },
      {
        sceneId: 'scene-2',
        bindingKind: 'metric',
        emptyState: null,
        renderModel: {
          renderModelVersion: STORY_RENDER_MODEL_VERSION,
          sceneId: 'scene-2',
          renderer: 'kpi-counter',
          layout: 'focus',
          copy: {
            title: 'Ingresos totales',
            subtitle: 'SUM(Revenue)'
          },
          theme: {
            templateId
          },
          motion: {
            motionPresetId,
            transition: 'lift'
          },
          data: {
            metric: {
              label: 'Revenue',
              value: 465100,
              formattedValue: '465.100'
            }
          }
        }
      },
      {
        sceneId: 'scene-3',
        bindingKind: 'series',
        emptyState: null,
        renderModel: {
          renderModelVersion: STORY_RENDER_MODEL_VERSION,
          sceneId: 'scene-3',
          renderer: 'line-evolution',
          layout: 'focus',
          copy: {
            title: 'Revenue por mes',
            subtitle: 'SUM(Revenue) por Month'
          },
          theme: {
            templateId
          },
          motion: {
            motionPresetId,
            transition: 'slide'
          },
          data: {
            dimensionField: 'Month',
            measureField: 'Revenue',
            points: [
              { key: '2026-01', label: 'Jan', value: 42000 },
              { key: '2026-02', label: 'Feb', value: 56000 },
              { key: '2026-03', label: 'Mar', value: 61000 },
              { key: '2026-04', label: 'Apr', value: 74000 },
              { key: '2026-05', label: 'May', value: 98000 },
              { key: '2026-06', label: 'Jun', value: 134100 }
            ]
          }
        }
      }
    ]
  };

  return {
    story,
    materializedStory
  };
}
