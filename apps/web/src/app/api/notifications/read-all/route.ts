import { NextResponse } from 'next/server';

import { getViewerFromRequest } from '@/lib/auth-server';
import { markAllNotificationsRead } from '@/lib/notification-store';

export async function POST(request: Request) {
  try {
    const viewer = await getViewerFromRequest(request);
    if (!viewer) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    await markAllNotificationsRead(viewer.userId);
    return NextResponse.json({ ok: true });
  } catch (error) {
    return NextResponse.json(
      { error: error instanceof Error ? error.message : 'Failed to mark all notifications' },
      { status: 500 },
    );
  }
}
