import { NextRequest, NextResponse } from 'next/server';
import { createServerSupabaseClient } from '@/lib/supabaseServer';

export const runtime = 'nodejs';

function parseDependencies(details?: string) {
  if (!details) return null;
  try {
    return JSON.parse(details) as Record<string, unknown>;
  } catch {
    return null;
  }
}

function getAccessToken(request: NextRequest) {
  const authorization = request.headers.get('authorization') || '';
  return authorization.startsWith('Bearer ') ? authorization.slice('Bearer '.length) : '';
}

export async function DELETE(request: NextRequest, { params }: { params: Promise<{ datasetId: string }> }) {
  const accessToken = getAccessToken(request);
  if (!accessToken) return NextResponse.json({ error: 'Unauthorized.' }, { status: 401 });

  const { datasetId } = await params;
  const supabase = createServerSupabaseClient(accessToken);
  const { data: userResult } = await supabase.auth.getUser(accessToken);
  if (!userResult.user) return NextResponse.json({ error: 'Unauthorized.' }, { status: 401 });

  const { data: dependencies, error: dependencyError } = await supabase.rpc('get_dataset_delete_dependencies', {
    p_dataset_id: datasetId
  });
  if (dependencyError) {
    return NextResponse.json({ error: 'Could not inspect dataset dependencies.' }, { status: 500 });
  }
  if (!dependencies) return NextResponse.json({ error: 'Dataset not found.' }, { status: 404 });

  const reportCount = Number(dependencies.report_count || 0);
  const storyCount = Number(dependencies.story_count || 0);
  if (reportCount > 0 || storyCount > 0) {
    return NextResponse.json({
      error: reportCount > 0
        ? `No se puede eliminar este dataset porque está siendo utilizado por ${reportCount} ${reportCount === 1 ? 'reporte' : 'reportes'}. Debes eliminar primero los reportes asociados.`
        : `No se puede eliminar este dataset porque está siendo utilizado por ${storyCount} ${storyCount === 1 ? 'Story' : 'Stories'}. Debes eliminar primero las Stories asociadas.`,
      dependencies
    }, { status: 409 });
  }

  const { data: lifecycle, error: deleteError } = await supabase.rpc('delete_dataset_lifecycle', { p_dataset_id: datasetId });
  if (deleteError || !lifecycle) {
    const blockedByDependency = deleteError && ['DATASET_HAS_REPORTS', 'DATASET_HAS_STORIES'].some((code) => deleteError.message.includes(code));
    if (blockedByDependency) {
      return NextResponse.json({
        error: deleteError.message.includes('DATASET_HAS_REPORTS')
          ? 'No se puede eliminar este dataset porque tiene reportes asociados. Debes eliminarlos primero.'
          : 'No se puede eliminar este dataset porque tiene Stories asociadas. Debes eliminarlas primero.',
        dependencies: parseDependencies(deleteError.details)
      }, { status: 409 });
    }
    return NextResponse.json({ error: 'Could not delete dataset.' }, { status: deleteError ? 500 : 404 });
  }

  return NextResponse.json({
    ...lifecycle,
    removed: 0,
    cleanupFailures: 0
  });
}
