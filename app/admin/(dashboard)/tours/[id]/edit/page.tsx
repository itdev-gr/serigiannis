import { notFound } from 'next/navigation';
import type { Category, TourImage } from '@/types/db';
import { createServerClient } from '@/lib/supabase/server';
import { getCategories } from '@/lib/queries/categories';
import { TourForm } from '@/components/admin/TourForm';
import { GalleryManager } from '@/components/admin/GalleryManager';
import { TourBookingEditor } from '@/components/admin/TourBookingEditor';
import { getTourBookingSetup } from '@/lib/queries/tour-orders';
import { saveTourBooking, upsertTour } from '../../../actions';

export default async function EditTourPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const sb = await createServerClient();
  const [{ data: row }, categories, { data: images }, booking] = await Promise.all([
    sb.from('tours').select('*, categories:tour_categories(category:categories(*))').eq('id', id).maybeSingle(),
    getCategories(),
    sb.from('tour_images').select('*').eq('tour_id', id).order('position'),
    getTourBookingSetup(id),
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
      <TourBookingEditor tourId={id} tiers={booking.tiers} departures={booking.departures} action={saveTourBooking} />
      <GalleryManager tourId={id} images={(images ?? []) as TourImage[]} coverImageId={row.cover_image_id} />
    </div>
  );
}
