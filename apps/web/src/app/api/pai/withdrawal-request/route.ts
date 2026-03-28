import { NextResponse } from 'next/server';

import { getViewerFromRequest } from '@/lib/auth-server';
import { submitWithdrawalRequest } from '@/lib/pai-store';

export async function POST(request: Request) {
  const viewer = await getViewerFromRequest(request);
  if (!viewer) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }

  try {
    const body = (await request.json()) as { amountPai?: unknown; reason?: unknown };
    const amountPai = typeof body.amountPai === 'number' ? body.amountPai : Number(body.amountPai);
    const reason = typeof body.reason === 'string' ? body.reason.trim() : '';

    if (!reason || reason.length < 3) {
      return NextResponse.json({ error: 'reason is required (min 3 characters)' }, { status: 400 });
    }

    if (!Number.isFinite(amountPai) || amountPai <= 0) {
      return NextResponse.json({ error: 'Invalid amount' }, { status: 400 });
    }

    const id = await submitWithdrawalRequest(viewer.userId, amountPai, reason);
    return NextResponse.json({ id });
  } catch (error) {
    if (error instanceof Error && error.message === 'insufficient_balance') {
      return NextResponse.json({ error: 'Insufficient cooperative share balance' }, { status: 400 });
    }

    return NextResponse.json(
      { error: error instanceof Error ? error.message : 'Failed' },
      { status: 500 },
    );
  }
}
