export const locales = ['ru', 'uk', 'en'] as const;

export type Locale = (typeof locales)[number];

export const defaultLocale: Locale = 'ru';

export const localeLabels: Record<Locale, string> = {
  ru: 'RU',
  uk: 'UKR',
  en: 'ENG',
};

export function isLocale(value: string): value is Locale {
  return locales.includes(value as Locale);
}
