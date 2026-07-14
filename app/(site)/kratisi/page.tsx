import type { Metadata } from 'next';
import { PageHero } from '@/components/shared/PageHero';
import { PaymentMethods } from '@/components/shared/PaymentMethods';
import { OnlineBookingForm } from '@/components/booking/OnlineBookingForm';
import { getTourBySlug } from '@/lib/queries/tours';
import { getPostBySlug } from '@/lib/queries/posts';

export const metadata: Metadata = {
  title: 'Κλείστε Online Θέση',
  description: 'Κλείστε online θέση για εκδρομή ή κρουαζιέρα της Sergiani Travel. Συμπληρώστε τη φόρμα και θα σας καλέσουμε για επιβεβαίωση.',
  alternates: { canonical: '/kratisi' },
};

export default async function KratisiPage({ searchParams }: { searchParams: Promise<{ tour?: string; post?: string }> }) {
  const { tour: tourSlug, post: postSlug } = await searchParams;
  const tour = tourSlug ? await getTourBySlug(tourSlug) : null;
  const post = !tour && postSlug ? await getPostBySlug(postSlug) : null;

  const subject = tour?.title ?? post?.title ?? null;
  const pricePerSeat = tour?.price_from ?? post?.price ?? null;
  const defaultDate = post?.trip_date ?? null;
  const sourcePath = tour ? `/kratisi?tour=${tour.slug}` : post ? `/kratisi?post=${post.slug}` : '/kratisi';

  return (
    <>
      <PageHero
        eyebrow="Κρατήσεις"
        title="Κλείστε Online Θέση"
        subtitle="Συμπληρώστε τη φόρμα και θα επικοινωνήσουμε μαζί σας για την επιβεβαίωση της κράτησης."
        breadcrumbs={[{ label: 'Αρχική', href: '/' }, { label: 'Κράτηση' }]}
        heightClass="h-[44vh] min-h-[340px]"
      />
      <section className="py-16 md:py-24">
        <div className="container max-w-2xl">
          <OnlineBookingForm
            tourId={tour?.id ?? null}
            subject={subject}
            pricePerSeat={pricePerSeat}
            defaultDate={defaultDate}
            sourcePath={sourcePath}
          />
          <PaymentMethods className="mt-8" />
        </div>
      </section>
    </>
  );
}
