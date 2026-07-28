'use client';

import React from 'react';
import { ArrowRight, Copy, Download, Eye, Loader2, RefreshCcw, Sparkles, Trash2, ChevronUp, ChevronDown, ExternalLink, Wand2 } from 'lucide-react';
import ChartRenderer from '@/components/visuals/ChartRenderer';
import type { DatasetColumnMeta, ReportPresentation, Widget } from '@/lib/widgets/types';
import { buildWidgetQueryModel } from '@/lib/analytics/queryModel';
import { resolveWidgetVisualizationResult } from '@/lib/analytics/widgetResult';
import { appLogger, getErrorMessage } from '@/lib/logger';
import { QUICK_RESULT_TEMPLATES, getQuickResultTemplate, type QuickResultTemplateId } from '@/lib/quickResult/templates';
import { exportElementToPng } from '@/lib/export/png';
import { checkReportLimit, saveReport } from '@/lib/persistence';
import { getPublicReportUrl, getPublishedSnapshotByReportId, publishReportSnapshot, revokePublishedSnapshot } from '@/lib/publishing';
import { getPresentationWidgetLayout } from '@/lib/quickResult/layout';

interface QuickResultViewProps {
  dataset: {
    id?: string;
    name: string;
    columns: DatasetColumnMeta[];
    stats: { column: string; type: string }[];
  };
  initialWidgets: Widget[];
  initialPresentation: ReportPresentation;
  userId: string;
  initialReportId?: string | null;
  onRefine: (payload: { widgets: Widget[]; presentation: ReportPresentation; reportId?: string | null }) => void;
}

function QuickResultWidget({
  widget,
  datasetId,
  columnsMeta,
  templateColors
}: {
  widget: Widget;
  datasetId?: string;
  columnsMeta: DatasetColumnMeta[];
  templateColors: string[];
}) {
  const layout = getPresentationWidgetLayout(widget);
  const [data, setData] = React.useState<Record<string, unknown>[]>([]);
  const [loading, setLoading] = React.useState(false);
  const [error, setError] = React.useState<string | null>(null);

  React.useEffect(() => {
    let cancelled = false;

    async function load() {
      if (!datasetId) {
        setError('Dataset no disponible.');
        return;
      }

      const built = buildWidgetQueryModel(widget, columnsMeta, []);
      if (!built.model) {
        setError(built.issue || 'Configuración incompleta.');
        return;
      }

      try {
        setLoading(true);
        setError(null);
        const result = await resolveWidgetVisualizationResult(built.model, columnsMeta, datasetId);
        if (!cancelled) {
          setData(result.rows);
          setError(result.issue);
        }
      } catch (err) {
        appLogger.error('analytics', 'QUICK_RESULT_WIDGET_FAILED', 'Failed to fetch quick result widget data.', {
          error: err,
          meta: { widgetId: widget.id, widgetType: widget.type }
        });
        if (!cancelled) setError(getErrorMessage(err, 'No se pudo cargar esta visualización.'));
      } finally {
        if (!cancelled) setLoading(false);
      }
    }

    load();

    return () => {
      cancelled = true;
    };
  }, [columnsMeta, datasetId, widget]);

  return (
    <div className="quick-widget-card" style={{ minHeight: layout.minHeight }}>
      {(widget.showWidgetTitle !== false || widget.showWidgetSubtitle !== false) && (
        <div style={{ marginBottom: '16px' }}>
          {widget.showWidgetTitle !== false && (
            <h3 style={{ fontSize: widget.type === 'card' ? '1rem' : '1.125rem', fontWeight: 700, marginBottom: '4px' }}>{widget.title}</h3>
          )}
          {widget.showWidgetSubtitle !== false && widget.type !== 'card' && (
            <p style={{ fontSize: '0.8rem', color: 'var(--quick-muted)' }}>
              {widget.type === 'table'
                ? 'Detalle'
                : widget.type === 'map'
                  ? `${widget.yAxis} por ubicación`
                  : `${widget.aggregation !== 'NONE' ? `${widget.aggregation}(${widget.yAxis})` : widget.yAxis} por ${widget.xAxis}`}
            </p>
          )}
        </div>
      )}

      <div style={{ flex: 1, minHeight: layout.chartAreaMinHeight, position: 'relative' }}>
        {loading ? (
          <div style={{ position: 'absolute', inset: 0, display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
            <Loader2 size={28} className="animate-spin" />
          </div>
        ) : error ? (
          <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', minHeight: '100%', textAlign: 'center', color: '#fda4af' }}>
            {error}
          </div>
        ) : (
          <ChartRenderer
            type={widget.type}
            data={data}
            xAxis={widget.xAxis}
            yAxis={widget.yAxis}
            columnsMeta={columnsMeta}
            widgetTitle={widget.title}
            latitudeField={widget.latitudeField}
            longitudeField={widget.longitudeField}
            orientation={widget.orientation}
            colorScheme={widget.colorScheme}
            colorByCategory={widget.colorByCategory}
            customColor={widget.customColor}
            showLegend={widget.showLegend}
            showTooltip={widget.showTooltip}
            showDataLabels={widget.showDataLabels}
            numberFormat={widget.numberFormat}
            dateDisplayFormat={widget.dateDisplayFormat}
            showCardLabel={widget.showCardLabel}
            cardValueSize={widget.cardValueSize}
            tableMaxHeight={layout.maxTableHeight}
            colors={templateColors}
          />
        )}
      </div>
    </div>
  );
}

export default function QuickResultView({
  dataset,
  initialWidgets,
  initialPresentation,
  userId,
  initialReportId = null,
  onRefine
}: QuickResultViewProps) {
  const [widgets, setWidgets] = React.useState<Widget[]>(initialWidgets);
  const [presentation, setPresentation] = React.useState<ReportPresentation>(initialPresentation);
  const [reportId, setReportId] = React.useState<string | null>(initialReportId);
  const [isPublishing, setIsPublishing] = React.useState(false);
  const [isExporting, setIsExporting] = React.useState(false);
  const [publishedSlug, setPublishedSlug] = React.useState<string | null>(null);
  const [publishMessage, setPublishMessage] = React.useState<string | null>(null);
  const exportRef = React.useRef<HTMLDivElement>(null);

  React.useEffect(() => {
    setWidgets(initialWidgets);
  }, [initialWidgets]);

  React.useEffect(() => {
    setPresentation(initialPresentation);
  }, [initialPresentation]);

  React.useEffect(() => {
    if (!initialReportId) return;
    getPublishedSnapshotByReportId(initialReportId).then((snapshot) => {
      if (snapshot) {
        setPublishedSlug(snapshot.slug);
      }
    });
  }, [initialReportId]);

  const activeTemplate = getQuickResultTemplate(presentation.templateId);

  async function ensureSavedReport() {
    if (!dataset.id) {
      throw new Error('Dataset no disponible.');
    }

    if (!reportId) {
      const canCreate = await checkReportLimit(dataset.id);
      if (!canCreate) {
        throw new Error('Límite de reportes por dataset alcanzado.');
      }
    }

    const basePayload = {
      dataset_id: dataset.id,
      user_id: userId,
      name: presentation.title,
      widgets,
      filters: [],
      presentation
    };

    const saved = await saveReport(reportId ? { ...basePayload, id: reportId } : basePayload);

    if (saved?.id) {
      setReportId(saved.id);
      return saved.id as string;
    }

    throw new Error('No se pudo guardar el reporte.');
  }

  async function handlePublish() {
    try {
      if (!dataset.id) {
        throw new Error('Dataset no disponible.');
      }

      setIsPublishing(true);
      setPublishMessage(null);
      const ensuredReportId = await ensureSavedReport();
      const snapshot = await publishReportSnapshot({
        reportId: ensuredReportId,
        datasetId: dataset.id,
        title: presentation.title,
        subtitle: presentation.subtitle,
        templateId: presentation.templateId,
        widgets,
        columns: dataset.columns,
        userId,
        existingSlug: publishedSlug
      });
      setPublishedSlug(snapshot.slug);
      setPublishMessage('Publicado correctamente.');
    } catch (err) {
      setPublishMessage(getErrorMessage(err, 'No se pudo publicar el resultado.'));
    } finally {
      setIsPublishing(false);
    }
  }

  async function handleUnpublish() {
    if (!publishedSlug) return;
    try {
      await revokePublishedSnapshot(publishedSlug);
      setPublishedSlug(null);
      setPublishMessage('Publicación revocada.');
    } catch (err) {
      setPublishMessage(getErrorMessage(err, 'No se pudo revocar la publicación.'));
    }
  }

  async function handleExport() {
    if (!exportRef.current) return;
    setIsExporting(true);
    await new Promise((resolve) => requestAnimationFrame(() => requestAnimationFrame(resolve)));
    try {
      await exportElementToPng(exportRef.current, `${presentation.title || dataset.name}.png`);
    } finally {
      setIsExporting(false);
    }
  }

  async function handleRefine() {
    if (dataset.id) {
      try {
        await ensureSavedReport();
      } catch (err) {
        setPublishMessage(getErrorMessage(err, 'No se pudo preparar el reporte para Refine.'));
      }
    }

    onRefine({ widgets, presentation, reportId });
  }

  function moveWidget(id: string, direction: -1 | 1) {
    setWidgets((current) => {
      const index = current.findIndex((widget) => widget.id === id);
      const nextIndex = index + direction;
      if (index < 0 || nextIndex < 0 || nextIndex >= current.length) return current;
      const updated = [...current];
      [updated[index], updated[nextIndex]] = [updated[nextIndex], updated[index]];
      return updated.map((widget, itemIndex) => ({
        ...widget,
        x: (itemIndex % 2) * 6,
        y: Math.floor(itemIndex / 2) * 3
      }));
    });
  }

  return (
    <div
      className={isExporting ? 'quick-exporting' : ''}
      style={{
        minHeight: '100%',
        padding: '28px',
        background: activeTemplate.background,
        color: activeTemplate.text
      }}
    >
      <div ref={exportRef} className="quick-export-frame" style={{ maxWidth: '1400px', margin: '0 auto', display: 'flex', flexDirection: 'column', gap: '20px' }}>
        <div className="quick-hero">
          <div style={{ display: 'flex', alignItems: 'center', gap: '10px', color: activeTemplate.accent, fontSize: '0.78rem', textTransform: 'uppercase', letterSpacing: '0.14em', fontWeight: 700 }}>
            <Sparkles size={16} />
            Instant Wow
          </div>
          <div className="quick-hero-grid">
            <div>
              <input
                value={presentation.title}
                onChange={(event) => setPresentation((current) => ({ ...current, title: event.target.value }))}
                style={{ width: '100%', fontSize: 'clamp(2rem, 4vw, 3.4rem)', fontWeight: 800, color: activeTemplate.text, background: 'transparent', border: 'none', padding: 0, marginBottom: '10px' }}
              />
              <textarea
                value={presentation.subtitle}
                onChange={(event) => setPresentation((current) => ({ ...current, subtitle: event.target.value }))}
                style={{ width: '100%', minHeight: 72, resize: 'vertical', background: 'transparent', border: 'none', color: activeTemplate.mutedText, fontSize: '1rem', lineHeight: 1.6, padding: 0 }}
              />
            </div>
            <div className="quick-actions-panel">
              <div className="template-switcher">
                {QUICK_RESULT_TEMPLATES.map((template) => (
                  <button
                    key={template.id}
                    onClick={() => setPresentation((current) => ({ ...current, templateId: template.id as QuickResultTemplateId }))}
                    className={`template-chip ${presentation.templateId === template.id ? 'active' : ''}`}
                    style={{
                      borderColor: presentation.templateId === template.id ? activeTemplate.accent : activeTemplate.border
                    }}
                  >
                    <span>{template.name}</span>
                    <small>{template.description}</small>
                  </button>
                ))}
              </div>
              <div className="quick-actions">
                <button className="quick-btn primary" onClick={handleRefine}>
                  <Wand2 size={16} />
                  Refine
                </button>
                <button className="quick-btn" onClick={handlePublish} disabled={isPublishing}>
                  {isPublishing ? <Loader2 size={16} className="animate-spin" /> : <Eye size={16} />}
                  {publishedSlug ? 'Republish' : 'Publish'}
                </button>
                <button className="quick-btn" onClick={handleExport}>
                  <Download size={16} />
                  PNG
                </button>
              </div>
              {publishedSlug && (
                <div style={{ display: 'flex', gap: '10px', flexWrap: 'wrap' }}>
                  <button className="quick-btn" onClick={() => navigator.clipboard.writeText(getPublicReportUrl(publishedSlug))}>
                    <Copy size={16} />
                    Copy URL
                  </button>
                  <a className="quick-btn" href={getPublicReportUrl(publishedSlug)} target="_blank" rel="noreferrer">
                    <ExternalLink size={16} />
                    Open
                  </a>
                  <button className="quick-btn danger" onClick={handleUnpublish}>
                    <Trash2 size={16} />
                    Unpublish
                  </button>
                </div>
              )}
              {publishMessage && <p style={{ margin: 0, color: activeTemplate.mutedText, fontSize: '0.85rem' }}>{publishMessage}</p>}
            </div>
          </div>
        </div>

        <div className="quick-board" style={{
          '--quick-surface': activeTemplate.surface,
          '--quick-surface-alt': activeTemplate.surfaceAlt,
          '--quick-border': activeTemplate.border,
          '--quick-text': activeTemplate.text,
          '--quick-muted': activeTemplate.mutedText,
          '--quick-accent': activeTemplate.accent,
          '--quick-glow': activeTemplate.glow
        } as React.CSSProperties}>
          {widgets.map((widget, index) => {
            const layout = getPresentationWidgetLayout(widget);
            return (
              <section
                key={widget.id}
                className={`quick-grid-item quick-type-${widget.type}`}
                style={{ gridColumn: `span ${layout.columnSpan}`, minHeight: layout.minHeight }}
              >
                <div className="quick-item-toolbar">
                  <span>{index + 1}</span>
                  <div style={{ display: 'flex', gap: '8px' }}>
                    <button className="icon-btn" onClick={() => moveWidget(widget.id, -1)} aria-label="Mover arriba">
                      <ChevronUp size={14} />
                    </button>
                    <button className="icon-btn" onClick={() => moveWidget(widget.id, 1)} aria-label="Mover abajo">
                      <ChevronDown size={14} />
                    </button>
                    <button className="icon-btn" onClick={() => setWidgets((current) => current.filter((item) => item.id !== widget.id))} aria-label="Eliminar">
                      <Trash2 size={14} />
                    </button>
                  </div>
                </div>
                <QuickResultWidget
                  widget={widget}
                  datasetId={dataset.id}
                  columnsMeta={dataset.columns}
                  templateColors={activeTemplate.chartColors}
                />
              </section>
            );
          })}
        </div>

        <div className="quick-footer-note" style={{ display: 'flex', justifyContent: 'space-between', gap: '16px', flexWrap: 'wrap', color: activeTemplate.mutedText }}>
          <div style={{ display: 'flex', gap: '10px', alignItems: 'center' }}>
            <RefreshCcw size={16} />
            Puedes cambiar template, editar textos, quitar bloques y luego entrar a Refine solo si necesitas más control.
          </div>
          <button className="quick-btn primary" onClick={handleRefine}>
            Ir a Refine
            <ArrowRight size={16} />
          </button>
        </div>
      </div>

      <style jsx>{`
        .quick-hero,
        .quick-grid-item,
        .quick-actions-panel {
          backdrop-filter: blur(24px);
          -webkit-backdrop-filter: blur(24px);
        }
        .quick-export-frame {
          position: relative;
        }
        .quick-hero {
          border: 1px solid ${activeTemplate.border};
          background: ${activeTemplate.surface};
          border-radius: 30px;
          padding: 28px;
          box-shadow: 0 26px 50px rgba(3, 7, 18, 0.28);
        }
        .quick-hero-grid {
          display: grid;
          grid-template-columns: minmax(0, 1.6fr) minmax(320px, 0.95fr);
          gap: 24px;
          align-items: start;
        }
        .quick-actions-panel {
          background: ${activeTemplate.surfaceAlt};
          border: 1px solid ${activeTemplate.border};
          border-radius: 24px;
          padding: 18px;
          display: flex;
          flex-direction: column;
          gap: 16px;
        }
        .template-switcher {
          display: grid;
          grid-template-columns: repeat(3, minmax(0, 1fr));
          gap: 10px;
        }
        .template-chip {
          border: 1px solid ${activeTemplate.border};
          background: rgba(255,255,255,0.02);
          color: ${activeTemplate.text};
          border-radius: 18px;
          padding: 12px;
          text-align: left;
          display: flex;
          flex-direction: column;
          gap: 4px;
          cursor: pointer;
        }
        .template-chip small {
          color: ${activeTemplate.mutedText};
          font-size: 0.72rem;
          line-height: 1.35;
        }
        .template-chip.active {
          box-shadow: 0 0 0 1px ${activeTemplate.accent}, 0 16px 30px ${activeTemplate.glow};
        }
        .quick-actions {
          display: flex;
          gap: 10px;
          flex-wrap: wrap;
        }
        .quick-btn,
        .icon-btn {
          border: 1px solid ${activeTemplate.border};
          background: rgba(255,255,255,0.04);
          color: ${activeTemplate.text};
          border-radius: 16px;
          padding: 10px 14px;
          display: inline-flex;
          align-items: center;
          gap: 8px;
          cursor: pointer;
          text-decoration: none;
        }
        .quick-btn.primary {
          background: linear-gradient(180deg, ${activeTemplate.accent}, rgba(255,255,255,0.18));
          color: #04111f;
          border-color: transparent;
          font-weight: 700;
        }
        .quick-btn.danger {
          color: #fecdd3;
        }
        .quick-board {
          display: grid;
          grid-template-columns: repeat(12, minmax(0, 1fr));
          gap: 20px;
          align-items: stretch;
          grid-auto-flow: dense;
        }
        .quick-grid-item {
          border: 1px solid var(--quick-border);
          background: linear-gradient(180deg, var(--quick-surface), rgba(255,255,255,0.02));
          border-radius: 28px;
          padding: 18px 18px 20px;
          display: flex;
          flex-direction: column;
          gap: 10px;
          box-shadow: 0 18px 38px rgba(3, 7, 18, 0.26), inset 0 1px 0 rgba(255,255,255,0.04);
          min-height: 260px;
        }
        .quick-widget-card {
          display: flex;
          flex-direction: column;
          flex: 1;
          min-height: 0;
        }
        .quick-item-toolbar {
          display: flex;
          align-items: center;
          justify-content: space-between;
          color: var(--quick-muted);
          font-size: 0.72rem;
          text-transform: uppercase;
          letter-spacing: 0.12em;
        }
        .icon-btn {
          padding: 8px;
          border-radius: 12px;
        }
        .quick-exporting .quick-actions-panel,
        .quick-exporting .quick-item-toolbar,
        .quick-exporting .quick-footer-note {
          display: none !important;
        }
        .quick-exporting .quick-hero {
          padding: 30px;
        }
        .quick-exporting .quick-hero-grid {
          grid-template-columns: 1fr;
        }
        .quick-exporting :global(textarea) {
          min-height: auto !important;
        }
        @media (max-width: 980px) {
          .quick-hero-grid {
            grid-template-columns: 1fr;
          }
          .template-switcher {
            grid-template-columns: 1fr;
          }
          .quick-grid-item {
            grid-column: span 12 !important;
          }
        }
      `}</style>
    </div>
  );
}
