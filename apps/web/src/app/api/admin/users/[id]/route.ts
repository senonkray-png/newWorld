import { NextResponse } from 'next/server';

import { requireMainAdmin } from '@/lib/auth-server';
import { getAllProfilesForAdmin, setUserRole, userRoleValues } from '@/lib/profile-store';
import type { UserRole } from '@/lib/profile-store';

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

export async function PATCH(
  request: Request,
  { params }: { params: Promise<{ id: string }> },
) {
  const guard = await requireMainAdmin(request);
  if (guard) return guard;

  const { id } = await params;

  let body: unknown;
  try {
    body = await request.json();
  } catch {
    return NextResponse.json({ error: 'Invalid JSON' }, { status: 400 });
  }

  const role = (body as Record<string, unknown>)?.role;

  if (typeof role !== 'string' || !userRoleValues.includes(role as UserRole)) {
    return NextResponse.json({ error: 'Invalid role value' }, { status: 400 });
  }

  try {
    await setUserRole(id, role as UserRole);
    return NextResponse.json({ ok: true });
  } catch (error) {
    return NextResponse.json(
      { error: error instanceof Error ? error.message : 'Failed to update role' },
      { status: 500 },
    );
  }
}
