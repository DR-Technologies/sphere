import { NextRequest, NextResponse } from 'next/server';
import { accountErrorResponse, getAccountOverview, requireAccountUser } from '@/lib/account/server';

export const runtime = 'nodejs';

export async function GET(request: NextRequest) {
  try {
    const { user, access } = await requireAccountUser(request, { allowSuspended: true });
    return NextResponse.json(await getAccountOverview(user, access));
  } catch (error) {
    const response = accountErrorResponse(error);
    return NextResponse.json(response.body, { status: response.status });
  }
}
