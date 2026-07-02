import { getCategories } from '@/lib/queries/categories';
import { TourForm } from '@/components/admin/TourForm';
import { upsertTour } from '../../actions';

export default async function NewTourPage() {
  const categories = await getCategories();
  return (
    <div>
      <h1 className="mb-8 font-display text-4xl font-semibold text-primary">Νέα Εκδρομή</h1>
      <TourForm categories={categories} action={upsertTour} />
    </div>
  );
}
