import { NextResponse } from 'next/server';

import { getSupabaseServiceClient } from '@/lib/supabase-service';

/**
 * GET /api/admin/processed-payments
 * Список транзакцій з Monobank (очередь перевірки).
 * ?status=manual_pending — тільки нерозпізнані (default).
 * ?status=all — всі.
 */
export async function GET(request: Request) {
  const { requireMainAdmin } = await import('@/lib/auth-server');
  const guard = await requireMainAdmin(request);
  if (guard) return guard;

  const { searchParams } = new URL(request.url);
  const statusFilter = searchParams.get('status') ?? 'manual_pending';

  const supabase = getSupabaseServiceClient() as any;

  let query = supabase
    .from('processed_payments')
    .select('*')
    .order('created_at', { ascending: false })
    .limit(200);

  if (statusFilter !== 'all') {
    query = query.eq('status', statusFilter);
  }

  const { data, error } = await query;

  if (error) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }

  return NextResponse.json({ payments: data ?? [] });
}
