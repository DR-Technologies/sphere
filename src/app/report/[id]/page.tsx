'use client';

import React from 'react';
import { useParams } from 'next/navigation';
import ChartRenderer from '@/components/visuals/ChartRenderer';
import { getPublishedSnapshotBySlug, toPresentationFromSnapshot } from '@/lib/publishing';
import { getQuickResultTemplate, type QuickResultTemplateId } from '@/lib/quickResult/templates';
import type { PublicReportSnapshot } from '@/lib/publishing';
import { Loader2, Globe2 } from 'lucide-react';
import { getPresentationWidgetLayout } from '@/lib/quickResult/layout';

function SnapshotWidget({
  snapshot,
  widget
}: {
  snapshot: PublicReportSnapshot;
  widget: PublicReportSnapshot['widgets'][number];
}) {
  const result = snapshot.widget_results.find((item) => item.widgetId === widget.id);
  const layout = getPresentationWidgetLayout(widget);

  if (result?.error) {
    return (
      <div className="public-widget-card" style={{ minHeight: layout.minHeight }}>
        <h3>{widget.title}</h3>
        <div className="public-widget-error">{result.error}</div>
      </div>
    );
  }

  return (
    <div className="public-widget-card" style={{ minHeight: layout.minHeight }}>
      {(widget.showWidgetTitle !== false || widget.showWidgetSubtitle !== false) && (
        <div style={{ marginBottom: '14px' }}>
          {widget.showWidgetTitle !== false && <h3 style={{ fontSize: widget.type === 'card' ? '1rem' : '1.125rem', fontWeight: 700 }}>{widget.title}</h3>}
          {widget.showWidgetSubtitle !== false && widget.type !== 'card' && (
            <p style={{ fontSize: '0.78rem', color: 'var(--public-muted)' }}>
              {widget.type === 'table'
                ? 'Detalle'
                : widget.type === 'map'
                  ? `${widget.yAxis} por ubicación`
                  : `${widget.aggregation !== 'NONE' ? `${widget.aggregation}(${widget.yAxis})` : widget.yAxis} por ${widget.xAxis}`}
            </p>
          )}
        </div>
      )}
      <div style={{ flex: 1, minHeight: layout.chartAreaMinHeight }}>
        <ChartRenderer
          type={widget.type}
          data={result?.rows || []}
          xAxis={widget.xAxis}
          yAxis={widget.yAxis}
          columnsMeta={snapshot.columns}
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
          colors={getQuickResultTemplate(snapshot.template_id as QuickResultTemplateId).chartColors}
        />
      </div>
    </div>
  );
}

export default function ReportPage() {
  const { id } = useParams<{ id: string }>();
  const [snapshot, setSnapshot] = React.useState<PublicReportSnapshot | null>(null);
  const [loading, setLoading] = React.useState(true);
  const [error, setError] = React.useState<string | null>(null);

  React.useEffect(() => {
    if (!id) return;

    getPublishedSnapshotBySlug(id).then((data) => {
      if (!data) {
        setError('La publicación no existe o ya fue revocada.');
        setLoading(false);
        return;
      }
      setSnapshot(data);
      setLoading(false);
    }).catch(() => {
      setError('No se pudo cargar la publicación.');
      setLoading(false);
    });
  }, [id]);

  if (loading) {
    return (
      <div style={{ minHeight: '100vh', display: 'flex', alignItems: 'center', justifyContent: 'center', background: '#09111d', color: '#f8fafc' }}>
        <Loader2 size={28} className="animate-spin" />
      </div>
    );
  }

  if (!snapshot) {
    return (
      <div style={{ minHeight: '100vh', display: 'flex', alignItems: 'center', justifyContent: 'center', background: '#09111d', color: '#fda4af', padding: '24px', textAlign: 'center' }}>
        {error}
      </div>
    );
  }

  const presentation = toPresentationFromSnapshot(snapshot);
  const template = getQuickResultTemplate(presentation.templateId);

  return (
    <div
      style={{
        minHeight: '100vh',
        background: template.background,
        color: template.text,
        padding: '28px'
      }}
    >
      <div style={{ maxWidth: '1400px', margin: '0 auto', display: 'flex', flexDirection: 'column', gap: '18px' }}>
        <header
          style={{
            background: template.surface,
            border: `1px solid ${template.border}`,
            borderRadius: '28px',
            padding: '24px',
            backdropFilter: 'blur(24px)',
            WebkitBackdropFilter: 'blur(24px)',
            display: 'flex',
            justifyContent: 'space-between',
            gap: '18px',
            flexWrap: 'wrap'
          }}
        >
          <div>
            <div style={{ display: 'flex', alignItems: 'center', gap: '10px', color: template.accent, fontSize: '0.76rem', textTransform: 'uppercase', letterSpacing: '0.14em', fontWeight: 700, marginBottom: '10px' }}>
              <Globe2 size={16} />
              Sphere Public
            </div>
            <h1 style={{ fontSize: 'clamp(2rem, 4vw, 3.2rem)', fontWeight: 800, marginBottom: '8px' }}>{presentation.title}</h1>
            {presentation.subtitle && (
              <p style={{ color: template.mutedText, maxWidth: 760, lineHeight: 1.6 }}>{presentation.subtitle}</p>
            )}
          </div>
        </header>

        <div
          style={{
            '--public-muted': template.mutedText,
            display: 'grid',
            gridTemplateColumns: 'repeat(12, minmax(0, 1fr))',
            gap: '18px'
          } as React.CSSProperties}
        >
          {snapshot.widgets.map((widget) => (
            <section
              key={widget.id}
              style={{
                gridColumn: `span ${getPresentationWidgetLayout(widget).columnSpan}`
              }}
            >
              <SnapshotWidget snapshot={snapshot} widget={widget} />
            </section>
          ))}
        </div>
      </div>

      <style jsx>{`
        .public-widget-card {
          height: 100%;
          border-radius: 28px;
          padding: 18px 18px 20px;
          display: flex;
          flex-direction: column;
          background: linear-gradient(180deg, ${template.surface}, rgba(255,255,255,0.02));
          border: 1px solid ${template.border};
          backdrop-filter: blur(24px);
          -webkit-backdrop-filter: blur(24px);
          box-shadow: 0 18px 38px rgba(3, 7, 18, 0.26), inset 0 1px 0 rgba(255,255,255,0.04);
        }
        .public-widget-error {
          display: flex;
          align-items: center;
          justify-content: center;
          flex: 1;
          color: #fda4af;
          text-align: center;
        }
        @media (max-width: 980px) {
          section {
            grid-column: span 12 !important;
          }
        }
      `}</style>
    </div>
  );
}
