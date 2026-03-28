import { NextResponse } from 'next/server';

import { requireMainAdmin } from '@/lib/auth-server';
import { formatRegistryExportLines, listCoopRegistryForMonth } from '@/lib/pai-store';

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
    const text = formatRegistryExportLines(rows, year, month);
    const filename = `coop-registry-${year}-${String(month).padStart(2, '0')}.txt`;

    return new NextResponse(text, {
      status: 200,
      headers: {
        'Content-Type': 'text/plain; charset=utf-8',
        'Content-Disposition': `attachment; filename="${filename}"`,
      },
    });
  } catch (error) {
    return NextResponse.json(
      { error: error instanceof Error ? error.message : 'Export failed' },
      { status: 500 },
    );
  }
}
