import { notFound } from 'next/navigation';

import { ProductsBoard } from '@/components/market/products-board';
import { isLocale } from '@/i18n/config';

export default async function ProductsPage({
  params,
}: Readonly<{
  params: Promise<{ locale: string }>;
}>) {
  const { locale } = await params;

  if (!isLocale(locale)) {
    notFound();
  }

  return <ProductsBoard locale={locale} />;
}
