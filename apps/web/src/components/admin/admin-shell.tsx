'use client';

import { useEffect, useMemo, useState } from 'react';

import type { Locale } from '@/i18n/config';
import type { HomeContent } from '@/i18n/home-content';
import { HomeEditor } from '@/components/admin/home-editor';
import { UserRoleManager } from '@/components/admin/user-role-manager';
import { getSupabaseBrowserClient } from '@/lib/supabase-browser';

type AdminTab = 'content' | 'users';

export function AdminShell({ locale }: { locale: Locale }) {
  const supabase = useMemo(() => getSupabaseBrowserClient(), []);
  const [accessToken, setAccessToken] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);
  const [content, setContent] = useState<HomeContent | null>(null);
  const [tab, setTab] = useState<AdminTab>('content');
  const [isAdmin, setIsAdmin] = useState<boolean | null>(null);
  const [canBootstrap, setCanBootstrap] = useState(false);
  const [bootstrapping, setBootstrapping] = useState(false);

  useEffect(() => {
    let alive = true;

    async function bootstrap() {
      const { data: sessionData } = await supabase.auth.getSession();
      const token = sessionData.session?.access_token ?? null;

      if (!alive) return;

      if (!token) {
        setIsAdmin(false);
        setLoading(false);
        return;
      }

      setAccessToken(token);

      // Check role first
      const profileRes = await fetch('/api/profile/me', {
        headers: { Authorization: `Bearer ${token}` },
      });
      if (!alive) return;

      if (!profileRes.ok) {
        setIsAdmin(false);
        setLoading(false);
        return;
      }

      const profilePayload = (await profileRes.json()) as { profile?: { role?: string } };
      const role = profilePayload.profile?.role;

      if (role !== 'main_admin') {
        setCanBootstrap(true);
        setIsAdmin(false);
        setLoading(false);
        return;
      }

      setIsAdmin(true);

      const contentResponse = await fetch(`/api/home-content/${locale}`);
      if (!alive) return;

      if (!contentResponse.ok) {
        setLoading(false);
        return;
      }

      const contentPayload = (await contentResponse.json()) as { content?: HomeContent };
      if (!alive) return;

      setContent(contentPayload.content ?? null);
      setLoading(false);
    }

    bootstrap();

    return () => {
      alive = false;
    };
  }, [locale, supabase]);

  if (loading) {
    return (
      <main className="nm-register-page">
        <section className="nm-register-card">
          <h1>Загружаем админ-панель...</h1>
        </section>
      </main>
    );
  }

  if (!isAdmin) {
    return (
      <main className="nm-register-page">
        <section className="nm-register-card">
          <h1 style={{ color: '#e74c3c' }}>Доступ запрещён</h1>
          <p style={{ opacity: 0.7, marginTop: '0.5rem' }}>
            Эта страница доступна только администратору.
          </p>
        </section>
      </main>
    );
  }
  async function claimAdmin() {
    if (!accessToken) return;
    setBootstrapping(true);
    const res = await fetch('/api/admin/bootstrap', {
      method: 'POST',
      headers: { Authorization: `Bearer ${accessToken}` },
    });
    setBootstrapping(false);
    if (res.ok) {
      window.location.reload();
    } else {
      const data = (await res.json()) as { error?: string };
      alert(data.error ?? 'Ошибка');
    }
  }

  if (!isAdmin) {
    return (
      <main className="nm-register-page">
        <section className="nm-register-card">
          <h1 style={{ color: '#e74c3c' }}>Доступ запрещён</h1>
          <p style={{ opacity: 0.7, marginTop: '0.5rem' }}>
            Эта страница доступна только администратору.
          </p>
          {canBootstrap && (
            <div style={{ marginTop: '1.25rem' }}>
              <p style={{ marginBottom: '0.75rem', fontSize: '0.85rem', opacity: 0.65 }}>
                Ни одного администратора ещё нет — вы можете взять роль:
              </p>
              <button className="nm-btn nm-btn-primary" onClick={claimAdmin} disabled={bootstrapping}>
                {bootstrapping ? 'Подождите...' : 'Стать администратором'}
              </button>
            </div>
          )}
        </section>
      </main>
    );
  }

  return (
    <main className="nm-register-page">
      <div className="nm-admin-tabs-wrap">
        <nav className="nm-admin-tabs">
          <button
            className={`nm-admin-tab${tab === 'content' ? ' active' : ''}`}
            onClick={() => setTab('content')}
          >
            Контент сайта
          </button>
          <button
            className={`nm-admin-tab${tab === 'users' ? ' active' : ''}`}
            onClick={() => setTab('users')}
          >
            Пользователи
          </button>
        </nav>
      </div>

      {tab === 'content' && content ? (
        <HomeEditor locale={locale} initialContent={content} accessToken={accessToken ?? ''} />
      ) : (
        <section className="nm-register-card" style={{ maxWidth: '900px' }}>
          <UserRoleManager locale={locale} />
        </section>
      )}
    </main>
  );
}
