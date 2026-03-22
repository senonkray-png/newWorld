import { notFound } from 'next/navigation';
import type { Metadata } from 'next';

import { HomePageView } from '@/components/home/home-page-view';
import { isLocale, type Locale } from '@/i18n/config';
import { getHomeContent } from '@/lib/home-content-store';

export async function generateMetadata({
  params,
}: Readonly<{
  params: Promise<{ locale: string }>;
}>): Promise<Metadata> {
  const { locale } = await params;

  if (!isLocale(locale)) {
    return {
      title: 'СпівДія',
      description: 'Кооперативная платформа',
    };
  }

  const content = await getHomeContent(locale);
  return {
    title: 'СпівДія',
    description: content.seo.description,
  };
}

export default async function HomePage({
  params,
}: Readonly<{
  params: Promise<{ locale: string }>;
}>) {
  const { locale } = await params;

  if (!isLocale(locale)) {
    notFound();
  }

  const currentLocale = locale as Locale;
  const content = await getHomeContent(currentLocale);

  return <HomePageView locale={currentLocale} content={content} />;
}
