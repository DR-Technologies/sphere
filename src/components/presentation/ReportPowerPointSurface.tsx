'use client';

import React from 'react';
import ChartRenderer from '@/components/visuals/ChartRenderer';
import type { QuickResultTemplate } from '@/lib/quickResult/templates';
import { getPresentationWidgetLayout } from '@/lib/quickResult/layout';
import type { DatasetColumnMeta, Widget } from '@/lib/widgets/types';
import type { ReportWidgetResult } from './ReportPresentationSurface';
import ReportWidgetCard from './ReportWidgetCard';

export const POWERPOINT_SLIDE_WIDTH = 1280;
export const POWERPOINT_SLIDE_HEIGHT = 720;

interface ReportPowerPointSurfaceProps {
  reportTitle: string;
  template: QuickResultTemplate;
  widgets: Widget[];
  columnsMeta: DatasetColumnMeta[];
  widgetResults: ReportWidgetResult[];
}

function PowerPointSlide({
  reportTitle,
  template,
  widget,
  result,
  columnsMeta
}: {
  reportTitle: string;
  template: QuickResultTemplate;
  widget: Widget;
  result: ReportWidgetResult;
  columnsMeta: DatasetColumnMeta[];
}) {
  const [ready, setReady] = React.useState(false);
  const layout = getPresentationWidgetLayout(widget);

  React.useEffect(() => {
    let cancelled = false;

    const markReady = async () => {
      if (document.fonts?.ready) await document.fonts.ready;
      await new Promise<void>((resolve) => {
        let frames = 0;
        const next = () => {
          frames += 1;
          if (frames >= 4) {
            resolve();
            return;
          }
          requestAnimationFrame(next);
        };
        requestAnimationFrame(next);
      });
      if (!cancelled) setReady(true);
    };

    void markReady();
    return () => {
      cancelled = true;
    };
  }, [result, template.id, widget]);

  return (
    <section
      data-pptx-slide="true"
      data-widget-id={widget.id}
      data-widget-title={widget.title}
      data-report-title={reportTitle}
      data-export-ready={ready ? 'true' : 'false'}
      style={{
        boxSizing: 'border-box',
        width: POWERPOINT_SLIDE_WIDTH,
        height: POWERPOINT_SLIDE_HEIGHT,
        padding: 42,
        display: 'grid',
        gridTemplateRows: 'auto minmax(0, 1fr)',
        gap: 20,
        overflow: 'hidden',
        background: template.pageBackground,
        color: template.text,
        ['--report-background' as string]: template.pageBackground,
        ['--report-surface' as string]: template.surface,
        ['--report-surface-alt' as string]: template.surfaceAlt,
        ['--report-border' as string]: template.border,
        ['--report-text' as string]: template.text,
        ['--report-muted' as string]: template.mutedText,
        ['--report-accent' as string]: template.accent
      }}
    >
      <div aria-hidden="true" style={{ height: 32 }} />

      <ReportWidgetCard
        widget={widget}
        template={template}
        layout={layout}
        error={result.error || null}
        style={{ padding: 28 }}
      >
        <ChartRenderer
          type={widget.type}
          data={result.rows}
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
          showTooltip={false}
          showDataLabels={widget.showDataLabels}
          numberFormat={widget.numberFormat}
          dateDisplayFormat={widget.dateDisplayFormat}
          showCardLabel={widget.showCardLabel}
          cardValueSize={widget.cardValueSize}
          tableMaxHeight={520}
          colors={template.chartColors}
          renderMode="export"
        />
      </ReportWidgetCard>
    </section>
  );
}

export default function ReportPowerPointSurface({
  reportTitle,
  template,
  widgets,
  columnsMeta,
  widgetResults
}: ReportPowerPointSurfaceProps) {
  return (
    <div data-testid="report-pptx-surface" style={{ display: 'grid', gap: 24 }}>
      {widgets.map((widget) => (
        <PowerPointSlide
          key={widget.id}
          reportTitle={reportTitle}
          template={template}
          widget={widget}
          result={widgetResults.find((item) => item.widgetId === widget.id) || { widgetId: widget.id, rows: [], error: 'Visualización no disponible.' }}
          columnsMeta={columnsMeta}
        />
      ))}
    </div>
  );
}
