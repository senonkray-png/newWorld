import { NextResponse } from 'next/server';

import { requireMainAdmin } from '@/lib/auth-server';
import { approveDepositRequest } from '@/lib/pai-store';

export async function POST(
  request: Request,
  { params }: { params: Promise<{ id: string }> },
) {
  const guard = await requireMainAdmin(request);
  if (guard) return guard;

  const { id } = await params;

  try {
    await approveDepositRequest(id);
    return NextResponse.json({ ok: true });
  } catch (error) {
    if (error instanceof Error && error.message === 'request_invalid') {
      return NextResponse.json({ error: 'Request not found or already resolved' }, { status: 400 });
    }
    if (error instanceof Error && error.message === 'deposit_split_invalid') {
      return NextResponse.json(
        { error: 'Неможливо зарахувати: перевірте суму відносно вступного/членського внеску.' },
        { status: 400 },
      );
    }

    return NextResponse.json(
      { error: error instanceof Error ? error.message : 'Approve failed' },
      { status: 500 },
    );
  }
}
