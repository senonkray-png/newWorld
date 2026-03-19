'use client';

import { createClient } from '@supabase/supabase-js';

type BrowserClient = ReturnType<typeof createClient>;

let client: BrowserClient | null = null;

export function getSupabaseBrowserClient() {
  if (client) {
    return client;
  }

  const url = process.env.NEXT_PUBLIC_SUPABASE_URL;
  const key = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;

  if (!url || !key) {
    throw new Error('NEXT_PUBLIC_SUPABASE_URL and NEXT_PUBLIC_SUPABASE_ANON_KEY must be set');
  }

  client = createClient(url, key);
  return client;
}
