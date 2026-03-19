'use client';

import Link from 'next/link';
import { useEffect, useMemo, useState } from 'react';
import { useRouter, useSearchParams } from 'next/navigation';

import type { Locale } from '@/i18n/config';
import { getSupabaseBrowserClient } from '@/lib/supabase-browser';

function textByLocale(locale: Locale) {
  if (locale === 'en') {
    return {
      title: 'Log in',
      subtitle: 'Use your email and password.',
      email: 'Email',
      password: 'Password',
      submit: 'Log in',
      register: 'Register',
      noAccount: 'No account yet?',
      fill: 'Please fill all fields.',
      checkEmail: 'Please check your email and confirm registration first.',
      failed: 'Login failed. Check your credentials.',
    };
  }

  if (locale === 'uk') {
    return {
      title: 'Вхід',
      subtitle: 'Використайте email і пароль.',
      email: 'Email',
      password: 'Пароль',
      submit: 'Увійти',
      register: 'Реєстрація',
      noAccount: 'Ще немає акаунта?',
      fill: 'Заповніть усі поля.',
      checkEmail: 'Будь ласка, підтвердьте реєстрацію через email.',
      failed: 'Не вдалося увійти. Перевірте дані.',
    };
  }

  return {
    title: 'Вход',
    subtitle: 'Используйте email и пароль.',
    email: 'Email',
    password: 'Пароль',
    submit: 'Войти',
    register: 'Регистрация',
    noAccount: 'Еще нет аккаунта?',
    fill: 'Заполните все поля.',
    checkEmail: 'Пожалуйста, подтвердите регистрацию через email.',
    failed: 'Не удалось войти. Проверьте данные.',
  };
}

export function LoginForm({ locale }: { locale: Locale }) {
  const supabase = useMemo(() => getSupabaseBrowserClient(), []);
  const router = useRouter();
  const searchParams = useSearchParams();
  const t = useMemo(() => textByLocale(locale), [locale]);

  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [status, setStatus] = useState('');
  const [isSubmitting, setIsSubmitting] = useState(false);

  const nextPath = searchParams.get('next');
  const targetPath = nextPath && nextPath.startsWith(`/${locale}/`) ? nextPath : `/${locale}/profile`;

  useEffect(() => {
    let alive = true;

    async function checkSession() {
      const { data } = await supabase.auth.getSession();
      if (!alive || !data.session?.access_token) {
        return;
      }

      router.replace(targetPath);
      router.refresh();
    }

    checkSession();

    const { data: listener } = supabase.auth.onAuthStateChange((_event, session) => {
      if (!session?.access_token) {
        return;
      }

      router.replace(targetPath);
      router.refresh();
    });

    return () => {
      alive = false;
      listener.subscription.unsubscribe();
    };
  }, [router, supabase, targetPath]);

  const onSubmit = async (event: React.FormEvent) => {
    event.preventDefault();

    if (!email.trim() || !password) {
      setStatus(t.fill);
      return;
    }

    setIsSubmitting(true);
    setStatus('');

    const { error } = await supabase.auth.signInWithPassword({
      email: email.trim(),
      password,
    });

    if (error) {
      const message = (error.message || '').toLowerCase();
      if (message.includes('email') && (message.includes('confirm') || message.includes('verification'))) {
        setStatus(t.checkEmail);
      } else {
        setStatus(t.failed);
      }
      setIsSubmitting(false);
      return;
    }

    setIsSubmitting(false);
    router.push(targetPath);
    router.refresh();
  };

  return (
    <main className="nm-register-page">
      <section className="nm-register-card nm-reveal">
        <h1>{t.title}</h1>
        <p>{t.subtitle}</p>

        <form onSubmit={onSubmit} className="nm-register-grid">
          <label className="nm-admin-field nm-field-wide">
            <span>{t.email}</span>
            <input
              type="email"
              value={email}
              onChange={(event) => setEmail(event.target.value)}
              autoComplete="email"
              disabled={isSubmitting}
            />
          </label>

          <label className="nm-admin-field nm-field-wide">
            <span>{t.password}</span>
            <input
              type="password"
              value={password}
              onChange={(event) => setPassword(event.target.value)}
              autoComplete="current-password"
              disabled={isSubmitting}
            />
          </label>

          <div className="nm-admin-actions nm-field-wide">
            <button type="submit" className="nm-btn nm-btn-primary" disabled={isSubmitting}>
              {t.submit}
            </button>
          </div>
        </form>

        {status ? <p className="nm-admin-status">{status}</p> : null}

        <div className="nm-admin-actions">
          <span>{t.noAccount}</span>
          <Link href={`/${locale}/register`} className="nm-btn nm-btn-secondary">
            {t.register}
          </Link>
        </div>
      </section>
    </main>
  );
}
