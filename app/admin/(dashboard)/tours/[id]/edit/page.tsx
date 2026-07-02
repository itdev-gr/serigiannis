import { notFound } from 'next/navigation';
import type { Category } from '@/types/db';
import { createServerClient } from '@/lib/supabase/server';
import { getCategories } from '@/lib/queries/categories';
import { TourForm } from '@/components/admin/TourForm';
import { upsertTour } from '../../../actions';

export default async function EditTourPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const sb = await createServerClient();
  const [{ data: row }, categories] = await Promise.all([
    sb.from('tours').select('*, categories:tour_categories(category:categories(*))').eq('id', id).maybeSingle(),
    getCategories(),
  ]);
  if (!row) notFound();

  const tour = {
    ...row,
    categories: ((row.categories ?? []) as { category: Category | null }[])
      .map((c) => c.category)
      .filter((c): c is Category => Boolean(c)),
  };

  return (
    <div>
      <h1 className="mb-2 font-display text-4xl font-semibold text-primary">Επεξεργασία</h1>
      <p className="mb-8 text-muted">{tour.title}</p>
      <TourForm tour={tour} categories={categories} action={upsertTour} />
    </div>
  );
}
