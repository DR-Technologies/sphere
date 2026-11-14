import type {
  AccountStatus,
  AdminRole,
  EffectiveAccountLimits,
  SubscriptionPlan,
  UpdateAdminUserInput
} from './types';

export const ADMIN_ROLES: readonly AdminRole[] = ['standard', 'superadmin'];
export const SUBSCRIPTION_PLANS: readonly SubscriptionPlan[] = ['free', 'pro', 'enterprise'];
export const ACCOUNT_STATUSES: readonly AccountStatus[] = ['active', 'suspended'];

export function isAdminRole(value: unknown): value is AdminRole {
  return typeof value === 'string' && ADMIN_ROLES.includes(value as AdminRole);
}
export function isSubscriptionPlan(value: unknown): value is SubscriptionPlan {
  return typeof value === 'string' && SUBSCRIPTION_PLANS.includes(value as SubscriptionPlan);
}

export function isAccountStatus(value: unknown): value is AccountStatus {
  return typeof value === 'string' && ACCOUNT_STATUSES.includes(value as AccountStatus);
}

export function effectiveLimitsForRole(role: AdminRole): EffectiveAccountLimits {
  return {
    maxDatasets: role === 'superadmin' ? null : 3,
    maxReportsPerDataset: role === 'superadmin' ? null : 3,
    maxWidgetsPerReport: 9
  };
}

export function validateAccessUpdate(
  input: Partial<UpdateAdminUserInput>,
  actorUserId: string,
  targetUserId: string,
  current: UpdateAdminUserInput
): UpdateAdminUserInput {
  const next: UpdateAdminUserInput = {
    role: input.role ?? current.role,
    subscriptionPlan: input.subscriptionPlan ?? current.subscriptionPlan,
    status: input.status ?? current.status
  };

  if (!isAdminRole(next.role)) throw new Error('INVALID_ACCOUNT_ROLE');
  if (!isSubscriptionPlan(next.subscriptionPlan)) throw new Error('INVALID_SUBSCRIPTION_PLAN');
  if (!isAccountStatus(next.status)) throw new Error('INVALID_ACCOUNT_STATUS');

  if (actorUserId === targetUserId && (next.role !== current.role || next.status !== current.status)) {
    throw new Error('ADMIN_SELF_ACCESS_CHANGE_FORBIDDEN');
  }

  return next;
}
