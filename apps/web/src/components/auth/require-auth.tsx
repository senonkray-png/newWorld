'use client';

import { useRouter } from 'next/navigation';
import { useEffect, useMemo, useState } from 'react';

import type { Locale } from '@/i18n/config';
import { getSupabaseBrowserClient } from '@/lib/supabase-browser';

export function RequireAuth({
  locale,
  children,
}: {
  locale: Locale;
  children: React.ReactNode;
}) {
  const supabase = useMemo(() => getSupabaseBrowserClient(), []);
  const router = useRouter();
  const [isChecking, setIsChecking] = useState(true);
  const [isAuthed, setIsAuthed] = useState(false);

  useEffect(() => {
    let alive = true;

    async function check() {
      const { data } = await supabase.auth.getSession();
      if (!alive) return;

      const hasSession = Boolean(data.session?.access_token);
      setIsAuthed(hasSession);
      setIsChecking(false);

      if (!hasSession) {
        router.replace(`/${locale}/login`);
      }
    }

    check();

    const { data: listener } = supabase.auth.onAuthStateChange(() => {
      check();
    });

    return () => {
      alive = false;
      listener.subscription.unsubscribe();
    };
  }, [locale, router, supabase]);

  if (isChecking || !isAuthed) {
    return (
      <main className="nm-register-page">
        <section className="nm-register-card">
          <h1>...</h1>
        </section>
      </main>
    );
  }

  return <>{children}</>;
}
