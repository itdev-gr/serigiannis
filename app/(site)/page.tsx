import type { Metadata } from 'next';
import { getFeaturedTours, getTours } from '@/lib/queries/tours';
import { getCategories } from '@/lib/queries/categories';
import { getSettings } from '@/lib/queries/settings';
import { pickNewsTours } from '@/components/home/home-tours';
import { resolveHomeContent, resolveStats, resolveTestimonials } from '@/components/home/resolve-content';
import { websiteJsonLd, tourItemListJsonLd } from '@/lib/seo';
import { Home1Hero } from '@/components/home/Home1Hero';
import { Home1Destinations } from '@/components/home/Home1Destinations';
import { Home1About } from '@/components/home/Home1About';
import { Home1Listing } from '@/components/home/Home1Listing';
import { Home1Promo } from '@/components/home/Home1Promo';
import { Home1Process } from '@/components/home/Home1Process';
import { Home1Testimonials } from '@/components/home/Home1Testimonials';
import { Home1News } from '@/components/home/Home1News';

const HOME_TITLE = 'Μονοήμερες Εκδρομές από Αθήνα 2026 | Sergiani Travel';
const HOME_DESCRIPTION =
  'Μονοήμερες και πολυήμερες εκδρομές από Αθήνα, κρουαζιέρες, θαλάσσια μπάνια και ενοικιάσεις πούλμαν. Sergiani Travel - ταξίδια με πάθος από το 1995!';

export const metadata: Metadata = {
  title: { absolute: HOME_TITLE },
  description: HOME_DESCRIPTION,
  openGraph: {
    title: HOME_TITLE,
    description: HOME_DESCRIPTION,
  },
  alternates: { canonical: '/' },
};

export default async function HomePage() {
  const [featured, allTours, categories, settings] = await Promise.all([
    getFeaturedTours(),
    getTours(),
    getCategories(),
    getSettings(),
  ]);
  const news = pickNewsTours(allTours);
  const copy = resolveHomeContent(settings);
  const homeStats = resolveStats(settings);
  const homeTestimonials = resolveTestimonials(settings);

  return (
    <>
      <script type="application/ld+json" dangerouslySetInnerHTML={{ __html: JSON.stringify(websiteJsonLd()) }} />
      <script type="application/ld+json" dangerouslySetInnerHTML={{ __html: JSON.stringify(tourItemListJsonLd(featured)) }} />
      <Home1Hero categories={categories} content={copy.hero} />
      <Home1Destinations categories={categories} tours={allTours} content={copy.destinations} />
      <Home1About content={copy.about} stats={homeStats} />
      <Home1Listing tours={featured} content={copy.listing} />
      <Home1Promo content={copy.promo} />
      <Home1Process content={copy.process} />
      <Home1Testimonials testimonials={homeTestimonials} content={copy.testimonials} />
      <Home1News tours={news.length ? news : allTours.slice(0, 3)} content={copy.news} />
    </>
  );
}
