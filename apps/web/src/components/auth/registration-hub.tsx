'use client';

import { useCallback, useEffect, useMemo, useState } from 'react';
import Link from 'next/link';

import { getSupabaseBrowserClient } from '@/lib/supabase-browser';
import type { Locale } from '@/i18n/config';

type UserRole = 'member' | 'seller' | 'service_provider' | 'organizer' | 'main_admin';
type AccountIntent = 'seller' | 'service_provider' | 'both';

type UserProfile = {
  fullName: string;
  displayName: string;
  accountIntent: AccountIntent;
  businessInfo: string;
  websiteUrl: string;
  phonePersonal: string;
  phoneWork: string;
  interests: string;
};

type SearchResult = {
  userId: string;
  fullName: string | null;
  displayName: string;
  accountIntent: AccountIntent;
  businessInfo: string;
  websiteUrl: string | null;
  phoneWork: string | null;
  interests: string[];
  role: UserRole;
};

const initialForm: UserProfile = {
  fullName: '',
  displayName: '',
  accountIntent: 'seller',
  businessInfo: '',
  websiteUrl: '',
  phonePersonal: '',
  phoneWork: '',
  interests: '',
};

function localeText(locale: Locale) {
  if (locale === 'uk') {
    return {
      title: 'Реєстрація учасника',
      subtitle: 'Створіть акаунт або увійдіть через email, далі заповніть профіль для пошуку партнерів.',
      authEmailPlaceholder: 'Email',
      authPasswordPlaceholder: 'Пароль',
      loginSimple: 'Увійти',
      registerSimple: 'Зареєструватися',
      logout: 'Вийти',
      save: 'Зберегти профіль',
      saving: 'Зберігаємо...',
      saved: 'Профіль збережено',
      mustLogin: 'Щоб продовжити реєстрацію, увійдіть через email.',
      authFillFields: 'Введіть email і пароль.',
      authLoginFailed: 'Не вдалося виконати вхід. Перевірте email/пароль.',
      authSignupFailed: 'Не вдалося створити акаунт.',
      authSignupSuccess: 'Акаунт створено. Якщо потрібне підтвердження email, перевірте пошту.',
      authSignupNext: 'Після підтвердження email увійдіть і заповніть профіль.',
      profileStepTitle: 'Крок 2: заповнення профілю',
      authStepTitle: 'Крок 1: email та пароль',
      findTitle: 'Пошук партнерів',
      findButton: 'Знайти',
      roleMainAdmin: 'Головний адміністратор',
    };
  }

  if (locale === 'en') {
    return {
      title: 'Account registration',
      subtitle: 'Create an account or sign in with email, then complete your profile for partner discovery.',
      authEmailPlaceholder: 'Email',
      authPasswordPlaceholder: 'Password',
      loginSimple: 'Sign in',
      registerSimple: 'Create account',
      logout: 'Sign out',
      save: 'Save profile',
      saving: 'Saving...',
      saved: 'Profile saved',
      mustLogin: 'Sign in with email to continue registration.',
      authFillFields: 'Enter email and password.',
      authLoginFailed: 'Failed to sign in. Check your email/password.',
      authSignupFailed: 'Failed to create account.',
      authSignupSuccess: 'Account created. If email confirmation is required, check your inbox.',
      authSignupNext: 'After email confirmation, sign in and complete your profile.',
      profileStepTitle: 'Step 2: complete profile',
      authStepTitle: 'Step 1: email and password',
      findTitle: 'Partner search',
      findButton: 'Search',
      roleMainAdmin: 'Main admin',
    };
  }

  return {
    title: 'Регистрация участника',
    subtitle: 'Создайте аккаунт или войдите через email, затем заполните профиль для поиска партнеров.',
    authEmailPlaceholder: 'Email',
    authPasswordPlaceholder: 'Пароль',
    loginSimple: 'Войти',
    registerSimple: 'Зарегистрироваться',
    logout: 'Выйти',
    save: 'Сохранить профиль',
    saving: 'Сохраняем...',
    saved: 'Профиль сохранен',
    mustLogin: 'Чтобы продолжить регистрацию, войдите через email.',
    authFillFields: 'Введите email и пароль.',
    authLoginFailed: 'Не удалось войти. Проверьте email/пароль.',
    authSignupFailed: 'Не удалось создать аккаунт.',
    authSignupSuccess: 'Аккаунт создан. Если включено подтверждение email, проверьте почту.',
    authSignupNext: 'После подтверждения email войдите и заполните профиль.',
    profileStepTitle: 'Шаг 2: заполнение профиля',
    authStepTitle: 'Шаг 1: email и пароль',
    findTitle: 'Поиск партнеров',
    findButton: 'Найти',
    roleMainAdmin: 'Главный админ',
  };
}

export function RegistrationHub({ locale }: { locale: Locale }) {
  const text = useMemo(() => localeText(locale), [locale]);
  const supabase = useMemo(() => getSupabaseBrowserClient(), []);
  const [accessToken, setAccessToken] = useState<string | null>(null);
  const [email, setEmail] = useState<string | null>(null);
  const [authEmail, setAuthEmail] = useState('');
  const [authPassword, setAuthPassword] = useState('');
  const [form, setForm] = useState<UserProfile>(initialForm);
  const [status, setStatus] = useState('');
  const [saving, setSaving] = useState(false);

  const [searchQuery, setSearchQuery] = useState('');
  const [interestFilter, setInterestFilter] = useState('');
  const [searchResults, setSearchResults] = useState<SearchResult[]>([]);

  const loadSessionAndProfile = useCallback(async () => {
    const { data: sessionData } = await supabase.auth.getSession();
    const token = sessionData.session?.access_token ?? null;
    setAccessToken(token);
    setEmail(sessionData.session?.user?.email ?? null);

    if (!token) {
      return;
    }

    const response = await fetch('/api/profile/me', {
      headers: {
        Authorization: `Bearer ${token}`,
      },
    });

    if (!response.ok) {
      return;
    }

    const payload = (await response.json()) as {
      profile?: {
        fullName: string | null;
        displayName: string;
        accountIntent: AccountIntent;
        businessInfo: string;
        websiteUrl: string | null;
        phonePersonal: string | null;
        phoneWork: string | null;
        interests: string[];
        role: UserRole;
      } | null;
    };

    if (!payload.profile) {
      return;
    }

    setForm({
      fullName: payload.profile.fullName ?? '',
      displayName: payload.profile.displayName,
      accountIntent: payload.profile.accountIntent,
      businessInfo: payload.profile.businessInfo,
      websiteUrl: payload.profile.websiteUrl ?? '',
      phonePersonal: payload.profile.phonePersonal ?? '',
      phoneWork: payload.profile.phoneWork ?? '',
      interests: payload.profile.interests.join(', '),
    });
  }, [supabase]);

  useEffect(() => {
    loadSessionAndProfile();

    const { data: listener } = supabase.auth.onAuthStateChange(() => {
      loadSessionAndProfile();
    });

    return () => {
      listener.subscription.unsubscribe();
    };
  }, [loadSessionAndProfile, supabase.auth]);

  const loginWithEmail = async () => {
    if (!authEmail.trim() || !authPassword) {
      setStatus(text.authFillFields);
      return;
    }

    const { error } = await supabase.auth.signInWithPassword({
      email: authEmail.trim(),
      password: authPassword,
    });

    if (error) {
      setStatus(text.authLoginFailed);
      return;
    }

    setStatus('');
  };

  const registerWithEmail = async () => {
    if (!authEmail.trim() || !authPassword) {
      setStatus(text.authFillFields);
      return;
    }

    const { data, error } = await supabase.auth.signUp({
      email: authEmail.trim(),
      password: authPassword,
      options: {
        emailRedirectTo: `${window.location.origin}/${locale}/register`,
      },
    });

    if (error) {
      setStatus(text.authSignupFailed);
      return;
    }

    if (!data.session) {
      setStatus(`${text.authSignupSuccess} ${text.authSignupNext}`);
      return;
    }

    setStatus('');
  };

  const logout = async () => {
    await supabase.auth.signOut();
    setForm(initialForm);
    setSearchResults([]);
    setStatus('');
  };

  const saveProfile = async () => {
    if (!accessToken) {
      setStatus(text.mustLogin);
      return;
    }

    setSaving(true);
    setStatus('');

    const response = await fetch('/api/profile/me', {
      method: 'PUT',
      headers: {
        'Content-Type': 'application/json',
        Authorization: `Bearer ${accessToken}`,
      },
      body: JSON.stringify({
        profile: {
          fullName: form.fullName,
          displayName: form.displayName,
          accountIntent: form.accountIntent,
          businessInfo: form.businessInfo,
          websiteUrl: form.websiteUrl,
          phonePersonal: form.phonePersonal,
          phoneWork: form.phoneWork,
          interests: form.interests,
        },
      }),
    });

    if (!response.ok) {
      setStatus('Ошибка сохранения профиля');
      setSaving(false);
      return;
    }

    setStatus(text.saved);
    setSaving(false);
    await runSearch();
  };

  const runSearch = useCallback(async () => {
    const params = new URLSearchParams();
    if (searchQuery.trim()) {
      params.set('q', searchQuery.trim());
    }
    if (interestFilter.trim()) {
      params.set('interest', interestFilter.trim().toLowerCase());
    }

    const response = await fetch(`/api/profile/search?${params.toString()}`);
    if (!response.ok) {
      return;
    }

    const payload = (await response.json()) as { profiles?: SearchResult[] };
    setSearchResults(payload.profiles ?? []);
  }, [interestFilter, searchQuery]);

  useEffect(() => {
    runSearch();
  }, [runSearch]);

  return (
    <main className="nm-register-page">
      <section className="nm-register-card nm-reveal">
        <h1>{text.title}</h1>
        <p>{text.subtitle}</p>
        <h3>{text.authStepTitle}</h3>

        <div className="nm-register-auth">
          {email ? <strong>{email}</strong> : <span>{text.mustLogin}</span>}
          {!accessToken ? (
            <>
              <input
                type="email"
                className="nm-admin-input-text"
                value={authEmail}
                onChange={(event) => setAuthEmail(event.target.value)}
                placeholder={text.authEmailPlaceholder}
                autoComplete="email"
              />
              <input
                type="password"
                className="nm-admin-input-text"
                value={authPassword}
                onChange={(event) => setAuthPassword(event.target.value)}
                placeholder={text.authPasswordPlaceholder}
                autoComplete="current-password"
              />
              <button type="button" className="nm-btn nm-btn-primary" onClick={loginWithEmail}>
                {text.loginSimple}
              </button>
              <button type="button" className="nm-btn nm-btn-secondary" onClick={registerWithEmail}>
                {text.registerSimple}
              </button>
            </>
          ) : (
            <button type="button" className="nm-btn nm-btn-secondary" onClick={logout}>
              {text.logout}
            </button>
          )}
        </div>

        {accessToken ? <h3>{text.profileStepTitle}</h3> : null}

        {accessToken ? <div className="nm-register-grid">
          <label className="nm-admin-field">
            <span>ФИО</span>
            <input
              value={form.fullName}
              onChange={(event) => setForm((prev) => ({ ...prev, fullName: event.target.value }))}
              placeholder="Например: Иванов Иван Иванович"
            />
          </label>

          <label className="nm-admin-field">
            <span>Имя / название</span>
            <input
              value={form.displayName}
              onChange={(event) => setForm((prev) => ({ ...prev, displayName: event.target.value }))}
              placeholder="Например: Эко-ферма Карпаты"
            />
          </label>

          <label className="nm-admin-field">
            <span>Кем хотите быть</span>
            <select
              value={form.accountIntent}
              onChange={(event) =>
                setForm((prev) => ({
                  ...prev,
                  accountIntent: event.target.value as AccountIntent,
                }))
              }
            >
              <option value="seller">Продавец товаров</option>
              <option value="service_provider">Поставщик услуг</option>
              <option value="both">И товары, и услуги</option>
            </select>
          </label>

          <label className="nm-admin-field nm-field-wide">
            <span>Информация о сфере товаров/услуг</span>
            <textarea
              rows={4}
              value={form.businessInfo}
              onChange={(event) => setForm((prev) => ({ ...prev, businessInfo: event.target.value }))}
              placeholder="Какие товары или услуги вы предоставляете"
            />
          </label>

          <label className="nm-admin-field">
            <span>Сайт (опционально)</span>
            <input
              value={form.websiteUrl}
              onChange={(event) => setForm((prev) => ({ ...prev, websiteUrl: event.target.value }))}
              placeholder="https://example.com"
            />
          </label>

          <label className="nm-admin-field">
            <span>Личный телефон (опционально)</span>
            <input
              value={form.phonePersonal}
              onChange={(event) => setForm((prev) => ({ ...prev, phonePersonal: event.target.value }))}
              placeholder="+380..."
            />
          </label>

          <label className="nm-admin-field">
            <span>Рабочий телефон (опционально)</span>
            <input
              value={form.phoneWork}
              onChange={(event) => setForm((prev) => ({ ...prev, phoneWork: event.target.value }))}
              placeholder="+380..."
            />
          </label>

          <label className="nm-admin-field nm-field-wide">
            <span>Интересы (через запятую)</span>
            <input
              value={form.interests}
              onChange={(event) => setForm((prev) => ({ ...prev, interests: event.target.value }))}
              placeholder="логистика, агро, IT, упаковка"
            />
          </label>
        </div> : null}

        {accessToken ? <div className="nm-admin-actions">
          <button type="button" className="nm-btn nm-btn-primary" onClick={saveProfile} disabled={!accessToken || saving}>
            {saving ? text.saving : text.save}
          </button>
          <Link href={`/${locale}/partners`} className="nm-btn nm-btn-secondary">
            {locale === 'en' ? 'Open partners catalog' : locale === 'uk' ? 'Відкрити каталог партнерів' : 'Открыть каталог партнеров'}
          </Link>
          <Link href={`/${locale}`} className="nm-btn nm-btn-secondary">
            На главную
          </Link>
        </div> : null}

        {status ? <p className="nm-admin-status">{status}</p> : null}
      </section>

      {accessToken ? <section className="nm-register-card nm-reveal">
        <h2>{text.findTitle}</h2>
        <div className="nm-register-grid">
          <label className="nm-admin-field">
            <span>Поиск</span>
            <input value={searchQuery} onChange={(event) => setSearchQuery(event.target.value)} placeholder="Имя, email, сфера" />
          </label>
          <label className="nm-admin-field">
            <span>Интерес</span>
            <input value={interestFilter} onChange={(event) => setInterestFilter(event.target.value)} placeholder="Например: логистика" />
          </label>
        </div>

        <div className="nm-admin-actions">
          <button type="button" className="nm-btn nm-btn-secondary" onClick={runSearch}>
            {text.findButton}
          </button>
        </div>

        <div className="nm-partner-list">
          {searchResults.map((profile) => (
            <article key={profile.userId} className="nm-partner-card">
              {profile.fullName ? <p><strong>ФИО:</strong> {profile.fullName}</p> : null}
              <h3>{profile.displayName || 'Без имени'}</h3>
              <p>{profile.businessInfo || 'Описание пока не заполнено'}</p>
              <p><strong>Интересы:</strong> {profile.interests.join(', ') || 'нет'}</p>
              <p><strong>Роль:</strong> {profile.role === 'main_admin' ? text.roleMainAdmin : profile.role}</p>
              {profile.websiteUrl ? (
                <a href={profile.websiteUrl} target="_blank" rel="noreferrer">
                  {profile.websiteUrl}
                </a>
              ) : null}
              {profile.phoneWork ? <p><strong>Рабочий:</strong> {profile.phoneWork}</p> : null}
            </article>
          ))}
        </div>
      </section> : null}
    </main>
  );
}
