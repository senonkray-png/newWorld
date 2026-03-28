import { NextResponse } from 'next/server';

import { requireMainAdmin } from '@/lib/auth-server';
import { listDepositRequestsForAdmin } from '@/lib/pai-store';

export async function GET(request: Request) {
  const guard = await requireMainAdmin(request);
  if (guard) return guard;

  try {
    const depositRequests = await listDepositRequestsForAdmin();
    return NextResponse.json({ depositRequests });
  } catch (error) {
    return NextResponse.json(
      { error: error instanceof Error ? error.message : 'Failed to load deposit requests' },
      { status: 500 },
    );
  }
}
