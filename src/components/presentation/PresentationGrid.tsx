'use client';

import React from 'react';
import { REPORT_LAYOUT_COLUMNS, REPORT_LAYOUT_GAP, REPORT_LAYOUT_MOBILE_BREAKPOINT, REPORT_LAYOUT_ROW_HEIGHT } from '@/lib/reportLayout';

interface PresentationGridProps {
  children: React.ReactNode;
  gap?: number;
  style?: React.CSSProperties;
}

export default function PresentationGrid({
  children,
  gap = REPORT_LAYOUT_GAP,
  style
}: PresentationGridProps) {
  return (
    <>
      <div
        className="sphere-presentation-grid"
        style={{
          display: 'grid',
          gridTemplateColumns: `repeat(${REPORT_LAYOUT_COLUMNS}, minmax(0, 1fr))`,
          gridAutoRows: `${REPORT_LAYOUT_ROW_HEIGHT}px`,
          gridAutoFlow: 'row',
          alignItems: 'stretch',
          gap,
          minWidth: 0,
          ...style
        }}
      >
        {children}
      </div>
      <style jsx>{`
        @media (max-width: ${REPORT_LAYOUT_MOBILE_BREAKPOINT}px) {
          .sphere-presentation-grid {
            gap: 18px !important;
            grid-auto-rows: auto !important;
          }
          .sphere-presentation-grid :global(.sphere-presentation-grid-item) {
            grid-column: 1 / -1 !important;
            grid-row: auto !important;
          }
        }
      `}</style>
    </>
  );
}
