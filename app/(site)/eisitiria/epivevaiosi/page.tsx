import type { Metadata } from 'next';
import Link from 'next/link';
import { BadgeCheck, Bus, TicketCheck } from 'lucide-react';
import { createServerClient } from '@/lib/supabase/server';
import { KIND_LABEL, ORDER_STATUS_LABEL, formatCents } from '@/lib/ticketing';
import type { OrderBundle, OrderTicket } from '@/types/ticketing';

export const metadata: Metadata = {
  title: 'Τα Εισιτήριά σας',
  robots: { index: false },
};

function TicketCard({ ticket, legLabel }: { ticket: OrderTicket; legLabel: string }) {
  return (
    <article className="rounded-lg border border-border bg-surface p-5 shadow-card">
      <div className="mb-3 flex items-center justify-between gap-3 border-b border-dashed border-border pb-3">
        <span className="inline-flex items-center gap-2 text-[13px] font-semibold uppercase tracking-[0.1em] text-primary">
          <Bus className="h-4 w-4" /> {legLabel}
        </span>
        <span className="rounded bg-deep-ink px-3 py-1 font-mono text-[15px] font-bold tracking-[0.2em] text-surface">
          {ticket.code}
        </span>
      </div>
      <dl className="grid grid-cols-2 gap-x-4 gap-y-2 text-[14px] sm:grid-cols-4">
        <div>
          <dt className="text-[12px] uppercase tracking-[0.08em] text-muted">Επιβάτης</dt>
          <dd className="font-semibold text-body">{ticket.passenger_name}</dd>
        </div>
        <div>
          <dt className="text-[12px] uppercase tracking-[0.08em] text-muted">Θέση</dt>
          <dd className="font-semibold text-body">{ticket.seat_no ?? 'Ανοιχτή'}</dd>
        </div>
        <div>
          <dt className="text-[12px] uppercase tracking-[0.08em] text-muted">Ναύλος</dt>
          <dd className="font-semibold text-body">{ticket.fare_name}</dd>
        </div>
        <div>
          <dt className="text-[12px] uppercase tracking-[0.08em] text-muted">Τιμή</dt>
          <dd className="font-semibold text-body">{formatCents(ticket.price_cents)}</dd>
        </div>
      </dl>
      {ticket.open_return && (
        <p className="mt-3 rounded bg-gold/15 px-3 py-2 text-[13px] text-deep-ink">
          Ανοιχτή επιστροφή — εξαργυρώνεται σε δρομολόγιο της επιλογής σας
          {ticket.open_return_expires_on &&
            ` έως ${new Date(`${ticket.open_return_expires_on}T12:00:00`).toLocaleDateString('el-GR')}`}
          . Καλέστε μας για να κλείσετε θέση.
        </p>
      )}
    </article>
  );
}

export default async function EpivevaiosiPage({
  searchParams,
}: {
  searchParams: Promise<{ t?: string }>;
}) {
  const { t } = await searchParams;
  if (!t) {
    return <Message text="Δεν βρέθηκε κράτηση." />;
  }

  const sb = await createServerClient();
  const { data, error } = await sb.rpc('get_order_by_token', { p_token: t });
  if (error) console.error('epivevaiosi bundle:', error.message);
  const bundle = (data ?? { ok: false, error: 'db' }) as OrderBundle;
  if (!bundle.ok) return <Message text="Η κράτηση δεν βρέθηκε." />;

  const { order, legs, tickets } = bundle;
  const legLabel = (leg: 'outbound' | 'return') => {
    const l = legs.find((x) => x.leg === leg);
    if (!l) return leg === 'outbound' ? 'Αναχώρηση' : 'Ανοιχτή Επιστροφή';
    return `${l.origin} → ${l.destination} · ${new Date(`${l.service_date}T12:00:00`).toLocaleDateString('el-GR')} · ${l.time}`;
  };

  return (
    <section className="py-14 md:py-20">
      <div className="container max-w-3xl">
        <div className="mb-8 rounded-lg border border-olive/30 bg-olive/10 p-6 text-center">
          <BadgeCheck className="mx-auto mb-2 h-10 w-10 text-olive" />
          <h1 className="font-display text-3xl font-semibold text-primary">
            {tickets.length > 0 ? 'Τα εισιτήριά σας εκδόθηκαν' : 'Η κράτησή σας'}
          </h1>
          <p className="mt-2 text-[15px] text-muted">
            Κωδικός κράτησης: <span className="font-mono font-bold text-body">{order.public_code}</span>
            {' · '}{KIND_LABEL[order.kind]}
            {' · '}
            <span className="font-semibold">{ORDER_STATUS_LABEL[order.status] ?? order.status}</span>
          </p>
          {order.status === 'offline' && (
            <p className="mt-2 text-[14px] text-muted">
              Η εξόφληση γίνεται στο γραφείο μας ή στο λεωφορείο πριν την αναχώρηση.
            </p>
          )}
        </div>

        <div className="grid gap-4">
          {tickets.map((ticket) => (
            <TicketCard key={ticket.id} ticket={ticket} legLabel={legLabel(ticket.leg)} />
          ))}
        </div>

        <div className="mt-8 flex items-center justify-between rounded-lg border border-border bg-surface px-6 py-4 shadow-card">
          <span className="inline-flex items-center gap-2 text-[15px] text-muted">
            <TicketCheck className="h-5 w-5 text-primary" /> Σύνολο ({tickets.length} εισιτήρια)
          </span>
          <span className="font-display text-2xl font-bold text-primary">{formatCents(order.amount_total_cents)}</span>
        </div>

        <p className="mt-6 text-center text-[13px] leading-relaxed text-muted">
          Φυλάξτε αυτή τη σελίδα ή το email επιβεβαίωσης — ο κωδικός κάθε εισιτηρίου ζητείται κατά την επιβίβαση.
          Ακύρωση έως 8 ώρες πριν την αναχώρηση: επιστροφή 70% · εντός 8 ωρών: 50%.
        </p>
        <p className="mt-4 text-center">
          <Link href="/eisitiria" className="font-medium text-primary hover:underline">← Νέα αναζήτηση</Link>
        </p>
      </div>
    </section>
  );
}

function Message({ text }: { text: string }) {
  return (
    <section className="py-24">
      <div className="container max-w-2xl text-center">
        <p className="mb-6 text-[16px] text-muted">{text}</p>
        <Link href="/eisitiria" className="font-medium text-primary hover:underline">← Νέα αναζήτηση</Link>
      </div>
    </section>
  );
}
