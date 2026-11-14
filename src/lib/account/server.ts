import 'server-only';

import type { NextRequest } from 'next/server';
import type { User } from '@supabase/supabase-js';
import { createAdminSupabaseClient } from '@/lib/admin/server';
import { effectiveLimitsForRole } from '@/lib/admin/policy';
import type { AccountStatus, AdminRole } from '@/lib/admin/types';
import type { AccountOverview } from './types';
import { createServerSupabaseClient } from '@/lib/supabaseServer';
import { normalizedBillingStatus, normalizedPlan, resolveEffectiveSubscription } from './policy';

export { resolveEffectiveSubscription } from './policy';

interface AccountAccessRow {
  role?: string | null;
  status?: string | null;
  subscription_plan?: string | null;
  admin_plan_override?: string | null;
}
interface BillingRow {
  plan?: string | null;
  status?: string | null;
  stripe_customer_id?: string | null;
  stripe_subscription_id?: string | null;
  current_period_end?: string | null;
  cancel_at_period_end?: boolean | null;
}

export class AccountApiError extends Error {
  readonly status: number;
  readonly code: string;
  readonly details?: Record<string, unknown>;

  constructor(status: number, code: string, message: string, details?: Record<string, unknown>) {
    super(message);
    this.name = 'AccountApiError';
    this.status = status;
    this.code = code;
    this.details = details;
  }
}

export function accountAccessToken(request: NextRequest) {
  const authorization = request.headers.get('authorization') || '';
  return authorization.startsWith('Bearer ') ? authorization.slice('Bearer '.length) : '';
}

export async function requireAccountUser(request: NextRequest, options: { allowSuspended?: boolean } = {}) {
  const accessToken = accountAccessToken(request);
  if (!accessToken) throw new AccountApiError(401, 'AUTHENTICATION_REQUIRED', 'Debes iniciar sesión.');

  const authClient = createServerSupabaseClient(accessToken);
  const { data, error } = await authClient.auth.getUser(accessToken);
  if (error || !data.user) throw new AccountApiError(401, 'INVALID_SESSION', 'La sesión no es válida.');

  const adminClient = createAdminSupabaseClient();
  const { data: access, error: accessError } = await adminClient
    .from('user_roles')
    .select('role,status,subscription_plan,admin_plan_override')
    .eq('user_id', data.user.id)
    .maybeSingle();
  if (accessError) throw new AccountApiError(503, 'ACCOUNT_ACCESS_UNAVAILABLE', 'No se pudo consultar el acceso de la cuenta.');

  const status: AccountStatus = access?.status === 'suspended' ? 'suspended' : 'active';
  if (status !== 'active' && !options.allowSuspended) {
    throw new AccountApiError(403, 'ACCOUNT_SUSPENDED', 'Esta cuenta está suspendida.');
  }

  return {
    user: data.user,
    accessToken,
    authClient,
    adminClient,
    access: (access || {}) as AccountAccessRow
  };
}

export function accountErrorResponse(error: unknown) {
  if (error instanceof AccountApiError) {
    return { status: error.status, body: { error: error.message, code: error.code, ...error.details } };
  }
  const message = error instanceof Error ? error.message : '';
  if (message.includes('LAST_SUPERADMIN_REQUIRED')) {
    return { status: 409, body: { error: 'No se puede eliminar al último SUPERADMIN activo.', code: 'LAST_SUPERADMIN_REQUIRED' } };
  }
  return {
    status: 500,
    body: { error: 'No se pudo completar la operación de cuenta.', code: 'ACCOUNT_OPERATION_FAILED' }
  };
}

function userName(user: User) {
  const metadata = user.user_metadata || {};
  const candidate = metadata.full_name || metadata.name || metadata.display_name;
  return typeof candidate === 'string' && candidate.trim() ? candidate.trim() : (user.email?.split('@')[0] || 'Usuario');
}

function billingConfigured() {
  return Boolean(
    process.env.STRIPE_SECRET_KEY?.startsWith('sk_test_')
    && process.env.STRIPE_PRICE_PRO
    && process.env.STRIPE_PRICE_ENTERPRISE
  );
}

export async function getAccountOverview(user: User, access: AccountAccessRow): Promise<AccountOverview> {
  const adminClient = createAdminSupabaseClient();
  const [billingResult, datasetResult, reportResult, storyResult, exportResult, deletionResult] = await Promise.all([
    adminClient.from('account_subscriptions').select('*').eq('user_id', user.id).maybeSingle(),
    adminClient.from('datasets').select('id', { count: 'exact', head: true }).eq('user_id', user.id),
    adminClient.from('reports').select('id', { count: 'exact', head: true }).eq('user_id', user.id),
    adminClient.from('stories').select('id', { count: 'exact', head: true }).eq('user_id', user.id),
    adminClient.from('story_export_jobs').select('id', { count: 'exact', head: true }).eq('user_id', user.id),
    adminClient.from('account_deletion_requests').select('status,resources').eq('user_id', user.id).maybeSingle()
  ]);

  const firstError = [billingResult.error, datasetResult.error, reportResult.error, storyResult.error, exportResult.error, deletionResult.error]
    .find(Boolean);
  if (firstError) throw new AccountApiError(503, 'ACCOUNT_OVERVIEW_UNAVAILABLE', 'No se pudo cargar el resumen de la cuenta.');

  const billing = billingResult.data as BillingRow | null;
  const role: AdminRole = access.role === 'superadmin' ? 'superadmin' : 'standard';
  const effective = resolveEffectiveSubscription(access, billing);
  const deletionStatus = deletionResult.data?.status === 'failed'
    ? 'failed'
    : deletionResult.data?.status === 'processing' ? 'processing' : 'none';
  const resources = (deletionResult.data?.resources || {}) as Record<string, unknown>;

  return {
    user: {
      id: user.id,
      name: userName(user),
      email: user.email || '',
      createdAt: user.created_at,
      lastSignInAt: user.last_sign_in_at || null,
      pendingEmail: typeof user.new_email === 'string' && user.new_email ? user.new_email : null
    },
    role,
    subscription: {
      plan: effective.plan,
      source: effective.source,
      status: normalizedBillingStatus(billing?.status),
      cancelAtPeriodEnd: Boolean(billing?.cancel_at_period_end),
      currentPeriodEnd: billing?.current_period_end || null,
      hasStripeCustomer: Boolean(billing?.stripe_customer_id),
      adminOverride: access.admin_plan_override ? normalizedPlan(access.admin_plan_override) : null
    },
    usage: {
      datasets: datasetResult.count || 0,
      reports: reportResult.count || 0,
      stories: storyResult.count || 0
    },
    limits: effectiveLimitsForRole(role),
    deletion: {
      datasets: Number(resources.dataset_count ?? datasetResult.count ?? 0),
      reports: Number(resources.report_count ?? reportResult.count ?? 0),
      stories: Number(resources.story_count ?? storyResult.count ?? 0),
      exports: Number(resources.export_count ?? exportResult.count ?? 0),
      storageArtifacts: Number(resources.storage_artifact_count ?? 0),
      status: deletionStatus
    },
    billingConfigured: billingConfigured()
  };
}
