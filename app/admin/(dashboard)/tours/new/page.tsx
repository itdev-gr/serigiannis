import { getCategories } from '@/lib/queries/categories';
import { getAdminRoutes } from '@/lib/queries/ticketing';
import { getTourPresets, presetsOfKind } from '@/lib/queries/presets';
import { TourForm } from '@/components/admin/TourForm';
import { FlashBanner } from '@/components/admin/FlashBanner';
import { upsertTour } from '../../actions';

export default async function NewTourPage({ searchParams }: { searchParams: Promise<{ error?: string }> }) {
  const { error } = await searchParams;
  const [categories, allRoutes, allPresets] = await Promise.all([getCategories(), getAdminRoutes(), getTourPresets()]);
  const routes = allRoutes.filter((r) => r.status === 'published');
  const presets = {
    meeting_points: presetsOfKind(allPresets, 'meeting_point').map((p) => p.label),
    included: presetsOfKind(allPresets, 'included').map((p) => p.label),
    not_included: presetsOfKind(allPresets, 'not_included').map((p) => p.label),
  };
  return (
    <div>
      <h1 className="mb-8 font-display text-4xl font-semibold text-primary">Νέα Εκδρομή</h1>
      <FlashBanner error={error} />
      <TourForm categories={categories} routes={routes} presets={presets} action={upsertTour} />
    </div>
  );
}
