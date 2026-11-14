import { NextRequest, NextResponse } from 'next/server';
import { isAdminRole, isSubscriptionPlan } from '@/lib/admin/policy';
import { adminErrorResponse, getAdminUsers, requireSuperadmin, setUserAccess } from '@/lib/admin/server';

export const runtime = 'nodejs';

export async function GET(request: NextRequest) {
  try {
    const { actor, adminClient } = await requireSuperadmin(request);
    return NextResponse.json({ users: await getAdminUsers(adminClient, actor.id) });
  } catch (error) {
    const response = adminErrorResponse(error);
    return NextResponse.json(response.body, { status: response.status });
  }
}
export async function POST(request: NextRequest) {
  try {
    const { actor, adminClient } = await requireSuperadmin(request);
    const body = await request.json() as Record<string, unknown>;
    const email = typeof body.email === 'string' ? body.email.trim().toLowerCase() : '';
    const name = typeof body.name === 'string' ? body.name.trim() : '';
    const role = body.role;
    const subscriptionPlan = body.subscriptionPlan;

    if (!/^\S+@\S+\.\S+$/.test(email) || !isAdminRole(role) || !isSubscriptionPlan(subscriptionPlan)) {
      return NextResponse.json({ error: 'Revisa el correo, rol y plan de la invitación.', code: 'INVALID_INVITATION' }, { status: 400 });
    }

    const redirectTo = new URL('/auth/callback', request.nextUrl.origin).toString();
    const { data, error } = await adminClient.auth.admin.inviteUserByEmail(email, {
      data: name ? { full_name: name } : undefined,
      redirectTo
    });
    if (error || !data.user) {
      return NextResponse.json({ error: error?.message || 'No se pudo enviar la invitación.', code: 'INVITATION_FAILED' }, { status: 502 });
    }

    try {
      await setUserAccess(adminClient, actor.id, data.user.id, {
        role,
        subscriptionPlan,
        status: 'active'
      }, 'user_invited');
    } catch (accessError) {
      await adminClient.auth.admin.deleteUser(data.user.id, false);
      throw accessError;
    }

    const users = await getAdminUsers(adminClient, actor.id);
    return NextResponse.json({ user: users.find((user) => user.id === data.user?.id) || null }, { status: 201 });
  } catch (error) {
    const response = adminErrorResponse(error);
    return NextResponse.json(response.body, { status: response.status });
  }
}
