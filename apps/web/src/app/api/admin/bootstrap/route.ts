import { NextResponse } from 'next/server';

import { getViewerFromRequest } from '@/lib/auth-server';
import { getProfileByUserId, setUserRole } from '@/lib/profile-store';
import { getSupabaseServiceClient } from '@/lib/supabase-service';

/**
 * POST /api/admin/bootstrap
 * Lets the first user claim main_admin if there are currently 0 admins in the DB.
 * Safe to leave in: once any admin exists this endpoint does nothing.
 */
export async function POST(request: Request) {
  const viewer = await getViewerFromRequest(request);
  if (!viewer) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }

  const supabase = getSupabaseServiceClient() as any;

  // Count existing main_admins
  const { count, error: countError } = await supabase
    .from('user_profiles')
    .select('*', { count: 'exact', head: true })
    .eq('role', 'main_admin');

  if (countError) {
    return NextResponse.json({ error: countError.message }, { status: 500 });
  }

  if ((count ?? 0) > 0) {
    return NextResponse.json(
      { error: 'Admin already exists. Ask them to grant you the role.' },
      { status: 403 },
    );
  }

  // Check the requesting user has a profile
  const profile = await getProfileByUserId(viewer.userId);
  if (!profile) {
    return NextResponse.json(
      { error: 'Profile not found. Complete registration first.' },
      { status: 404 },
    );
  }

  await setUserRole(viewer.userId, 'main_admin');

  return NextResponse.json({ ok: true, message: 'You are now main_admin.' });
}
