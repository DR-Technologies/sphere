import { getAnalyticsProvider } from '@/lib/analytics/provider';
import { buildWidgetQueryModel } from '@/lib/analytics/queryModel';
import { resolveWidgetVisualizationResult } from '@/lib/analytics/widgetResult';
import type { DatasetRow } from '@/lib/analytics/types';
import type { AggregationType, DatasetColumnMeta, Widget } from '@/lib/widgets/types';
import { formatStoryAxisLabel, formatStoryValue, inferStoryValueFormat } from './format';
import {
  STORY_RENDER_MODEL_VERSION,
  STORY_SCHEMA_VERSION,
  type CompositionFrame,
  type CompositionSceneRenderModel,
  type HeroSceneRenderModel,
  type KpiSceneRenderModel,
  type LineDatum,
  type LineSceneRenderModel,
  type MaterializedScene,
  type MaterializedStory,
  type RaceFrame,
  type RaceSceneRenderModel,
  type RankedDatum,
  type RankingSceneRenderModel,
  type StoryCompositionBinding,
  type StoryDefinition,
  type StoryMetricBinding,
  type StoryRaceBinding,
  type StoryRankingBinding,
  type StorySceneDefinition,
  type StorySeriesBinding,
  type VisualizationRenderModel
} from './types';

interface StoryMaterializationContext {
  columnsMeta: DatasetColumnMeta[];
  previewRows?: DatasetRow[];
}

interface SceneRenderPayload {
  data: VisualizationRenderModel['data'];
  warning?: string | null;
  emptyState?: string | null;
}

function createBaseWidget(partial: Partial<Widget> & Pick<Widget, 'type' | 'xAxis' | 'yAxis'>): Widget {
  return {
    id: partial.id || 'story-scene-widget',
    type: partial.type,
    title: partial.title || '',
    xAxis: partial.xAxis,
    yAxis: partial.yAxis,
    aggregation: partial.aggregation || 'SUM',
    x: 0,
    y: 0,
    w: 6,
    h: 4,
    orderBy: partial.orderBy,
    topN: partial.topN,
    orientation: partial.orientation,
    columns: partial.columns,
    columnAggregations: partial.columnAggregations,
    latitudeField: partial.latitudeField,
    longitudeField: partial.longitudeField,
    showCardLabel: partial.showCardLabel
  };
}

function buildBaseRenderModel(scene: StorySceneDefinition, story: StoryDefinition) {
  return {
    renderModelVersion: STORY_RENDER_MODEL_VERSION,
    sceneId: scene.id,
    layout: scene.layout,
    copy: {
      title: scene.title,
      subtitle: scene.subtitle
    },
    theme: {
      templateId: scene.templateId || story.templateId
    },
    motion: {
      motionPresetId: scene.motionPresetId || story.motionPresetId,
      transition: scene.transition
    }
  };
}

function buildHeroRenderModel(scene: StorySceneDefinition, story: StoryDefinition, payload?: SceneRenderPayload) {
  return {
    ...buildBaseRenderModel(scene, story),
    renderer: 'hero-text',
    data: {
      eyebrow: typeof scene.options?.eyebrow === 'string'
        ? scene.options.eyebrow
        : typeof (payload?.data as { eyebrow?: string } | undefined)?.eyebrow === 'string'
          ? (payload?.data as { eyebrow?: string }).eyebrow
          : undefined
    }
  } satisfies HeroSceneRenderModel;
}

function buildKpiRenderModel(scene: StorySceneDefinition, story: StoryDefinition, payload?: SceneRenderPayload) {
  const metric = payload?.data && 'metric' in payload.data
    ? (payload.data as KpiSceneRenderModel['data']).metric
    : {
      label: scene.source.kind === 'metric' ? scene.source.measureField : scene.title,
      value: 0
    };

  return {
    ...buildBaseRenderModel(scene, story),
    renderer: 'kpi-counter',
    data: { metric }
  } satisfies KpiSceneRenderModel;
}

function buildLineRenderModel(scene: StorySceneDefinition, story: StoryDefinition, payload?: SceneRenderPayload) {
  const data = payload?.data && 'points' in payload.data
    ? (payload.data as LineSceneRenderModel['data'])
    : {
      points: [],
      dimensionField: scene.source.kind === 'series' ? scene.source.dimensionField : '',
      measureField: scene.source.kind === 'series' ? scene.source.measureField : '',
      valueFormat: undefined
    };

  return {
    ...buildBaseRenderModel(scene, story),
    renderer: 'line-evolution',
    data
  } satisfies LineSceneRenderModel;
}

function buildRankingRenderModel(scene: StorySceneDefinition, story: StoryDefinition, payload?: SceneRenderPayload) {
  const data = payload?.data && 'items' in payload.data
    ? (payload.data as RankingSceneRenderModel['data'])
    : {
      items: [],
      categoryField: scene.source.kind === 'ranking' ? scene.source.categoryField : '',
      measureField: scene.source.kind === 'ranking' ? scene.source.measureField : '',
      valueFormat: undefined
    };

  return {
    ...buildBaseRenderModel(scene, story),
    renderer: 'bar-ranking',
    data
  } satisfies RankingSceneRenderModel;
}

function buildRaceRenderModel(scene: StorySceneDefinition, story: StoryDefinition, payload?: SceneRenderPayload) {
  const data = payload?.data && 'frames' in payload.data
    ? (payload.data as RaceSceneRenderModel['data'])
    : {
      timeField: scene.source.kind === 'race' ? scene.source.timeField : '',
      categoryField: scene.source.kind === 'race' ? scene.source.categoryField : '',
      measureField: scene.source.kind === 'race' ? scene.source.measureField : '',
      frames: [],
      valueFormat: undefined
    };

  return {
    ...buildBaseRenderModel(scene, story),
    renderer: 'bar-race',
    data
  } satisfies RaceSceneRenderModel;
}

function buildCompositionRenderModel(scene: StorySceneDefinition, story: StoryDefinition, payload?: SceneRenderPayload) {
  const data = payload?.data && 'frames' in payload.data
    ? (payload.data as CompositionSceneRenderModel['data'])
    : {
      frames: [],
      categoryField: scene.source.kind === 'composition' ? scene.source.categoryField : '',
      measureField: scene.source.kind === 'composition' ? scene.source.measureField : '',
      timeField: scene.source.kind === 'composition' ? scene.source.timeField : undefined,
      valueFormat: undefined
    };

  return {
    ...buildBaseRenderModel(scene, story),
    renderer: 'composition-evolution',
    data
  } satisfies CompositionSceneRenderModel;
}

function buildRenderModel(scene: StorySceneDefinition, story: StoryDefinition, payload?: SceneRenderPayload): VisualizationRenderModel {
  if (scene.renderer === 'hero-text') return buildHeroRenderModel(scene, story, payload);
  if (scene.renderer === 'kpi-counter') return buildKpiRenderModel(scene, story, payload);
  if (scene.renderer === 'line-evolution') return buildLineRenderModel(scene, story, payload);
  if (scene.renderer === 'bar-ranking') return buildRankingRenderModel(scene, story, payload);
  if (scene.renderer === 'bar-race') return buildRaceRenderModel(scene, story, payload);
  return buildCompositionRenderModel(scene, story, payload);
}

function buildMetricWidget(binding: StoryMetricBinding, sceneId: string): Widget {
  return createBaseWidget({
    id: `${sceneId}-metric`,
    type: 'card',
    xAxis: binding.labelField || binding.measureField,
    yAxis: binding.measureField,
    aggregation: binding.aggregation,
    showCardLabel: Boolean(binding.labelField)
  });
}

function buildSeriesWidget(binding: StorySeriesBinding, sceneId: string): Widget {
  return createBaseWidget({
    id: `${sceneId}-series`,
    type: 'line',
    xAxis: binding.dimensionField,
    yAxis: binding.measureField,
    aggregation: binding.aggregation,
    orderBy: 'ASC',
    topN: 60
  });
}

function buildRankingWidget(binding: StoryRankingBinding, sceneId: string): Widget {
  return createBaseWidget({
    id: `${sceneId}-ranking`,
    type: 'bar',
    xAxis: binding.categoryField,
    yAxis: binding.measureField,
    aggregation: binding.aggregation,
    orderBy: 'DESC',
    orientation: 'horizontal',
    topN: binding.topN || 7
  });
}

function buildCompositionWidget(binding: StoryCompositionBinding, sceneId: string): Widget {
  return createBaseWidget({
    id: `${sceneId}-composition`,
    type: 'pie',
    xAxis: binding.categoryField,
    yAxis: binding.measureField,
    aggregation: binding.aggregation,
    topN: binding.topN || 6
  });
}

async function resolveWidgetSceneRows(widget: Widget, columnsMeta: DatasetColumnMeta[], datasetId: string) {
  const built = buildWidgetQueryModel(widget, columnsMeta, []);
  if (!built.model) {
    return {
      rows: [] as Record<string, unknown>[],
      issue: built.issue || 'Configuración incompleta.'
    };
  }

  const result = await resolveWidgetVisualizationResult(built.model, columnsMeta, datasetId);
  return {
    rows: result.rows,
    issue: result.issue
  };
}

function rowKey(row: Record<string, unknown>, field: string) {
  return String(row[field] ?? '');
}

function normalizeNumeric(value: unknown) {
  const numeric = Number(value);
  return Number.isFinite(numeric) ? numeric : null;
}

function buildRankedItems(rows: Record<string, unknown>[], categoryField: string, measureField: string): RankedDatum[] {
  return rows
    .map((row) => {
      const value = normalizeNumeric(row[measureField]);
      const key = rowKey(row, categoryField);
      if (!key || value === null) return null;
      return {
        key,
        label: key,
        value,
        rank: 0
      };
    })
    .filter((item): item is RankedDatum => Boolean(item))
    .sort((left, right) => right.value - left.value)
    .map((item, index) => ({
      ...item,
      rank: index + 1
    }));
}

function buildCompositionItems(rows: Record<string, unknown>[], categoryField: string, measureField: string) {
  const ranked = buildRankedItems(rows, categoryField, measureField);
  const total = ranked.reduce((sum, item) => sum + item.value, 0);

  return ranked.map((item) => ({
    key: item.key,
    label: item.label,
    value: item.value,
    share: total > 0 ? item.value / total : 0
  }));
}

function buildRaceFrames(rows: Record<string, unknown>[], binding: StoryRaceBinding): RaceFrame[] {
  const grouped = new Map<string, Record<string, unknown>[]>();
  rows.forEach((row) => {
    const frameKey = rowKey(row, binding.timeField);
    if (!frameKey) return;
    const frameRows = grouped.get(frameKey) || [];
    frameRows.push(row);
    grouped.set(frameKey, frameRows);
  });

  return Array.from(grouped.entries())
    .sort((left, right) => left[0].localeCompare(right[0]))
    .map(([key, frameRows]) => ({
      key,
      label: formatStoryAxisLabel(key),
      items: buildRankedItems(frameRows, binding.categoryField, binding.measureField).slice(0, binding.topN)
    }))
    .filter((frame) => frame.items.length > 0);
}

function buildCompositionFrames(rows: Record<string, unknown>[], binding: StoryCompositionBinding): CompositionFrame[] {
  if (!binding.timeField) {
    return [{
      key: 'current',
      label: 'Actual',
      items: buildCompositionItems(rows, binding.categoryField, binding.measureField).slice(0, binding.topN || 6)
    }];
  }

  const grouped = new Map<string, Record<string, unknown>[]>();
  rows.forEach((row) => {
    const frameKey = rowKey(row, binding.timeField || '');
    if (!frameKey) return;
    const frameRows = grouped.get(frameKey) || [];
    frameRows.push(row);
    grouped.set(frameKey, frameRows);
  });

  return Array.from(grouped.entries())
    .sort((left, right) => left[0].localeCompare(right[0]))
    .map(([key, frameRows]) => ({
      key,
      label: formatStoryAxisLabel(key),
      items: buildCompositionItems(frameRows, binding.categoryField, binding.measureField).slice(0, binding.topN || 6)
    }))
    .filter((frame) => frame.items.length > 0);
}

async function runQuery(query: string, datasetId: string) {
  return getAnalyticsProvider().runQuery(query, { datasetId });
}

function buildMultiDimensionSql(params: {
  dimensionFields: string[];
  measureField: string;
  aggregation: AggregationType;
  topN?: number;
}) {
  const { dimensionFields, measureField, aggregation, topN } = params;
  const selectDimensions = dimensionFields.map((field) => `"${field}"`).join(', ');
  const safeAggregation = aggregation === 'NONE' ? 'SUM' : aggregation;
  const metricExpression = safeAggregation === 'COUNT'
    ? `COUNT("${measureField}")`
    : safeAggregation === 'DISTINCT'
      ? `COUNT(DISTINCT "${measureField}")`
      : `${safeAggregation}("${measureField}"::double precision)`;

  return `
    SELECT
      ${selectDimensions},
      ${metricExpression} as "${measureField}"
    FROM dataset
    GROUP BY ${selectDimensions}
    ORDER BY ${selectDimensions}
    ${topN ? `LIMIT ${topN}` : ''}
  `;
}

async function resolveScenePayload(scene: StorySceneDefinition, datasetId: string, columnsMeta: DatasetColumnMeta[]): Promise<SceneRenderPayload> {
  if (scene.source.kind === 'none') {
    return {
      data: {
        eyebrow: typeof scene.options?.eyebrow === 'string' ? scene.options.eyebrow : undefined
      }
    };
  }

  if (scene.source.kind === 'metric') {
    const widget = buildMetricWidget(scene.source, scene.id);
    const { rows, issue } = await resolveWidgetSceneRows(widget, columnsMeta, datasetId);
    const value = normalizeNumeric(rows[0]?.[scene.source.measureField]) || 0;
    const format = inferStoryValueFormat(columnsMeta, scene.source.measureField);

    return {
      data: {
        metric: {
          label: scene.source.labelField || scene.source.measureField,
          value,
          format,
          formattedValue: formatStoryValue(value, format)
        }
      },
      emptyState: issue
    };
  }

  if (scene.source.kind === 'series') {
    const binding = scene.source;
    const widget = buildSeriesWidget(binding, scene.id);
    const { rows, issue } = await resolveWidgetSceneRows(widget, columnsMeta, datasetId);
    const points = rows.map((row) => ({
      key: rowKey(row, binding.dimensionField),
      label: formatStoryAxisLabel(rowKey(row, binding.dimensionField)),
      value: normalizeNumeric(row[binding.measureField]) || 0
    })) satisfies LineDatum[];

    return {
      data: {
        points,
        dimensionField: binding.dimensionField,
        measureField: binding.measureField,
        valueFormat: inferStoryValueFormat(columnsMeta, binding.measureField)
      },
      emptyState: points.length === 0 ? (issue || 'No hay suficientes datos para esta evolución.') : null
    };
  }

  if (scene.source.kind === 'ranking') {
    const widget = buildRankingWidget(scene.source, scene.id);
    const { rows, issue } = await resolveWidgetSceneRows(widget, columnsMeta, datasetId);
    const items = buildRankedItems(rows, scene.source.categoryField, scene.source.measureField);

    return {
      data: {
        items,
        categoryField: scene.source.categoryField,
        measureField: scene.source.measureField,
        valueFormat: inferStoryValueFormat(columnsMeta, scene.source.measureField)
      },
      emptyState: items.length === 0 ? (issue || 'No hay suficientes categorías para este ranking.') : null
    };
  }

  if (scene.source.kind === 'race') {
    const rows = await runQuery(buildMultiDimensionSql({
      dimensionFields: [scene.source.timeField, scene.source.categoryField],
      measureField: scene.source.measureField,
      aggregation: scene.source.aggregation,
      topN: 500
    }), datasetId);
    const frames = buildRaceFrames(rows, scene.source);

    return {
      data: {
        timeField: scene.source.timeField,
        categoryField: scene.source.categoryField,
        measureField: scene.source.measureField,
        frames,
        valueFormat: inferStoryValueFormat(columnsMeta, scene.source.measureField)
      },
      emptyState: frames.length < 2 ? 'No hay suficiente variación temporal para esta carrera.' : null
    };
  }

  if (scene.source.kind === 'composition') {
    const rows = scene.source.timeField
      ? await runQuery(buildMultiDimensionSql({
        dimensionFields: [scene.source.timeField, scene.source.categoryField],
        measureField: scene.source.measureField,
        aggregation: scene.source.aggregation,
        topN: 500
      }), datasetId)
      : (await resolveWidgetSceneRows(buildCompositionWidget(scene.source, scene.id), columnsMeta, datasetId)).rows;

    const frames = buildCompositionFrames(rows, scene.source);

    return {
      data: {
        frames,
        categoryField: scene.source.categoryField,
        measureField: scene.source.measureField,
        timeField: scene.source.timeField,
        valueFormat: inferStoryValueFormat(columnsMeta, scene.source.measureField)
      },
      emptyState: frames.length === 0 ? 'No hay suficientes datos para esta composición.' : null
    };
  }

  return {
    data: {}
  };
}

async function materializeScene(scene: StorySceneDefinition, story: StoryDefinition, datasetId: string, columnsMeta: DatasetColumnMeta[]): Promise<MaterializedScene> {
  const payload = await resolveScenePayload(scene, datasetId, columnsMeta);
  return {
    sceneId: scene.id,
    bindingKind: scene.source.kind,
    renderModel: buildRenderModel(scene, story, payload),
    warning: payload.warning || null,
    emptyState: payload.emptyState || null
  };
}

export async function materializeStory(story: StoryDefinition, context: StoryMaterializationContext): Promise<MaterializedStory> {
  const scenes = await Promise.all(
    story.scenes.map((scene) => materializeScene(scene, story, story.datasetId, context.columnsMeta))
  );

  return {
    schemaVersion: STORY_SCHEMA_VERSION,
    renderModelVersion: STORY_RENDER_MODEL_VERSION,
    storyId: story.id,
    datasetId: story.datasetId,
    title: story.title,
    subtitle: story.subtitle,
    templateId: story.templateId,
    motionPresetId: story.motionPresetId,
    pacingPresetId: story.pacingPresetId,
    orientation: story.orientation,
    scenes,
    generatedAt: new Date().toISOString()
  };
}

export function recomposeMaterializedStory(story: StoryDefinition, existing: MaterializedStory): MaterializedStory {
  const existingBySceneId = new Map(existing.scenes.map((scene) => [scene.sceneId, scene]));

  return {
    ...existing,
    schemaVersion: STORY_SCHEMA_VERSION,
    renderModelVersion: STORY_RENDER_MODEL_VERSION,
    storyId: story.id,
    datasetId: story.datasetId,
    title: story.title,
    subtitle: story.subtitle,
    templateId: story.templateId,
    motionPresetId: story.motionPresetId,
    pacingPresetId: story.pacingPresetId,
    orientation: story.orientation,
    generatedAt: new Date().toISOString(),
    scenes: story.scenes.map((scene) => {
      const previous = existingBySceneId.get(scene.id);
      const data = previous?.renderModel.data || {};
      const warning = previous?.warning || null;
      const emptyState = previous?.emptyState || null;
      return {
        sceneId: scene.id,
        bindingKind: scene.source.kind,
        renderModel: buildRenderModel(scene, story, { data, warning, emptyState }),
        warning,
        emptyState
      };
    })
  };
}

export function pruneMaterializedStory(story: StoryDefinition, materializedStory: MaterializedStory) {
  const validSceneIds = new Set(
    materializedStory.scenes
      .filter((scene) => !scene.emptyState || scene.bindingKind === 'none')
      .map((scene) => scene.sceneId)
  );

  const nextScenes = story.scenes.filter((scene) => validSceneIds.has(scene.id));
  const nextStory: StoryDefinition = {
    ...story,
    scenes: nextScenes.map((scene, index) => ({
      ...scene,
      id: `scene-${index + 1}`
    }))
  };

  const nextMaterialized = recomposeMaterializedStory(nextStory, {
    ...materializedStory,
    scenes: materializedStory.scenes
      .filter((scene) => validSceneIds.has(scene.sceneId))
      .map((scene, index) => ({
        ...scene,
        sceneId: `scene-${index + 1}`,
        renderModel: {
          ...scene.renderModel,
          sceneId: `scene-${index + 1}`
        }
      }))
  });

  return {
    story: nextStory,
    materializedStory: nextMaterialized
  };
}
