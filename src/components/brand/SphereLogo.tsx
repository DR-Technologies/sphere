'use client';

import Image from 'next/image';

interface SphereLogoProps {
  alt?: string;
  appearance?: 'auto' | 'light' | 'dark';
  className?: string;
  compact?: boolean;
  height?: number;
  width?: number;
}

export default function SphereLogo({
  alt = 'Sphere',
  appearance = 'auto',
  className = '',
  compact = false,
  height = 32,
  width = 130
}: SphereLogoProps) {
  const labelSize = Math.max(12, Math.round(height * 0.58));

  return (
    <span
      className={`sphere-logo appearance-${appearance} ${compact ? 'compact' : ''} ${className}`.trim()}
      style={{
        width: compact ? height : width,
        height,
        ['--sphere-logo-label-size' as string]: `${labelSize}px`,
        ['--sphere-logo-height' as string]: `${height}px`,
        ['--sphere-wordmark-width' as string]: `${Math.round(height * (380 / 94))}px`
      }}
    >
      <Image
        className="sphere-wordmark"
        src="/brand/logoSphere.png"
        alt={alt}
        width={380}
        height={94}
        priority
      />
      <span className="sphere-mark-lockup">
        <Image
          className="sphere-mark"
          src="/brand/logoModoOscuro.png"
          alt={compact ? alt : ''}
          width={94}
          height={94}
          priority
        />
        {!compact ? <span>{alt}</span> : null}
      </span>

      <style jsx>{`
        .sphere-logo {
          display: inline-flex;
          align-items: center;
          flex: none;
          min-width: 0;
          overflow: hidden;
        }
        .sphere-logo :global(.sphere-wordmark) {
          width: 100%;
          height: 100%;
          object-fit: contain;
          object-position: left center;
        }
        .sphere-mark-lockup {
          display: none;
          align-items: center;
          gap: 8px;
          height: 100%;
          color: var(--foreground);
          font-size: var(--sphere-logo-label-size);
          font-weight: 700;
          letter-spacing: -0.04em;
          line-height: 1;
          white-space: nowrap;
        }
        .sphere-mark-lockup :global(.sphere-mark) {
          width: auto;
          height: 100%;
          object-fit: contain;
          flex: none;
        }
        .sphere-logo.compact .sphere-mark-lockup,
        .sphere-logo.appearance-dark .sphere-mark-lockup,
        :global(html.dark) .sphere-logo.appearance-auto .sphere-mark-lockup {
          display: inline-flex;
        }
        .sphere-logo.compact :global(.sphere-wordmark) {
          width: var(--sphere-wordmark-width);
          height: var(--sphere-logo-height);
          max-width: none;
          flex: none;
        }
        .sphere-logo.compact.appearance-light .sphere-mark-lockup,
        :global(html.light) .sphere-logo.compact.appearance-auto .sphere-mark-lockup {
          display: none;
        }
        .sphere-logo.appearance-dark :global(.sphere-wordmark),
        :global(html.dark) .sphere-logo.appearance-auto :global(.sphere-wordmark) {
          display: none;
        }
      `}</style>
    </span>
  );
}
