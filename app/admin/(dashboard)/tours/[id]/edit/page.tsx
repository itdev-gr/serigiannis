import { notFound } from 'next/navigation';
import type { Category, TourImage } from '@/types/db';
import { createServerClient } from '@/lib/supabase/server';
import { getCategories } from '@/lib/queries/categories';
import { TourForm } from '@/components/admin/TourForm';
import { GalleryManager } from '@/components/admin/GalleryManager';
import { TourBookingEditor } from '@/components/admin/TourBookingEditor';
import { getTourBookingSetup } from '@/lib/queries/tour-orders';
import { ConfirmForm } from '@/components/admin/ConfirmForm';
import { Button } from '@/components/ui/Button';
import { deleteTour, saveTourBooking, setStatus, upsertTour } from '../../../actions';

export default async function EditTourPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const sb = await createServerClient();
  const [{ data: row }, categories, { data: images }, booking, ordersCount] = await Promise.all([
    sb.from('tours').select('*, categories:tour_categories(category:categories(*))').eq('id', id).maybeSingle(),
    getCategories(),
    sb.from('tour_images').select('*').eq('tour_id', id).order('position'),
    getTourBookingSetup(id),
    sb.from('tour_orders').select('id', { count: 'exact', head: true }).eq('tour_id', id),
  ]);
  if (!row) notFound();

  const tour = {
    ...row,
    categories: ((row.categories ?? []) as { category: Category | null }[])
      .map((c) => c.category)
      .filter((c): c is Category => Boolean(c)),
  };

  // Fall back to the generic message rather than blocking the delete if the count query failed.
  const bookingsCount = ordersCount.error ? null : (ordersCount.count ?? 0);
  const deleteMessage =
    bookingsCount != null && bookingsCount > 0
      ? `Η εκδρομή έχει ${bookingsCount} κρατήσεις. Θα διαγραφεί από το site· οι κρατήσεις παραμένουν στο αρχείο. Συνέχεια;`
      : `Διαγραφή «${tour.title}»; Θα διαγραφεί από το site μαζί με τις φωτογραφίες της· τυχόν κρατήσεις παραμένουν στο αρχείο.`;

  return (
    <div>
      <h1 className="mb-2 font-display text-4xl font-semibold text-primary">Επεξεργασία</h1>
      <p className="mb-8 text-muted">{tour.title}</p>
      <TourForm tour={tour} categories={categories} action={upsertTour} />
      <TourBookingEditor tourId={id} tiers={booking.tiers} departures={booking.departures} action={saveTourBooking} />
      <GalleryManager tourId={id} images={(images ?? []) as TourImage[]} coverImageId={row.cover_image_id} />

      <div className="mt-10 max-w-2xl rounded-lg border border-cta/30 p-5">
        <h2 className="mb-1 font-display text-2xl font-semibold text-primary">Επικίνδυνη ζώνη</h2>
        <p className="mb-5 text-[13px] text-muted">
          {bookingsCount != null
            ? `Η εκδρομή έχει ${bookingsCount} ${bookingsCount === 1 ? 'κράτηση' : 'κρατήσεις'}.`
            : 'Δεν ήταν δυνατή η καταμέτρηση των κρατήσεων.'}{' '}
          Η διαγραφή αφαιρεί την εκδρομή και τις φωτογραφίες της από το site· οι κρατήσεις παραμένουν στο αρχείο.
        </p>
        <div className="flex flex-wrap items-center gap-3">
          <ConfirmForm action={deleteTour.bind(null, id)} message={deleteMessage}>
            <Button type="submit" variant="outline" className="border-cta text-cta hover:bg-cta hover:text-surface">Διαγραφή εκδρομής</Button>
          </ConfirmForm>
          <form action={setStatus.bind(null, id, 'draft')}>
            <Button type="submit" variant="outline">Απόσυρση από το site</Button>
          </form>
        </div>
      </div>
    </div>
  );
}
