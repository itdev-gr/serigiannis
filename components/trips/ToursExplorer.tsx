'use client';
import { useMemo, type ReactNode } from 'react';
import { usePathname, useRouter, useSearchParams } from 'next/navigation';
import { ArrowDownUp, SearchX, X } from 'lucide-react';
import type { Tour, Category } from '@/types/db';
import { TourCard } from '@/components/trips/TourCard';
import { Pagination } from '@/components/trips/Pagination';
import { filterTours, sortTours, type SortKey } from '@/lib/filters';
import { cn } from '@/lib/utils';

const PAGE_SIZE = 9;
const DEFAULT_SORT: SortKey = 'date';
const SORTS: { key: SortKey; label: string }[] = [
  { key: 'popular', label: 'Δημοφιλή' },
  { key: 'price-asc', label: 'Τιμή (χαμηλή → υψηλή)' },
  { key: 'price-desc', label: 'Τιμή (υψηλή → χαμηλή)' },
  { key: 'date', label: 'Ημερομηνία' },
];

function plural(n: number): string {
  return n === 1 ? '1 εκδρομή' : `${n} εκδρομές`;
}

/** Η κατάσταση του καταλόγου όπως διαβάζεται από τη διεύθυνση. */
export type ExplorerState = { category?: string; sort: SortKey; page: number };

/** Διαβάζει κατηγορία/ταξινόμηση/σελίδα από τα query params, με προεπιλογές
 *  για ό,τι λείπει ή είναι άκυρο. Καθαρή συνάρτηση, ώστε να ελέγχεται. */
export function parseExplorerParams(
  params: URLSearchParams | null,
  categorySlugs: string[],
  lockedCategory?: string
): ExplorerState {
  const cat = params?.get('category') ?? undefined;
  const sortRaw = params?.get('sort') ?? '';
  const pageRaw = Number.parseInt(params?.get('page') ?? '', 10);
  return {
    category: lockedCategory ?? (cat && categorySlugs.includes(cat) ? cat : undefined),
    sort: SORTS.some((s) => s.key === sortRaw) ? (sortRaw as SortKey) : DEFAULT_SORT,
    page: Number.isFinite(pageRaw) && pageRaw >= 1 ? pageRaw : 1,
  };
}

/** Η διεύθυνση για μια κατάσταση: μόνο ό,τι διαφέρει από τις προεπιλογές
 *  μπαίνει στο URL, ώστε η «καθαρή» διεύθυνση της σελίδας (και το canonical)
 *  να μένει χωρίς params. */
export function explorerHref(pathname: string, state: ExplorerState, lockedCategory?: string): string {
  const q = new URLSearchParams();
  if (!lockedCategory && state.category) q.set('category', state.category);
  if (state.sort !== DEFAULT_SORT) q.set('sort', state.sort);
  if (state.page > 1) q.set('page', String(state.page));
  const qs = q.toString();
  return qs ? `${pathname}?${qs}` : pathname;
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
  // Η κατάσταση ζει στη διεύθυνση (?category=&sort=&page=), όχι σε state:
  // έτσι το «πίσω» του browser γυρνά από τη σελίδα 4 στην 3 και η επιστροφή
  // από μια εκδρομή βρίσκει τον κατάλογο εκεί που τον άφησε ο επισκέπτης.
  // Πριν, με useState, το «πίσω» πήγαινε στην αρχική και ο κόσμος χανόταν.
  const router = useRouter();
  const pathname = usePathname();
  const params = useSearchParams();
  const slugs = useMemo(() => categories.map((c) => c.slug), [categories]);
  const state = useMemo(
    () => parseExplorerParams(params, slugs, lockedCategory),
    [params, slugs, lockedCategory]
  );
  const { category, sort, page } = state;

  const navigate = (next: Partial<ExplorerState>) => {
    router.push(explorerHref(pathname, { ...state, ...next }, lockedCategory), { scroll: false });
  };
  const setCategory = (c: string | undefined) => navigate({ category: c, page: 1 });
  const setSort = (s: SortKey) => navigate({ sort: s, page: 1 });
  const setPage = (p: number) => navigate({ page: p });

  const filtered = useMemo(() => {
    const f = filterTours(tours, { category: lockedCategory ?? category });
    return sortTours(f, sort);
  }, [tours, lockedCategory, category, sort]);

  const totalPages = Math.max(1, Math.ceil(filtered.length / PAGE_SIZE));
  const current = Math.min(page, totalPages);
  const pageItems = filtered.slice((current - 1) * PAGE_SIZE, current * PAGE_SIZE);

  const activeCategory = lockedCategory ?? category;
  // Μόνο όταν υπάρχει κάτι που ο επισκέπτης ΜΠΟΡΕΙ να καθαρίσει. Σε σελίδα
  // κατηγορίας η κατηγορία είναι κλειδωμένη, οπότε χωρίς αυτόν τον έλεγχο
  // εμφανιζόταν άδεια γραμμή «Ενεργά φίλτρα:» με μόνο το «Καθαρισμός όλων».
  const hasFilters = (!lockedCategory && Boolean(category)) || sort !== DEFAULT_SORT;
  const categoryLabel = activeCategory
    ? categories.find((c) => c.slug === activeCategory)?.name_el ?? activeCategory
    : null;

  // Το router.push γίνεται με scroll:false ώστε να μην πηδά στην κορυφή με
  // smooth scroll· ανεβαίνουμε ακαριαία εμείς — html has scroll-behavior:smooth.
  const goToPage = (p: number) => {
    setPage(p);
    window.scrollTo({ top: 0, behavior: 'instant' });
  };

  const reset = () => navigate({ category: lockedCategory, sort: DEFAULT_SORT, page: 1 });

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
                onChange={(e) => setSort(e.target.value as SortKey)}
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
                  <FilterChip active={!category} onClick={() => setCategory(undefined)}>
                    Όλες
                  </FilterChip>
                  {categories.map((c) => (
                    <FilterChip key={c.slug} active={category === c.slug} onClick={() => setCategory(c.slug)}>
                      {c.name_el}
                    </FilterChip>
                  ))}
                </div>
              </div>
            )}


            {hasFilters && (
              <div className="flex flex-wrap items-center gap-2 border-t border-border pt-4">
                <span className="font-sans text-[13px] text-muted">Ενεργά φίλτρα:</span>
                {categoryLabel && !lockedCategory && (
                  <button
                    type="button"
                    onClick={() => setCategory(undefined)}
                    className="inline-flex items-center gap-1.5 rounded-full bg-primary/10 px-3 py-1.5 font-sans text-[13px] font-medium text-primary transition hover:bg-primary/15"
                  >
                    {categoryLabel}
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

      <Pagination current={current} total={totalPages} onChange={goToPage} />
    </div>
  );
}
