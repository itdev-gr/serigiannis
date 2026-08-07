import Link from 'next/link';
import { notFound } from 'next/navigation';
import { getAdminTourOrder } from '@/lib/queries/tour-orders';
import { formatCents } from '@/lib/booking';
import { OrderStatusBadge } from '@/components/admin/StatusBadge';
import { ConfirmForm } from '@/components/admin/ConfirmForm';
import { FlashBanner } from '@/components/admin/FlashBanner';
import { Button } from '@/components/ui/Button';
import { saveTourOrderNotes, setTourOrderStatus } from '../../actions';

const STATUSES = [
  { v: 'paid', l: 'Πληρωμένη' },
  { v: 'offline', l: 'Πληρωμή στο γραφείο' },
  { v: 'cancelled', l: 'Ακυρωμένη' },
];

export default async function TourBookingDetailPage({
  params,
  searchParams,
}: {
  params: Promise<{ id: string }>;
  searchParams: Promise<{ saved?: string; error?: string }>;
}) {
  const { id } = await params;
  const [order, sp] = await Promise.all([getAdminTourOrder(id), searchParams]);
  if (!order) notFound();

  return (
    <div className="max-w-2xl">
      <Link href="/admin/bookings" className="text-[13px] text-muted hover:text-primary">← Κρατήσεις Εκδρομών</Link>
      <div className="mt-3 flex flex-wrap items-center gap-3">
        <h1 className="font-display text-3xl font-semibold text-primary">{order.tour_title}</h1>
        <span className="font-mono text-[14px] font-semibold tracking-[0.15em] text-primary">{order.public_code}</span>
        <OrderStatusBadge status={order.status} />
      </div>

      <div className="mt-4 empty:hidden"><FlashBanner saved={sp.saved} error={sp.error} /></div>

      <dl className="mt-6 grid grid-cols-3 gap-y-3 rounded-lg border border-border bg-surface p-6 text-[15px]">
        <dt className="text-muted">Πελάτης</dt><dd className="col-span-2">{order.customer_name ?? '—'}</dd>
        {order.phone && (<><dt className="text-muted">Τηλέφωνο</dt><dd className="col-span-2"><a href={`tel:${order.phone.replace(/\s+/g, '')}`} className="text-primary hover:text-cta">{order.phone}</a></dd></>)}
        {order.email && (<><dt className="text-muted">Email</dt><dd className="col-span-2"><a href={`mailto:${order.email}`} className="text-primary hover:text-cta">{order.email}</a></dd></>)}
        <dt className="text-muted">Αναχώρηση</dt>
        <dd className="col-span-2">
          {order.departure_date
            ? new Date(`${order.departure_date}T12:00:00`).toLocaleDateString('el-GR', { weekday: 'long', day: '2-digit', month: 'long', year: 'numeric' })
            : '—'}
        </dd>
        <dt className="text-muted">Άτομα</dt><dd className="col-span-2">{order.party_size}</dd>
        {order.meeting_point && (<><dt className="text-muted">Σημείο επιβίβασης</dt><dd className="col-span-2">{order.meeting_point}</dd></>)}
        {order.notes && (<><dt className="text-muted">Σημειώσεις πελάτη</dt><dd className="col-span-2 whitespace-pre-wrap">{order.notes}</dd></>)}
        {order.payment_provider && (<><dt className="text-muted">Πληρωμή</dt><dd className="col-span-2">{order.payment_provider}{order.paid_at ? ` · ${new Date(order.paid_at).toLocaleString('el-GR')}` : ''}</dd></>)}
        <dt className="text-muted">Ημ/νία</dt><dd className="col-span-2">{new Date(order.created_at).toLocaleString('el-GR')}</dd>
      </dl>

      <div className="mt-6 rounded-lg border border-border bg-surface p-6">
        <h2 className="font-sans text-[13px] font-semibold uppercase tracking-[0.1em] text-primary">Ανάλυση</h2>
        <table className="mt-3 w-full text-[15px]">
          <tbody>
            {order.items.map((item) => (
              <tr key={item.tier_id} className="border-b border-border/60">
                <td className="py-2 pr-3">{item.label}<span className="block text-[13px] text-muted">{item.qty} × {formatCents(item.unit_cents)}</span></td>
                <td className="py-2 text-right font-semibold">{formatCents(item.line_cents)}</td>
              </tr>
            ))}
            <tr>
              <td className="pt-3 font-semibold text-primary">Σύνολο</td>
              <td className="pt-3 text-right font-display text-xl font-bold text-primary">{formatCents(order.amount_total_cents)}</td>
            </tr>
          </tbody>
        </table>
      </div>

      {order.passengers.length > 0 && (
        <div className="mt-6 rounded-lg border border-border bg-surface p-6">
          <h2 className="font-sans text-[13px] font-semibold uppercase tracking-[0.1em] text-primary">Ταξιδιώτες</h2>
          <ul className="mt-3 divide-y divide-border/60 text-[15px]">
            {order.passengers.map((p, i) => (
              <li key={i} className="flex items-center justify-between gap-3 py-2">
                <span className="text-body">
                  {p.name}
                  {p.meeting_point && <span className="block text-[13px] text-muted">{p.meeting_point}</span>}
                </span>
                {p.phone && (
                  <a href={`tel:${p.phone.replace(/\s+/g, '')}`} className="text-[13px] text-primary hover:text-cta">{p.phone}</a>
                )}
              </li>
            ))}
          </ul>
        </div>
      )}

      <div className="mt-6 rounded-lg border border-border bg-surface p-6">
        <h2 className="font-sans text-[13px] font-semibold uppercase tracking-[0.1em] text-primary">Κατάσταση</h2>
        <div className="mt-3 flex flex-wrap gap-2">
          {STATUSES.map((s) => {
            const cls = `rounded-full border px-3 py-1.5 text-[13px] ${order.status === s.v ? 'border-primary bg-primary text-surface' : 'border-border text-body hover:border-primary'}`;
            // Η ακύρωση είναι μη αναστρέψιμη για τον πελάτη — δεν πρέπει να
            // γίνεται με ένα άστοχο κλικ, όπως παντού αλλού στον πίνακα.
            if (s.v === 'cancelled') {
              return (
                <ConfirmForm
                  key={s.v}
                  action={setTourOrderStatus.bind(null, order.id, s.v)}
                  title="Ακύρωση κράτησης"
                  message={`Ακύρωση της κράτησης ${order.public_code}; Ο πελάτης δεν ειδοποιείται αυτόματα — επικοινωνήστε μαζί του.`}
                  confirmLabel="Ναι, ακύρωση"
                >
                  <button type="button" className={cls}>{s.l}</button>
                </ConfirmForm>
              );
            }
            return (
              <form key={s.v} action={setTourOrderStatus.bind(null, order.id, s.v)}>
                <button type="submit" className={cls}>{s.l}</button>
              </form>
            );
          })}
        </div>
      </div>

      <div className="mt-6 rounded-lg border border-border bg-surface p-6">
        <form action={async (fd: FormData) => { 'use server'; await saveTourOrderNotes(order.id, String(fd.get('notes') || '')); }}>
          <h2 className="font-sans text-[13px] font-semibold uppercase tracking-[0.1em] text-primary">Σημειώσεις γραφείου</h2>
          <textarea name="notes" rows={4} defaultValue={order.admin_notes ?? ''} className="mt-3 w-full rounded-md border border-border bg-surface px-4 py-2.5 text-[15px] focus:border-primary focus:outline-none focus:ring-4 focus:ring-primary/10" />
          <div className="mt-3"><Button type="submit" size="sm">Αποθήκευση σημειώσεων</Button></div>
        </form>
      </div>
    </div>
  );
}
