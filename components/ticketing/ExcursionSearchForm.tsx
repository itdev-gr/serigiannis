'use client';
import { useState } from 'react';
import { useRouter, useSearchParams } from 'next/navigation';
import { Button } from '@/components/ui/Button';
import { resolveInitialRoute } from '@/lib/excursions';
import type { Excursion } from '@/types/ticketing';

const inputCls =
  'w-full rounded-md border border-border bg-surface px-4 py-2.5 font-sans text-[15px] text-body transition focus:border-primary focus:outline-none focus:ring-4 focus:ring-primary/10';

function fmtDate(iso: string): string {
  return new Date(`${iso}T12:00:00`).toLocaleDateString('el-GR', {
    weekday: 'long', day: '2-digit', month: '2-digit', year: 'numeric',
  });
}

export function ExcursionSearchForm({ excursions }: { excursions: Excursion[] }) {
  const router = useRouter();
  const searchParams = useSearchParams();
  // Deep-link preselect (?ekdromi=…) — only when it matches a real excursion.
  // Lazy initializer: seeds the initial state once; never re-synced afterwards.
  const [routeId, setRouteId] = useState(() =>
    resolveInitialRoute(excursions, searchParams.get('ekdromi'))
  );
  const [date, setDate] = useState('');
  const [bp, setBp] = useState('');
  const [pax, setPax] = useState(1);
  const [error, setError] = useState<string | null>(null);

  const chosen = excursions.find((x) => x.id === routeId);

  return (
    <form
      className="rounded-lg border border-border bg-surface p-6 shadow-card"
      onSubmit={(e) => {
        e.preventDefault();
        setError(null);
        if (!routeId) { setError('Επιλέξτε εκδρομή.'); return; }
        if (!date) { setError('Επιλέξτε ημερομηνία εκδρομής.'); return; }
        const params = new URLSearchParams({ route: routeId, date, pax: String(pax) });
        if (bp) params.set('bp', bp);
        router.push(`/eisitiria/dromologia?${params.toString()}`);
      }}
    >
      <div className="grid gap-4 sm:grid-cols-2">
        <label className="block sm:col-span-2">
          <span className="mb-1.5 block font-sans text-[13px] font-medium uppercase tracking-[0.1em] text-primary">Εκδρομή *</span>
          <select className={inputCls} value={routeId} onChange={(e) => { setRouteId(e.target.value); setDate(''); setBp(''); }}>
            <option value="">— Επιλέξτε εκδρομή —</option>
            {excursions.map((x) => (
              <option key={x.id} value={x.id}>{x.title}</option>
            ))}
          </select>
        </label>
        <label className="block">
          <span className="mb-1.5 block font-sans text-[13px] font-medium uppercase tracking-[0.1em] text-primary">Ημερομηνία εκδρομής *</span>
          <select className={inputCls} value={date} onChange={(e) => setDate(e.target.value)} disabled={!chosen}>
            <option value="">{chosen ? '— Επιλέξτε ημερομηνία —' : '— Πρώτα επιλέξτε εκδρομή —'}</option>
            {(chosen?.dates ?? []).map((d) => (
              <option key={d} value={d}>{fmtDate(d)}</option>
            ))}
          </select>
        </label>
        <label className="block">
          <span className="mb-1.5 block font-sans text-[13px] font-medium uppercase tracking-[0.1em] text-primary">Άτομα *</span>
          <select className={inputCls} value={pax} onChange={(e) => setPax(Number(e.target.value))}>
            {Array.from({ length: 10 }, (_, i) => i + 1).map((n) => (
              <option key={n} value={n}>{n === 1 ? '1 άτομο' : `${n} άτομα`}</option>
            ))}
          </select>
        </label>
        {/* Προαιρετικό πλέον: η δεσμευτική επιλογή γίνεται ανά επιβάτη στην
            ολοκλήρωση· εδώ λειτουργεί μόνο ως προεπιλογή για όλους. */}
        {(chosen?.boarding_points.length ?? 0) > 0 && (
          <label className="block sm:col-span-2">
            <span className="mb-1.5 block font-sans text-[13px] font-medium uppercase tracking-[0.1em] text-primary">Σημείο επιβίβασης (προαιρετικό)</span>
            <select className={inputCls} value={bp} onChange={(e) => setBp(e.target.value)}>
              <option value="">— Επιλογή στο τελευταίο βήμα —</option>
              {chosen!.boarding_points.map((point) => (
                <option key={point} value={point}>{point}</option>
              ))}
            </select>
            <span className="mt-1 block text-[12px] text-muted">
              Προεπιλογή για όλους τους επιβάτες — αλλάζει ανά επιβάτη στην ολοκλήρωση της κράτησης.
            </span>
          </label>
        )}
      </div>

      {chosen && chosen.dates.length === 0 && (
        <p className="mt-4 rounded-md bg-primary/5 px-4 py-3 text-[14px] text-muted">
          Δεν υπάρχουν προγραμματισμένες ημερομηνίες για αυτή την εκδρομή. Επικοινωνήστε μαζί μας.
        </p>
      )}

      {error && <p className="mt-4 text-[14px] text-cta">{error}</p>}
      <div className="mt-6 flex justify-end">
        <Button type="submit" size="lg">Αναζήτηση</Button>
      </div>
    </form>
  );
}
