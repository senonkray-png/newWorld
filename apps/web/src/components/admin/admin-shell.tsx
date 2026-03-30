'use client';

import { useEffect, useMemo, useState } from 'react';

import { CoopRegistryExport } from '@/components/admin/coop-registry-export';
import { DepositRequestsAdmin } from '@/components/admin/deposit-requests-admin';
import { ProcessedPaymentsAdmin } from '@/components/admin/processed-payments-admin';
import { WithdrawalRequestsAdmin } from '@/components/admin/withdrawal-requests-admin';
import type { Locale } from '@/i18n/config';
import type { HomeContent } from '@/i18n/home-content';
import { getAdminMessages } from '@/i18n/admin-messages';
import { HomeEditor } from '@/components/admin/home-editor';
import { UserRoleManager } from '@/components/admin/user-role-manager';
import { getSupabaseBrowserClient } from '@/lib/supabase-browser';

type AdminTab = 'content' | 'users' | 'deposits';

export function AdminShell({ locale }: { locale: Locale }) {
  const t = useMemo(() => getAdminMessages(locale), [locale]);
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
      alert(data.error ?? t.error);
    }
  }

  if (loading) {
    return (
      <main className="nm-register-page">
        <section className="nm-register-card">
          <h1>{t.loadingAdmin}</h1>
        </section>
      </main>
    );
  }

  if (!isAdmin) {
    return (
      <main className="nm-register-page">
        <section className="nm-register-card">
          <h1 style={{ color: '#e74c3c' }}>{t.accessDenied}</h1>
          <p style={{ opacity: 0.7, marginTop: '0.5rem' }}>
            {t.accessDeniedText}
          </p>
          {canBootstrap && (
            <div style={{ marginTop: '1.25rem' }}>
              <p style={{ marginBottom: '0.75rem', fontSize: '0.85rem', opacity: 0.65 }}>
                {t.noAdminYet}
              </p>
              <button className="nm-btn nm-btn-primary" onClick={claimAdmin} disabled={bootstrapping}>
                {bootstrapping ? t.wait : t.becomeAdmin}
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
            {t.tabContent}
          </button>
          <button
            className={`nm-admin-tab${tab === 'users' ? ' active' : ''}`}
            onClick={() => setTab('users')}
          >
            {t.tabUsers}
          </button>
          <button
            className={`nm-admin-tab${tab === 'deposits' ? ' active' : ''}`}
            onClick={() => setTab('deposits')}
          >
            {t.tabDeposits}
          </button>
        </nav>
      </div>

      {tab === 'content' && content ? (
        <HomeEditor locale={locale} initialContent={content} accessToken={accessToken ?? ''} />
      ) : null}

      {tab === 'users' ? (
        <section className="nm-register-card" style={{ maxWidth: '900px' }}>
          <UserRoleManager locale={locale} />
        </section>
      ) : null}

      {tab === 'deposits' && accessToken ? (
        <section className="nm-register-card" style={{ maxWidth: '900px' }}>
          <ProcessedPaymentsAdmin accessToken={accessToken} locale={locale} />
          <DepositRequestsAdmin accessToken={accessToken} locale={locale} />
          <WithdrawalRequestsAdmin accessToken={accessToken} locale={locale} />
          <CoopRegistryExport accessToken={accessToken} locale={locale} />
        </section>
      ) : null}

      {tab === 'content' && !content ? (
        <section className="nm-register-card">
          <p className="nm-admin-hint">{t.contentLoadError}</p>
        </section>
      ) : null}
    </main>
  );
}
