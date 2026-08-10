import type { Metadata } from 'next';
import Link from 'next/link';
import { notFound, permanentRedirect } from 'next/navigation';
import { Clock, Calendar, MapPin, Phone, Tag } from 'lucide-react';
import { PageHeading } from '@/components/shared/PageHeading';
import { RelatedToursCarousel } from '@/components/trips/RelatedToursCarousel';
import { TourFaq } from '@/components/trips/TourFaq';
import { TourGallery } from '@/components/trips/TourGallery';
import { TourInfo } from '@/components/trips/TourInfo';
import { OnlineBookingForm } from '@/components/booking/OnlineBookingForm';
import { TourBookingWidget } from '@/components/booking/TourBookingWidget';
import { Button } from '@/components/ui/Button';
import { getTourBySlug, getTours, getPublishedSlugs } from '@/lib/queries/tours';
import { getSettings } from '@/lib/queries/settings';
import { isRoutePublished } from '@/lib/queries/ticketing';
import { getPaymentProvider } from '@/lib/payments';
import { athensToday } from '@/lib/athens-time';
import { bookableDepartures, headlinePrice, isBookable, tourRouteCta } from '@/lib/booking';
import { galleryImages } from '@/lib/gallery';
import { coverImage, imageUrl } from '@/lib/images';
import { telHref } from '@/lib/phone';
import { SITE_URL, jsonLdHtml } from '@/lib/seo';
import { decodeSlugParam } from '@/lib/slug';
import { resolveTourAlias } from '@/lib/tour-aliases';
import { tourFaqs } from '@/lib/tour-faq';

export const revalidate = 3600;

export async function generateStaticParams() {
  return (await getPublishedSlugs()).map((slug) => ({ slug }));
}

export async function generateMetadata({ params }: { params: Promise<{ slug: string }> }): Promise<Metadata> {
  const { slug } = await params;
  const tour = await getTourBySlug(decodeSlugParam(slug));
  if (!tour) return {};
  const cover = coverImage(tour);
  const img = imageUrl(cover);
  return {
    title: tour.seo_title ?? tour.title,
    description: tour.seo_description ?? tour.short_description ?? tour.summary ?? undefined,
    alternates: { canonical: `/tour/${tour.slug}` },
    openGraph: {
      title: tour.title,
      description: tour.short_description ?? tour.summary ?? undefined,
      images: img ? [img] : undefined,
    },
  };
}

export default async function TourDetailPage({ params }: { params: Promise<{ slug: string }> }) {
  const { slug } = await params;
  const decoded = decodeSlugParam(slug);
  const tour = await getTourBySlug(decoded);
  if (!tour) {
    // Παλιά διεύθυνση εκδρομής που άλλαξε: μόνιμη ανακατεύθυνση αντί για 404,
    // ώστε οι ήδη μοιρασμένοι σύνδεσμοι να συνεχίσουν να δουλεύουν.
    const alias = resolveTourAlias(decoded);
    if (alias) permanentRedirect(`/tour/${alias}`);
    notFound();
  }

  const cover = coverImage(tour);
  const primaryCat = tour.categories?.[0] ?? null;
  const [all, settings, routePublished] = await Promise.all([
    getTours(),
    getSettings(),
    isRoutePublished(tour.route_id),
  ]);
  const phone = settings.phones[0] ?? null;
  const related = all
    .filter((t) => t.slug !== tour.slug && t.categories?.some((c) => primaryCat && c.slug === primaryCat.slug))
    .slice(0, 8);

  // Tours with price categories book online; the rest keep the enquiry form.
  const tiers = (tour.price_tiers ?? []).filter((t) => t.is_active);
  const departures = bookableDepartures(tour.departures ?? [], athensToday());
  // Έχει τιμές = μπορεί τεχνικά να πουλήσει· ανοιχτή = το γραφείο το επιτρέπει.
  const hasPricing = tiers.length > 0;
  // Το migration που προσθέτει τη στήλη bookings_open έχει πλέον εφαρμοστεί·
  // το isBookable αντιμετωπίζει την τιμή undefined ως ανοιχτή μόνο ως ασφάλεια
  // για τυχόν παλιές seed γραμμές.
  const bookable = isBookable(tour, tiers);
  const photos = galleryImages(tour);
  const headline = headlinePrice(tiers);
  const offerPrice = headline ? headline.cents / 100 : tour.price_from;

  // Η σύνδεση με εκδρομή πούλμαν: κύριο κουμπί όταν η σελίδα δεν πουλάει μόνη
  // της, δευτερεύων σύνδεσμος όταν πουλάει, τίποτα όταν είναι κλειστή.
  const routeCta = tourRouteCta({
    routeId: tour.route_id,
    routePublished,
    hasActiveTiers: hasPricing,
    bookingsOpen: tour.bookings_open !== false,
  });

  const faqs = tourFaqs(tour);

  // Κεφαλίδα κατά το πρότυπο: ετικέτες πάνω από τον τίτλο, σειρά στοιχείων με
  // εικονίδια από κάτω και η σύντομη περιγραφή ως εισαγωγική παράγραφος.
  // Χωρίς εφεδρικό στο summary — αυτό εμφανίζεται μόνο στην ενότητα
  // «Περιγραφή» πιο κάτω, αλλιώς το ίδιο κείμενο θα φαινόταν δύο φορές.
  const headerBadges = (
    <>
      {primaryCat && (
        <span className="rounded-full bg-primary/10 px-3 py-1 text-sm font-semibold text-primary">
          {primaryCat.name_el}
        </span>
      )}
      <span className="rounded-full bg-olive/10 px-3 py-1 text-sm font-semibold text-olive">
        Κρατήσεις απευθείας από το γραφείο
      </span>
    </>
  );
  // Το σημείο συνάντησης λείπει επίτηδες: είναι μακρύ και εμφανίζεται ήδη
  // στα πλακίδια «Καλό να ξέρετε» και στα «Σημεία επιβίβασης» πιο κάτω.
  const hasFacts = Boolean(tour.duration_label || tour.departure_note) || tour.price_from != null;
  const headerMeta = hasFacts || tour.short_description ? (
    <>
      {hasFacts && (
        <div
          data-testid="tour-facts"
          className="mt-3.5 flex flex-wrap items-center gap-x-5 gap-y-2 text-sm text-muted"
        >
          {tour.duration_label && (
            <span className="inline-flex items-center gap-1.5">
              <Clock className="h-[17px] w-[17px]" strokeWidth={1.75} />
              {tour.duration_label}
            </span>
          )}
          {tour.departure_note && (
            <span className="inline-flex items-center gap-1.5">
              <Calendar className="h-[17px] w-[17px]" strokeWidth={1.75} />
              {tour.departure_note}
            </span>
          )}
          {tour.price_from != null && (
            <span className="inline-flex items-center gap-1.5">
              <Tag className="h-[17px] w-[17px]" strokeWidth={1.75} />
              <span className="font-semibold text-body">από {tour.price_from}€</span>
            </span>
          )}
        </div>
      )}
      {tour.short_description && (
        <p className="mt-4 max-w-3xl text-[15px] leading-relaxed text-body">{tour.short_description}</p>
      )}
    </>
  ) : null;

  const detailsCard = (tour.duration_label || tour.departure_note || tour.meeting_point || phone) ? (
    <div className="rounded-2xl border border-border bg-surface p-6 shadow-card">
      <ul className="space-y-4 text-[15px]">
        {tour.duration_label && (
          <li className="flex items-center gap-3"><Clock className="h-5 w-5 shrink-0 text-primary/60" strokeWidth={1.75} /><span>{tour.duration_label}</span></li>
        )}
        {tour.departure_note && (
          <li className="flex items-center gap-3"><Calendar className="h-5 w-5 shrink-0 text-primary/60" strokeWidth={1.75} /><span>{tour.departure_note}</span></li>
        )}
        {tour.meeting_point && (
          <li className="flex items-center gap-3"><MapPin className="h-5 w-5 shrink-0 text-primary/60" strokeWidth={1.75} /><span>{tour.meeting_point}</span></li>
        )}
      </ul>
      {phone && (
        <a href={telHref(phone)} className="mt-5 flex items-center justify-center gap-2 font-sans text-[14px] font-semibold text-primary hover:text-cta">
          <Phone className="h-4 w-4" strokeWidth={1.75} /> {phone}
        </a>
      )}
    </div>
  ) : null;

  const coverUrl = imageUrl(cover);
  const tourUrl = `${SITE_URL}/tour/${tour.slug}`;
  const jsonLd = {
    '@context': 'https://schema.org',
    '@type': 'TouristTrip',
    name: tour.title,
    description: tour.short_description ?? tour.summary ?? undefined,
    url: tourUrl,
    ...(coverUrl ? { image: [coverUrl] } : {}),
    ...(offerPrice != null
      ? {
          offers: {
            '@type': 'Offer',
            price: offerPrice,
            priceCurrency: tour.currency,
            availability: bookable ? 'https://schema.org/InStock' : 'https://schema.org/SoldOut',
            url: tourUrl,
          },
        }
      : {}),
    provider: { '@type': 'TravelAgency', name: 'Sergiani Travel', url: SITE_URL },
  };
  const breadcrumbLd = {
    '@context': 'https://schema.org',
    '@type': 'BreadcrumbList',
    itemListElement: [
      { '@type': 'ListItem', position: 1, name: 'Αρχική', item: SITE_URL },
      { '@type': 'ListItem', position: 2, name: 'Εκδρομές', item: `${SITE_URL}/ekdromes` },
      { '@type': 'ListItem', position: 3, name: tour.title, item: tourUrl },
    ],
  };
  // Οι ίδιες ερωτήσεις που βλέπει ο επισκέπτης, δομημένες για τη Google.
  const faqLd = faqs.length > 0
    ? {
        '@context': 'https://schema.org',
        '@type': 'FAQPage',
        mainEntity: faqs.map((faq) => ({
          '@type': 'Question',
          name: faq.q,
          acceptedAnswer: { '@type': 'Answer', text: faq.a },
        })),
      }
    : null;

  return (
    <>
      <script type="application/ld+json" dangerouslySetInnerHTML={{ __html: jsonLdHtml(jsonLd) }} />
      <script type="application/ld+json" dangerouslySetInnerHTML={{ __html: jsonLdHtml(breadcrumbLd) }} />
      {faqLd && (
        <script
          type="application/ld+json"
          data-testid="faq-jsonld"
          dangerouslySetInnerHTML={{ __html: jsonLdHtml(faqLd) }}
        />
      )}
      <PageHeading
        title={tour.title}
        breadcrumbs={[
          { label: 'Αρχική', href: '/' },
          { label: 'Εκδρομές', href: '/ekdromes' },
          { label: tour.title },
        ]}
        badges={headerBadges}
        meta={headerMeta}
      />

      {photos.length > 0 && (
        <section className="pt-10 md:pt-14">
          <div className="container">
            <TourGallery images={photos} />
          </div>
        </section>
      )}

      <section className="py-16 md:py-24">
        <div className="container flex flex-col gap-10 lg:flex-row">
          {/* Description */}
          <div className="min-w-0 flex-1">
            <TourInfo tour={tour} />
            {faqs.length > 0 && (
              <div className="mt-12">
                <TourFaq faqs={faqs} />
              </div>
            )}
          </div>

          {/* Booking box (tours with price categories) / info card + enquiry form */}
          <aside className="w-full shrink-0 lg:w-[380px]">
            {bookable ? (
              <div className="space-y-5 lg:sticky lg:top-40">
                <TourBookingWidget
                  tourId={tour.id}
                  tourSlug={tour.slug}
                  tiers={tiers}
                  departures={departures}
                  payOnline={getPaymentProvider().id !== 'offline'}
                />
                {routeCta && !routeCta.primary && (
                  <Link
                    href={routeCta.href}
                    className="block text-center font-sans text-[14px] font-semibold text-primary underline underline-offset-4 transition-colors hover:text-cta motion-reduce:transition-none"
                  >
                    Ή διαλέξτε συγκεκριμένη θέση στο πούλμαν →
                  </Link>
                )}
                {detailsCard}
              </div>
            ) : hasPricing ? (
              <div className="space-y-5 lg:sticky lg:top-40">
                <div className="rounded-2xl border border-border bg-surface p-6 shadow-card">
                  <h3 className="font-display text-xl font-bold text-primary">Οι κρατήσεις έχουν κλείσει</h3>
                  <p className="mt-3 text-[15px] text-muted">
                    Για αυτή την εκδρομή δεν δεχόμαστε online κρατήσεις αυτή τη στιγμή. Καλέστε μας για διαθεσιμότητα.
                  </p>
                  {phone && (
                    <a href={telHref(phone)} className="mt-5 flex items-center justify-center gap-2 font-sans text-[14px] font-semibold text-primary hover:text-cta">
                      <Phone className="h-4 w-4" strokeWidth={1.75} /> {phone}
                    </a>
                  )}
                </div>
                {detailsCard}
              </div>
            ) : (
            <>
            <div className="rounded-2xl border border-border bg-surface p-6 shadow-card lg:sticky lg:top-40">
              {tour.price_from != null && (
                <div className="flex items-baseline gap-2">
                  {tour.price_original != null && tour.price_original > tour.price_from && (
                    <span className="font-sans text-lg text-muted line-through">{tour.price_original}€</span>
                  )}
                  <span className="font-display text-4xl font-bold text-cta">από {tour.price_from}€</span>
                </div>
              )}
              <ul className="mt-6 space-y-4 text-[15px]">
                {tour.duration_label && (
                  <li className="flex items-center gap-3"><Clock className="h-5 w-5 shrink-0 text-primary/60" strokeWidth={1.75} /><span>{tour.duration_label}</span></li>
                )}
                {tour.departure_note && (
                  <li className="flex items-center gap-3"><Calendar className="h-5 w-5 shrink-0 text-primary/60" strokeWidth={1.75} /><span>{tour.departure_note}</span></li>
                )}
                {tour.meeting_point && (
                  <li className="flex items-center gap-3"><MapPin className="h-5 w-5 shrink-0 text-primary/60" strokeWidth={1.75} /><span>{tour.meeting_point}</span></li>
                )}
              </ul>
              {routeCta?.primary ? (
                <>
                  <Button asChild variant="accent" size="lg" className="mt-8 w-full">
                    <Link href={routeCta.href}>Κλείστε Online Θέση</Link>
                  </Button>
                  <Button asChild variant="outline" size="lg" className="mt-3 w-full">
                    <Link href="#kratisi">Ζητήστε Προσφορά</Link>
                  </Button>
                </>
              ) : (
                <Button asChild variant="accent" size="lg" className="mt-8 w-full">
                  <Link href="#kratisi">Ζητήστε Κράτηση / Προσφορά</Link>
                </Button>
              )}
              {phone && (
                <a href={telHref(phone)} className="mt-3 flex items-center justify-center gap-2 font-sans text-[14px] font-semibold text-primary hover:text-cta">
                  <Phone className="h-4 w-4" strokeWidth={1.75} /> {phone}
                </a>
              )}
            </div>
            <div className="mt-6 scroll-mt-28 sm:scroll-mt-40" id="kratisi">
              <OnlineBookingForm
                tourId={tour.id}
                subject={tour.title}
                pricePerSeat={tour.price_from}
                sourcePath={`/tour/${tour.slug}`}
              />
            </div>
            </>
            )}
          </aside>
        </div>
      </section>

      {/* Το carousel κρύβεται μόνο του όταν δεν υπάρχουν παρόμοιες εκδρομές. */}
      <RelatedToursCarousel tours={related} />
    </>
  );
}
