import Link from 'next/link';
import { getAdminOrders } from '@/lib/queries/ticketing';
import { ORDER_STATUS_LABEL, KIND_LABEL, formatCents } from '@/lib/ticketing';
import { Button } from '@/components/ui/Button';
import type { TripKind } from '@/types/ticketing';

const STATUS_STYLE: Record<string, string> = {
  paid: 'bg-olive/15 text-olive',
  offline: 'bg-gold/25 text-deep-ink',
  awaiting_payment: 'bg-amber/20 text-deep-ink',
  pending: 'bg-background text-muted',
  cancelled: 'bg-cta/10 text-cta',
  expired: 'bg-background text-muted',
};

const FILTERS: { key: string; label: string }[] = [
  { key: '', label: 'Όλες' },
  { key: 'offline', label: 'Πληρωμή στο γραφείο' },
  { key: 'paid', label: 'Πληρωμένες' },
  { key: 'cancelled', label: 'Ακυρωμένες' },
  { key: 'expired', label: 'Ληγμένες' },
];

export default async function OrdersPage({ searchParams }: { searchParams: Promise<{ status?: string; q?: string }> }) {
  const { status, q } = await searchParams;
  let orders = await getAdminOrders(status || undefined);
  if (q) {
    const needle = q.toLowerCase();
    orders = orders.filter((o) =>
      [o.public_code, o.customer_name, o.email, o.phone].some((v) => v?.toLowerCase().includes(needle))
    );
  }

  return (
    <div className="max-w-5xl">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <h1 className="font-display text-4xl font-semibold text-primary">Εισιτήρια / Κρατήσεις</h1>
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
        <form className="ml-auto" action="/admin/orders">
          {status && <input type="hidden" name="status" value={status} />}
          <input
            name="q"
            defaultValue={q ?? ''}
            placeholder="Αναζήτηση κωδικού / ονόματος…"
            className="w-64 rounded-md border border-border bg-surface px-3 py-2 text-[14px] focus:border-primary focus:outline-none"
          />
        </form>
      </div>

      <div className="mt-4 overflow-hidden rounded-lg border border-border bg-surface">
        <div className="grid grid-cols-[7rem_1fr_9rem_7rem_9rem_auto] items-center gap-3 border-b border-border bg-background/50 px-4 py-3 font-sans text-[12px] uppercase tracking-[0.1em] text-muted">
          <div>Κωδικός</div>
          <div>Πελάτης</div>
          <div>Τύπος</div>
          <div>Σύνολο</div>
          <div>Κατάσταση</div>
          <div className="text-right">Ημ/νία</div>
        </div>
        {orders.map((o) => (
          <Link
            key={o.id}
            href={`/admin/orders/${o.id}`}
            className="grid grid-cols-[7rem_1fr_9rem_7rem_9rem_auto] items-center gap-3 border-b border-border/60 px-4 py-3 last:border-0 hover:bg-primary/5"
          >
            <span className="font-mono text-[13px] font-semibold text-primary">{o.public_code}</span>
            <span className="truncate text-[14px] text-body">
              {o.customer_name ?? '—'}
              <span className="block truncate text-[12px] text-muted">{o.phone} {o.email && `· ${o.email}`}</span>
            </span>
            <span className="text-[13px] text-muted">{KIND_LABEL[o.kind as TripKind] ?? o.kind}{o.created_by_admin && ' · τηλ.'}</span>
            <span className="text-[14px] font-semibold text-body">{formatCents(o.amount_total_cents)}</span>
            <span className={`w-fit rounded-full px-2.5 py-0.5 text-[12px] font-semibold ${STATUS_STYLE[o.status] ?? 'bg-background text-muted'}`}>
              {ORDER_STATUS_LABEL[o.status] ?? o.status}
            </span>
            <span className="text-right text-[13px] text-muted">
              {new Date(o.created_at).toLocaleDateString('el-GR', { day: '2-digit', month: '2-digit', hour: '2-digit', minute: '2-digit' })}
            </span>
          </Link>
        ))}
        {orders.length === 0 && <p className="px-4 py-6 text-[14px] text-muted">Δεν υπάρχουν κρατήσεις.</p>}
      </div>
    </div>
  );
}
