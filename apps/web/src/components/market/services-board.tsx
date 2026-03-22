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
  price: number;
  createdAt: string;
  authorName: string;
  isRemovedByAdmin: boolean;
  removedReason: string;
};

type ViewerRole = 'Пользователь' | 'Продавец' | 'Поставщик услуг' | '';

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
      adPrice: 'Price (Pai)',
      edit: 'Edit',
      delete: 'Delete',
      update: 'Update',
      warning: 'Warn',
      remove: 'Remove',
      restore: 'Restore',
      warningPrompt: 'Warning reason',
      removePrompt: 'Removal reason',
      removedByAdmin: 'Removed by admin',
      providerOnly: 'Only service providers can add ads.',
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
      adPrice: 'Ціна (Пай)',
      edit: 'Редагувати',
      delete: 'Видалити',
      update: 'Оновити',
      warning: 'Попередити',
      remove: 'Прибрати',
      restore: 'Відновити',
      warningPrompt: 'Причина попередження',
      removePrompt: 'Причина видалення',
      removedByAdmin: 'Прибрано адміністратором',
      providerOnly: 'Лише постачальники послуг можуть додавати оголошення.',
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
    adPrice: 'Цена (Пай)',
    edit: 'Редактировать',
    delete: 'Удалить',
    update: 'Обновить',
    warning: 'Предупредить',
    remove: 'Скрыть',
    restore: 'Восстановить',
    warningPrompt: 'Причина предупреждения',
    removePrompt: 'Причина скрытия',
    removedByAdmin: 'Снято модератором',
    providerOnly: 'Только поставщики услуг могут добавлять объявления.',
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
  const [role, setRole] = useState<ViewerRole>('');
  const [isAdmin, setIsAdmin] = useState(false);

  const [modalOpen, setModalOpen] = useState(false);
  const [saving, setSaving] = useState(false);
  const [editingId, setEditingId] = useState('');
  const [actionBusyId, setActionBusyId] = useState('');
  const [form, setForm] = useState({
    type: 'поиск услуги' as 'поиск услуги' | 'предложение услуги',
    title: '',
    description: '',
    price: '',
  });

  const loadAds = useCallback(async () => {
    setLoading(true);
    const query = token ? '?includeMine=1' : '';
    const response = await fetch(`/api/ads${query}`, {
      headers: token ? { Authorization: `Bearer ${token}` } : undefined,
    });

    if (!response.ok) {
      setItems([]);
      setLoading(false);
      return;
    }

    const payload = (await response.json()) as { ads?: AdItem[] };
    setItems(payload.ads ?? []);
    setLoading(false);
  }, [token]);

  const loadViewer = useCallback(async () => {
    const { data } = await supabase.auth.getSession();
    const accessToken = data.session?.access_token ?? null;
    setToken(accessToken);
    setViewerId(data.session?.user?.id ?? '');

    if (!accessToken) {
      setRole('');
      setIsAdmin(false);
      return;
    }

    const profileResponse = await fetch('/api/app-profile/me', {
      headers: {
        Authorization: `Bearer ${accessToken}`,
      },
    });

    if (profileResponse.ok) {
      const payload = (await profileResponse.json()) as { profile?: { role?: ViewerRole } };
      setRole(payload.profile?.role ?? '');
    }

    const adminResponse = await fetch('/api/profile/me', {
      headers: {
        Authorization: `Bearer ${accessToken}`,
      },
    });

    if (adminResponse.ok) {
      const payload = (await adminResponse.json()) as { profile?: { role?: string } };
      setIsAdmin(payload.profile?.role === 'main_admin');
    } else {
      setIsAdmin(false);
    }
  }, [supabase.auth]);

  useEffect(() => {
    loadViewer();
  }, [loadViewer]);

  useEffect(() => {
    loadAds();
  }, [loadAds]);

  const openModal = () => {
    if (!token) {
      setStatus(t.loginRequired);
      return;
    }

    if (role !== 'Поставщик услуг') {
      setStatus(t.providerOnly);
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

    const isEdit = Boolean(editingId);
    const response = await fetch(isEdit ? `/api/ads/${editingId}` : '/api/ads', {
      method: isEdit ? 'PUT' : 'POST',
      headers: {
        'Content-Type': 'application/json',
        Authorization: `Bearer ${token}`,
      },
      body: JSON.stringify({ ad: { ...form, price: Number(form.price) } }),
    });

    if (!response.ok) {
      setStatus(isEdit ? 'Ошибка обновления объявления' : 'Ошибка публикации объявления');
      setSaving(false);
      return;
    }

    setModalOpen(false);
    setEditingId('');
    setForm({ type: 'поиск услуги', title: '', description: '', price: '' });
    setSaving(false);
    setStatus('');
    await loadAds();
  };

  const editItem = (item: AdItem) => {
    if (item.isRemovedByAdmin) {
      setStatus(t.removedByAdmin);
      return;
    }

    setEditingId(item.id);
    setForm({
      type: item.type,
      title: item.title,
      description: item.description,
      price: String(item.price),
    });
    setModalOpen(true);
  };

  const removeItem = async (itemId: string) => {
    if (!token) return;
    setActionBusyId(itemId);

    const response = await fetch(`/api/ads/${itemId}`, {
      method: 'DELETE',
      headers: {
        Authorization: `Bearer ${token}`,
      },
    });

    setActionBusyId('');

    if (!response.ok) {
      setStatus('Ошибка удаления объявления');
      return;
    }

    setStatus('');
    await loadAds();
  };

  const moderate = async (itemId: string, action: 'warn' | 'remove' | 'restore') => {
    if (!token) return;

    let reason = '';
    if (action === 'warn') {
      reason = window.prompt(t.warningPrompt, '')?.trim() ?? '';
      if (!reason) return;
    }
    if (action === 'remove') {
      reason = window.prompt(t.removePrompt, '')?.trim() ?? '';
      if (!reason) return;
    }

    setActionBusyId(itemId);
    const response = await fetch(`/api/ads/${itemId}/moderation`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        Authorization: `Bearer ${token}`,
      },
      body: JSON.stringify({ action, reason }),
    });
    setActionBusyId('');

    if (!response.ok) {
      setStatus('Ошибка модерации объявления');
      return;
    }

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
              <p><strong>{item.price.toFixed(2)} Пай</strong></p>
              <p><small>{item.authorName}</small></p>
              {item.isRemovedByAdmin ? (
                <p className="nm-admin-status">
                  {t.removedByAdmin}{item.removedReason ? `: ${item.removedReason}` : ''}
                </p>
              ) : null}
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
              {item.authorId === viewerId ? (
                <div className="nm-market-card-actions">
                  {!item.isRemovedByAdmin ? (
                    <button type="button" className="nm-btn nm-btn-secondary nm-btn-sm" onClick={() => editItem(item)}>
                      {t.edit}
                    </button>
                  ) : null}
                  <button
                    type="button"
                    className="nm-btn nm-btn-secondary nm-btn-sm"
                    onClick={() => removeItem(item.id)}
                    disabled={actionBusyId === item.id}
                  >
                    {t.delete}
                  </button>
                </div>
              ) : null}
              {isAdmin ? (
                <div className="nm-market-card-actions">
                  {!item.isRemovedByAdmin ? (
                    <>
                      <button type="button" className="nm-btn nm-btn-secondary nm-btn-sm" onClick={() => moderate(item.id, 'warn')}>
                        {t.warning}
                      </button>
                      <button type="button" className="nm-btn nm-btn-secondary nm-btn-sm" onClick={() => moderate(item.id, 'remove')}>
                        {t.remove}
                      </button>
                    </>
                  ) : (
                    <button type="button" className="nm-btn nm-btn-secondary nm-btn-sm" onClick={() => moderate(item.id, 'restore')}>
                      {t.restore}
                    </button>
                  )}
                </div>
              ) : null}
            </article>
          ))}
        </div>
      </section>

      {modalOpen ? (
        <div className="nm-modal-backdrop" onClick={() => setModalOpen(false)}>
          <div className="nm-modal" onClick={(event) => event.stopPropagation()}>
            <h3>{editingId ? t.edit : t.add}</h3>
            <label className="nm-admin-field">
              <span>{t.type}</span>
              <select value={form.type} onChange={(e) => setForm((p) => ({ ...p, type: e.target.value as 'поиск услуги' | 'предложение услуги' }))}>
                <option value="поиск услуги">{t.search}</option>
                <option value="предложение услуги">{t.offer}</option>
              </select>
            </label>
            <label className="nm-admin-field"><span>{t.adTitle}</span><input value={form.title} onChange={(e) => setForm((p) => ({ ...p, title: e.target.value }))} /></label>
            <label className="nm-admin-field"><span>{t.adDescription}</span><textarea rows={4} value={form.description} onChange={(e) => setForm((p) => ({ ...p, description: e.target.value }))} /></label>
            <label className="nm-admin-field"><span>{t.adPrice}</span><input type="number" min="0" step="0.01" value={form.price} onChange={(e) => setForm((p) => ({ ...p, price: e.target.value }))} /></label>
            <div className="nm-admin-actions">
              <button type="button" className="nm-btn nm-btn-primary" onClick={submit} disabled={saving}>{saving ? t.saving : editingId ? t.update : t.save}</button>
              <button
                type="button"
                className="nm-btn nm-btn-secondary"
                onClick={() => {
                  setModalOpen(false);
                  setEditingId('');
                }}
                disabled={saving}
              >
                {t.close}
              </button>
            </div>
          </div>
        </div>
      ) : null}
    </main>
  );
}
