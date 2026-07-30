import { getCategories } from '@/lib/queries/categories';
import { upsertCategory, deleteCategory } from '../actions';
import { Button } from '@/components/ui/Button';
import { ConfirmForm } from '@/components/admin/ConfirmForm';
import { adminInput } from '@/components/admin/ui';

const ROW_GRID = 'grid grid-cols-[1fr_1fr_6rem_auto] items-center gap-3';

export default async function CategoriesPage() {
  const categories = await getCategories();
  return (
    <div className="max-w-3xl">
      <h1 className="font-display text-4xl font-semibold text-primary">Κατηγορίες</h1>

      <div className="mt-8 overflow-hidden rounded-lg border border-border bg-surface">
        <div className={`${ROW_GRID} border-b border-border bg-background/50 px-4 py-3 font-sans text-[12px] uppercase tracking-[0.1em] text-muted`}>
          <div>Όνομα</div>
          <div>Slug</div>
          <div>Σειρά</div>
          <div className="text-right">—</div>
        </div>
        {categories.map((c) => {
          const formId = `category-${c.id}`;
          return (
            <div key={c.id} className={`${ROW_GRID} border-b border-border/60 px-4 py-2 last:border-0`}>
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
  );
}
