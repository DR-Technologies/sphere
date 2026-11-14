import { summarizeSemantics } from '@/lib/analytics/semantics';
import type { DatasetRow } from '@/lib/analytics/types';
import type { DatasetColumnMeta, ReportPresentation, Widget } from '@/lib/widgets/types';
import {
  STORY_SCHEMA_VERSION,
  type MotionPresetId,
  type StoryDefinition,
  type StoryLocale,
  type StoryPacingPresetId,
  type StorySceneDefinition
} from './types';

interface StoryGenerationDataset {
  id: string;
  name: string;
  columns: DatasetColumnMeta[];
  preview?: DatasetRow[];
}

interface StoryFieldHints {
  primaryMeasure: string;
  primaryDate: string;
  primaryCategory: string;
  compositionCategory: string;
  compositionTimeField: string;
}

interface RaceFeasibility {
  timeField: string;
  categoryField: string;
  measureField: string;
}

function storySceneId(index: number) {
  return `scene-${index + 1}`;
}

function cleanDatasetName(name: string) {
  return name.replace(/\.(csv|json|xlsx|xls)$/i, '').trim();
}

function buildStoryTitle(reportTitle: string, datasetName: string) {
  return reportTitle?.trim() || cleanDatasetName(datasetName);
}

function buildSceneCopy(title: string, fallbackSubtitle: string) {
  return {
    title,
    subtitle: fallbackSubtitle
  };
}

function getGeneratedStoryCopy(locale: StoryLocale) {
  if (locale === 'en') {
    return {
      introSubtitle: 'An automatic visual story ready to present.',
      storySubtitle: 'Automatic story created from Quick Result.',
      kpiSubtitle: (measure: string) => `Overview of ${measure}.`,
      evolutionTitle: (measure: string, date: string) => `${measure} by ${date}`,
      evolutionSubtitle: (measure: string) => `Temporal evolution of ${measure}.`,
      rankingTitle: (category: string, measure: string) => `${category} by ${measure}`,
      rankingSubtitle: (category: string, measure: string) => `Ranking of ${category} by ${measure}.`,
      raceTitle: (measure: string) => `${measure} in motion`,
      raceSubtitle: (category: string, time: string) => `${category} over ${time}.`,
      compositionTitle: (measure: string) => `Share of ${measure}`,
      compositionSubtitle: (measure: string, category: string) => `How ${measure} is distributed by ${category}.`
    };
  }
  return {
    introSubtitle: 'Una historia visual automática lista para presentar.',
    storySubtitle: 'Historia automática creada desde Quick Result.',
    kpiSubtitle: (measure: string) => `Visión general de ${measure}.`,
    evolutionTitle: (measure: string, date: string) => `${measure} por ${date}`,
    evolutionSubtitle: (measure: string) => `Evolución temporal de ${measure}.`,
    rankingTitle: (category: string, measure: string) => `${category} por ${measure}`,
    rankingSubtitle: (category: string, measure: string) => `Ranking de ${category} según ${measure}.`,
    raceTitle: (measure: string) => `${measure} en movimiento`,
    raceSubtitle: (category: string, time: string) => `${category} a través de ${time}.`,
    compositionTitle: (measure: string) => `Participación de ${measure}`,
    compositionSubtitle: (measure: string, category: string) => `Cómo se distribuye ${measure} por ${category}.`
  };
}

function isMeaningfulValue(value: unknown) {
  return value !== null && value !== undefined && String(value).trim() !== '';
}

function buildFieldHints(dataset: StoryGenerationDataset, widgets: Widget[]): StoryFieldHints {
  const semantics = summarizeSemantics(dataset.columns);
  const primaryMeasure =
    semantics.currencies[0]
    || semantics.measures[0]
    || semantics.percentages[0]
    || widgets.find((widget) => widget.yAxis)?.yAxis
    || dataset.columns[0]?.name
    || '';
  const primaryDate =
    semantics.datetimes[0]
    || widgets.find((widget) => widget.type === 'line' || widget.type === 'area')?.xAxis
    || '';
  const categoricalDimensions = semantics.dimensions.filter((column) => column !== primaryDate && column !== primaryMeasure && !semantics.identifiers.includes(column));
  const primaryCategory =
    widgets.find((widget) => widget.type === 'bar')?.xAxis
    || categoricalDimensions[0]
    || semantics.geographies[0]
    || '';
  const compositionCategory =
    widgets.find((widget) => widget.type === 'pie' || widget.type === 'treemap')?.xAxis
    || categoricalDimensions.find((column) => column !== primaryCategory)
    || primaryCategory;

  return {
    primaryMeasure,
    primaryDate,
    primaryCategory,
    compositionCategory,
    compositionTimeField: primaryDate
  };
}

function getPreviewDistinctValues(rows: DatasetRow[], field: string) {
  return Array.from(new Set(rows.map((row) => row?.[field]).filter(isMeaningfulValue).map((value) => String(value))));
}

function getRaceCandidate(dataset: StoryGenerationDataset, hints: StoryFieldHints): RaceFeasibility | null {
  if (!dataset.preview?.length) return null;
  if (!hints.primaryDate || !hints.primaryCategory || !hints.primaryMeasure) return null;

  const periods = getPreviewDistinctValues(dataset.preview, hints.primaryDate);
  const categories = getPreviewDistinctValues(dataset.preview, hints.primaryCategory);
  if (periods.length < 4 || categories.length < 2) return null;

  const categoriesPerPeriod = new Map<string, Set<string>>();
  const valuesByCategory = new Map<string, number[]>();

  dataset.preview.forEach((row) => {
    const period = row[hints.primaryDate];
    const category = row[hints.primaryCategory];
    const measure = row[hints.primaryMeasure];

    if (!isMeaningfulValue(period) || !isMeaningfulValue(category) || !isMeaningfulValue(measure)) return;
    const numericValue = Number(measure);
    if (!Number.isFinite(numericValue)) return;

    const periodKey = String(period);
    const categoryKey = String(category);
    const periodSet = categoriesPerPeriod.get(periodKey) || new Set<string>();
    periodSet.add(categoryKey);
    categoriesPerPeriod.set(periodKey, periodSet);

    const series = valuesByCategory.get(categoryKey) || [];
    series.push(numericValue);
    valuesByCategory.set(categoryKey, series);
  });

  const averageCategoriesPerPeriod = Array.from(categoriesPerPeriod.values()).reduce((sum, set) => sum + set.size, 0) / Math.max(1, categoriesPerPeriod.size);
  const varyingCategories = Array.from(valuesByCategory.values()).filter((series) => new Set(series.map((value) => value.toFixed(4))).size >= 3).length;

  if (averageCategoriesPerPeriod < 2 || varyingCategories < 2) {
    return null;
  }

  return {
    timeField: hints.primaryDate,
    categoryField: hints.primaryCategory,
    measureField: hints.primaryMeasure
  };
}

function supportsComposition(dataset: StoryGenerationDataset, hints: StoryFieldHints) {
  if (!hints.compositionCategory || !hints.primaryMeasure) return false;
  const categoryColumn = dataset.columns.find((column) => column.name === hints.compositionCategory);
  if (!categoryColumn) return false;
  const uniqueCount = dataset.preview?.length ? getPreviewDistinctValues(dataset.preview, hints.compositionCategory).length : 0;
  return uniqueCount === 0 || uniqueCount <= 8;
}

function pushScene(scenes: StorySceneDefinition[], scene: Omit<StorySceneDefinition, 'id'>) {
  scenes.push({
    id: storySceneId(scenes.length),
    ...scene
  });
}

export function generateAutomaticStory(params: {
  dataset: StoryGenerationDataset;
  widgets: Widget[];
  presentation: ReportPresentation;
  userId: string;
  sourceReportId?: string | null;
  motionPresetId?: MotionPresetId;
  pacingPresetId?: StoryPacingPresetId;
  locale?: StoryLocale;
  timeZone?: string;
}): StoryDefinition {
  const {
    dataset,
    widgets,
    presentation,
    userId,
    sourceReportId = null,
    motionPresetId = 'smooth',
    pacingPresetId = 'standard',
    locale = 'es',
    timeZone = 'UTC'
  } = params;

  const hints = buildFieldHints(dataset, widgets);
  const storyTitle = buildStoryTitle(presentation.title, dataset.name);
  const scenes: StorySceneDefinition[] = [];
  const canShowRace = getRaceCandidate(dataset, hints);
  const canShowComposition = supportsComposition(dataset, hints);
  const copy = getGeneratedStoryCopy(locale);

  pushScene(scenes, {
    kind: 'intro',
    renderer: 'hero-text',
    ...buildSceneCopy(storyTitle, presentation.subtitle || copy.introSubtitle),
    layout: 'hero',
    transition: 'fade',
    durationMode: 'auto',
    source: { kind: 'none' },
    options: { eyebrow: 'Sphere Story' }
  });

  if (hints.primaryMeasure) {
    pushScene(scenes, {
      kind: 'kpi',
      renderer: 'kpi-counter',
      ...buildSceneCopy(hints.primaryMeasure, copy.kpiSubtitle(hints.primaryMeasure)),
      layout: 'focus',
      transition: 'lift',
      durationMode: 'auto',
      source: {
        kind: 'metric',
        measureField: hints.primaryMeasure,
        aggregation: 'SUM',
        labelField: hints.primaryCategory || undefined,
        sourceWidgetId: widgets.find((widget) => widget.type === 'card')?.id
      }
    });
  }

  if (hints.primaryDate && hints.primaryMeasure) {
    pushScene(scenes, {
      kind: 'evolution',
      renderer: 'line-evolution',
      ...buildSceneCopy(copy.evolutionTitle(hints.primaryMeasure, hints.primaryDate), copy.evolutionSubtitle(hints.primaryMeasure)),
      layout: 'focus',
      transition: 'fade',
      durationMode: 'auto',
      source: {
        kind: 'series',
        dimensionField: hints.primaryDate,
        measureField: hints.primaryMeasure,
        aggregation: 'SUM',
        sourceWidgetId: widgets.find((widget) => widget.type === 'line' || widget.type === 'area')?.id
      }
    });
  }

  if (hints.primaryCategory && hints.primaryMeasure) {
    pushScene(scenes, {
      kind: 'ranking',
      renderer: 'bar-ranking',
      ...buildSceneCopy(copy.rankingTitle(hints.primaryCategory, hints.primaryMeasure), copy.rankingSubtitle(hints.primaryCategory, hints.primaryMeasure)),
      layout: 'focus',
      transition: 'slide',
      durationMode: 'auto',
      source: {
        kind: 'ranking',
        categoryField: hints.primaryCategory,
        measureField: hints.primaryMeasure,
        aggregation: 'SUM',
        topN: 7,
        sourceWidgetId: widgets.find((widget) => widget.type === 'bar')?.id
      }
    });
  }

  if (canShowRace) {
    pushScene(scenes, {
      kind: 'race',
      renderer: 'bar-race',
      ...buildSceneCopy(copy.raceTitle(canShowRace.measureField), copy.raceSubtitle(canShowRace.categoryField, canShowRace.timeField)),
      layout: 'focus',
      transition: 'slide',
      durationMode: 'auto',
      source: {
        kind: 'race',
        timeField: canShowRace.timeField,
        categoryField: canShowRace.categoryField,
        measureField: canShowRace.measureField,
        aggregation: 'SUM',
        topN: 5
      }
    });
  }

  if (canShowComposition && hints.compositionCategory && hints.primaryMeasure && (!canShowRace || getPreviewDistinctValues(dataset.preview || [], hints.compositionCategory).length > 3)) {
    pushScene(scenes, {
      kind: 'composition',
      renderer: 'composition-evolution',
      ...buildSceneCopy(copy.compositionTitle(hints.primaryMeasure), copy.compositionSubtitle(hints.primaryMeasure, hints.compositionCategory)),
      layout: 'split',
      transition: 'fade',
      durationMode: 'auto',
      source: {
        kind: 'composition',
        categoryField: hints.compositionCategory,
        measureField: hints.primaryMeasure,
        aggregation: 'SUM',
        timeField: hints.compositionTimeField || undefined,
        topN: 6,
        sourceWidgetId: widgets.find((widget) => widget.type === 'pie' || widget.type === 'treemap')?.id
      }
    });
  }

  const limitedScenes = scenes.slice(0, 6).map((scene, index) => ({
    ...scene,
    id: storySceneId(index)
  }));

  return {
    schemaVersion: STORY_SCHEMA_VERSION,
    userId,
    datasetId: dataset.id,
    sourceReportId,
    title: storyTitle,
    subtitle: presentation.subtitle || copy.storySubtitle,
    templateId: presentation.templateId,
    motionPresetId,
    pacingPresetId,
    orientation: 'landscape',
    locale,
    timeZone,
    scenes: limitedScenes
  };
}
