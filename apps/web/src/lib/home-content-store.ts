import { defaultHomeContent, type HomeContent, type HomeFeature } from '@/i18n/home-content';
import { isLocale, type Locale } from '@/i18n/config';
import { getSupabaseServiceClient } from '@/lib/supabase-service';

function getSupabase() {
  return getSupabaseServiceClient();
}

function cleanText(value: unknown, fallback: string) {
  if (typeof value !== 'string') {
    return fallback;
  }

  const trimmed = value.trim();
  return trimmed.length > 0 ? trimmed : fallback;
}

function cleanFeature(value: unknown, fallback: HomeFeature): HomeFeature {
  const input = (value as Partial<HomeFeature>) ?? {};
  return {
    title: cleanText(input.title, fallback.title),
    text: cleanText(input.text, fallback.text),
    icon: cleanText(input.icon, fallback.icon),
  };
}

function cleanButton(value: unknown, fallback: { label: string; href: string }): { label: string; href: string } {
  const input = (value as Partial<{ label: string; href: string }>) ?? {};
  return {
    label: cleanText(input.label, fallback.label),
    href: cleanText(input.href, fallback.href),
  };
}

function normalizeContent(locale: Locale, value: unknown): HomeContent {
  const fallback = defaultHomeContent[locale];
  const input = (value as Partial<HomeContent>) ?? {};

  return {
    seo: {
      title: cleanText(input.seo?.title, fallback.seo.title),
      description: cleanText(input.seo?.description, fallback.seo.description),
    },
    heroTitle: cleanText(input.heroTitle, fallback.heroTitle),
    heroText: cleanText(input.heroText, fallback.heroText),
    heroImage: cleanText(input.heroImage, fallback.heroImage),
    heroButtons: Array.isArray(input.heroButtons)
      ? input.heroButtons.map((btn) => cleanButton(btn, { label: 'Button', href: '#' }))
      : fallback.heroButtons,
    primaryAction: cleanText(input.primaryAction, fallback.primaryAction),
    secondaryAction: cleanText(input.secondaryAction, fallback.secondaryAction),
    featureTitle: cleanText(input.featureTitle, fallback.featureTitle),
    featureItems: Array.isArray(input.featureItems)
      ? input.featureItems.slice(0, fallback.featureItems.length).map((item, index) => cleanFeature(item, fallback.featureItems[index]))
      : fallback.featureItems,
    processTitle: cleanText(input.processTitle, fallback.processTitle),
    processItems: Array.isArray(input.processItems)
      ? input.processItems.slice(0, fallback.processItems.length).map((item, index) => cleanFeature(item, fallback.processItems[index]))
      : fallback.processItems,
    storyLeft: {
      title: cleanText(input.storyLeft?.title, fallback.storyLeft.title),
      text: cleanText(input.storyLeft?.text, fallback.storyLeft.text),
      image: cleanText(input.storyLeft?.image, fallback.storyLeft.image),
    },
    storyRight: {
      title: cleanText(input.storyRight?.title, fallback.storyRight.title),
      text: cleanText(input.storyRight?.text, fallback.storyRight.text),
      image: cleanText(input.storyRight?.image, fallback.storyRight.image),
    },
    teamSection: {
      title: cleanText(input.teamSection?.title, fallback.teamSection.title),
      text: cleanText(input.teamSection?.text, fallback.teamSection.text),
      image: cleanText(input.teamSection?.image, fallback.teamSection.image),
    },
  };
}

export async function getHomeContent(locale: Locale): Promise<HomeContent> {
  try {
    const supabase = getSupabase() as any;
    const { data, error } = await supabase
      .from('home_content')
      .select('content')
      .eq('locale', locale)
      .maybeSingle();

    if (error) throw error;

    if (!data) {
      const fallback = defaultHomeContent[locale];
      await supabase
        .from('home_content')
        .insert({ locale, content: fallback, updated_at: new Date().toISOString() });
      return fallback;
    }

    return normalizeContent(locale, data.content);
  } catch {
    return defaultHomeContent[locale];
  }
}

export async function updateHomeContent(locale: Locale, value: unknown): Promise<HomeContent> {
  if (!isLocale(locale)) {
    throw new Error('Unsupported locale');
  }

  const supabase = getSupabase() as any;
  const normalized = normalizeContent(locale, value);

  const { error } = await supabase
    .from('home_content')
    .upsert(
      { locale, content: normalized, updated_at: new Date().toISOString() },
      { onConflict: 'locale' },
    );

  if (error) throw error;
  return normalized;
}

export async function resetHomeContent(locale: Locale): Promise<HomeContent> {
  if (!isLocale(locale)) {
    throw new Error('Unsupported locale');
  }

  const supabase = getSupabase() as any;
  const fallback = defaultHomeContent[locale];

  const { error } = await supabase
    .from('home_content')
    .upsert(
      { locale, content: fallback, updated_at: new Date().toISOString() },
      { onConflict: 'locale' },
    );

  if (error) throw error;
  return fallback;
}

export function isSupportedLocale(value: string): value is Locale {
  return isLocale(value);
}
