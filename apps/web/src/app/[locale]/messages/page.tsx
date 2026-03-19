import { notFound } from 'next/navigation';

import { RequireAuth } from '@/components/auth/require-auth';
import { MessagesBoard } from '@/components/messages/messages-board';
import { isLocale } from '@/i18n/config';

export default async function MessagesPage({
  params,
}: Readonly<{
  params: Promise<{ locale: string }>;
}>) {
  const { locale } = await params;

  if (!isLocale(locale)) {
    notFound();
  }

  return (
    <RequireAuth locale={locale}>
      <MessagesBoard locale={locale} />
    </RequireAuth>
  );
}
