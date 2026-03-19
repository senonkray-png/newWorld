import { notFound } from 'next/navigation';

import { AdminShell } from '@/components/admin/admin-shell';
import { RequireAuth } from '@/components/auth/require-auth';
import { isLocale } from '@/i18n/config';

export default async function AdminPage({
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
      <AdminShell locale={locale} />
    </RequireAuth>
  );
}
