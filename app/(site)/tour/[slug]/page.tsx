import type { Metadata } from 'next';
import Image from 'next/image';
import Link from 'next/link';
import { notFound } from 'next/navigation';
import { Clock, Calendar, MapPin, Phone, Check } from 'lucide-react';
import { PageHero } from '@/components/shared/PageHero';
import { TourCard } from '@/components/trips/TourCard';
import { BookingForm } from '@/components/trips/BookingForm';
import { Button } from '@/components/ui/Button';
import { getTourBySlug, getTours, getPublishedSlugs } from '@/lib/queries/tours';
import { getSettings } from '@/lib/queries/settings';
import { coverImage, imageUrl } from '@/lib/images';
import { telHref } from '@/lib/phone';
import { SITE_URL } from '@/lib/seo';

export const revalidate = 3600;

export async function generateStaticParams() {
  return (await getPublishedSlugs()).map((slug) => ({ slug }));
}

export async function generateMetadata({ params }: { params: Promise<{ slug: string }> }): Promise<Metadata> {
  const { slug } = await params;
  const tour = await getTourBySlug(slug);
  if (!tour) return {};
  const cover = coverImage(tour);
  const img = imageUrl(cover);
  return {
    title: tour.seo_title ?? tour.title,
    description: tour.seo_description ?? tour.summary ?? undefined,
    alternates: { canonical: `/tour/${tour.slug}` },
    openGraph: {
      title: tour.title,
      description: tour.summary ?? undefined,
      images: img ? [img] : undefined,
    },
  };
}

export default async function TourDetailPage({ params }: { params: Promise<{ slug: string }> }) {
  const { slug } = await params;
  const tour = await getTourBySlug(slug);
  if (!tour) notFound();

  const cover = coverImage(tour);
  const primaryCat = tour.categories?.[0] ?? null;
  const [all, settings] = await Promise.all([getTours(), getSettings()]);
  const phone = settings.phones[0] ?? null;
  const related = all
    .filter((t) => t.slug !== tour.slug && t.categories?.some((c) => primaryCat && c.slug === primaryCat.slug))
    .slice(0, 3);

  const coverUrl = imageUrl(cover);
  const tourUrl = `${SITE_URL}/tour/${tour.slug}`;
  const jsonLd = {
    '@context': 'https://schema.org',
    '@type': 'TouristTrip',
    name: tour.title,
    description: tour.summary ?? undefined,
    url: tourUrl,
    ...(coverUrl ? { image: [coverUrl] } : {}),
    ...(tour.price_from != null
      ? {
          offers: {
            '@type': 'Offer',
            price: tour.price_from,
            priceCurrency: tour.currency,
            availability: 'https://schema.org/InStock',
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

  return (
    <>
      <script type="application/ld+json" dangerouslySetInnerHTML={{ __html: JSON.stringify(jsonLd) }} />
      <script type="application/ld+json" dangerouslySetInnerHTML={{ __html: JSON.stringify(breadcrumbLd) }} />
      <PageHero
        photo={imageUrl(cover) ?? undefined}
        photoAlt={cover?.alt_el ?? tour.title}
        eyebrow={primaryCat?.name_el}
        title={tour.title}
        subtitle={tour.summary ?? undefined}
        breadcrumbs={[
          { label: 'Αρχική', href: '/' },
          { label: 'Εκδρομές', href: '/ekdromes' },
          { label: tour.title },
        ]}
        heightClass="h-[58vh] min-h-[460px]"
      />

      <section className="py-16 md:py-24">
        <div className="container grid gap-10 lg:grid-cols-12">
          {/* Description */}
          <div className="lg:col-span-7">
            <h2 className="font-display text-display-editorial text-primary">Περιγραφή</h2>
            <p className="mt-5 max-w-prose text-[17px] leading-relaxed text-muted">
              {tour.summary ?? 'Αναλυτικό πρόγραμμα σύντομα. Επικοινωνήστε μαζί μας για πλήρεις λεπτομέρειες.'}
            </p>
            <ul className="mt-8 space-y-3">
              {['Άνετα, σύγχρονα πούλμαν', 'Έμπειροι συνοδοί / ξεναγοί', 'Ξεκάθαρες τιμές, χωρίς κρυφές χρεώσεις'].map((f) => (
                <li key={f} className="flex items-center gap-3 text-[15px] text-body">
                  <Check className="h-5 w-5 shrink-0 text-olive" strokeWidth={2} />
                  {f}
                </li>
              ))}
            </ul>
          </div>

          {/* Info card */}
          <aside className="lg:col-span-5">
            <div className="sticky top-28 rounded-lg border border-border bg-surface p-8 shadow-card">
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
              <Button asChild variant="accent" size="lg" className="mt-8 w-full">
                <Link href="/epikoinonia">Κλείστε Θέση</Link>
              </Button>
              {phone && (
                <a href={telHref(phone)} className="mt-3 flex items-center justify-center gap-2 font-sans text-[14px] font-semibold text-primary hover:text-cta">
                  <Phone className="h-4 w-4" strokeWidth={1.75} /> {phone}
                </a>
              )}
            </div>
            <div className="mt-6">
              <BookingForm tourId={tour.id} tourTitle={tour.title} slug={tour.slug} />
            </div>
          </aside>
        </div>
      </section>

      {(() => {
        const gallery = (tour.images ?? []).filter((im) => im.id !== tour.cover_image_id);
        if (gallery.length === 0) return null;
        return (
          <section className="pb-16 md:pb-24">
            <div className="container">
              <h2 className="mb-8 font-display text-display-section text-primary">Φωτογραφίες</h2>
              <div className="grid grid-cols-2 gap-3 sm:grid-cols-3 lg:grid-cols-4">
                {gallery.map((im) => {
                  const url = imageUrl(im);
                  if (!url) return null;
                  return (
                    <a key={im.id} href={url} target="_blank" rel="noopener" className="group relative block aspect-[4/3] overflow-hidden rounded-lg bg-primary/5">
                      <Image src={url} alt={im.alt_el ?? tour.title} fill sizes="(max-width: 640px) 50vw, (max-width: 1024px) 33vw, 25vw" className="object-cover transition-transform duration-500 group-hover:scale-105" />
                    </a>
                  );
                })}
              </div>
            </div>
          </section>
        );
      })()}

      {related.length > 0 && (
        <section className="bg-surface py-16 md:py-24">
          <div className="container">
            <h2 className="mb-10 font-display text-display-section text-primary">Παρόμοιες εκδρομές</h2>
            <div className="grid gap-6 md:grid-cols-2 lg:grid-cols-3">
              {related.map((t) => <TourCard key={t.id} tour={t} />)}
            </div>
          </div>
        </section>
      )}
    </>
  );
}
