import { supabase } from './supabase';
import { appLogger } from './logger';
import type { DatasetColumnMeta, ReportPresentation, Widget } from './widgets/types';
import { buildWidgetQueryModel } from './analytics/queryModel';
import { resolveWidgetVisualizationResult } from './analytics/widgetResult';

export interface PublicReportSnapshot {
  id: string;
  slug: string;
  report_id?: string | null;
  dataset_id: string;
  user_id?: string;
  title: string;
  subtitle?: string | null;
  template_id: string;
  widgets: Widget[];
  widget_results: Array<{ widgetId: string; rows: Record<string, unknown>[]; error?: string | null }>;
  columns: DatasetColumnMeta[];
  created_at?: string;
  updated_at?: string;
  published_at?: string;
  revoked_at?: string | null;
}

function generateSnapshotSlug() {
  return `pub_${crypto.randomUUID().replace(/-/g, '').slice(0, 20)}`;
}

export async function buildSnapshotResults(params: {
  datasetId: string;
  widgets: Widget[];
  columns: DatasetColumnMeta[];
}) {
  const { datasetId, widgets, columns } = params;

  return Promise.all(widgets.map(async (widget) => {
    const built = buildWidgetQueryModel(widget, columns, []);
    if (!built.model) {
      return { widgetId: widget.id, rows: [], error: built.issue || 'Configuración incompleta.' };
    }

    try {
      const result = await resolveWidgetVisualizationResult(built.model, columns, datasetId);
      return { widgetId: widget.id, rows: result.rows, error: result.issue };
    } catch (error) {
      appLogger.error('analytics', 'SNAPSHOT_WIDGET_QUERY_FAILED', 'Failed to materialize widget data for public snapshot.', {
        error,
        meta: { widgetId: widget.id, widgetType: widget.type, datasetId }
      });
      return { widgetId: widget.id, rows: [], error: 'No se pudo materializar esta visualización.' };
    }
  }));
}

export async function publishReportSnapshot(params: {
  reportId?: string | null;
  datasetId: string;
  title: string;
  subtitle?: string;
  templateId: string;
  widgets: Widget[];
  columns: DatasetColumnMeta[];
  userId: string;
  existingSlug?: string | null;
}) {
  const widgetResults = await buildSnapshotResults({
    datasetId: params.datasetId,
    widgets: params.widgets,
    columns: params.columns
  });

  const payload = {
    slug: params.existingSlug || generateSnapshotSlug(),
    report_id: params.reportId || null,
    dataset_id: params.datasetId,
    user_id: params.userId,
    title: params.title,
    subtitle: params.subtitle || null,
    template_id: params.templateId,
    widgets: params.widgets,
    widget_results: widgetResults,
    columns: params.columns,
    revoked_at: null,
    published_at: new Date().toISOString()
  };

  const { data, error } = await supabase
    .from('public_report_snapshots')
    .upsert([payload], { onConflict: 'slug' })
    .select()
    .single();

  if (error) {
    appLogger.error('release', 'PUBLISH_REPORT_SNAPSHOT_FAILED', 'Failed to publish report snapshot.', { error });
    throw error;
  }

  return data as PublicReportSnapshot;
}

export async function getPublishedSnapshotBySlug(slug: string) {
  const { data, error } = await supabase
    .from('public_report_snapshots')
    .select('*')
    .eq('slug', slug)
    .is('revoked_at', null)
    .single();

  if (error) {
    appLogger.warn('release', 'FETCH_PUBLIC_SNAPSHOT_FAILED', 'Failed to fetch public snapshot.', { error, meta: { slug } });
    return null;
  }

  return data as PublicReportSnapshot;
}

export async function getPublishedSnapshotByReportId(reportId: string) {
  const { data, error } = await supabase
    .from('public_report_snapshots')
    .select('*')
    .eq('report_id', reportId)
    .is('revoked_at', null)
    .maybeSingle();

  if (error) {
    appLogger.warn('release', 'FETCH_REPORT_PUBLICATION_FAILED', 'Failed to fetch publication by report id.', { error, meta: { reportId } });
    return null;
  }

  return (data || null) as PublicReportSnapshot | null;
}

export async function revokePublishedSnapshot(slug: string) {
  const now = new Date().toISOString();
  const { error } = await supabase
    .from('public_report_snapshots')
    .update({ revoked_at: now, updated_at: now })
    .eq('slug', slug);

  if (error) {
    appLogger.error('release', 'REVOKE_PUBLIC_SNAPSHOT_FAILED', 'Failed to revoke public snapshot.', { error, meta: { slug } });
    throw error;
  }
}

export function getPublicReportUrl(slug: string) {
  if (typeof window === 'undefined') return `/report/${slug}`;
  return `${window.location.origin}/report/${slug}`;
}

export function toPresentationFromSnapshot(snapshot: PublicReportSnapshot): ReportPresentation {
  return {
    title: snapshot.title,
    subtitle: snapshot.subtitle || '',
    templateId: (snapshot.template_id as ReportPresentation['templateId']) || 'modern',
    source: 'quick-result'
  };
}
