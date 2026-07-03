import Link from 'next/link';
import { getLeads, groupClients } from '@/lib/queries/leads';
import { getPublishedTourCount } from '@/lib/queries/tours';
import { StatusBadge, TypeBadge } from '@/components/admin/StatusBadge';

const TILES = [
  { key: 'tours', label: 'Δημοσιευμένες εκδρομές', href: '/admin/tours' },
  { key: 'newRequests', label: 'Νέα αιτήματα', href: '/admin/requests' },
  { key: 'clients', label: 'Πελάτες', href: '/admin/clients' },
  { key: 'bookings', label: 'Κρατήσεις', href: '/admin/bookings' },
] as const;

export default async function DashboardPage() {
  const [leads, tours] = await Promise.all([getLeads(), getPublishedTourCount()]);
  const stats = {
    tours,
    newRequests: leads.filter((l) => l.status === 'new').length,
    clients: groupClients(leads).length,
    bookings: leads.filter((l) => l.status === 'booked').length,
  };
  const latest = leads.slice(0, 5);
  return (
    <div>
      <h1 className="font-display text-4xl font-semibold text-primary">Πίνακας</h1>
      <div className="mt-8 grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
        {TILES.map((t) => (
          <Link key={t.key} href={t.href} className="rounded-lg border border-border bg-surface p-6 shadow-card transition hover:shadow-card-hover">
            <div className="font-display text-4xl font-bold text-primary tabular">{stats[t.key]}</div>
            <div className="mt-1 font-sans text-[13px] uppercase tracking-[0.1em] text-muted">{t.label}</div>
          </Link>
        ))}
      </div>
      <div className="mt-10">
        <div className="mb-4 flex items-center justify-between">
          <h2 className="font-display text-2xl font-semibold text-primary">Τελευταία αιτήματα</h2>
          <Link href="/admin/requests" className="font-sans text-[13px] font-semibold uppercase tracking-[0.1em] text-cta hover:underline">Όλα</Link>
        </div>
        {latest.length === 0 ? (
          <p className="text-muted">Δεν υπάρχουν αιτήματα ακόμη.</p>
        ) : (
          <div className="overflow-hidden rounded-lg border border-border bg-surface">
            <table className="w-full text-left text-[14px]">
              <tbody>
                {latest.map((l) => (
                  <tr key={l.id} className="border-b border-border/60 last:border-0">
                    <td className="px-5 py-3"><Link href={`/admin/requests/${l.id}`} className="font-medium text-primary hover:text-cta">{l.name}</Link></td>
                    <td className="px-5 py-3"><TypeBadge type={l.type} /></td>
                    <td className="px-5 py-3 text-muted">{l.tour_title ?? l.subject ?? '—'}</td>
                    <td className="px-5 py-3"><StatusBadge status={l.status} /></td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>
    </div>
  );
}
