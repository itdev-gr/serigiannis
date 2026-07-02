'use client';
import { useState } from 'react';
import Link from 'next/link';
import { usePathname } from 'next/navigation';
import { LayoutDashboard, MapPin, Tags, Inbox, Users, CalendarCheck, Settings, LogOut, ExternalLink, Menu, X } from 'lucide-react';
import { cn } from '@/lib/utils';
import { signOut } from '@/app/admin/(dashboard)/actions';

const NAV = [
  { to: '/admin', label: 'Πίνακας', icon: LayoutDashboard, exact: true },
  { to: '/admin/tours', label: 'Εκδρομές', icon: MapPin },
  { to: '/admin/categories', label: 'Κατηγορίες', icon: Tags },
  { to: '/admin/requests', label: 'Αιτήματα', icon: Inbox },
  { to: '/admin/clients', label: 'Πελάτες', icon: Users },
  { to: '/admin/bookings', label: 'Κρατήσεις', icon: CalendarCheck },
  { to: '/admin/settings', label: 'Ρυθμίσεις', icon: Settings },
];

function isActive(pathname: string, to: string, exact?: boolean) {
  return exact ? pathname === to : pathname === to || pathname.startsWith(to + '/');
}

export function AdminSidebar({ email }: { email?: string }) {
  const pathname = usePathname();
  const [open, setOpen] = useState(false);
  const links = (
    <nav className="flex flex-col gap-1">
      {NAV.map(({ to, label, icon: Icon, exact }) => {
        const active = isActive(pathname, to, exact);
        return (
          <Link key={to} href={to} onClick={() => setOpen(false)}
            className={cn('flex items-center gap-3 rounded-md px-3 py-2.5 font-sans text-[14px] transition-colors',
              active ? 'bg-primary text-surface' : 'text-body hover:bg-primary/5')}>
            <Icon className="h-4.5 w-4.5 shrink-0" strokeWidth={1.75} /> {label}
          </Link>
        );
      })}
    </nav>
  );
  return (
    <>
      {/* Mobile top bar */}
      <div className="flex items-center justify-between border-b border-border bg-surface px-4 py-3 lg:hidden">
        <Link href="/admin" className="font-display text-lg font-semibold text-primary">Sergiani <span className="text-[11px] uppercase tracking-[0.2em] text-muted">Διαχείριση</span></Link>
        <button type="button" onClick={() => setOpen(true)} aria-label="Μενού" className="grid h-10 w-10 place-items-center rounded-md text-primary hover:bg-primary/10"><Menu className="h-5 w-5" /></button>
      </div>
      {/* Desktop sidebar */}
      <aside className="hidden w-64 shrink-0 flex-col border-r border-border bg-surface p-4 lg:flex">
        <Link href="/admin" className="mb-6 px-3 font-display text-xl font-semibold text-primary">Sergiani <span className="block text-[11px] uppercase tracking-[0.2em] text-muted">Διαχείριση</span></Link>
        {links}
        <div className="mt-auto border-t border-border pt-4">
          {email && <div className="mb-2 truncate px-3 text-[12px] text-muted">{email}</div>}
          <Link href="/" target="_blank" className="flex items-center gap-3 rounded-md px-3 py-2 text-[13px] text-muted hover:bg-primary/5"><ExternalLink className="h-4 w-4" /> Ιστότοπος</Link>
          <form action={signOut}><button type="submit" className="flex w-full items-center gap-3 rounded-md px-3 py-2 text-[13px] text-muted hover:bg-cta/10 hover:text-cta"><LogOut className="h-4 w-4" /> Έξοδος</button></form>
        </div>
      </aside>
      {/* Mobile drawer */}
      <div className={cn('fixed inset-0 z-50 lg:hidden', open ? 'pointer-events-auto' : 'pointer-events-none')}>
        <div className={cn('absolute inset-0 bg-deep-ink/40 transition-opacity', open ? 'opacity-100' : 'opacity-0')} onClick={() => setOpen(false)} />
        <div className={cn('absolute left-0 top-0 h-full w-72 bg-surface p-4 shadow-xl transition-transform', open ? 'translate-x-0' : '-translate-x-full')}>
          <div className="mb-6 flex items-center justify-between">
            <span className="font-display text-lg font-semibold text-primary">Διαχείριση</span>
            <button type="button" onClick={() => setOpen(false)} aria-label="Κλείσιμο" className="grid h-10 w-10 place-items-center rounded-md text-primary hover:bg-primary/10"><X className="h-5 w-5" /></button>
          </div>
          {links}
          <form action={signOut} className="mt-4 border-t border-border pt-4"><button type="submit" className="flex w-full items-center gap-3 rounded-md px-3 py-2 text-[13px] text-muted hover:text-cta"><LogOut className="h-4 w-4" /> Έξοδος</button></form>
        </div>
      </div>
    </>
  );
}
