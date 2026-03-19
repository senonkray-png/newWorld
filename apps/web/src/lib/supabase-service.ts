import { createClient } from '@supabase/supabase-js';

type GlobalWithSupabase = typeof globalThis & {
  nmSupabaseService?: ReturnType<typeof createClient>;
};

const globalWithSupabase = globalThis as GlobalWithSupabase;

export function getSupabaseServiceClient() {
  if (!globalWithSupabase.nmSupabaseService) {
    const url = process.env.NEXT_PUBLIC_SUPABASE_URL;
    const key = process.env.SUPABASE_SERVICE_ROLE_KEY;

    if (!url || !key) {
      throw new Error('NEXT_PUBLIC_SUPABASE_URL and SUPABASE_SERVICE_ROLE_KEY must be set');
    }

    globalWithSupabase.nmSupabaseService = createClient(url, key, {
      auth: {
        persistSession: false,
      },
    });
  }

  return globalWithSupabase.nmSupabaseService;
}
