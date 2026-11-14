import { NextRequest, NextResponse } from 'next/server';
import { accountErrorResponse, requireAccountUser } from '@/lib/account/server';
import { ensureStripeCustomer, getStripeClient, stripePriceForPlan } from '@/lib/billing/stripeServer';

export const runtime = 'nodejs';

export async function POST(request: NextRequest) {
  try {
    const { user, adminClient, access } = await requireAccountUser(request);
    if (access.admin_plan_override) {
      return NextResponse.json({ error: 'Tu plan es administrado por Sphere y no puede cambiarse desde Checkout.', code: 'ADMIN_PLAN_OVERRIDE' }, { status: 409 });
    }
    const { data: existing, error: lookupError } = await adminClient
      .from('account_subscriptions')
      .select('status')
      .eq('user_id', user.id)
      .maybeSingle();
    if (lookupError) throw lookupError;
    if (existing && ['trialing', 'active', 'past_due'].includes(existing.status)) {
      return NextResponse.json({ error: 'Ya tienes una suscripción administrable desde el portal.', code: 'SUBSCRIPTION_ALREADY_ACTIVE' }, { status: 409 });
    }
    const body = await request.json() as { plan?: string };
    const plan = body.plan === 'pro' || body.plan === 'enterprise' ? body.plan : null;
    if (!plan) return NextResponse.json({ error: 'Selecciona un plan válido.', code: 'INVALID_PLAN' }, { status: 400 });
    const price = stripePriceForPlan(plan);
    if (!price) throw new Error('STRIPE_PRICE_NOT_CONFIGURED');
    const stripe = getStripeClient();
    const customer = await ensureStripeCustomer(adminClient, user);
    const origin = process.env.NEXT_PUBLIC_APP_URL || request.nextUrl.origin;
    const session = await stripe.checkout.sessions.create({
      mode: 'subscription', customer, line_items: [{ price, quantity: 1 }],
      client_reference_id: user.id,
      subscription_data: { metadata: { sphere_user_id: user.id, sphere_plan: plan } },
      success_url: `${origin}/?view=settings&billing=success`,
      cancel_url: `${origin}/?view=settings&billing=canceled`
    }, { idempotencyKey: `sphere-checkout-${user.id}-${plan}-${Math.floor(Date.now() / 300000)}` });
    return NextResponse.json({ url: session.url });
  } catch (error) {
    const response = accountErrorResponse(error);
    return NextResponse.json(response.body, { status: response.status });
  }
}
