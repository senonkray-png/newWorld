'use client';

import Link from 'next/link';
import { useCallback, useEffect, useMemo, useState } from 'react';

import type { Locale } from '@/i18n/config';
import { getSupabaseBrowserClient } from '@/lib/supabase-browser';

type AdItem = {
  id: string;
  authorId: string;
  type: 'поиск услуги' | 'предложение услуги';
  title: string;
  description: string;
  createdAt: string;
  authorName: string;
};

function textByLocale(locale: Locale) {
  if (locale === 'en') {
    return {
      title: 'Services & Ads',
      subtitle: 'Public feed of service requests and offers.',
      add: 'Post ad',
      close: 'Close',
      save: 'Publish',
      saving: 'Publishing...',
      noAds: 'No ads yet.',
      type: 'Type',
      search: 'Service request',
      offer: 'Service offer',
      adTitle: 'Title',
      adDescription: 'Description',
      loginRequired: 'Please log in to post an ad.',
    };
  }

  if (locale === 'uk') {
    return {
      title: 'Послуги та оголошення',
      subtitle: 'Публічна стрічка запитів і пропозицій послуг.',
      add: 'Розмістити оголошення',
      close: 'Закрити',
      save: 'Опублікувати',
      saving: 'Публікація...',
      noAds: 'Поки немає оголошень.',
      type: 'Тип',
      search: 'Пошук послуги',
      offer: 'Пропозиція послуги',
      adTitle: 'Назва',
      adDescription: 'Опис',
      loginRequired: 'Увійдіть, щоб розмістити оголошення.',
    };
  }

  return {
    title: 'Услуги и объявления',
    subtitle: 'Публичная лента запросов и предложений услуг.',
    add: 'Разместить объявление',
    close: 'Закрыть',
    save: 'Опубликовать',
    saving: 'Публикация...',
    noAds: 'Пока нет объявлений.',
    type: 'Тип',
    search: 'Поиск услуги',
    offer: 'Предложение услуги',
    adTitle: 'Название',
    adDescription: 'Описание',
    loginRequired: 'Войдите, чтобы разместить объявление.',
  };
}

export function ServicesBoard({ locale }: { locale: Locale }) {
  const supabase = useMemo(() => getSupabaseBrowserClient(), []);
  const t = useMemo(() => textByLocale(locale), [locale]);

  const [items, setItems] = useState<AdItem[]>([]);
  const [loading, setLoading] = useState(true);
  const [status, setStatus] = useState('');
  const [token, setToken] = useState<string | null>(null);
  const [viewerId, setViewerId] = useState<string>('');

  const [modalOpen, setModalOpen] = useState(false);
  const [saving, setSaving] = useState(false);
  const [form, setForm] = useState({
    type: 'поиск услуги' as 'поиск услуги' | 'предложение услуги',
    title: '',
    description: '',
  });

  const loadAds = useCallback(async () => {
    setLoading(true);
    const response = await fetch('/api/ads');

    if (!response.ok) {
      setItems([]);
      setLoading(false);
      return;
    }

    const payload = (await response.json()) as { ads?: AdItem[] };
    setItems(payload.ads ?? []);
    setLoading(false);
  }, []);

  const loadViewer = useCallback(async () => {
    const { data } = await supabase.auth.getSession();
    setToken(data.session?.access_token ?? null);
    setViewerId(data.session?.user?.id ?? '');
  }, [supabase.auth]);

  useEffect(() => {
    loadAds();
    loadViewer();
  }, [loadAds, loadViewer]);

  const openModal = () => {
    if (!token) {
      setStatus(t.loginRequired);
      return;
    }

    setStatus('');
    setModalOpen(true);
  };

  const submit = async () => {
    if (!token) {
      return;
    }

    setSaving(true);

    const response = await fetch('/api/ads', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        Authorization: `Bearer ${token}`,
      },
      body: JSON.stringify({ ad: form }),
    });

    if (!response.ok) {
      setStatus('Ошибка публикации объявления');
      setSaving(false);
      return;
    }

    setModalOpen(false);
    setForm({ type: 'поиск услуги', title: '', description: '' });
    setSaving(false);
    setStatus('');
    await loadAds();
  };

  return (
    <main className="nm-register-page">
      <section className="nm-register-card nm-reveal">
        <h1>{t.title}</h1>
        <p>{t.subtitle}</p>
        <div className="nm-admin-actions">
          <button type="button" className="nm-btn nm-btn-primary" onClick={openModal}>
            {t.add}
          </button>
        </div>
        {status ? <p className="nm-admin-status">{status}</p> : null}
      </section>

      <section className="nm-register-card nm-reveal">
        <div className="nm-market-grid">
          {!loading && items.length === 0 ? <p>{t.noAds}</p> : null}
          {items.map((item) => (
            <article key={item.id} className="nm-market-card">
              <p><strong>{item.type === 'поиск услуги' ? t.search : t.offer}</strong></p>
              <h3>{item.title}</h3>
              <p>{item.description}</p>
              <p><small>{item.authorName}</small></p>
              {token && item.authorId && item.authorId !== viewerId ? (
                <div className="nm-market-card-actions">
                  <Link
                    href={`/${locale}/messages?user=${encodeURIComponent(item.authorId)}&ref=${encodeURIComponent(`ad:${item.id}:${item.title}`)}`}
                    className="nm-btn nm-btn-primary nm-btn-sm"
                  >
                    {locale === 'en' ? 'Contact author' : locale === 'uk' ? "Зв'язок з автором" : 'Написать автору'}
                  </Link>
                </div>
              ) : null}
            </article>
          ))}
        </div>
      </section>

      {modalOpen ? (
        <div className="nm-modal-backdrop" onClick={() => setModalOpen(false)}>
          <div className="nm-modal" onClick={(event) => event.stopPropagation()}>
            <h3>{t.add}</h3>
            <label className="nm-admin-field">
              <span>{t.type}</span>
              <select value={form.type} onChange={(e) => setForm((p) => ({ ...p, type: e.target.value as 'поиск услуги' | 'предложение услуги' }))}>
                <option value="поиск услуги">{t.search}</option>
                <option value="предложение услуги">{t.offer}</option>
              </select>
            </label>
            <label className="nm-admin-field"><span>{t.adTitle}</span><input value={form.title} onChange={(e) => setForm((p) => ({ ...p, title: e.target.value }))} /></label>
            <label className="nm-admin-field"><span>{t.adDescription}</span><textarea rows={4} value={form.description} onChange={(e) => setForm((p) => ({ ...p, description: e.target.value }))} /></label>
            <div className="nm-admin-actions">
              <button type="button" className="nm-btn nm-btn-primary" onClick={submit} disabled={saving}>{saving ? t.saving : t.save}</button>
              <button type="button" className="nm-btn nm-btn-secondary" onClick={() => setModalOpen(false)} disabled={saving}>{t.close}</button>
            </div>
          </div>
        </div>
      ) : null}
    </main>
  );
}
