import { NextResponse } from 'next/server';

import { requireMainAdmin } from '@/lib/auth-server';

const LANG_MAP: Record<string, string> = {
  ru: 'ru',
  uk: 'uk',
  en: 'en',
};

type MyMemoryResponse = {
  responseData?: { translatedText?: string };
  responseStatus?: number;
};

async function translateText(text: string, from: string, to: string): Promise<string> {
  if (!text.trim()) return text;
  const fromLang = LANG_MAP[from] ?? from;
  const toLang = LANG_MAP[to] ?? to;
  if (fromLang === toLang) return text;

  const url = new URL('https://api.mymemory.translated.net/get');
  url.searchParams.set('q', text.slice(0, 500));
  url.searchParams.set('langpair', `${fromLang}|${toLang}`);

  const res = await fetch(url.toString());
  if (!res.ok) return text;

  const data = (await res.json()) as MyMemoryResponse;
  return data.responseData?.translatedText ?? text;
}

export async function POST(request: Request) {
  const guard = await requireMainAdmin(request);
  if (guard) return guard;

  try {
    const body = (await request.json()) as {
      texts: string[];
      from: string;
      to: string;
    };

    if (!body.texts || !body.from || !body.to) {
      return NextResponse.json({ error: 'Missing fields' }, { status: 400 });
    }

    if (!LANG_MAP[body.from] || !LANG_MAP[body.to]) {
      return NextResponse.json({ error: 'Unsupported language' }, { status: 400 });
    }

    const results: string[] = [];
    for (const text of body.texts) {
      const translated = await translateText(text, body.from, body.to);
      results.push(translated);
    }

    return NextResponse.json({ translations: results });
  } catch {
    return NextResponse.json({ error: 'Translation failed' }, { status: 500 });
  }
}
