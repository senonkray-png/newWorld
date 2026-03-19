'use client';

import Link from 'next/link';
import { useMemo, useState } from 'react';

import type { Locale } from '@/i18n/config';
import {
  defaultHomeContent,
  type HomeContent,
} from '@/i18n/home-content';

type HomeEditorProps = {
  locale: Locale;
  initialContent: HomeContent;
  accessToken: string;
};

function InputField({
  label,
  value,
  onChange,
}: {
  label: string;
  value: string;
  onChange: (value: string) => void;
}) {
  return (
    <label className="nm-admin-field">
      <span>{label}</span>
      <input value={value} onChange={(event) => onChange(event.target.value)} />
    </label>
  );
}

function TextareaField({
  label,
  value,
  onChange,
}: {
  label: string;
  value: string;
  onChange: (value: string) => void;
}) {
  return (
    <label className="nm-admin-field">
      <span>{label}</span>
      <textarea rows={3} value={value} onChange={(event) => onChange(event.target.value)} />
    </label>
  );
}

type ImageInputMode = 'url' | 'upload';

function ImageInputField({
  label,
  value,
  onChange,
  onFileSelect,
  isLoading,
}: {
  label: string;
  value: string;
  onChange: (value: string) => void;
  onFileSelect: (file: File) => void;
  isLoading?: boolean;
}) {
  const [mode, setMode] = useState<ImageInputMode>('url');

  return (
    <div className="nm-admin-field">
      <span>{label}</span>
      <div className="nm-admin-image-tabs">
        <button
          type="button"
          className={`nm-admin-tab${mode === 'url' ? ' active' : ''}`}
          onClick={() => setMode('url')}
          disabled={isLoading}
        >
          Посилання
        </button>
        <button
          type="button"
          className={`nm-admin-tab${mode === 'upload' ? ' active' : ''}`}
          onClick={() => setMode('upload')}
          disabled={isLoading}
        >
          Завантажити
        </button>
      </div>
      {mode === 'url' ? (
        <input
          type="text"
          placeholder="https://example.com/image.jpg"
          value={value}
          onChange={(e) => onChange(e.target.value)}
          className="nm-admin-input-text"
          disabled={isLoading}
        />
      ) : (
        <input
          type="file"
          accept="image/*"
          onChange={(event) => {
            const file = event.currentTarget.files?.[0];
            if (file) onFileSelect(file);
          }}
          className="nm-admin-input-file"
          disabled={isLoading}
        />
      )}
      {value && <div className="nm-admin-hint">Поточне зображення: {value}</div>}
      {isLoading && <div className="nm-admin-hint">Завантаження...</div>}
    </div>
  );
}

export function HomeEditor({ locale, initialContent, accessToken }: HomeEditorProps) {
  const fallback = useMemo(() => defaultHomeContent[locale], [locale]);
  const [content, setContent] = useState<HomeContent>(initialContent);
  const [status, setStatus] = useState('');
  const [isSaving, setIsSaving] = useState(false);
  const [uploadingImage, setUploadingImage] = useState<string | null>(null);

  const handleImageUploadGeneric = async (file: File, onSuccess: (url: string) => void) => {
    setUploadingImage(file.name);
    const formData = new FormData();
    formData.append('file', file);

    const response = await fetch('/api/upload', {
      method: 'POST',
      body: formData,
    });

    setUploadingImage(null);

    if (!response.ok) {
      setStatus('Ошибка загрузки. Повторите попытку.');
      return;
    }

    const data = (await response.json()) as { url?: string };
    if (data.url) {
      onSuccess(data.url);
      setStatus('Изображение загружено');
    }
  };

  const updateFeature = (index: number, key: 'title' | 'text' | 'icon', value: string) => {
    setContent((prev) => ({
      ...prev,
      featureItems: prev.featureItems.map((item, itemIndex) =>
        itemIndex === index ? { ...item, [key]: value } : item,
      ),
    }));
  };

  const updateProcess = (index: number, key: 'title' | 'text' | 'icon', value: string) => {
    setContent((prev) => ({
      ...prev,
      processItems: prev.processItems.map((item, itemIndex) =>
        itemIndex === index ? { ...item, [key]: value } : item,
      ),
    }));
  };


  const save = async () => {
    setIsSaving(true);
    setStatus('Сохранение...');

    const response = await fetch(`/api/home-content/${locale}`, {
      method: 'PUT',
      headers: {
        'Content-Type': 'application/json',
        Authorization: `Bearer ${accessToken}`,
      },
      body: JSON.stringify({ content }),
    });

    if (!response.ok) {
      setStatus('Ошибка сохранения. Проверьте данные и повторите.');
      setIsSaving(false);
      return;
    }

    setStatus('Сохранено в серверном хранилище.');
    setIsSaving(false);
  };

  const reset = async () => {
    setIsSaving(true);
    setStatus('Сброс...');

    const response = await fetch(`/api/home-content/${locale}`, {
      method: 'DELETE',
      headers: {
        Authorization: `Bearer ${accessToken}`,
      },
    });

    if (!response.ok) {
      setStatus('Ошибка сброса. Повторите попытку.');
      setIsSaving(false);
      return;
    }

    const payload = (await response.json()) as { content?: HomeContent };
    setContent(payload.content ?? fallback);
    setStatus('Сброшено к базовому шаблону и сохранено на сервере.');
    setIsSaving(false);
  };

  return (
    <div className="nm-admin-layout">
      <aside className="nm-admin-sidebar">
        <h1>Админ-панель</h1>
        <div className="nm-admin-tabs">
          <span className="active">Home</span>
          <span className="active">SEO</span>
          <span>Новости (скоро)</span>
        </div>
        <Link href={`/${locale}`} className="nm-btn nm-btn-secondary">
          На главную
        </Link>
      </aside>

      <section className="nm-admin-content">
        <header className="nm-admin-head">
          <h2>Вкладка Home: редактирование блоков текста и изображений</h2>
          <p>Можно менять каждый элемент главной страницы: SEO, заголовки, описания, иконки и изображения.</p>
        </header>

        <div className="nm-admin-card">
          <h3>SEO</h3>
          <InputField
            label="Title"
            value={content.seo.title}
            onChange={(value) => setContent((prev) => ({ ...prev, seo: { ...prev.seo, title: value } }))}
          />
          <TextareaField
            label="Description"
            value={content.seo.description}
            onChange={(value) => setContent((prev) => ({ ...prev, seo: { ...prev.seo, description: value } }))}
          />
        </div>

        <div className="nm-admin-card">
          <h3>Hero блок</h3>
          <InputField label="Hero заголовок" value={content.heroTitle} onChange={(value) => setContent((prev) => ({ ...prev, heroTitle: value }))} />
          <TextareaField label="Hero текст" value={content.heroText} onChange={(value) => setContent((prev) => ({ ...prev, heroText: value }))} />
          <ImageInputField
            label="Hero зображення"
            value={content.heroImage}
            onChange={(value) => setContent((prev) => ({ ...prev, heroImage: value }))}
            onFileSelect={(file) => handleImageUploadGeneric(file, (url) => setContent((prev) => ({ ...prev, heroImage: url })))}
            isLoading={uploadingImage !== null}
          />
          <InputField label="Кнопка «Стать партнером»" value={content.primaryAction} onChange={(value) => setContent((prev) => ({ ...prev, primaryAction: value }))} />
        </div>

        <div className="nm-admin-card">
          <h3>Секция возможностей</h3>
          <InputField label="Заголовок секции" value={content.featureTitle} onChange={(value) => setContent((prev) => ({ ...prev, featureTitle: value }))} />
          {content.featureItems.map((item, index) => (
            <div key={`feature-${index}`} className="nm-admin-group">
              <h4>Карточка {index + 1}</h4>
              <InputField label="Заголовок" value={item.title} onChange={(value) => updateFeature(index, 'title', value)} />
              <TextareaField label="Описание" value={item.text} onChange={(value) => updateFeature(index, 'text', value)} />
              <ImageInputField
                label="Іконка"
                value={item.icon}
                onChange={(value) => updateFeature(index, 'icon', value)}
                onFileSelect={(file) => handleImageUploadGeneric(file, (url) => updateFeature(index, 'icon', url))}
                isLoading={uploadingImage !== null}
              />
            </div>
          ))}
        </div>

        <div className="nm-admin-card">
          <h3>Секция процесса</h3>
          <InputField label="Заголовок секции" value={content.processTitle} onChange={(value) => setContent((prev) => ({ ...prev, processTitle: value }))} />
          {content.processItems.map((item, index) => (
            <div key={`process-${index}`} className="nm-admin-group">
              <h4>Шаг {index + 1}</h4>
              <InputField label="Заголовок" value={item.title} onChange={(value) => updateProcess(index, 'title', value)} />
              <TextareaField label="Описание" value={item.text} onChange={(value) => updateProcess(index, 'text', value)} />
              <ImageInputField
                label="Іконка"
                value={item.icon}
                onChange={(value) => updateProcess(index, 'icon', value)}
                onFileSelect={(file) => handleImageUploadGeneric(file, (url) => updateProcess(index, 'icon', url))}
                isLoading={uploadingImage !== null}
              />
            </div>
          ))}
        </div>

        <div className="nm-admin-card">
          <h3>Сторителлинг блоки</h3>
          <InputField label="Левый блок заголовок" value={content.storyLeft.title} onChange={(value) => setContent((prev) => ({ ...prev, storyLeft: { ...prev.storyLeft, title: value } }))} />
          <TextareaField label="Левый блок текст" value={content.storyLeft.text} onChange={(value) => setContent((prev) => ({ ...prev, storyLeft: { ...prev.storyLeft, text: value } }))} />
          <ImageInputField
            label="Ліве зображення"
            value={content.storyLeft.image}
            onChange={(value) => setContent((prev) => ({ ...prev, storyLeft: { ...prev.storyLeft, image: value } }))}
            onFileSelect={(file) => handleImageUploadGeneric(file, (url) => setContent((prev) => ({ ...prev, storyLeft: { ...prev.storyLeft, image: url } })))}
            isLoading={uploadingImage !== null}
          />
          <InputField label="Правый блок заголовок" value={content.storyRight.title} onChange={(value) => setContent((prev) => ({ ...prev, storyRight: { ...prev.storyRight, title: value } }))} />
          <TextareaField label="Правый блок текст" value={content.storyRight.text} onChange={(value) => setContent((prev) => ({ ...prev, storyRight: { ...prev.storyRight, text: value } }))} />
          <ImageInputField
            label="Праве зображення"
            value={content.storyRight.image}
            onChange={(value) => setContent((prev) => ({ ...prev, storyRight: { ...prev.storyRight, image: value } }))}
            onFileSelect={(file) => handleImageUploadGeneric(file, (url) => setContent((prev) => ({ ...prev, storyRight: { ...prev.storyRight, image: url } })))}
            isLoading={uploadingImage !== null}
          />
        </div>

        <div className="nm-admin-card">
          <h3>Командный блок</h3>
          <InputField label="Заголовок" value={content.teamSection.title} onChange={(value) => setContent((prev) => ({ ...prev, teamSection: { ...prev.teamSection, title: value } }))} />
          <TextareaField label="Текст" value={content.teamSection.text} onChange={(value) => setContent((prev) => ({ ...prev, teamSection: { ...prev.teamSection, text: value } }))} />
          <ImageInputField
            label="Зображення команди"
            value={content.teamSection.image}
            onChange={(value) => setContent((prev) => ({ ...prev, teamSection: { ...prev.teamSection, image: value } }))}
            onFileSelect={(file) => handleImageUploadGeneric(file, (url) => setContent((prev) => ({ ...prev, teamSection: { ...prev.teamSection, image: url } })))}
            isLoading={uploadingImage !== null}
          />
        </div>

        <div className="nm-admin-actions">
          <button type="button" className="nm-btn nm-btn-primary" onClick={save} disabled={isSaving}>
            {isSaving ? 'Сохраняем...' : 'Сохранить изменения'}
          </button>
          <button type="button" className="nm-btn nm-btn-secondary" onClick={reset} disabled={isSaving}>
            Сбросить к шаблону
          </button>
          <Link href={`/${locale}`} className="nm-btn nm-btn-secondary">
            Открыть главную
          </Link>
        </div>

        {status ? <p className="nm-admin-status">{status}</p> : null}
      </section>
    </div>
  );
}
