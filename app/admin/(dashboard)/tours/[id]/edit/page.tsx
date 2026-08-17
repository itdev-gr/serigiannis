import { notFound } from 'next/navigation';
import type { Category, TourImage } from '@/types/db';
import { createServerClient } from '@/lib/supabase/server';
import { getCategories } from '@/lib/queries/categories';
import { TourForm } from '@/components/admin/TourForm';
import { GalleryManager } from '@/components/admin/GalleryManager';
import { TourBookingEditor } from '@/components/admin/TourBookingEditor';
import { TourSetupChecklist } from '@/components/admin/TourSetupChecklist';
import { getTourBookingSetup } from '@/lib/queries/tour-orders';
import { getAdminRoutes } from '@/lib/queries/ticketing';
import { getTourPresets, presetsOfKind } from '@/lib/queries/presets';
import { routeLabel } from '@/lib/ticketing';
import { ConfirmForm } from '@/components/admin/ConfirmForm';
import { FlashBanner } from '@/components/admin/FlashBanner';
import { Button } from '@/components/ui/Button';
import { athensToday } from '@/lib/athens-time';
import { bookableDepartures } from '@/lib/booking';
import { deleteTour, saveTourBooking, setStatus, upsertTour } from '../../../actions';

export default async function EditTourPage({
  params,
  searchParams,
}: {
  params: Promise<{ id: string }>;
  searchParams: Promise<{ saved?: string; error?: string }>;
}) {
  const { id } = await params;
  const { saved, error } = await searchParams;
  const sb = await createServerClient();
  const [{ data: row }, categories, { data: images }, booking, ordersCount, allRoutes, allPresets] = await Promise.all([
    sb.from('tours').select('*, categories:tour_categories(category:categories(*))').eq('id', id).maybeSingle(),
    getCategories(),
    sb.from('tour_images').select('*').eq('tour_id', id).order('position'),
    getTourBookingSetup(id),
    sb.from('tour_orders').select('id', { count: 'exact', head: true }).eq('tour_id', id),
    getAdminRoutes(),
    getTourPresets(),
  ]);
  if (!row) notFound();

  const presets = {
    meeting_points: presetsOfKind(allPresets, 'meeting_point').map((p) => p.label),
    included: presetsOfKind(allPresets, 'included').map((p) => p.label),
    not_included: presetsOfKind(allPresets, 'not_included').map((p) => p.label),
  };

  const tour = {
    ...row,
    categories: ((row.categories ?? []) as { category: Category | null }[])
      .map((c) => c.category)
      .filter((c): c is Category => Boolean(c)),
  };

  // Τα πρόχειρα δρομολόγια δεν προτείνονται, αλλά αν η εκδρομή είναι ήδη
  // συνδεδεμένη με ένα, μένει επιλεγμένο — αλλιώς η επόμενη αποθήκευση θα
  // έκοβε τη σύνδεση χωρίς να το ζητήσει κανείς.
  const routes = allRoutes.filter((r) => r.status === 'published');
  const linkedId = tour.route_id as string | null;
  if (linkedId && !routes.some((r) => r.id === linkedId)) {
    const linked = allRoutes.find((r) => r.id === linkedId);
    if (linked) routes.push({ ...linked, title: `${routeLabel(linked)} (πρόχειρη)` });
  }

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
      <FlashBanner saved={saved} error={error} />
      <TourSetupChecklist
        status={row.status}
        bookings_open={row.bookings_open}
        summary={row.summary}
        imageCount={images?.length ?? 0}
        tierCount={booking.tiers.filter((t) => t.is_active).length}
        futureDepartureCount={bookableDepartures(booking.departures, athensToday()).length}
        meetingPointCount={(row.meeting_points ?? []).length}
      />
      <TourForm tour={tour} categories={categories} routes={routes} presets={presets} action={upsertTour} />
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
          <ConfirmForm action={deleteTour.bind(null, id)} message={deleteMessage} title="Οριστική διαγραφή εκδρομής">
            <Button type="button" variant="outline" className="border-cta text-cta hover:bg-cta hover:text-surface">Διαγραφή εκδρομής</Button>
          </ConfirmForm>
          <form action={setStatus.bind(null, id, 'draft')}>
            <Button type="submit" variant="outline">Απόσυρση από το site</Button>
          </form>
        </div>
      </div>
    </div>
  );
}
