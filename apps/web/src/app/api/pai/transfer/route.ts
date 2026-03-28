import { NextResponse } from 'next/server';

import { getViewerFromRequest } from '@/lib/auth-server';
import { transferPaiP2P } from '@/lib/pai-store';

export async function POST(request: Request) {
  const viewer = await getViewerFromRequest(request);
  if (!viewer) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }

  try {
    const body = (await request.json()) as { recipient?: unknown; amount?: unknown };
    const recipient = typeof body.recipient === 'string' ? body.recipient.trim() : '';
    const amount = typeof body.amount === 'number' ? body.amount : Number(body.amount);

    if (!recipient) {
      return NextResponse.json({ error: 'recipient is required (user id or email)' }, { status: 400 });
    }

    if (!Number.isFinite(amount) || amount <= 0) {
      return NextResponse.json({ error: 'amount must be a positive number' }, { status: 400 });
    }

    await transferPaiP2P(viewer.userId, recipient, amount);
    return NextResponse.json({ ok: true });
  } catch (error) {
    if (error instanceof Error) {
      if (error.message === 'recipient_not_found') {
        return NextResponse.json({ error: 'Recipient not found' }, { status: 404 });
      }
      if (error.message === 'cannot_transfer_to_self') {
        return NextResponse.json({ error: 'Cannot transfer to yourself' }, { status: 400 });
      }
      if (error.message === 'insufficient_balance') {
        return NextResponse.json({ error: 'Insufficient balance' }, { status: 400 });
      }
    }

    return NextResponse.json(
      { error: error instanceof Error ? error.message : 'Transfer failed' },
      { status: 500 },
    );
  }
}
