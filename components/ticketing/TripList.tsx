'use client';
import { useState } from 'react';
import { useRouter, useSearchParams } from 'next/navigation';
import Link from 'next/link';
import { Bus, ChevronLeft, ChevronRight, Clock } from 'lucide-react';
import { Button } from '@/components/ui/Button';
import type { TripKind, TripRow } from '@/types/ticketing';

function shiftDate(date: string, days: number): string {
  const d = new Date(`${date}T12:00:00`);
  d.setDate(d.getDate() + days);
  return d.toISOString().slice(0, 10);
}

function fmtDate(date: string): string {
  return new Date(`${date}T12:00:00`).toLocaleDateString('el-GR', {
    weekday: 'long', day: '2-digit', month: '2-digit', year: 'numeric',
  });
}

function TripsTable({
  title,
  routeLabel,
  date,
  dateParam,
  trips,
  selected,
  onSelect,
}: {
  title: string;
  routeLabel: string;
  date: string;
  dateParam: 'date' | 'ret';
  trips: TripRow[];
  selected: string | null;
  onSelect: (id: string) => void;
}) {
  const router = useRouter();
  const params = useSearchParams();

  const nav = (days: number) => {
    const next = new URLSearchParams(params.toString());
    next.set(dateParam, shiftDate(date, days));
    router.push(`/eisitiria/dromologia?${next.toString()}`);
  };

  return (
    <div className="mb-10">
      <h2 className="font-display text-2xl font-semibold text-primary md:text-3xl">{title}</h2>
      <p className="mb-4 mt-1 inline-block rounded bg-deep-ink px-3 py-1 text-[13px] italic text-surface/90">
        επιλέξτε ένα από τα διαθέσιμα δρομολόγια
      </p>
      <div className="overflow-hidden rounded-lg border border-gold shadow-card">
        <div className="flex flex-wrap items-center justify-between gap-3 bg-gradient-to-r from-amber to-gold px-5 py-3">
          <span className="font-display text-lg font-semibold text-deep-ink">{routeLabel}</span>
          <span className="flex items-center gap-1 rounded-md bg-deep-ink/10 px-2 py-1 text-[13px] font-semibold text-deep-ink">
            <button type="button" aria-label="Προηγούμενη ημέρα" onClick={() => nav(-1)} className="rounded p-1 hover:bg-deep-ink/10">
              <ChevronLeft className="h-4 w-4" />
            </button>
            {fmtDate(date)}
            <button type="button" aria-label="Επόμενη ημέρα" onClick={() => nav(1)} className="rounded p-1 hover:bg-deep-ink/10">
              <ChevronRight className="h-4 w-4" />
            </button>
          </span>
        </div>
        <table className="w-full text-center">
          <thead>
            <tr className="bg-amber/80 text-[13px] font-semibold uppercase tracking-[0.08em] text-deep-ink">
              <th className="px-4 py-2.5">Ώρα</th>
              <th className="px-4 py-2.5">Διαθέσιμες θέσεις</th>
              <th className="px-4 py-2.5">Όχημα</th>
            </tr>
          </thead>
          <tbody>
            {trips.length === 0 && (
              <tr><td colSpan={3} className="px-4 py-8 text-muted">Δεν υπάρχουν δρομολόγια για την επιλεγμένη ημέρα.</td></tr>
            )}
            {trips.map((t) => {
              const disabled = !t.bookable;
              const isSelected = selected === t.id;
              return (
                <tr
                  key={t.id}
                  aria-disabled={disabled}
                  onClick={() => { if (!disabled) onSelect(t.id); }}
                  className={`border-t border-border transition ${
                    disabled
                      ? 'cursor-not-allowed bg-background text-muted/60'
                      : isSelected
                        ? 'cursor-pointer bg-gold/50 font-semibold text-deep-ink'
                        : 'cursor-pointer hover:bg-gold/15'
                  }`}
                >
                  <td className="px-4 py-3.5">
                    <span className="inline-flex items-center gap-1.5"><Clock className="h-4 w-4 opacity-60" />{t.time}</span>
                  </td>
                  <td className="px-4 py-3.5">{t.seats_available}</td>
                  <td className="px-4 py-3.5">
                    {t.double_decker && (
                      <span className="inline-flex items-center gap-1 text-[13px]"><Bus className="h-4 w-4" />Διώροφο</span>
                    )}
                    {t.departed && <span className="text-[12px] uppercase">Αναχώρησε</span>}
                    {!t.departed && t.seats_available === 0 && <span className="text-[12px] uppercase">Πλήρες</span>}
                  </td>
                </tr>
              );
            })}
          </tbody>
        </table>
      </div>
    </div>
  );
}

export function TripList({
  kind,
  outboundLabel,
  inboundLabel,
  date,
  retDate,
  outbound,
  inbound,
}: {
  kind: TripKind;
  outboundLabel: string;
  inboundLabel?: string;
  date: string;
  retDate?: string;
  outbound: TripRow[];
  inbound?: TripRow[];
}) {
  const router = useRouter();
  const params = useSearchParams();
  const [outSel, setOutSel] = useState<string | null>(null);
  const [inSel, setInSel] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);

  return (
    <div>
      <TripsTable
        title="Δρομολόγια Αναχώρησης"
        routeLabel={outboundLabel}
        date={date}
        dateParam="date"
        trips={outbound}
        selected={outSel}
        onSelect={(id) => { setOutSel(id); setError(null); }}
      />
      {kind === 'round' && inbound && inboundLabel && retDate && (
        <TripsTable
          title="Δρομολόγια Επιστροφής"
          routeLabel={inboundLabel}
          date={retDate}
          dateParam="ret"
          trips={inbound}
          selected={inSel}
          onSelect={(id) => { setInSel(id); setError(null); }}
        />
      )}

      {error && <p className="mb-4 rounded-md border border-cta/30 bg-cta/5 px-4 py-3 text-center text-[14px] text-cta">{error}</p>}

      <div className="flex items-center justify-between">
        <Link href="/eisitiria" className="text-[14px] font-medium text-muted hover:text-primary">← Νέα αναζήτηση</Link>
        <Button
          size="lg"
          onClick={() => {
            if (!outSel) { setError('Δεν έχετε επιλέξει δρομολόγιο αναχώρησης.'); return; }
            if (kind === 'round' && !inSel) { setError('Δεν έχετε επιλέξει δρομολόγιο επιστροφής.'); return; }
            const next = new URLSearchParams(params.toString());
            next.set('trip', outSel);
            if (inSel) next.set('ret_trip', inSel);
            router.push(`/eisitiria/thesis?${next.toString()}`);
          }}
        >
          Επόμενο →
        </Button>
      </div>
    </div>
  );
}
