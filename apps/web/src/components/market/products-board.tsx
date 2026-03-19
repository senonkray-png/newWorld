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

  const [modalOpen, setModalOpen] = useState(false);
  const [saving, setSaving] = useState(false);
  const [form, setForm] = useState({
    imageUrl: '',
    title: '',
    description: '',
    price: '',
  });

  const loadProducts = useCallback(async () => {
    setLoading(true);
    const response = await fetch('/api/products');

    if (!response.ok) {
      setItems([]);
      setLoading(false);
      return;
    }

    const payload = (await response.json()) as { products?: ProductItem[] };
    setItems(payload.products ?? []);
    setLoading(false);
  }, []);

  const loadViewer = useCallback(async () => {
    const { data } = await supabase.auth.getSession();
    const accessToken = data.session?.access_token ?? null;
    setToken(accessToken);
  const userId = data.session?.user?.id ?? '';
  setViewerId(userId);

    if (!accessToken) {
      setRole('');
      return;
    }

    const response = await fetch('/api/app-profile/me', {
      headers: {
        Authorization: `Bearer ${accessToken}`,
      },
    });

    if (!response.ok) {
      setRole('');
      return;
    }

    const payload = (await response.json()) as { profile?: { role?: ViewerRole } };
    setRole(payload.profile?.role ?? '');
  }, [supabase.auth]);

  useEffect(() => {
    loadProducts();
    loadViewer();
  }, [loadProducts, loadViewer]);

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

    const response = await fetch('/api/products', {
      method: 'POST',
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
      setStatus('Ошибка публикации товара');
      setSaving(false);
      return;
    }

    setModalOpen(false);
    setForm({ imageUrl: '', title: '', description: '', price: '' });
    setSaving(false);
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
            </article>
          ))}
        </div>
      </section>

      {modalOpen ? (
        <div className="nm-modal-backdrop" onClick={() => setModalOpen(false)}>
          <div className="nm-modal" onClick={(event) => event.stopPropagation()}>
            <h3>{t.add}</h3>
            <label className="nm-admin-field"><span>{t.image}</span><input value={form.imageUrl} onChange={(e) => setForm((p) => ({ ...p, imageUrl: e.target.value }))} /></label>
            <label className="nm-admin-field"><span>{t.name}</span><input value={form.title} onChange={(e) => setForm((p) => ({ ...p, title: e.target.value }))} /></label>
            <label className="nm-admin-field"><span>{t.description}</span><textarea rows={4} value={form.description} onChange={(e) => setForm((p) => ({ ...p, description: e.target.value }))} /></label>
            <label className="nm-admin-field"><span>{t.price}</span><input type="number" min="0" step="0.01" value={form.price} onChange={(e) => setForm((p) => ({ ...p, price: e.target.value }))} /></label>
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
