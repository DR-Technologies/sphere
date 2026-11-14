'use client';

import React from 'react';
import { formatStoryAxisLabel, formatStoryValue } from '@/lib/story/format';
import { resolveVisibleSceneLayers } from '@/lib/story/renderState';
import type {
  CompositionSceneRenderModel,
  HeroSceneRenderModel,
  KpiSceneRenderModel,
  LineSceneRenderModel,
  MaterializedStory,
  RaceSceneRenderModel,
  RankedDatum,
  RankingSceneRenderModel,
  StoryLocale,
  StoryFrameState
} from '@/lib/story/types';
import { getTemplateTokens } from '@/lib/visualSystem';

interface PresentationRendererProps {
  story: MaterializedStory;
  timeMs: number;
  width: number;
  height: number;
  frameState: StoryFrameState;
}

function formatMetricValue(value: number, locale?: StoryLocale) {
  return new Intl.NumberFormat(locale === 'en' ? 'en-US' : 'es-CO', { maximumFractionDigits: 0 }).format(value);
}

function getStoryCopy(locale: StoryLocale | undefined) {
  if (locale === 'en') {
    return {
      evolution: 'Evolution',
      ranking: 'Ranking',
      race: 'Ranking evolution',
      composition: 'Composition',
      currentShare: 'Current share'
    };
  }
  return {
    evolution: 'Evolución',
    ranking: 'Ranking',
    race: 'Evolución de ranking',
    composition: 'Composición',
    currentShare: 'Participación actual'
  };
}

function clamp01(value: number) {
  return Math.max(0, Math.min(1, value));
}

function interpolate(from: number, to: number, progress: number) {
  return from + (to - from) * clamp01(progress);
}

function buildLinePath(points: Array<{ x: number; y: number }>) {
  if (!points.length) return '';
  return points.map((point, index) => `${index === 0 ? 'M' : 'L'} ${point.x} ${point.y}`).join(' ');
}

function hashLabelColorIndex(value: string, paletteLength: number) {
  return Array.from(value).reduce((sum, char) => sum + char.charCodeAt(0), 0) % paletteLength;
}

function getCategoryColor(label: string, palette: string[]) {
  return palette[hashLabelColorIndex(label, palette.length)];
}

function getStaggerProgress(progress: number, index: number, total: number) {
  const segment = 1 / Math.max(1, total + 1);
  return clamp01((progress - index * segment * 0.8) / Math.max(0.18, 1 - total * segment * 0.2));
}

function getTickIndices(length: number, maxTicks: number) {
  if (length <= maxTicks) return Array.from({ length }, (_, index) => index);
  const indices = new Set<number>();
  for (let index = 0; index < maxTicks; index += 1) {
    indices.add(Math.round((index * (length - 1)) / (maxTicks - 1)));
  }
  return Array.from(indices).sort((left, right) => left - right);
}

function IntroScene({ model, contentProgress }: { model: HeroSceneRenderModel; contentProgress: number }) {
  const titleProgress = clamp01(contentProgress / 0.7);
  const subtitleProgress = clamp01((contentProgress - 0.16) / 0.7);
  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: 20, maxWidth: 920 }}>
      {model.data.eyebrow && (
        <div style={{
          fontSize: 16,
          letterSpacing: '0.22em',
          textTransform: 'uppercase',
          color: 'var(--story-accent)',
          fontWeight: 700,
          opacity: 0.65 + titleProgress * 0.35,
          transform: `translateY(${8 * (1 - titleProgress)}px)`
        }}
        >
          {model.data.eyebrow}
        </div>
      )}
      <h1 style={{
        margin: 0,
        fontSize: 'clamp(48px, 7vw, 96px)',
        lineHeight: 0.92,
        letterSpacing: '-0.04em',
        opacity: titleProgress,
        transform: `translateY(${18 * (1 - titleProgress)}px)`
      }}
      >
        {model.copy.title}
      </h1>
      <p style={{
        margin: 0,
        fontSize: 'clamp(20px, 2vw, 30px)',
        lineHeight: 1.4,
        maxWidth: 780,
        color: 'var(--story-muted)',
        opacity: subtitleProgress,
        transform: `translateY(${14 * (1 - subtitleProgress)}px)`
      }}
      >
        {model.copy.subtitle}
      </p>
    </div>
  );
}

function KpiScene({ model, contentProgress, locale }: { model: KpiSceneRenderModel; contentProgress: number; locale?: StoryLocale }) {
  const counterProgress = contentProgress * contentProgress * (3 - 2 * contentProgress);
  const animatedValue = model.data.metric.value * counterProgress;
  const value = model.data.metric.format
    ? formatStoryValue(animatedValue, model.data.metric.format, locale)
    : (model.data.metric.formattedValue && contentProgress >= 1
      ? model.data.metric.formattedValue
      : formatMetricValue(Math.round(animatedValue), locale));

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: 24, width: '100%', maxWidth: 960 }}>
      <div style={{ display: 'flex', flexDirection: 'column', gap: 12 }}>
        <div style={{ fontSize: 18, fontWeight: 700, letterSpacing: '0.08em', textTransform: 'uppercase', color: 'var(--story-accent)' }}>
          KPI
        </div>
        <h2 style={{ margin: 0, fontSize: 'clamp(34px, 5vw, 68px)', lineHeight: 0.95 }}>{model.copy.title}</h2>
        <p style={{ margin: 0, color: 'var(--story-muted)', fontSize: 20 }}>{model.copy.subtitle}</p>
      </div>
      <div style={{
        padding: '28px 32px',
        borderRadius: 22,
        border: '1px solid var(--story-border-strong)',
        background: 'linear-gradient(180deg, rgba(255,255,255,0.08), rgba(255,255,255,0.03))',
        boxShadow: 'var(--story-shadow-glow)',
        width: 'fit-content',
        minWidth: 'min(100%, 460px)'
      }}
      >
        <div style={{ color: 'var(--story-muted)', fontSize: 16, marginBottom: 10 }}>
          {model.data.metric.label}
        </div>
        <div style={{ fontSize: 'clamp(64px, 10vw, 124px)', fontWeight: 800, letterSpacing: '-0.05em', lineHeight: 0.9 }}>
          {value}
        </div>
      </div>
    </div>
  );
}

function LineScene({
  model,
  width,
  height,
  contentProgress,
  locale,
  timeZone
}: {
  model: LineSceneRenderModel;
  width: number;
  height: number;
  contentProgress: number;
  locale?: StoryLocale;
  timeZone?: string;
}) {
  const isPortrait = height > width;
  const svgHeight = Math.max(260, height - (isPortrait ? 230 : 180));
  const padding = isPortrait
    ? { top: 30, right: 22, bottom: 70, left: 76 }
    : { top: 34, right: 40, bottom: 64, left: 86 };
  const chartWidth = Math.max(100, width - padding.left - padding.right);
  const chartHeight = Math.max(100, svgHeight - padding.top - padding.bottom);
  const rawMin = Math.min(0, ...model.data.points.map((point) => point.value));
  const rawMax = Math.max(0, ...model.data.points.map((point) => point.value));
  const domainSpan = Math.max(1, rawMax - rawMin);
  const minValue = rawMin;
  const points = model.data.points.map((point, index) => {
    const x = padding.left + (chartWidth * index) / Math.max(1, model.data.points.length - 1);
    const y = padding.top + chartHeight - ((point.value - minValue) / domainSpan) * chartHeight;
    return { ...point, x, y };
  });
  const path = buildLinePath(points);
  const focusIndex = Math.max(0, Math.min(points.length - 1, Math.floor((points.length - 1) * contentProgress)));
  const focusPoint = points[focusIndex];
  const clipWidth = padding.left + chartWidth * contentProgress;
  const baselineY = padding.top + chartHeight - ((0 - minValue) / domainSpan) * chartHeight;
  const xTickIndices = getTickIndices(points.length, isPortrait ? 3 : 6);
  const clipId = `story-line-clip-${model.sceneId.replace(/[^a-zA-Z0-9_-]/g, '')}`;
  const fillId = `story-line-fill-${model.sceneId.replace(/[^a-zA-Z0-9_-]/g, '')}`;
  const tooltipWidth = isPortrait ? 164 : 180;
  const tooltipX = focusPoint ? Math.max(12, Math.min(width - tooltipWidth - 12, focusPoint.x - tooltipWidth / 2)) : 0;
  const tooltipY = focusPoint ? Math.max(14, Math.min(svgHeight - 62, focusPoint.y - 70)) : 0;
  const copy = getStoryCopy(locale);

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: 20, width: '100%', height: '100%' }}>
      <div>
        <div style={{ fontSize: 18, fontWeight: 700, letterSpacing: '0.08em', textTransform: 'uppercase', color: 'var(--story-accent)', marginBottom: 8 }}>
          {copy.evolution}
        </div>
        <h2 style={{ margin: 0, fontSize: 'clamp(32px, 4vw, 58px)', lineHeight: 0.95 }}>{model.copy.title}</h2>
        <p style={{ margin: '10px 0 0', color: 'var(--story-muted)', fontSize: 20 }}>{model.copy.subtitle}</p>
      </div>

      <div style={{
        flex: 1,
        minHeight: isPortrait ? 360 : 300,
        borderRadius: 22,
        border: '1px solid var(--story-border)',
        background: 'linear-gradient(180deg, rgba(255,255,255,0.06), rgba(255,255,255,0.02))',
        backdropFilter: 'blur(24px)',
        overflow: 'hidden'
      }}
      >
        <svg width="100%" height="100%" viewBox={`0 0 ${width} ${svgHeight}`} preserveAspectRatio="none" role="img" aria-label={model.copy.title}>
          <defs>
            <linearGradient id={fillId} x1="0%" y1="0%" x2="0%" y2="100%">
              <stop offset="0%" stopColor="var(--story-accent)" stopOpacity="0.26" />
              <stop offset="100%" stopColor="var(--story-accent)" stopOpacity="0.02" />
            </linearGradient>
            <clipPath id={clipId}>
              <rect x="0" y="0" width={clipWidth} height={svgHeight} />
            </clipPath>
          </defs>

          {[0, 0.25, 0.5, 0.75, 1].map((tick) => (
            <g key={tick}>
              <line
                x1={padding.left}
                y1={padding.top + chartHeight - chartHeight * tick}
                x2={padding.left + chartWidth}
                y2={padding.top + chartHeight - chartHeight * tick}
                stroke="var(--story-grid)"
                strokeWidth="1"
              />
              <text
                data-story-axis="y"
                x={padding.left - 12}
                y={padding.top + chartHeight - chartHeight * tick + 5}
                textAnchor="end"
                fontSize="13"
                fill="var(--story-axis)"
                fontWeight="600"
              >
                {model.data.valueFormat
                  ? formatStoryValue(minValue + domainSpan * tick, model.data.valueFormat, locale)
                  : formatMetricValue(minValue + domainSpan * tick, locale)}
              </text>
            </g>
          ))}

          <g clipPath={`url(#${clipId})`}>
            <path
              d={`${path} L ${padding.left + chartWidth} ${baselineY} L ${padding.left} ${baselineY} Z`}
              fill={`url(#${fillId})`}
              opacity={0.95}
            />
            <path
              d={path}
              fill="none"
              stroke="var(--story-accent)"
              strokeWidth="4"
              strokeLinecap="round"
              strokeLinejoin="round"
            />
          </g>

          {xTickIndices.map((pointIndex) => {
            const point = points[pointIndex];
            const isFirstTick = pointIndex === xTickIndices[0];
            const isLastTick = pointIndex === xTickIndices[xTickIndices.length - 1];
            return (
            <text
              data-story-axis="x"
              key={point.key}
              x={point.x}
              y={svgHeight - 24}
              textAnchor={isFirstTick ? 'start' : isLastTick ? 'end' : 'middle'}
              fontSize={isPortrait ? 14 : 15}
              fill="var(--story-axis)"
              fontWeight="600"
              opacity={point.x <= clipWidth + 1 ? 1 : 0.25}
            >
              {formatStoryAxisLabel(point.key || point.label, { locale, timeZone })}
            </text>
            );
          })}

          {focusPoint && contentProgress > 0.03 && (
            <g>
              <circle cx={focusPoint.x} cy={focusPoint.y} r="8" fill="var(--story-accent)" />
              <circle cx={focusPoint.x} cy={focusPoint.y} r="16" fill="var(--story-accent)" opacity="0.18" />
              <rect
                x={tooltipX}
                y={tooltipY}
                rx="14"
                ry="14"
                width={tooltipWidth}
                height="52"
                fill="rgba(9,15,28,0.84)"
                stroke="rgba(255,255,255,0.12)"
              />
              <text x={tooltipX + tooltipWidth / 2} y={tooltipY + 19} textAnchor="middle" fontSize="12" fill="rgba(255,255,255,0.78)">
                {formatStoryAxisLabel(focusPoint.key || focusPoint.label, { locale, timeZone })}
              </text>
              <text x={tooltipX + tooltipWidth / 2} y={tooltipY + 41} textAnchor="middle" fontSize="18" fill="white" fontWeight="700">
                {model.data.valueFormat
                  ? formatStoryValue(focusPoint.value, model.data.valueFormat, locale)
                  : formatMetricValue(focusPoint.value, locale)}
              </text>
            </g>
          )}
        </svg>
      </div>
    </div>
  );
}

function RankingScene({
  model,
  width,
  height,
  contentProgress,
  palette,
  locale
}: {
  model: RankingSceneRenderModel;
  width: number;
  height: number;
  contentProgress: number;
  palette: string[];
  locale?: StoryLocale;
}) {
  const isPortrait = height > width;
  const items = model.data.items.slice(0, isPortrait ? 5 : 7);
  const maxValue = Math.max(...items.map((item) => item.value), 1);
  const barAreaHeight = Math.max(isPortrait ? 320 : 260, height - (isPortrait ? 210 : 190));
  const barHeight = Math.min(isPortrait ? 56 : 64, Math.max(isPortrait ? 30 : 34, Math.floor(barAreaHeight / Math.max(1, items.length))));
  const copy = getStoryCopy(locale);

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: 20, width: '100%', height: '100%' }}>
      <div>
        <div style={{ fontSize: 18, fontWeight: 700, letterSpacing: '0.08em', textTransform: 'uppercase', color: 'var(--story-accent)', marginBottom: 8 }}>
          {copy.ranking}
        </div>
        <h2 style={{ margin: 0, fontSize: isPortrait ? 'clamp(28px, 5vw, 42px)' : 'clamp(32px, 4vw, 58px)', lineHeight: 0.95, maxWidth: isPortrait ? 420 : 'none' }}>{model.copy.title}</h2>
        <p style={{ margin: '10px 0 0', color: 'var(--story-muted)', fontSize: isPortrait ? 16 : 20, maxWidth: isPortrait ? 420 : 'none' }}>{model.copy.subtitle}</p>
      </div>

      <div style={{
        flex: 1,
        minHeight: 320,
        borderRadius: 32,
        border: '1px solid var(--story-border)',
        background: 'linear-gradient(180deg, rgba(255,255,255,0.06), rgba(255,255,255,0.02))',
        padding: isPortrait ? '20px 18px 22px' : '28px 30px',
        display: 'grid',
        gap: isPortrait ? 12 : 14,
        gridTemplateRows: `repeat(${Math.max(1, items.length)}, minmax(0, 1fr))`,
        alignContent: 'stretch',
        overflow: 'hidden'
      }}
      >
        {items.map((item, index) => {
          const itemProgress = getStaggerProgress(contentProgress, index, items.length);
          const widthPercent = (item.value / maxValue) * 100 * itemProgress;
          const color = item.color || getCategoryColor(item.key, palette);

          return (
            <div key={item.key} style={{ display: 'grid', gap: 8, alignContent: 'center', minHeight: 0 }}>
              <div style={{ display: 'flex', justifyContent: 'space-between', gap: 12, alignItems: 'baseline' }}>
                <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
                  <span style={{
                    width: 26,
                    height: 26,
                    borderRadius: 999,
                    background: 'rgba(255,255,255,0.08)',
                    display: 'grid',
                    placeItems: 'center',
                    fontSize: 12,
                    color: 'var(--story-muted)'
                  }}
                  >
                    {index + 1}
                  </span>
                  <strong style={{ fontSize: isPortrait ? 15 : 18, maxWidth: isPortrait ? 180 : 'none', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>{item.label}</strong>
                </div>
                <span style={{ color: 'var(--story-muted)', fontVariantNumeric: 'tabular-nums', fontSize: isPortrait ? 13 : 15 }}>
                  {model.data.valueFormat ? formatStoryValue(item.value, model.data.valueFormat, locale) : formatMetricValue(item.value, locale)}
                </span>
              </div>
              <div style={{ height: barHeight, borderRadius: 14, background: 'rgba(255,255,255,0.05)', overflow: 'hidden', position: 'relative' }}>
                <div style={{
                  position: 'absolute',
                  inset: 0,
                  width: `${widthPercent}%`,
                  minWidth: itemProgress > 0 ? 18 : 0,
                  borderRadius: 14,
                  background: `linear-gradient(90deg, ${color}, rgba(255,255,255,0.18))`,
                  boxShadow: `0 14px 28px ${color}22`
                }}
                />
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
}

function interpolateRaceItems(model: RaceSceneRenderModel, progress: number, palette: string[]) {
  const frames = model.data.frames;
  if (!frames.length) return { label: '', items: [] as RankedDatum[] };
  if (frames.length === 1) return { label: frames[0].label, items: frames[0].items };

  const scaled = clamp01(progress) * (frames.length - 1);
  const lowerIndex = Math.floor(scaled);
  const upperIndex = Math.min(frames.length - 1, lowerIndex + 1);
  const mix = scaled - lowerIndex;
  const current = frames[lowerIndex];
  const next = frames[upperIndex];
  const keys = Array.from(new Set([...current.items.map((item) => item.key), ...next.items.map((item) => item.key)]));

  const items = keys
    .map((key) => {
      const from = current.items.find((item) => item.key === key);
      const to = next.items.find((item) => item.key === key);
      const value = interpolate(from?.value || 0, to?.value || 0, mix);
      if (value <= 0) return null;
      return {
        key,
        label: to?.label || from?.label || key,
        value,
        rank: 0,
        color: to?.color || from?.color || getCategoryColor(key, palette)
      };
    })
    .filter((item): item is RankedDatum & { color: string } => Boolean(item))
    .sort((left, right) => right.value - left.value)
    .map((item, index) => ({
      ...item,
      rank: index + 1
    }))
    .slice(0, 5);

  return {
    label: mix >= 0.5 ? next.label : current.label,
    items
  };
}

function RaceScene({
  model,
  width,
  height,
  contentProgress,
  palette,
  locale
}: {
  model: RaceSceneRenderModel;
  width: number;
  height: number;
  contentProgress: number;
  palette: string[];
  locale?: StoryLocale;
}) {
  const isPortrait = height > width;
  const race = interpolateRaceItems(model, contentProgress, palette);
  const maxValue = Math.max(1, ...race.items.map((item) => item.value || 0));
  const visibleItems = race.items.slice(0, isPortrait ? 4 : 5);
  const barHeight = Math.max(isPortrait ? 34 : 42, Math.min(isPortrait ? 56 : 74, Math.floor((height - (isPortrait ? 260 : 230)) / Math.max(1, visibleItems.length))));
  const copy = getStoryCopy(locale);

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: 20, width: '100%', height: '100%' }}>
      <div style={{ display: 'flex', justifyContent: 'space-between', gap: 16, alignItems: isPortrait ? 'flex-start' : 'end', flexWrap: 'wrap', flexDirection: isPortrait ? 'column' : 'row' }}>
        <div>
          <div style={{ fontSize: 18, fontWeight: 700, letterSpacing: '0.08em', textTransform: 'uppercase', color: 'var(--story-accent)', marginBottom: 8 }}>
            {copy.race}
          </div>
          <h2 style={{ margin: 0, fontSize: isPortrait ? 'clamp(26px, 5vw, 38px)' : 'clamp(30px, 4vw, 56px)', lineHeight: 0.95, maxWidth: isPortrait ? 420 : 'none' }}>{model.copy.title}</h2>
          <p style={{ margin: '10px 0 0', color: 'var(--story-muted)', fontSize: isPortrait ? 16 : 20, maxWidth: isPortrait ? 420 : 'none' }}>{model.copy.subtitle}</p>
        </div>
        <div style={{
          borderRadius: 999,
          padding: isPortrait ? '8px 14px' : '10px 16px',
          border: '1px solid var(--story-border)',
          background: 'rgba(255,255,255,0.04)',
          color: 'var(--story-accent)',
          fontWeight: 700,
          letterSpacing: '0.08em',
          textTransform: 'uppercase'
        }}
        >
          {race.label}
        </div>
      </div>

      <div style={{
        flex: 1,
        minHeight: 340,
        borderRadius: 22,
        border: '1px solid var(--story-border)',
        background: 'linear-gradient(180deg, rgba(255,255,255,0.06), rgba(255,255,255,0.02))',
        padding: isPortrait ? '18px 16px 22px' : '26px 26px 28px',
        display: 'grid',
        gap: isPortrait ? 12 : 14,
        alignContent: 'start'
      }}
      >
        {visibleItems.map((item, index) => {
          const numericValue = item.value || 0;
          const widthPercent = (numericValue / maxValue) * 100;
          return (
            <div key={item.key} style={{ display: 'grid', gap: 8 }}>
              <div style={{ display: 'flex', justifyContent: 'space-between', gap: 12, alignItems: 'baseline' }}>
                <div style={{ display: 'flex', gap: 10, alignItems: 'center' }}>
                  <span style={{
                    width: 28,
                    height: 28,
                    borderRadius: 999,
                    background: 'rgba(255,255,255,0.08)',
                    display: 'grid',
                    placeItems: 'center',
                    color: 'var(--story-muted)',
                    fontSize: 12
                  }}
                  >
                    {index + 1}
                  </span>
                  <strong style={{ fontSize: isPortrait ? 15 : 18, maxWidth: isPortrait ? 170 : 'none', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>{item.label}</strong>
                </div>
                <span style={{ color: 'white', fontWeight: 700, fontVariantNumeric: 'tabular-nums', fontSize: isPortrait ? 13 : 15 }}>
                  {model.data.valueFormat ? formatStoryValue(numericValue, model.data.valueFormat, locale) : formatMetricValue(numericValue, locale)}
                </span>
              </div>
              <div style={{ height: barHeight, borderRadius: 14, background: 'rgba(255,255,255,0.05)', overflow: 'hidden' }}>
                <div style={{
                  width: `${widthPercent}%`,
                  height: '100%',
                  minWidth: widthPercent > 0 ? 20 : 0,
                  borderRadius: 14,
                    background: `linear-gradient(90deg, ${item.color || getCategoryColor(item.key, palette)}, rgba(255,255,255,0.16))`
                }}
                />
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
}

function interpolateCompositionFrame(model: CompositionSceneRenderModel, progress: number, palette: string[]) {
  const frames = model.data.frames;
  if (!frames.length) return { label: '', items: [] as Array<{ key: string; label: string; share: number; value: number; color: string }> };
  if (frames.length === 1) {
    return {
      label: frames[0].label,
      items: frames[0].items.map((item) => ({
        key: item.key,
        label: item.label,
        share: item.share,
        value: item.value,
        color: item.color || getCategoryColor(item.key, palette)
      }))
    };
  }

  const scaled = clamp01(progress) * (frames.length - 1);
  const lowerIndex = Math.floor(scaled);
  const upperIndex = Math.min(frames.length - 1, lowerIndex + 1);
  const mix = scaled - lowerIndex;
  const current = frames[lowerIndex];
  const next = frames[upperIndex];
  const keys = Array.from(new Set([...current.items.map((item) => item.key), ...next.items.map((item) => item.key)]));

  const items = keys
    .map((key) => {
      const from = current.items.find((item) => item.key === key);
      const to = next.items.find((item) => item.key === key);
      const share = interpolate(from?.share || 0, to?.share || 0, mix);
      const value = interpolate(from?.value || 0, to?.value || 0, mix);
      if (share <= 0.001) return null;
      return {
        key,
        label: to?.label || from?.label || key,
        share,
        value,
        color: to?.color || from?.color || getCategoryColor(key, palette)
      };
    })
    .filter((item): item is { key: string; label: string; share: number; value: number; color: string } => Boolean(item))
    .sort((left, right) => right.share - left.share);

  return {
    label: mix >= 0.5 ? next.label : current.label,
    items
  };
}

function CompositionScene({
  model,
  width,
  height,
  contentProgress,
  palette,
  locale
}: {
  model: CompositionSceneRenderModel;
  width: number;
  height: number;
  contentProgress: number;
  palette: string[];
  locale?: StoryLocale;
}) {
  const frame = interpolateCompositionFrame(model, contentProgress, palette);
  const copy = getStoryCopy(locale);

  return (
    <div
      style={{
        display: 'grid',
        gap: 20,
        width: '100%',
        height: '100%',
        gridTemplateColumns: width > height ? 'minmax(0, 1.15fr) minmax(260px, 0.85fr)' : '1fr'
      }}
    >
      <div style={{ display: 'flex', flexDirection: 'column', gap: 18 }}>
        <div>
          <div style={{ fontSize: 18, fontWeight: 700, letterSpacing: '0.08em', textTransform: 'uppercase', color: 'var(--story-accent)', marginBottom: 8 }}>
            {copy.composition}
          </div>
          <h2 style={{ margin: 0, fontSize: 'clamp(30px, 4vw, 56px)', lineHeight: 0.95 }}>{model.copy.title}</h2>
          <p style={{ margin: '10px 0 0', color: 'var(--story-muted)', fontSize: 20 }}>{model.copy.subtitle}</p>
        </div>

        <div style={{
          borderRadius: 22,
          border: '1px solid var(--story-border)',
          background: 'linear-gradient(180deg, rgba(255,255,255,0.06), rgba(255,255,255,0.02))',
          padding: width > height ? '28px' : '24px',
          display: 'flex',
          flexDirection: 'column',
          gap: 18,
          minHeight: height > width ? 280 : 260,
          justifyContent: 'center'
        }}
        >
          <div style={{ display: 'flex', justifyContent: 'space-between', gap: 12, alignItems: 'center' }}>
            <strong style={{ fontSize: 18 }}>{copy.currentShare}</strong>
            <span style={{ color: 'var(--story-accent)', fontWeight: 700, letterSpacing: '0.08em', textTransform: 'uppercase' }}>{frame.label}</span>
          </div>
          <div style={{ height: 64, borderRadius: 14, overflow: 'hidden', background: 'rgba(255,255,255,0.06)', display: 'flex' }}>
            {frame.items.map((item, index) => {
              const reveal = getStaggerProgress(contentProgress, index, frame.items.length);
              return (
                <div
                  key={item.key}
                  style={{
                    width: `${item.share * 100 * reveal}%`,
                    minWidth: reveal > 0 ? 12 : 0,
                    background: item.color,
                    boxShadow: `inset 0 0 0 1px ${item.color}`
                  }}
                />
              );
            })}
          </div>
        </div>
      </div>

      <div style={{
        borderRadius: 22,
        border: '1px solid var(--story-border)',
        background: 'linear-gradient(180deg, rgba(255,255,255,0.05), rgba(255,255,255,0.02))',
        padding: '22px 20px',
        display: 'grid',
        gap: 12,
        alignContent: 'center',
        gridTemplateColumns: width > height ? '1fr' : 'repeat(2, minmax(0, 1fr))'
      }}
      >
        {frame.items.map((item) => (
          <div key={item.key} style={{ display: 'grid', gap: 6 }}>
            <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', gap: 12 }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
                <span style={{ width: 12, height: 12, borderRadius: 999, background: item.color }} />
                <strong>{item.label}</strong>
              </div>
              <span style={{ color: 'var(--story-muted)', fontVariantNumeric: 'tabular-nums' }}>
                {Math.round(item.share * 100)}%
              </span>
            </div>
            <span style={{ color: 'var(--story-muted)', fontSize: 14 }}>
              {model.data.valueFormat ? formatStoryValue(item.value || 0, model.data.valueFormat, locale) : formatMetricValue(item.value || 0, locale)}
            </span>
          </div>
        ))}
      </div>
    </div>
  );
}

function EmptyScene({ message }: { message: string }) {
  return (
    <div style={{ color: 'var(--story-muted)', fontSize: 18, display: 'grid', placeItems: 'center', width: '100%' }}>
      {message}
    </div>
  );
}

function SceneLayer({
  width,
  height,
  layer,
  palette,
  locale,
  timeZone
}: {
  width: number;
  height: number;
  layer: ReturnType<typeof resolveVisibleSceneLayers>[number];
  palette: string[];
  locale?: StoryLocale;
  timeZone?: string;
}) {
  const { scene, opacity, translateY, scale, contentProgress } = layer;
  const model = scene.renderModel;
  const isEntering = layer.playback.phase === 'enter';
  const isExiting = layer.playback.phase === 'exit';
  const isPortrait = height > width;
  const stagePadding = isPortrait ? { top: 34, right: 28, bottom: 40, left: 28 } : { top: 42, right: 52, bottom: 46, left: 52 };
  const sceneWidth = width - stagePadding.left - stagePadding.right;
  const sceneHeight = Math.max(isPortrait ? 420 : 360, height - stagePadding.top - stagePadding.bottom);

  return (
    <div
      data-scene-id={scene.sceneId}
      data-scene-phase={layer.playback.phase}
      data-scene-opacity={opacity.toFixed(4)}
      style={{
        position: 'absolute',
        inset: 0,
        zIndex: isEntering ? 2 : 1,
        padding: `${stagePadding.top}px ${stagePadding.right}px ${stagePadding.bottom}px ${stagePadding.left}px`,
        opacity,
        transform: `translateY(${translateY}px) scale(${scale})`,
        transformOrigin: 'center center',
        filter: isExiting ? `blur(${Math.min(2, layer.playback.transitionProgress * 2)}px)` : 'none',
        display: 'flex',
        alignItems: model.layout === 'hero' ? 'center' : 'stretch',
        justifyContent: 'center'
      }}
    >
      {scene.emptyState ? <EmptyScene message={scene.emptyState} /> : null}
      {!scene.emptyState && model.renderer === 'hero-text' ? (
        <IntroScene model={model as HeroSceneRenderModel} contentProgress={contentProgress} />
      ) : null}
      {!scene.emptyState && model.renderer === 'kpi-counter' ? (
        <KpiScene model={model as KpiSceneRenderModel} contentProgress={contentProgress} locale={locale} />
      ) : null}
      {!scene.emptyState && model.renderer === 'line-evolution' ? (
        <LineScene model={model as LineSceneRenderModel} width={sceneWidth} height={sceneHeight} contentProgress={contentProgress} locale={locale} timeZone={timeZone} />
      ) : null}
      {!scene.emptyState && model.renderer === 'bar-ranking' ? (
        <RankingScene model={model as RankingSceneRenderModel} width={sceneWidth} height={sceneHeight} contentProgress={contentProgress} palette={palette} locale={locale} />
      ) : null}
      {!scene.emptyState && model.renderer === 'bar-race' ? (
        <RaceScene model={model as RaceSceneRenderModel} width={sceneWidth} height={sceneHeight} contentProgress={contentProgress} palette={palette} locale={locale} />
      ) : null}
      {!scene.emptyState && model.renderer === 'composition-evolution' ? (
        <CompositionScene model={model as CompositionSceneRenderModel} width={sceneWidth} height={sceneHeight} contentProgress={contentProgress} palette={palette} locale={locale} />
      ) : null}
    </div>
  );
}

export default function PresentationRenderer({
  story,
  timeMs,
  width,
  height,
  frameState
}: PresentationRendererProps) {
  const template = getTemplateTokens(story.templateId);
  const layers = resolveVisibleSceneLayers(story, frameState);

  return (
    <div
      data-testid="story-frame"
      data-story-time-ms={Math.round(timeMs)}
      style={{
        position: 'relative',
        width,
        height,
        overflow: 'hidden',
        color: template.text,
        background: template.background,
        fontFamily: 'var(--font-sans, -apple-system, BlinkMacSystemFont, "SF Pro Text", "Segoe UI", sans-serif)',
        borderRadius: 20,
        border: `1px solid ${template.border}`,
        boxShadow: '0 24px 60px rgba(7, 15, 29, 0.28)'
      }}
    >
      <div
        style={{
          position: 'absolute',
          inset: 0,
          background: `linear-gradient(180deg, ${template.surface}, rgba(255,255,255,0.02))`,
          backdropFilter: 'blur(24px)'
        }}
      />
      <div
        style={{
          position: 'absolute',
          inset: 0,
          opacity: 0.8,
          background: 'radial-gradient(circle at top right, rgba(255,255,255,0.12), transparent 28%)'
        }}
      />

      <div
        style={{
          '--story-accent': template.accent,
          '--story-muted': template.mutedText,
          '--story-axis': template.text,
          '--story-grid': template.border,
          '--story-border': template.border,
          '--story-border-strong': template.borderStrong,
          '--story-shadow-glow': `0 24px 48px ${template.glow}`
        } as React.CSSProperties}
      >
        {layers.map((layer) => (
          <SceneLayer
            key={`${layer.scene.sceneId}-${layer.playback.sceneIndex}`}
            width={width}
            height={height}
            layer={layer}
            palette={template.chartColors}
            locale={story.locale}
            timeZone={story.timeZone}
          />
        ))}
      </div>
    </div>
  );
}
