'use client';

import Image from 'next/image';
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
  imageUrl: string;
  createdAt: string;
  authorName: string;
  isRemovedByAdmin: boolean;
  removedReason: string;
};

type ViewerRole = 'Потребитель' | 'Поставщик' | '';
type BoardMode = 'catalog' | 'cabinet';
type ServiceTab = 'поиск услуги' | 'предложение услуги';
type ModerationAction = 'warn' | 'remove' | 'restore';
type ReasonDialogState = {
  itemId: string;
  action: 'warn' | 'remove';
} | null;

function textByLocale(locale: Locale) {
  if (locale === 'en') {
    return {
      title: 'Services & Ads',
      subtitle: 'Public feed of service requests and offers.',
      cabinetTitle: 'My services',
      cabinetSubtitle: 'Manage your own service posts here, including hidden ones.',
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
      providerOnly: 'Only users with Provider role can add ads.',
      loginRequired: 'Please log in to post an ad.',
      pay: 'Pai',
      image: 'Photo link',
      uploadPhoto: 'Upload photo from device',
      uploading: 'Uploading...',
      warnTip: 'Warn author',
      removeTip: 'Hide service post',
      restoreTip: 'Restore service post',
      reasonTitle: 'Select a reason',
      customReason: 'Custom reason',
      apply: 'Apply',
      catalogHint: 'Your own posts, including hidden ones, are managed in the profile cabinet.',
      requestsTab: 'Service request',
      offersTab: 'Service offer',
    };
  }

  if (locale === 'uk') {
    return {
      title: 'Послуги та оголошення',
      subtitle: 'Публічна стрічка запитів і пропозицій послуг.',
      cabinetTitle: 'Мої послуги',
      cabinetSubtitle: 'Тут можна керувати своїми оголошеннями, зокрема прихованими.',
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
      providerOnly: 'Лише користувачі з роллю Постачальник можуть додавати оголошення.',
      loginRequired: 'Увійдіть, щоб розмістити оголошення.',
      pay: 'Пай',
      image: 'Посилання на фото',
      uploadPhoto: 'Завантажити фото з пристрою',
      uploading: 'Завантаження...',
      warnTip: 'Попередити автора',
      removeTip: 'Приховати оголошення',
      restoreTip: 'Відновити оголошення',
      reasonTitle: 'Оберіть причину',
      customReason: 'Своя причина',
      apply: 'Застосувати',
      catalogHint: 'Керування власними оголошеннями, зокрема прихованими, доступне в кабінеті профілю.',
      requestsTab: 'Пошук послуг',
      offersTab: 'Пропозиція послуг',
    };
  }

  return {
    title: 'Услуги и объявления',
    subtitle: 'Публичная лента запросов и предложений услуг.',
    cabinetTitle: 'Мои услуги',
    cabinetSubtitle: 'Здесь можно управлять своими объявлениями, включая скрытые.',
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
    providerOnly: 'Добавлять объявления могут только пользователи с ролью Поставщик.',
    loginRequired: 'Войдите, чтобы разместить объявление.',
    pay: 'Пай',
    image: 'Ссылка на фото',
    uploadPhoto: 'Загрузить фото с устройства',
    uploading: 'Загрузка...',
    warnTip: 'Предупредить автора',
    removeTip: 'Скрыть объявление',
    restoreTip: 'Восстановить объявление',
    reasonTitle: 'Выберите причину',
    customReason: 'Своя причина',
    apply: 'Применить',
    catalogHint: 'Управление своими объявлениями, включая скрытые, доступно в кабинете профиля.',
    requestsTab: 'Поиск услуг',
    offersTab: 'Предложение услуг',
  };
}

function getReasonPresets(locale: Locale, action: 'warn' | 'remove') {
  if (action === 'warn') {
    return ['Дублирование', 'Нарушение правил'];
  }

  return ['для уточнение причины свяжитесь с потдержкой', 'Дублирование', 'Нарушение правил'];
}

export function ServicesBoard({ locale, mode = 'catalog' }: { locale: Locale; mode?: BoardMode }) {
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
  const [reasonDialog, setReasonDialog] = useState<ReasonDialogState>(null);
  const [customReason, setCustomReason] = useState('');
  const [uploadingPhoto, setUploadingPhoto] = useState(false);
  const [serviceTab, setServiceTab] = useState<ServiceTab>('предложение услуги');
  const [form, setForm] = useState({
    type: 'поиск услуги' as 'поиск услуги' | 'предложение услуги',
    title: '',
    description: '',
    price: '',
    imageUrl: '',
  });

  const loadAds = useCallback(async () => {
    setLoading(true);
    const query = mode === 'cabinet' && token ? '?includeMine=1' : '';
    const response = await fetch(`/api/ads${query}`, {
      headers: token ? { Authorization: `Bearer ${token}` } : undefined,
    });

    if (!response.ok) {
      setItems([]);
      setLoading(false);
      return;
    }

    const payload = (await response.json()) as { ads?: AdItem[] };
    const nextItems = (payload.ads ?? []).filter((item) => {
      if (mode === 'cabinet') {
        return item.authorId === viewerId;
      }

      return !item.isRemovedByAdmin;
    });
    setItems(nextItems);
    setLoading(false);
  }, [mode, token, viewerId]);

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

    if (role !== 'Поставщик') {
      setStatus(t.providerOnly);
      return;
    }

    setStatus('');
    setModalOpen(true);
  };

  const closeEditor = () => {
    setModalOpen(false);
    setEditingId('');
    setForm({ type: 'поиск услуги', title: '', description: '', price: '', imageUrl: '' });
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

    closeEditor();
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
      imageUrl: item.imageUrl,
    });
    setModalOpen(true);
  };

  const uploadPhoto = async (file: File | null) => {
    if (!file) {
      return;
    }

    const body = new FormData();
    body.append('file', file);
    body.append('folder', 'services');
    setUploadingPhoto(true);
    setStatus('');

    const response = await fetch('/api/upload', {
      method: 'POST',
      body,
    });

    if (!response.ok) {
      setStatus(locale === 'en' ? 'Failed to upload image' : locale === 'uk' ? 'Не вдалося завантажити фото' : 'Не удалось загрузить фото');
      setUploadingPhoto(false);
      return;
    }

    const payload = (await response.json()) as { url?: string };
    if (payload.url) {
      setForm((prev) => ({ ...prev, imageUrl: payload.url ?? prev.imageUrl }));
    }
    setUploadingPhoto(false);
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

  const moderate = async (itemId: string, action: ModerationAction, reason = '') => {
    if (!token) return;

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

  const openReasonDialog = (itemId: string, action: 'warn' | 'remove') => {
    setCustomReason('');
    setReasonDialog({ itemId, action });
  };

  const applyReason = async (reason: string) => {
    if (!reasonDialog) return;
    const value = reason.trim();
    if (!value) return;
    await moderate(reasonDialog.itemId, reasonDialog.action, value);
    setReasonDialog(null);
    setCustomReason('');
  };

  const content = (
    <>
      {mode === 'catalog' ? (
        <section className="nm-register-card nm-reveal">
          <h1>{t.title}</h1>
          <p>{t.subtitle}</p>
          <div className="nm-admin-actions">
            <button type="button" className="nm-btn nm-btn-primary" onClick={openModal}>
              {t.add}
            </button>
          </div>
          {status ? <p className="nm-admin-status">{status}</p> : <p className="nm-admin-hint">{t.catalogHint}</p>}
        </section>
      ) : null}

      <section className={mode === 'catalog' ? 'nm-register-card nm-reveal' : 'nm-admin-card nm-reveal'}>
        {mode === 'cabinet' ? (
          <div className="nm-market-board-head">
            <div>
              <h3>{t.cabinetTitle}</h3>
              <p>{t.cabinetSubtitle}</p>
            </div>
            <button type="button" className="nm-btn nm-btn-primary" onClick={openModal}>
              {t.add}
            </button>
          </div>
        ) : null}
        {mode === 'cabinet' ? (
          <div className="nm-service-switch" role="tablist" aria-label={t.type}>
            <button
              type="button"
              className={`nm-service-switch-btn${serviceTab === 'предложение услуги' ? ' active' : ''}`}
              onClick={() => setServiceTab('предложение услуги')}
            >
              {t.offersTab}
            </button>
            <button
              type="button"
              className={`nm-service-switch-btn${serviceTab === 'поиск услуги' ? ' active' : ''}`}
              onClick={() => setServiceTab('поиск услуги')}
            >
              {t.requestsTab}
            </button>
          </div>
        ) : null}
        {mode === 'cabinet' && status ? <p className="nm-admin-status">{status}</p> : null}
        <div className="nm-market-grid">
          {!loading && (mode === 'cabinet' ? items.filter((item) => item.type === serviceTab) : items).length === 0 ? <p>{t.noAds}</p> : null}
          {(mode === 'cabinet' ? items.filter((item) => item.type === serviceTab) : items).map((item) => (
            <article key={item.id} className="nm-market-card">
              {item.imageUrl ? <Image src={item.imageUrl} alt={item.title} width={640} height={480} className="nm-market-image" unoptimized /> : null}
              <p className="nm-market-subtle"><strong>{item.type === 'поиск услуги' ? t.search : t.offer}</strong></p>
              <div className="nm-market-card-head">
                <h3>{item.title}</h3>
                <strong className="nm-market-price">{item.price.toFixed(2)} {t.pay}</strong>
              </div>
              <p>{item.description}</p>
              <p className="nm-market-subtle"><small>{item.authorName}</small></p>
              {item.isRemovedByAdmin ? (
                <p className="nm-admin-status">
                  {t.removedByAdmin}{item.removedReason ? `: ${item.removedReason}` : ''}
                </p>
              ) : null}
              {mode === 'catalog' && token && item.authorId && item.authorId !== viewerId ? (
                <div className="nm-market-card-actions">
                  <Link
                    href={`/${locale}/messages?user=${encodeURIComponent(item.authorId)}&ref=${encodeURIComponent(`ad:${item.id}:${item.title}`)}`}
                    className="nm-btn nm-btn-primary nm-btn-sm"
                  >
                    {locale === 'en' ? 'Contact author' : locale === 'uk' ? "Зв'язок з автором" : 'Написать автору'}
                  </Link>
                </div>
              ) : null}
              {mode === 'cabinet' && item.authorId === viewerId ? (
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
              {mode === 'catalog' && isAdmin ? (
                <div className="nm-market-card-actions">
                  {!item.isRemovedByAdmin ? (
                    <>
                      <button
                        type="button"
                        className="nm-icon-btn"
                        title={t.warnTip}
                        aria-label={t.warnTip}
                        onClick={() => openReasonDialog(item.id, 'warn')}
                      >
                        !
                      </button>
                      <button
                        type="button"
                        className="nm-icon-btn"
                        title={t.removeTip}
                        aria-label={t.removeTip}
                        onClick={() => openReasonDialog(item.id, 'remove')}
                      >
                        🗑
                      </button>
                    </>
                  ) : (
                    <button
                      type="button"
                      className="nm-icon-btn"
                      title={t.restoreTip}
                      aria-label={t.restoreTip}
                      onClick={() => moderate(item.id, 'restore')}
                    >
                      ↺
                    </button>
                  )}
                </div>
              ) : null}
            </article>
          ))}
        </div>
      </section>

      {modalOpen ? (
        <div className="nm-modal-backdrop" onClick={closeEditor}>
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
            <label className="nm-admin-field"><span>{t.image}</span><input value={form.imageUrl} onChange={(e) => setForm((p) => ({ ...p, imageUrl: e.target.value }))} placeholder="https://..." /></label>
            <div className="nm-admin-field">
              <span>{t.uploadPhoto}</span>
              <input type="file" accept="image/*" onChange={(e) => uploadPhoto(e.target.files?.[0] ?? null)} disabled={uploadingPhoto} />
              <small className="nm-admin-hint">{uploadingPhoto ? t.uploading : t.uploadPhoto}</small>
            </div>
            <div className="nm-admin-actions">
              <button type="button" className="nm-btn nm-btn-primary" onClick={submit} disabled={saving}>{saving ? t.saving : editingId ? t.update : t.save}</button>
              <button type="button" className="nm-btn nm-btn-secondary" onClick={closeEditor} disabled={saving}>{t.close}</button>
            </div>
          </div>
        </div>
      ) : null}

      {reasonDialog ? (
        <div className="nm-modal-backdrop" onClick={() => setReasonDialog(null)}>
          <div className="nm-modal" onClick={(event) => event.stopPropagation()}>
            <h3>{t.reasonTitle}</h3>
            <div className="nm-reason-grid">
              {getReasonPresets(locale, reasonDialog.action).map((reason) => (
                <button key={reason} type="button" className="nm-btn nm-btn-secondary" onClick={() => applyReason(reason)}>
                  {reason}
                </button>
              ))}
            </div>
            <label className="nm-admin-field">
              <span>{t.customReason}</span>
              <textarea rows={3} value={customReason} onChange={(event) => setCustomReason(event.target.value)} />
            </label>
            <div className="nm-admin-actions">
              <button type="button" className="nm-btn nm-btn-primary" onClick={() => applyReason(customReason)}>{t.apply}</button>
              <button type="button" className="nm-btn nm-btn-secondary" onClick={() => setReasonDialog(null)}>{t.close}</button>
            </div>
          </div>
        </div>
      ) : null}
    </>
  );

  return mode === 'catalog' ? <main className="nm-register-page">{content}</main> : content;
}
