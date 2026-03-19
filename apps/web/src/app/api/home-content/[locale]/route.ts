import { NextResponse } from 'next/server';

import { defaultHomeContent } from '@/i18n/home-content';
import { requireMainAdmin } from '@/lib/auth-server';
import { updateHomeContent, getHomeContent, isSupportedLocale, resetHomeContent } from '@/lib/home-content-store';

export async function GET(
  _request: Request,
  { params }: { params: Promise<{ locale: string }> },
) {
  try {
    const { locale } = await params;

    if (!isSupportedLocale(locale)) {
      return NextResponse.json({ error: 'Unsupported locale' }, { status: 400 });
    }

    const content = await getHomeContent(locale);
    return NextResponse.json({ content });
  } catch {
    return NextResponse.json({ error: 'Database read failed' }, { status: 500 });
  }
}

export async function PUT(
  request: Request,
  { params }: { params: Promise<{ locale: string }> },
) {
  try {
    const guard = await requireMainAdmin(request);
    if (guard) {
      return guard;
    }

    const { locale } = await params;

    if (!isSupportedLocale(locale)) {
      return NextResponse.json({ error: 'Unsupported locale' }, { status: 400 });
    }

    const payload = await request.json();
    const content = await updateHomeContent(locale, payload?.content ?? defaultHomeContent[locale]);

    return NextResponse.json({ content });
  } catch {
    return NextResponse.json({ error: 'Database write failed' }, { status: 500 });
  }
}

export async function DELETE(
  request: Request,
  { params }: { params: Promise<{ locale: string }> },
) {
  try {
    const guard = await requireMainAdmin(request);
    if (guard) {
      return guard;
    }

    const { locale } = await params;

    if (!isSupportedLocale(locale)) {
      return NextResponse.json({ error: 'Unsupported locale' }, { status: 400 });
    }

    const content = await resetHomeContent(locale);
    return NextResponse.json({ content });
  } catch {
    return NextResponse.json({ error: 'Database reset failed' }, { status: 500 });
  }
}
