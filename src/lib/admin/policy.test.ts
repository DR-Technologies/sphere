import { describe, expect, it } from 'vitest';
import { effectiveLimitsForRole, validateAccessUpdate } from './policy';

describe('superadmin access policy', () => {
  it('preserves existing role-based limits and the universal widget limit', () => {
    expect(effectiveLimitsForRole('standard')).toEqual({
      maxDatasets: 3,
      maxReportsPerDataset: 3,
      maxWidgetsPerReport: 9
    });
    expect(effectiveLimitsForRole('superadmin')).toEqual({
      maxDatasets: null,
      maxReportsPerDataset: null,
      maxWidgetsPerReport: 9
    });
  });

  it('keeps security role and subscription plan independent', () => {
    expect(validateAccessUpdate(
      { subscriptionPlan: 'enterprise' },
      'admin-a',
      'admin-a',
      { role: 'superadmin', subscriptionPlan: 'free', status: 'active' }
    )).toEqual({ role: 'superadmin', subscriptionPlan: 'enterprise', status: 'active' });
  });

  it('rejects self-assignment or self-suspension of administrative access', () => {
    expect(() => validateAccessUpdate(
      { role: 'standard' },
      'admin-a',
      'admin-a',
      { role: 'superadmin', subscriptionPlan: 'free', status: 'active' }
    )).toThrow('ADMIN_SELF_ACCESS_CHANGE_FORBIDDEN');
    expect(() => validateAccessUpdate(
      { status: 'suspended' },
      'admin-a',
      'admin-a',
      { role: 'superadmin', subscriptionPlan: 'free', status: 'active' }
    )).toThrow('ADMIN_SELF_ACCESS_CHANGE_FORBIDDEN');
  });
});
