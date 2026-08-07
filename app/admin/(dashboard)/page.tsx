import { POYLMAN_LIST } from '@/lib/admin-routes';
import Link from 'next/link';
import { getAdminOrders, getAdminTrips, getTripsOccupancy } from '@/lib/queries/ticketing';
import { getLeads } from '@/lib/queries/leads';
import { formatCents, routeLabel } from '@/lib/ticketing';
import { OrderStatusBadge, StatusBadge, TypeBadge } from '@/components/admin/StatusBadge';
import { AdminPageHeader } from '@/components/admin/ui';
import { Button } from '@/components/ui/Button';

/** Calendar date `days` after the given `YYYY-MM-DD`, anchored at noon UTC so DST never shifts the day. */
function addDays(ymd: string, days: number): string {
  const d = new Date(`${ymd}T12:00:00Z`);
  d.setUTCDate(d.getUTCDate() + days);
  return d.toISOString().slice(0, 10);
}

export default async function DashboardPage() {
  const today = new Date().toLocaleDateString('en-CA', { timeZone: 'Europe/Athens' });
  const in7 = addDays(today, 7);

  const [weekTrips, offlineOrders, allOrders, leads] = await Promise.all([
    getAdminTrips(today, in7),
    getAdminOrders('offline'),
    getAdminOrders(),
    getLeads(),
  ]);

  // Only scheduled runs matter on the board; cancelled ones are filtered out entirely.
  const scheduledTrips = weekTrips.filter((t) => t.status === 'scheduled');
  const occupancy = await getTripsOccupancy(scheduledTrips.map((t) => t.id));

  const sevenDaysAgo = Date.now() - 7 * 86400000;
  const stats = {
    todaysDepartures: scheduledTrips.filter((t) => t.service_date === today).length,
    pendingOffice: offlineOrders.filter((o) => o.paid_at === null).length,
    weekBookings: allOrders.filter(
      (o) => (o.status === 'paid' || o.status === 'offline') && new Date(o.created_at).getTime() >= sevenDaysAgo
    ).length,
    newRequests: leads.filter((l) => l.status === 'new').length,
  };

  const TILES = [
    { key: 'todaysDepartures', label: 'Σημερινές αναχωρήσεις', href: POYLMAN_LIST },
    { key: 'pendingOffice', label: 'Εκκρεμείς πληρωμές γραφείου', href: '/admin/orders?status=offline' },
    { key: 'weekBookings', label: 'Κρατήσεις 7 ημερών', href: '/admin/orders' },
    { key: 'newRequests', label: 'Νέα αιτήματα', href: '/admin/requests' },
  ] as const;

  const recentOrders = allOrders.slice(0, 8);
  const latestLeads = leads.slice(0, 5);

  return (
    <div className="max-w-5xl">
      <AdminPageHeader
        title="Πίνακας"
        actions={
          <div className="flex flex-wrap gap-2">
            <Button asChild variant="outline"><Link href={POYLMAN_LIST}>+ Νέα εκδρομή</Link></Button>
            <Button asChild variant="accent"><Link href="/admin/orders/validate">Επικύρωση εισιτηρίου</Link></Button>
          </div>
        }
      />

      {/* Stat tiles */}
      <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
        {TILES.map((t) => (
          <Link
            key={t.key}
            href={t.href}
            className="rounded-lg border border-border bg-surface p-6 shadow-card transition hover:shadow-card-hover"
          >
            <div className="font-display text-4xl font-bold text-primary tabular">{stats[t.key]}</div>
            <div className="mt-1 font-sans text-[13px] uppercase tracking-[0.1em] text-muted">{t.label}</div>
          </Link>
        ))}
      </div>

      {/* Upcoming departures */}
      <section className="mt-10">
        <div className="mb-4 flex items-center justify-between">
          <h2 className="font-display text-2xl font-semibold text-primary">Επόμενες αναχωρήσεις (7 ημέρες)</h2>
          <Link href={POYLMAN_LIST} className="font-sans text-[13px] font-semibold uppercase tracking-[0.1em] text-cta hover:underline">Εκδρομές</Link>
        </div>
        <div className="overflow-x-auto rounded-lg border border-border bg-surface">
          <div className="min-w-[640px]">
            <div className="grid grid-cols-[12rem_1fr_6rem_5rem] items-center gap-3 border-b border-border bg-background/50 px-4 py-3 font-sans text-[12px] uppercase tracking-[0.1em] text-muted">
              <div>Ημ/νία &amp; ώρα</div>
              <div>Εκδρομή</div>
              <div>Θέσεις</div>
              <div className="text-right">—</div>
            </div>
            {scheduledTrips.map((t) => {
              const taken = occupancy.get(t.id)?.taken ?? 0;
              return (
                <div key={t.id} className="grid grid-cols-[12rem_1fr_6rem_5rem] items-center gap-3 border-b border-border/60 px-4 py-2.5 last:border-0">
                  <span className="text-[14px] text-body">
                    {new Date(`${t.service_date}T12:00:00`).toLocaleDateString('el-GR', { weekday: 'short', day: '2-digit', month: '2-digit' })}
                    {' · '}
                    {new Date(t.departure_at).toLocaleTimeString('el-GR', { hour: '2-digit', minute: '2-digit', timeZone: 'Europe/Athens' })}
                  </span>
                  <span className="truncate text-[14px] text-body">{routeLabel(t.route ?? {})}</span>
                  <span className="text-[14px] text-body tabular">{taken}/{t.online_seats_total}</span>
                  <div className="text-right">
                    <Link href={`/admin/trips/${t.id}`} className="text-[13px] font-medium text-primary hover:underline">Θέσεις →</Link>
                  </div>
                </div>
              );
            })}
            {scheduledTrips.length === 0 && (
              <p className="px-4 py-6 text-[14px] text-muted">Καμία αναχώρηση τις επόμενες 7 ημέρες.</p>
            )}
          </div>
        </div>
      </section>

      {/* Recent ticket orders */}
      <section className="mt-10">
        <div className="mb-4 flex items-center justify-between">
          <h2 className="font-display text-2xl font-semibold text-primary">Πρόσφατες κρατήσεις εισιτηρίων</h2>
          <Link href="/admin/orders" className="font-sans text-[13px] font-semibold uppercase tracking-[0.1em] text-cta hover:underline">Όλες</Link>
        </div>
        <div className="overflow-x-auto rounded-lg border border-border bg-surface">
          <div className="min-w-[640px]">
            <div className="grid grid-cols-[7rem_1fr_7rem_9rem_auto] items-center gap-3 border-b border-border bg-background/50 px-4 py-3 font-sans text-[12px] uppercase tracking-[0.1em] text-muted">
              <div>Κωδικός</div>
              <div>Πελάτης</div>
              <div>Σύνολο</div>
              <div>Κατάσταση</div>
              <div className="text-right">Ημ/νία</div>
            </div>
            {recentOrders.map((o) => (
              <Link
                key={o.id}
                href={`/admin/orders/${o.id}`}
                className="grid grid-cols-[7rem_1fr_7rem_9rem_auto] items-center gap-3 border-b border-border/60 px-4 py-3 last:border-0 hover:bg-primary/5"
              >
                <span className="font-mono text-[13px] font-semibold text-primary">{o.public_code}</span>
                <span className="truncate text-[14px] text-body">{o.customer_name ?? '—'}</span>
                <span className="text-[14px] font-semibold text-body tabular">{formatCents(o.amount_total_cents)}</span>
                <OrderStatusBadge status={o.status} />
                <span className="text-right text-[13px] text-muted">
                  {new Date(o.created_at).toLocaleDateString('el-GR', { day: '2-digit', month: '2-digit', hour: '2-digit', minute: '2-digit' })}
                </span>
              </Link>
            ))}
            {recentOrders.length === 0 && <p className="px-4 py-6 text-[14px] text-muted">Δεν υπάρχουν κρατήσεις ακόμη.</p>}
          </div>
        </div>
      </section>

      {/* Latest requests */}
      <section className="mt-10">
        <div className="mb-4 flex items-center justify-between">
          <h2 className="font-display text-2xl font-semibold text-primary">Τελευταία αιτήματα</h2>
          <Link href="/admin/requests" className="font-sans text-[13px] font-semibold uppercase tracking-[0.1em] text-cta hover:underline">Όλα</Link>
        </div>
        {latestLeads.length === 0 ? (
          <p className="text-muted">Δεν υπάρχουν αιτήματα ακόμη.</p>
        ) : (
          <div className="overflow-x-auto rounded-lg border border-border bg-surface">
            <table className="w-full min-w-[560px] text-left text-[14px]">
              <tbody>
                {latestLeads.map((l) => (
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
      </section>
    </div>
  );
}
