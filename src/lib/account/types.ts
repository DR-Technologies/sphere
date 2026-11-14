import type { AdminRole, EffectiveAccountLimits, SubscriptionPlan } from '@/lib/admin/types';

export type BillingSubscriptionStatus =
  | 'inactive'
  | 'trialing'
  | 'active'
  | 'past_due'
  | 'canceled'
  | 'unpaid'
  | 'incomplete'
  | 'incomplete_expired'
  | 'paused';

export type SubscriptionSource = 'free' | 'stripe' | 'admin';

export interface AccountUsage {
  datasets: number;
  reports: number;
  stories: number;
}
export interface AccountDeletionSummary extends AccountUsage {
  exports: number;
  storageArtifacts: number;
  status: 'none' | 'processing' | 'failed';
}

export interface AccountOverview {
  user: {
    id: string;
    name: string;
    email: string;
    createdAt: string;
    lastSignInAt: string | null;
    pendingEmail: string | null;
  };
  role: AdminRole;
  subscription: {
    plan: SubscriptionPlan;
    source: SubscriptionSource;
    status: BillingSubscriptionStatus;
    cancelAtPeriodEnd: boolean;
    currentPeriodEnd: string | null;
    hasStripeCustomer: boolean;
    adminOverride: SubscriptionPlan | null;
  };
  usage: AccountUsage;
  limits: EffectiveAccountLimits;
  deletion: AccountDeletionSummary;
  billingConfigured: boolean;
}

export interface AccountDeletionRetryCredentials {
  requestId: string;
  retryToken: string;
}
