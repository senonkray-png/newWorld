import { getSupabaseServiceClient } from '@/lib/supabase-service';
import { createNotification } from '@/lib/notification-store';

export type ProductItem = {
  id: string;
  sellerId: string;
  title: string;
  description: string;
  price: number;
  imageUrl: string;
  createdAt: string;
  sellerName: string;
  isRemovedByAdmin: boolean;
  removedReason: string;
  removedAt: string | null;
  removedBy: string | null;
};

type RawProduct = {
  id: string;
  seller_id: string;
  title: string;
  description: string;
  price: number | string;
  image_url: string | null;
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

function parsePrice(value: unknown): number {
  if (typeof value === 'number') {
    return Number.isFinite(value) ? value : 0;
  }

  const parsed = Number(value);
  return Number.isFinite(parsed) ? parsed : 0;
}

function mapProduct(
  row: RawProduct,
  sellerName = 'Пользователь',
): ProductItem {
  return {
    id: row.id,
    sellerId: row.seller_id,
    title: cleanText(row.title),
    description: cleanText(row.description),
    price: parsePrice(row.price),
    imageUrl: cleanText(row.image_url),
    createdAt: row.created_at,
    sellerName,
    isRemovedByAdmin: Boolean(row.is_removed_by_admin),
    removedReason: cleanText(row.removed_reason),
    removedAt: row.removed_at,
    removedBy: row.removed_by,
  };
}

export async function getProducts(sellerId?: string): Promise<ProductItem[]> {
  const supabase = getSupabaseServiceClient() as any;
  let request = supabase
    .from('products')
    .select('*')
    .order('created_at', { ascending: false })
    .limit(100);

  if (sellerId) {
    request = request.eq('seller_id', sellerId);
  } else {
    request = request.eq('is_removed_by_admin', false);
  }

  const { data, error } = await request;

  if (error) {
    throw error;
  }

  const rows = (data ?? []) as RawProduct[];

  const sellerIds = Array.from(new Set(rows.map((item) => item.seller_id)));
  const sellerMap = new Map<string, string>();

  if (sellerIds.length > 0) {
    const { data: sellers } = await supabase
      .from('app_users')
      .select('id, full_name, company_name, email')
      .in('id', sellerIds);

    (sellers ?? []).forEach((seller: any) => {
      const name = cleanText(seller.full_name) || cleanText(seller.company_name) || cleanText(seller.email) || 'Пользователь';
      sellerMap.set(seller.id, name);
    });
  }

  return rows.map((row) => mapProduct(row, sellerMap.get(row.seller_id) ?? 'Пользователь'));
}

export async function getProductsForViewer(viewerId: string): Promise<ProductItem[]> {
  const supabase = getSupabaseServiceClient() as any;
  const { data, error } = await supabase
    .from('products')
    .select('*')
    .or(`seller_id.eq.${viewerId},is_removed_by_admin.eq.false`)
    .order('created_at', { ascending: false })
    .limit(150);

  if (error) {
    throw error;
  }

  const rows = (data ?? []) as RawProduct[];
  const sellerIds = Array.from(new Set(rows.map((item) => item.seller_id)));
  const sellerMap = new Map<string, string>();

  if (sellerIds.length > 0) {
    const { data: sellers } = await supabase
      .from('app_users')
      .select('id, full_name, company_name, email')
      .in('id', sellerIds);

    (sellers ?? []).forEach((seller: any) => {
      const name = cleanText(seller.full_name) || cleanText(seller.company_name) || cleanText(seller.email) || 'Пользователь';
      sellerMap.set(seller.id, name);
    });
  }

  return rows.map((row) => mapProduct(row, sellerMap.get(row.seller_id) ?? 'Пользователь'));
}

export async function createProduct(
  userId: string,
  value: unknown,
): Promise<ProductItem> {
  const input = (value as Record<string, unknown>) ?? {};

  const title = cleanText(input.title);
  const description = cleanText(input.description);
  const imageUrl = cleanText(input.imageUrl);
  const price = parsePrice(input.price);

  if (!title || !description || price < 0) {
    throw new Error('title, description and non-negative price are required');
  }

  const supabase = getSupabaseServiceClient() as any;

  const { data: profile, error: profileError } = await supabase
    .from('app_users')
    .select('id, role, full_name, company_name, email')
    .eq('id', userId)
    .maybeSingle();

  if (profileError) {
    throw profileError;
  }

  if (!profile || profile.role !== 'Продавец') {
    throw new Error('seller role required');
  }

  const { data, error } = await supabase
    .from('products')
    .insert({
      seller_id: userId,
      title,
      description,
      price,
      image_url: imageUrl || null,
    })
    .select('*')
    .single();

  if (error) {
    throw error;
  }

  const row = data as RawProduct;

  return mapProduct(
    row,
    cleanText(profile.full_name) || cleanText(profile.company_name) || cleanText(profile.email) || 'Пользователь',
  );
}

export async function updateProduct(
  userId: string,
  productId: string,
  value: unknown,
): Promise<ProductItem> {
  const input = (value as Record<string, unknown>) ?? {};

  const title = cleanText(input.title);
  const description = cleanText(input.description);
  const imageUrl = cleanText(input.imageUrl);
  const price = parsePrice(input.price);

  if (!title || !description || price < 0) {
    throw new Error('title, description and non-negative price are required');
  }

  const supabase = getSupabaseServiceClient() as any;

  const { data: existing, error: existingError } = await supabase
    .from('products')
    .select('*')
    .eq('id', productId)
    .maybeSingle();

  if (existingError) {
    throw existingError;
  }

  if (!existing) {
    throw new Error('product not found');
  }

  if (existing.seller_id !== userId) {
    throw new Error('forbidden');
  }

  if (existing.is_removed_by_admin) {
    throw new Error('item removed by admin');
  }

  const { data, error } = await supabase
    .from('products')
    .update({
      title,
      description,
      price,
      image_url: imageUrl || null,
    })
    .eq('id', productId)
    .select('*')
    .single();

  if (error) {
    throw error;
  }

  const { data: profile } = await supabase
    .from('app_users')
    .select('full_name, company_name, email')
    .eq('id', userId)
    .maybeSingle();

  const sellerName = cleanText(profile?.full_name) || cleanText(profile?.company_name) || cleanText(profile?.email) || 'Пользователь';

  return mapProduct(data as RawProduct, sellerName);
}

export async function deleteProduct(userId: string, productId: string): Promise<void> {
  const supabase = getSupabaseServiceClient() as any;

  const { data: existing, error: existingError } = await supabase
    .from('products')
    .select('id, seller_id')
    .eq('id', productId)
    .maybeSingle();

  if (existingError) {
    throw existingError;
  }

  if (!existing) {
    throw new Error('product not found');
  }

  if (existing.seller_id !== userId) {
    throw new Error('forbidden');
  }

  const { error } = await supabase
    .from('products')
    .delete()
    .eq('id', productId);

  if (error) {
    throw error;
  }
}

type ProductModerationAction = 'warn' | 'remove' | 'restore';

export async function moderateProduct(
  adminId: string,
  productId: string,
  action: ProductModerationAction,
  reason: string,
): Promise<void> {
  const supabase = getSupabaseServiceClient() as any;
  const cleanReason = cleanText(reason);

  if ((action === 'warn' || action === 'remove') && !cleanReason) {
    throw new Error('reason required');
  }

  const { data: existing, error: existingError } = await supabase
    .from('products')
    .select('id, seller_id, title, is_removed_by_admin')
    .eq('id', productId)
    .maybeSingle();

  if (existingError) {
    throw existingError;
  }

  if (!existing) {
    throw new Error('product not found');
  }

  if (action === 'warn') {
    await createNotification({
      userId: existing.seller_id,
      type: 'product_warning',
      title: 'Предупреждение по товару',
      body: `Товар "${cleanText(existing.title, 'Без названия')}" получил предупреждение: ${cleanReason}`,
      entityType: 'product',
      entityId: existing.id,
    });
    return;
  }

  if (action === 'remove') {
    const { error } = await supabase
      .from('products')
      .update({
        is_removed_by_admin: true,
        removed_reason: cleanReason,
        removed_by: adminId,
        removed_at: new Date().toISOString(),
      })
      .eq('id', productId);

    if (error) {
      throw error;
    }

    await createNotification({
      userId: existing.seller_id,
      type: 'product_removed',
      title: 'Товар скрыт модератором',
      body: `Товар "${cleanText(existing.title, 'Без названия')}" скрыт: ${cleanReason}`,
      entityType: 'product',
      entityId: existing.id,
    });
    return;
  }

  const { error } = await supabase
    .from('products')
    .update({
      is_removed_by_admin: false,
      removed_reason: null,
      removed_by: null,
      removed_at: null,
    })
    .eq('id', productId);

  if (error) {
    throw error;
  }

  await createNotification({
    userId: existing.seller_id,
    type: 'product_restored',
    title: 'Товар восстановлен',
    body: `Товар "${cleanText(existing.title, 'Без названия')}" снова доступен в каталоге.`,
    entityType: 'product',
    entityId: existing.id,
  });
}
