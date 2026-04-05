import { NextResponse } from 'next/server';

import { getViewerFromRequest } from '@/lib/auth-server';
import { type AppUserDirectoryEntry, getAppUserById, searchAppUsers } from '@/lib/app-user-store';
import { getSupabaseServiceClient } from '@/lib/supabase-service';

const MASKED = '';

function maskContactFields(user: AppUserDirectoryEntry): AppUserDirectoryEntry {
  return {
    ...user,
    phone: MASKED,
    workPhone: MASKED,
    telegram: MASKED,
    instagram: MASKED,
    email: MASKED,
    websiteUrl: MASKED,
  };
}

async function isViewerActive(viewer: { userId: string } | null): Promise<boolean> {
  if (!viewer) return false;
  const supabase = getSupabaseServiceClient() as any;
  const { data } = await supabase
    .from('app_users')
    .select('is_active')
    .eq('id', viewer.userId)
    .maybeSingle();
  return Boolean(data?.is_active);
}

function mapApiError(error: unknown) {
  if (error instanceof Error && error.message.includes("Could not find the table 'public.app_users'")) {
    return 'Supabase table public.app_users not found. Apply migration 004_auth_profiles_marketplace.sql.';
  }

  return error instanceof Error ? error.message : 'Failed to load users';
}

export async function GET(request: Request) {
  try {
    const url = new URL(request.url);
    const viewer = await getViewerFromRequest(request);
    const viewerActive = await isViewerActive(viewer);

    if (url.searchParams.has('id')) {
      const userId = url.searchParams.get('id') ?? '';
      const user = await getAppUserById(userId);
      if (!user) {
        return NextResponse.json({ error: 'User not found' }, { status: 404 });
      }
      return NextResponse.json({ user: viewerActive ? user : maskContactFields(user) });
    }

    const query = url.searchParams.get('q') ?? '';
    const interest = url.searchParams.get('interest') ?? '';
    const role = url.searchParams.get('role') ?? '';
    const excludeSelf = url.searchParams.get('excludeSelf') === '1';

    const users = await searchAppUsers(query, interest, role, excludeSelf ? viewer?.userId : undefined);
    return NextResponse.json({
      users: viewerActive ? users : users.map(maskContactFields),
    });
  } catch (error) {
    return NextResponse.json({ error: mapApiError(error) }, { status: 500 });
  }
}
