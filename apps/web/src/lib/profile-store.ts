import { getSupabaseServiceClient } from '@/lib/supabase-service';

export const accountIntentValues = ['seller', 'service_provider', 'both'] as const;
export type AccountIntent = (typeof accountIntentValues)[number];

export const userRoleValues = ['member', 'seller', 'service_provider', 'organizer', 'main_admin'] as const;
export type UserRole = (typeof userRoleValues)[number];

export type UserProfile = {
  userId: string;
  email: string | null;
  fullName: string | null;
  displayName: string;
  accountIntent: AccountIntent;
  businessInfo: string;
  websiteUrl: string | null;
  phonePersonal: string | null;
  phoneWork: string | null;
  interests: string[];
  role: UserRole;
  updatedAt: string;
};

type RawProfile = {
  user_id: string;
  email: string | null;
  full_name: string | null;
  display_name: string | null;
  account_intent: string | null;
  business_info: string | null;
  website_url: string | null;
  phone_personal: string | null;
  phone_work: string | null;
  interests: string[] | null;
  role: string | null;
  updated_at: string | null;
};

function cleanText(value: unknown, fallback = '') {
  if (typeof value !== 'string') {
    return fallback;
  }
  return value.trim();
}

function cleanOptionalText(value: unknown): string | null {
  const cleaned = cleanText(value);
  return cleaned.length > 0 ? cleaned : null;
}

function cleanWebsite(value: unknown): string | null {
  const raw = cleanText(value);
  if (!raw) {
    return null;
  }

  try {
    const url = new URL(raw.startsWith('http') ? raw : `https://${raw}`);
    return url.toString();
  } catch {
    return null;
  }
}

function cleanInterests(value: unknown): string[] {
  const source = Array.isArray(value)
    ? value
    : typeof value === 'string'
      ? value.split(',')
      : [];

  const normalized = source
    .map((item) => cleanText(item).toLowerCase())
    .filter((item) => item.length > 0)
    .slice(0, 20);

  return Array.from(new Set(normalized));
}

function normalizeIntent(value: unknown): AccountIntent {
  return accountIntentValues.includes(value as AccountIntent) ? (value as AccountIntent) : 'seller';
}

function normalizeRole(value: unknown, fallback: UserRole = 'member'): UserRole {
  return userRoleValues.includes(value as UserRole) ? (value as UserRole) : fallback;
}

function mapProfile(row: RawProfile): UserProfile {
  return {
    userId: row.user_id,
    email: row.email,
    fullName: cleanOptionalText(row.full_name),
    displayName: cleanText(row.display_name),
    accountIntent: normalizeIntent(row.account_intent),
    businessInfo: cleanText(row.business_info),
    websiteUrl: cleanOptionalText(row.website_url),
    phonePersonal: cleanOptionalText(row.phone_personal),
    phoneWork: cleanOptionalText(row.phone_work),
    interests: cleanInterests(row.interests ?? []),
    role: normalizeRole(row.role),
    updatedAt: row.updated_at ?? new Date(0).toISOString(),
  };
}

export async function getProfileByUserId(userId: string): Promise<UserProfile | null> {
  const supabase = getSupabaseServiceClient() as any;
  const { data, error } = await supabase
    .from('user_profiles')
    .select('*')
    .eq('user_id', userId)
    .maybeSingle();

  if (error) {
    throw error;
  }

  return data ? mapProfile(data) : null;
}

function roleFromIntent(intent: AccountIntent): UserRole {
  if (intent === 'service_provider') {
    return 'service_provider';
  }

  return 'seller';
}

export async function upsertProfile(
  userId: string,
  email: string | null,
  value: unknown,
): Promise<UserProfile> {
  const input = (value as Record<string, unknown>) ?? {};
  const intent = normalizeIntent(input.accountIntent);
  const displayName = cleanText(input.displayName);
  const businessInfo = cleanText(input.businessInfo);

  if (!displayName || !businessInfo) {
    throw new Error('displayName and businessInfo are required');
  }

  const existing = await getProfileByUserId(userId);

  const payload = {
    user_id: userId,
    email,
    full_name: cleanOptionalText(input.fullName),
    display_name: displayName,
    account_intent: intent,
    business_info: businessInfo,
    website_url: cleanWebsite(input.websiteUrl),
    phone_personal: cleanOptionalText(input.phonePersonal),
    phone_work: cleanOptionalText(input.phoneWork),
    interests: cleanInterests(input.interests),
    role: existing?.role ?? roleFromIntent(intent),
    updated_at: new Date().toISOString(),
  };

  const supabase = getSupabaseServiceClient();
  const service = supabase as any;
  const { data, error } = await service
    .from('user_profiles')
    .upsert(payload, { onConflict: 'user_id' })
    .select('*')
    .single();

  if (error) {
    if (typeof error.message === 'string' && error.message.includes('full_name')) {
      const fallbackPayload = {
        user_id: payload.user_id,
        email: payload.email,
        display_name: payload.display_name,
        account_intent: payload.account_intent,
        business_info: payload.business_info,
        website_url: payload.website_url,
        phone_personal: payload.phone_personal,
        phone_work: payload.phone_work,
        interests: payload.interests,
        role: payload.role,
        updated_at: payload.updated_at,
      };

      const { data: fallbackData, error: fallbackError } = await service
        .from('user_profiles')
        .upsert(fallbackPayload, { onConflict: 'user_id' })
        .select('*')
        .single();

      if (fallbackError) {
        throw fallbackError;
      }

      return mapProfile(fallbackData);
    }

    throw error;
  }

  return mapProfile(data);
}

export async function searchProfiles(query: string, interest: string): Promise<UserProfile[]> {
  const supabase = getSupabaseServiceClient() as any;
  const cleanQuery = cleanText(query);
  const cleanInterest = cleanText(interest).toLowerCase();

  let request = supabase
    .from('user_profiles')
    .select('*')
    .neq('role', 'main_admin')
    .order('updated_at', { ascending: false })
    .limit(25);

  if (cleanQuery) {
    request = request.or(`display_name.ilike.%${cleanQuery}%,business_info.ilike.%${cleanQuery}%,email.ilike.%${cleanQuery}%`);
  }

  if (cleanInterest) {
    request = request.contains('interests', [cleanInterest]);
  }

  const { data, error } = await request;

  if (error) {
    throw error;
  }

  return (data ?? []).map(mapProfile);
}

export async function searchProfilesWithRole(
  query: string,
  interest: string,
  role: string,
): Promise<UserProfile[]> {
  const supabase = getSupabaseServiceClient() as any;
  const cleanQuery = cleanText(query);
  const cleanInterest = cleanText(interest).toLowerCase();
  const cleanRole = cleanText(role);

  let request = supabase
    .from('user_profiles')
    .select('*')
    .neq('role', 'main_admin')
    .order('updated_at', { ascending: false })
    .limit(40);

  if (cleanQuery) {
    request = request.or(`display_name.ilike.%${cleanQuery}%,business_info.ilike.%${cleanQuery}%,email.ilike.%${cleanQuery}%`);
  }

  if (cleanInterest) {
    request = request.contains('interests', [cleanInterest]);
  }

  if (userRoleValues.includes(cleanRole as UserRole) && cleanRole !== 'main_admin') {
    request = request.eq('role', cleanRole);
  }

  const { data, error } = await request;

  if (error) {
    throw error;
  }

  return (data ?? []).map(mapProfile);
}

export async function getAllProfilesForAdmin(): Promise<UserProfile[]> {
  const supabase = getSupabaseServiceClient() as any;

  const { data, error } = await supabase
    .from('user_profiles')
    .select('*')
    .order('updated_at', { ascending: false })
    .limit(200);

  if (error) {
    throw error;
  }

  return (data ?? []).map(mapProfile);
}

export async function setUserRole(userId: string, role: UserRole): Promise<void> {
  if (!userRoleValues.includes(role)) {
    throw new Error('Invalid role');
  }

  const supabase = getSupabaseServiceClient() as any;

  const { error } = await supabase
    .from('user_profiles')
    .update({ role })
    .eq('user_id', userId);

  if (error) {
    throw error;
  }
}
