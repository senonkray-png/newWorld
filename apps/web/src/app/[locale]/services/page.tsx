import { notFound } from 'next/navigation';

import { ServicesBoard } from '@/components/market/services-board';
import { isLocale } from '@/i18n/config';

export default async function ServicesPage({
  params,
}: Readonly<{
  params: Promise<{ locale: string }>;
}>) {
  const { locale } = await params;

  if (!isLocale(locale)) {
    notFound();
  }

  return <ServicesBoard locale={locale} />;
}
