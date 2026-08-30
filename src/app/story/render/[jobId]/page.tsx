import { notFound } from 'next/navigation';
import StoryRenderSurface from '@/components/story/StoryRenderSurface';
import { readExportPayload } from '@/lib/story/exportStore';

interface StoryRenderPageProps {
  params: Promise<{ jobId: string }>;
  searchParams: Promise<Record<string, string | string[] | undefined>>;
}

export const dynamic = 'force-dynamic';

export default async function StoryRenderPage({ params, searchParams }: StoryRenderPageProps) {
  const { jobId } = await params;
  const query = await searchParams;
  const token = typeof query.token === 'string' ? query.token : '';
  const timeMs = Number(typeof query.timeMs === 'string' ? query.timeMs : 0);
  const width = Number(typeof query.width === 'string' ? query.width : 1920);
  const height = Number(typeof query.height === 'string' ? query.height : 1080);
  let payload;

  try {
    payload = await readExportPayload(jobId);
  } catch {
    notFound();
  }

  if (payload.renderToken !== token) {
    notFound();
  }

  return (
    <div style={{ minHeight: '100vh', display: 'grid', placeItems: 'center', background: '#020817' }}>
      <StoryRenderSurface
        story={payload.story}
        materializedStory={payload.materializedStory}
        initialTimeMs={timeMs}
        width={width}
        height={height}
      />
    </div>
  );
}
