import { NextResponse } from 'next/server';

import { getSupabaseServiceClient } from '@/lib/supabase-service';

/**
 * POST /api/admin/processed-payments/[id]/reject
 * Адмін відхиляє нерозпізнану транзакцію з коментарем.
 */
export async function POST(
  request: Request,
  { params }: { params: Promise<{ id: string }> },
) {
  const { requireMainAdmin } = await import('@/lib/auth-server');
  const guard = await requireMainAdmin(request);
  if (guard) return guard;

  const { id: paymentId } = await params;
  const body = (await request.json()) as { comment?: string };
  const comment = typeof body.comment === 'string' ? body.comment.trim() : '';

  if (!comment) {
    return NextResponse.json({ error: 'Comment is required' }, { status: 400 });
  }

  const supabase = getSupabaseServiceClient() as any;

  const { error } = await supabase
    .from('processed_payments')
    .update({
      status: 'rejected',
      admin_comment: comment,
      resolved_at: new Date().toISOString(),
    })
    .eq('id', paymentId)
    .eq('status', 'manual_pending');

  if (error) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }

  return NextResponse.json({ ok: true });
}
