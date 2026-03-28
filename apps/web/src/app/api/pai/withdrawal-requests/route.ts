import { NextResponse } from 'next/server';

import { getViewerFromRequest } from '@/lib/auth-server';
import { listWithdrawalRequestsForUser } from '@/lib/pai-store';

export async function GET(request: Request) {
  const viewer = await getViewerFromRequest(request);
  if (!viewer) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }

  try {
    const withdrawals = await listWithdrawalRequestsForUser(viewer.userId);
    return NextResponse.json({ withdrawals });
  } catch (error) {
    return NextResponse.json(
      { error: error instanceof Error ? error.message : 'Failed' },
      { status: 500 },
    );
  }
}
