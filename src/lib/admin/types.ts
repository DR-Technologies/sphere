export type AdminRole = 'standard' | 'superadmin';
export type SubscriptionPlan = 'free' | 'pro' | 'enterprise';
export type AccountStatus = 'active' | 'suspended';
export type DisplayAccountStatus = AccountStatus | 'invited';

export interface EffectiveAccountLimits {
  maxDatasets: number | null;
  maxReportsPerDataset: number | null;
  maxWidgetsPerReport: number;
}
export interface AdminUserSummary {
  id: string;
  email: string;
  name: string;
  role: AdminRole;
  subscriptionPlan: SubscriptionPlan;
  status: DisplayAccountStatus;
  accessStatus: AccountStatus;
  createdAt: string;
  lastSignInAt: string | null;
  invitedAt: string | null;
  emailConfirmedAt: string | null;
  datasets: number;
  reports: number;
  stories: number;
  limits: EffectiveAccountLimits;
  isCurrentUser: boolean;
}

export interface AdminUsersResponse {
  users: AdminUserSummary[];
}

export interface InviteAdminUserInput {
  email: string;
  name?: string;
  role: AdminRole;
  subscriptionPlan: SubscriptionPlan;
}

export interface UpdateAdminUserInput {
  role: AdminRole;
  subscriptionPlan: SubscriptionPlan;
  status: AccountStatus;
}
