import { redirect } from 'next/navigation';
import { createServerClient } from '@/lib/supabase/server';
import { AdminSidebar } from '@/components/admin/AdminSidebar';

export default async function DashboardLayout({ children }: { children: React.ReactNode }) {
  const sb = await createServerClient();
  const { data: { user } } = await sb.auth.getUser();
  const isAdmin = (user?.app_metadata as { role?: string } | undefined)?.role === 'admin';
  if (!isAdmin) redirect('/admin/login');

  return (
    <div className="flex min-h-screen flex-col bg-background lg:flex-row">
      <AdminSidebar email={user?.email} />
      <main className="min-w-0 flex-1 px-5 py-8 md:px-10">{children}</main>
    </div>
  );
}
