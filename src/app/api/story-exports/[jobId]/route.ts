import { NextRequest, NextResponse } from 'next/server';
import { createServerSupabaseClient } from '@/lib/supabaseServer';
import { readLocalJobStatus } from '@/lib/story/exportStore';
import { isStoryExportJobStale } from '@/lib/story/exportProgress';

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

  if (mockMode) {
    const status = await readLocalJobStatus(jobId);
    if (!status) {
      return NextResponse.json({ error: 'Export job not found.' }, { status: 404 });
    }
    return NextResponse.json(status);
  }

  const accessToken = getAccessToken(request);
  if (!accessToken) {
    return NextResponse.json({ error: 'Unauthorized.' }, { status: 401 });
  }

  const supabase = createServerSupabaseClient(accessToken);
  const { data, error } = await supabase
    .from('story_export_jobs')
    .select('*')
    .eq('id', jobId)
    .single();

  if (error || !data) {
    return NextResponse.json({ error: 'Export job not found.' }, { status: 404 });
  }

  const localStatus = await readLocalJobStatus(jobId);
  if (localStatus) {
    const stale = (localStatus.status === 'queued' || localStatus.status === 'processing')
      && isStoryExportJobStale(localStatus.phase, localStatus.heartbeatAt);

    if (stale) {
      const failedPayload = {
        ...data,
        ...localStatus,
        status: 'failed',
        phase: 'failed',
        error: 'Export job timed out while processing.',
        completed_at: new Date().toISOString(),
        updated_at: new Date().toISOString()
      };

      await supabase
        .from('story_export_jobs')
        .update({
          status: 'failed',
          phase: 'failed',
          error: 'Export job timed out while processing.',
          completed_at: failedPayload.completed_at,
          updated_at: failedPayload.updated_at
        })
        .eq('id', jobId);

      return NextResponse.json(failedPayload);
    }

    return NextResponse.json({
      ...data,
      ...localStatus
    });
  }

  return NextResponse.json(data);
}
