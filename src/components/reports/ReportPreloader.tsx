'use client';

import React from 'react';
import Image from 'next/image';

interface ReportPreloaderProps {
  message?: string;
  overlay?: boolean;
}

export default function ReportPreloader({
  message = 'Preparando tu reporte...',
  overlay = false
}: ReportPreloaderProps) {
  return (
    <div
      data-testid="report-preloader"
      role="status"
      aria-live="polite"
      aria-label={message}
      style={{
        position: overlay ? 'absolute' : 'relative',
        inset: overlay ? 0 : undefined,
        zIndex: overlay ? 30 : undefined,
        minHeight: overlay ? '100%' : 'calc(100vh - 1px)',
        width: '100%',
        boxSizing: 'border-box',
        display: 'grid',
        placeItems: 'center',
        background: 'var(--background)',
        color: 'var(--foreground)'
      }}
    >
      <div data-testid="report-preloader-content" style={{ display: 'grid', justifyItems: 'center', gap: 16, textAlign: 'center' }}>
        <Image
          className="report-preloader-logo"
          src="/brand/logoModoOscuro.png"
          alt=""
          aria-hidden="true"
          width={56}
          height={56}
          priority
          sizes="56px"
          draggable={false}
          style={{
            display: 'block',
            width: 56,
            height: 56,
            objectFit: 'contain',
            transformOrigin: '50% 50%',
            backfaceVisibility: 'hidden',
            imageRendering: 'auto'
          }}
        />
        <span style={{ color: 'var(--text-muted)', fontSize: '0.9rem', fontWeight: 600, letterSpacing: '-0.01em' }}>
          {message}
        </span>
      </div>
      <style jsx>{`
        :global(.report-preloader-logo) {
          animation: sphere-report-preloader-spin 8s linear infinite;
          will-change: transform;
        }

        @keyframes sphere-report-preloader-spin {
          from { transform: rotate(0deg); }
          to { transform: rotate(360deg); }
        }

        @media (prefers-reduced-motion: reduce) {
          :global(.report-preloader-logo) {
            animation: none;
            will-change: auto;
          }
        }
      `}</style>
    </div>
  );
}
