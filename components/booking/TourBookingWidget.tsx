'use client';
import { useMemo, useState, useTransition } from 'react';
import Link from 'next/link';
import { CalendarDays, Minus, Plus } from 'lucide-react';
import { Button } from '@/components/ui/Button';
import { beginTourBooking } from '@/app/(site)/kratisi/actions';
import {
  buildOrderItems,
  clampQty,
  departureLabel,
  formatCents,
  headlinePrice,
  itemsPartySize,
  itemsTotalCents,
} from '@/lib/booking';
import type { TourDeparture, TourPriceTier } from '@/types/db';

const ERROR_TEXT: Record<string, string> = {
  tour_not_found: 'Η εκδρομή δεν είναι διαθέσιμη για κράτηση.',
  bookings_closed: 'Οι κρατήσεις για αυτή την εκδρομή έχουν κλείσει. Καλέστε μας για διαθεσιμότητα.',
  departure_required: 'Επιλέξτε ημερομηνία αναχώρησης.',
  departure_not_found: 'Η ημερομηνία δεν είναι πλέον διαθέσιμη. Επιλέξτε άλλη.',
  invalid_tier: 'Οι τιμές άλλαξαν. Ανανεώστε τη σελίδα και δοκιμάστε ξανά.',
  qty_too_high: 'Ο αριθμός ατόμων ξεπερνά το επιτρεπτό όριο.',
  no_people: 'Επιλέξτε τουλάχιστον ένα άτομο.',
  zero_total: 'Επικοινωνήστε μαζί μας για την τιμή αυτής της εκδρομής.',
  sold_out: 'Δεν υπάρχουν αρκετές διαθέσιμες θέσεις για την ημερομηνία αυτή.',
  db: 'Κάτι πήγε στραβά. Δοκιμάστε ξανά ή καλέστε μας.',
};

function QtyInput({
  value,
  max,
  label,
  onChange,
}: {
  value: number;
  max: number;
  label: string;
  onChange: (n: number) => void;
}) {
  return (
    <div className="flex items-center rounded-md border border-border bg-surface">
      <button
        type="button"
        aria-label={`Μείωση, ${label}`}
        onClick={() => onChange(Math.max(0, value - 1))}
        className="grid h-11 w-11 shrink-0 place-items-center text-muted transition hover:text-primary disabled:opacity-40"
        disabled={value <= 0}
      >
        <Minus className="h-4 w-4" strokeWidth={2} />
      </button>
      <input
        type="number"
        inputMode="numeric"
        min={0}
        max={max}
        value={value}
        aria-label={`Άτομα, ${label}`}
        onChange={(e) => onChange(clampQty(e.target.value, max))}
        className="w-10 border-x border-border bg-transparent py-2 text-center font-sans text-[15px] font-semibold text-body focus:outline-none focus:ring-2 focus:ring-inset focus:ring-primary/20 [appearance:textfield] [&::-webkit-inner-spin-button]:appearance-none [&::-webkit-outer-spin-button]:appearance-none"
      />
      <button
        type="button"
        aria-label={`Αύξηση, ${label}`}
        onClick={() => onChange(Math.min(max, value + 1))}
        className="grid h-11 w-11 shrink-0 place-items-center text-muted transition hover:text-primary disabled:opacity-40"
        disabled={value >= max}
      >
        <Plus className="h-4 w-4" strokeWidth={2} />
      </button>
    </div>
  );
}

/** The tour-page booking box: pick a departure, pick people per price category,
 *  see the live total, pay online. Prices are re-validated server-side. */
export function TourBookingWidget({
  tourId,
  tourSlug,
  tiers,
  departures,
  payOnline,
}: {
  tourId: string;
  tourSlug: string;
  tiers: TourPriceTier[];
  departures: TourDeparture[];
  /** false when PAYMENT_PROVIDER=offline — the booking is registered, not charged. */
  payOnline: boolean;
}) {
  const [departureId, setDepartureId] = useState(departures.length === 1 ? departures[0].id : '');
  const [qty, setQty] = useState<Record<string, number>>(() =>
    Object.fromEntries(tiers.map((t, i) => [t.id, i === 0 ? 1 : 0]))
  );
  const [error, setError] = useState<string | null>(null);
  const [pending, startTransition] = useTransition();

  const items = useMemo(() => buildOrderItems(tiers, qty), [tiers, qty]);
  const total = itemsTotalCents(items);
  const people = itemsPartySize(items);
  const headline = headlinePrice(tiers);

  function submit() {
    setError(null);
    if (departures.length > 0 && !departureId) {
      setError(ERROR_TEXT.departure_required);
      return;
    }
    if (people === 0) {
      setError(ERROR_TEXT.no_people);
      return;
    }
    startTransition(async () => {
      const res = await beginTourBooking({
        tourId,
        departureId: departureId || null,
        items: items.map((i) => ({ tier_id: i.tier_id, qty: i.qty })),
      });
      // On success the action redirects; only failures come back.
      if (res && !res.ok) setError(ERROR_TEXT[res.error] ?? ERROR_TEXT.db);
    });
  }

  return (
    <div className="rounded-2xl border border-border bg-surface p-6 shadow-card sm:p-7">
      {headline && (
        <div className="flex items-baseline gap-2.5">
          {headline.originalCents != null && (
            <span className="font-sans text-[17px] text-muted line-through">{formatCents(headline.originalCents)}</span>
          )}
          <span className="font-display text-4xl font-bold text-cta">{formatCents(headline.cents)}</span>
          <span className="font-sans text-[13px] text-muted">/ άτομο</span>
        </div>
      )}

      {departures.length > 0 && (
        <label className="mt-6 block">
          <span className="mb-1.5 block font-sans text-[13px] font-medium uppercase tracking-[0.1em] text-primary">
            Ημερομηνία αναχώρησης
          </span>
          <div className="relative">
            <select
              value={departureId}
              onChange={(e) => setDepartureId(e.target.value)}
              className="w-full appearance-none rounded-md border border-border bg-surface py-2.5 pl-4 pr-11 font-sans text-[15px] text-body transition focus:border-primary focus:outline-none focus:ring-4 focus:ring-primary/10"
            >
              <option value="">— Επιλέξτε ημερομηνία —</option>
              {departures.map((d) => (
                <option key={d.id} value={d.id}>
                  {departureLabel(d)}
                </option>
              ))}
            </select>
            <CalendarDays className="pointer-events-none absolute right-3.5 top-1/2 h-5 w-5 -translate-y-1/2 text-primary/60" strokeWidth={1.75} />
          </div>
        </label>
      )}

      <ul className="mt-6 space-y-3.5">
        {tiers.map((t) => {
          const discounted = t.price_original_cents != null && t.price_original_cents > t.price_cents;
          return (
            <li key={t.id} className="flex items-center justify-between gap-4">
              <div className="min-w-0">
                <span className="block font-sans text-[14px] text-body">{t.label}</span>
                <span className="mt-0.5 flex items-baseline gap-2">
                  {discounted && (
                    <span className="font-sans text-[13px] text-muted line-through">
                      {formatCents(t.price_original_cents as number)}
                    </span>
                  )}
                  <span className="font-sans text-[15px] font-semibold text-primary">{formatCents(t.price_cents)}</span>
                </span>
              </div>
              <QtyInput
                value={qty[t.id] ?? 0}
                max={t.max_qty}
                label={t.label}
                onChange={(n) => setQty((q) => ({ ...q, [t.id]: n }))}
              />
            </li>
          );
        })}
      </ul>

      <div className="mt-6 flex items-baseline justify-between border-t border-border pt-5">
        <span className="font-sans text-[15px] font-semibold text-primary">Σύνολο</span>
        <span className="font-display text-2xl font-bold text-primary" aria-live="polite">
          {formatCents(total)}
        </span>
      </div>
      {people > 0 && (
        <p className="mt-1 text-right font-sans text-[13px] text-muted">
          {people === 1 ? '1 άτομο' : `${people} άτομα`}
        </p>
      )}

      {error && <p className="mt-4 rounded-md bg-cta/5 px-4 py-3 font-sans text-[14px] text-cta">{error}</p>}

      <Button type="button" variant="accent" size="lg" className="mt-5 w-full" onClick={submit} disabled={pending}>
        {pending ? 'Παρακαλώ περιμένετε…' : 'Κάντε Κράτηση'}
      </Button>
      <p className="mt-3 text-center font-sans text-[13px] text-muted">
        {payOnline ? 'Εξόφληση online με κάρτα. Χωρίς κρυφές χρεώσεις.' : 'Εξόφληση στο γραφείο. Χωρίς κρυφές χρεώσεις.'}
      </p>
      <p className="mt-2 text-center font-sans text-[13px] text-muted">
        Χρειάζεστε κάτι διαφορετικό;{' '}
        <Link href={`/kratisi?tour=${tourSlug}`} className="font-semibold text-primary hover:text-cta">
          Ζητήστε προσφορά
        </Link>
      </p>
    </div>
  );
}
