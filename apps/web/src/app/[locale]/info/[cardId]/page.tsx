import { notFound } from 'next/navigation';
import type { Metadata } from 'next';
import Link from 'next/link';

import { isLocale, type Locale } from '@/i18n/config';
import { getHomeContent } from '@/lib/home-content-store';

type PageParams = { locale: string; cardId: string };

function resolveCard(content: Awaited<ReturnType<typeof getHomeContent>>, cardId: string) {
  const match = cardId.match(/^(feature|process)-(\d+)$/);
  if (!match) return null;
  const [, section, indexStr] = match;
  const index = Number(indexStr);
  const items = section === 'feature' ? content.featureItems : content.processItems;
  const item = items[index];
  if (!item || !(item.extraContent ?? '').trim()) return null;
  return item;
}

export async function generateMetadata({
  params,
}: {
  params: Promise<PageParams>;
}): Promise<Metadata> {
  const { locale, cardId } = await params;
  if (!isLocale(locale)) return { title: 'СпівДія' };
  const content = await getHomeContent(locale as Locale);
  const card = resolveCard(content, cardId);
  return {
    title: card ? `${card.title} — СпівДія` : 'СпівДія',
    description: card?.text ?? '',
  };
}

export default async function InfoPage({
  params,
}: {
  params: Promise<PageParams>;
}) {
  const { locale, cardId } = await params;
  if (!isLocale(locale)) notFound();
  const content = await getHomeContent(locale as Locale);
  const card = resolveCard(content, cardId);
  if (!card) notFound();

  const headerStyle = card.headerFontSize ? { fontSize: `${card.headerFontSize}px` } : undefined;

  return (
    <main className="nm-page" style={{ padding: '2rem 1rem', maxWidth: '800px', margin: '0 auto' }}>
      <Link href={`/${locale}`} className="nm-btn nm-btn-secondary" style={{ marginBottom: '1.5rem', display: 'inline-block' }}>
        ← {locale === 'en' ? 'Back' : locale === 'uk' ? 'Назад' : 'Назад'}
      </Link>
      <h1 style={headerStyle}>{card.title}</h1>
      <div dangerouslySetInnerHTML={{ __html: card.extraContent! }} />
    </main>
  );
}
