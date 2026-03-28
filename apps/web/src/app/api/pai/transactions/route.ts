import { NextResponse } from 'next/server';

import { getViewerFromRequest } from '@/lib/auth-server';
import { listPaiTransactions } from '@/lib/pai-store';

export async function GET(request: Request) {
  const viewer = await getViewerFromRequest(request);
  if (!viewer) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }

  try {
    const transactions = await listPaiTransactions(viewer.userId);
    return NextResponse.json({ transactions });
  } catch (error) {
    return NextResponse.json(
      { error: error instanceof Error ? error.message : 'Failed to load transactions' },
      { status: 500 },
    );
  }
}
