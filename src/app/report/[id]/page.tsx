'use client';

import React from 'react';
import { useParams } from 'next/navigation';
import { getPublishedSnapshotBySlug, toPresentationFromSnapshot } from '@/lib/publishing';
import { getQuickResultTemplate } from '@/lib/quickResult/templates';
import type { PublicReportSnapshot } from '@/lib/publishing';
import { Loader2 } from 'lucide-react';
import ReportPresentationSurface from '@/components/presentation/ReportPresentationSurface';
import { SPHERE_VISUAL_SYSTEM } from '@/lib/visualSystem';
import SphereLogo from '@/components/brand/SphereLogo';

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
  const shell = SPHERE_VISUAL_SYSTEM.shell;

  return (
    <div
      data-testid="public-report-page"
      style={{
        minHeight: '100vh',
        width: '100%',
        overflowX: 'clip',
        background: template.background,
        color: template.text,
        padding: 'min(28px, 4vw)'
      }}
    >
      <ReportPresentationSurface
        rootTestId="public-report-root"
        title={presentation.title}
        subtitle={presentation.subtitle}
        template={template}
        widgets={snapshot.widgets}
        columnsMeta={snapshot.columns}
        widgetResults={snapshot.widget_results}
        eyebrow={(
          <div style={{ display: 'flex', alignItems: 'center', gap: '10px', color: template.accent, fontSize: '0.76rem', textTransform: 'uppercase', letterSpacing: '0.14em', fontWeight: 700 }}>
            <SphereLogo width={78} height={18} appearance={template.id === 'dark' ? 'dark' : 'light'} />
            <span>Public</span>
          </div>
        )}
      />

      <style jsx>{`
        @media (max-width: 640px) {
          div[style*='min-height: 100vh'] {
            padding: ${shell.pagePaddingMobile}px !important;
          }
        }
      `}</style>
    </div>
  );
}
