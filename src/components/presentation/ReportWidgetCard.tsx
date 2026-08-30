'use client';

import React from 'react';
import type { QuickResultTemplate } from '@/lib/quickResult/templates';
import type { Widget } from '@/lib/widgets/types';
import type { PresentationWidgetLayout } from '@/lib/quickResult/layout';
import { getPresentationWidgetSubtitle } from '@/lib/quickResult/layout';
import VisualCard from './VisualCard';

interface ReportWidgetCardProps {
  widget: Widget;
  template: QuickResultTemplate;
  layout: PresentationWidgetLayout;
  children: React.ReactNode;
  toolbar?: React.ReactNode;
  error?: string | null;
  titleOverride?: React.ReactNode;
  subtitleOverride?: React.ReactNode;
  style?: React.CSSProperties;
}

export default function ReportWidgetCard({
  widget,
  template,
  layout,
  children,
  toolbar,
  error,
  titleOverride,
  subtitleOverride,
  style
}: ReportWidgetCardProps) {
  void layout;
  const showHeader = widget.showWidgetTitle !== false || (widget.showWidgetSubtitle !== false && widget.type !== 'card');

  return (
    <VisualCard
      template={template}
      className="sphere-report-widget-card"
      data-widget-id={widget.id}
      data-widget-type={widget.type}
      data-widget-title={widget.title}
      style={{
        width: '100%',
        height: '100%',
        minWidth: 0,
        minHeight: 0,
        display: 'flex',
        flexDirection: 'column',
        gap: 12,
        overflow: 'hidden',
        ...style
      }}
    >
      {toolbar}
      {showHeader ? (
        <div style={{ display: 'grid', gap: 6, minWidth: 0, paddingBottom: 4 }}>
          {widget.showWidgetTitle !== false ? (
            <div style={{ minWidth: 0 }}>
              {titleOverride ?? (
                <h3
                  style={{
                    fontSize: widget.type === 'card' ? '1rem' : '1.05rem',
                    fontWeight: 650,
                    margin: 0,
                    lineHeight: 1.15,
                    letterSpacing: '-0.03em'
                  }}
                >
                  {widget.title}
                </h3>
              )}
            </div>
          ) : null}
          {widget.showWidgetSubtitle !== false && widget.type !== 'card' ? (
            <div style={{ minWidth: 0 }}>
              {subtitleOverride ?? (
                <p
                  style={{
                    margin: 0,
                    fontSize: '0.76rem',
                    color: template.mutedText,
                    lineHeight: 1.5,
                    letterSpacing: '0.02em',
                    textTransform: 'uppercase'
                  }}
                >
                  {getPresentationWidgetSubtitle(widget)}
                </p>
              )}
            </div>
          ) : null}
        </div>
      ) : null}

      <div style={{ flex: 1, minHeight: 0, position: 'relative', minWidth: 0, overflow: 'hidden', display: 'flex' }}>
        {error ? (
          <div
            style={{
              display: 'grid',
              placeItems: 'center',
              minHeight: '100%',
              textAlign: 'center',
              color: '#fda4af',
              padding: '0 8px'
            }}
          >
            {error}
          </div>
        ) : (
          children
        )}
      </div>
    </VisualCard>
  );
}
