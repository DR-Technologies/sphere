import type { ChartType } from '@/components/visuals/ChartRenderer';
import { annotateDatasetColumns, summarizeSemantics, type DatasetSemanticSummary } from '@/lib/analytics/semantics';
import type { DatasetColumn, DatasetColumnStat } from '@/lib/analytics/types';
import type { AggregationType, Widget } from '@/lib/widgets/types';

export interface VisualizationPlanningDataset {
  name: string;
  columns: DatasetColumn[];
  stats: DatasetColumnStat[];
}

export type VisualizationIntent =
  | 'primary-kpi'
  | 'record-count'
  | 'distinct-count'
  | 'trend'
  | 'ranking'
  | 'composition'
  | 'geography'
  | 'detail';

export interface VisualizationScoreBreakdown {
  compatibility: number;
  analyticalRelevance: number;
  dataQuality: number;
  clarity: number;
  visualAppeal: number;
  diversity: number;
}

export interface VisualizationBinding {
  dimension?: string;
  measure: string;
  aggregation: AggregationType;
  groupBy: string[];
  orderBy?: 'ASC' | 'DESC';
  topN?: number;
}

export interface PlannedVisualization {
  id: string;
  intent: VisualizationIntent;
  visualType: ChartType;
  binding: VisualizationBinding;
  title: string;
  score: number;
  scoreBreakdown: VisualizationScoreBreakdown;
  reason: string;
  widget: Widget;
}

export interface VisualizationPlan {
  recommendations: PlannedVisualization[];
  semanticColumns: DatasetColumn[];
  semantics: DatasetSemanticSummary;
}

export interface VisualizationPlanner {
  plan(dataset: VisualizationPlanningDataset): VisualizationPlan;
}

interface ColumnFact {
  column: DatasetColumn;
  stat?: DatasetColumnStat;
  nullRatio: number;
  uniqueRatio: number;
}

interface CandidateSpec {
  id: string;
  intent: VisualizationIntent;
  type: ChartType;
  dimension?: string;
  measure: string;
  aggregation: AggregationType;
  title: string;
  reason: string;
  compatibility: number;
  analyticalRelevance: number;
  dataQuality: number;
  clarity: number;
  visualAppeal: number;
  orderBy?: 'ASC' | 'DESC';
  topN?: number;
  orientation?: 'vertical' | 'horizontal';
  columns?: string[];
  latitudeField?: string;
  longitudeField?: string;
}

const NUMERIC_TYPES = new Set(['INTEGER', 'BIGINT', 'DOUBLE', 'DECIMAL', 'NUMERIC', 'REAL', 'SMALLINT']);
const MAX_RECOMMENDATIONS = 9;
const MIN_RECOMMENDATION_SCORE = 58;

function clampScore(value: number) {
  return Math.max(0, Math.min(100, Math.round(value)));
}

function normalizeName(name: string) {
  return name
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '')
    .replace(/([a-z0-9])([A-Z])/g, '$1 $2')
    .replace(/[^a-zA-Z0-9]+/g, ' ')
    .trim()
    .toLowerCase();
}

function uniqueNames(values: Array<string | undefined>) {
  return Array.from(new Set(values.filter((value): value is string => Boolean(value))));
}

function buildFacts(columns: DatasetColumn[], stats: DatasetColumnStat[]) {
  const statsByColumn = new Map(stats.map((stat) => [stat.column, stat]));
  return columns.map<ColumnFact>((column) => {
    const stat = statsByColumn.get(column.name);
    const total = stat?.total || 0;
    return {
      column,
      stat,
      nullRatio: total > 0 ? (stat?.nulls || 0) / total : 0,
      uniqueRatio: total > 0 ? (stat?.unique || 0) / total : 0
    };
  });
}

function qualityScore(fact?: ColumnFact) {
  if (!fact) return 55;
  const completeness = 100 - fact.nullRatio * 100;
  const hasVariation = (fact.stat?.unique || 0) > 1 ? 100 : 35;
  return clampScore(completeness * 0.75 + hasVariation * 0.25);
}

function measurePriority(fact: ColumnFact) {
  const role = fact.column.semanticRole;
  const semantic = role === 'currency' ? 100 : role === 'measure' ? 86 : role === 'percentage' ? 78 : 0;
  return semantic + qualityScore(fact) * 0.2 - fact.nullRatio * 30;
}

function dimensionPriority(fact: ColumnFact, mode: 'ranking' | 'composition') {
  const unique = fact.stat?.unique || 0;
  const total = fact.stat?.total || 0;
  if (unique < 2 || fact.nullRatio >= 0.7) return -1;
  if (!['dimension', 'geography', 'boolean'].includes(fact.column.semanticRole || '')) return -1;
  if (/^(lat|latitude|latitud|lon|lng|longitude|longitud)$/.test(normalizeName(fact.column.name).replace(/\s/g, ''))) return -1;

  if (mode === 'composition') {
    if (unique > 12) return -1;
    return 110 - unique * 2 - fact.nullRatio * 40;
  }

  const practicalLimit = Math.max(50, Math.min(1_000, Math.round(total * 0.2)));
  if (unique > practicalLimit) return -1;
  const cardinalityScore = unique <= 20 ? 100 : unique <= 100 ? 88 : unique <= 500 ? 74 : 62;
  return cardinalityScore - fact.nullRatio * 35 - fact.uniqueRatio * 10;
}

function datePriority(fact: ColumnFact) {
  const unique = fact.stat?.unique || 0;
  if (fact.column.semanticRole !== 'datetime' || unique < 2 || fact.nullRatio >= 0.7) return -1;
  return qualityScore(fact) + Math.min(12, Math.log2(unique + 1));
}

function coordinateKind(columnName: string) {
  const compact = normalizeName(columnName).replace(/\s/g, '');
  if (/^(lat|latitude|latitud)$/.test(compact)) return 'latitude';
  if (/^(lon|lng|longitude|longitud)$/.test(compact)) return 'longitude';
  return null;
}

function numericRangeIsValid(fact: ColumnFact | undefined, min: number, max: number) {
  if (!fact || !NUMERIC_TYPES.has(fact.column.type.toUpperCase())) return false;
  const lower = Number(fact.stat?.min);
  const upper = Number(fact.stat?.max);
  return Number.isFinite(lower) && Number.isFinite(upper) && lower >= min && upper <= max;
}

function aggregationForMeasure(fact: ColumnFact) {
  return fact.column.semanticRole === 'percentage' ? 'AVG' as const : 'SUM' as const;
}

function scoreCandidate(candidate: CandidateSpec, diversity: number): VisualizationScoreBreakdown {
  return {
    compatibility: clampScore(candidate.compatibility),
    analyticalRelevance: clampScore(candidate.analyticalRelevance),
    dataQuality: clampScore(candidate.dataQuality),
    clarity: clampScore(candidate.clarity),
    visualAppeal: clampScore(candidate.visualAppeal),
    diversity: clampScore(diversity)
  };
}

function totalScore(score: VisualizationScoreBreakdown) {
  return clampScore(
    score.compatibility * 0.25
    + score.analyticalRelevance * 0.25
    + score.dataQuality * 0.2
    + score.clarity * 0.15
    + score.visualAppeal * 0.1
    + score.diversity * 0.05
  );
}

function candidateBaseScore(candidate: CandidateSpec) {
  return totalScore(scoreCandidate(candidate, 100));
}

function widgetFromCandidate(candidate: CandidateSpec, index: number): Widget {
  const dimension = candidate.type === 'map' ? (candidate.dimension || '') : (candidate.dimension || candidate.measure);
  return {
    id: `quick-${index + 1}`,
    type: candidate.type,
    title: candidate.title,
    xAxis: dimension,
    yAxis: candidate.measure,
    aggregation: candidate.aggregation,
    x: 0,
    y: 0,
    w: candidate.type === 'card' ? 4 : candidate.type === 'table' ? 12 : candidate.type === 'map' ? 12 : 6,
    h: candidate.type === 'card' ? 2 : candidate.type === 'table' || candidate.type === 'map' ? 4 : 3,
    orderBy: candidate.orderBy,
    topN: candidate.topN,
    orientation: candidate.orientation,
    colorScheme: 'varied',
    colorByCategory: true,
    showLegend: candidate.type !== 'card' && candidate.type !== 'map' && candidate.type !== 'table' && candidate.type !== 'treemap',
    showTooltip: candidate.type !== 'card' && candidate.type !== 'table',
    showDataLabels: candidate.type === 'pie' || candidate.type === 'treemap',
    numberFormat: 'standard',
    dateDisplayFormat: 'default',
    columns: candidate.columns,
    latitudeField: candidate.latitudeField,
    longitudeField: candidate.longitudeField,
    showWidgetTitle: true,
    showWidgetSubtitle: candidate.type !== 'card',
    showCardLabel: candidate.type === 'card' ? true : undefined,
    cardValueSize: candidate.type === 'card' ? 'large' : undefined
  };
}

function bindingKey(candidate: CandidateSpec) {
  const analysisFamily = ['bar', 'pie', 'treemap'].includes(candidate.type) ? 'categorical' : candidate.type;
  return [analysisFamily, candidate.dimension || '', candidate.measure, candidate.aggregation].join('|');
}

function chooseCandidates(candidates: CandidateSpec[]) {
  const ordered = [...candidates].sort((left, right) => (
    candidateBaseScore(right) - candidateBaseScore(left)
    || left.id.localeCompare(right.id)
  ));
  const selected: Array<{ candidate: CandidateSpec; score: VisualizationScoreBreakdown; total: number }> = [];

  for (const candidate of ordered) {
    if (selected.length >= MAX_RECOMMENDATIONS) break;
    const duplicateBinding = selected.some((item) => bindingKey(item.candidate) === bindingKey(candidate));
    const duplicateIntent = selected.some((item) => item.candidate.intent === candidate.intent);
    const repeatedType = selected.some((item) => item.candidate.type === candidate.type);
    const diversity = duplicateBinding ? 20 : duplicateIntent ? 55 : repeatedType ? 75 : 100;
    const score = scoreCandidate(candidate, diversity);
    const total = totalScore(score);

    if (total < MIN_RECOMMENDATION_SCORE) continue;
    if (duplicateBinding && candidate.intent !== 'detail') continue;
    if (duplicateIntent && !['primary-kpi', 'ranking'].includes(candidate.intent)) continue;

    selected.push({ candidate, score, total });
  }

  return selected;
}

function presentationPriority(intent: VisualizationIntent) {
  const priorities: Record<VisualizationIntent, number> = {
    'primary-kpi': 0,
    trend: 1,
    ranking: 2,
    geography: 3,
    composition: 4,
    'record-count': 5,
    'distinct-count': 6,
    detail: 7
  };
  return priorities[intent];
}

export class RuleBasedVisualizationPlanner implements VisualizationPlanner {
  plan(dataset: VisualizationPlanningDataset): VisualizationPlan {
    const semanticColumns = annotateDatasetColumns(dataset.columns, dataset.stats);
    const semantics = summarizeSemantics(semanticColumns);
    const facts = buildFacts(semanticColumns, dataset.stats);
    const factByName = new Map(facts.map((fact) => [fact.column.name, fact]));
    const rowCount = Math.max(0, ...dataset.stats.map((stat) => stat.total));
    const measures = facts
      .filter((fact) => ['currency', 'measure', 'percentage'].includes(fact.column.semanticRole || ''))
      .sort((left, right) => measurePriority(right) - measurePriority(left) || left.column.name.localeCompare(right.column.name));
    const dates = facts
      .filter((fact) => datePriority(fact) >= 0)
      .sort((left, right) => datePriority(right) - datePriority(left) || left.column.name.localeCompare(right.column.name));
    const rankingDimensions = facts
      .filter((fact) => dimensionPriority(fact, 'ranking') >= 0)
      .sort((left, right) => dimensionPriority(right, 'ranking') - dimensionPriority(left, 'ranking') || left.column.name.localeCompare(right.column.name));
    const compositionDimensions = facts
      .filter((fact) => dimensionPriority(fact, 'composition') >= 0)
      .sort((left, right) => dimensionPriority(right, 'composition') - dimensionPriority(left, 'composition') || left.column.name.localeCompare(right.column.name));
    const identifiers = facts.filter((fact) => fact.column.semanticRole === 'identifier');
    const primaryMeasure = measures[0];
    const primaryDate = dates[0];
    const primaryDimension = rankingDimensions[0];
    const compositionDimension = compositionDimensions.find((fact) => fact.column.name !== primaryDimension?.column.name)
      || (!primaryDimension || (primaryDimension.stat?.unique || 0) <= 3 ? compositionDimensions[0] : undefined);
    const countField = [...identifiers, ...facts]
      .filter((fact, index, all) => all.findIndex((candidate) => candidate.column.name === fact.column.name) === index)
      .sort((left, right) => (
        Number(right.column.semanticRole === 'identifier') - Number(left.column.semanticRole === 'identifier')
        || left.nullRatio - right.nullRatio
        || right.uniqueRatio - left.uniqueRatio
        || left.column.name.localeCompare(right.column.name)
      ))[0];
    const latitude = facts.find((fact) => coordinateKind(fact.column.name) === 'latitude');
    const longitude = facts.find((fact) => coordinateKind(fact.column.name) === 'longitude');
    const hasValidCoordinates = numericRangeIsValid(latitude, -90, 90) && numericRangeIsValid(longitude, -180, 180);
    const candidates: CandidateSpec[] = [];

    if (primaryMeasure) {
      const aggregation = aggregationForMeasure(primaryMeasure);
      candidates.push({
        id: `kpi:${primaryMeasure.column.name}`,
        intent: 'primary-kpi',
        type: 'card',
        measure: primaryMeasure.column.name,
        aggregation,
        title: `${aggregation === 'AVG' ? 'Promedio' : 'Total'} de ${primaryMeasure.column.name}`,
        reason: `${primaryMeasure.column.name} es la medida ${primaryMeasure.column.semanticRole === 'currency' ? 'monetaria ' : ''}principal y tiene ${Math.round((1 - primaryMeasure.nullRatio) * 100)}% de completitud.`,
        compatibility: 100,
        analyticalRelevance: primaryMeasure.column.semanticRole === 'currency' ? 100 : 92,
        dataQuality: qualityScore(primaryMeasure),
        clarity: 98,
        visualAppeal: 84
      });
    }

    if (countField && rowCount > 0) {
      candidates.push({
        id: `count:${countField.column.name}`,
        intent: 'record-count',
        type: 'card',
        measure: countField.column.name,
        aggregation: 'COUNT',
        title: 'Número de registros',
        reason: `Cuenta registros mediante ${countField.column.name}, un campo con ${Math.round((1 - countField.nullRatio) * 100)}% de completitud.`,
        compatibility: 100,
        analyticalRelevance: identifiers.includes(countField) ? 90 : 78,
        dataQuality: qualityScore(countField),
        clarity: 98,
        visualAppeal: 78
      });
    }

    if (!primaryMeasure && identifiers[0]) {
      const identifier = identifiers[0];
      candidates.push({
        id: `distinct:${identifier.column.name}`,
        intent: 'distinct-count',
        type: 'card',
        measure: identifier.column.name,
        aggregation: 'DISTINCT',
        title: `${identifier.column.name} únicos`,
        reason: 'Muestra la cantidad de identificadores distintos sin tratarlos como una medida sumable.',
        compatibility: 100,
        analyticalRelevance: 86,
        dataQuality: qualityScore(identifier),
        clarity: 94,
        visualAppeal: 76
      });
    }

    if (primaryMeasure && primaryDate) {
      candidates.push({
        id: `trend:${primaryDate.column.name}:${primaryMeasure.column.name}`,
        intent: 'trend',
        type: 'line',
        dimension: primaryDate.column.name,
        measure: primaryMeasure.column.name,
        aggregation: aggregationForMeasure(primaryMeasure),
        orderBy: 'ASC',
        topN: Math.min(1_000, Math.max(2, primaryDate.stat?.unique || 50)),
        title: `Evolución de ${primaryMeasure.column.name} por ${primaryDate.column.name}`,
        reason: `${primaryDate.column.name} contiene ${(primaryDate.stat?.unique || 0).toLocaleString('es-CO')} períodos y permite analizar la evolución de ${primaryMeasure.column.name}.`,
        compatibility: 100,
        analyticalRelevance: 98,
        dataQuality: Math.min(qualityScore(primaryMeasure), qualityScore(primaryDate)),
        clarity: 94,
        visualAppeal: 95
      });
    }

    const rankingMeasure = primaryMeasure || countField;
    if (rankingMeasure && primaryDimension && primaryDimension.column.name !== compositionDimension?.column.name) {
      const aggregation = primaryMeasure ? aggregationForMeasure(primaryMeasure) : 'COUNT';
      candidates.push({
        id: `ranking:${primaryDimension.column.name}:${rankingMeasure.column.name}`,
        intent: 'ranking',
        type: 'bar',
        dimension: primaryDimension.column.name,
        measure: rankingMeasure.column.name,
        aggregation,
        orderBy: 'DESC',
        topN: 10,
        orientation: 'horizontal',
        title: `Ranking de ${rankingMeasure.column.name} por ${primaryDimension.column.name}`,
        reason: `${primaryDimension.column.name} tiene una cardinalidad útil para comparar las categorías con mayor ${rankingMeasure.column.name}.`,
        compatibility: 100,
        analyticalRelevance: 94,
        dataQuality: Math.min(qualityScore(rankingMeasure), qualityScore(primaryDimension)),
        clarity: 96,
        visualAppeal: 92
      });
    }

    if (rankingMeasure && compositionDimension) {
      const unique = compositionDimension.stat?.unique || 0;
      const type: ChartType = unique <= 6 ? 'pie' : 'treemap';
      candidates.push({
        id: `composition:${compositionDimension.column.name}:${rankingMeasure.column.name}`,
        intent: 'composition',
        type,
        dimension: compositionDimension.column.name,
        measure: rankingMeasure.column.name,
        aggregation: primaryMeasure ? aggregationForMeasure(primaryMeasure) : 'COUNT',
        orderBy: 'DESC',
        topN: Math.min(12, Math.max(2, unique)),
        title: `Participación de ${rankingMeasure.column.name} por ${compositionDimension.column.name}`,
        reason: `${compositionDimension.column.name} tiene ${unique} categorías, una cardinalidad adecuada para mostrar participación.`,
        compatibility: 100,
        analyticalRelevance: 88,
        dataQuality: Math.min(qualityScore(rankingMeasure), qualityScore(compositionDimension)),
        clarity: type === 'pie' ? 90 : 88,
        visualAppeal: 94
      });
    }

    if (primaryMeasure && hasValidCoordinates && latitude && longitude) {
      const geographicDimension = rankingDimensions.find((fact) => fact.column.semanticRole === 'geography' && !coordinateKind(fact.column.name));
      candidates.push({
        id: `map:${latitude.column.name}:${longitude.column.name}:${primaryMeasure.column.name}`,
        intent: 'geography',
        type: 'map',
        dimension: geographicDimension?.column.name,
        measure: primaryMeasure.column.name,
        aggregation: aggregationForMeasure(primaryMeasure),
        topN: 200,
        latitudeField: latitude.column.name,
        longitudeField: longitude.column.name,
        title: `${primaryMeasure.column.name} por ubicación`,
        reason: `${latitude.column.name} y ${longitude.column.name} contienen coordenadas numéricas dentro de rangos geográficos válidos.`,
        compatibility: 100,
        analyticalRelevance: 92,
        dataQuality: Math.min(qualityScore(primaryMeasure), qualityScore(latitude), qualityScore(longitude)),
        clarity: 88,
        visualAppeal: 98
      });
    }

    const secondRankingDimension = rankingDimensions.find((fact) => fact.column.name !== primaryDimension?.column.name && fact.column.name !== compositionDimension?.column.name);
    if (primaryMeasure && secondRankingDimension) {
      candidates.push({
        id: `ranking:${secondRankingDimension.column.name}:${primaryMeasure.column.name}`,
        intent: 'ranking',
        type: 'bar',
        dimension: secondRankingDimension.column.name,
        measure: primaryMeasure.column.name,
        aggregation: aggregationForMeasure(primaryMeasure),
        orderBy: 'DESC',
        topN: 10,
        orientation: 'horizontal',
        title: `${primaryMeasure.column.name} por ${secondRankingDimension.column.name}`,
        reason: `${secondRankingDimension.column.name} aporta una segunda comparación categórica no equivalente a la principal.`,
        compatibility: 100,
        analyticalRelevance: 82,
        dataQuality: Math.min(qualityScore(primaryMeasure), qualityScore(secondRankingDimension)),
        clarity: 90,
        visualAppeal: 86
      });
    }

    const tableColumns = uniqueNames([
      primaryDimension?.column.name,
      compositionDimension?.column.name,
      primaryDate?.column.name,
      primaryMeasure?.column.name,
      identifiers[0]?.column.name,
      ...semanticColumns.map((column) => column.name)
    ]).slice(0, 4);
    if (tableColumns.length > 0) {
      candidates.push({
        id: 'detail',
        intent: 'detail',
        type: 'table',
        dimension: tableColumns[0],
        measure: primaryMeasure?.column.name || countField?.column.name || tableColumns[0],
        aggregation: 'NONE',
        columns: tableColumns,
        title: 'Detalle de datos',
        reason: `Conserva una vista verificable de ${tableColumns.length} campos relevantes sin agregar los datos originales.`,
        compatibility: 100,
        analyticalRelevance: primaryMeasure ? 72 : 88,
        dataQuality: tableColumns.reduce((score, column) => Math.min(score, qualityScore(factByName.get(column))), 100),
        clarity: 86,
        visualAppeal: 64
      });
    }

    const selected = chooseCandidates(candidates).sort((left, right) => (
      presentationPriority(left.candidate.intent) - presentationPriority(right.candidate.intent)
      || right.total - left.total
      || left.candidate.id.localeCompare(right.candidate.id)
    ));
    return {
      semanticColumns,
      semantics,
      recommendations: selected.map(({ candidate, score, total }, index) => ({
        id: candidate.id,
        intent: candidate.intent,
        visualType: candidate.type,
        binding: {
          dimension: candidate.dimension,
          measure: candidate.measure,
          aggregation: candidate.aggregation,
          groupBy: candidate.dimension ? [candidate.dimension] : [],
          orderBy: candidate.orderBy,
          topN: candidate.topN
        },
        title: candidate.title,
        score: total,
        scoreBreakdown: score,
        reason: candidate.reason,
        widget: widgetFromCandidate(candidate, index)
      }))
    };
  }
}

export const ruleBasedVisualizationPlanner = new RuleBasedVisualizationPlanner();
