import { NextRequest, NextResponse } from 'next/server';
import { createServerSupabaseClient } from '@/lib/supabaseServer';
import { deleteExportJobFiles } from '@/lib/story/exportStore';

export const runtime = 'nodejs';

function getAccessToken(request: NextRequest) {
  const authorization = request.headers.get('authorization') || '';
  return authorization.startsWith('Bearer ') ? authorization.slice('Bearer '.length) : '';
}

export async function DELETE(request: NextRequest, { params }: { params: Promise<{ storyId: string }> }) {
  const accessToken = getAccessToken(request);
  if (!accessToken) return NextResponse.json({ error: 'Unauthorized.' }, { status: 401 });

  const { storyId } = await params;
  const supabase = createServerSupabaseClient(accessToken);
  const { data: userResult } = await supabase.auth.getUser(accessToken);
  if (!userResult.user) return NextResponse.json({ error: 'Unauthorized.' }, { status: 401 });

  const { data: jobs, error } = await supabase
    .from('story_export_jobs')
    .select('id')
    .eq('story_id', storyId)
    .eq('user_id', userResult.user.id);

  if (error) return NextResponse.json({ error: 'Could not inspect Story exports.' }, { status: 500 });

  const { data: deleted, error: deleteError } = await supabase.rpc('delete_story_lifecycle', { p_story_id: storyId });
  if (deleteError || deleted !== true) {
    return NextResponse.json({ error: 'Could not delete Story.' }, { status: deleteError ? 500 : 404 });
  }

  const cleanup = await Promise.allSettled((jobs || []).map((job) => deleteExportJobFiles(job.id)));
  return NextResponse.json({
    deleted: true,
    removed: cleanup.filter((result) => result.status === 'fulfilled').length,
    cleanupFailures: cleanup.filter((result) => result.status === 'rejected').length
  });
}
