import Link from 'next/link';
import { Plus } from 'lucide-react';
import { getAdminTours } from '@/lib/queries/tours';
import { getCategories } from '@/lib/queries/categories';
import { AdminToursTable } from '@/components/admin/AdminToursTable';
import { PoylmanRoutesList } from '@/components/admin/PoylmanRoutesList';
import { getAdminAllFares, getAdminPatterns, getAdminRoutes, getAdminTrips } from '@/lib/queries/ticketing';
import { upsertCategory, deleteCategory } from '../actions';
import { Button } from '@/components/ui/Button';
import { ConfirmForm } from '@/components/admin/ConfirmForm';
import { FlashBanner } from '@/components/admin/FlashBanner';
import { adminInput } from '@/components/admin/ui';
import { cn } from '@/lib/utils';

const TABS = [
  { key: 'ekdromes', label: 'Σελίδες εκδρομών' },
  { key: 'poylman', label: 'Πούλμαν & θέσεις' },
  { key: 'katigories', label: 'Κατηγορίες' },
] as const;
type TabKey = (typeof TABS)[number]['key'];

const CAT_ROW = 'grid grid-cols-[1fr_1fr_6rem_auto] items-center gap-3';

/** Calendar date `days` after the given `YYYY-MM-DD`, anchored at noon UTC so DST never shifts the day. */
function addDays(ymd: string, days: number): string {
  const d = new Date(`${ymd}T12:00:00Z`);
  d.setUTCDate(d.getUTCDate() + days);
  return d.toISOString().slice(0, 10);
}

export default async function AdminToursPage({
  searchParams,
}: {
  searchParams: Promise<{ tab?: string; saved?: string; error?: string; q?: string }>;
}) {
  const sp = await searchParams;
  const tab: TabKey = TABS.find((t) => t.key === sp.tab)?.key ?? 'ekdromes';

  const [rows, categories] = await Promise.all([getAdminTours(), getCategories()]);
  const published = rows.filter((t) => t.status === 'published').length;

  // Τα δεδομένα του πούλμαν φορτώνονται ΜΟΝΟ στην καρτέλα τους — αλλιώς 240
  // σελίδες καταλόγου θα πλήρωναν τέσσερα περιττά queries σε κάθε επίσκεψη.
  let poylman = null as null | {
    routes: Awaited<ReturnType<typeof getAdminRoutes>>;
    patterns: Awaited<ReturnType<typeof getAdminPatterns>>;
    trips: Awaited<ReturnType<typeof getAdminTrips>>;
    fares: Awaited<ReturnType<typeof getAdminAllFares>>;
  };
  if (tab === 'poylman') {
    const today = new Date().toLocaleDateString('en-CA', { timeZone: 'Europe/Athens' });
    const in30 = addDays(today, 30);
    const [routes, patterns, trips, fares] = await Promise.all([
      getAdminRoutes(),
      getAdminPatterns(),
      getAdminTrips(today, in30),
      getAdminAllFares(),
    ]);
    poylman = { routes, patterns, trips, fares };
  }

  return (
    <div>
      <FlashBanner saved={sp.saved} error={sp.error} />
      <div className="mb-8 flex items-end justify-between">
        <div>
          <h1 className="font-display text-4xl font-semibold text-primary">Εκδρομές</h1>
          <p className="mt-2 text-[14px] text-muted">
            Οι σελίδες του καταλόγου και οι εκδρομές πούλμαν με αριθμημένες θέσεις, σε ένα σημείο.
          </p>
          <p className="mt-1 text-muted">{rows.length} σελίδες · {published} δημοσιευμένες</p>
        </div>
        {tab === 'ekdromes' && (
          <Link href="/admin/tours/new" className="inline-flex items-center gap-1.5 rounded-full bg-cta px-4 py-2 font-sans text-[13px] font-semibold text-surface hover:bg-cta-hover">
            <Plus className="h-4 w-4" strokeWidth={2} /> Νέα Εκδρομή
          </Link>
        )}
      </div>

      <div className="mb-6 flex flex-wrap gap-2">
        {TABS.map((t) => (
          <Link
            key={t.key}
            href={t.key === 'ekdromes' ? '/admin/tours' : `/admin/tours?tab=${t.key}`}
            className={cn(
              'rounded-full px-4 py-1.5 text-[14px] font-medium transition-colors',
              t.key === tab ? 'bg-primary text-surface' : 'bg-background text-body hover:bg-primary/10'
            )}
          >
            {t.label}
          </Link>
        ))}
      </div>

      {tab === 'ekdromes' && <AdminToursTable tours={rows} categories={categories} />}

      {tab === 'poylman' && poylman && (
        <PoylmanRoutesList
          routes={poylman.routes}
          patterns={poylman.patterns}
          trips={poylman.trips}
          fares={poylman.fares}
          q={sp.q}
        />
      )}

      {tab === 'katigories' && (
        <div className="max-w-3xl">
          <div className="overflow-x-auto">
            <div className="min-w-[560px] overflow-hidden rounded-lg border border-border bg-surface">
              <div className={`${CAT_ROW} border-b border-border bg-background/50 px-4 py-3 font-sans text-[12px] uppercase tracking-[0.1em] text-muted`}>
                <div>Όνομα</div>
                <div>Slug</div>
                <div>Σειρά</div>
                <div className="text-right">—</div>
              </div>
              {categories.map((c) => {
                const formId = `category-${c.id}`;
                return (
                  <div key={c.id} className={`${CAT_ROW} border-b border-border/60 px-4 py-2 last:border-0`}>
                    <form id={formId} action={upsertCategory} className="hidden">
                      <input type="hidden" name="id" value={c.id} />
                    </form>
                    <input form={formId} name="name_el" defaultValue={c.name_el} className={adminInput} />
                    <input form={formId} name="slug" defaultValue={c.slug} className={adminInput} />
                    <input form={formId} name="sort_order" type="number" defaultValue={c.sort_order} className={adminInput} />
                    <div className="flex items-center justify-end gap-3">
                      <Button type="submit" form={formId} size="sm" variant="outline">Αποθήκευση</Button>
                      <ConfirmForm
                        action={deleteCategory.bind(null, c.id)}
                        message={`Διαγραφή κατηγορίας «${c.name_el}»; Θα αφαιρεθεί και από κάθε εκδρομή που την είχε — οι εκδρομές παραμένουν, αλλά φεύγουν από αυτή τη σελίδα του καταλόγου.`}
                        title="Διαγραφή κατηγορίας"
                      >
                        <button type="button" className="text-[13px] text-cta hover:underline">Διαγραφή</button>
                      </ConfirmForm>
                    </div>
                  </div>
                );
              })}
            </div>
          </div>

          <div className="mt-8 rounded-lg border border-border bg-surface p-6">
            <h2 className="font-display text-xl font-semibold text-primary">Νέα κατηγορία</h2>
            <form action={upsertCategory} className="mt-4 grid gap-3 sm:grid-cols-[1fr_1fr_6rem_auto]">
              <input name="name_el" placeholder="Όνομα" required className={adminInput} />
              <input name="slug" placeholder="slug" required className={adminInput} />
              <input name="sort_order" type="number" defaultValue={0} className={adminInput} />
              <Button type="submit">Προσθήκη</Button>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}
