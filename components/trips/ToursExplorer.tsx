'use client';
import { useMemo, useState, type ReactNode } from 'react';
import { ArrowDownUp, SearchX, X } from 'lucide-react';
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
import { cn } from '@/lib/utils';

const PAGE_SIZE = 9;
const SORTS: { key: SortKey; label: string }[] = [
  { key: 'popular', label: 'Δημοφιλή' },
  { key: 'price-asc', label: 'Τιμή (χαμηλή → υψηλή)' },
  { key: 'price-desc', label: 'Τιμή (υψηλή → χαμηλή)' },
  { key: 'date', label: 'Ημερομηνία' },
];
const BANDS = Object.keys(PRICE_BAND_LABELS) as PriceBand[];

function plural(n: number): string {
  return n === 1 ? '1 εκδρομή' : `${n} εκδρομές`;
}

function FilterChip({
  active,
  onClick,
  children,
}: {
  active: boolean;
  onClick: () => void;
  children: ReactNode;
}) {
  return (
    <button
      type="button"
      onClick={onClick}
      aria-pressed={active}
      className={cn(
        'rounded-full border px-4 py-2 font-sans text-[14px] font-medium transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary/30',
        active
          ? 'border-deep-ink bg-deep-ink text-surface shadow-sm'
          : 'border-border bg-surface text-body hover:border-primary/30 hover:bg-background'
      )}
    >
      {children}
    </button>
  );
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

  const activeCategory = lockedCategory ?? category;
  const hasFilters = Boolean(activeCategory || band);
  const categoryLabel = activeCategory
    ? categories.find((c) => c.slug === activeCategory)?.name_el ?? activeCategory
    : null;

  const reset = () => {
    setCategory(lockedCategory);
    setBand(undefined);
    setSort('popular');
    setPage(1);
  };

  return (
    <div>
      <div className="mb-10">
        <div className="overflow-hidden rounded-2xl border border-border bg-surface shadow-card">
          <div className="flex flex-col gap-4 border-b border-border bg-gradient-to-r from-background to-[#eef4fb] px-4 py-4 sm:flex-row sm:items-center sm:justify-between sm:px-6">
            <p className="font-display text-lg font-semibold text-deep-ink md:text-xl">
              {plural(filtered.length)}
            </p>
            <label className="flex w-full items-center gap-2 sm:w-auto">
              <span className="sr-only">Ταξινόμηση</span>
              <ArrowDownUp className="hidden h-4 w-4 shrink-0 text-muted sm:block" strokeWidth={1.75} aria-hidden />
              <span className="shrink-0 font-sans text-[13px] font-medium text-muted">Ταξινόμηση</span>
              <select
                value={sort}
                onChange={(e) => {
                  setSort(e.target.value as SortKey);
                  setPage(1);
                }}
                aria-label="Ταξινόμηση εκδρομών"
                className="h-11 min-w-0 flex-1 cursor-pointer rounded-xl border border-border bg-surface px-3 font-sans text-[14px] font-medium text-body shadow-sm outline-none transition focus:border-primary focus:ring-4 focus:ring-primary/10 sm:min-w-[220px]"
              >
                {SORTS.map((s) => (
                  <option key={s.key} value={s.key}>
                    {s.label}
                  </option>
                ))}
              </select>
            </label>
          </div>

          <div className="space-y-5 px-4 py-5 sm:px-6">
            {!lockedCategory && (
              <div>
                <p className="mb-3 font-sans text-[12px] font-semibold uppercase tracking-[0.14em] text-muted">
                  Κατηγορία
                </p>
                <div className="flex flex-wrap gap-2">
                  <FilterChip
                    active={!category}
                    onClick={() => {
                      setCategory(undefined);
                      setPage(1);
                    }}
                  >
                    Όλες
                  </FilterChip>
                  {categories.map((c) => (
                    <FilterChip
                      key={c.slug}
                      active={category === c.slug}
                      onClick={() => {
                        setCategory(c.slug);
                        setPage(1);
                      }}
                    >
                      {c.name_el}
                    </FilterChip>
                  ))}
                </div>
              </div>
            )}

            <div>
              <p className="mb-3 font-sans text-[12px] font-semibold uppercase tracking-[0.14em] text-muted">Τιμή</p>
              <div className="flex flex-wrap gap-2">
                <FilterChip
                  active={!band}
                  onClick={() => {
                    setBand(undefined);
                    setPage(1);
                  }}
                >
                  Όλες οι τιμές
                </FilterChip>
                {BANDS.map((b) => (
                  <FilterChip
                    key={b}
                    active={band === b}
                    onClick={() => {
                      setBand(b);
                      setPage(1);
                    }}
                  >
                    {PRICE_BAND_LABELS[b]}
                  </FilterChip>
                ))}
              </div>
            </div>

            {hasFilters && (
              <div className="flex flex-wrap items-center gap-2 border-t border-border pt-4">
                <span className="font-sans text-[13px] text-muted">Ενεργά φίλτρα:</span>
                {categoryLabel && !lockedCategory && (
                  <button
                    type="button"
                    onClick={() => {
                      setCategory(undefined);
                      setPage(1);
                    }}
                    className="inline-flex items-center gap-1.5 rounded-full bg-primary/10 px-3 py-1.5 font-sans text-[13px] font-medium text-primary transition hover:bg-primary/15"
                  >
                    {categoryLabel}
                    <X className="h-3.5 w-3.5" strokeWidth={2} aria-hidden />
                    <span className="sr-only">Αφαίρεση</span>
                  </button>
                )}
                {band && (
                  <button
                    type="button"
                    onClick={() => {
                      setBand(undefined);
                      setPage(1);
                    }}
                    className="inline-flex items-center gap-1.5 rounded-full bg-primary/10 px-3 py-1.5 font-sans text-[13px] font-medium text-primary transition hover:bg-primary/15"
                  >
                    {PRICE_BAND_LABELS[band]}
                    <X className="h-3.5 w-3.5" strokeWidth={2} aria-hidden />
                    <span className="sr-only">Αφαίρεση</span>
                  </button>
                )}
                <button
                  type="button"
                  onClick={reset}
                  className="ml-auto font-sans text-[13px] font-semibold text-cta underline-offset-2 hover:underline"
                >
                  Καθαρισμός όλων
                </button>
              </div>
            )}
          </div>
        </div>
      </div>

      {pageItems.length === 0 ? (
        <div className="flex flex-col items-center gap-4 rounded-2xl border border-border bg-surface py-20 text-center shadow-card">
          <SearchX className="h-10 w-10 text-muted" strokeWidth={1.5} />
          <p className="font-display text-2xl text-primary">Δεν βρέθηκαν εκδρομές με αυτά τα φίλτρα</p>
          <button
            type="button"
            onClick={reset}
            className="font-sans text-[13px] font-semibold uppercase tracking-[0.12em] text-cta hover:underline"
          >
            Καθαρισμός φίλτρων
          </button>
        </div>
      ) : (
        <div className="grid gap-6 md:grid-cols-2 lg:grid-cols-3">
          {pageItems.map((tour) => (
            <TourCard key={tour.id} tour={tour} />
          ))}
        </div>
      )}

      <Pagination current={current} total={totalPages} onChange={setPage} />
    </div>
  );
}
