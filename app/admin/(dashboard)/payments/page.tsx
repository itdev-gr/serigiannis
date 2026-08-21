import Link from 'next/link';
import { RefreshCw } from 'lucide-react';
import { athensDateTimeLabel } from '@/lib/athens-time';
import { getAdminVivaTransactions, type AdminVivaTransaction } from '@/lib/queries/viva-transactions';
import { methodLabel, sourceLabel } from '@/lib/payments/viva-report';
import { formatCents } from '@/lib/booking';
import { searchNormalize } from '@/lib/filters';
import { AdminPageHeader, Pill, type PillTone } from '@/components/admin/ui';
import { AdminSearch } from '@/components/admin/AdminSearch';
import { syncRecentVivaTransactions } from './actions';

const CHANNEL_FILTERS: { key: string; label: string }[] = [
  { key: '', label: 'Όλες' },
  { key: 'site', label: 'Site' },
  { key: 'pos', label: 'POS' },
  { key: 'link', label: 'Payment Links' },
  { key: 'iris', label: 'IRIS' },
  { key: 'failed', label: 'Αποτυχημένες' },
];

function channelOf(t: AdminVivaTransaction): string {
  const label = sourceLabel(t.source_code, t.terminal_id);
  if (label === 'Site') return 'site';
  if (label === 'POS') return 'pos';
  if (label === 'Payment Link') return 'link';
  return 'other';
}

function matchesFilter(t: AdminVivaTransaction, f: string): boolean {
  if (!f) return true;
  if (f === 'iris') return t.payment_method === 'iris';
  if (f === 'failed') return t.status !== 'F';
  return channelOf(t) === f;
}

const METHOD_TONE: Record<string, PillTone> = { iris: 'ok', card: 'info', wallet: 'info', other: 'muted' };
const CHANNEL_TONE: Record<string, PillTone> = { site: 'info', pos: 'warn', link: 'warn', other: 'muted' };

/** Χρεώσεις POS: η Viva δεν έχει στοιχεία πελάτη (ανέπαφη κάρτα) — ό,τι
 *  υπάρχει για ταυτοποίηση είναι η κάρτα και η τράπεζά της. */
function cardIdentity(t: AdminVivaTransaction): string | null {
  if (!t.card_number && !t.card_type) return null;
  const parts = [
    `Κάρτα${t.card_type ? ` ${t.card_type}` : ''}${t.card_number ? ` •${t.card_number.slice(-4)}` : ''}`,
  ];
  if (t.issuing_bank) parts.push(t.issuing_bank);
  return parts.join(' — ');
}

function statusPill(status: string) {
  if (status === 'F') return <Pill tone="ok">Επιτυχής</Pill>;
  if (status === 'E') return <Pill tone="danger">Αποτυχία</Pill>;
  if (status === 'R') return <Pill tone="warn">Επιστροφή</Pill>;
  if (status === 'A') return <Pill tone="info">Δέσμευση</Pill>;
  return <Pill tone="muted">{status}</Pill>;
}


export default async function AdminPaymentsPage({
  searchParams,
}: {
  searchParams: Promise<{ f?: string; q?: string }>;
}) {
  const { f = '', q } = await searchParams;
  let rows = (await getAdminVivaTransactions()).filter((t) => matchesFilter(t, f));
  if (q) {
    const needle = searchNormalize(q);
    rows = rows.filter((t) =>
      [t.full_name, t.email, t.customer_trns, t.order_code, t.card_number].some(
        (v) => v && searchNormalize(v).includes(needle)
      )
    );
  }

  return (
    <div className="max-w-6xl">
      <AdminPageHeader
        title="Πληρωμές"
        subtitle="Όλες οι συναλλαγές Viva — από το site, το POS του γραφείου και τα payment links."
      />

      <div className="mb-4 flex flex-wrap items-center gap-2">
        {CHANNEL_FILTERS.map((c) => (
          <Link
            key={c.key}
            href={c.key ? `/admin/payments?f=${c.key}` : '/admin/payments'}
            className={`rounded-md border px-3 py-1.5 text-[13px] font-medium ${
              f === c.key ? 'border-primary bg-primary text-surface' : 'border-border bg-surface text-muted hover:text-primary'
            }`}
          >
            {c.label}
          </Link>
        ))}
        <AdminSearch action="/admin/payments" placeholder="Αναζήτηση ονόματος / email / ποσού…" defaultValue={q} hidden={{ f }} />
        <form action={syncRecentVivaTransactions}>
          <button
            type="submit"
            className="inline-flex items-center gap-1.5 rounded-md border border-border bg-surface px-3 py-1.5 text-[13px] font-medium text-muted hover:text-primary"
          >
            <RefreshCw className="h-3.5 w-3.5" /> Συγχρονισμός
          </button>
        </form>
      </div>

      {f === 'pos' && (
        <p className="mb-3 rounded-md border border-border bg-surface px-4 py-2.5 text-[13px] text-muted">
          Οι χρεώσεις POS δεν έχουν στοιχεία πελάτη — ο πελάτης περνά μόνο την κάρτα του στο τερματικό.
          Η αντιστοίχιση γίνεται με τον αριθμό απόδειξης του POS και την κάρτα.
        </p>
      )}

      <div className="overflow-x-auto">
        <div className="min-w-[860px] overflow-hidden rounded-lg border border-border bg-surface">
          <div className="grid grid-cols-[7.5rem_5.5rem_7rem_7.5rem_1fr_7rem_6rem] items-center gap-3 border-b border-border bg-background/50 px-4 py-3 font-sans text-[12px] uppercase tracking-[0.1em] text-muted">
            <div>Ημ/νία</div>
            <div>Ποσό</div>
            <div>Μέθοδος</div>
            <div>Κανάλι</div>
            <div>Πελάτης / Περιγραφή</div>
            <div>Κατάσταση</div>
            <div className="text-right">Κράτηση</div>
          </div>
          {rows.map((t) => (
            <div
              key={t.transaction_id}
              className="grid grid-cols-[7.5rem_5.5rem_7rem_7.5rem_1fr_7rem_6rem] items-center gap-3 border-b border-border/60 px-4 py-3 last:border-0"
            >
              <span className="font-mono text-[13px] text-body">{athensDateTimeLabel(t.occurred_at)}</span>
              <span className="text-[14px] font-semibold text-body">{formatCents(t.amount_cents)}</span>
              <span className="flex flex-col gap-0.5">
                <Pill tone={METHOD_TONE[t.payment_method] ?? 'muted'}>{methodLabel(t.payment_method)}</Pill>
                {t.card_number && <span className="pl-1 font-mono text-[11px] text-muted">•{t.card_number.slice(-4)}</span>}
              </span>
              <Pill tone={CHANNEL_TONE[channelOf(t)] ?? 'muted'}>{sourceLabel(t.source_code, t.terminal_id)}</Pill>
              <span className="truncate text-[14px] text-body">
                {t.full_name ?? t.customer_trns ?? cardIdentity(t) ?? '—'}
                {t.email && <span className="block truncate text-[12px] text-muted">{t.email}</span>}
                {!t.full_name && !t.customer_trns && t.receipt_ref && (
                  <span className="block truncate text-[12px] text-muted">Απόδειξη #{t.receipt_ref}</span>
                )}
              </span>
              {statusPill(t.status)}
              <span className="text-right">
                {t.order_id ? (
                  <Link
                    href={t.order_family === 'tour' ? `/admin/bookings/${t.order_id}` : `/admin/orders/${t.order_id}`}
                    className="text-[13px] font-medium text-primary hover:underline"
                  >
                    Προβολή
                  </Link>
                ) : (
                  <span className="text-[13px] text-muted">—</span>
                )}
              </span>
            </div>
          ))}
          {rows.length === 0 && (
            <p className="px-4 py-8 text-center text-[14px] text-muted">
              Καμία συναλλαγή. Πατήστε «Συγχρονισμός» για ανανέωση από τη Viva.
            </p>
          )}
        </div>
      </div>
    </div>
  );
}
