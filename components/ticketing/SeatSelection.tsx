'use client';
import { useState, useTransition } from 'react';
import Link from 'next/link';
import { Button } from '@/components/ui/Button';
import { SeatLegend, SeatMap } from '@/components/ticketing/SeatMap';
import { beginCheckout } from '@/app/(site)/eisitiria/actions';
import type { LayoutJson, TripKind } from '@/types/ticketing';

const MAX_SEATS = 10;

const ERROR_TEXT: Record<string, string> = {
  seat_taken: 'Κάποια από τις θέσεις μόλις κλείστηκε από άλλον επιβάτη. Επιλέξτε διαφορετική θέση.',
  seats_mismatch: 'Πρέπει να επιλέξετε ίδιο αριθμό θέσεων για τα δρομολόγια αναχώρησης και επιστροφής.',
  sales_closed: 'Οι online πωλήσεις για αυτό το δρομολόγιο έχουν κλείσει.',
  trip_not_found: 'Το δρομολόγιο δεν είναι πλέον διαθέσιμο.',
  no_seats: 'Επιλέξτε τουλάχιστον μία θέση.',
  db: 'Κάτι πήγε στραβά. Δοκιμάστε ξανά.',
};

export type SeatLegData = {
  tripId: string;
  title: string;
  routeLabel: string;
  dateLabel: string;
  time: string;
  layout: LayoutJson;
  taken: string[];
};

export function SeatSelection({ kind, legs, backHref }: { kind: TripKind; legs: SeatLegData[]; backHref: string }) {
  const [selections, setSelections] = useState<string[][]>(legs.map(() => []));
  const [error, setError] = useState<string | null>(null);
  const [pending, startTransition] = useTransition();

  const toggle = (legIdx: number, seat: string) => {
    setError(null);
    setSelections((prev) =>
      prev.map((seats, i) => {
        if (i !== legIdx) return seats;
        if (seats.includes(seat)) return seats.filter((s) => s !== seat);
        return seats.length >= MAX_SEATS ? seats : [...seats, seat];
      })
    );
  };

  return (
    <div>
      {legs.map((leg, i) => (
        <section key={leg.tripId} className="mb-10">
          <h2 className="font-display text-2xl font-semibold text-primary md:text-3xl">{leg.title}</h2>
          <p className="mb-4 mt-1 inline-block rounded bg-deep-ink px-3 py-1 text-[13px] italic text-surface/90">
            επιλέξτε τις θέσεις στις οποίες θέλετε να ταξιδέψετε
          </p>
          <div className="overflow-hidden rounded-lg border border-gold shadow-card">
            <div className="flex flex-wrap items-center justify-between gap-3 bg-gradient-to-r from-amber to-gold px-5 py-3">
              <span className="font-display text-lg font-semibold text-deep-ink">{leg.routeLabel}</span>
              <span className="text-[14px] font-semibold text-deep-ink">{leg.dateLabel} · {leg.time}</span>
            </div>
            <div className="bg-gold/20 px-5 py-2 text-[14px] font-semibold text-deep-ink" aria-live="polite">
              {selections[i].length} επιλεγμένες θέσεις
              {selections[i].length > 0 && `: ${[...selections[i]].sort((a, b) => Number(a) - Number(b)).join(', ')}`}
            </div>
            <div className="bg-surface px-3 py-6">
              <SeatMap
                layout={leg.layout}
                taken={leg.taken}
                selected={selections[i]}
                maxSeats={MAX_SEATS}
                onToggle={(seat) => toggle(i, seat)}
              />
              <SeatLegend />
            </div>
          </div>
        </section>
      ))}

      <p className="mb-6 text-center text-[12px] uppercase tracking-[0.06em] text-muted">
        * Η διάταξη των θέσεων ενδέχεται να αλλάξει σε περίπτωση που αντικατασταθεί το λεωφορείο που θα εκτελέσει το δρομολόγιο.
      </p>

      {error && <p className="mb-4 rounded-md border border-cta/30 bg-cta/5 px-4 py-3 text-center text-[14px] text-cta">{error}</p>}

      <div className="flex items-center justify-between">
        <Link href={backHref} className="text-[14px] font-medium text-muted hover:text-primary">← Πίσω στα δρομολόγια</Link>
        <Button
          size="lg"
          disabled={pending}
          onClick={() => {
            if (selections[0].length === 0) { setError(ERROR_TEXT.no_seats); return; }
            if (kind === 'round' && selections[0].length !== selections[1]?.length) {
              setError(ERROR_TEXT.seats_mismatch);
              return;
            }
            startTransition(async () => {
              const res = await beginCheckout({
                kind,
                legs: legs.map((leg, i) => ({ tripId: leg.tripId, seats: selections[i] })),
              });
              // beginCheckout redirects on success; a return value means failure.
              if (res && !res.ok) setError(ERROR_TEXT[res.error] ?? ERROR_TEXT.db);
            });
          }}
        >
          {pending ? 'Δέσμευση θέσεων…' : 'Επόμενο →'}
        </Button>
      </div>
    </div>
  );
}
