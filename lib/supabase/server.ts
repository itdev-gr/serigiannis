import { cookies } from 'next/headers';
import { createServerClient as createSSRClient } from '@supabase/ssr';

/** True when Supabase env is configured; otherwise the data layer uses the seed fallback. */
export const isDbConfigured = (): boolean =>
  Boolean(process.env.NEXT_PUBLIC_SUPABASE_URL && process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY);

/** Cookie-aware Supabase client for Server Components / Server Actions. RLS enforced. */
export async function createServerClient() {
  const cookieStore = await cookies();
  return createSSRClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
    {
      cookies: {
        getAll() {
          return cookieStore.getAll();
        },
        setAll(cookiesToSet) {
          try {
            cookiesToSet.forEach(({ name, value, options }) =>
              cookieStore.set(name, value, options)
            );
          } catch {
            // setAll from a Server Component throws; safe to ignore when a
            // middleware (added in the dashboard phase) refreshes the session.
          }
        },
      },
    }
  );
}
