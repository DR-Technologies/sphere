import { NextRequest, NextResponse } from 'next/server';
import { validateAccessUpdate } from '@/lib/admin/policy';
import {
  adminErrorResponse,
  getAdminUsers,
  getUserAccess,
  requireSuperadmin,
  setUserAccess
} from '@/lib/admin/server';

export const runtime = 'nodejs';

export async function PATCH(
  request: NextRequest,
  { params }: { params: Promise<{ userId: string }> }
) {
  try {
    const { userId } = await params;
    const { actor, adminClient } = await requireSuperadmin(request);
    const current = await getUserAccess(adminClient, userId);
    const next = validateAccessUpdate(await request.json(), actor.id, userId, current);

    await setUserAccess(adminClient, actor.id, userId, next);

    const { error: authError } = await adminClient.auth.admin.updateUserById(userId, {
      ban_duration: next.status === 'suspended' ? '876000h' : 'none'
    });
    if (authError) {
      await setUserAccess(adminClient, actor.id, userId, current, 'user_access_update_rolled_back');
      throw new Error(`AUTH_ACCOUNT_STATUS_UPDATE_FAILED ${authError.message}`);
    }

    const users = await getAdminUsers(adminClient, actor.id);
    return NextResponse.json({ user: users.find((user) => user.id === userId) || null });
  } catch (error) {
    const response = adminErrorResponse(error);
    return NextResponse.json(response.body, { status: response.status });
  }
}
