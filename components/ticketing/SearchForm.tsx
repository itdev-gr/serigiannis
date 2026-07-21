'use client';
import { useState } from 'react';
import { useRouter } from 'next/navigation';
import { Button } from '@/components/ui/Button';
import { KIND_LABEL } from '@/lib/ticketing';
import type { BusRoute, Station, TripKind } from '@/types/ticketing';

const inputCls =
  'w-full rounded-md border border-border bg-surface px-4 py-2.5 font-sans text-[15px] text-body transition focus:border-primary focus:outline-none focus:ring-4 focus:ring-primary/10';

function isoDate(d: Date): string {
  return d.toISOString().slice(0, 10);
}

export function SearchForm({
  stations,
  routes,
  windowDays,
  defaults,
}: {
  stations: Station[];
  routes: BusRoute[];
  windowDays: number;
  defaults?: { from?: string; to?: string; date?: string; ret?: string; kind?: TripKind };
}) {
  const router = useRouter();
  const today = new Date();
  const max = new Date(today.getTime() + windowDays * 86400000);

  const [kind, setKind] = useState<TripKind>(defaults?.kind ?? 'oneway');
  const [from, setFrom] = useState(defaults?.from ?? '');
  const [to, setTo] = useState(defaults?.to ?? '');
  const [date, setDate] = useState(defaults?.date ?? isoDate(today));
  const [ret, setRet] = useState(defaults?.ret ?? isoDate(today));
  const [error, setError] = useState<string | null>(null);

  // Only destinations actually reachable from the chosen origin.
  const destinations = stations.filter((s) =>
    routes.some((r) => r.origin_station_id === from && r.destination_station_id === s.id)
  );

  return (
    <form
      className="rounded-lg border border-border bg-surface p-6 shadow-card"
      onSubmit={(e) => {
        e.preventDefault();
        setError(null);
        if (!from || !to) { setError('Επιλέξτε αφετηρία και προορισμό.'); return; }
        if (from === to) { setError('Η αφετηρία και ο προορισμός πρέπει να διαφέρουν.'); return; }
        if (!date) { setError('Επιλέξτε ημερομηνία αναχώρησης.'); return; }
        if (kind === 'round' && (!ret || ret < date)) {
          setError('Η ημερομηνία επιστροφής δεν μπορεί να είναι πριν την αναχώρηση.');
          return;
        }
        const params = new URLSearchParams({ from, to, date, kind });
        if (kind === 'round') params.set('ret', ret);
        router.push(`/eisitiria/dromologia?${params.toString()}`);
      }}
    >
      <div className="mb-6 flex flex-wrap gap-2" role="tablist" aria-label="Τύπος εισιτηρίου">
        {(Object.keys(KIND_LABEL) as TripKind[]).map((k) => (
          <button
            key={k}
            type="button"
            role="tab"
            aria-selected={kind === k}
            onClick={() => setKind(k)}
            className={`rounded-md border px-4 py-2 font-sans text-[14px] font-semibold transition ${
              kind === k
                ? 'border-deep-ink bg-deep-ink text-surface'
                : 'border-border bg-surface text-muted hover:border-primary hover:text-primary'
            }`}
          >
            {KIND_LABEL[k]}
          </button>
        ))}
      </div>

      <div className="grid gap-4 sm:grid-cols-2">
        <label className="block">
          <span className="mb-1.5 block font-sans text-[13px] font-medium uppercase tracking-[0.1em] text-primary">Από *</span>
          <select className={inputCls} value={from} onChange={(e) => { setFrom(e.target.value); setTo(''); }}>
            <option value="">Επιλέξτε αφετηρία</option>
            {stations.map((s) => (
              <option key={s.id} value={s.id}>
                {s.name}{s.code ? ` (${s.code})` : ''}
              </option>
            ))}
          </select>
        </label>
        <label className="block">
          <span className="mb-1.5 block font-sans text-[13px] font-medium uppercase tracking-[0.1em] text-primary">Προς *</span>
          <select className={inputCls} value={to} onChange={(e) => setTo(e.target.value)} disabled={!from}>
            <option value="">{from ? 'Επιλέξτε προορισμό' : 'Πρώτα επιλέξτε αφετηρία'}</option>
            {destinations.map((s) => (
              <option key={s.id} value={s.id}>
                {s.name}{s.code ? ` (${s.code})` : ''}
              </option>
            ))}
          </select>
        </label>
        <label className="block">
          <span className="mb-1.5 block font-sans text-[13px] font-medium uppercase tracking-[0.1em] text-primary">Αναχώρηση *</span>
          <input type="date" className={inputCls} value={date} min={isoDate(today)} max={isoDate(max)} onChange={(e) => setDate(e.target.value)} />
        </label>
        {kind === 'round' && (
          <label className="block">
            <span className="mb-1.5 block font-sans text-[13px] font-medium uppercase tracking-[0.1em] text-primary">Επιστροφή *</span>
            <input type="date" className={inputCls} value={ret} min={date} max={isoDate(max)} onChange={(e) => setRet(e.target.value)} />
          </label>
        )}
      </div>

      {kind === 'open_return' && (
        <p className="mt-4 rounded-md bg-primary/5 px-4 py-3 text-[14px] text-muted">
          Με την Ανοιχτή Επιστροφή κλείνετε θέση μόνο για την αναχώρηση· το εισιτήριο επιστροφής εκδίδεται
          «ανοιχτό» και εξαργυρώνεται σε δρομολόγιο της επιλογής σας.
        </p>
      )}

      {error && <p className="mt-4 text-[14px] text-cta">{error}</p>}
      <div className="mt-6 flex justify-end">
        <Button type="submit" size="lg">Αναζήτηση</Button>
      </div>
    </form>
  );
}
