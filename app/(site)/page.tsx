import type { Metadata } from 'next';
import { getFeaturedTours, getTours } from '@/lib/queries/tours';
import { getCategories } from '@/lib/queries/categories';
import { getSettings } from '@/lib/queries/settings';
import { pickNewsTours } from '@/components/home/home-tours';
import { resolveHomeContent } from '@/components/home/resolve-content';
import { Home1Hero } from '@/components/home/Home1Hero';
import { Home1Destinations } from '@/components/home/Home1Destinations';
import { Home1About } from '@/components/home/Home1About';
import { Home1Listing } from '@/components/home/Home1Listing';
import { Home1Promo } from '@/components/home/Home1Promo';
import { Home1Process } from '@/components/home/Home1Process';
import { Home1Testimonials } from '@/components/home/Home1Testimonials';
import { Home1News } from '@/components/home/Home1News';
import { Home1Cta } from '@/components/home/Home1Cta';

export const metadata: Metadata = {
  title: 'Sergiani Travel · Εκδρομές, Κρουαζιέρες & Πούλμαν από την Αθήνα',
  description:
    'Μονοήμερες και πολυήμερες εκδρομές, κρουαζιέρες και ενοικιάσεις πούλμαν από την Αθήνα. 30 χρόνια εμπειρίας, άνετα πούλμαν, ξεκάθαρες τιμές.',
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

  return (
    <>
      <Home1Hero categories={categories} content={copy.hero} />
      <Home1Destinations categories={categories} tours={allTours} />
      <Home1About content={copy.about} />
      <Home1Listing tours={featured} />
      <Home1Promo />
      <Home1Process />
      <Home1Testimonials />
      <Home1News tours={news.length ? news : allTours.slice(0, 3)} />
      <Home1Cta settings={settings} />
    </>
  );
}
