import { NextResponse } from 'next/server';

import { getViewerFromRequest } from '@/lib/auth-server';
import { getSupabaseServiceClient } from '@/lib/supabase-service';
import { createNotification } from '@/lib/notification-store';

/**
 * POST /api/pai/help-request
 * Користувач повідомляє: «Я оплатив, але паї не надійшли».
 * Створює notification для всіх admin / super_admin.
 */
export async function POST(request: Request) {
  const viewer = await getViewerFromRequest(request);
  if (!viewer) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }

  const body = (await request.json()) as { description?: string; receiptUrl?: string };
  const description = typeof body.description === 'string' ? body.description.trim() : '';
  const receiptUrl = typeof body.receiptUrl === 'string' ? body.receiptUrl.trim() : '';

  if (!description && !receiptUrl) {
    return NextResponse.json({ error: 'Provide description or receipt' }, { status: 400 });
  }

  const supabase = getSupabaseServiceClient() as any;

  // Знайти всіх адмінів
  const { data: admins } = await supabase
    .from('app_users')
    .select('id')
    .eq('role', 'main_admin');

  const adminIds: string[] = (admins ?? []).map((a: { id: string }) => a.id);

  // Надіслати notification кожному адміну
  for (const adminId of adminIds) {
    await createNotification({
      userId: adminId,
      type: 'payment_help',
      title: 'Запит допомоги з оплатою',
      body: `Користувач ${viewer.email} повідомив: "${description}". ${receiptUrl ? `Чек: ${receiptUrl}` : '(без чека)'}`,
      entityType: 'payment_help',
      entityId: viewer.userId,
    });
  }

  return NextResponse.json({ ok: true, notified: adminIds.length });
}
