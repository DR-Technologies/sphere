'use client';

import React from 'react';

interface StoryStageProps {
  width: number;
  height: number;
  maxHeight?: number | string;
  minHeight?: number | string;
  background?: string;
  align?: 'center' | 'start';
  children: React.ReactNode;
}

export default function StoryStage({
  width,
  height,
  maxHeight = '72vh',
  minHeight,
  background = 'transparent',
  align = 'center',
  children
}: StoryStageProps) {
  const hostRef = React.useRef<HTMLDivElement | null>(null);
  const [hostSize, setHostSize] = React.useState({ width: 0, height: 0 });

  React.useEffect(() => {
    const element = hostRef.current;
    if (!element || typeof ResizeObserver === 'undefined') return;

    const update = () => {
      const rect = element.getBoundingClientRect();
      setHostSize({ width: rect.width, height: rect.height });
    };

    update();
    const observer = new ResizeObserver(update);
    observer.observe(element);
    return () => observer.disconnect();
  }, []);

  const scale = React.useMemo(() => {
    if (!hostSize.width || !hostSize.height) return 1;
    return Math.min(hostSize.width / width, hostSize.height / height);
  }, [height, hostSize.height, hostSize.width, width]);

  const scaledWidth = width * scale;
  const scaledHeight = height * scale;

  return (
    <div
      ref={hostRef}
      style={{
        width: '100%',
        maxWidth: '100%',
        minWidth: 0,
        minHeight: minHeight ?? 0,
        height: typeof maxHeight === 'number' ? maxHeight : maxHeight,
        maxHeight,
        display: 'grid',
        placeItems: align === 'start' ? 'center start' : 'center',
        overflow: 'hidden',
        background
      }}
    >
      <div
        style={{
          width: scaledWidth,
          height: scaledHeight,
          maxWidth: '100%',
          position: 'relative',
          overflow: 'visible',
          flexShrink: 0
        }}
      >
        <div
          style={{
            width,
            height,
            transform: `scale(${scale})`,
            transformOrigin: 'top left'
          }}
        >
          {children}
        </div>
      </div>
    </div>
  );
}
