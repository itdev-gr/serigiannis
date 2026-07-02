'use client';
import { useMemo, useState } from 'react';
import { SlidersHorizontal, SearchX } from 'lucide-react';
import type { Tour, Category } from '@/types/db';
import { TourCard } from '@/components/trips/TourCard';
import { Pagination } from '@/components/trips/Pagination';
import {
  filterTours,
  sortTours,
  PRICE_BAND_LABELS,
  type PriceBand,
  type SortKey,
} from '@/lib/filters';

const PAGE_SIZE = 9;
const SORTS: { key: SortKey; label: string }[] = [
  { key: 'popular', label: 'Δημοφιλή' },
  { key: 'price-asc', label: 'Τιμή ↑' },
  { key: 'price-desc', label: 'Τιμή ↓' },
  { key: 'date', label: 'Ημερομηνία' },
];
const BANDS = Object.keys(PRICE_BAND_LABELS) as PriceBand[];

function plural(n: number): string {
  return n === 1 ? '1 εκδρομή' : `${n} εκδρομές`;
}

export function ToursExplorer({
  tours,
  categories,
  lockedCategory,
}: {
  tours: Tour[];
  categories: Category[];
  lockedCategory?: string;
}) {
  const [category, setCategory] = useState<string | undefined>(lockedCategory);
  const [band, setBand] = useState<PriceBand | undefined>(undefined);
  const [sort, setSort] = useState<SortKey>('popular');
  const [page, setPage] = useState(1);

  const filtered = useMemo(() => {
    const f = filterTours(tours, { category: lockedCategory ?? category, priceBand: band });
    return sortTours(f, sort);
  }, [tours, lockedCategory, category, band, sort]);

  const totalPages = Math.max(1, Math.ceil(filtered.length / PAGE_SIZE));
  const current = Math.min(page, totalPages);
  const pageItems = filtered.slice((current - 1) * PAGE_SIZE, current * PAGE_SIZE);

  const chip = (active: boolean) =>
    `whitespace-nowrap rounded-full px-4 py-1.5 font-sans text-[13px] font-medium transition-colors ${
      active ? 'bg-primary text-surface' : 'text-primary hover:bg-primary/10'
    }`;

  const reset = () => { setCategory(lockedCategory); setBand(undefined); setSort('popular'); setPage(1); };

  return (
    <div>
      <div className="glass sticky top-20 z-20 -mx-4 mb-10 flex flex-col gap-3 border-y border-border px-4 py-4 lg:flex-row lg:items-center lg:justify-between">
        <div className="flex items-center gap-3 overflow-x-auto scrollbar-hide">
          <SlidersHorizontal className="h-4 w-4 shrink-0 text-muted" strokeWidth={1.75} />
          {!lockedCategory && (
            <div className="flex gap-1">
              <button type="button" className={chip(!category)} onClick={() => { setCategory(undefined); setPage(1); }}>Όλες</button>
              {categories.map((c) => (
                <button key={c.slug} type="button" className={chip(category === c.slug)} onClick={() => { setCategory(c.slug); setPage(1); }}>
                  {c.name_el}
                </button>
              ))}
            </div>
          )}
          <span className="mx-1 h-5 w-px shrink-0 bg-border" />
          <div className="flex gap-1">
            <button type="button" className={chip(!band)} onClick={() => { setBand(undefined); setPage(1); }}>Όλες τιμές</button>
            {BANDS.map((b) => (
              <button key={b} type="button" className={chip(band === b)} onClick={() => { setBand(b); setPage(1); }}>
                {PRICE_BAND_LABELS[b]}
              </button>
            ))}
          </div>
        </div>
        <div className="flex items-center gap-3">
          <span className="shrink-0 font-sans text-[12px] font-semibold uppercase tracking-[0.12em] text-muted">{plural(filtered.length)}</span>
          <select
            value={sort}
            onChange={(e) => { setSort(e.target.value as SortKey); setPage(1); }}
            aria-label="Ταξινόμηση"
            className="rounded-full border border-border bg-surface px-4 py-1.5 font-sans text-[13px] font-medium text-primary"
          >
            {SORTS.map((s) => <option key={s.key} value={s.key}>{s.label}</option>)}
          </select>
        </div>
      </div>

      {pageItems.length === 0 ? (
        <div className="flex flex-col items-center gap-4 rounded-lg border border-border bg-surface py-20 text-center">
          <SearchX className="h-10 w-10 text-muted" strokeWidth={1.5} />
          <p className="font-display text-2xl text-primary">Δεν βρέθηκαν εκδρομές με αυτά τα φίλτρα</p>
          <button type="button" onClick={reset} className="font-sans text-[13px] font-semibold uppercase tracking-[0.12em] text-cta hover:underline">
            Καθαρισμός φίλτρων
          </button>
        </div>
      ) : (
        <div className="grid gap-6 md:grid-cols-2 lg:grid-cols-3">
          {pageItems.map((tour) => <TourCard key={tour.id} tour={tour} />)}
        </div>
      )}

      <Pagination current={current} total={totalPages} onChange={setPage} />
    </div>
  );
}
