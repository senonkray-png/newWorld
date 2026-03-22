import { getSupabaseServiceClient } from '@/lib/supabase-service';
import { createNotification } from '@/lib/notification-store';

export type AdType = 'поиск услуги' | 'предложение услуги';

export type AdItem = {
  id: string;
  authorId: string;
  type: AdType;
  title: string;
  description: string;
  price: number;
  createdAt: string;
  authorName: string;
  isRemovedByAdmin: boolean;
  removedReason: string;
  removedAt: string | null;
  removedBy: string | null;
};

type RawAd = {
  id: string;
  author_id: string;
  type: AdType;
  title: string;
  description: string;
  price: number | string | null;
  created_at: string;
  is_removed_by_admin: boolean | null;
  removed_reason: string | null;
  removed_at: string | null;
  removed_by: string | null;
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

function parsePrice(value: unknown): number {
  if (typeof value === 'number') {
    return Number.isFinite(value) ? value : 0;
  }

  const parsed = Number(value);
  return Number.isFinite(parsed) ? parsed : 0;
}

function mapAd(row: RawAd, authorName = 'Пользователь'): AdItem {
  return {
    id: row.id,
    authorId: row.author_id,
    type: normalizeType(row.type),
    title: cleanText(row.title),
    description: cleanText(row.description),
    price: parsePrice(row.price),
    createdAt: row.created_at,
    authorName,
    isRemovedByAdmin: Boolean(row.is_removed_by_admin),
    removedReason: cleanText(row.removed_reason),
    removedAt: row.removed_at,
    removedBy: row.removed_by,
  };
}

export async function getAds(): Promise<AdItem[]> {
  const supabase = getSupabaseServiceClient() as any;
  const { data, error } = await supabase
    .from('ads')
    .select('*')
    .eq('is_removed_by_admin', false)
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

  return rows.map((row) => mapAd(row, authorMap.get(row.author_id) ?? 'Пользователь'));
}

export async function getAdsForViewer(viewerId: string): Promise<AdItem[]> {
  const supabase = getSupabaseServiceClient() as any;
  const { data, error } = await supabase
    .from('ads')
    .select('*')
    .or(`author_id.eq.${viewerId},is_removed_by_admin.eq.false`)
    .order('created_at', { ascending: false })
    .limit(150);

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

  return rows.map((row) => mapAd(row, authorMap.get(row.author_id) ?? 'Пользователь'));
}

export async function createAd(userId: string, value: unknown): Promise<AdItem> {
  const input = (value as Record<string, unknown>) ?? {};

  const type = normalizeType(input.type);
  const title = cleanText(input.title);
  const description = cleanText(input.description);
  const price = parsePrice(input.price);

  if (!title || !description || price < 0) {
    throw new Error('title, description and non-negative price are required');
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
      price,
    })
    .select('*')
    .single();

  if (error) {
    throw error;
  }

  const row = data as RawAd;

  return mapAd(
    row,
    cleanText(author?.full_name) || cleanText(author?.company_name) || cleanText(author?.email) || 'Пользователь',
  );
}

export async function updateAd(
  userId: string,
  adId: string,
  value: unknown,
): Promise<AdItem> {
  const input = (value as Record<string, unknown>) ?? {};
  const type = normalizeType(input.type);
  const title = cleanText(input.title);
  const description = cleanText(input.description);
  const price = parsePrice(input.price);

  if (!title || !description || price < 0) {
    throw new Error('title, description and non-negative price are required');
  }

  const supabase = getSupabaseServiceClient() as any;
  const { data: existing, error: existingError } = await supabase
    .from('ads')
    .select('*')
    .eq('id', adId)
    .maybeSingle();

  if (existingError) {
    throw existingError;
  }

  if (!existing) {
    throw new Error('ad not found');
  }

  if (existing.author_id !== userId) {
    throw new Error('forbidden');
  }

  if (existing.is_removed_by_admin) {
    throw new Error('item removed by admin');
  }

  const { data, error } = await supabase
    .from('ads')
    .update({
      type,
      title,
      description,
      price,
    })
    .eq('id', adId)
    .select('*')
    .single();

  if (error) {
    throw error;
  }

  const { data: author } = await supabase
    .from('app_users')
    .select('full_name, company_name, email')
    .eq('id', userId)
    .maybeSingle();

  const authorName = cleanText(author?.full_name) || cleanText(author?.company_name) || cleanText(author?.email) || 'Пользователь';

  return mapAd(data as RawAd, authorName);
}

export async function deleteAd(userId: string, adId: string): Promise<void> {
  const supabase = getSupabaseServiceClient() as any;
  const { data: existing, error: existingError } = await supabase
    .from('ads')
    .select('id, author_id')
    .eq('id', adId)
    .maybeSingle();

  if (existingError) {
    throw existingError;
  }

  if (!existing) {
    throw new Error('ad not found');
  }

  if (existing.author_id !== userId) {
    throw new Error('forbidden');
  }

  const { error } = await supabase
    .from('ads')
    .delete()
    .eq('id', adId);

  if (error) {
    throw error;
  }
}

type AdModerationAction = 'warn' | 'remove' | 'restore';

export async function moderateAd(
  adminId: string,
  adId: string,
  action: AdModerationAction,
  reason: string,
): Promise<void> {
  const supabase = getSupabaseServiceClient() as any;
  const cleanReason = cleanText(reason);

  if ((action === 'warn' || action === 'remove') && !cleanReason) {
    throw new Error('reason required');
  }

  const { data: existing, error: existingError } = await supabase
    .from('ads')
    .select('id, author_id, title')
    .eq('id', adId)
    .maybeSingle();

  if (existingError) {
    throw existingError;
  }

  if (!existing) {
    throw new Error('ad not found');
  }

  if (action === 'warn') {
    await createNotification({
      userId: existing.author_id,
      type: 'ad_warning',
      title: 'Предупреждение по услуге',
      body: `Объявление "${cleanText(existing.title, 'Без названия')}" получило предупреждение: ${cleanReason}`,
      entityType: 'ad',
      entityId: existing.id,
    });
    return;
  }

  if (action === 'remove') {
    const { error } = await supabase
      .from('ads')
      .update({
        is_removed_by_admin: true,
        removed_reason: cleanReason,
        removed_by: adminId,
        removed_at: new Date().toISOString(),
      })
      .eq('id', adId);

    if (error) {
      throw error;
    }

    await createNotification({
      userId: existing.author_id,
      type: 'ad_removed',
      title: 'Объявление скрыто модератором',
      body: `Объявление "${cleanText(existing.title, 'Без названия')}" скрыто: ${cleanReason}`,
      entityType: 'ad',
      entityId: existing.id,
    });
    return;
  }

  const { error } = await supabase
    .from('ads')
    .update({
      is_removed_by_admin: false,
      removed_reason: null,
      removed_by: null,
      removed_at: null,
    })
    .eq('id', adId);

  if (error) {
    throw error;
  }

  await createNotification({
    userId: existing.author_id,
    type: 'ad_restored',
    title: 'Объявление восстановлено',
    body: `Объявление "${cleanText(existing.title, 'Без названия')}" снова доступно в каталоге.`,
    entityType: 'ad',
    entityId: existing.id,
  });
}
