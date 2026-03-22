import { NextResponse } from 'next/server';

import { getViewerFromRequest } from '@/lib/auth-server';
import { createAd, getAds, getAdsForViewer } from '@/lib/ad-store';

function mapApiError(error: unknown) {
  if (error instanceof Error && error.message.includes("Could not find the table 'public.ads'")) {
    return 'Supabase table public.ads not found. Apply migration 004_auth_profiles_marketplace.sql.';
  }

  if (error instanceof Error && error.message.includes("Could not find the table 'public.app_users'")) {
    return 'Supabase table public.app_users not found. Apply migration 004_auth_profiles_marketplace.sql.';
  }

  return error instanceof Error ? error.message : 'Failed to load ads';
}

export async function GET(request: Request) {
  try {
    const url = new URL(request.url);
    const includeMine = url.searchParams.get('includeMine') === '1';

    if (includeMine) {
      const viewer = await getViewerFromRequest(request);
      if (!viewer) {
        return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
      }

      const ads = await getAdsForViewer(viewer.userId);
      return NextResponse.json({ ads });
    }

    const ads = await getAds();
    return NextResponse.json({ ads });
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
    const ad = await createAd(viewer.userId, payload?.ad ?? payload);
    return NextResponse.json({ ad });
  } catch (error) {
    if (error instanceof Error && error.message.includes('required')) {
      return NextResponse.json({ error: error.message }, { status: 400 });
    }

    return NextResponse.json({ error: mapApiError(error) }, { status: 500 });
  }
}
