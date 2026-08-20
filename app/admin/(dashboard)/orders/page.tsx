import Link from 'next/link';
import { athensShortDateTimeLabel } from '@/lib/athens-time';
import { getAdminOrders } from '@/lib/queries/ticketing';
import { formatCents } from '@/lib/ticketing';
import { OrderStatusBadge } from '@/components/admin/StatusBadge';
import { Pill } from '@/components/admin/ui';
import { methodLabel } from '@/lib/payments/viva-report';
import { Button } from '@/components/ui/Button';
import { AdminSearch } from '@/components/admin/AdminSearch';
import { searchNormalize } from '@/lib/filters';

const FILTERS: { key: string; label: string }[] = [
  { key: '', label: 'Όλες' },
  { key: 'offline', label: 'Πληρωμή στο γραφείο' },
  { key: 'paid', label: 'Πληρωμένες' },
  // Χωρίς αυτά τα δύο, μια κράτηση κολλημένη σε πληρωμή δεν φιλτραριζόταν
  // πουθενά — έπρεπε να τη βρεις με το μάτι μέσα στις «Όλες».
  { key: 'awaiting_payment', label: 'Σε πληρωμή' },
  { key: 'pending', label: 'Σε εξέλιξη' },
  { key: 'cancelled', label: 'Ακυρωμένες' },
  { key: 'expired', label: 'Ληγμένες' },
];

export default async function OrdersPage({ searchParams }: { searchParams: Promise<{ status?: string; q?: string }> }) {
  const { status, q } = await searchParams;
  let orders = await getAdminOrders(status || undefined);
  if (q) {
    const needle = searchNormalize(q);
    orders = orders.filter((o) =>
      [o.public_code, o.customer_name, o.email, o.phone].some((v) => v && searchNormalize(v).includes(needle))
    );
  }

  return (
    <div className="max-w-5xl">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <h1 className="font-display text-4xl font-semibold text-primary">Κρατήσεις Εισιτηρίων</h1>
        <Button asChild variant="outline"><Link href="/admin/orders/validate">Επικύρωση εισιτηρίου</Link></Button>
      </div>

      <div className="mt-6 flex flex-wrap items-center gap-2">
        {FILTERS.map((f) => (
          <Link
            key={f.key}
            href={f.key ? `/admin/orders?status=${f.key}` : '/admin/orders'}
            className={`rounded-md border px-3 py-1.5 text-[13px] font-medium ${
              (status ?? '') === f.key ? 'border-primary bg-primary text-surface' : 'border-border bg-surface text-muted hover:text-primary'
            }`}
          >
            {f.label}
          </Link>
        ))}
        <AdminSearch
          action="/admin/orders"
          placeholder="Αναζήτηση κωδικού / ονόματος…"
          defaultValue={q}
          hidden={{ status }}
        />
      </div>

      <div className="mt-4 overflow-x-auto">
        <div className="min-w-[720px] overflow-hidden rounded-lg border border-border bg-surface">
          <div className="grid grid-cols-[7rem_1fr_7rem_9rem_auto] items-center gap-3 border-b border-border bg-background/50 px-4 py-3 font-sans text-[12px] uppercase tracking-[0.1em] text-muted">
            <div>Κωδικός</div>
            <div>Πελάτης</div>
            <div>Σύνολο</div>
            <div>Κατάσταση</div>
            <div className="text-right">Ημ/νία</div>
          </div>
          {orders.map((o) => (
            <Link
              key={o.id}
              href={`/admin/orders/${o.id}`}
              className="grid grid-cols-[7rem_1fr_7rem_9rem_auto] items-center gap-3 border-b border-border/60 px-4 py-3 last:border-0 hover:bg-primary/5"
            >
              <span className="font-mono text-[13px] font-semibold text-primary">{o.public_code}</span>
              <span className="truncate text-[14px] text-body">
                {o.customer_name ?? '—'}
                {o.created_by_admin && <span className="text-[12px] text-muted"> · τηλ.</span>}
                <span className="block truncate text-[12px] text-muted">{o.phone} {o.email && `· ${o.email}`}</span>
              </span>
              <span className="text-[14px] font-semibold text-body">{formatCents(o.amount_total_cents)}</span>
              <span className="flex flex-col items-start gap-1">
                <OrderStatusBadge status={o.status} />
                {o.payment_method && (
                  <Pill tone={o.payment_method === 'iris' ? 'ok' : 'muted'}>{methodLabel(o.payment_method)}</Pill>
                )}
              </span>
              <span className="text-right text-[13px] text-muted">
                {athensShortDateTimeLabel(o.created_at)}
              </span>
            </Link>
          ))}
          {orders.length === 0 && (
            <p className="px-4 py-6 text-[14px] text-muted">
              {q ? `Δεν βρέθηκαν αποτελέσματα για «${q}».` : 'Δεν υπάρχουν κρατήσεις.'}
            </p>
          )}
        </div>
      </div>
    </div>
  );
}
