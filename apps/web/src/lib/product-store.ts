import { getSupabaseServiceClient } from '@/lib/supabase-service';

export type ProductItem = {
  id: string;
  sellerId: string;
  title: string;
  description: string;
  price: number;
  imageUrl: string;
  createdAt: string;
  sellerName: string;
};

type RawProduct = {
  id: string;
  seller_id: string;
  title: string;
  description: string;
  price: number | string;
  image_url: string | null;
  created_at: string;
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

export async function getProducts(sellerId?: string): Promise<ProductItem[]> {
  const supabase = getSupabaseServiceClient() as any;
  let request = supabase
    .from('products')
    .select('*')
    .order('created_at', { ascending: false })
    .limit(100);

  if (sellerId) {
    request = request.eq('seller_id', sellerId);
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

  return rows.map((row) => ({
    id: row.id,
    sellerId: row.seller_id,
    title: cleanText(row.title),
    description: cleanText(row.description),
    price: parsePrice(row.price),
    imageUrl: cleanText(row.image_url),
    createdAt: row.created_at,
    sellerName: sellerMap.get(row.seller_id) ?? 'Пользователь',
  }));
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

  return {
    id: row.id,
    sellerId: row.seller_id,
    title: cleanText(row.title),
    description: cleanText(row.description),
    price: parsePrice(row.price),
    imageUrl: cleanText(row.image_url),
    createdAt: row.created_at,
    sellerName: cleanText(profile.full_name) || cleanText(profile.company_name) || cleanText(profile.email) || 'Пользователь',
  };
}
