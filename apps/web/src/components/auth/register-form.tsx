'use client';

import Link from 'next/link';
import { useMemo, useState } from 'react';

import type { Locale } from '@/i18n/config';
import { getSupabaseBrowserClient } from '@/lib/supabase-browser';

function textByLocale(locale: Locale) {
  if (locale === 'en') {
    return {
      title: 'Registration',
      subtitle: 'Create your account using email and password.',
      email: 'Email',
      password: 'Password',
      repeatPassword: 'Repeat password',
      submit: 'Register',
      login: 'Log in',
      goLogin: 'Already have an account?',
      mismatch: 'Passwords do not match.',
      fill: 'Please fill all fields.',
      success: 'Please, check your email and confirm registration.',
      failed: 'Registration failed. Try again.',
    };
  }

  if (locale === 'uk') {
    return {
      title: 'Реєстрація',
      subtitle: 'Створіть акаунт через email і пароль.',
      email: 'Email',
      password: 'Пароль',
      repeatPassword: 'Повторіть пароль',
      submit: 'Зареєструватися',
      login: 'Увійти',
      goLogin: 'Вже є акаунт?',
      mismatch: 'Паролі не збігаються.',
      fill: 'Заповніть усі поля.',
      success: 'Будь ласка, перейдіть на вашу пошту та підтвердьте реєстрацію.',
      failed: 'Не вдалося зареєструватися. Спробуйте ще раз.',
    };
  }

  return {
    title: 'Регистрация',
    subtitle: 'Создайте аккаунт через email и пароль.',
    email: 'Email',
    password: 'Пароль',
    repeatPassword: 'Повтор пароля',
    submit: 'Зарегистрироваться',
    login: 'Войти',
    goLogin: 'Уже есть аккаунт?',
    mismatch: 'Пароли не совпадают.',
    fill: 'Заполните все поля.',
    success: 'Пожалуйста, перейдите на вашу почту и подтвердите регистрацию.',
    failed: 'Не удалось зарегистрироваться. Попробуйте снова.',
  };
}

export function RegisterForm({ locale }: { locale: Locale }) {
  const supabase = useMemo(() => getSupabaseBrowserClient(), []);
  const t = useMemo(() => textByLocale(locale), [locale]);

  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [repeatPassword, setRepeatPassword] = useState('');
  const [status, setStatus] = useState('');
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [isRegistered, setIsRegistered] = useState(false);

  const onSubmit = async (event: React.FormEvent) => {
    event.preventDefault();

    if (!email.trim() || !password || !repeatPassword) {
      setStatus(t.fill);
      return;
    }

    if (password !== repeatPassword) {
      setStatus(t.mismatch);
      return;
    }

    setIsSubmitting(true);
    setStatus('');

    const { error } = await supabase.auth.signUp({
      email: email.trim(),
      password,
      options: {
        emailRedirectTo: `${window.location.origin}/${locale}/login`,
      },
    });

    if (error) {
      setStatus(t.failed);
      setIsSubmitting(false);
      return;
    }

    setIsRegistered(true);
    setStatus(t.success);
    setIsSubmitting(false);
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
              disabled={isRegistered || isSubmitting}
            />
          </label>

          <label className="nm-admin-field">
            <span>{t.password}</span>
            <input
              type="password"
              value={password}
              onChange={(event) => setPassword(event.target.value)}
              autoComplete="new-password"
              disabled={isRegistered || isSubmitting}
            />
          </label>

          <label className="nm-admin-field">
            <span>{t.repeatPassword}</span>
            <input
              type="password"
              value={repeatPassword}
              onChange={(event) => setRepeatPassword(event.target.value)}
              autoComplete="new-password"
              disabled={isRegistered || isSubmitting}
            />
          </label>

          <div className="nm-admin-actions nm-field-wide">
            <button type="submit" className="nm-btn nm-btn-primary" disabled={isRegistered || isSubmitting}>
              {t.submit}
            </button>
          </div>
        </form>

        {status ? <p className="nm-admin-status">{status}</p> : null}

        <div className="nm-admin-actions">
          <span>{t.goLogin}</span>
          <Link href={`/${locale}/login`} className="nm-btn nm-btn-secondary">
            {t.login}
          </Link>
        </div>
      </section>
    </main>
  );
}
