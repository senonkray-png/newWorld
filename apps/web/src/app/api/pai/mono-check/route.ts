import { NextResponse } from 'next/server';

import { runMonoCheck } from '@/lib/mono-check';

/**
 * GET /api/pai/mono-check
 *
 * Запускає перевірку виписки Monobank і автоматично зараховує
 * підтверджені платежі. Захищений секретним ключем (CRON_SECRET)
 * або адмін-токеном.
 *
 * Виклик: Vercel Cron / зовнішній cron / ручний запуск.
 */
export async function GET(request: Request) {
  // Перевірка авторизації: або CRON_SECRET, або Bearer-токен адміна
  const cronSecret = process.env.CRON_SECRET;
  const authHeader = request.headers.get('authorization');

  const isCronAuth = cronSecret && authHeader === `Bearer ${cronSecret}`;

  if (!isCronAuth) {
    // Дозволити також адміну через Supabase JWT
    const { requireMainAdmin } = await import('@/lib/auth-server');
    const guard = await requireMainAdmin(request);
    if (guard) return guard;
  }

  try {
    const result = await runMonoCheck();
    return NextResponse.json(result);
  } catch (error) {
    return NextResponse.json(
      { error: error instanceof Error ? error.message : 'Mono check failed' },
      { status: 500 },
    );
  }
}
