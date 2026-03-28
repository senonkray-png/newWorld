import { NextResponse } from 'next/server';

import { getViewerFromRequest } from '@/lib/auth-server';
import { listDepositRequestsForUser } from '@/lib/pai-store';

export async function GET(request: Request) {
  const viewer = await getViewerFromRequest(request);
  if (!viewer) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }

  try {
    const depositRequests = await listDepositRequestsForUser(viewer.userId);
    return NextResponse.json({ depositRequests });
  } catch (error) {
    return NextResponse.json(
      { error: error instanceof Error ? error.message : 'Failed to load deposit requests' },
      { status: 500 },
    );
  }
}
