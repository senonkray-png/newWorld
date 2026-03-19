import { getSupabaseServiceClient } from '@/lib/supabase-service';

export type AdType = 'поиск услуги' | 'предложение услуги';

export type AdItem = {
  id: string;
  authorId: string;
  type: AdType;
  title: string;
  description: string;
  createdAt: string;
  authorName: string;
};

type RawAd = {
  id: string;
  author_id: string;
  type: AdType;
  title: string;
  description: string;
  created_at: string;
};

function cleanText(value: unknown, fallback = '') {
  if (typeof value !== 'string') {
    return fallback;
  }
  return value.trim();
}

function normalizeType(value: unknown): AdType {
  return value === 'предложение услуги' ? 'предложение услуги' : 'поиск услуги';
}

export async function getAds(): Promise<AdItem[]> {
  const supabase = getSupabaseServiceClient() as any;
  const { data, error } = await supabase
    .from('ads')
    .select('*')
    .order('created_at', { ascending: false })
    .limit(100);

  if (error) {
    throw error;
  }

  const rows = (data ?? []) as RawAd[];
  const authorIds = Array.from(new Set(rows.map((item) => item.author_id)));
  const authorMap = new Map<string, string>();

  if (authorIds.length > 0) {
    const { data: authors } = await supabase
      .from('app_users')
      .select('id, full_name, company_name, email')
      .in('id', authorIds);

    (authors ?? []).forEach((author: any) => {
      const name = cleanText(author.full_name) || cleanText(author.company_name) || cleanText(author.email) || 'Пользователь';
      authorMap.set(author.id, name);
    });
  }

  return rows.map((row) => ({
    id: row.id,
    authorId: row.author_id,
    type: normalizeType(row.type),
    title: cleanText(row.title),
    description: cleanText(row.description),
    createdAt: row.created_at,
    authorName: authorMap.get(row.author_id) ?? 'Пользователь',
  }));
}

export async function createAd(userId: string, value: unknown): Promise<AdItem> {
  const input = (value as Record<string, unknown>) ?? {};

  const type = normalizeType(input.type);
  const title = cleanText(input.title);
  const description = cleanText(input.description);

  if (!title || !description) {
    throw new Error('title and description are required');
  }

  const supabase = getSupabaseServiceClient() as any;

  const { data: author, error: authorError } = await supabase
    .from('app_users')
    .select('id, full_name, company_name, email')
    .eq('id', userId)
    .maybeSingle();

  if (authorError) {
    throw authorError;
  }

  const { data, error } = await supabase
    .from('ads')
    .insert({
      author_id: userId,
      type,
      title,
      description,
    })
    .select('*')
    .single();

  if (error) {
    throw error;
  }

  const row = data as RawAd;

  return {
    id: row.id,
    authorId: row.author_id,
    type: normalizeType(row.type),
    title: cleanText(row.title),
    description: cleanText(row.description),
    createdAt: row.created_at,
    authorName: cleanText(author?.full_name) || cleanText(author?.company_name) || cleanText(author?.email) || 'Пользователь',
  };
}
