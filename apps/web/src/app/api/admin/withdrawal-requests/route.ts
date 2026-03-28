import { NextResponse } from 'next/server';

import { requireMainAdmin } from '@/lib/auth-server';
import { listWithdrawalRequestsForAdmin } from '@/lib/pai-store';

export async function GET(request: Request) {
  const guard = await requireMainAdmin(request);
  if (guard) return guard;

  try {
    const withdrawals = await listWithdrawalRequestsForAdmin();
    return NextResponse.json({ withdrawals });
  } catch (error) {
    return NextResponse.json(
      { error: error instanceof Error ? error.message : 'Failed' },
      { status: 500 },
    );
  }
}
