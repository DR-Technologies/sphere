import { describe, expect, it } from 'vitest';
import { resolveEffectiveSubscription } from './policy';

describe('account subscription resolution', () => {
  it('keeps security role independent and lets an administrative override win', () => {
    expect(resolveEffectiveSubscription(
      { admin_plan_override: 'enterprise' },
      { plan: 'pro', status: 'active' }
    )).toEqual({ plan: 'enterprise', source: 'admin' });
  });

  it('uses a valid Stripe subscription when no administrative override exists', () => {
    expect(resolveEffectiveSubscription(
      { admin_plan_override: null },
      { plan: 'pro', status: 'active' }
    )).toEqual({ plan: 'pro', source: 'stripe' });
  });

  it('falls back to free for canceled or incomplete subscriptions', () => {
    expect(resolveEffectiveSubscription({}, { plan: 'pro', status: 'canceled' })).toEqual({ plan: 'free', source: 'free' });
    expect(resolveEffectiveSubscription({}, { plan: 'enterprise', status: 'incomplete' })).toEqual({ plan: 'free', source: 'free' });
  });
});
