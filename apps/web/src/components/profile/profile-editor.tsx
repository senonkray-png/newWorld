'use client';

import Image from 'next/image';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { useCallback, useEffect, useMemo, useState } from 'react';

import { ProductsBoard } from '@/components/market/products-board';
import { ServicesBoard } from '@/components/market/services-board';
import type { Locale } from '@/i18n/config';
import { getSupabaseBrowserClient } from '@/lib/supabase-browser';
import type { UserRoleRu } from '@/lib/app-user-store';

type ProfileFormState = {
  email: string;
  isEmailVerified: boolean;
  fullName: string;
  phone: string;
  gender: string;
  avatarUrl: string;
  telegram: string;
  instagram: string;
  country: string;
  region: string;
  city: string;
  role: UserRoleRu;
  businessNiche: string;
  companyName: string;
  workPhone: string;
  websiteUrl: string;
  interests: string;
  aboutMe: string;
};

type CabinetSection = 'main' | 'messages' | 'notifications' | 'products' | 'services';

type NotificationItem = {
  id: string;
  title: string;
  body: string;
  isRead: boolean;
  createdAt: string;
};

type ConversationPreview = {
  userId: string;
  userName: string;
  lastMessage: string;
  createdAt: string;
  isOutgoing: boolean;
};

const initialState: ProfileFormState = {
  email: '',
  isEmailVerified: false,
  fullName: '',
  phone: '',
  gender: '',
  avatarUrl: '',
  telegram: '',
  instagram: '',
  country: '',
  region: '',
  city: '',
  role: 'Потребитель',
  businessNiche: '',
  companyName: '',
  workPhone: '',
  websiteUrl: '',
  interests: '',
  aboutMe: '',
};

const genderOptions = ['Не указан', 'Мужской', 'Женский'];
const countryOptions = ['Украина', 'Польша', 'Германия', 'Испания', 'Италия', 'Франция', 'Канада', 'США'];
const regionOptions = ['Киевская область', 'Львовская область', 'Одесская область', 'Харьковская область', 'Днепропетровская область'];
const cityOptions = ['Киев', 'Львов', 'Одесса', 'Харьков', 'Днепр', 'Варшава', 'Берлин', 'Торонто'];

function textByLocale(locale: Locale) {
  if (locale === 'en') {
    return {
      title: 'Profile',
      subtitle: 'View and update your profile.',
      edit: 'Edit profile',
      cancel: 'Cancel',
      save: 'Save',
      saving: 'Saving...',
      saved: 'Profile saved.',
      basic: 'Basic information',
      roleBlock: 'Role',
      details: 'Additional information',
      verified: 'Email verified',
      notVerified: 'Email not verified',
      emailLocked: 'Email is managed via account settings and syncs automatically.',
      avatar: 'Avatar',
      uploadAvatar: 'Upload from device',
      uploading: 'Uploading...',
      sellerProducts: 'My products',
      noProducts: 'No uploaded products yet.',
      yes: 'Yes',
      no: 'No',
      navMain: 'Main',
      navMessages: 'Messages',
      navNotifications: 'System notifications',
      navProducts: 'My products',
      navServices: 'Services',
      cabinetTitle: 'User cabinet',
      cabinetSubtitle: 'Manage profile, activity and marketplace sections from one dashboard.',
      sectionMainTitle: 'Main profile data',
      sectionMainHint: 'Personal info, selected role, activity and business details.',
      sectionMessagesTitle: 'Messages',
      sectionMessagesHint: 'Quick view of latest dialogs. Open full chat to continue conversation.',
      sectionNotificationsTitle: 'System notifications',
      sectionNotificationsHint: 'Moderation and system updates in chronological order.',
      sectionProductsTitle: 'My products',
      sectionProductsHint: 'Manage your product cards including hidden items.',
      sectionServicesTitle: 'Services',
      sectionServicesHint: 'Manage service requests and offers with type switcher.',
      openMessages: 'Open messages',
      noMessagesYet: 'No dialogs yet.',
      noNotificationsYet: 'No notifications yet.',
      markAllRead: 'Mark all read',
      read: 'Read',
      providerOnlyBlock: 'This section is available only for users with Provider role.',
    };
  }

  if (locale === 'uk') {
    return {
      title: 'Профіль',
      subtitle: 'Перегляд і редагування профілю.',
      edit: 'Редагувати профіль',
      cancel: 'Скасувати',
      save: 'Зберегти',
      saving: 'Збереження...',
      saved: 'Профіль збережено.',
      basic: 'Базова інформація',
      roleBlock: 'Роль',
      details: 'Додаткова інформація',
      verified: 'Email підтверджено',
      notVerified: 'Email не підтверджено',
      emailLocked: 'Email керується в акаунті та синхронізується автоматично.',
      avatar: 'Аватар',
      uploadAvatar: 'Завантажити з пристрою',
      uploading: 'Завантаження...',
      sellerProducts: 'Мої товари',
      noProducts: 'Поки немає завантажених товарів.',
      yes: 'Так',
      no: 'Ні',
      navMain: 'Основне',
      navMessages: 'Повідомлення',
      navNotifications: 'Сист. сповіщення',
      navProducts: 'Мої товари',
      navServices: 'Послуги',
      cabinetTitle: 'Кабінет користувача',
      cabinetSubtitle: 'Керуйте профілем, активністю та розділами маркетплейсу в одному місці.',
      sectionMainTitle: 'Основні дані профілю',
      sectionMainHint: 'Особиста інформація, обрана роль, дані про діяльність і бізнес.',
      sectionMessagesTitle: 'Повідомлення',
      sectionMessagesHint: 'Швидкий перегляд останніх діалогів. Для продовження відкрийте повний чат.',
      sectionNotificationsTitle: 'Системні сповіщення',
      sectionNotificationsHint: 'Модераційні та системні оновлення у хронологічному порядку.',
      sectionProductsTitle: 'Мої товари',
      sectionProductsHint: 'Керуйте картками товарів, зокрема прихованими.',
      sectionServicesTitle: 'Послуги',
      sectionServicesHint: 'Керуйте запитами та пропозиціями послуг з перемикачем типів.',
      openMessages: 'Відкрити повідомлення',
      noMessagesYet: 'Поки немає діалогів.',
      noNotificationsYet: 'Поки немає сповіщень.',
      markAllRead: 'Позначити все прочитаним',
      read: 'Прочитати',
      providerOnlyBlock: 'Розділ доступний лише користувачам з роллю Постачальник.',
    };
  }

  return {
    title: 'Профиль',
    subtitle: 'Просмотр и редактирование профиля.',
    edit: 'Редактировать профиль',
    cancel: 'Отмена',
    save: 'Сохранить',
    saving: 'Сохранение...',
    saved: 'Профиль сохранен.',
    basic: 'Базовая информация',
    roleBlock: 'Роль',
    details: 'Дополнительная информация',
    verified: 'Email подтвержден',
    notVerified: 'Email не подтвержден',
    emailLocked: 'Email управляется в аккаунте и синхронизируется автоматически.',
    avatar: 'Аватар',
    uploadAvatar: 'Загрузить с устройства',
    uploading: 'Загрузка...',
    sellerProducts: 'Мои товары',
    noProducts: 'Пока нет загруженных товаров.',
    yes: 'Да',
    no: 'Нет',
    navMain: 'Основное',
    navMessages: 'Сообщение',
    navNotifications: 'Сис. уведомление',
    navProducts: 'Мои товары',
    navServices: 'Услуги',
    cabinetTitle: 'Кабинет пользователя',
    cabinetSubtitle: 'Управляйте профилем, активностью и разделами маркетплейса в одном месте.',
    sectionMainTitle: 'Основные данные профиля',
    sectionMainHint: 'Личная информация, выбранная роль и данные о деятельности и бизнесе.',
    sectionMessagesTitle: 'Сообщения',
    sectionMessagesHint: 'Быстрый просмотр последних диалогов. Для продолжения откройте полный чат.',
    sectionNotificationsTitle: 'Системные уведомления',
    sectionNotificationsHint: 'Модерационные и системные обновления в хронологическом порядке.',
    sectionProductsTitle: 'Мои товары',
    sectionProductsHint: 'Управляйте карточками товаров, включая скрытые.',
    sectionServicesTitle: 'Услуги',
    sectionServicesHint: 'Управляйте запросами и предложениями услуг с переключателем типов.',
    openMessages: 'Открыть сообщения',
    noMessagesYet: 'Пока нет диалогов.',
    noNotificationsYet: 'Пока нет уведомлений.',
    markAllRead: 'Прочитать все',
    read: 'Прочитать',
    providerOnlyBlock: 'Раздел доступен только пользователям с ролью Поставщик.',
  };
}

function InfoRow({ label, value }: { label: string; value: string }) {
  return (
    <div className="nm-profile-row">
      <strong>{label}:</strong> <span>{value || '-'}</span>
    </div>
  );
}

export function ProfileEditor({ locale }: { locale: Locale }) {
  const supabase = useMemo(() => getSupabaseBrowserClient(), []);
  const router = useRouter();
  const t = useMemo(() => textByLocale(locale), [locale]);

  const [token, setToken] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [editing, setEditing] = useState(false);
  const [status, setStatus] = useState('');
  const [uploadingAvatar, setUploadingAvatar] = useState(false);
  const [activeSection, setActiveSection] = useState<CabinetSection>('main');
  const [notifications, setNotifications] = useState<NotificationItem[]>([]);
  const [messagePreviews, setMessagePreviews] = useState<ConversationPreview[]>([]);
  const [loadingMessages, setLoadingMessages] = useState(false);
  const [loadingNotifications, setLoadingNotifications] = useState(false);
  const [form, setForm] = useState<ProfileFormState>(initialState);

  const signOutLabel = locale === 'en' ? 'Sign out' : locale === 'uk' ? 'Вийти' : 'Выйти';

  const loadProfile = useCallback(async () => {
    const { data } = await supabase.auth.getSession();
    const accessToken = data.session?.access_token ?? null;
    const sessionUser = data.session?.user ?? null;
    setToken(accessToken);

    setForm((prev) => ({
      ...prev,
      email: sessionUser?.email ?? prev.email,
      isEmailVerified: Boolean(sessionUser?.email_confirmed_at),
    }));

    if (!accessToken) {
      setLoading(false);
      return;
    }

    const response = await fetch('/api/app-profile/me', {
      headers: {
        Authorization: `Bearer ${accessToken}`,
      },
    });

    if (!response.ok) {
      const payload = (await response.json().catch(() => ({ error: 'Failed to load profile' }))) as { error?: string };
      setStatus(payload.error ?? 'Ошибка загрузки профиля');
      setEditing(false);
      setLoading(false);
      return;
    }

    const payload = (await response.json()) as {
      profile?: {
        email: string;
        isEmailVerified: boolean;
        fullName: string;
        phone: string;
        gender: string;
        avatarUrl: string;
        telegram: string;
        instagram: string;
        country: string;
        region: string;
        city: string;
        role: UserRoleRu;
        businessNiche: string;
        companyName: string;
        workPhone: string;
        websiteUrl: string;
        interests: string[];
        aboutMe: string;
      };
    };

    if (payload.profile) {
      const nextForm = {
        ...payload.profile,
        email: sessionUser?.email ?? payload.profile.email,
        isEmailVerified: Boolean(sessionUser?.email_confirmed_at) || payload.profile.isEmailVerified,
        interests: payload.profile.interests.join(', '),
      };

      setForm(nextForm);
    }

    setLoading(false);
  }, [supabase.auth]);

  useEffect(() => {
    loadProfile();
  }, [loadProfile]);

  useEffect(() => {
    if (!token) {
      setNotifications([]);
      setMessagePreviews([]);
      return;
    }

    let alive = true;

    const loadMessages = async () => {
      setLoadingMessages(true);
      const response = await fetch('/api/messages', {
        headers: {
          Authorization: `Bearer ${token}`,
        },
      });

      if (!alive) return;

      if (!response.ok) {
        setMessagePreviews([]);
        setLoadingMessages(false);
        return;
      }

      const payload = (await response.json()) as { conversations?: ConversationPreview[] };
      setMessagePreviews(payload.conversations ?? []);
      setLoadingMessages(false);
    };

    const loadNotifications = async () => {
      setLoadingNotifications(true);
      const response = await fetch('/api/notifications', {
        headers: {
          Authorization: `Bearer ${token}`,
        },
      });

      if (!alive) return;

      if (!response.ok) {
        setNotifications([]);
        setLoadingNotifications(false);
        return;
      }

      const payload = (await response.json()) as { notifications?: NotificationItem[] };
      setNotifications(payload.notifications ?? []);
      setLoadingNotifications(false);
    };

    loadMessages();
    loadNotifications();

    const timer = setInterval(() => {
      loadMessages();
      loadNotifications();
    }, 15_000);

    return () => {
      alive = false;
      clearInterval(timer);
    };
  }, [token]);

  const saveProfile = async () => {
    if (!token) {
      return;
    }

    setSaving(true);
    setStatus('');

    const response = await fetch('/api/app-profile/me', {
      method: 'PUT',
      headers: {
        'Content-Type': 'application/json',
        Authorization: `Bearer ${token}`,
      },
      body: JSON.stringify({
        profile: {
          ...form,
          interests: form.interests,
        },
      }),
    });

    if (!response.ok) {
      const payload = (await response.json().catch(() => ({ error: 'Ошибка сохранения профиля' }))) as { error?: string };
      setStatus(payload.error ?? 'Ошибка сохранения профиля');
      setSaving(false);
      return;
    }

    setStatus(t.saved);
    setSaving(false);
    setEditing(false);
    await loadProfile();
  };

  const uploadAvatar = async (file: File | null) => {
    if (!file) {
      return;
    }

    const body = new FormData();
    body.append('file', file);
    body.append('folder', 'avatars');
    setUploadingAvatar(true);
    setStatus('');

    const response = await fetch('/api/upload', {
      method: 'POST',
      body,
    });

    if (!response.ok) {
      setStatus('Ошибка загрузки аватара');
      setUploadingAvatar(false);
      return;
    }

    const payload = (await response.json()) as { url?: string };
    if (payload.url) {
      setForm((prev) => ({ ...prev, avatarUrl: payload.url ?? prev.avatarUrl }));
    }
    setUploadingAvatar(false);
  };

  const signOut = async () => {
    await supabase.auth.signOut();
    router.push(`/${locale}/login`);
    router.refresh();
  };

  const formatDate = (value: string) => {
    const date = new Date(value);
    if (Number.isNaN(date.getTime())) {
      return '';
    }

    return new Intl.DateTimeFormat(locale === 'uk' ? 'uk-UA' : locale === 'en' ? 'en-US' : 'ru-RU', {
      day: '2-digit',
      month: '2-digit',
      hour: '2-digit',
      minute: '2-digit',
    }).format(date);
  };

  const markAllNotificationsRead = async () => {
    if (!token) {
      return;
    }

    await fetch('/api/notifications/read-all', {
      method: 'POST',
      headers: {
        Authorization: `Bearer ${token}`,
      },
    });

    setNotifications((current) => current.map((item) => ({ ...item, isRead: true })));
  };

  const markNotificationRead = async (id: string) => {
    if (!token) {
      return;
    }

    await fetch(`/api/notifications/${id}/read`, {
      method: 'POST',
      headers: {
        Authorization: `Bearer ${token}`,
      },
    });

    setNotifications((current) => current.map((item) => (item.id === id ? { ...item, isRead: true } : item)));
  };

  if (loading) {
    return (
      <main className="nm-register-page">
        <section className="nm-register-card">
          <h1>...</h1>
        </section>
      </main>
    );
  }

  return (
    <main className="nm-register-page">
      <section className="nm-cabinet-shell nm-reveal">
        <aside className="nm-cabinet-nav">
          <h2>{t.cabinetTitle}</h2>
          <p>{t.cabinetSubtitle}</p>

          <div className="nm-cabinet-nav-list">
            <button type="button" className={`nm-cabinet-nav-btn${activeSection === 'main' ? ' active' : ''}`} onClick={() => setActiveSection('main')}>{t.navMain}</button>
            <button type="button" className={`nm-cabinet-nav-btn${activeSection === 'messages' ? ' active' : ''}`} onClick={() => setActiveSection('messages')}>{t.navMessages}</button>
            <button type="button" className={`nm-cabinet-nav-btn${activeSection === 'notifications' ? ' active' : ''}`} onClick={() => setActiveSection('notifications')}>{t.navNotifications}</button>
            <button type="button" className={`nm-cabinet-nav-btn${activeSection === 'products' ? ' active' : ''}`} onClick={() => setActiveSection('products')}>{t.navProducts}</button>
            <button type="button" className={`nm-cabinet-nav-btn${activeSection === 'services' ? ' active' : ''}`} onClick={() => setActiveSection('services')}>{t.navServices}</button>
          </div>

          <button type="button" className="nm-btn nm-btn-secondary" onClick={signOut}>
            {signOutLabel}
          </button>
        </aside>

        <div className="nm-cabinet-content">
          {activeSection === 'main' ? (
            <section className="nm-register-card">
              <h1>{t.sectionMainTitle}</h1>
              <p>{t.sectionMainHint}</p>

              <div className="nm-admin-actions">
                {!editing ? (
                  <button type="button" className="nm-btn nm-btn-primary" onClick={() => setEditing(true)}>
                    {t.edit}
                  </button>
                ) : (
                  <>
                    <button type="button" className="nm-btn nm-btn-primary" onClick={saveProfile} disabled={saving}>
                      {saving ? t.saving : t.save}
                    </button>
                    <button type="button" className="nm-btn nm-btn-secondary" onClick={() => setEditing(false)} disabled={saving}>
                      {t.cancel}
                    </button>
                  </>
                )}
              </div>

              {editing ? (
                <div className="nm-profile-edit-grid">
                  <div className="nm-admin-card">
                    <h3>{t.basic}</h3>
                    <label className="nm-admin-field">
                      <span>Email</span>
                      <input value={form.email} readOnly />
                      <small className="nm-admin-hint">{t.emailLocked}</small>
                    </label>
                    <label className="nm-admin-field"><span>ФИО</span><input value={form.fullName} onChange={(e) => setForm((p) => ({ ...p, fullName: e.target.value }))} /></label>
                    <label className="nm-admin-field"><span>Телефон</span><input value={form.phone} onChange={(e) => setForm((p) => ({ ...p, phone: e.target.value }))} /></label>
                    <label className="nm-admin-field">
                      <span>Пол</span>
                      <select value={form.gender || 'Не указан'} onChange={(e) => setForm((p) => ({ ...p, gender: e.target.value }))}>
                        {genderOptions.map((option) => (
                          <option key={option} value={option}>{option}</option>
                        ))}
                      </select>
                    </label>
                    <div className="nm-admin-field">
                      <span>{t.avatar}</span>
                      {form.avatarUrl ? (
                        <Image src={form.avatarUrl} alt="Avatar" width={120} height={120} className="nm-profile-avatar" unoptimized />
                      ) : null}
                      <input value={form.avatarUrl} onChange={(e) => setForm((p) => ({ ...p, avatarUrl: e.target.value }))} placeholder="https://..." />
                      <input type="file" accept="image/*" onChange={(e) => uploadAvatar(e.target.files?.[0] ?? null)} disabled={uploadingAvatar} />
                      <small className="nm-admin-hint">{uploadingAvatar ? t.uploading : t.uploadAvatar}</small>
                    </div>
                    <label className="nm-admin-field"><span>Telegram</span><input value={form.telegram} onChange={(e) => setForm((p) => ({ ...p, telegram: e.target.value }))} /></label>
                    <label className="nm-admin-field"><span>Instagram</span><input value={form.instagram} onChange={(e) => setForm((p) => ({ ...p, instagram: e.target.value }))} /></label>
                    <label className="nm-admin-field"><span>Страна</span><input list="nm-country-options" value={form.country} onChange={(e) => setForm((p) => ({ ...p, country: e.target.value }))} /></label>
                    <label className="nm-admin-field"><span>Область</span><input list="nm-region-options" value={form.region} onChange={(e) => setForm((p) => ({ ...p, region: e.target.value }))} /></label>
                    <label className="nm-admin-field"><span>Город</span><input list="nm-city-options" value={form.city} onChange={(e) => setForm((p) => ({ ...p, city: e.target.value }))} /></label>
                  </div>

                  <div className="nm-admin-card">
                    <h3>{t.roleBlock}</h3>
                    <label className="nm-admin-field">
                      <span>Роль</span>
                      <select value={form.role} onChange={(e) => setForm((p) => ({ ...p, role: e.target.value as UserRoleRu }))}>
                        <option value="Потребитель">Потребитель</option>
                        <option value="Поставщик">Поставщик</option>
                      </select>
                    </label>
                  </div>

                  <div className="nm-admin-card">
                    <h3>{t.details}</h3>
                    <label className="nm-admin-field"><span>Ниша</span><input value={form.businessNiche} onChange={(e) => setForm((p) => ({ ...p, businessNiche: e.target.value }))} /></label>
                    <label className="nm-admin-field"><span>Компания</span><input value={form.companyName} onChange={(e) => setForm((p) => ({ ...p, companyName: e.target.value }))} /></label>
                    <label className="nm-admin-field"><span>Рабочий телефон</span><input value={form.workPhone} onChange={(e) => setForm((p) => ({ ...p, workPhone: e.target.value }))} /></label>
                    <label className="nm-admin-field"><span>Сайт</span><input value={form.websiteUrl} onChange={(e) => setForm((p) => ({ ...p, websiteUrl: e.target.value }))} /></label>
                    <label className="nm-admin-field"><span>Интересы (через запятую)</span><input value={form.interests} onChange={(e) => setForm((p) => ({ ...p, interests: e.target.value }))} /></label>
                    <label className="nm-admin-field"><span>О себе</span><textarea rows={4} value={form.aboutMe} onChange={(e) => setForm((p) => ({ ...p, aboutMe: e.target.value }))} /></label>
                  </div>
                </div>
              ) : (
                <div className="nm-profile-view-grid">
                  <div className="nm-admin-card">
                    <h3>{t.basic}</h3>
                    {form.avatarUrl ? <Image src={form.avatarUrl} alt="Avatar" width={120} height={120} className="nm-profile-avatar" unoptimized /> : null}
                    <InfoRow label="Email" value={form.email} />
                    <InfoRow label={form.isEmailVerified ? t.verified : t.notVerified} value={form.isEmailVerified ? t.yes : t.no} />
                    <InfoRow label="ФИО" value={form.fullName} />
                    <InfoRow label="Телефон" value={form.phone} />
                    <InfoRow label="Пол" value={form.gender} />
                    <InfoRow label="Telegram" value={form.telegram} />
                    <InfoRow label="Instagram" value={form.instagram} />
                    <InfoRow label="Страна" value={form.country} />
                    <InfoRow label="Регион" value={form.region} />
                    <InfoRow label="Город" value={form.city} />
                  </div>
                  <div className="nm-admin-card">
                    <h3>{t.roleBlock}</h3>
                    <InfoRow label="Роль" value={form.role} />
                  </div>
                  <div className="nm-admin-card">
                    <h3>{t.details}</h3>
                    <InfoRow label="Ниша" value={form.businessNiche} />
                    <InfoRow label="Компания" value={form.companyName} />
                    <InfoRow label="Рабочий телефон" value={form.workPhone} />
                    <InfoRow label="Сайт" value={form.websiteUrl} />
                    <InfoRow label="Интересы" value={form.interests} />
                    <InfoRow label="О себе" value={form.aboutMe} />
                  </div>
                </div>
              )}
              {status ? <p className="nm-admin-status">{status}</p> : null}
            </section>
          ) : null}

          {activeSection === 'messages' ? (
            <section className="nm-register-card">
              <h1>{t.sectionMessagesTitle}</h1>
              <p>{t.sectionMessagesHint}</p>
              <div className="nm-admin-actions">
                <Link href={`/${locale}/messages`} className="nm-btn nm-btn-primary">
                  {t.openMessages}
                </Link>
              </div>
              <div className="nm-cabinet-list">
                {loadingMessages ? <p className="nm-admin-hint">...</p> : null}
                {!loadingMessages && messagePreviews.length === 0 ? <p className="nm-admin-hint">{t.noMessagesYet}</p> : null}
                {messagePreviews.map((item) => (
                  <Link key={item.userId} href={`/${locale}/messages?user=${item.userId}`} className="nm-cabinet-list-item">
                    <strong>{item.userName || item.userId}</strong>
                    <span>{item.lastMessage}</span>
                    <small>{formatDate(item.createdAt)}</small>
                  </Link>
                ))}
              </div>
            </section>
          ) : null}

          {activeSection === 'notifications' ? (
            <section className="nm-register-card">
              <h1>{t.sectionNotificationsTitle}</h1>
              <p>{t.sectionNotificationsHint}</p>
              <div className="nm-admin-actions">
                <button type="button" className="nm-btn nm-btn-secondary" onClick={markAllNotificationsRead}>
                  {t.markAllRead}
                </button>
              </div>
              <div className="nm-cabinet-list">
                {loadingNotifications ? <p className="nm-admin-hint">...</p> : null}
                {!loadingNotifications && notifications.length === 0 ? <p className="nm-admin-hint">{t.noNotificationsYet}</p> : null}
                {notifications.map((item) => (
                  <div key={item.id} className={`nm-cabinet-list-item${item.isRead ? '' : ' nm-cabinet-list-item-unread'}`}>
                    <strong>{item.title}</strong>
                    <span>{item.body}</span>
                    <small>{formatDate(item.createdAt)}</small>
                    {!item.isRead ? (
                      <button type="button" className="nm-btn nm-btn-secondary nm-btn-sm" onClick={() => markNotificationRead(item.id)}>
                        {t.read}
                      </button>
                    ) : null}
                  </div>
                ))}
              </div>
            </section>
          ) : null}

          {activeSection === 'products' ? (
            <section>
              <div className="nm-register-card">
                <h1>{t.sectionProductsTitle}</h1>
                <p>{t.sectionProductsHint}</p>
              </div>
              {form.role === 'Поставщик' ? (
                <ProductsBoard locale={locale} mode="cabinet" />
              ) : (
                <div className="nm-register-card">
                  <p>{t.providerOnlyBlock}</p>
                </div>
              )}
            </section>
          ) : null}

          {activeSection === 'services' ? (
            <section>
              <div className="nm-register-card">
                <h1>{t.sectionServicesTitle}</h1>
                <p>{t.sectionServicesHint}</p>
              </div>
              {form.role === 'Поставщик' ? (
                <ServicesBoard locale={locale} mode="cabinet" />
              ) : (
                <div className="nm-register-card">
                  <p>{t.providerOnlyBlock}</p>
                </div>
              )}
            </section>
          ) : null}

          <datalist id="nm-country-options">
            {countryOptions.map((option) => <option key={option} value={option} />)}
          </datalist>
          <datalist id="nm-region-options">
            {regionOptions.map((option) => <option key={option} value={option} />)}
          </datalist>
          <datalist id="nm-city-options">
            {cityOptions.map((option) => <option key={option} value={option} />)}
          </datalist>
        </div>
      </section>
    </main>
  );
}
