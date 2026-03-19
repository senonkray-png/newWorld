import { notFound } from 'next/navigation';

import { PartnerCatalog } from '@/components/auth/partner-catalog';
import { isLocale } from '@/i18n/config';

export default async function UsersPage({
  params,
}: Readonly<{
  params: Promise<{ locale: string }>;
}>) {
  const { locale } = await params;

  if (!isLocale(locale)) {
    notFound();
  }

  return <PartnerCatalog locale={locale} />;
}
