import 'server-only';

import { createClient, type SupabaseClient, type User } from '@supabase/supabase-js';
import type { NextRequest } from 'next/server';
import { createServerSupabaseClient } from '@/lib/supabaseServer';
import { effectiveLimitsForRole } from './policy';
import type {
  AccountStatus,
  AdminRole,
  AdminUserSummary,
  SubscriptionPlan,
  UpdateAdminUserInput
} from './types';

interface UserUsageRow {
  user_id: string;
  role: AdminRole;
  subscription_plan: SubscriptionPlan;
  status: AccountStatus;
  dataset_count: number;
  report_count: number;
  story_count: number;
}
export class AdminApiError extends Error {
  readonly status: number;
  readonly code: string;

  constructor(status: number, code: string, message: string) {
    super(message);
    this.name = 'AdminApiError';
    this.status = status;
    this.code = code;
  }
}

function getAdminConfig() {
  const url = process.env.NEXT_PUBLIC_SUPABASE_URL || '';
  const serviceRoleKey = process.env.SUPABASE_SERVICE_ROLE_KEY || '';
  if (!url || !serviceRoleKey) {
    throw new AdminApiError(503, 'ADMIN_SERVICE_NOT_CONFIGURED', 'La administración todavía no está configurada en este entorno.');
  }
  return { url, serviceRoleKey };
}

export function createAdminSupabaseClient() {
  const { url, serviceRoleKey } = getAdminConfig();
  return createClient(url, serviceRoleKey, {
    auth: { persistSession: false, autoRefreshToken: false }
  });
}

function accessTokenFromRequest(request: NextRequest) {
  const authorization = request.headers.get('authorization') || '';
  return authorization.startsWith('Bearer ') ? authorization.slice('Bearer '.length) : '';
}

export async function requireSuperadmin(request: NextRequest) {
  const accessToken = accessTokenFromRequest(request);
  if (!accessToken) {
    throw new AdminApiError(401, 'AUTHENTICATION_REQUIRED', 'Debes iniciar sesión.');
  }

  const sessionClient = createServerSupabaseClient(accessToken);
  const { data: authData, error: authError } = await sessionClient.auth.getUser(accessToken);
  if (authError || !authData.user) {
    throw new AdminApiError(401, 'INVALID_SESSION', 'La sesión no es válida.');
  }

  const adminClient = createAdminSupabaseClient();
  const { data: access, error: accessError } = await adminClient
    .from('user_roles')
    .select('role,status')
    .eq('user_id', authData.user.id)
    .maybeSingle();

  if (accessError) {
    throw new AdminApiError(503, 'ADMIN_ACCESS_LOOKUP_FAILED', 'No se pudo verificar el acceso administrativo.');
  }
  if (access?.role !== 'superadmin' || access.status !== 'active') {
    throw new AdminApiError(403, 'SUPERADMIN_REQUIRED', 'Esta operación requiere acceso SUPERADMIN.');
  }

  return { actor: authData.user, adminClient };
}

export function adminErrorResponse(error: unknown) {
  if (error instanceof AdminApiError) {
    return { status: error.status, body: { error: error.message, code: error.code } };
  }

  const message = error instanceof Error ? error.message : 'ADMIN_OPERATION_FAILED';
  const knownConflict = message.includes('LAST_SUPERADMIN_REQUIRED')
    || message.includes('ADMIN_SELF_ACCESS_CHANGE_FORBIDDEN');
  return {
    status: knownConflict ? 409 : 500,
    body: {
      error: knownConflict
        ? (message.includes('LAST_SUPERADMIN_REQUIRED')
          ? 'No se puede desactivar o degradar al último SUPERADMIN activo.'
          : 'No puedes cambiar tu propio rol o estado de acceso.')
        : 'No se pudo completar la operación administrativa.',
      code: knownConflict
        ? (message.includes('LAST_SUPERADMIN_REQUIRED') ? 'LAST_SUPERADMIN_REQUIRED' : 'ADMIN_SELF_ACCESS_CHANGE_FORBIDDEN')
        : 'ADMIN_OPERATION_FAILED'
    }
  };
}

async function listAllAuthUsers(adminClient: SupabaseClient) {
  const users: User[] = [];
  let page = 1;

  while (true) {
    const { data, error } = await adminClient.auth.admin.listUsers({ page, perPage: 1000 });
    if (error) throw new AdminApiError(502, 'AUTH_USERS_LIST_FAILED', 'No se pudieron consultar los usuarios registrados.');
    users.push(...data.users);
    if (!data.nextPage || data.users.length === 0) break;
    page = data.nextPage;
  }

  return users;
}

function userName(user: User) {
  const metadata = user.user_metadata || {};
  const candidate = metadata.full_name || metadata.name || metadata.display_name;
  return typeof candidate === 'string' && candidate.trim() ? candidate.trim() : (user.email?.split('@')[0] || 'Usuario');
}

function isAuthUserBanned(user: User) {
  if (!user.banned_until) return false;
  const bannedUntil = new Date(user.banned_until).getTime();
  return Number.isFinite(bannedUntil) && bannedUntil > Date.now();
}

export async function getAdminUsers(adminClient: SupabaseClient, actorUserId: string): Promise<AdminUserSummary[]> {
  const [authUsers, usageResult] = await Promise.all([
    listAllAuthUsers(adminClient),
    adminClient.rpc('admin_get_user_usage')
  ]);

  if (usageResult.error) {
    throw new AdminApiError(502, 'USER_USAGE_LOOKUP_FAILED', 'No se pudo consultar el consumo de las cuentas.');
  }

  const usageByUser = new Map(
    ((usageResult.data || []) as UserUsageRow[]).map((row) => [row.user_id, row])
  );

  return authUsers
    .map((user): AdminUserSummary => {
      const usage = usageByUser.get(user.id);
      const role: AdminRole = usage?.role === 'superadmin' ? 'superadmin' : 'standard';
      const accessStatus: AccountStatus = usage?.status === 'suspended' || isAuthUserBanned(user) ? 'suspended' : 'active';
      const isInvited = !user.email_confirmed_at && Boolean(user.invited_at);
      return {
        id: user.id,
        email: user.email || '',
        name: userName(user),
        role,
        subscriptionPlan: usage?.subscription_plan || 'free',
        status: accessStatus === 'suspended' ? 'suspended' : (isInvited ? 'invited' : 'active'),
        accessStatus,
        createdAt: user.created_at,
        lastSignInAt: user.last_sign_in_at || null,
        invitedAt: user.invited_at || null,
        emailConfirmedAt: user.email_confirmed_at || null,
        datasets: Number(usage?.dataset_count || 0),
        reports: Number(usage?.report_count || 0),
        stories: Number(usage?.story_count || 0),
        limits: effectiveLimitsForRole(role),
        isCurrentUser: user.id === actorUserId
      };
    })
    .sort((left, right) => right.createdAt.localeCompare(left.createdAt));
}

export async function getUserAccess(adminClient: SupabaseClient, userId: string): Promise<UpdateAdminUserInput> {
  const { data, error } = await adminClient
    .from('user_roles')
    .select('role,subscription_plan,status')
    .eq('user_id', userId)
    .maybeSingle();
  if (error) throw new AdminApiError(502, 'USER_ACCESS_LOOKUP_FAILED', 'No se pudo consultar el acceso de la cuenta.');
  return {
    role: data?.role === 'superadmin' ? 'superadmin' : 'standard',
    subscriptionPlan: data?.subscription_plan || 'free',
    status: data?.status === 'suspended' ? 'suspended' : 'active'
  };
}

export async function setUserAccess(
  adminClient: SupabaseClient,
  actorUserId: string,
  targetUserId: string,
  access: UpdateAdminUserInput,
  action = 'user_access_updated'
) {
  const { data, error } = await adminClient.rpc('admin_set_user_access', {
    p_actor_user_id: actorUserId,
    p_target_user_id: targetUserId,
    p_role: access.role,
    p_subscription_plan: access.subscriptionPlan,
    p_status: access.status,
    p_action: action
  });
  if (error) throw new Error(`${error.code || ''} ${error.message} ${error.details || ''}`.trim());
  const { error: overrideError } = await adminClient
    .from('user_roles')
    .update({ admin_plan_override: access.subscriptionPlan })
    .eq('user_id', targetUserId);
  if (overrideError) throw new AdminApiError(502, 'ADMIN_PLAN_OVERRIDE_FAILED', 'El acceso se actualizó, pero no fue posible registrar el plan administrativo.');
  return data;
}
