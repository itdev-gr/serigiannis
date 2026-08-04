import Link from 'next/link';
import { getAdminTourOrders } from '@/lib/queries/tour-orders';
import { formatCents } from '@/lib/booking';
import { OrderStatusBadge } from '@/components/admin/StatusBadge';
import { AdminPageHeader } from '@/components/admin/ui';

const FILTERS: { key: string; label: string }[] = [
  { key: '', label: 'Όλες' },
  { key: 'paid', label: 'Πληρωμένες' },
  { key: 'awaiting_payment', label: 'Αναμονή πληρωμής' },
  { key: 'offline', label: 'Πληρωμή στο γραφείο' },
  { key: 'cancelled', label: 'Ακυρωμένες' },
  { key: 'expired', label: 'Ληγμένες' },
];

export default async function TourBookingsPage({
  searchParams,
}: {
  searchParams: Promise<{ status?: string; q?: string }>;
}) {
  const { status, q } = await searchParams;
  let orders = await getAdminTourOrders(status || undefined);
  if (q) {
    const needle = q.toLowerCase();
    orders = orders.filter((o) =>
      [o.public_code, o.customer_name, o.email, o.phone, o.tour_title].some((v) => v?.toLowerCase().includes(needle))
    );
  }

  return (
    <div className="max-w-5xl">
      <AdminPageHeader
        title="Κρατήσεις Εκδρομών"
        subtitle="Online κρατήσεις από τις σελίδες των εκδρομών."
      />

      <div className="mb-4 flex flex-wrap items-center gap-2">
        {FILTERS.map((f) => (
          <Link
            key={f.key}
            href={f.key ? `/admin/bookings?status=${f.key}` : '/admin/bookings'}
            className={`rounded-md border px-3 py-1.5 text-[13px] font-medium ${
              (status ?? '') === f.key ? 'border-primary bg-primary text-surface' : 'border-border bg-surface text-muted hover:text-primary'
            }`}
          >
            {f.label}
          </Link>
        ))}
        <form className="ml-auto" action="/admin/bookings">
          {status && <input type="hidden" name="status" value={status} />}
          <input
            name="q"
            defaultValue={q ?? ''}
            placeholder="Αναζήτηση κωδικού / ονόματος…"
            className="w-64 rounded-md border border-border bg-surface px-3 py-2 text-[14px] focus:border-primary focus:outline-none"
          />
        </form>
      </div>

      <div className="overflow-x-auto">
        <div className="min-w-[760px] overflow-hidden rounded-lg border border-border bg-surface">
          <div className="grid grid-cols-[6rem_1fr_1fr_6rem_9rem_auto] items-center gap-3 border-b border-border bg-background/50 px-4 py-3 font-sans text-[12px] uppercase tracking-[0.1em] text-muted">
            <div>Κωδικός</div>
            <div>Πελάτης</div>
            <div>Εκδρομή</div>
            <div>Σύνολο</div>
            <div>Κατάσταση</div>
            <div className="text-right">Ημ/νία</div>
          </div>
          {orders.map((o) => (
            <Link
              key={o.id}
              href={`/admin/bookings/${o.id}`}
              className="grid grid-cols-[6rem_1fr_1fr_6rem_9rem_auto] items-center gap-3 border-b border-border/60 px-4 py-3 last:border-0 hover:bg-primary/5"
            >
              <span className="font-mono text-[13px] font-semibold text-primary">{o.public_code}</span>
              <span className="truncate text-[14px] text-body">
                {o.customer_name ?? '—'}
                <span className="block truncate text-[12px] text-muted">{o.phone} {o.email && `· ${o.email}`}</span>
              </span>
              <span className="truncate text-[14px] text-body">
                {o.tour_title}
                <span className="block truncate text-[12px] text-muted">
                  {o.departure_date ? new Date(`${o.departure_date}T12:00:00`).toLocaleDateString('el-GR') : 'χωρίς ημερομηνία'}
                  {' · '}{o.party_size} άτ.
                </span>
              </span>
              <span className="text-[14px] font-semibold text-body">{formatCents(o.amount_total_cents)}</span>
              <OrderStatusBadge status={o.status} />
              <span className="text-right text-[13px] text-muted">
                {new Date(o.created_at).toLocaleDateString('el-GR', { day: '2-digit', month: '2-digit', hour: '2-digit', minute: '2-digit' })}
              </span>
            </Link>
          ))}
          {orders.length === 0 && <p className="px-4 py-6 text-[14px] text-muted">Δεν υπάρχουν κρατήσεις εκδρομών.</p>}
        </div>
      </div>
    </div>
  );
}
