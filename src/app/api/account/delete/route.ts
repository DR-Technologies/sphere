import crypto from 'node:crypto';
import { NextRequest, NextResponse } from 'next/server';
import { accountErrorResponse, requireAccountUser } from '@/lib/account/server';
import { deletionTokenHash, processAccountDeletion, verifyRecentAuthentication } from '@/lib/account/deletionServer';

export const runtime = 'nodejs';

export async function POST(request: NextRequest) {
  let retryCredentials: { requestId: string; retryToken: string } | null = null;
  try {
    const body = await request.json() as { confirmation?: string; nonce?: string; requestId?: string; retryToken?: string };
    if (body.requestId && body.retryToken) {
      const admin = (await import('@/lib/admin/server')).createAdminSupabaseClient();
      await processAccountDeletion(admin, body.requestId, body.retryToken);
      return NextResponse.json({ deleted: true });
    }

    const context = await requireAccountUser(request);
    if (body.confirmation !== 'ELIMINAR MI CUENTA') {
      return NextResponse.json({ error: 'Escribe ELIMINAR MI CUENTA para confirmar.', code: 'CONFIRMATION_REQUIRED' }, { status: 400 });
    }
    await verifyRecentAuthentication(context.user, body.nonce || '');
    const retryToken = crypto.randomBytes(32).toString('base64url');
    const { data, error } = await context.adminClient.rpc('begin_account_deletion', {
      p_user_id: context.user.id,
      p_retry_token_hash: deletionTokenHash(retryToken)
    });
    if (error) throw error;
    retryCredentials = { requestId: data.request_id as string, retryToken };
    await processAccountDeletion(context.adminClient, retryCredentials.requestId, retryToken, context.user.id);
    return NextResponse.json({ deleted: true });
  } catch (error) {
    const response = accountErrorResponse(error);
    return NextResponse.json({ ...response.body, retry: retryCredentials }, { status: response.status });
  }
}
