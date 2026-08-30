import StoryPlaybackHarness from '@/components/story/StoryPlaybackHarness';
import type { MotionPresetId, StoryOrientation } from '@/lib/story/types';
import type { PresentationTemplateId } from '@/lib/visualSystem';

interface StoryPlaybackLabPageProps {
  searchParams: Promise<Record<string, string | string[] | undefined>>;
}

function pickString(value: string | string[] | undefined) {
  return Array.isArray(value) ? value[0] : value;
}

function parseOrientation(value?: string): StoryOrientation {
  return value === 'portrait' ? 'portrait' : 'landscape';
}

function parseTemplate(value?: string): PresentationTemplateId {
  return value === 'editorial' || value === 'dark' ? value : 'modern';
}

function parsePreset(value?: string): MotionPresetId {
  return value === 'dynamic' || value === 'cinematic' ? value : 'smooth';
}

function parseNumber(value: string | undefined, fallback: number) {
  const numeric = Number(value);
  return Number.isFinite(numeric) && numeric > 0 ? numeric : fallback;
}

export default async function StoryPlaybackLabPage({ searchParams }: StoryPlaybackLabPageProps) {
  const params = await searchParams;
  const orientation = parseOrientation(pickString(params.orientation));
  const templateId = parseTemplate(pickString(params.template));
  const motionPresetId = parsePreset(pickString(params.preset));
  const mode = pickString(params.mode) || 'interactive';
  const width = parseNumber(pickString(params.width), orientation === 'portrait' ? 1080 : 1280);
  const height = parseNumber(pickString(params.height), orientation === 'portrait' ? 1920 : 720);
  const timeMs = mode === 'render' ? parseNumber(pickString(params.timeMs), 0) : null;
  const showChrome = pickString(params.chrome) !== '0' && mode !== 'render';

  return (
    <main style={{
      minHeight: '100vh',
      padding: showChrome ? '32px' : '0',
      background: '#050a13',
      display: 'flex',
      alignItems: showChrome ? 'flex-start' : 'center',
      justifyContent: 'center'
    }}
    >
      <StoryPlaybackHarness
        templateId={templateId}
        motionPresetId={motionPresetId}
        orientation={orientation}
        fixedTimeMs={timeMs}
        width={width}
        height={height}
        showChrome={showChrome}
      />
    </main>
  );
}
