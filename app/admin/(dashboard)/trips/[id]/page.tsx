import { notFound } from 'next/navigation';
import { getAdminLayouts, getAdminRouteFares, getAdminTrip, getTripClaims } from '@/lib/queries/ticketing';
import { updateTrip } from '../../ticketing-actions';
import { Button } from '@/components/ui/Button';
import { TripSeatPanel } from '@/components/admin/TripSeatPanel';
import { FlashBanner } from '@/components/admin/FlashBanner';
import { AdminPageHeader, Pill, adminInput } from '@/components/admin/ui';
import { routeLabel, layoutAllSeats, nextFreeSeat, takenSeatNumbers } from '@/lib/ticketing';

export default async function TripDashboardPage({
  params,
  searchParams,
}: {
  params: Promise<{ id: string }>;
  searchParams: Promise<{ saved?: string; error?: string; after?: string }>;
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

  // Taken = booked, blocked, or an unexpired hold — same rule AdminSeatMap/TripSeatPanel use.
  const takenSeats = takenSeatNumbers(claims, Date.now());
  const allSeats = layoutAllSeats(layout.layout);
  const suggested = nextFreeSeat(allSeats, takenSeats, sp.after ?? null);
  const seatsLeft = allSeats.length - takenSeats.length;

  const dateStr = new Date(`${trip.service_date}T12:00:00`).toLocaleDateString('el-GR', { weekday: 'long', day: '2-digit', month: '2-digit', year: 'numeric' });
  const timeStr = new Date(trip.departure_at).toLocaleTimeString('el-GR', { hour: '2-digit', minute: '2-digit', timeZone: 'Europe/Athens' });
  const subtitle = `${dateStr} · ${timeStr} · ${trip.layout?.name ?? ''} · ${booked} κρατημένες, ${blocked} κλειδωμένες / ${trip.online_seats_total} online`;

  return (
    <div className="max-w-5xl">
      <AdminPageHeader
        title={routeLabel(trip.route ?? {})}
        subtitle={subtitle}
        backHref={`/admin/excursions/${trip.route_id}?tab=dromologia`}
        backLabel="Δρομολόγια"
        actions={trip.status === 'cancelled' ? <Pill tone="danger">ΑΚΥΡΩΜΕΝΟ</Pill> : undefined}
      />

      <div className="empty:hidden">
        <FlashBanner saved={sp.saved} error={sp.error} />
      </div>

      {/* Keying on `after` remounts the panel (and its seat state) once per
          booking, when a fresh `suggested` seat is available — but NOT on
          unrelated re-renders (e.g. the revalidatePath after block/unblock),
          so a clerk's manually typed seat survives those. Do not key on
          `suggested`: that would wipe the clerk's typing whenever the map
          changes for reasons unrelated to a booking. */}
      <TripSeatPanel
        key={sp.after ?? 'first'}
        tripId={trip.id}
        layout={layout.layout}
        claims={claims}
        fares={fares}
        initialSeat={suggested ?? ''}
        seatsLeft={seatsLeft}
      >
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
      </TripSeatPanel>
    </div>
  );
}
