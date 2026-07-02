import { getCategories } from '@/lib/queries/categories';
import { upsertCategory, deleteCategory } from '../actions';
import { Button } from '@/components/ui/Button';
import { ConfirmForm } from '@/components/admin/ConfirmForm';

const inputCls = 'w-full rounded-md border border-border bg-surface px-3 py-2 font-sans text-[14px] text-body focus:border-primary focus:outline-none focus:ring-4 focus:ring-primary/10';

export default async function CategoriesPage() {
  const categories = await getCategories();
  return (
    <div className="max-w-3xl">
      <h1 className="font-display text-4xl font-semibold text-primary">Κατηγορίες</h1>

      <div className="mt-8 overflow-hidden rounded-lg border border-border bg-surface">
        <table className="w-full text-left text-[14px]">
          <thead className="border-b border-border bg-background/50 font-sans text-[12px] uppercase tracking-[0.1em] text-muted">
            <tr><th className="px-4 py-3">Όνομα</th><th className="px-4 py-3">Slug</th><th className="px-4 py-3 w-24">Σειρά</th><th className="px-4 py-3 text-right">—</th></tr>
          </thead>
          <tbody>
            {categories.map((c) => (
              <tr key={c.id} className="border-b border-border/60 last:border-0">
                <td className="px-4 py-2">
                  <form action={upsertCategory} className="flex items-center gap-2">
                    <input type="hidden" name="id" value={c.id} />
                    <input name="name_el" defaultValue={c.name_el} className={inputCls} />
                    <input name="slug" defaultValue={c.slug} className={inputCls} />
                    <input name="sort_order" type="number" defaultValue={c.sort_order} className="w-20 rounded-md border border-border bg-surface px-3 py-2 text-[14px]" />
                    <Button type="submit" size="sm" variant="outline">Αποθήκευση</Button>
                  </form>
                </td>
                <td /><td /><td className="px-4 py-2 text-right">
                  <ConfirmForm action={deleteCategory.bind(null, c.id)} message={`Διαγραφή κατηγορίας «${c.name_el}»;`}><span className="text-[13px] text-cta hover:underline">Διαγραφή</span></ConfirmForm>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>

      <div className="mt-8 rounded-lg border border-border bg-surface p-6">
        <h2 className="font-display text-xl font-semibold text-primary">Νέα κατηγορία</h2>
        <form action={upsertCategory} className="mt-4 grid gap-3 sm:grid-cols-[1fr_1fr_6rem_auto]">
          <input name="name_el" placeholder="Όνομα" required className={inputCls} />
          <input name="slug" placeholder="slug" required className={inputCls} />
          <input name="sort_order" type="number" defaultValue={0} className={inputCls} />
          <Button type="submit">Προσθήκη</Button>
        </form>
      </div>
    </div>
  );
}
