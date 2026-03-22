'use client';

import Image from 'next/image';
import Link from 'next/link';
import { useCallback, useEffect, useMemo, useState } from 'react';

import type { Locale } from '@/i18n/config';
import { getSupabaseBrowserClient } from '@/lib/supabase-browser';

type ProductItem = {
  id: string;
  sellerId: string;
  title: string;
  description: string;
  price: number;
  imageUrl: string;
  createdAt: string;
  sellerName: string;
  isRemovedByAdmin: boolean;
  removedReason: string;
};

type ViewerRole = 'Пользователь' | 'Продавец' | 'Поставщик услуг' | '';

function textByLocale(locale: Locale) {
  if (locale === 'en') {
    return {
      title: 'Products',
      subtitle: 'Public product feed available to all users.',
      add: 'Add product',
      close: 'Close',
      save: 'Publish',
      saving: 'Publishing...',
      noProducts: 'No products yet.',
      image: 'Image URL',
      name: 'Title',
      description: 'Description',
      price: 'Price',
      edit: 'Edit',
      delete: 'Delete',
      update: 'Update',
      deleting: 'Deleting...',
      warning: 'Warn',
      remove: 'Remove',
      restore: 'Restore',
      warningPrompt: 'Warning reason',
      removePrompt: 'Removal reason',
      removedByAdmin: 'Removed by admin',
      lockedByModeration: 'This item was removed by moderation. Editing is locked, only deletion is available.',
      sellerOnly: 'Only users with Seller role can add products.',
      loginRequired: 'Please log in to add a product.',
    };
  }

  if (locale === 'uk') {
    return {
      title: 'Товари',
      subtitle: 'Публічна стрічка товарів для всіх користувачів.',
      add: 'Додати товар',
      close: 'Закрити',
      save: 'Опублікувати',
      saving: 'Публікація...',
      noProducts: 'Поки немає товарів.',
      image: 'URL зображення',
      name: 'Назва',
      description: 'Опис',
      price: 'Ціна',
      edit: 'Редагувати',
      delete: 'Видалити',
      update: 'Оновити',
      deleting: 'Видалення...',
      warning: 'Попередити',
      remove: 'Прибрати',
      restore: 'Відновити',
      warningPrompt: 'Причина попередження',
      removePrompt: 'Причина видалення',
      removedByAdmin: 'Прибрано адміністратором',
      lockedByModeration: 'Товар знято модератором. Редагування заблоковано, доступне лише видалення.',
      sellerOnly: 'Додавати товари можуть лише користувачі з роллю Продавець.',
      loginRequired: 'Увійдіть, щоб додати товар.',
    };
  }

  return {
    title: 'Товары',
    subtitle: 'Публичная лента товаров для всех пользователей.',
    add: 'Добавить товар',
    close: 'Закрыть',
    save: 'Опубликовать',
    saving: 'Публикация...',
    noProducts: 'Пока нет товаров.',
    image: 'URL изображения',
    name: 'Название',
    description: 'Описание',
    price: 'Цена',
    edit: 'Редактировать',
    delete: 'Удалить',
    update: 'Обновить',
    deleting: 'Удаление...',
    warning: 'Предупредить',
    remove: 'Скрыть',
    restore: 'Восстановить',
    warningPrompt: 'Причина предупреждения',
    removePrompt: 'Причина скрытия',
    removedByAdmin: 'Снято модератором',
    lockedByModeration: 'Товар снят модератором. Редактирование заблокировано, доступно только удаление.',
    sellerOnly: 'Добавлять товары могут только пользователи с ролью Продавец.',
    loginRequired: 'Войдите, чтобы добавить товар.',
  };
}

export function ProductsBoard({ locale }: { locale: Locale }) {
  const supabase = useMemo(() => getSupabaseBrowserClient(), []);
  const t = useMemo(() => textByLocale(locale), [locale]);

  const [items, setItems] = useState<ProductItem[]>([]);
  const [loading, setLoading] = useState(true);
  const [status, setStatus] = useState('');
  const [token, setToken] = useState<string | null>(null);
  const [role, setRole] = useState<ViewerRole>('');
  const [viewerId, setViewerId] = useState<string>('');
  const [isAdmin, setIsAdmin] = useState(false);

  const [modalOpen, setModalOpen] = useState(false);
  const [saving, setSaving] = useState(false);
  const [editingId, setEditingId] = useState<string>('');
  const [actionBusyId, setActionBusyId] = useState<string>('');
  const [form, setForm] = useState({
    imageUrl: '',
    title: '',
    description: '',
    price: '',
  });

  const loadProducts = useCallback(async () => {
    setLoading(true);
    const query = token ? '?includeMine=1' : '';
    const response = await fetch(`/api/products${query}`, {
      headers: token ? { Authorization: `Bearer ${token}` } : undefined,
    });

    if (!response.ok) {
      setItems([]);
      setLoading(false);
      return;
    }

    const payload = (await response.json()) as { products?: ProductItem[] };
    setItems(payload.products ?? []);
    setLoading(false);
  }, [token]);

  const loadViewer = useCallback(async () => {
    const { data } = await supabase.auth.getSession();
    const accessToken = data.session?.access_token ?? null;
    setToken(accessToken);
    const userId = data.session?.user?.id ?? '';
    setViewerId(userId);

    if (!accessToken) {
      setRole('');
      setIsAdmin(false);
      return;
    }

    const response = await fetch('/api/app-profile/me', {
      headers: {
        Authorization: `Bearer ${accessToken}`,
      },
    });

    if (!response.ok) {
      setRole('');
    } else {
      const payload = (await response.json()) as { profile?: { role?: ViewerRole } };
      setRole(payload.profile?.role ?? '');
    }

    const adminResponse = await fetch('/api/profile/me', {
      headers: {
        Authorization: `Bearer ${accessToken}`,
      },
    });

    if (!adminResponse.ok) {
      setIsAdmin(false);
      return;
    }

    const adminPayload = (await adminResponse.json()) as { profile?: { role?: string } };
    setIsAdmin(adminPayload.profile?.role === 'main_admin');
  }, [supabase.auth]);

  useEffect(() => {
    loadViewer();
  }, [loadViewer]);

  useEffect(() => {
    loadProducts();
  }, [loadProducts]);

  const openModal = () => {
    if (!token) {
      setStatus(t.loginRequired);
      return;
    }

    if (role !== 'Продавец') {
      setStatus(t.sellerOnly);
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
    const response = await fetch(isEdit ? `/api/products/${editingId}` : '/api/products', {
      method: isEdit ? 'PUT' : 'POST',
      headers: {
        'Content-Type': 'application/json',
        Authorization: `Bearer ${token}`,
      },
      body: JSON.stringify({
        product: {
          imageUrl: form.imageUrl,
          title: form.title,
          description: form.description,
          price: Number(form.price),
        },
      }),
    });

    if (!response.ok) {
      setStatus(isEdit ? 'Ошибка обновления товара' : 'Ошибка публикации товара');
      setSaving(false);
      return;
    }

    setModalOpen(false);
    setEditingId('');
    setForm({ imageUrl: '', title: '', description: '', price: '' });
    setSaving(false);
    setStatus('');
    await loadProducts();
  };

  const editItem = (item: ProductItem) => {
    if (item.isRemovedByAdmin) {
      setStatus(t.lockedByModeration);
      return;
    }

    setEditingId(item.id);
    setForm({
      imageUrl: item.imageUrl,
      title: item.title,
      description: item.description,
      price: String(item.price),
    });
    setModalOpen(true);
  };

  const removeItem = async (itemId: string) => {
    if (!token) return;
    setActionBusyId(itemId);

    const response = await fetch(`/api/products/${itemId}`, {
      method: 'DELETE',
      headers: {
        Authorization: `Bearer ${token}`,
      },
    });

    setActionBusyId('');

    if (!response.ok) {
      setStatus('Ошибка удаления товара');
      return;
    }

    setStatus('');
    await loadProducts();
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
    const response = await fetch(`/api/products/${itemId}/moderation`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        Authorization: `Bearer ${token}`,
      },
      body: JSON.stringify({ action, reason }),
    });
    setActionBusyId('');

    if (!response.ok) {
      setStatus('Ошибка модерации товара');
      return;
    }

    setStatus('');
    await loadProducts();
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
          {!loading && items.length === 0 ? <p>{t.noProducts}</p> : null}
          {items.map((item) => (
            <article key={item.id} className="nm-market-card">
              {item.imageUrl ? (
                <Image
                  src={item.imageUrl}
                  alt={item.title}
                  width={640}
                  height={480}
                  className="nm-market-image"
                  unoptimized
                />
              ) : null}
              <h3>{item.title}</h3>
              <p>{item.description}</p>
              <p><strong>{item.price.toFixed(2)}</strong></p>
              <p><small>{item.sellerName}</small></p>
              {item.isRemovedByAdmin ? (
                <p className="nm-admin-status">
                  {t.removedByAdmin}{item.removedReason ? `: ${item.removedReason}` : ''}
                </p>
              ) : null}
              {token && item.sellerId && item.sellerId !== viewerId ? (
                <div className="nm-market-card-actions">
                  <Link
                    href={`/${locale}/messages?user=${encodeURIComponent(item.sellerId)}&ref=${encodeURIComponent(`product:${item.id}:${item.title}`)}`}
                    className="nm-btn nm-btn-primary nm-btn-sm"
                  >
                    {locale === 'en' ? 'Contact seller' : locale === 'uk' ? "Зв'язок з продавцем" : 'Написать продавцу'}
                  </Link>
                </div>
              ) : null}
              {item.sellerId === viewerId ? (
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
                    {actionBusyId === item.id ? t.deleting : t.delete}
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
            <label className="nm-admin-field"><span>{t.image}</span><input value={form.imageUrl} onChange={(e) => setForm((p) => ({ ...p, imageUrl: e.target.value }))} /></label>
            <label className="nm-admin-field"><span>{t.name}</span><input value={form.title} onChange={(e) => setForm((p) => ({ ...p, title: e.target.value }))} /></label>
            <label className="nm-admin-field"><span>{t.description}</span><textarea rows={4} value={form.description} onChange={(e) => setForm((p) => ({ ...p, description: e.target.value }))} /></label>
            <label className="nm-admin-field"><span>{t.price}</span><input type="number" min="0" step="0.01" value={form.price} onChange={(e) => setForm((p) => ({ ...p, price: e.target.value }))} /></label>
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
