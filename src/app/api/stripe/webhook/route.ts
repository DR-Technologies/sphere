import { NextRequest, NextResponse } from 'next/server';
import crypto from 'node:crypto';
import type Stripe from 'stripe';
import { createAdminSupabaseClient } from '@/lib/admin/server';
import { getStripeClient, resolveStripeUserId, syncStripeSubscription } from '@/lib/billing/stripeServer';

export const runtime = 'nodejs';

async function processEvent(event: Stripe.Event) {
  const admin = createAdminSupabaseClient();
  if (event.type.startsWith('customer.subscription.')) {
    const payload = event.data.object as Stripe.Subscription;
    const subscription = await getStripeClient().subscriptions.retrieve(payload.id);
    await syncStripeSubscription(
      admin,
      await resolveStripeUserId(admin, subscription),
      subscription,
      event.created,
      event.id
    );
    return;
  }
  if (event.type === 'checkout.session.completed') {
    const session = event.data.object as Stripe.Checkout.Session;
    if (typeof session.subscription === 'string') {
      const subscription = await getStripeClient().subscriptions.retrieve(session.subscription);
      const userId = await resolveStripeUserId(admin, subscription);
      if (session.client_reference_id && session.client_reference_id !== userId) {
        throw new Error('STRIPE_CHECKOUT_OWNER_MISMATCH');
      }
      await syncStripeSubscription(admin, userId, subscription, event.created, event.id);
    }
    return;
  }
  if (event.type === 'invoice.paid' || event.type === 'invoice.payment_failed') {
    const invoice = event.data.object as Stripe.Invoice;
    const customerId = typeof invoice.customer === 'string' ? invoice.customer : invoice.customer?.id;
    if (customerId) {
      const { error } = await admin.rpc('apply_stripe_invoice_status', {
        p_customer_id: customerId,
        p_invoice_status: event.type === 'invoice.paid' ? 'paid' : 'payment_failed',
        p_event_created_at: new Date(event.created * 1000).toISOString()
      });
      if (error) throw error;
    }
  }
}

export async function POST(request: NextRequest) {
  const signature = request.headers.get('stripe-signature');
  const secret = process.env.STRIPE_WEBHOOK_SECRET || '';
  if (!signature || !secret.startsWith('whsec_')) {
    return NextResponse.json({ error: 'Webhook no configurado.' }, { status: 503 });
  }

  let event: Stripe.Event;
  try {
    event = getStripeClient().webhooks.constructEvent(await request.text(), signature, secret);
  } catch {
    return NextResponse.json({ error: 'Firma de webhook inválida.' }, { status: 400 });
  }

  const admin = createAdminSupabaseClient();
  const claimToken = crypto.randomUUID();
  const { data: claimed, error: claimError } = await admin.rpc('claim_stripe_webhook_event', {
    p_event_id: event.id,
    p_event_type: event.type,
    p_event_created_at: new Date(event.created * 1000).toISOString(),
    p_claim_token: claimToken,
    p_lease_seconds: 600
  });
  if (claimError) return NextResponse.json({ error: 'No se pudo registrar el evento.' }, { status: 500 });
  if (!claimed?.claimed) return NextResponse.json({ received: true, duplicate: true, reason: claimed?.reason || 'not_claimed' });

  try {
    await processEvent(event);
    const { data: completed, error: completionError } = await admin.from('stripe_webhook_events').update({
      status: 'completed', processed_at: new Date().toISOString(), updated_at: new Date().toISOString(),
      last_error: null, lease_expires_at: null
    }).eq('event_id', event.id).eq('claim_token', claimToken).eq('status', 'processing').select('event_id').maybeSingle();
    if (completionError || !completed) throw new Error('STRIPE_EVENT_CLAIM_LOST');
    return NextResponse.json({ received: true });
  } catch (error) {
    const message = error instanceof Error ? error.message.slice(0, 1000) : 'WEBHOOK_PROCESSING_FAILED';
    await admin.from('stripe_webhook_events').update({
      status: 'failed', last_error: message, lease_expires_at: null, updated_at: new Date().toISOString()
    }).eq('event_id', event.id).eq('claim_token', claimToken).eq('status', 'processing');
    return NextResponse.json({ error: 'No se pudo procesar el evento.' }, { status: 500 });
  }
}
