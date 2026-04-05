import { NextResponse } from 'next/server';

import { getProfileByUserId } from '@/lib/profile-store';
import { getSupabaseServiceClient } from '@/lib/supabase-service';
import { ACTIVATION_PAI_THRESHOLD } from '@/lib/pai-store';

type Viewer = {
  userId: string;
  email: string | null;
  isEmailVerified: boolean;
};

type ActiveViewer = Viewer & { isActive: true };

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

/**
 * Середній рівень авторизації: перевіряє Bearer-токен + is_active у app_users.
 * Повертає NextResponse з 401/403 при помилці або { viewer } при успіху.
 */
export async function requireActiveUser(
  request: Request,
): Promise<NextResponse | { viewer: ActiveViewer }> {
  const viewer = await getViewerFromRequest(request);
  if (!viewer) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }

  const supabase = getSupabaseServiceClient() as ReturnType<typeof getSupabaseServiceClient>;
  const { data } = await (supabase as any)
    .from('app_users')
    .select('is_active, balance_pai')
    .eq('id', viewer.userId)
    .maybeSingle();

  const active = data?.is_active || (Number(data?.balance_pai) >= ACTIVATION_PAI_THRESHOLD);

  if (!active) {
    return NextResponse.json(
      { error: 'account_inactive', message: 'Activate your account to use this feature' },
      { status: 403 },
    );
  }

  return { viewer: { ...viewer, isActive: true } };
}
