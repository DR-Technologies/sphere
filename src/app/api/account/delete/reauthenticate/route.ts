import { NextRequest, NextResponse } from 'next/server';
import { accountErrorResponse, requireAccountUser } from '@/lib/account/server';
import { requestAccountDeletionVerification } from '@/lib/account/deletionServer';

export const runtime = 'nodejs';

export async function POST(request: NextRequest) {
  try {
    const context = await requireAccountUser(request);
    await requestAccountDeletionVerification(context.user);
    return NextResponse.json({ sent: true });
  } catch (error) {
    const response = accountErrorResponse(error);
    return NextResponse.json(response.body, { status: response.status });
  }
}
