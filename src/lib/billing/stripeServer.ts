import 'server-only';

import Stripe from 'stripe';
import type { SupabaseClient, User } from '@supabase/supabase-js';
import type { SubscriptionPlan } from '@/lib/admin/types';
import { AccountApiError } from '@/lib/account/server';

let stripeClient: Stripe | null = null;

export function getStripeClient() {
  const secretKey = process.env.STRIPE_SECRET_KEY || '';
  if (!secretKey.startsWith('sk_test_')) {
    throw new AccountApiError(503, 'STRIPE_TEST_MODE_NOT_CONFIGURED', 'La facturación de prueba todavía no está configurada.');
  }
  stripeClient ||= new Stripe(secretKey);
  return stripeClient;
}
export function stripePriceForPlan(plan: SubscriptionPlan) {
  if (plan === 'pro') return process.env.STRIPE_PRICE_PRO || '';
  if (plan === 'enterprise') return process.env.STRIPE_PRICE_ENTERPRISE || '';
  return '';
}

export function planForStripePrice(priceId: string | null | undefined): SubscriptionPlan | null {
  if (priceId && priceId === process.env.STRIPE_PRICE_ENTERPRISE) return 'enterprise';
  if (priceId && priceId === process.env.STRIPE_PRICE_PRO) return 'pro';
  return null;
}

export function effectivePlanForBillingStatus(plan: SubscriptionPlan, status: string): SubscriptionPlan {
  return ['trialing', 'active', 'past_due'].includes(status) ? plan : 'free';
}

export async function ensureStripeCustomer(adminClient: SupabaseClient, user: User) {
  const { data: existing, error } = await adminClient
    .from('account_subscriptions')
    .select('stripe_customer_id')
    .eq('user_id', user.id)
    .maybeSingle();
  if (error) throw new AccountApiError(502, 'SUBSCRIPTION_LOOKUP_FAILED', 'No se pudo consultar la suscripción.');
  if (existing?.stripe_customer_id) return existing.stripe_customer_id as string;

  const stripe = getStripeClient();
  const customer = await stripe.customers.create({
    email: user.email,
    name: typeof user.user_metadata?.full_name === 'string' ? user.user_metadata.full_name : undefined,
    metadata: { sphere_user_id: user.id }
  }, { idempotencyKey: `sphere-customer-${user.id}` });

  const { error: upsertError } = await adminClient.from('account_subscriptions').upsert({
    user_id: user.id,
    stripe_customer_id: customer.id,
    plan: 'free',
    status: 'inactive',
    updated_at: new Date().toISOString()
  }, { onConflict: 'user_id' });
  if (upsertError) throw new AccountApiError(502, 'SUBSCRIPTION_CUSTOMER_SAVE_FAILED', 'No se pudo vincular la cuenta de facturación.');
  return customer.id;
}

export async function syncStripeSubscription(
  adminClient: SupabaseClient,
  userId: string,
  subscription: Stripe.Subscription,
  eventCreatedAt: number,
  eventId: string
) {
  const item = subscription.items.data[0];
  const priceId = item?.price?.id || null;
  const plan = planForStripePrice(priceId);
  if (!plan) throw new Error(`STRIPE_PRICE_NOT_RECOGNIZED ${priceId || 'missing'}`);
  const raw = subscription as unknown as {
    current_period_end?: number;
    cancel_at_period_end?: boolean;
    customer: string | { id: string };
  };
  const customerId = typeof raw.customer === 'string' ? raw.customer : raw.customer.id;
  const currentPeriodEnd = raw.current_period_end
    ? new Date(raw.current_period_end * 1000).toISOString()
    : null;

  const { data, error } = await adminClient.rpc('apply_stripe_subscription_state', {
    p_user_id: userId,
    p_customer_id: customerId,
    p_subscription_id: subscription.id,
    p_price_id: priceId,
    p_plan: plan,
    p_status: subscription.status,
    p_current_period_end: currentPeriodEnd,
    p_cancel_at_period_end: Boolean(raw.cancel_at_period_end),
    p_event_created_at: new Date(eventCreatedAt * 1000).toISOString(),
    p_event_id: eventId
  });
  if (error) throw new Error(`SUBSCRIPTION_SYNC_FAILED ${error.message}`);
  return Boolean(data);
}

export async function resolveStripeUserId(adminClient: SupabaseClient, subscription: Stripe.Subscription) {
  const metadataUserId = subscription.metadata?.sphere_user_id;
  const customerId = typeof subscription.customer === 'string' ? subscription.customer : subscription.customer.id;
  if (metadataUserId) {
    const { data, error } = await adminClient
      .from('account_subscriptions')
      .select('user_id')
      .eq('user_id', metadataUserId)
      .eq('stripe_customer_id', customerId)
      .maybeSingle();
    if (error) throw new Error(`STRIPE_SUBSCRIPTION_OWNER_LOOKUP_FAILED ${error.message}`);
    if (data?.user_id) return data.user_id as string;
  }
  const { data, error } = await adminClient
    .from('account_subscriptions')
    .select('user_id')
    .eq('stripe_customer_id', customerId)
    .maybeSingle();
  if (error || !data?.user_id) throw new Error('STRIPE_SUBSCRIPTION_OWNER_NOT_FOUND');
  return data.user_id as string;
}
