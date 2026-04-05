'use client';

import Link from 'next/link';
import { useMemo, useState } from 'react';

import type { Locale } from '@/i18n/config';
import { locales } from '@/i18n/config';
import {
  defaultHomeContent,
  type HomeContent,
} from '@/i18n/home-content';
import { getAdminMessages } from '@/i18n/admin-messages';

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
  linkLabel,
  uploadLabel,
  currentLabel,
  uploadingLabel,
}: {
  label: string;
  value: string;
  onChange: (value: string) => void;
  onFileSelect: (file: File) => void;
  isLoading?: boolean;
  linkLabel: string;
  uploadLabel: string;
  currentLabel: string;
  uploadingLabel: string;
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
          {linkLabel}
        </button>
        <button
          type="button"
          className={`nm-admin-tab${mode === 'upload' ? ' active' : ''}`}
          onClick={() => setMode('upload')}
          disabled={isLoading}
        >
          {uploadLabel}
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
      {value && <div className="nm-admin-hint">{currentLabel}: {value}</div>}
      {isLoading && <div className="nm-admin-hint">{uploadingLabel}</div>}
    </div>
  );
}

type ContentSubTab = 'seo' | 'hero' | 'features' | 'process' | 'story' | 'team';

export function HomeEditor({ locale, initialContent, accessToken }: HomeEditorProps) {
  const t = useMemo(() => getAdminMessages(locale), [locale]);
  const fallback = useMemo(() => defaultHomeContent[locale], [locale]);
  const [content, setContent] = useState<HomeContent>(initialContent);
  const [status, setStatus] = useState('');
  const [isSaving, setIsSaving] = useState(false);
  const [uploadingImage, setUploadingImage] = useState<string | null>(null);
  const [subTab, setSubTab] = useState<ContentSubTab>('seo');

  const handleImageUploadGeneric = async (file: File, onSuccess: (url: string) => void) => {
    setUploadingImage(file.name);
    const formData = new FormData();
    formData.append('file', file);
    formData.append('folder', 'home');

    const response = await fetch('/api/upload', {
      method: 'POST',
      body: formData,
    });

    setUploadingImage(null);

    if (!response.ok) {
      setStatus(t.uploadError);
      return;
    }

    const data = (await response.json()) as { url?: string };
    if (data.url) {
      onSuccess(data.url);
      setStatus(t.uploadSuccess);
    }
  };

  const updateFeature = (index: number, key: keyof import('@/i18n/home-content').HomeFeature, value: string | number | boolean) => {
    setContent((prev) => ({
      ...prev,
      featureItems: prev.featureItems.map((item, itemIndex) =>
        itemIndex === index ? { ...item, [key]: value } : item,
      ),
    }));
  };

  const updateProcess = (index: number, key: keyof import('@/i18n/home-content').HomeFeature, value: string | number | boolean) => {
    setContent((prev) => ({
      ...prev,
      processItems: prev.processItems.map((item, itemIndex) =>
        itemIndex === index ? { ...item, [key]: value } : item,
      ),
    }));
  };


  const save = async () => {
    setIsSaving(true);
    setStatus(t.saving);

    const response = await fetch(`/api/home-content/${locale}`, {
      method: 'PUT',
      headers: {
        'Content-Type': 'application/json',
        Authorization: `Bearer ${accessToken}`,
      },
      body: JSON.stringify({ content }),
    });

    if (!response.ok) {
      setStatus(t.saveError);
      setIsSaving(false);
      return;
    }

    // Sync visual settings (font sizes, images) to all other locales
    const otherLocales = locales.filter((l) => l !== locale);
    for (const otherLocale of otherLocales) {
      try {
        const r = await fetch(`/api/home-content/${otherLocale}`);
        if (!r.ok) continue;
        const payload = (await r.json()) as { content?: HomeContent };
        const other = payload.content;
        if (!other) continue;

        const synced: HomeContent = {
          ...other,
          heroTitleFontSize: content.heroTitleFontSize,
          heroTextFontSize: content.heroTextFontSize,
          heroImage: content.heroImage,
          primaryActionHref: content.primaryActionHref,
          storyLeft: { ...other.storyLeft, image: content.storyLeft.image },
          storyRight: { ...other.storyRight, image: content.storyRight.image },
          teamSection: { ...other.teamSection, image: content.teamSection.image },
          featureItems: other.featureItems.map((item, i) => {
            const src = content.featureItems[i];
            if (!src) return item;
            return {
              ...item,
              icon: src.icon,
              headerFontSize: src.headerFontSize,
              descFontSize: src.descFontSize,
              isNewPage: src.isNewPage,
            };
          }),
          processItems: other.processItems.map((item, i) => {
            const src = content.processItems[i];
            if (!src) return item;
            return {
              ...item,
              icon: src.icon,
              headerFontSize: src.headerFontSize,
              descFontSize: src.descFontSize,
              isNewPage: src.isNewPage,
            };
          }),
        };

        await fetch(`/api/home-content/${otherLocale}`, {
          method: 'PUT',
          headers: {
            'Content-Type': 'application/json',
            Authorization: `Bearer ${accessToken}`,
          },
          body: JSON.stringify({ content: synced }),
        });
      } catch {
        // Non-critical: sync failed for one locale, continue
      }
    }

    setStatus(t.saveSuccess + ' ' + t.syncNote);
    setIsSaving(false);
  };

  const reset = async () => {
    setIsSaving(true);
    setStatus(t.resetting);

    const response = await fetch(`/api/home-content/${locale}`, {
      method: 'DELETE',
      headers: {
        Authorization: `Bearer ${accessToken}`,
      },
    });

    if (!response.ok) {
      setStatus(t.resetError);
      setIsSaving(false);
      return;
    }

    const payload = (await response.json()) as { content?: HomeContent };
    setContent(payload.content ?? fallback);
    setStatus(t.resetSuccess);
    setIsSaving(false);
  };

  const autoTranslate = async () => {
    setIsSaving(true);
    setStatus(t.translating);

    // Collect all translatable text fields
    const texts = [
      content.seo.title,
      content.seo.description,
      content.heroTitle,
      content.heroText,
      content.primaryAction,
      content.secondaryAction,
      content.featureTitle,
      ...content.featureItems.flatMap((f) => [f.title, f.text]),
      content.processTitle,
      ...content.processItems.flatMap((p) => [p.title, p.text]),
      content.storyLeft.title,
      content.storyLeft.text,
      content.storyRight.title,
      content.storyRight.text,
      content.teamSection.title,
      content.teamSection.text,
    ];

    const otherLocales = locales.filter((l) => l !== locale);

    try {
      for (const targetLocale of otherLocales) {
        const res = await fetch('/api/translate', {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
            Authorization: `Bearer ${accessToken}`,
          },
          body: JSON.stringify({ texts, from: locale, to: targetLocale }),
        });

        if (!res.ok) {
          setStatus(t.translateError);
          setIsSaving(false);
          return;
        }

        const { translations } = (await res.json()) as { translations: string[] };
        let idx = 0;

        const translated: HomeContent = {
          ...content,
          seo: { title: translations[idx++] ?? content.seo.title, description: translations[idx++] ?? content.seo.description },
          heroTitle: translations[idx++] ?? content.heroTitle,
          heroText: translations[idx++] ?? content.heroText,
          primaryAction: translations[idx++] ?? content.primaryAction,
          secondaryAction: translations[idx++] ?? content.secondaryAction,
          featureTitle: translations[idx++] ?? content.featureTitle,
          featureItems: content.featureItems.map((f) => ({
            ...f,
            title: translations[idx++] ?? f.title,
            text: translations[idx++] ?? f.text,
          })),
          processTitle: translations[idx++] ?? content.processTitle,
          processItems: content.processItems.map((p) => ({
            ...p,
            title: translations[idx++] ?? p.title,
            text: translations[idx++] ?? p.text,
          })),
          storyLeft: { ...content.storyLeft, title: translations[idx++] ?? content.storyLeft.title, text: translations[idx++] ?? content.storyLeft.text },
          storyRight: { ...content.storyRight, title: translations[idx++] ?? content.storyRight.title, text: translations[idx++] ?? content.storyRight.text },
          teamSection: { ...content.teamSection, title: translations[idx++] ?? content.teamSection.title, text: translations[idx++] ?? content.teamSection.text },
        };

        await fetch(`/api/home-content/${targetLocale}`, {
          method: 'PUT',
          headers: {
            'Content-Type': 'application/json',
            Authorization: `Bearer ${accessToken}`,
          },
          body: JSON.stringify({ content: translated }),
        });
      }

      setStatus(t.translateSuccess);
    } catch {
      setStatus(t.translateError);
    }

    setIsSaving(false);
  };

  const subTabs: { key: ContentSubTab; label: string }[] = [
    { key: 'seo', label: t.subSeo },
    { key: 'hero', label: t.subHero },
    { key: 'features', label: t.subFeatures },
    { key: 'process', label: t.subProcess },
    { key: 'story', label: t.subStory },
    { key: 'team', label: t.subTeam },
  ];

  return (
    <div className="nm-admin-layout">
      <aside className="nm-admin-sidebar">
        <h1>{t.adminPanel}</h1>
        <div className="nm-admin-tabs">
          <span className="active">{t.home}</span>
          <span className="active">{t.seo}</span>
          <span>{t.newsSoon}</span>
        </div>
        <Link href={`/${locale}`} className="nm-btn nm-btn-secondary">
          {t.toMain}
        </Link>
      </aside>

      <section className="nm-admin-content">
        <header className="nm-admin-head">
          <h2>{t.editorTitle}</h2>
          <p>{t.editorDesc}</p>
        </header>

        <nav className="nm-admin-subtabs">
          {subTabs.map((st) => (
            <button
              key={st.key}
              className={`nm-admin-subtab${subTab === st.key ? ' active' : ''}`}
              onClick={() => setSubTab(st.key)}
            >
              {st.label}
            </button>
          ))}
        </nav>

        {subTab === 'seo' && (
        <div className="nm-admin-card">
          <h3>{t.seo}</h3>
          <InputField
            label={t.seoTitle}
            value={content.seo.title}
            onChange={(value) => setContent((prev) => ({ ...prev, seo: { ...prev.seo, title: value } }))}
          />
          <TextareaField
            label={t.seoDescription}
            value={content.seo.description}
            onChange={(value) => setContent((prev) => ({ ...prev, seo: { ...prev.seo, description: value } }))}
          />
        </div>
        )}

        {subTab === 'hero' && (
        <div className="nm-admin-card">
          <h3>{t.heroBlock}</h3>
          <InputField label={t.heroHeading} value={content.heroTitle} onChange={(value) => setContent((prev) => ({ ...prev, heroTitle: value }))} />
          <label className="nm-admin-field">
            <span>{t.heroTitleFontSize}: {content.heroTitleFontSize ?? 32}px</span>
            <input type="range" min={18} max={72} value={content.heroTitleFontSize ?? 32} onChange={(e) => setContent((prev) => ({ ...prev, heroTitleFontSize: Number(e.target.value) }))} />
          </label>
          <TextareaField label={t.heroText} value={content.heroText} onChange={(value) => setContent((prev) => ({ ...prev, heroText: value }))} />
          <label className="nm-admin-field">
            <span>{t.heroTextFontSize}: {content.heroTextFontSize ?? 16}px</span>
            <input type="range" min={12} max={36} value={content.heroTextFontSize ?? 16} onChange={(e) => setContent((prev) => ({ ...prev, heroTextFontSize: Number(e.target.value) }))} />
          </label>
          <ImageInputField
            label={t.heroImage}
            value={content.heroImage}
            onChange={(value) => setContent((prev) => ({ ...prev, heroImage: value }))}
            onFileSelect={(file) => handleImageUploadGeneric(file, (url) => setContent((prev) => ({ ...prev, heroImage: url })))}
            isLoading={uploadingImage !== null}
            linkLabel={t.linkMode}
            uploadLabel={t.uploadMode}
            currentLabel={t.currentImage}
            uploadingLabel={t.uploading}
          />
          <InputField label={t.buttonText} value={content.primaryAction} onChange={(value) => setContent((prev) => ({ ...prev, primaryAction: value }))} />
          <label className="nm-admin-field">
            <span>{t.buttonPage}</span>
            <select value={content.primaryActionHref ?? '/register'} onChange={(e) => setContent((prev) => ({ ...prev, primaryActionHref: e.target.value }))}>
              <option value="/register">{t.pageRegister}</option>
              <option value="/login">{t.pageLogin}</option>
              <option value="/products">{t.pageProducts}</option>
              <option value="/services">{t.pageServices}</option>
              <option value="/partners">{t.pagePartners}</option>
              <option value="/profile">{t.pageProfile}</option>
              <option value="/messages">{t.pageMessages}</option>
              <option value="/users">{t.pageUsers}</option>
              <option value="/admin">{t.pageAdmin}</option>
            </select>
          </label>
          <button type="button" className="nm-btn nm-btn-secondary" style={{ marginTop: '0.5rem', alignSelf: 'flex-start' }} onClick={() => setContent((prev) => ({ ...prev, heroTitleFontSize: undefined, heroTextFontSize: undefined }))}>
            {t.resetHeroSizes}
          </button>
        </div>
        )}

        {subTab === 'features' && (
        <div className="nm-admin-card">
          <h3>{t.featuresSection}</h3>
          <InputField label={t.sectionHeading} value={content.featureTitle} onChange={(value) => setContent((prev) => ({ ...prev, featureTitle: value }))} />
          {content.featureItems.map((item, index) => (
            <div key={`feature-${index}`} className="nm-admin-group">
              <h4>{t.card} {index + 1}</h4>
              <InputField label={t.headingLabel} value={item.title} onChange={(value) => updateFeature(index, 'title', value)} />
              <TextareaField label={t.descriptionLabel} value={item.text} onChange={(value) => updateFeature(index, 'text', value)} />
              <ImageInputField
                label={t.iconLabel}
                value={item.icon}
                onChange={(value) => updateFeature(index, 'icon', value)}
                onFileSelect={(file) => handleImageUploadGeneric(file, (url) => updateFeature(index, 'icon', url))}
                isLoading={uploadingImage !== null}
                linkLabel={t.linkMode}
                uploadLabel={t.uploadMode}
                currentLabel={t.currentImage}
                uploadingLabel={t.uploading}
              />
              <label className="nm-admin-field">
                <span>{t.headerFontSize}: {item.headerFontSize ?? 18}px</span>
                <input type="range" min={14} max={48} value={item.headerFontSize ?? 18} onChange={(e) => updateFeature(index, 'headerFontSize', Number(e.target.value))} />
              </label>
              <label className="nm-admin-field">
                <span>{t.descFontSize}: {item.descFontSize ?? 14}px</span>
                <input type="range" min={12} max={24} value={item.descFontSize ?? 14} onChange={(e) => updateFeature(index, 'descFontSize', Number(e.target.value))} />
              </label>
              <label className="nm-admin-field">
                <span>{t.extraContentLabel}</span>
                <textarea rows={4} value={item.extraContent ?? ''} onChange={(e) => updateFeature(index, 'extraContent', e.target.value)} placeholder={t.extraContentHint} />
              </label>
              {(item.extraContent ?? '').trim() && (
                <label className="nm-admin-field" style={{ flexDirection: 'row', alignItems: 'center', gap: '0.75rem' }}>
                  <span>{t.openNewPage}</span>
                  <input type="checkbox" checked={item.isNewPage ?? false} onChange={(e) => updateFeature(index, 'isNewPage', e.target.checked)} />
                </label>
              )}
              <button type="button" className="nm-btn nm-btn-secondary" style={{ marginTop: '0.25rem', alignSelf: 'flex-start' }} onClick={() => { updateFeature(index, 'headerFontSize', undefined as unknown as number); updateFeature(index, 'descFontSize', undefined as unknown as number); }}>
                {t.resetSizes}
              </button>
            </div>
          ))}
        </div>
        )}

        {subTab === 'process' && (
        <div className="nm-admin-card">
          <h3>{t.processSection}</h3>
          <InputField label={t.sectionHeading} value={content.processTitle} onChange={(value) => setContent((prev) => ({ ...prev, processTitle: value }))} />
          {content.processItems.map((item, index) => (
            <div key={`process-${index}`} className="nm-admin-group">
              <h4>{t.step} {index + 1}</h4>
              <InputField label={t.headingLabel} value={item.title} onChange={(value) => updateProcess(index, 'title', value)} />
              <TextareaField label={t.descriptionLabel} value={item.text} onChange={(value) => updateProcess(index, 'text', value)} />
              <ImageInputField
                label={t.iconLabel}
                value={item.icon}
                onChange={(value) => updateProcess(index, 'icon', value)}
                onFileSelect={(file) => handleImageUploadGeneric(file, (url) => updateProcess(index, 'icon', url))}
                isLoading={uploadingImage !== null}
                linkLabel={t.linkMode}
                uploadLabel={t.uploadMode}
                currentLabel={t.currentImage}
                uploadingLabel={t.uploading}
              />
              <label className="nm-admin-field">
                <span>{t.headerFontSize}: {item.headerFontSize ?? 18}px</span>
                <input type="range" min={14} max={48} value={item.headerFontSize ?? 18} onChange={(e) => updateProcess(index, 'headerFontSize', Number(e.target.value))} />
              </label>
              <label className="nm-admin-field">
                <span>{t.descFontSize}: {item.descFontSize ?? 14}px</span>
                <input type="range" min={12} max={24} value={item.descFontSize ?? 14} onChange={(e) => updateProcess(index, 'descFontSize', Number(e.target.value))} />
              </label>
              <label className="nm-admin-field">
                <span>{t.extraContentLabel}</span>
                <textarea rows={4} value={item.extraContent ?? ''} onChange={(e) => updateProcess(index, 'extraContent', e.target.value)} placeholder={t.extraContentHint} />
              </label>
              {(item.extraContent ?? '').trim() && (
                <label className="nm-admin-field" style={{ flexDirection: 'row', alignItems: 'center', gap: '0.75rem' }}>
                  <span>{t.openNewPage}</span>
                  <input type="checkbox" checked={item.isNewPage ?? false} onChange={(e) => updateProcess(index, 'isNewPage', e.target.checked)} />
                </label>
              )}
              <button type="button" className="nm-btn nm-btn-secondary" style={{ marginTop: '0.25rem', alignSelf: 'flex-start' }} onClick={() => { updateProcess(index, 'headerFontSize', undefined as unknown as number); updateProcess(index, 'descFontSize', undefined as unknown as number); }}>
                {t.resetSizes}
              </button>
            </div>
          ))}
        </div>
        )}

        {subTab === 'story' && (
        <div className="nm-admin-card">
          <h3>{t.storyBlocks}</h3>
          <InputField label={t.storyLeftTitle} value={content.storyLeft.title} onChange={(value) => setContent((prev) => ({ ...prev, storyLeft: { ...prev.storyLeft, title: value } }))} />
          <TextareaField label={t.storyLeftText} value={content.storyLeft.text} onChange={(value) => setContent((prev) => ({ ...prev, storyLeft: { ...prev.storyLeft, text: value } }))} />
          <ImageInputField
            label={t.storyLeftImage}
            value={content.storyLeft.image}
            onChange={(value) => setContent((prev) => ({ ...prev, storyLeft: { ...prev.storyLeft, image: value } }))}
            onFileSelect={(file) => handleImageUploadGeneric(file, (url) => setContent((prev) => ({ ...prev, storyLeft: { ...prev.storyLeft, image: url } })))}
            isLoading={uploadingImage !== null}
            linkLabel={t.linkMode}
            uploadLabel={t.uploadMode}
            currentLabel={t.currentImage}
            uploadingLabel={t.uploading}
          />
          <InputField label={t.storyRightTitle} value={content.storyRight.title} onChange={(value) => setContent((prev) => ({ ...prev, storyRight: { ...prev.storyRight, title: value } }))} />
          <TextareaField label={t.storyRightText} value={content.storyRight.text} onChange={(value) => setContent((prev) => ({ ...prev, storyRight: { ...prev.storyRight, text: value } }))} />
          <ImageInputField
            label={t.storyRightImage}
            value={content.storyRight.image}
            onChange={(value) => setContent((prev) => ({ ...prev, storyRight: { ...prev.storyRight, image: value } }))}
            onFileSelect={(file) => handleImageUploadGeneric(file, (url) => setContent((prev) => ({ ...prev, storyRight: { ...prev.storyRight, image: url } })))}
            isLoading={uploadingImage !== null}
            linkLabel={t.linkMode}
            uploadLabel={t.uploadMode}
            currentLabel={t.currentImage}
            uploadingLabel={t.uploading}
          />
        </div>
        )}

        {subTab === 'team' && (
        <div className="nm-admin-card">
          <h3>{t.teamBlock}</h3>
          <InputField label={t.teamTitle} value={content.teamSection.title} onChange={(value) => setContent((prev) => ({ ...prev, teamSection: { ...prev.teamSection, title: value } }))} />
          <TextareaField label={t.teamText} value={content.teamSection.text} onChange={(value) => setContent((prev) => ({ ...prev, teamSection: { ...prev.teamSection, text: value } }))} />
          <ImageInputField
            label={t.teamImage}
            value={content.teamSection.image}
            onChange={(value) => setContent((prev) => ({ ...prev, teamSection: { ...prev.teamSection, image: value } }))}
            onFileSelect={(file) => handleImageUploadGeneric(file, (url) => setContent((prev) => ({ ...prev, teamSection: { ...prev.teamSection, image: url } })))}
            isLoading={uploadingImage !== null}
            linkLabel={t.linkMode}
            uploadLabel={t.uploadMode}
            currentLabel={t.currentImage}
            uploadingLabel={t.uploading}
          />
        </div>
        )}

        <div className="nm-admin-actions">
          <button type="button" className="nm-btn nm-btn-primary" onClick={save} disabled={isSaving}>
            {isSaving ? t.savingBtn : t.saveBtn}
          </button>
          <button type="button" className="nm-btn nm-btn-secondary" onClick={autoTranslate} disabled={isSaving}>
            {isSaving ? t.translating : t.translateBtn}
          </button>
          <button type="button" className="nm-btn nm-btn-secondary" onClick={reset} disabled={isSaving}>
            {t.resetBtn}
          </button>
          <Link href={`/${locale}`} className="nm-btn nm-btn-secondary">
            {t.openMain}
          </Link>
        </div>

        {status ? <p className="nm-admin-status">{status}</p> : null}
      </section>
    </div>
  );
}
