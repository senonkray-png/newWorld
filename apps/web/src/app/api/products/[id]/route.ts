import { NextResponse } from 'next/server';

import { getViewerFromRequest } from '@/lib/auth-server';
import { deleteProduct, updateProduct } from '@/lib/product-store';

export async function PUT(
  request: Request,
  { params }: { params: Promise<{ id: string }> },
) {
  try {
    const viewer = await getViewerFromRequest(request);
    if (!viewer) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const { id } = await params;
    const payload = await request.json();
    const product = await updateProduct(viewer.userId, id, payload?.product ?? payload);
    return NextResponse.json({ product });
  } catch (error) {
    if (error instanceof Error && error.message.includes('required')) {
      return NextResponse.json({ error: error.message }, { status: 400 });
    }

    if (error instanceof Error && error.message.includes('forbidden')) {
      return NextResponse.json({ error: 'Forbidden' }, { status: 403 });
    }

    if (error instanceof Error && error.message.includes('removed by admin')) {
      return NextResponse.json({ error: 'Item removed by admin and locked for editing' }, { status: 423 });
    }

    if (error instanceof Error && error.message.includes('not found')) {
      return NextResponse.json({ error: 'Product not found' }, { status: 404 });
    }

    return NextResponse.json(
      { error: error instanceof Error ? error.message : 'Failed to update product' },
      { status: 500 },
    );
  }
}

export async function DELETE(
  request: Request,
  { params }: { params: Promise<{ id: string }> },
) {
  try {
    const viewer = await getViewerFromRequest(request);
    if (!viewer) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const { id } = await params;
    await deleteProduct(viewer.userId, id);
    return NextResponse.json({ ok: true });
  } catch (error) {
    if (error instanceof Error && error.message.includes('forbidden')) {
      return NextResponse.json({ error: 'Forbidden' }, { status: 403 });
    }

    if (error instanceof Error && error.message.includes('not found')) {
      return NextResponse.json({ error: 'Product not found' }, { status: 404 });
    }

    return NextResponse.json(
      { error: error instanceof Error ? error.message : 'Failed to delete product' },
      { status: 500 },
    );
  }
}
