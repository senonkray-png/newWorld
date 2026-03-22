import { NextResponse } from 'next/server';

import { getProfileByUserId } from '@/lib/profile-store';
import { getSupabaseServiceClient } from '@/lib/supabase-service';

type Viewer = {
  userId: string;
  email: string | null;
  isEmailVerified: boolean;
};

function readBearerToken(request: Request) {
  const header = request.headers.get('authorization');
  if (!header || !header.toLowerCase().startsWith('bearer ')) {
    return null;
  }

  return header.slice(7).trim();
}

export async function getViewerFromRequest(request: Request): Promise<Viewer | null> {
  const token = readBearerToken(request);
  if (!token) {
    return null;
  }

  const supabase = getSupabaseServiceClient();
  const { data, error } = await supabase.auth.getUser(token);

  if (error || !data.user) {
    return null;
  }

  return {
    userId: data.user.id,
    email: data.user.email ?? null,
    isEmailVerified: Boolean(data.user.email_confirmed_at),
  };
}

export async function requireMainAdmin(request: Request) {
  const viewer = await getViewerFromRequest(request);
  if (!viewer) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }

  const profile = await getProfileByUserId(viewer.userId);
  if (!profile || profile.role !== 'main_admin') {
    return NextResponse.json({ error: 'Forbidden' }, { status: 403 });
  }

  return null;
}

export async function isMainAdminUser(userId: string): Promise<boolean> {
  const profile = await getProfileByUserId(userId);
  return profile?.role === 'main_admin';
}
