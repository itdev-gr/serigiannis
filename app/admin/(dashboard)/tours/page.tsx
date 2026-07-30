import Link from 'next/link';
import { Plus } from 'lucide-react';
import { getAdminTours } from '@/lib/queries/tours';
import { getCategories } from '@/lib/queries/categories';
import { AdminToursTable } from '@/components/admin/AdminToursTable';
import { upsertCategory, deleteCategory } from '../actions';
import { Button } from '@/components/ui/Button';
import { ConfirmForm } from '@/components/admin/ConfirmForm';
import { adminInput } from '@/components/admin/ui';
import { cn } from '@/lib/utils';

const TABS = [
  { key: 'ekdromes', label: 'Εκδρομές' },
  { key: 'katigories', label: 'Κατηγορίες' },
] as const;
type TabKey = (typeof TABS)[number]['key'];

const CAT_ROW = 'grid grid-cols-[1fr_1fr_6rem_auto] items-center gap-3';

export default async function AdminToursPage({ searchParams }: { searchParams: Promise<{ tab?: string }> }) {
  const sp = await searchParams;
  const tab: TabKey = TABS.find((t) => t.key === sp.tab)?.key ?? 'ekdromes';

  const [rows, categories] = await Promise.all([getAdminTours(), getCategories()]);
  const published = rows.filter((t) => t.status === 'published').length;

  return (
    <div>
      <div className="mb-8 flex items-end justify-between">
        <div>
          <h1 className="font-display text-4xl font-semibold text-primary">Σελίδες Εκδρομών</h1>
          <p className="mt-2 text-[14px] text-muted">
            Το περιεχόμενο του ιστότοπου (κατάλογος). Για τις εκδρομές με online εισιτήρια: Εκδρομές &amp; Πρόγραμμα.
          </p>
          <p className="mt-1 text-muted">{rows.length} συνολικά · {published} δημοσιευμένες</p>
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
                      <ConfirmForm action={deleteCategory.bind(null, c.id)} message={`Διαγραφή κατηγορίας «${c.name_el}»;`}>
                        <button type="submit" className="text-[13px] text-cta hover:underline">Διαγραφή</button>
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
