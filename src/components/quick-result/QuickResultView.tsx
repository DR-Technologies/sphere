'use client';

import React from 'react';
import { ArrowRight, Clapperboard, Copy, Download, Eye, Loader2, Presentation, RefreshCcw, Save, Sparkles, Trash2, ChevronUp, ChevronDown, ExternalLink, Wand2 } from 'lucide-react';
import ChartRenderer from '@/components/visuals/ChartRenderer';
import type { DatasetColumnMeta, ReportPresentation, Widget } from '@/lib/widgets/types';
import { buildWidgetQueryModel } from '@/lib/analytics/queryModel';
import { resolveWidgetVisualizationResult } from '@/lib/analytics/widgetResult';
import { getDatasetQueryDiagnostics, getDatasetQueryUserMessage } from '@/lib/analytics/queryError';
import { appLogger, getErrorMessage } from '@/lib/logger';
import { QUICK_RESULT_TEMPLATES, getQuickResultTemplate, type QuickResultTemplateId } from '@/lib/quickResult/templates';
import { exportElementToPng } from '@/lib/export/png';
import { checkReportLimit, REPORT_LIMIT_MESSAGE, saveReport, type SavedReport } from '@/lib/persistence';
import { getPublicReportUrl, getPublishedSnapshotByReportId, publishReportSnapshot, revokePublishedSnapshot } from '@/lib/publishing';
import { getPresentationWidgetLayout } from '@/lib/quickResult/layout';
import { applyReportLayout, getPresentationWidgetPlacement, normalizeReportWidgets, projectWidgetsForPresentation, REPORT_LAYOUT_MOBILE_BREAKPOINT } from '@/lib/reportLayout';
import { SPHERE_VISUAL_SYSTEM } from '@/lib/visualSystem';
import PresentationGrid from '@/components/presentation/PresentationGrid';
import ReportWidgetCard from '@/components/presentation/ReportWidgetCard';
import ReportPresentationSurface, { type ReportWidgetResult } from '@/components/presentation/ReportPresentationSurface';
import ReportPowerPointSurface from '@/components/presentation/ReportPowerPointSurface';
import ReportPreloader from '@/components/reports/ReportPreloader';
import { exportReportToPowerPoint } from '@/lib/export/powerpoint';
import { isSphereQaStaticRender } from '@/lib/qa';

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
  prepareBeforeReveal?: boolean;
  onRefine: (payload: { widgets: Widget[]; presentation: ReportPresentation; reportId?: string | null }) => void;
  onCreateStory: (payload: { widgets: Widget[]; presentation: ReportPresentation; reportId?: string | null }) => void;
  onReportSaved?: (report: SavedReport) => void;
}

function EditableHeroField({
  value,
  onChange,
  placeholder,
  multiline = false,
  className,
  inputLabel,
  editorTextColor
}: {
  value: string;
  onChange: (value: string) => void;
  placeholder: string;
  multiline?: boolean;
  className?: string;
  inputLabel: string;
  editorTextColor: string;
}) {
  const [isEditing, setIsEditing] = React.useState(false);
  const inputRef = React.useRef<HTMLInputElement | HTMLTextAreaElement | null>(null);
  const displayValue = value.trim() || placeholder;

  React.useEffect(() => {
    if (!isEditing) return;
    inputRef.current?.focus();
    if ('select' in inputRef.current!) {
      inputRef.current?.select?.();
    }
  }, [isEditing]);

  if (!isEditing) {
    const Element = multiline ? 'p' : 'h1';
    return (
      <div
        role="button"
        tabIndex={0}
        aria-label={`Edit ${inputLabel}`}
        className={`quick-inline-display ${multiline ? 'quick-inline-display-subtitle' : 'quick-inline-display-title'} ${className || ''}`}
        onClick={() => setIsEditing(true)}
        onKeyDown={(event) => {
          if (event.key === 'Enter' || event.key === ' ') {
            event.preventDefault();
            setIsEditing(true);
          }
        }}
      >
        <Element style={{ margin: 0 }}>{displayValue}</Element>
      </div>
    );
  }

  if (multiline) {
    return (
      <textarea
        ref={inputRef as React.RefObject<HTMLTextAreaElement>}
        aria-label={inputLabel}
        value={value}
        placeholder={placeholder}
        onChange={(event) => onChange(event.target.value)}
        onBlur={() => setIsEditing(false)}
        onKeyDown={(event) => {
          if (event.key === 'Escape') {
            event.preventDefault();
            setIsEditing(false);
          }
        }}
        className={`quick-inline-editor quick-inline-editor-subtitle ${className || ''}`}
        style={{
          width: '100%',
          minHeight: 82,
          resize: 'vertical',
          color: editorTextColor,
          caretColor: editorTextColor
        }}
      />
    );
  }

  return (
    <input
      ref={inputRef as React.RefObject<HTMLInputElement>}
      aria-label={inputLabel}
      value={value}
      placeholder={placeholder}
      onChange={(event) => onChange(event.target.value)}
      onBlur={() => setIsEditing(false)}
      onKeyDown={(event) => {
        if (event.key === 'Enter' || event.key === 'Escape') {
          setIsEditing(false);
        }
      }}
      className={`quick-inline-editor quick-inline-editor-title ${className || ''}`}
      style={{ width: '100%', color: editorTextColor, caretColor: editorTextColor }}
    />
  );
}

function QuickResultWidget({
  widget,
  datasetId,
  columnsMeta,
  templateColors,
  template,
  onResolved
}: {
  widget: Widget;
  datasetId?: string;
  columnsMeta: DatasetColumnMeta[];
  templateColors: string[];
  template: ReturnType<typeof getQuickResultTemplate>;
  onResolved?: (result: ReportWidgetResult) => void;
}) {
  const layout = getPresentationWidgetLayout(widget);
  const [data, setData] = React.useState<Record<string, unknown>[]>([]);
  const [loading, setLoading] = React.useState(false);
  const [error, setError] = React.useState<string | null>(null);
  const [retryKey, setRetryKey] = React.useState(0);
  const queryWidgetRef = React.useRef(widget);
  const onResolvedRef = React.useRef(onResolved);
  queryWidgetRef.current = widget;
  onResolvedRef.current = onResolved;
  const querySignature = JSON.stringify({
    id: widget.id,
    type: widget.type,
    xAxis: widget.xAxis,
    yAxis: widget.yAxis,
    aggregation: widget.aggregation,
    columns: widget.columns,
    columnAggregations: widget.columnAggregations,
    orderBy: widget.orderBy,
    topN: widget.topN,
    latitudeField: widget.latitudeField,
    longitudeField: widget.longitudeField
  });

  React.useEffect(() => {
    let cancelled = false;

    async function load() {
      if (!datasetId) {
        setError('Dataset no disponible.');
        return;
      }

      const queryWidget = queryWidgetRef.current;
      const built = buildWidgetQueryModel(queryWidget, columnsMeta, []);
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
          onResolvedRef.current?.({ widgetId: queryWidget.id, rows: result.rows, error: result.issue });
        }
      } catch (err) {
        appLogger.error('analytics', 'QUICK_RESULT_WIDGET_FAILED', 'Failed to fetch quick result widget data.', {
          error: err,
          meta: {
            widgetId: queryWidget.id,
            widgetType: queryWidget.type,
            aggregation: queryWidget.aggregation,
            dimension: queryWidget.xAxis,
            measure: queryWidget.yAxis,
            ...getDatasetQueryDiagnostics(err)
          }
        });
        if (!cancelled) {
          const message = getDatasetQueryUserMessage(err);
          setError(message);
          onResolvedRef.current?.({ widgetId: queryWidget.id, rows: [], error: message });
        }
      } finally {
        if (!cancelled) setLoading(false);
      }
    }

    load();

    return () => {
      cancelled = true;
    };
  }, [columnsMeta, datasetId, querySignature, retryKey]);

  return (
    <ReportWidgetCard
      widget={widget}
      template={template}
      layout={layout}
      error={error}
      errorAction={error ? (
        <button type="button" className="quick-btn" onClick={() => setRetryKey((current) => current + 1)}>
          Reintentar
        </button>
      ) : null}
    >
      {loading ? (
        <div style={{ position: 'absolute', inset: 0, display: 'grid', placeItems: 'center' }}>
          <Loader2 size={28} className="animate-spin" />
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
    </ReportWidgetCard>
  );
}

export default function QuickResultView({
  dataset,
  initialWidgets,
  initialPresentation,
  userId,
  initialReportId = null,
  prepareBeforeReveal = false,
  onRefine,
  onCreateStory,
  onReportSaved
}: QuickResultViewProps) {
  const [widgets, setWidgets] = React.useState<Widget[]>(() => normalizeReportWidgets(initialWidgets));
  const [presentation, setPresentation] = React.useState<ReportPresentation>(initialPresentation);
  const [reportId, setReportId] = React.useState<string | null>(initialReportId);
  const [isPublishing, setIsPublishing] = React.useState(false);
  const [isSaving, setIsSaving] = React.useState(false);
  const [isExporting, setIsExporting] = React.useState(false);
  const [isExportingPowerPoint, setIsExportingPowerPoint] = React.useState(false);
  const [publishedSlug, setPublishedSlug] = React.useState<string | null>(null);
  const [publishMessage, setPublishMessage] = React.useState<string | null>(null);
  const [widgetResults, setWidgetResults] = React.useState<Record<string, ReportWidgetResult>>({});
  const [isMobileProjection, setIsMobileProjection] = React.useState(false);
  const [shouldPrepareSavedReport, setShouldPrepareSavedReport] = React.useState(prepareBeforeReveal);
  const exportSurfaceRef = React.useRef<HTMLDivElement>(null);
  const powerPointSurfaceRef = React.useRef<HTMLDivElement>(null);
  const shell = SPHERE_VISUAL_SYSTEM.shell;
  const qaStaticRender = React.useMemo(() => isSphereQaStaticRender(), []);

  React.useEffect(() => {
    setWidgets(normalizeReportWidgets(initialWidgets));
    setWidgetResults({});
  }, [initialWidgets]);

  React.useEffect(() => {
    if (typeof window === 'undefined') return undefined;

    const media = window.matchMedia(`(max-width: ${REPORT_LAYOUT_MOBILE_BREAKPOINT}px)`);
    const sync = () => setIsMobileProjection(media.matches);
    sync();
    media.addEventListener('change', sync);
    return () => media.removeEventListener('change', sync);
  }, []);

  React.useEffect(() => {
    setPresentation(initialPresentation);
  }, [initialPresentation]);

  React.useEffect(() => {
    setReportId(initialReportId);
  }, [initialReportId]);

  React.useEffect(() => {
    setPublishedSlug(null);
    if (!initialReportId) return;
    getPublishedSnapshotByReportId(initialReportId).then((snapshot) => {
      if (snapshot) {
        setPublishedSlug(snapshot.slug);
      }
    });
  }, [initialReportId]);

  const activeTemplate = getQuickResultTemplate(presentation.templateId);
  const presentationWidgets = React.useMemo(
    () => projectWidgetsForPresentation(widgets, isMobileProjection),
    [isMobileProjection, widgets]
  );
  const persistedWidgets = React.useMemo(() => normalizeReportWidgets(widgets), [widgets]);
  const resolvedWidgetResults = React.useMemo(
    () => persistedWidgets.map((widget) => widgetResults[widget.id] || { widgetId: widget.id, rows: [], error: null }),
    [persistedWidgets, widgetResults]
  );
  const isPreparingSavedReport = shouldPrepareSavedReport
    && persistedWidgets.some((widget) => !widgetResults[widget.id]);
  React.useEffect(() => {
    if (shouldPrepareSavedReport && !isPreparingSavedReport) {
      setShouldPrepareSavedReport(false);
    }
  }, [isPreparingSavedReport, shouldPrepareSavedReport]);
  const handleWidgetResolved = React.useCallback((result: ReportWidgetResult) => {
    setWidgetResults((current) => {
      const previous = current[result.widgetId];
      if (previous && previous.error === result.error && JSON.stringify(previous.rows) === JSON.stringify(result.rows)) {
        return current;
      }
      return {
        ...current,
        [result.widgetId]: result
      };
    });
  }, []);

  async function ensureSavedReport() {
    if (!dataset.id) {
      throw new Error('Dataset no disponible.');
    }

    if (!reportId) {
      const canCreate = await checkReportLimit(dataset.id, userId);
      if (!canCreate) {
        throw new Error(REPORT_LIMIT_MESSAGE);
      }
    }

    const basePayload = {
      dataset_id: dataset.id,
      user_id: userId,
      name: presentation.title,
      widgets: persistedWidgets,
      filters: [],
      presentation
    };

    const saved = await saveReport(reportId ? { ...basePayload, id: reportId } : basePayload);

    if (saved?.id) {
      setReportId(saved.id);
      onReportSaved?.(saved as SavedReport);
      return saved.id as string;
    }

    throw new Error('No se pudo guardar el reporte.');
  }

  async function handleSavePreview() {
    setIsSaving(true);
    setPublishMessage(null);
    try {
      await ensureSavedReport();
      setPublishMessage('Cambios guardados.');
    } catch (err) {
      setPublishMessage(getErrorMessage(err, 'No se pudieron guardar los cambios.'));
    } finally {
      setIsSaving(false);
    }
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
        widgets: persistedWidgets,
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
    const hasPendingWidgets = widgets.some((widget) => !widgetResults[widget.id]);
    if (hasPendingWidgets) {
      setPublishMessage('Espera un momento mientras terminamos de preparar el PNG.');
      return;
    }
    setIsExporting(true);
    try {
      await new Promise((resolve) => requestAnimationFrame(() => requestAnimationFrame(resolve)));
      if (!exportSurfaceRef.current) {
        throw new Error('No se pudo montar la superficie de exportación.');
      }
      await exportElementToPng(exportSurfaceRef.current, `${presentation.title || dataset.name}.png`, {
        waitForSelector: '[data-export-ready="true"]'
      });
    } finally {
      setIsExporting(false);
    }
  }

  async function handlePowerPointExport() {
    const pendingWidget = persistedWidgets.find((widget) => !widgetResults[widget.id]);
    if (pendingWidget) {
      setPublishMessage('Espera un momento mientras terminamos de preparar el PowerPoint.');
      return;
    }

    const failedWidget = persistedWidgets.find((widget) => widgetResults[widget.id]?.error);
    if (failedWidget) {
      setPublishMessage(`No se puede exportar "${failedWidget.title}" porque la visualización contiene un error.`);
      return;
    }

    setIsExportingPowerPoint(true);
    setPublishMessage('Preparando PowerPoint...');
    try {
      await new Promise((resolve) => requestAnimationFrame(() => requestAnimationFrame(resolve)));
      const host = powerPointSurfaceRef.current;
      if (!host) throw new Error('No se pudo montar la superficie de PowerPoint.');

      const slideElements = Array.from(host.querySelectorAll<HTMLElement>('[data-pptx-slide="true"]'));
      if (slideElements.length !== persistedWidgets.length) {
        throw new Error('No se pudieron preparar todas las diapositivas.');
      }

      await exportReportToPowerPoint({
        reportName: presentation.title || dataset.name,
        accentColor: activeTemplate.accent,
        mutedColor: activeTemplate.mutedText,
        slides: slideElements.map((element, index) => ({
          element,
          widgetTitle: persistedWidgets[index]?.title || `Visualización ${index + 1}`
        })),
        onProgress: (completed, total) => setPublishMessage(`Preparando PowerPoint ${completed}/${total}...`)
      });
      setPublishMessage('PowerPoint exportado correctamente.');
    } catch (error) {
      setPublishMessage(getErrorMessage(error, 'No se pudo exportar el PowerPoint.'));
    } finally {
      setIsExportingPowerPoint(false);
    }
  }

  async function handleRefine() {
    let ensuredReportId = reportId;
    if (dataset.id) {
      try {
        ensuredReportId = await ensureSavedReport();
      } catch (err) {
        setPublishMessage(getErrorMessage(err, 'No se pudo preparar el reporte para Refine.'));
        return;
      }
    }

    onRefine({ widgets: persistedWidgets, presentation, reportId: ensuredReportId });
  }

  async function handleCreateStory() {
    let ensuredReportId = reportId;
    if (dataset.id) {
      try {
        ensuredReportId = await ensureSavedReport();
      } catch (err) {
        setPublishMessage(getErrorMessage(err, 'No se pudo preparar el resultado para Story.'));
        return;
      }
    }

    onCreateStory({ widgets: persistedWidgets, presentation, reportId: ensuredReportId });
  }

  function moveWidget(id: string, direction: -1 | 1) {
    setWidgets((current) => {
      const index = current.findIndex((widget) => widget.id === id);
      const nextIndex = index + direction;
      if (index < 0 || nextIndex < 0 || nextIndex >= current.length) return current;
      const updated = [...current];
      [updated[index], updated[nextIndex]] = [updated[nextIndex], updated[index]];
      return applyReportLayout(updated);
    });
  }

  return (
    <div
      className={isExporting ? 'quick-exporting' : ''}
      aria-busy={isPreparingSavedReport}
      style={{
        position: 'relative',
        minHeight: '100%',
        padding: '28px',
        background: activeTemplate.pageBackground,
        color: activeTemplate.text,
        ['--report-background' as string]: activeTemplate.pageBackground,
        ['--report-surface' as string]: activeTemplate.surface,
        ['--report-surface-alt' as string]: activeTemplate.surfaceAlt,
        ['--report-border' as string]: activeTemplate.border,
        ['--report-text' as string]: activeTemplate.text,
        ['--report-muted' as string]: activeTemplate.mutedText,
        ['--report-accent' as string]: activeTemplate.accent
      }}
    >
      {isPreparingSavedReport ? <ReportPreloader overlay /> : null}
      <div
        className="quick-export-frame"
        style={{
          width: '100%',
          maxWidth: '1400px',
          margin: '0 auto',
          display: 'flex',
          flexDirection: 'column',
          gap: '20px'
        }}
      >
        <div className="quick-hero">
          <div style={{ display: 'flex', alignItems: 'center', gap: '10px', color: activeTemplate.accent, fontSize: '0.78rem', textTransform: 'uppercase', letterSpacing: '0.14em', fontWeight: 700 }}>
            <Sparkles size={16} />
            Instant Wow
          </div>
          <div className="quick-hero-grid">
            <div>
              <EditableHeroField
                value={presentation.title}
                placeholder={dataset.name}
                onChange={(value) => setPresentation((current) => ({ ...current, title: value }))}
                className="quick-hero-title"
                inputLabel="Report title"
                editorTextColor={activeTemplate.id === 'dark' ? activeTemplate.text : '#111C2D'}
              />
              <EditableHeroField
                value={presentation.subtitle}
                placeholder="Haz clic para agregar un subtítulo."
                onChange={(value) => setPresentation((current) => ({ ...current, subtitle: value }))}
                multiline
                className="quick-hero-subtitle"
                inputLabel="Report subtitle"
                editorTextColor={activeTemplate.id === 'dark' ? activeTemplate.text : '#111C2D'}
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
                <button className="quick-btn primary" onClick={handleCreateStory}>
                  <Clapperboard size={16} />
                  Create Story
                </button>
                <button className="quick-btn primary" onClick={handleRefine}>
                  <Wand2 size={16} />
                  Refine
                </button>
                {reportId ? (
                  <button className="quick-btn" onClick={handleSavePreview} disabled={isSaving}>
                    {isSaving ? <Loader2 size={16} className="animate-spin" /> : <Save size={16} />}
                    Save
                  </button>
                ) : null}
                <button className="quick-btn" onClick={handlePublish} disabled={isPublishing}>
                  {isPublishing ? <Loader2 size={16} className="animate-spin" /> : <Eye size={16} />}
                  {publishedSlug ? 'Republish' : 'Publish'}
                </button>
                <button className="quick-btn" onClick={handleExport}>
                  <Download size={16} />
                  PNG
                </button>
                <button className="quick-btn" onClick={handlePowerPointExport} disabled={isExportingPowerPoint}>
                  {isExportingPowerPoint ? <Loader2 size={16} className="animate-spin" /> : <Presentation size={16} />}
                  PPTX
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

        <PresentationGrid style={{
          '--quick-surface': activeTemplate.surface,
          '--quick-surface-alt': activeTemplate.surfaceAlt,
          '--quick-border': activeTemplate.border,
          '--quick-text': activeTemplate.text,
          '--quick-muted': activeTemplate.mutedText,
          '--quick-accent': activeTemplate.accent,
          '--quick-glow': activeTemplate.glow,
          gap: `${shell.gridGap}px`
        } as React.CSSProperties}>
          {presentationWidgets.map((widget, index) => {
            const placement = getPresentationWidgetPlacement(widget, index);
            return (
              <section
                key={widget.id}
                className={`quick-grid-item quick-type-${widget.type} sphere-presentation-grid-item`}
                style={{ ...placement, minWidth: 0, minHeight: 0, display: 'flex', flexDirection: 'column' }}
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
                    <button className="icon-btn" onClick={() => setWidgets((current) => applyReportLayout(current.filter((item) => item.id !== widget.id)))} aria-label="Eliminar">
                      <Trash2 size={14} />
                    </button>
                  </div>
                </div>
                <QuickResultWidget
                  widget={widget}
                  datasetId={dataset.id}
                  columnsMeta={dataset.columns}
                  templateColors={activeTemplate.chartColors}
                  template={activeTemplate}
                  onResolved={handleWidgetResolved}
                />
              </section>
            );
          })}
        </PresentationGrid>

        <div className="quick-footer-note" style={{ display: 'flex', justifyContent: 'space-between', gap: '16px', flexWrap: 'wrap', color: activeTemplate.mutedText }}>
          <div style={{ display: 'flex', gap: '10px', alignItems: 'center' }}>
            <RefreshCcw size={16} />
            Puedes cambiar template, editar textos, quitar bloques y luego entrar a Refine solo si necesitas más control.
          </div>
          <div style={{ display: 'flex', gap: '10px', flexWrap: 'wrap' }}>
            <button className="quick-btn primary" onClick={handleCreateStory}>
              Create Story
              <ArrowRight size={16} />
            </button>
            <button className="quick-btn" onClick={handleRefine}>
              Ir a Refine
              <ArrowRight size={16} />
            </button>
          </div>
        </div>
      </div>

      {isExporting || qaStaticRender ? (
        <div
          data-testid="report-export-host"
          aria-hidden="true"
          style={{
            position: 'fixed',
            left: '-20000px',
            top: 0,
            width: '1400px',
            pointerEvents: 'none',
            opacity: 1
          }}
        >
          <div ref={exportSurfaceRef}>
            <ReportPresentationSurface
              rootTestId="report-export-surface"
              title={presentation.title || dataset.name}
              subtitle={presentation.subtitle}
              template={activeTemplate}
              widgets={widgets}
              columnsMeta={dataset.columns}
              widgetResults={resolvedWidgetResults}
              mode="export"
              width={1400}
              maxWidth={1400}
              exportReady
              eyebrow={(
                <div style={{ display: 'flex', alignItems: 'center', gap: '10px', color: activeTemplate.accent, fontSize: '0.76rem', textTransform: 'uppercase', letterSpacing: '0.14em', fontWeight: 700 }}>
                  <Sparkles size={16} />
                  Instant Wow
                </div>
              )}
            />
          </div>
        </div>
      ) : null}

      {isExportingPowerPoint || qaStaticRender ? (
        <div
          data-testid="report-pptx-host"
          aria-hidden="true"
          style={{
            position: 'fixed',
            left: '-20000px',
            top: 0,
            width: '1280px',
            pointerEvents: 'none',
            opacity: 1
          }}
        >
          <div ref={powerPointSurfaceRef}>
            <ReportPowerPointSurface
              reportTitle={presentation.title || dataset.name}
              template={activeTemplate}
              widgets={persistedWidgets}
              columnsMeta={dataset.columns}
              widgetResults={resolvedWidgetResults}
            />
          </div>
        </div>
      ) : null}

      <style jsx>{`
        .quick-hero,
        .quick-grid-item,
        .quick-actions-panel {
          backdrop-filter: ${activeTemplate.id === 'dark' ? 'blur(18px) saturate(140%)' : 'blur(10px) saturate(105%)'};
          -webkit-backdrop-filter: ${activeTemplate.id === 'dark' ? 'blur(18px) saturate(140%)' : 'blur(10px) saturate(105%)'};
        }
        .quick-export-frame {
          position: relative;
          min-width: 0;
        }
        .quick-hero {
          border: 1px solid ${activeTemplate.border};
          background: ${activeTemplate.header};
          border-radius: ${shell.heroRadius}px;
          padding: 28px;
          box-shadow: ${activeTemplate.shadow};
        }
        .quick-hero-grid {
          display: grid;
          grid-template-columns: minmax(0, 1.6fr) minmax(320px, 0.95fr);
          gap: 28px;
          align-items: start;
        }
        .quick-hero-title {
          font-size: clamp(2rem, 4vw, 3.4rem);
          font-weight: 700;
          line-height: 0.96;
          margin-bottom: 12px !important;
          color: ${activeTemplate.text};
        }
        .quick-hero-subtitle {
          color: ${activeTemplate.mutedText};
          font-size: 1.02rem;
          line-height: 1.65;
          min-height: 48px;
        }
        .quick-inline-editor {
          display: block;
          border-radius: 12px;
          border: 1px solid ${activeTemplate.border};
          background: ${activeTemplate.control};
          color: ${activeTemplate.id === 'dark' ? activeTemplate.text : '#111C2D'};
          caret-color: ${activeTemplate.id === 'dark' ? activeTemplate.text : '#111C2D'};
          padding: 14px 16px;
          font: inherit;
          outline: none;
          box-shadow: 0 0 0 1px transparent;
        }
        .quick-inline-editor::placeholder {
          color: ${activeTemplate.mutedText};
          opacity: 1;
        }
        .quick-inline-editor::selection {
          background: ${activeTemplate.accent};
          color: ${activeTemplate.id === 'dark' ? '#111C2D' : '#ffffff'};
        }
        .quick-inline-display {
          display: block;
          width: 100%;
          border: none;
          background: transparent;
          color: inherit;
          padding: 0;
          text-align: left;
          cursor: text;
        }
        .quick-inline-display-title {
          margin-bottom: 12px;
        }
        .quick-inline-display-title :global(h1) {
          font-size: clamp(2rem, 4vw, 3.2rem);
          font-weight: 700;
          line-height: 0.96;
          letter-spacing: -0.04em;
        }
        .quick-inline-display-subtitle :global(p) {
          font-size: 1.02rem;
          line-height: 1.65;
          color: ${activeTemplate.mutedText};
          white-space: pre-wrap;
        }
        .quick-inline-editor:focus {
          border-color: ${activeTemplate.borderStrong};
          box-shadow: 0 0 0 1px ${activeTemplate.borderStrong}, 0 12px 26px ${activeTemplate.glow};
        }
        .quick-inline-editor-title {
          font-size: clamp(2rem, 4vw, 3.2rem);
          font-weight: 700;
          line-height: 0.96;
          margin-bottom: 12px;
        }
        .quick-inline-editor-subtitle {
          font-size: 1.02rem;
          line-height: 1.65;
        }
        .quick-actions-panel {
          background: ${activeTemplate.panel};
          border: 1px solid ${activeTemplate.border};
          border-radius: ${shell.panelRadius}px;
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
          background: ${activeTemplate.control};
          color: ${activeTemplate.text};
          border-radius: 12px;
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
          background: ${activeTemplate.controlHover};
          box-shadow: 0 0 0 1px ${activeTemplate.accent}, 0 12px 26px ${activeTemplate.glow};
        }
        .quick-actions {
          display: flex;
          gap: 10px;
          flex-wrap: wrap;
        }
        .quick-btn,
        .icon-btn {
          border: 1px solid ${activeTemplate.border};
          background: ${activeTemplate.control};
          color: ${activeTemplate.text};
          border-radius: 10px;
          padding: 10px 14px;
          display: inline-flex;
          align-items: center;
          gap: 8px;
          cursor: pointer;
          text-decoration: none;
        }
        .quick-btn.primary {
          background: linear-gradient(180deg, ${activeTemplate.accent}, ${activeTemplate.accent});
          color: ${activeTemplate.accentContrast};
          border-color: ${activeTemplate.accent};
          font-weight: 700;
        }
        .quick-btn.danger {
          color: var(--danger-text);
        }
        .quick-btn:hover,
        .icon-btn:hover {
          background: ${activeTemplate.controlHover};
          border-color: ${activeTemplate.borderStrong};
        }
        .quick-btn.primary:hover {
          background: linear-gradient(180deg, ${activeTemplate.accent}, ${activeTemplate.accent});
          color: ${activeTemplate.accentContrast};
        }
        .quick-grid-item {
          position: relative;
          min-width: 0;
          min-height: 0;
        }
        .quick-item-toolbar {
          position: absolute;
          top: 12px;
          right: 12px;
          z-index: 3;
          display: inline-flex;
          align-items: center;
          gap: 8px;
          padding: 6px 8px;
          border-radius: 999px;
          color: var(--quick-muted);
          font-size: 0.68rem;
          text-transform: uppercase;
          letter-spacing: 0.12em;
          background: color-mix(in srgb, ${activeTemplate.surfaceAlt} 84%, transparent);
          border: 1px solid ${activeTemplate.border};
          box-shadow: 0 10px 24px rgba(0, 0, 0, 0.12);
          backdrop-filter: blur(12px) saturate(120%);
          -webkit-backdrop-filter: blur(12px) saturate(120%);
        }
        .icon-btn {
          padding: 8px;
          border-radius: 10px;
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
          .quick-hero {
            padding: ${shell.pagePaddingMobile}px;
          }
          .quick-hero-grid {
            grid-template-columns: 1fr;
          }
          .template-switcher {
            grid-template-columns: 1fr;
          }
          .quick-item-toolbar {
            right: 10px;
          }
        }
        @media (max-width: 720px) {
          .quick-actions {
            display: grid;
            grid-template-columns: 1fr;
          }
          .quick-btn,
          .icon-btn,
          .template-chip {
            width: 100%;
            justify-content: center;
          }
          .quick-grid-item,
          .quick-footer-note,
          .quick-actions-panel {
            min-width: 0;
          }
        }
      `}</style>
    </div>
  );
}
