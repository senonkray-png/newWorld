import { NextResponse } from 'next/server';

import { requireMainAdmin } from '@/lib/auth-server';
import { rejectDepositRequest } from '@/lib/pai-store';

export async function POST(
  request: Request,
  { params }: { params: Promise<{ id: string }> },
) {
  const guard = await requireMainAdmin(request);
  if (guard) return guard;

  const { id } = await params;

  try {
    const body = (await request.json()) as { comment?: unknown };
    const comment = typeof body.comment === 'string' ? body.comment : '';

    await rejectDepositRequest(id, comment);
    return NextResponse.json({ ok: true });
  } catch (error) {
    if (error instanceof Error && error.message === 'comment_required') {
      return NextResponse.json({ error: 'comment is required' }, { status: 400 });
    }
    if (error instanceof Error && error.message === 'request_invalid') {
      return NextResponse.json({ error: 'Request not found or already resolved' }, { status: 400 });
    }

    return NextResponse.json(
      { error: error instanceof Error ? error.message : 'Reject failed' },
      { status: 500 },
    );
  }
}
