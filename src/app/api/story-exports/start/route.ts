import { NextRequest, NextResponse } from 'next/server';
import { queueStoryExportJob } from '@/lib/story/exportPipeline';
import type { MaterializedStory, StoryDefinition, StoryOrientation } from '@/lib/story/types';

export const runtime = 'nodejs';

interface StartExportBody {
  jobId: string;
  renderToken: string;
  story: StoryDefinition;
  materializedStory: MaterializedStory;
  orientation: StoryOrientation;
  accessToken?: string;
  mockMode?: boolean;
}

export async function POST(request: NextRequest) {
  const body = await request.json() as StartExportBody;

  if (!body.jobId || !body.renderToken || !body.story || !body.materializedStory) {
    return NextResponse.json({ error: 'Invalid export payload.' }, { status: 400 });
  }

  const forwardedHost = request.headers.get('x-forwarded-host');
  const forwardedProto = request.headers.get('x-forwarded-proto');
  const origin = forwardedHost
    ? `${forwardedProto || 'http'}://${forwardedHost}`
    : request.nextUrl.origin;

  await queueStoryExportJob({
    jobId: body.jobId,
    renderToken: body.renderToken,
    story: body.story,
    materializedStory: body.materializedStory,
    orientation: body.orientation,
    accessToken: body.accessToken,
    origin,
    mockMode: body.mockMode
  });

  return NextResponse.json({ ok: true, status: 'queued' }, { status: 202 });
}
