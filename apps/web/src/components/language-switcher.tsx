'use client';

import Link from 'next/link';
import { useEffect, useRef, useState } from 'react';

import { localeLabels, locales, type Locale } from '@/i18n/config';

export function LanguageSwitcher({ currentLocale }: { currentLocale: Locale }) {
  const [open, setOpen] = useState(false);
  const ref = useRef<HTMLDivElement>(null);

  useEffect(() => {
    function handler(e: MouseEvent) {
      if (ref.current && !ref.current.contains(e.target as Node)) setOpen(false);
    }
    document.addEventListener('mousedown', handler);
    return () => document.removeEventListener('mousedown', handler);
  }, []);

  return (
    <div className="nm-lang-dropdown" ref={ref}>
      <button
        type="button"
        className="nm-lang-trigger"
        onClick={() => setOpen((v) => !v)}
        aria-expanded={open}
        aria-haspopup="listbox"
        aria-label="Select language"
      >
        <svg width="15" height="15" viewBox="0 0 20 20" fill="none" aria-hidden="true">
          <circle cx="10" cy="10" r="8.5" stroke="currentColor" strokeWidth="1.5" />
          <path d="M10 1.5c-2 2.5-3.2 5.2-3.2 8.5s1.2 6 3.2 8.5M10 1.5c2 2.5 3.2 5.2 3.2 8.5S12 16 10 18.5M1.5 10h17" stroke="currentColor" strokeWidth="1.5" />
        </svg>
        {localeLabels[currentLocale]}
        <svg
          width="10"
          height="6"
          viewBox="0 0 10 6"
          fill="none"
          aria-hidden="true"
          style={{ transition: 'transform 0.18s', transform: open ? 'rotate(180deg)' : 'rotate(0deg)' }}
        >
          <path d="M1 1l4 4 4-4" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" />
        </svg>
      </button>
      {open && (
        <div className="nm-dropdown-menu" role="listbox">
          {locales.map((locale) => (
            <Link
              key={locale}
              href={`/${locale}`}
              role="option"
              aria-selected={locale === currentLocale}
              className={`nm-dropdown-item${locale === currentLocale ? ' active' : ''}`}
              onClick={() => setOpen(false)}
            >
              {localeLabels[locale]}
            </Link>
          ))}
        </div>
      )}
    </div>
  );
}
