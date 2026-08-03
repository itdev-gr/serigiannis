import Link from 'next/link';
import { notFound } from 'next/navigation';
import { getAdminOrder, getAdminTrips, getBookingSettings } from '@/lib/queries/ticketing';
import { cancelTicket, markOrderPaid, moveTicket, renameTicket, saveOrderNotes } from '../../ticketing-actions';
import { Button } from '@/components/ui/Button';
import { ConfirmForm } from '@/components/admin/ConfirmForm';
import { FlashBanner } from '@/components/admin/FlashBanner';
import { OrderStatusBadge, TicketStatusBadge } from '@/components/admin/StatusBadge';
import { adminInput } from '@/components/admin/ui';
import { KIND_LABEL, formatCents, refundPolicyText, routeLabel } from '@/lib/ticketing';
import type { TripKind } from '@/types/ticketing';

export default async function OrderDetailPage({
  params,
  searchParams,
}: {
  params: Promise<{ id: string }>;
  searchParams: Promise<{ saved?: string; error?: string }>;
}) {
  const { id } = await params;
  const from = new Date().toISOString().slice(0, 10);
  const to = new Date(Date.now() + 30 * 86_400_000).toISOString().slice(0, 10);
  const [data, sp, upcomingTrips, bookingSettings] = await Promise.all([
    getAdminOrder(id),
    searchParams,
    getAdminTrips(from, to),
    getBookingSettings(),
  ]);
  if (!data) notFound();
  const { order, tickets } = data;

  return (
    <div className="max-w-4xl">
      <p className="mb-2 text-[13px]"><Link href="/admin/orders" className="text-muted hover:text-primary">← Εισιτήρια</Link></p>
      <div className="flex flex-wrap items-center justify-between gap-3">
        <h1 className="font-display text-4xl font-semibold text-primary">{order.public_code}</h1>
        <OrderStatusBadge status={order.status} />
      </div>

      <div className="mt-6 empty:hidden">
        <FlashBanner saved={sp.saved} error={sp.error} />
      </div>

      <div className="mt-6 grid gap-4 rounded-lg border border-border bg-surface p-6 sm:grid-cols-2">
        <div>
          <h2 className="mb-2 text-[12px] font-semibold uppercase tracking-[0.1em] text-muted">Πελάτης</h2>
          <p className="text-[15px] font-semibold text-body">{order.customer_name ?? '—'}</p>
          <p className="text-[14px] text-muted">{order.phone} {order.email && `· ${order.email}`}</p>
          {order.boarding_point && <p className="text-[13px] text-muted">Σημείο συνάντησης: {order.boarding_point}</p>}
          <p className="mt-1 text-[13px] text-muted">
            {order.kind !== 'oneway' && `${KIND_LABEL[order.kind as TripKind] ?? order.kind} · `}
            {order.created_by_admin && 'τηλεφωνική κράτηση · '}
            {new Date(order.created_at).toLocaleString('el-GR')}
          </p>
        </div>
        <div className="sm:text-right">
          <h2 className="mb-2 text-[12px] font-semibold uppercase tracking-[0.1em] text-muted">Σύνολο</h2>
          <p className="font-display text-3xl font-bold text-primary">{formatCents(order.amount_total_cents)}</p>
          {order.paid_at
            ? <p className="text-[13px] text-olive">Εξοφλήθηκε {new Date(order.paid_at).toLocaleString('el-GR')}</p>
            : order.status === 'offline' && (
              <ConfirmForm action={markOrderPaid.bind(null, order.id)} message="Σήμανση ως εξοφλημένη;">
                <Button type="submit" size="sm" className="mt-2">Πληρώθηκε στο γραφείο</Button>
              </ConfirmForm>
            )}
        </div>
      </div>

      <h2 className="mt-8 font-display text-2xl font-semibold text-primary">Εισιτήρια</h2>
      <div className="mt-3 grid gap-4">
        {tickets.map((t) => {
          // Move targets: same route, still scheduled. If the ticket's current trip
          // isn't among them, prepend it so opening the form + ΟΚ is a no-op self-move.
          const moveTargets = upcomingTrips.filter(
            (tr) => tr.status === 'scheduled' && tr.route_id === t.trip?.route_id
          );
          const currentInTargets = moveTargets.some((tr) => tr.id === t.trip_id);
          const showCurrentOption = !currentInTargets && t.trip != null;
          const hasDefault = currentInTargets || showCurrentOption;
          return (
          <div key={t.id} className="rounded-lg border border-border bg-surface p-5">
            <div className="flex flex-wrap items-center justify-between gap-3">
              <div className="flex flex-wrap items-center gap-x-3 gap-y-1">
                <span className="font-mono text-[15px] font-bold tracking-[0.15em] text-deep-ink">{t.code}</span>
                <TicketStatusBadge status={t.status} />
                {t.refunded_cents != null && (
                  <span className="text-[13px] text-muted">Επιστροφή: {formatCents(t.refunded_cents)}</span>
                )}
              </div>
              <span className="text-[14px] font-semibold text-body">{t.fare_name} · {formatCents(t.price_cents)}</span>
            </div>
            <p className="mt-2 text-[14px] text-body">
              <strong>{t.passenger_name}</strong>
              {t.passenger_phone && ` · ${t.passenger_phone}`}
              {' · '}
              {t.trip
                ? `${routeLabel(t.trip.route ?? {})} · ${new Date(`${t.trip.service_date}T12:00:00`).toLocaleDateString('el-GR')} · ${new Date(t.trip.departure_at).toLocaleTimeString('el-GR', { hour: '2-digit', minute: '2-digit', timeZone: 'Europe/Athens' })} · Θέση ${t.seat_no}`
                : `Ανοιχτή επιστροφή${t.open_return_expires_on ? ` (έως ${new Date(`${t.open_return_expires_on}T12:00:00`).toLocaleDateString('el-GR')})` : ''}`}
              {t.validated_at && ` · Επικυρώθηκε ${new Date(t.validated_at).toLocaleString('el-GR')}`}
            </p>

            {t.status === 'valid' && (
              <div className="mt-4 grid gap-3 border-t border-border pt-4 lg:grid-cols-3">
                <form action={renameTicket} className="flex items-end gap-2">
                  <input type="hidden" name="ticket_id" value={t.id} />
                  <input type="hidden" name="order_id" value={order.id} />
                  <label className="grow text-[12px] text-muted">Αλλαγή ονόματος
                    <input name="passenger_name" defaultValue={t.passenger_name} className={adminInput} />
                  </label>
                  <Button type="submit" size="sm" variant="outline">ΟΚ</Button>
                </form>
                <form action={moveTicket} className="flex items-end gap-2">
                  <input type="hidden" name="ticket_id" value={t.id} />
                  <input type="hidden" name="order_id" value={order.id} />
                  {t.trip_id == null ? (
                    <>
                      <input type="hidden" name="open_return" value="1" />
                      <label className="grow text-[12px] text-muted">Εξαργύρωση σε δρομολόγιο (ID)
                        <input name="trip_id" defaultValue="" placeholder="Trip ID" className={adminInput} />
                      </label>
                    </>
                  ) : (
                    <label className="grow text-[12px] text-muted">Μεταφορά σε δρομολόγιο
                      <select name="trip_id" defaultValue={hasDefault ? t.trip_id : ''} className={adminInput}>
                        {!hasDefault && <option value="" disabled>— Επιλέξτε δρομολόγιο —</option>}
                        {showCurrentOption && t.trip && (
                          <option value={t.trip_id}>
                            {`${new Date(`${t.trip.service_date}T12:00:00`).toLocaleDateString('el-GR')} ${new Date(t.trip.departure_at).toLocaleTimeString('el-GR', { hour: '2-digit', minute: '2-digit', timeZone: 'Europe/Athens' })} — ${routeLabel(t.trip.route ?? {})}`}
                          </option>
                        )}
                        {moveTargets.map((tr) => (
                          <option key={tr.id} value={tr.id}>
                            {`${new Date(`${tr.service_date}T12:00:00`).toLocaleDateString('el-GR')} ${new Date(tr.departure_at).toLocaleTimeString('el-GR', { hour: '2-digit', minute: '2-digit', timeZone: 'Europe/Athens' })} — ${routeLabel(tr.route ?? {})}`}
                          </option>
                        ))}
                      </select>
                    </label>
                  )}
                  <label className="w-20 text-[12px] text-muted">Θέση
                    <input name="seat_no" defaultValue={t.seat_no ?? ''} className={adminInput} />
                  </label>
                  <Button type="submit" size="sm" variant="outline">ΟΚ</Button>
                </form>
                <ConfirmForm
                  action={cancelTicket.bind(null, t.id, order.id)}
                  message={`Ακύρωση εισιτηρίου; Η επιστροφή υπολογίζεται αυτόματα — ${refundPolicyText(bookingSettings)}`}
                >
                  <button type="submit" className="mt-5 w-full rounded-md border border-cta/40 px-3 py-2 text-[14px] font-medium text-cta hover:bg-cta/5">
                    Ακύρωση εισιτηρίου
                  </button>
                </ConfirmForm>
              </div>
            )}
          </div>
          );
        })}
        {tickets.length === 0 && (
          <p className="rounded-lg border border-border bg-surface px-4 py-6 text-[14px] text-muted">
            Δεν έχουν εκδοθεί εισιτήρια (η κράτηση δεν ολοκληρώθηκε).
          </p>
        )}
      </div>

      <form action={saveOrderNotes.bind(null, order.id)} className="mt-8 rounded-lg border border-border bg-surface p-5">
        <label className="block text-[13px] text-muted">Σημειώσεις διαχειριστή
          <textarea name="admin_notes" rows={3} defaultValue={order.admin_notes ?? ''} className={adminInput} />
        </label>
        <div className="mt-3"><Button type="submit" size="sm" variant="outline">Αποθήκευση σημειώσεων</Button></div>
      </form>
    </div>
  );
}
