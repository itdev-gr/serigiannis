import Link from 'next/link';
import { notFound } from 'next/navigation';
import { getAdminLayouts, getAdminRouteFares, getAdminTrip, getTripClaims } from '@/lib/queries/ticketing';
import { manualBooking, updateTrip } from '../../../ticketing-actions';
import { Button } from '@/components/ui/Button';
import { AdminSeatMap } from '@/components/admin/AdminSeatMap';
import { FlashBanner } from '@/components/admin/FlashBanner';
import { adminInput } from '@/components/admin/ui';
import { routeLabel } from '@/lib/ticketing';

export default async function TripDashboardPage({
  params,
  searchParams,
}: {
  params: Promise<{ id: string }>;
  searchParams: Promise<{ saved?: string; error?: string }>;
}) {
  const { id } = await params;
  const trip = await getAdminTrip(id);
  if (!trip) notFound();
  const [claims, layouts, fares, layout, sp] = await Promise.all([
    getTripClaims(id),
    getAdminLayouts(),
    getAdminRouteFares(trip.route_id),
    import('@/lib/queries/ticketing').then((m) => m.getAdminLayout(trip.layout_id)),
    searchParams,
  ]);
  if (!layout) notFound();

  const booked = claims.filter((c) => c.claim_type === 'booked').length;
  const blocked = claims.filter((c) => c.claim_type === 'blocked').length;

  return (
    <div className="max-w-5xl">
      <p className="mb-2 text-[13px]"><Link href="/admin/schedules" className="text-muted hover:text-primary">← Δρομολόγια</Link></p>
      <h1 className="font-display text-3xl font-semibold text-primary md:text-4xl">
        {routeLabel(trip.route ?? {})}
      </h1>
      <p className="mt-1 text-[15px] text-muted">
        {new Date(`${trip.service_date}T12:00:00`).toLocaleDateString('el-GR', { weekday: 'long', day: '2-digit', month: '2-digit', year: 'numeric' })}
        {' · '}{new Date(trip.departure_at).toLocaleTimeString('el-GR', { hour: '2-digit', minute: '2-digit', timeZone: 'Europe/Athens' })}
        {' · '}{trip.layout?.name}
        {' · '}{booked} κρατημένες, {blocked} κλειδωμένες / {trip.online_seats_total} online
        {trip.status === 'cancelled' && <span className="ml-2 rounded bg-cta/10 px-2 py-0.5 text-[13px] font-semibold text-cta">ΑΚΥΡΩΜΕΝΟ</span>}
      </p>

      <div className="mt-6 empty:hidden">
        <FlashBanner saved={sp.saved} error={sp.error} />
      </div>

      <div className="mt-8">
        <AdminSeatMap tripId={trip.id} layout={layout.layout} claims={claims} />
      </div>

      <div className="mt-10 grid gap-6 lg:grid-cols-2">
        <form action={updateTrip} className="grid gap-3 rounded-lg border border-border bg-surface p-5">
          <h2 className="font-display text-xl font-semibold text-primary">Ρυθμίσεις δρομολογίου</h2>
          <input type="hidden" name="id" value={trip.id} />
          <label className="block text-[13px] text-muted">Κατάσταση
            <select name="status" defaultValue={trip.status} className={adminInput}>
              <option value="scheduled">Ενεργό</option>
              <option value="cancelled">Ακυρωμένο</option>
            </select>
          </label>
          <label className="block text-[13px] text-muted">Λεωφορείο (διάταξη)
            <select name="layout_id" defaultValue={trip.layout_id} className={adminInput}>
              {layouts.map((l) => <option key={l.id} value={l.id}>{l.name}</option>)}
            </select>
          </label>
          <label className="block text-[13px] text-muted">Cutoff online πώλησης (λεπτά πριν την αναχώρηση)
            <input name="sales_cutoff_min" type="number" defaultValue={trip.sales_cutoff_min ?? ''} placeholder="default" className={adminInput} />
          </label>
          <label className="block text-[13px] text-muted">Σημειώσεις
            <input name="notes" defaultValue={trip.notes ?? ''} className={adminInput} />
          </label>
          <div><Button type="submit" variant="outline">Αποθήκευση</Button></div>
          <p className="text-[12px] text-muted">Προσοχή: η αλλαγή διάταξης δεν μεταφέρει υπάρχουσες κρατήσεις σε άλλες θέσεις.</p>
        </form>

        <form action={manualBooking} className="grid gap-3 rounded-lg border border-border bg-surface p-5">
          <h2 className="font-display text-xl font-semibold text-primary">Χειροκίνητη κράτηση (τηλεφωνική)</h2>
          <input type="hidden" name="trip_id" value={trip.id} />
          <div className="grid grid-cols-2 gap-3">
            <label className="block text-[13px] text-muted">Θέση
              <input name="seat_no" required placeholder="π.χ. 12" className={adminInput} />
            </label>
            <label className="block text-[13px] text-muted">Ναύλος
              <select name="fare_type_id" required className={adminInput}>
                {fares.map((f) => <option key={f.id} value={f.id}>{f.name} — {(f.price_oneway_cents / 100).toFixed(2)}€</option>)}
              </select>
            </label>
          </div>
          <label className="block text-[13px] text-muted">Ονοματεπώνυμο επιβάτη
            <input name="passenger_name" required className={adminInput} />
          </label>
          <div className="grid grid-cols-2 gap-3">
            <label className="block text-[13px] text-muted">Τηλέφωνο
              <input name="phone" className={adminInput} />
            </label>
            <label className="block text-[13px] text-muted">Email (προαιρετικό)
              <input name="email" type="email" className={adminInput} />
            </label>
          </div>
          <div><Button type="submit">Κράτηση θέσης</Button></div>
          <p className="text-[12px] text-muted">Δημιουργεί κράτηση με «Πληρωμή στο γραφείο». Για πολλές θέσεις επαναλάβετε ανά θέση.</p>
        </form>
      </div>
    </div>
  );
}
