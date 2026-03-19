import { NextResponse } from 'next/server';

import { getViewerFromRequest } from '@/lib/auth-server';
import { getOrCreateAppUserProfile, updateAppUserProfile } from '@/lib/app-user-store';

function mapApiError(error: unknown) {
  if (error instanceof Error && error.message.includes("Could not find the table 'public.app_users'")) {
    return 'Supabase table public.app_users not found. Apply migration 004_auth_profiles_marketplace.sql.';
  }

  return error instanceof Error ? error.message : 'Failed to save profile';
}

export async function GET(request: Request) {
  try {
    const viewer = await getViewerFromRequest(request);
    if (!viewer) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const profile = await getOrCreateAppUserProfile(viewer.userId, viewer.email, viewer.isEmailVerified);
    return NextResponse.json({ profile });
  } catch (error) {
    return NextResponse.json({ error: mapApiError(error) }, { status: 500 });
  }
}

export async function PUT(request: Request) {
  try {
    const viewer = await getViewerFromRequest(request);
    if (!viewer) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const payload = await request.json();
    const profile = await updateAppUserProfile(
      viewer.userId,
      viewer.email,
      viewer.isEmailVerified,
      payload?.profile ?? payload,
    );
    return NextResponse.json({ profile });
  } catch (error) {
    return NextResponse.json({ error: mapApiError(error) }, { status: 500 });
  }
}
