'use client';

import React from 'react';
import type { QuickResultTemplate } from '@/lib/quickResult/templates';

interface VisualCardProps extends React.HTMLAttributes<HTMLDivElement> {
  template: QuickResultTemplate;
  children: React.ReactNode;
  compact?: boolean;
}

export default function VisualCard({
  template,
  children,
  className,
  style,
  compact = false,
  ...rest
}: VisualCardProps) {
  return (
    <div
      {...rest}
      className={className}
      style={{
        borderRadius: compact ? 14 : 18,
        padding: compact ? '16px 16px 18px' : '20px 20px 22px',
        border: `1px solid ${template.border}`,
        background: `linear-gradient(180deg, ${template.surface}, ${template.surfaceAlt})`,
        boxShadow: template.shadow,
        backdropFilter: template.id === 'dark' ? 'blur(18px) saturate(140%)' : 'blur(14px) saturate(110%)',
        WebkitBackdropFilter: template.id === 'dark' ? 'blur(18px) saturate(140%)' : 'blur(14px) saturate(110%)',
        minWidth: 0,
        ...style
      }}
    >
      {children}
    </div>
  );
}
