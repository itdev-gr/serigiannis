import { createServerClient } from '@supabase/ssr';
import { NextResponse, type NextRequest } from 'next/server';

/** Refreshes the Supabase session cookie and guards /admin (admin role required). */
export async function updateSession(request: NextRequest) {
  let response = NextResponse.next({ request });

  const url = process.env.NEXT_PUBLIC_SUPABASE_URL;
  const key = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;
  if (!url || !key) return response; // DB not configured (e.g. local seed mode)

  const supabase = createServerClient(url, key, {
    cookies: {
      getAll() {
        return request.cookies.getAll();
      },
      setAll(cookiesToSet) {
        cookiesToSet.forEach(({ name, value }) => request.cookies.set(name, value));
        response = NextResponse.next({ request });
        cookiesToSet.forEach(({ name, value, options }) => response.cookies.set(name, value, options));
      },
    },
  });

  const { data: { user } } = await supabase.auth.getUser();
  const path = request.nextUrl.pathname;
  const isAdminArea = path.startsWith('/admin') && !path.startsWith('/admin/login');

  if (isAdminArea) {
    const isAdmin = (user?.app_metadata as { role?: string } | undefined)?.role === 'admin';
    if (!isAdmin) {
      const redirect = request.nextUrl.clone();
      redirect.pathname = '/admin/login';
      redirect.searchParams.set('next', path);
      return NextResponse.redirect(redirect);
    }
  }

  return response;
}
