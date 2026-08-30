'use client';

import React from 'react';
import type { DatasetColumnMeta, Widget } from '@/lib/widgets/types';
import type { QuickResultTemplate } from '@/lib/quickResult/templates';
import { getPresentationWidgetPlacement, projectWidgetsForPresentation } from '@/lib/reportLayout';
import { getPresentationWidgetLayout } from '@/lib/quickResult/layout';
import { SPHERE_VISUAL_SYSTEM } from '@/lib/visualSystem';
import ChartRenderer from '@/components/visuals/ChartRenderer';
import { isSphereQaStaticRender } from '@/lib/qa';
import PresentationGrid from './PresentationGrid';
import ReportWidgetCard from './ReportWidgetCard';

export interface ReportWidgetResult {
  widgetId: string;
  rows: Record<string, unknown>[];
  error?: string | null;
}

interface ReportPresentationSurfaceProps {
  title: string;
  subtitle?: string;
  template: QuickResultTemplate;
  widgets: Widget[];
  columnsMeta: DatasetColumnMeta[];
  widgetResults: ReportWidgetResult[];
  eyebrow?: React.ReactNode;
  mode?: 'public' | 'export';
  width?: number | string;
  maxWidth?: number | string;
  padding?: number;
  rootTestId?: string;
  exportReady?: boolean;
}

export default function ReportPresentationSurface({
  title,
  subtitle,
  template,
  widgets,
  columnsMeta,
  widgetResults,
  eyebrow,
  mode = 'public',
  width = '100%',
  maxWidth = 1400,
  padding = SPHERE_VISUAL_SYSTEM.shell.pagePadding,
  rootTestId,
  exportReady = false
}: ReportPresentationSurfaceProps) {
  const shell = SPHERE_VISUAL_SYSTEM.shell;
  const qaStaticRender = React.useMemo(() => isSphereQaStaticRender(), []);
  const [isMobileProjection, setIsMobileProjection] = React.useState(false);
  const [isReady, setIsReady] = React.useState(mode !== 'export');
  const resolvedWidgetsCount = widgetResults.length;
  const normalizedWidgets = React.useMemo(
    () => projectWidgetsForPresentation(widgets, isMobileProjection && mode !== 'export'),
    [isMobileProjection, mode, widgets]
  );
  const allWidgetsResolved = resolvedWidgetsCount >= normalizedWidgets.length;

  React.useEffect(() => {
    if (typeof window === 'undefined' || mode === 'export') {
      setIsMobileProjection(false);
      return undefined;
    }

    const media = window.matchMedia('(max-width: 980px)');
    const sync = () => setIsMobileProjection(media.matches);
    sync();
    media.addEventListener('change', sync);
    return () => media.removeEventListener('change', sync);
  }, [mode]);

  React.useEffect(() => {
    if (mode !== 'export') {
      setIsReady(true);
      return undefined;
    }

    let cancelled = false;
    setIsReady(false);

    const markReady = async () => {
      if (document.fonts?.ready) {
        await document.fonts.ready;
      }
      await new Promise((resolve) => requestAnimationFrame(() => requestAnimationFrame(resolve)));
      if (!cancelled) {
        setIsReady(true);
      }
    };

    void markReady();
    return () => {
      cancelled = true;
    };
    }, [mode, subtitle, title, widgetResults, normalizedWidgets]);

  return (
    <div
      data-testid={rootTestId}
      data-report-ready={allWidgetsResolved && isReady ? 'true' : 'false'}
      data-export-ready={mode === 'export' ? String(exportReady && isReady) : undefined}
      style={{
        width,
        maxWidth,
        margin: '0 auto',
        display: 'flex',
        flexDirection: 'column',
        gap: shell.gridGap,
        minWidth: 0,
        background: template.background,
        color: template.text,
        padding,
        ['--report-background' as string]: template.pageBackground,
        ['--report-surface' as string]: template.surface,
        ['--report-surface-alt' as string]: template.surfaceAlt,
        ['--report-border' as string]: template.border,
        ['--report-text' as string]: template.text,
        ['--report-muted' as string]: template.mutedText,
        ['--report-accent' as string]: template.accent
      }}
    >
      <header
        style={{
          background: template.header,
          border: `1px solid ${template.border}`,
          borderRadius: shell.heroRadius,
          padding: mode === 'export' ? 30 : 24,
          backdropFilter: template.id === 'dark' ? 'blur(18px) saturate(140%)' : 'blur(10px) saturate(105%)',
          WebkitBackdropFilter: template.id === 'dark' ? 'blur(18px) saturate(140%)' : 'blur(10px) saturate(105%)',
          display: 'grid',
          gap: 12,
          boxShadow: template.shadow
        }}
      >
        {eyebrow}
        <div style={{ display: 'grid', gap: 8, minWidth: 0 }}>
          <h1
            style={{
              fontSize: 'clamp(2rem, 4vw, 3.2rem)',
              fontWeight: 700,
              lineHeight: 0.96,
              letterSpacing: '-0.04em',
              margin: 0
            }}
          >
            {title}
          </h1>
          {subtitle ? (
            <p
              style={{
                margin: 0,
                color: template.mutedText,
                maxWidth: 760,
                lineHeight: 1.6,
                fontSize: '1rem'
              }}
            >
              {subtitle}
            </p>
          ) : null}
        </div>
      </header>

      <PresentationGrid style={{ gap: shell.gridGap }}>
        {normalizedWidgets.map((widget, index) => {
          const layout = getPresentationWidgetLayout(widget);
          const placement = getPresentationWidgetPlacement(widget, index);
          const result = widgetResults.find((item) => item.widgetId === widget.id);

          return (
            <section
              key={widget.id}
              className="sphere-presentation-grid-item"
              style={{
                ...placement,
                minWidth: 0,
                minHeight: 0,
                display: 'flex',
                flexDirection: 'column'
              }}
            >
              <ReportWidgetCard widget={widget} template={template} layout={layout} error={result?.error || null}>
                <ChartRenderer
                  type={widget.type}
                  data={result?.rows || []}
                  xAxis={widget.xAxis}
                  yAxis={widget.yAxis}
                  columnsMeta={columnsMeta}
                  latitudeField={widget.latitudeField}
                  longitudeField={widget.longitudeField}
                  orientation={widget.orientation}
                  colorScheme={widget.colorScheme}
                  colorByCategory={widget.colorByCategory}
                  customColor={widget.customColor}
                  showLegend={widget.showLegend}
                  showTooltip={mode === 'export' ? false : widget.showTooltip}
                  showDataLabels={widget.showDataLabels}
                  numberFormat={widget.numberFormat}
                  dateDisplayFormat={widget.dateDisplayFormat}
                  showCardLabel={widget.showCardLabel}
                  cardValueSize={widget.cardValueSize}
                  tableMaxHeight={layout.maxTableHeight}
                  colors={template.chartColors}
                  renderMode={qaStaticRender && mode === 'public' ? 'qa' : mode}
                />
              </ReportWidgetCard>
            </section>
          );
        })}
      </PresentationGrid>
    </div>
  );
}
