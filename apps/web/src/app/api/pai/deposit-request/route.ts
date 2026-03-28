import { NextResponse } from 'next/server';

import { getViewerFromRequest } from '@/lib/auth-server';
import { getCoopFundConfig } from '@/lib/coop-config';
import { createDepositRequest, PAI_UAH_PER_UNIT } from '@/lib/pai-store';

export async function POST(request: Request) {
  const viewer = await getViewerFromRequest(request);
  if (!viewer) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }

  try {
    const body = (await request.json()) as { amountUah?: unknown; receiptImageUrl?: unknown };
    const amountUah = typeof body.amountUah === 'number' ? body.amountUah : Number(body.amountUah);
    const receiptImageUrl = typeof body.receiptImageUrl === 'string' ? body.receiptImageUrl.trim() : '';

    if (!receiptImageUrl) {
      return NextResponse.json({ error: 'receiptImageUrl is required' }, { status: 400 });
    }

    if (!Number.isFinite(amountUah) || amountUah <= 0) {
      return NextResponse.json({ error: 'Invalid UAH amount' }, { status: 400 });
    }

    const depositRequest = await createDepositRequest(viewer.userId, amountUah, receiptImageUrl);
    return NextResponse.json({ depositRequest });
  } catch (error) {
    if (error instanceof Error && error.message === 'receipt_required') {
      return NextResponse.json({ error: 'Receipt URL is required' }, { status: 400 });
    }
    if (error instanceof Error && error.message === 'amount_uah_invalid') {
      return NextResponse.json({ error: 'Invalid UAH amount' }, { status: 400 });
    }
    if (error instanceof Error && error.message === 'first_deposit_too_small') {
      const { entranceUah } = getCoopFundConfig();
      return NextResponse.json(
        {
          error: `Перший внесок має бути не менше ${entranceUah + PAI_UAH_PER_UNIT} грн (вступний ${entranceUah} грн + мінімум паєвих одиниць).`,
        },
        { status: 400 },
      );
    }

    return NextResponse.json(
      { error: error instanceof Error ? error.message : 'Failed to create deposit request' },
      { status: 500 },
    );
  }
}
