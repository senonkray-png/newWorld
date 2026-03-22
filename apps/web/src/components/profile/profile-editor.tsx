'use client';

import Image from 'next/image';
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
  role: 'Пользователь',
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
      <section className="nm-register-card nm-reveal">
        <h1>{t.title}</h1>
        <p>{t.subtitle}</p>

        <div className="nm-admin-actions">
          <button type="button" className="nm-btn nm-btn-secondary" onClick={signOut}>
            {signOutLabel}
          </button>
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
                  <option value="Пользователь">Пользователь</option>
                  <option value="Продавец">Продавец</option>
                  <option value="Поставщик услуг">Поставщик услуг</option>
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
            {form.role === 'Продавец' ? <ProductsBoard locale={locale} mode="cabinet" /> : null}
            {form.role === 'Поставщик услуг' ? <ServicesBoard locale={locale} mode="cabinet" /> : null}
          </div>
        )}

        {status ? <p className="nm-admin-status">{status}</p> : null}
        <datalist id="nm-country-options">
          {countryOptions.map((option) => <option key={option} value={option} />)}
        </datalist>
        <datalist id="nm-region-options">
          {regionOptions.map((option) => <option key={option} value={option} />)}
        </datalist>
        <datalist id="nm-city-options">
          {cityOptions.map((option) => <option key={option} value={option} />)}
        </datalist>
      </section>
    </main>
  );
}
