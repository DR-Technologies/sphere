import type { SubscriptionPlan } from '@/lib/admin/types';
import type { BillingSubscriptionStatus, SubscriptionSource } from './types';

interface AccessPlanState { admin_plan_override?: string | null }
interface BillingPlanState { plan?: string | null; status?: string | null }

export function normalizedPlan(value: unknown): SubscriptionPlan {
  return value === 'pro' || value === 'enterprise' ? value : 'free';
}

export function normalizedBillingStatus(value: unknown): BillingSubscriptionStatus {
  const supported: BillingSubscriptionStatus[] = [
    'inactive', 'trialing', 'active', 'past_due', 'canceled', 'unpaid', 'incomplete', 'incomplete_expired', 'paused'
  ];
  return supported.includes(value as BillingSubscriptionStatus) ? value as BillingSubscriptionStatus : 'inactive';
}

export function resolveEffectiveSubscription(access: AccessPlanState, billing: BillingPlanState | null) {
  if (access.admin_plan_override) {
    return { plan: normalizedPlan(access.admin_plan_override), source: 'admin' as SubscriptionSource };
  }
  const status = normalizedBillingStatus(billing?.status);
  if (['trialing', 'active', 'past_due'].includes(status)) {
    return { plan: normalizedPlan(billing?.plan), source: 'stripe' as SubscriptionSource };
  }
  return { plan: 'free' as const, source: 'free' as SubscriptionSource };
}
