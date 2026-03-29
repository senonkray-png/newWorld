'use client';

import Image from 'next/image';
import Link from 'next/link';
import { useState } from 'react';

import { type HomeContent, type HomeFeature } from '@/i18n/home-content';
import type { Locale } from '@/i18n/config';

type HomePageViewProps = {
  locale: Locale;
  content: HomeContent;
};

function InfoCard({
  item,
  index,
  locale,
  section,
}: {
  item: HomeFeature;
  index: number;
  locale: Locale;
  section: 'feature' | 'process';
}) {
  const [modalOpen, setModalOpen] = useState(false);
  const hasExtra = !!(item.extraContent ?? '').trim();
  const isClickable = hasExtra;

  const headerStyle = item.headerFontSize ? { fontSize: `${item.headerFontSize}px` } : undefined;
  const descStyle = item.descFontSize ? { fontSize: `${item.descFontSize}px` } : undefined;

  const card = (
    <article
      className={`${section === 'feature' ? 'nm-panel' : 'nm-process-card'} nm-reveal${isClickable ? ' nm-card-interactive' : ''}`}
      style={{ animationDelay: `${index * (section === 'feature' ? 90 : 80)}ms`, cursor: isClickable ? 'pointer' : undefined }}
      onClick={isClickable && !item.isNewPage ? () => setModalOpen(true) : undefined}
    >
      <Image src={item.icon} alt="" width={section === 'feature' ? 42 : 38} height={section === 'feature' ? 42 : 38} />
      <h3 style={headerStyle}>{item.title}</h3>
      <p style={descStyle}>{item.text}</p>
    </article>
  );

  if (isClickable && item.isNewPage) {
    return (
      <>
        <Link href={`/${locale}/info/${section}-${index}`} style={{ textDecoration: 'none', color: 'inherit' }}>
          {card}
        </Link>
      </>
    );
  }

  return (
    <>
      {card}
      {modalOpen && hasExtra && (
        <div
          className="nm-modal-overlay"
          onClick={() => setModalOpen(false)}
        >
          <div
            className="nm-modal-content"
            onClick={(e) => e.stopPropagation()}
          >
            <button
              type="button"
              className="nm-modal-close"
              onClick={() => setModalOpen(false)}
              aria-label="Close"
            >✕</button>
            <h2 style={headerStyle}>{item.title}</h2>
            <div dangerouslySetInnerHTML={{ __html: item.extraContent! }} />
          </div>
        </div>
      )}
    </>
  );
}

export function HomePageView({ locale, content }: HomePageViewProps) {
  return (
    <main className="nm-page">
      <section
        className="nm-hero nm-reveal"
        style={{ backgroundImage: `linear-gradient(90deg, rgba(17, 26, 30, 0.82), rgba(17, 26, 30, 0.48)), url(${content.heroImage})` }}
      >
        <div className="nm-hero-body">
          <h1>{content.heroTitle}</h1>
          <p>{content.heroText}</p>
          <div className="nm-actions">
            <Link href={`/${locale}/register`} className="nm-btn nm-btn-primary">
              {content.primaryAction}
            </Link>
          </div>
        </div>
      </section>

      <section id="features" className="nm-card-grid">
        <h2 className="nm-section-title nm-reveal">{content.featureTitle}</h2>
        <div className="nm-grid nm-grid-4">
          {content.featureItems.map((item, index) => (
            <InfoCard key={`${item.title}-${index}`} item={item} index={index} locale={locale} section="feature" />
          ))}
        </div>
      </section>

      <section className="nm-process">
        <h2 className="nm-section-title nm-reveal">{content.processTitle}</h2>
        <div className="nm-grid nm-grid-3">
          {content.processItems.map((item, index) => (
            <InfoCard key={`${item.title}-${index}`} item={item} index={index} locale={locale} section="process" />
          ))}
        </div>
      </section>

      <section className="nm-story-wrap">
        <article className="nm-story nm-reveal">
          <Image src={content.storyLeft.image} alt="" width={640} height={780} className="nm-story-image" />
          <div className="nm-story-body">
            <h3>{content.storyLeft.title}</h3>
            <p>{content.storyLeft.text}</p>
          </div>
        </article>
        <article className="nm-story nm-reveal">
          <Image src={content.storyRight.image} alt="" width={640} height={780} className="nm-story-image" />
          <div className="nm-story-body">
            <h3>{content.storyRight.title}</h3>
            <p>{content.storyRight.text}</p>
          </div>
        </article>
      </section>

      <section className="nm-team nm-reveal">
        <Image src={content.teamSection.image} alt="" width={1280} height={780} className="nm-team-image" />
        <div className="nm-team-content">
          <h3>{content.teamSection.title}</h3>
          <p>{content.teamSection.text}</p>
          <Link href={`/${locale}/register`} className="nm-btn nm-btn-primary">
            {locale === 'en' ? 'Create account profile' : locale === 'uk' ? 'Створити профіль акаунта' : 'Создать профиль аккаунта'}
          </Link>
        </div>
      </section>
    </main>
  );
}
