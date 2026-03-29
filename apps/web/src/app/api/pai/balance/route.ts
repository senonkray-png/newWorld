import { NextResponse } from 'next/server';

import { getCoopFundConfig } from '@/lib/coop-config';
import { getViewerFromRequest } from '@/lib/auth-server';
import { countCompletedDeposits, getBalancePai } from '@/lib/pai-store';
import { getSupabaseServiceClient } from '@/lib/supabase-service';

export async function GET(request: Request) {
  const viewer = await getViewerFromRequest(request);
  if (!viewer) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }

  try {
    const supabase = getSupabaseServiceClient() as any;
    const [balancePai, completedDeposits, memberRow] = await Promise.all([
      getBalancePai(viewer.userId),
      countCompletedDeposits(viewer.userId),
      supabase.from('app_users').select('member_id').eq('id', viewer.userId).maybeSingle().then((r: any) => r.data),
    ]);
    const coop = getCoopFundConfig();
    return NextResponse.json({
      balancePai,
      completedDeposits,
      memberId: memberRow?.member_id ?? null,
      userId: viewer.userId,
      ...coop,
    });
  } catch (error) {
    return NextResponse.json(
      { error: error instanceof Error ? error.message : 'Failed to load balance' },
      { status: 500 },
    );
  }
}
