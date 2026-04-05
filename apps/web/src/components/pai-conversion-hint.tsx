'use client';

import type { Locale } from '@/i18n/config';

/** Курс по умолчанию: 5 грн = 1 паєва одиниця */
const DEFAULT_RATE = 5;

type Direction = 'uah-to-pai' | 'pai-to-uah';

const labels: Record<Direction, Record<Locale, (v: string) => string>> = {
  'uah-to-pai': {
    en: (v) => `≈ ${v} coop. units`,
    uk: (v) => `≈ ${v} паєвих од.`,
    ru: (v) => `≈ ${v} паев`,
  },
  'pai-to-uah': {
    en: (v) => `≈ ${v} UAH`,
    uk: (v) => `≈ ${v} грн`,
    ru: (v) => `≈ ${v} грн`,
  },
};

const hintStyle: React.CSSProperties = {
  fontSize: '12px',
  color: '#666',
  marginTop: '2px',
  minHeight: '16px',
};

export function PaiConversionHint({
  value,
  direction,
  locale,
  rate = DEFAULT_RATE,
}: {
  value: string;
  direction: Direction;
  locale: Locale;
  rate?: number;
}) {
  const num = Number(String(value).replace(',', '.'));
  if (!value || !Number.isFinite(num) || num <= 0) {
    return <span style={hintStyle} />;
  }

  const converted =
    direction === 'uah-to-pai'
      ? (num / rate).toFixed(2)
      : (num * rate).toFixed(2);

  return <span style={hintStyle}>{labels[direction][locale](converted)}</span>;
}
