import { NextResponse } from 'next/server';

import { moderateAd } from '@/lib/ad-store';
import { getViewerFromRequest, isMainAdminUser } from '@/lib/auth-server';

type ModerationAction = 'warn' | 'remove' | 'restore';

export async function POST(
  request: Request,
  { params }: { params: Promise<{ id: string }> },
) {
  try {
    const viewer = await getViewerFromRequest(request);
    if (!viewer) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const isAdmin = await isMainAdminUser(viewer.userId);
    if (!isAdmin) {
      return NextResponse.json({ error: 'Forbidden' }, { status: 403 });
    }

    const { id } = await params;
    const body = (await request.json()) as {
      action?: ModerationAction;
      reason?: string;
    };

    const action = body.action;
    const reason = body.reason ?? '';

    if (action !== 'warn' && action !== 'remove' && action !== 'restore') {
      return NextResponse.json({ error: 'Invalid action' }, { status: 400 });
    }

    await moderateAd(viewer.userId, id, action, reason);
    return NextResponse.json({ ok: true });
  } catch (error) {
    if (error instanceof Error && error.message.includes('reason required')) {
      return NextResponse.json({ error: 'Reason is required' }, { status: 400 });
    }

    if (error instanceof Error && error.message.includes('not found')) {
      return NextResponse.json({ error: 'Ad not found' }, { status: 404 });
    }

    return NextResponse.json(
      { error: error instanceof Error ? error.message : 'Failed to moderate ad' },
      { status: 500 },
    );
  }
}
