import { NextResponse } from 'next/server';

import { getViewerFromRequest } from '@/lib/auth-server';
import { getNonRefundableUahForUser } from '@/lib/pai-store';

export async function GET(request: Request) {
  const viewer = await getViewerFromRequest(request);
  if (!viewer) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }

  try {
    const nonRefundable = await getNonRefundableUahForUser(viewer.userId);
    return NextResponse.json({ nonRefundable });
  } catch (error) {
    return NextResponse.json(
      { error: error instanceof Error ? error.message : 'Failed' },
      { status: 500 },
    );
  }
}
