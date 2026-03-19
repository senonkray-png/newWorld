import en from '@/i18n/messages/en';
import ru from '@/i18n/messages/ru';
import uk from '@/i18n/messages/uk';
import type { Locale } from '@/i18n/config';

const messages = {
  ru,
  uk,
  en,
} as const;

export function getMessages(locale: Locale) {
  return messages[locale];
}
