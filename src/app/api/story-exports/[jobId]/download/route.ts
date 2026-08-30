import { NextRequest, NextResponse } from 'next/server';
import { createServerSupabaseClient } from '@/lib/supabaseServer';
import { readLocalJobStatus, readStoryExportFile } from '@/lib/story/exportStore';

export const runtime = 'nodejs';

function getAccessToken(request: NextRequest) {
  const authorization = request.headers.get('authorization') || '';
  if (authorization.startsWith('Bearer ')) {
    return authorization.slice('Bearer '.length);
  }
  return '';
}

export async function GET(request: NextRequest, { params }: { params: Promise<{ jobId: string }> }) {
  const { jobId } = await params;
  const mockMode = request.headers.get('x-sphere-e2e-mock') === '1';

  if (!mockMode) {
    const accessToken = getAccessToken(request);
    if (!accessToken) {
      return NextResponse.json({ error: 'Unauthorized.' }, { status: 401 });
    }

    const supabase = createServerSupabaseClient(accessToken);
    const { data, error } = await supabase
      .from('story_export_jobs')
      .select('id, status')
      .eq('id', jobId)
      .single();

    if (error || !data || data.status !== 'completed') {
      return NextResponse.json({ error: 'Export file not available.' }, { status: 404 });
    }
  }

  const status = await readLocalJobStatus(jobId);
  if (!status || status.status !== 'completed' || !status.fileName) {
    return NextResponse.json({ error: 'Export file not available.' }, { status: 404 });
  }

  const buffer = await readStoryExportFile(jobId);
  return new NextResponse(buffer, {
    status: 200,
    headers: {
      'content-type': 'video/mp4',
      'content-disposition': `attachment; filename="${status.fileName}"`,
      'cache-control': 'no-store'
    }
  });
}
