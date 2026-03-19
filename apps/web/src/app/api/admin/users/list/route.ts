import { NextResponse } from 'next/server';

import { requireMainAdmin } from '@/lib/auth-server';
import { getAllProfilesForAdmin } from '@/lib/profile-store';

export async function GET(request: Request) {
  const guard = await requireMainAdmin(request);
  if (guard) return guard;

  try {
    const users = await getAllProfilesForAdmin();
    return NextResponse.json({ users });
  } catch (error) {
    return NextResponse.json(
      { error: error instanceof Error ? error.message : 'Failed to load users' },
      { status: 500 },
    );
  }
}
