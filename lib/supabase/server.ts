import { cookies } from 'next/headers';
import { createServerClient as createSSRClient } from '@supabase/ssr';
import { createClient as createSupabaseClient, type SupabaseClient } from '@supabase/supabase-js';

/** True when Supabase env is configured; otherwise the data layer uses the seed fallback. */
export const isDbConfigured = (): boolean =>
  Boolean(process.env.NEXT_PUBLIC_SUPABASE_URL && process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY);

let _publicClient: SupabaseClient | null = null;

/** Cookieless anon client for PUBLIC reads (published rows only, via RLS).
 *  Safe in generateStaticParams / ISR where there is no request context. */
export function createPublicClient(): SupabaseClient {
  if (!_publicClient) {
    _publicClient = createSupabaseClient(
      process.env.NEXT_PUBLIC_SUPABASE_URL!,
      process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
      { auth: { persistSession: false, autoRefreshToken: false } }
    );
  }
  return _publicClient;
}

/** Service-role client — bypasses RLS. ONLY for payment webhook/return handlers
 *  (confirm_order_paid is granted to service_role alone). Never import client-side. */
export function createServiceClient(): SupabaseClient {
  return createSupabaseClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.SUPABASE_SERVICE_ROLE_KEY!,
    { auth: { persistSession: false, autoRefreshToken: false } }
  );
}

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
