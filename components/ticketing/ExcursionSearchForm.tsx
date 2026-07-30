'use client';
import { useState } from 'react';
import { useRouter } from 'next/navigation';
import { Button } from '@/components/ui/Button';
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
  const [routeId, setRouteId] = useState('');
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
        if ((chosen?.boarding_points.length ?? 0) > 0 && !bp) { setError('Επιλέξτε σημείο συνάντησης.'); return; }
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
        {(chosen?.boarding_points.length ?? 0) > 0 && (
          <label className="block sm:col-span-2">
            <span className="mb-1.5 block font-sans text-[13px] font-medium uppercase tracking-[0.1em] text-primary">Σημείο συνάντησης *</span>
            <select className={inputCls} value={bp} onChange={(e) => setBp(e.target.value)}>
              <option value="">— Επιλέξτε σημείο συνάντησης —</option>
              {chosen!.boarding_points.map((point) => (
                <option key={point} value={point}>{point}</option>
              ))}
            </select>
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
