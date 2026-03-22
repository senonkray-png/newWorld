import { getSupabaseServiceClient } from '@/lib/supabase-service';

export const userRoleRuValues = ['Потребитель', 'Поставщик'] as const;
export type UserRoleRu = (typeof userRoleRuValues)[number];

const legacyConsumerRoles = ['Потребитель', 'Пользователь'] as const;
const legacyProviderRoles = ['Поставщик', 'Продавец', 'Поставщик услуг'] as const;

export type AppUserProfile = {
  id: string;
  email: string;
  isEmailVerified: boolean;
  fullName: string;
  phone: string;
  gender: string;
  avatarUrl: string;
  telegram: string;
  instagram: string;
  country: string;
  region: string;
  city: string;
  role: UserRoleRu;
  businessNiche: string;
  companyName: string;
  workPhone: string;
  websiteUrl: string;
  interests: string[];
  aboutMe: string;
  createdAt: string;
  updatedAt: string;
};

export type AppUserContact = {
  id: string;
  fullName: string;
  email: string;
  role: UserRoleRu;
  city: string;
  avatarUrl: string;
};

export type AppUserDirectoryEntry = {
  id: string;
  email: string;
  isEmailVerified: boolean;
  fullName: string;
  avatarUrl: string;
  country: string;
  region: string;
  city: string;
  role: UserRoleRu;
  businessNiche: string;
  companyName: string;
  websiteUrl: string;
  interests: string[];
  aboutMe: string;
  phone: string;
  workPhone: string;
  telegram: string;
  instagram: string;
};

type RawAppUser = {
  id: string;
  email: string | null;
  is_email_verified: boolean | null;
  full_name: string | null;
  phone: string | null;
  gender: string | null;
  avatar_url: string | null;
  telegram: string | null;
  instagram: string | null;
  country: string | null;
  region: string | null;
  city: string | null;
  role: string | null;
  business_niche: string | null;
  company_name: string | null;
  work_phone: string | null;
  website_url: string | null;
  interests: string[] | null;
  about_me: string | null;
  created_at: string | null;
  updated_at: string | null;
};

function cleanText(value: unknown, fallback = '') {
  if (typeof value !== 'string') {
    return fallback;
  }
  return value.trim();
}

function cleanInterests(value: unknown): string[] {
  const source = Array.isArray(value)
    ? value
    : typeof value === 'string'
      ? value.split(',')
      : [];

  return Array.from(
    new Set(
      source
        .map((item) => cleanText(item))
        .filter((item) => item.length > 0)
        .slice(0, 30),
    ),
  );
}

function normalizeRole(value: unknown): UserRoleRu {
  if (legacyProviderRoles.includes(value as (typeof legacyProviderRoles)[number])) {
    return 'Поставщик';
  }

  if (legacyConsumerRoles.includes(value as (typeof legacyConsumerRoles)[number])) {
    return 'Потребитель';
  }

  return 'Потребитель';
}

function mapProfile(row: RawAppUser): AppUserProfile {
  return {
    id: row.id,
    email: cleanText(row.email),
    isEmailVerified: Boolean(row.is_email_verified),
    fullName: cleanText(row.full_name),
    phone: cleanText(row.phone),
    gender: cleanText(row.gender),
    avatarUrl: cleanText(row.avatar_url),
    telegram: cleanText(row.telegram),
    instagram: cleanText(row.instagram),
    country: cleanText(row.country),
    region: cleanText(row.region),
    city: cleanText(row.city),
    role: normalizeRole(row.role),
    businessNiche: cleanText(row.business_niche),
    companyName: cleanText(row.company_name),
    workPhone: cleanText(row.work_phone),
    websiteUrl: cleanText(row.website_url),
    interests: cleanInterests(row.interests),
    aboutMe: cleanText(row.about_me),
    createdAt: row.created_at ?? new Date(0).toISOString(),
    updatedAt: row.updated_at ?? new Date(0).toISOString(),
  };
}

function mapDirectoryEntry(row: RawAppUser): AppUserDirectoryEntry {
  const profile = mapProfile(row);
  return {
    id: profile.id,
    email: profile.email,
    isEmailVerified: profile.isEmailVerified,
    fullName: profile.fullName || profile.companyName || profile.email || 'Пользователь',
    avatarUrl: profile.avatarUrl,
    country: profile.country,
    region: profile.region,
    city: profile.city,
    role: profile.role,
    businessNiche: profile.businessNiche,
    companyName: profile.companyName,
    websiteUrl: profile.websiteUrl,
    interests: profile.interests,
    aboutMe: profile.aboutMe,
    phone: profile.phone,
    workPhone: profile.workPhone,
    telegram: profile.telegram,
    instagram: profile.instagram,
  };
}

export async function syncAppUserIdentity(
  userId: string,
  email: string | null,
  isEmailVerified: boolean,
): Promise<AppUserProfile> {
  const supabase = getSupabaseServiceClient() as any;
  const { data, error } = await supabase
    .from('app_users')
    .upsert(
      {
        id: userId,
        email: cleanText(email),
        is_email_verified: isEmailVerified,
        updated_at: new Date().toISOString(),
      },
      { onConflict: 'id' },
    )
    .select('*')
    .single();

  if (error) {
    throw error;
  }

  return mapProfile(data);
}

export async function getOrCreateAppUserProfile(
  userId: string,
  email: string | null,
  isEmailVerified = false,
): Promise<AppUserProfile> {
  const supabase = getSupabaseServiceClient() as any;
  const { data, error } = await supabase
    .from('app_users')
    .select('*')
    .eq('id', userId)
    .maybeSingle();

  if (error) {
    throw error;
  }

  if (data) {
    if (cleanText(data.email) !== cleanText(email) || Boolean(data.is_email_verified) !== isEmailVerified) {
      return syncAppUserIdentity(userId, email, isEmailVerified);
    }

    return mapProfile(data);
  }

  const { data: inserted, error: insertError } = await supabase
    .from('app_users')
    .upsert(
      {
        id: userId,
        email: cleanText(email),
        is_email_verified: isEmailVerified,
        updated_at: new Date().toISOString(),
      },
      { onConflict: 'id' },
    )
    .select('*')
    .single();

  if (insertError) {
    throw insertError;
  }

  return mapProfile(inserted);
}

export async function updateAppUserProfile(
  userId: string,
  email: string | null,
  isEmailVerified: boolean,
  value: unknown,
): Promise<AppUserProfile> {
  const input = (value as Record<string, unknown>) ?? {};

  const payload = {
    id: userId,
    email: cleanText(email),
    is_email_verified: isEmailVerified,
    full_name: cleanText(input.fullName),
    phone: cleanText(input.phone),
    gender: cleanText(input.gender),
    avatar_url: cleanText(input.avatarUrl),
    telegram: cleanText(input.telegram),
    instagram: cleanText(input.instagram),
    country: cleanText(input.country),
    region: cleanText(input.region),
    city: cleanText(input.city),
    role: normalizeRole(input.role),
    business_niche: cleanText(input.businessNiche),
    company_name: cleanText(input.companyName),
    work_phone: cleanText(input.workPhone),
    website_url: cleanText(input.websiteUrl),
    interests: cleanInterests(input.interests),
    about_me: cleanText(input.aboutMe),
    updated_at: new Date().toISOString(),
  };

  const supabase = getSupabaseServiceClient() as any;
  const { data, error } = await supabase
    .from('app_users')
    .upsert(payload, { onConflict: 'id' })
    .select('*')
    .single();

  if (error) {
    throw error;
  }

  return mapProfile(data);
}

export async function listAppUserContacts(query: string, excludeUserId: string): Promise<AppUserContact[]> {
  const supabase = getSupabaseServiceClient() as any;
  const cleanQuery = cleanText(query);

  let request = supabase
    .from('app_users')
    .select('id, full_name, email, role, city, avatar_url')
    .neq('id', excludeUserId)
    .order('updated_at', { ascending: false })
    .limit(30);

  if (cleanQuery) {
    request = request.or(`full_name.ilike.%${cleanQuery}%,email.ilike.%${cleanQuery}%,city.ilike.%${cleanQuery}%`);
  }

  const { data, error } = await request;
  if (error) {
    throw error;
  }

  return (data ?? []).map((row: any) => ({
    id: row.id,
    fullName: cleanText(row.full_name, cleanText(row.email, 'Пользователь')),
    email: cleanText(row.email),
    role: normalizeRole(row.role),
    city: cleanText(row.city),
    avatarUrl: cleanText(row.avatar_url),
  }));
}

export async function searchAppUsers(
  query: string,
  interest: string,
  role: string,
  excludeUserId?: string,
): Promise<AppUserDirectoryEntry[]> {
  const supabase = getSupabaseServiceClient() as any;
  const cleanQuery = cleanText(query);
  const cleanInterest = cleanText(interest).toLowerCase();
  const cleanRole = cleanText(role);

  let request = supabase
    .from('app_users')
    .select('*')
    .order('updated_at', { ascending: false })
    .limit(50);

  if (excludeUserId) {
    request = request.neq('id', excludeUserId);
  }

  if (cleanQuery) {
    request = request.or(
      `full_name.ilike.%${cleanQuery}%,email.ilike.%${cleanQuery}%,city.ilike.%${cleanQuery}%,country.ilike.%${cleanQuery}%,company_name.ilike.%${cleanQuery}%,business_niche.ilike.%${cleanQuery}%`,
    );
  }

  if (cleanInterest) {
    request = request.contains('interests', [cleanInterest]);
  }

  if (cleanRole) {
    const normalizedRole = normalizeRole(cleanRole);

    if (normalizedRole === 'Поставщик') {
      request = request.in('role', [...legacyProviderRoles]);
    } else if (normalizedRole === 'Потребитель') {
      request = request.in('role', [...legacyConsumerRoles]);
    }
  }

  const { data, error } = await request;
  if (error) {
    throw error;
  }

  return ((data ?? []) as RawAppUser[]).map(mapDirectoryEntry);
}

export async function getAppUserById(id: string): Promise<AppUserDirectoryEntry | null> {
  const userId = cleanText(id);
  if (!userId) {
    return null;
  }

  const supabase = getSupabaseServiceClient() as any;
  const { data, error } = await supabase
    .from('app_users')
    .select('*')
    .eq('id', userId)
    .maybeSingle();

  if (error) {
    throw error;
  }

  if (!data) {
    return null;
  }

  return mapDirectoryEntry(data as RawAppUser);
}
