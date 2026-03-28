import { NextResponse } from 'next/server';

import { getCoopFundConfig } from '@/lib/coop-config';
import { getViewerFromRequest } from '@/lib/auth-server';
import { countCompletedDeposits, getBalancePai } from '@/lib/pai-store';

export async function GET(request: Request) {
  const viewer = await getViewerFromRequest(request);
  if (!viewer) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }

  try {
    const [balancePai, completedDeposits] = await Promise.all([
      getBalancePai(viewer.userId),
      countCompletedDeposits(viewer.userId),
    ]);
    const coop = getCoopFundConfig();
    return NextResponse.json({ balancePai, completedDeposits, ...coop });
  } catch (error) {
    return NextResponse.json(
      { error: error instanceof Error ? error.message : 'Failed to load balance' },
      { status: 500 },
    );
  }
}
