import { notFound } from 'next/navigation';

import { UserPublicProfile } from '@/components/auth/user-public-profile';
import { isLocale } from '@/i18n/config';

export default async function UserPublicProfilePage({
  params,
}: Readonly<{ params: Promise<{ locale: string; id: string }> }>) {
  const { locale, id } = await params;
  if (!isLocale(locale)) notFound();
  return <UserPublicProfile locale={locale} userId={id} />;
}
