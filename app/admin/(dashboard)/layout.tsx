import Link from 'next/link';
import { redirect } from 'next/navigation';
import { LogOut, Plus, ExternalLink } from 'lucide-react';
import { createServerClient } from '@/lib/supabase/server';
import { signOut } from './actions';

export default async function DashboardLayout({ children }: { children: React.ReactNode }) {
  const sb = await createServerClient();
  const { data: { user } } = await sb.auth.getUser();
  const isAdmin = (user?.app_metadata as { role?: string } | undefined)?.role === 'admin';
  if (!isAdmin) redirect('/admin/login');

  return (
    <div className="min-h-screen bg-background">
      <header className="border-b border-border bg-surface">
        <div className="container flex h-16 items-center justify-between gap-4">
          <div className="flex items-center gap-6">
            <Link href="/admin" className="font-display text-xl font-semibold text-primary">
              Sergiani <span className="font-sans text-[11px] uppercase tracking-[0.2em] text-muted">Διαχείριση</span>
            </Link>
            <Link href="/admin/tours/new" className="inline-flex items-center gap-1.5 rounded-full bg-cta px-4 py-1.5 font-sans text-[13px] font-semibold text-surface hover:bg-cta-hover">
              <Plus className="h-4 w-4" strokeWidth={2} /> Νέα Εκδρομή
            </Link>
          </div>
          <div className="flex items-center gap-4 text-[13px]">
            <Link href="/" target="_blank" className="inline-flex items-center gap-1.5 text-muted hover:text-primary">
              <ExternalLink className="h-4 w-4" strokeWidth={1.75} /> Ιστότοπος
            </Link>
            <span className="hidden text-muted sm:inline">{user?.email}</span>
            <form action={signOut}>
              <button type="submit" className="inline-flex items-center gap-1.5 text-muted hover:text-cta">
                <LogOut className="h-4 w-4" strokeWidth={1.75} /> Έξοδος
              </button>
            </form>
          </div>
        </div>
      </header>
      <main className="container py-10">{children}</main>
    </div>
  );
}
