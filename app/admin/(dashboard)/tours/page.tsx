import Link from 'next/link';
import { Plus } from 'lucide-react';
import { getAdminTours } from '@/lib/queries/tours';
import { getCategories } from '@/lib/queries/categories';
import { AdminToursTable } from '@/components/admin/AdminToursTable';

export default async function AdminToursPage() {
  const [rows, categories] = await Promise.all([getAdminTours(), getCategories()]);
  const published = rows.filter((t) => t.status === 'published').length;

  return (
    <div>
      <div className="mb-8 flex items-end justify-between">
        <div>
          <h1 className="font-display text-4xl font-semibold text-primary">Εκδρομές</h1>
          <p className="mt-1 text-muted">{rows.length} συνολικά · {published} δημοσιευμένες</p>
        </div>
        <Link href="/admin/tours/new" className="inline-flex items-center gap-1.5 rounded-full bg-cta px-4 py-2 font-sans text-[13px] font-semibold text-surface hover:bg-cta-hover">
          <Plus className="h-4 w-4" strokeWidth={2} /> Νέα Εκδρομή
        </Link>
      </div>

      <AdminToursTable tours={rows} categories={categories} />
    </div>
  );
}
