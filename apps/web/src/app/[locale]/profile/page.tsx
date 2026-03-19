import { notFound } from 'next/navigation';

import { ProfileEditor } from '@/components/profile/profile-editor';
import { RequireAuth } from '@/components/auth/require-auth';
import { isLocale } from '@/i18n/config';

export default async function ProfilePage({
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
      <ProfileEditor locale={locale} />
    </RequireAuth>
  );
}
