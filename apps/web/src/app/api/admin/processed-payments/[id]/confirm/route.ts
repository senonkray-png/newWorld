import { NextResponse } from 'next/server';

import { getSupabaseServiceClient } from '@/lib/supabase-service';

/**
 * POST /api/admin/processed-payments/[id]/confirm
 * Адмін вручну підтверджує нерозпізнану транзакцію —
 * вказує правильний user_id, система нараховує паї.
 */
export async function POST(
  request: Request,
  { params }: { params: Promise<{ id: string }> },
) {
  const { requireMainAdmin } = await import('@/lib/auth-server');
  const guard = await requireMainAdmin(request);
  if (guard) return guard;

  const { id: paymentId } = await params;
  const body = (await request.json()) as { userId?: string };
  const userId = typeof body.userId === 'string' ? body.userId.trim() : '';

  if (!userId) {
    return NextResponse.json({ error: 'userId is required' }, { status: 400 });
  }

  const supabase = getSupabaseServiceClient() as any;

  // Виклик RPC admin_confirm_payment
  const { error } = await supabase.rpc('admin_confirm_payment', {
    p_payment_id: paymentId,
    p_user_id: userId,
  });

  if (error) {
    const msg = error.message ?? '';
    if (msg.includes('payment_not_found')) {
      return NextResponse.json({ error: 'Payment not found' }, { status: 404 });
    }
    if (msg.includes('payment_already_processed')) {
      return NextResponse.json({ error: 'Payment already processed' }, { status: 409 });
    }
    if (msg.includes('user_not_found')) {
      return NextResponse.json({ error: 'User not found' }, { status: 404 });
    }
    return NextResponse.json({ error: msg }, { status: 500 });
  }

  return NextResponse.json({ ok: true });
}
