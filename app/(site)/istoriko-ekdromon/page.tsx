import type { Metadata } from 'next';
import { PageHero } from '@/components/shared/PageHero';
import { TourCard } from '@/components/trips/TourCard';
import { RevealOnScroll } from '@/components/shared/RevealOnScroll';
import { getTours } from '@/lib/queries/tours';
import { getSettings } from '@/lib/queries/settings';
import { resolvePageHero } from '@/components/home/resolve-content';

export const metadata: Metadata = {
  title: 'Ιστορικό Εκδρομών',
  description: 'Ένα δείγμα από τις εκδρομές που έχουμε πραγματοποιήσει — 30 χρόνια ταξιδιών σε όλη την Ελλάδα.',
};

export default async function IstorikoPage() {
  const [tours, settings] = await Promise.all([getTours(), getSettings()]);
  const hero = resolvePageHero(settings, 'istoriko', {
    eyebrow: 'Από το 1995',
    title: 'Ιστορικό Εκδρομών',
    subtitle: 'Τριάντα χρόνια ταξιδιών — ένα δείγμα από τους προορισμούς που έχουμε μοιραστεί με τους ταξιδιώτες μας.',
  });
  return (
    <>
      <PageHero
        eyebrow={hero.eyebrow}
        title={hero.title}
        subtitle={hero.subtitle}
        breadcrumbs={[{ label: 'Αρχική', href: '/' }, { label: 'Ιστορικό Εκδρομών' }]}
        heightClass="h-[44vh] min-h-[340px]"
      />
      <section className="py-16 md:py-24">
        <div className="container">
          <RevealOnScroll className="grid gap-6 md:grid-cols-2 lg:grid-cols-3">
            {tours.map((t) => (
              <div key={t.id} data-reveal><TourCard tour={t} /></div>
            ))}
          </RevealOnScroll>
        </div>
      </section>
    </>
  );
}
