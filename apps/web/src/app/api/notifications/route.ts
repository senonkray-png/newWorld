import { NextResponse } from 'next/server';

import { getViewerFromRequest } from '@/lib/auth-server';
import { listNotifications } from '@/lib/notification-store';

export async function GET(request: Request) {
  try {
    const viewer = await getViewerFromRequest(request);
    if (!viewer) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const notifications = await listNotifications(viewer.userId);
    return NextResponse.json({ notifications });
  } catch (error) {
    return NextResponse.json(
      { error: error instanceof Error ? error.message : 'Failed to load notifications' },
      { status: 500 },
    );
  }
}
