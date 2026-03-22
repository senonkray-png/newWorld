import { NextResponse } from 'next/server';

import { getViewerFromRequest } from '@/lib/auth-server';
import { markNotificationRead } from '@/lib/notification-store';

export async function POST(
  request: Request,
  { params }: { params: Promise<{ id: string }> },
) {
  try {
    const viewer = await getViewerFromRequest(request);
    if (!viewer) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const { id } = await params;
    await markNotificationRead(viewer.userId, id);
    return NextResponse.json({ ok: true });
  } catch (error) {
    return NextResponse.json(
      { error: error instanceof Error ? error.message : 'Failed to mark notification' },
      { status: 500 },
    );
  }
}
