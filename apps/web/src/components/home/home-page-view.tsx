'use client';

import Image from 'next/image';
import Link from 'next/link';

import { type HomeContent } from '@/i18n/home-content';
import type { Locale } from '@/i18n/config';

type HomePageViewProps = {
  locale: Locale;
  content: HomeContent;
};

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
            <article key={`${item.title}-${index}`} className="nm-panel nm-reveal" style={{ animationDelay: `${index * 90}ms` }}>
              <Image src={item.icon} alt="" width={42} height={42} />
              <h3>{item.title}</h3>
              <p>{item.text}</p>
            </article>
          ))}
        </div>
      </section>

      <section className="nm-process">
        <h2 className="nm-section-title nm-reveal">{content.processTitle}</h2>
        <div className="nm-grid nm-grid-3">
          {content.processItems.map((item, index) => (
            <article key={`${item.title}-${index}`} className="nm-process-card nm-reveal" style={{ animationDelay: `${index * 80}ms` }}>
              <Image src={item.icon} alt="" width={38} height={38} />
              <h3>{item.title}</h3>
              <p>{item.text}</p>
            </article>
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
