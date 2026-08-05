import { getCategories } from '@/lib/queries/categories';
import { TourForm } from '@/components/admin/TourForm';
import { FlashBanner } from '@/components/admin/FlashBanner';
import { upsertTour } from '../../actions';

export default async function NewTourPage({ searchParams }: { searchParams: Promise<{ error?: string }> }) {
  const { error } = await searchParams;
  const categories = await getCategories();
  return (
    <div>
      <h1 className="mb-8 font-display text-4xl font-semibold text-primary">Νέα Εκδρομή</h1>
      <FlashBanner error={error} />
      <TourForm categories={categories} action={upsertTour} />
    </div>
  );
}
