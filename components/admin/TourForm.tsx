import Link from 'next/link';
import type { Category, Tour } from '@/types/db';
import { Button } from '@/components/ui/Button';
import { adminInput, adminLabel } from '@/components/admin/ui';

const STATUSES = [
  { v: 'published', l: 'Δημοσιευμένη' },
  { v: 'draft', l: 'Πρόχειρη' },
  { v: 'hidden', l: 'Κρυμμένη' },
  { v: 'archived', l: 'Αρχειοθετημένη' },
];

export function TourForm({
  tour,
  categories,
  action,
}: {
  tour?: Tour | null;
  categories: Category[];
  action: (formData: FormData) => void | Promise<void>;
}) {
  const primaryCat = tour?.categories?.[0]?.slug ?? categories[0]?.slug;
  return (
    <form action={action} className="grid max-w-2xl gap-5">
      {tour?.id && <input type="hidden" name="id" value={tour.id} />}

      <label className="block">
        <span className={adminLabel}>Τίτλος *</span>
        <input name="title" required defaultValue={tour?.title ?? ''} className={adminInput} />
      </label>

      <label className="block">
        <span className={adminLabel}>Slug (URL) *</span>
        <input name="slug" required defaultValue={tour?.slug ?? ''} className={adminInput} placeholder="π.χ. meteora-monoimeri" />
      </label>

      <label className="block">
        <span className={adminLabel}>Σύνοψη</span>
        <textarea name="summary" rows={3} defaultValue={tour?.summary ?? ''} className={adminInput} />
      </label>

      <div className="grid gap-5 sm:grid-cols-2">
        <label className="block">
          <span className={adminLabel}>Τιμή από (€)</span>
          <input name="price_from" type="number" step="1" min="0" defaultValue={tour?.price_from ?? ''} className={adminInput} />
        </label>
        <label className="block">
          <span className={adminLabel}>Κατηγορία</span>
          <select name="category" defaultValue={primaryCat} className={adminInput}>
            {categories.map((c) => <option key={c.slug} value={c.slug}>{c.name_el}</option>)}
          </select>
        </label>
      </div>

      <div className="grid gap-5 sm:grid-cols-2">
        <label className="block">
          <span className={adminLabel}>Διάρκεια</span>
          <input name="duration_label" defaultValue={tour?.duration_label ?? ''} className={adminInput} placeholder="π.χ. Μονοήμερη" />
        </label>
        <label className="block">
          <span className={adminLabel}>Αναχωρήσεις</span>
          <input name="departure_note" defaultValue={tour?.departure_note ?? ''} className={adminInput} placeholder="π.χ. Κάθε Σάββατο" />
        </label>
      </div>

      <div className="grid gap-5 sm:grid-cols-2">
        <label className="block">
          <span className={adminLabel}>Κατάσταση</span>
          <select name="status" defaultValue={tour?.status ?? 'draft'} className={adminInput}>
            {STATUSES.map((s) => <option key={s.v} value={s.v}>{s.l}</option>)}
          </select>
        </label>
        <label className="flex items-center gap-3 pt-7">
          <input type="checkbox" name="is_featured" defaultChecked={tour?.is_featured ?? false} className="h-4 w-4 accent-cta" />
          <span className="font-sans text-[14px] text-body">Προβεβλημένη (αρχική)</span>
        </label>
      </div>

      <div className="mt-2 flex items-center gap-4">
        <Button type="submit" size="lg">Αποθήκευση</Button>
        <Link href="/admin" className="font-sans text-[14px] font-semibold text-muted hover:text-primary">Άκυρο</Link>
      </div>
    </form>
  );
}
