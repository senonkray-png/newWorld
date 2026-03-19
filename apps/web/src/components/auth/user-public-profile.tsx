'use client';

import Image from 'next/image';
import Link from 'next/link';
import { useEffect, useMemo, useState } from 'react';

import type { Locale } from '@/i18n/config';
import { getSupabaseBrowserClient } from '@/lib/supabase-browser';

type UserData = {
  id: string;
  fullName: string;
  email: string;
  avatarUrl: string;
  country: string;
  region: string;
  city: string;
  interests: string[];
  role: string;
  businessNiche: string;
  companyName: string;
  websiteUrl: string;
  aboutMe: string;
  phone: string;
  workPhone: string;
  telegram: string;
  instagram: string;
};

export function UserPublicProfile({ locale, userId }: { locale: Locale; userId: string }) {
  const supabase = useMemo(() => getSupabaseBrowserClient(), []);
  const [user, setUser] = useState<UserData | null>(null);
  const [loading, setLoading] = useState(true);
  const [isAuthed, setIsAuthed] = useState(false);

  useEffect(() => {
    supabase.auth.getSession().then(({ data }) => {
      setIsAuthed(Boolean(data.session?.access_token));
    });
    const { data: listener } = supabase.auth.onAuthStateChange((_e, session) => {
      setIsAuthed(Boolean(session?.access_token));
    });
    return () => listener.subscription.unsubscribe();
  }, [supabase.auth]);

  useEffect(() => {
    async function load() {
      setLoading(true);
      const response = await fetch(`/api/app-users?id=${encodeURIComponent(userId)}`);
      if (!response.ok) {
        setLoading(false);
        return;
      }
      const payload = (await response.json()) as { user?: UserData };
      setUser(payload.user ?? null);
      setLoading(false);
    }
    load();
  }, [userId]);

  if (loading) {
    return (
      <main className="nm-register-page">
        <section className="nm-register-card nm-reveal">
          <p>{locale === 'en' ? 'Loading…' : 'Загрузка…'}</p>
        </section>
      </main>
    );
  }

  if (!user) {
    return (
      <main className="nm-register-page">
        <section className="nm-register-card nm-reveal">
          <p>
            {locale === 'en'
              ? 'User not found.'
              : locale === 'uk'
                ? 'Користувача не знайдено.'
                : 'Пользователь не найден.'}
          </p>
          <div className="nm-admin-actions">
            <Link href={`/${locale}/users`} className="nm-btn nm-btn-secondary">
              {locale === 'en' ? 'Back to catalog' : locale === 'uk' ? 'Назад до каталогу' : 'Назад в каталог'}
            </Link>
          </div>
        </section>
      </main>
    );
  }

  return (
    <main className="nm-register-page">
      <section className="nm-register-card nm-reveal">
        <div className="nm-public-profile-header">
          {user.avatarUrl ? (
            <Image
              src={user.avatarUrl}
              alt={user.fullName || 'avatar'}
              width={96}
              height={96}
              className="nm-profile-avatar"
              unoptimized
            />
          ) : (
            <div className="nm-user-list-avatar-placeholder nm-avatar-lg">
              {(user.fullName || user.email || '?').slice(0, 1).toUpperCase()}
            </div>
          )}
          <div>
            <h1 style={{ margin: '0 0 4px' }}>
              {user.fullName || user.email || (locale === 'en' ? 'User' : 'Пользователь')}
            </h1>
            <p className="nm-profile-role-tag">{user.role}</p>
            {user.companyName ? <p style={{ margin: '4px 0 0' }}>{user.companyName}</p> : null}
          </div>
        </div>

        <div className="nm-profile-view-grid">
          {user.country || user.city ? (
            <div className="nm-profile-row">
              <strong>{locale === 'en' ? 'Location' : locale === 'uk' ? 'Локація' : 'Локация'}:</strong>{' '}
              {[user.country, user.region, user.city].filter(Boolean).join(', ')}
            </div>
          ) : null}
          {user.businessNiche ? (
            <div className="nm-profile-row">
              <strong>{locale === 'en' ? 'Niche' : locale === 'uk' ? 'Ніша' : 'Ниша'}:</strong> {user.businessNiche}
            </div>
          ) : null}
          {user.interests.length > 0 ? (
            <div className="nm-profile-row">
              <strong>{locale === 'en' ? 'Interests' : locale === 'uk' ? 'Інтереси' : 'Интересы'}:</strong>{' '}
              {user.interests.join(', ')}
            </div>
          ) : null}
          {user.aboutMe ? (
            <div className="nm-profile-row" style={{ gridColumn: '1 / -1' }}>
              <strong>{locale === 'en' ? 'About' : locale === 'uk' ? 'Про себе' : 'О себе'}:</strong> {user.aboutMe}
            </div>
          ) : null}
          {user.websiteUrl ? (
            <div className="nm-profile-row">
              <strong>{locale === 'en' ? 'Website' : locale === 'uk' ? 'Сайт' : 'Сайт'}:</strong>{' '}
              <a href={user.websiteUrl} target="_blank" rel="noreferrer">
                {user.websiteUrl}
              </a>
            </div>
          ) : null}
          {user.phone || user.workPhone ? (
            <div className="nm-profile-row">
              <strong>{locale === 'en' ? 'Phone' : locale === 'uk' ? 'Телефон' : 'Телефон'}:</strong>{' '}
              {[user.phone, user.workPhone].filter(Boolean).join(' / ')}
            </div>
          ) : null}
          {user.telegram ? (
            <div className="nm-profile-row">
              <strong>Telegram:</strong> {user.telegram}
            </div>
          ) : null}
          {user.instagram ? (
            <div className="nm-profile-row">
              <strong>Instagram:</strong> {user.instagram}
            </div>
          ) : null}
        </div>

        <div className="nm-admin-actions">
          {isAuthed ? (
            <Link href={`/${locale}/messages?user=${user.id}`} className="nm-btn nm-btn-primary">
              {locale === 'en' ? 'Write message' : locale === 'uk' ? 'Написати повідомлення' : 'Написать сообщение'}
            </Link>
          ) : null}
          <Link href={`/${locale}/users`} className="nm-btn nm-btn-secondary">
            {locale === 'en' ? 'Back to catalog' : locale === 'uk' ? 'Назад до каталогу' : 'Назад в каталог'}
          </Link>
        </div>
      </section>
    </main>
  );
}
