import { NextResponse } from 'next/server';

import { getViewerFromRequest } from '@/lib/auth-server';
import { createProduct, getProducts, getProductsForViewer } from '@/lib/product-store';

function mapApiError(error: unknown) {
  if (error instanceof Error && error.message.includes("Could not find the table 'public.products'")) {
    return 'Supabase table public.products not found. Apply migration 004_auth_profiles_marketplace.sql.';
  }

  if (error instanceof Error && error.message.includes("Could not find the table 'public.app_users'")) {
    return 'Supabase table public.app_users not found. Apply migration 004_auth_profiles_marketplace.sql.';
  }

  return error instanceof Error ? error.message : 'Failed to load products';
}

export async function GET(request: Request) {
  try {
    const url = new URL(request.url);
    const sellerId = (url.searchParams.get('sellerId') ?? '').trim();
    const includeMine = url.searchParams.get('includeMine') === '1';

    if (includeMine) {
      const viewer = await getViewerFromRequest(request);
      if (!viewer) {
        return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
      }

      const products = await getProductsForViewer(viewer.userId);
      return NextResponse.json({ products });
    }

    const products = await getProducts(sellerId || undefined);
    return NextResponse.json({ products });
  } catch (error) {
    return NextResponse.json({ error: mapApiError(error) }, { status: 500 });
  }
}

export async function POST(request: Request) {
  try {
    const viewer = await getViewerFromRequest(request);
    if (!viewer) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const payload = await request.json();
    const product = await createProduct(viewer.userId, payload?.product ?? payload);
    return NextResponse.json({ product });
  } catch (error) {
    if (error instanceof Error && error.message.includes('seller role required')) {
      return NextResponse.json({ error: 'Only seller can create products' }, { status: 403 });
    }

    if (error instanceof Error && error.message.includes('required')) {
      return NextResponse.json({ error: error.message }, { status: 400 });
    }

    return NextResponse.json({ error: mapApiError(error) }, { status: 500 });
  }
}
