import type { ReportPresentation, Widget } from '@/lib/widgets/types';
import { applyReportLayout } from '@/lib/reportLayout';
import {
  ruleBasedVisualizationPlanner,
  type PlannedVisualization,
  type VisualizationPlanningDataset
} from './planner';

export interface QuickResultRecommendation {
  widgets: Widget[];
  presentation: ReportPresentation;
  recommendations: PlannedVisualization[];
}

function cleanDatasetName(name: string) {
  return name.replace(/\.(csv|json|xlsx|xls)$/i, '').trim();
}

export function buildQuickResultRecommendation(dataset: VisualizationPlanningDataset): QuickResultRecommendation {
  const plan = ruleBasedVisualizationPlanner.plan(dataset);
  const widgets = applyReportLayout(plan.recommendations.map((recommendation) => recommendation.widget));
  const primaryMeasure = plan.recommendations.find((recommendation) => recommendation.intent === 'primary-kpi')?.binding.measure;
  const primaryDate = plan.recommendations.find((recommendation) => recommendation.intent === 'trend')?.binding.dimension;

  return {
    widgets,
    recommendations: plan.recommendations.map((recommendation, index) => ({
      ...recommendation,
      widget: widgets[index]
    })),
    presentation: {
      title: cleanDatasetName(dataset.name),
      subtitle: primaryDate
        ? `Resultado automático basado en ${primaryMeasure} y ${primaryDate}`
        : `Resultado automático basado en ${primaryMeasure || 'la estructura de tu dataset'}`,
      templateId: 'modern',
      source: 'quick-result'
    }
  };
}
