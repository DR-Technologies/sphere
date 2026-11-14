import { NextRequest, NextResponse } from 'next/server';
import { accountErrorResponse, requireAccountUser } from '@/lib/account/server';
import { ensureStripeCustomer, getStripeClient } from '@/lib/billing/stripeServer';

export const runtime = 'nodejs';

export async function POST(request: NextRequest) {
  try {
    const { user, adminClient } = await requireAccountUser(request);
    const customer = await ensureStripeCustomer(adminClient, user);
    const origin = process.env.NEXT_PUBLIC_APP_URL || request.nextUrl.origin;
    const session = await getStripeClient().billingPortal.sessions.create({ customer, return_url: `${origin}/?view=settings` });
    return NextResponse.json({ url: session.url });
  } catch (error) {
    const response = accountErrorResponse(error);
    return NextResponse.json(response.body, { status: response.status });
  }
}
