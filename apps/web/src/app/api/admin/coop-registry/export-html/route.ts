import { NextResponse } from 'next/server';

import { requireMainAdmin } from '@/lib/auth-server';
import { formatRegistryExportHtml, listCoopRegistryForMonth } from '@/lib/pai-store';

export async function GET(request: Request) {
  const guard = await requireMainAdmin(request);
  if (guard) return guard;

  const url = new URL(request.url);
  const year = Number(url.searchParams.get('year'));
  const month = Number(url.searchParams.get('month'));

  if (!Number.isFinite(year) || !Number.isFinite(month) || month < 1 || month > 12) {
    return NextResponse.json({ error: 'year and month (1-12) are required' }, { status: 400 });
  }

  try {
    const rows = await listCoopRegistryForMonth(year, month);
    const html = formatRegistryExportHtml(rows, year, month);

    return new NextResponse(html, {
      status: 200,
      headers: {
        'Content-Type': 'text/html; charset=utf-8',
      },
    });
  } catch (error) {
    return NextResponse.json(
      { error: error instanceof Error ? error.message : 'Export failed' },
      { status: 500 },
    );
  }
}
