import { NextResponse } from 'next/server';

/**
 * GET /api/pai/mono-info
 * Діагностичний ендпоінт: повертає список рахунків та банок з Monobank,
 * щоб знайти правильний account ID для банки (jar).
 * Захищений: тільки адмін або CRON_SECRET.
 */
export async function GET(request: Request) {
  const cronSecret = process.env.CRON_SECRET;
  const authHeader = request.headers.get('authorization');
  const isCronAuth = cronSecret && authHeader === `Bearer ${cronSecret}`;

  if (!isCronAuth) {
    const { requireMainAdmin } = await import('@/lib/auth-server');
    const guard = await requireMainAdmin(request);
    if (guard) return guard;
  }

  const token = process.env.MONO_TOKEN;
  if (!token) {
    return NextResponse.json({ error: 'MONO_TOKEN is not set' }, { status: 500 });
  }

  try {
    const res = await fetch('https://api.monobank.ua/personal/client-info', {
      headers: { 'X-Token': token },
    });

    if (!res.ok) {
      const text = await res.text();
      return NextResponse.json(
        { error: `Monobank API ${res.status}: ${text}` },
        { status: 502 },
      );
    }

    const info = await res.json();

    // Extract only safe fields: account IDs, types, balances, jar info
    const accounts = (info.accounts ?? []).map((acc: any) => ({
      id: acc.id,
      sendId: acc.sendId,
      type: acc.type,
      currencyCode: acc.currencyCode,
      balance: acc.balance,
      maskedPan: acc.maskedPan,
      iban: acc.iban,
    }));

    const jars = (info.jars ?? []).map((jar: any) => ({
      id: jar.id,
      sendId: jar.sendId,
      title: jar.title,
      description: jar.description,
      currencyCode: jar.currencyCode,
      balance: jar.balance,
      goal: jar.goal,
    }));

    return NextResponse.json({
      currentMonoAccount: process.env.MONO_ACCOUNT ?? '0',
      accounts,
      jars,
      hint: 'Set MONO_ACCOUNT to the jar "id" field to monitor jar payments.',
    });
  } catch (error) {
    return NextResponse.json(
      { error: error instanceof Error ? error.message : 'Failed to fetch client info' },
      { status: 500 },
    );
  }
}
