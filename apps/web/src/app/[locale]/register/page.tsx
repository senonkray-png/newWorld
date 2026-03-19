import { notFound } from 'next/navigation';

import { RegisterForm } from '@/components/auth/register-form';
import { isLocale } from '@/i18n/config';

export default async function RegisterPage({
  params,
}: Readonly<{
  params: Promise<{ locale: string }>;
}>) {
  const { locale } = await params;

  if (!isLocale(locale)) {
    notFound();
  }

  return <RegisterForm locale={locale} />;
}
