import { NextResponse } from 'next/server';

import { getViewerFromRequest } from '@/lib/auth-server';
import { purchaseProductWithPai } from '@/lib/pai-store';

export async function POST(request: Request) {
  const viewer = await getViewerFromRequest(request);
  if (!viewer) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }

  try {
    const body = (await request.json()) as { productId?: unknown };
    const productId = typeof body.productId === 'string' ? body.productId.trim() : '';

    if (!productId) {
      return NextResponse.json({ error: 'productId is required' }, { status: 400 });
    }

    await purchaseProductWithPai(viewer.userId, productId);
    return NextResponse.json({ ok: true });
  } catch (error) {
    if (error instanceof Error) {
      if (error.message === 'insufficient_balance') {
        return NextResponse.json({ error: 'Insufficient balance' }, { status: 400 });
      }
      if (error.message === 'product_not_found') {
        return NextResponse.json({ error: 'Product not found' }, { status: 404 });
      }
      if (error.message === 'product_unavailable') {
        return NextResponse.json({ error: 'Product is not available' }, { status: 400 });
      }
      if (error.message === 'cannot_buy_own_product') {
        return NextResponse.json({ error: 'Cannot purchase your own product' }, { status: 400 });
      }
    }

    return NextResponse.json(
      { error: error instanceof Error ? error.message : 'Purchase failed' },
      { status: 500 },
    );
  }
}
