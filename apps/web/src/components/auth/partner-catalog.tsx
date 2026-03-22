'use client';

import Image from 'next/image';
import Link from 'next/link';
import { useCallback, useEffect, useMemo, useState } from 'react';

import type { Locale } from '@/i18n/config';
import { getSupabaseBrowserClient } from '@/lib/supabase-browser';

type UserRole = 'Потребитель' | 'Поставщик';

type Partner = {
  id: string;
  fullName: string;
  email: string;
  avatarUrl: string;
  country: string;
  region: string;
  city: string;
  interests: string[];
  role: UserRole;
  businessNiche: string;
  companyName: string;
  websiteUrl: string;
  aboutMe: string;
  phone: string;
  workPhone: string;
  telegram: string;
  instagram: string;
};

function roleLabel(role: UserRole, locale: Locale) {
  if (locale === 'en') {
    if (role === 'Поставщик') return 'Provider';
    return 'Consumer';
  }

  if (locale === 'uk') {
    if (role === 'Поставщик') return 'Постачальник';
    return 'Споживач';
  }

  if (role === 'Поставщик') return 'Поставщик';
  return 'Потребитель';
}

export function PartnerCatalog({ locale }: { locale: Locale }) {
  const supabase = useMemo(() => getSupabaseBrowserClient(), []);
  const [q, setQ] = useState('');
  const [interest, setInterest] = useState('');
  const [role, setRole] = useState('');
  const [filtersOpen, setFiltersOpen] = useState(false);
  const [partners, setPartners] = useState<Partner[]>([]);
  const [loading, setLoading] = useState(false);
  const [isAuthed, setIsAuthed] = useState(false);

  useEffect(() => {
    let alive = true;

    async function loadSession() {
      const { data } = await supabase.auth.getSession();
      if (!alive) {
        return;
      }

      setIsAuthed(Boolean(data.session?.access_token));
    }

    loadSession();

    const { data: listener } = supabase.auth.onAuthStateChange((_event, session) => {
      setIsAuthed(Boolean(session?.access_token));
    });

    return () => {
      alive = false;
      listener.subscription.unsubscribe();
    };
  }, [supabase.auth]);

  const loadPartners = useCallback(async () => {
    setLoading(true);
    const params = new URLSearchParams();
    if (q.trim()) params.set('q', q.trim());
    if (interest.trim()) params.set('interest', interest.trim().toLowerCase());
    if (role.trim()) params.set('role', role.trim());
    const response = await fetch(`/api/app-users?${params.toString()}`);
    if (!response.ok) {
      setPartners([]);
      setLoading(false);
      return;
    }
    const payload = (await response.json()) as { users?: Partner[] };
    setPartners(payload.users ?? []);
    setLoading(false);
  }, [interest, q, role]);

  useEffect(() => {
    loadPartners();
  }, [loadPartners]);

  const handleSearch = (event: React.FormEvent) => {
    event.preventDefault();
    loadPartners();
  };

  return (
    <main className="nm-register-page">
      <section className="nm-register-card nm-reveal">
        <h1>
          {locale === 'en' ? 'Partners directory' : locale === 'uk' ? 'Каталог партнерів' : 'Каталог партнеров'}
        </h1>

        <form className="nm-catalog-search-bar" onSubmit={handleSearch}>
          <input
            className="nm-admin-input nm-catalog-search-input"
            value={q}
            onChange={(event) => setQ(event.target.value)}
            placeholder={
              locale === 'en'
                ? 'Search by name, niche, email…'
                : locale === 'uk'
                  ? 'Пошук за ім\'ям, нішою, email…'
                  : 'Поиск по имени, нише, email…'
            }
          />
          <button type="submit" className="nm-btn nm-btn-primary">
            {loading ? '…' : locale === 'en' ? 'Find' : locale === 'uk' ? 'Знайти' : 'Найти'}
          </button>
          <button
            type="button"
            className={`nm-btn nm-btn-secondary${filtersOpen ? ' nm-btn-active' : ''}`}
            onClick={() => setFiltersOpen((v) => !v)}
          >
            {locale === 'en' ? 'Filters' : locale === 'uk' ? 'Фільтри' : 'Фильтры'} {filtersOpen ? '▲' : '▼'}
          </button>
        </form>

        {filtersOpen ? (
          <div className="nm-catalog-filters">
            <label className="nm-admin-field">
              <span>{locale === 'en' ? 'Interest' : locale === 'uk' ? 'Інтерес' : 'Интерес'}</span>
              <input
                value={interest}
                onChange={(event) => setInterest(event.target.value)}
                placeholder="логистика / agritech"
              />
            </label>
            <label className="nm-admin-field">
              <span>{locale === 'en' ? 'Role' : 'Роль'}</span>
              <select value={role} onChange={(event) => setRole(event.target.value)}>
                <option value="">{locale === 'en' ? 'All roles' : locale === 'uk' ? 'Усі ролі' : 'Все роли'}</option>
                <option value="Потребитель">{roleLabel('Потребитель', locale)}</option>
                <option value="Поставщик">{roleLabel('Поставщик', locale)}</option>
              </select>
            </label>
            <div className="nm-admin-actions" style={{ gridColumn: '1 / -1' }}>
              <button type="button" className="nm-btn nm-btn-primary" onClick={loadPartners}>
                {locale === 'en' ? 'Apply' : locale === 'uk' ? 'Застосувати' : 'Применить'}
              </button>
              <button
                type="button"
                className="nm-btn nm-btn-secondary"
                onClick={() => {
                  setRole('');
                  setInterest('');
                }}
              >
                {locale === 'en' ? 'Reset' : locale === 'uk' ? 'Скинути' : 'Сбросить'}
              </button>
            </div>
          </div>
        ) : null}
      </section>

      <section className="nm-register-card nm-reveal">
        <div className="nm-user-list">
          {!loading && partners.length === 0 ? (
            <p>
              {locale === 'en'
                ? 'No users found.'
                : locale === 'uk'
                  ? 'Користувачів не знайдено.'
                  : 'Пользователи не найдены.'}
            </p>
          ) : null}
          {partners.map((partner) => (
            <article key={partner.id} className="nm-user-list-item">
              <Link href={`/${locale}/users/${partner.id}`} className="nm-user-list-avatar-wrap">
                {partner.avatarUrl ? (
                  <Image
                    src={partner.avatarUrl}
                    alt={partner.fullName || 'avatar'}
                    width={56}
                    height={56}
                    className="nm-user-list-avatar"
                    unoptimized
                  />
                ) : (
                  <div className="nm-user-list-avatar-placeholder">
                    {(partner.fullName || partner.email || '?').slice(0, 1).toUpperCase()}
                  </div>
                )}
              </Link>
              <div className="nm-user-list-info">
                <Link href={`/${locale}/users/${partner.id}`} className="nm-user-list-name">
                  {partner.fullName || partner.email || (locale === 'en' ? 'No name' : 'Без имени')}
                </Link>
                <span className="nm-user-list-role">{roleLabel(partner.role, locale)}</span>
                {partner.companyName || partner.businessNiche ? (
                  <span className="nm-user-list-company">{partner.companyName || partner.businessNiche}</span>
                ) : null}
                {partner.country || partner.city ? (
                  <span className="nm-user-list-location">
                    {[partner.country, partner.region, partner.city].filter(Boolean).join(', ')}
                  </span>
                ) : null}
                {partner.interests.length > 0 ? (
                  <span className="nm-user-list-interests">{partner.interests.slice(0, 5).join(' · ')}</span>
                ) : null}
              </div>
              <div className="nm-user-list-actions">
                <Link href={`/${locale}/users/${partner.id}`} className="nm-btn nm-btn-secondary nm-btn-sm">
                  {locale === 'en' ? 'Profile' : locale === 'uk' ? 'Профіль' : 'Профиль'}
                </Link>
                {isAuthed ? (
                  <Link href={`/${locale}/messages?user=${partner.id}`} className="nm-btn nm-btn-primary nm-btn-sm">
                    {locale === 'en' ? 'Message' : locale === 'uk' ? 'Написати' : 'Написать'}
                  </Link>
                ) : null}
              </div>
            </article>
          ))}
        </div>
      </section>
    </main>
  );
}
