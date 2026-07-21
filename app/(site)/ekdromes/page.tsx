import type { Metadata } from 'next';
import { PageHero } from '@/components/shared/PageHero';
import { ToursExplorer } from '@/components/trips/ToursExplorer';
import { getTours } from '@/lib/queries/tours';
import { getCategories } from '@/lib/queries/categories';
import { getSettings } from '@/lib/queries/settings';
import { resolvePageHero } from '@/components/home/resolve-content';

export const metadata: Metadata = {
  title: 'Εκδρομές από την Αθήνα',
  description: 'Όλες οι οργανωμένες εκδρομές της Sergiani Travel, μονοήμερες, πολυήμερες, κρουαζιέρες, θαλάσσια μπάνια και πεζοπορίες από την Αθήνα.',
};

export default async function EkdromesPage() {
  const [tours, categories, settings] = await Promise.all([getTours(), getCategories(), getSettings()]);
  const hero = resolvePageHero(settings, 'ekdromes', {
    title: 'Εκδρομές από την Αθήνα',
    subtitle: 'Επιλέξτε προορισμό, μονοήμερες αποδράσεις, πολυήμερα ταξίδια, κρουαζιέρες και πολλά ακόμη.',
  });
  return (
    <>
      <PageHero
        eyebrow={hero.eyebrow}
        title={hero.title}
        subtitle={hero.subtitle}
        breadcrumbs={[{ label: 'Αρχική', href: '/' }, { label: 'Εκδρομές' }]}
        heightClass="h-[48vh] min-h-[360px]"
      />
      <section className="py-16 md:py-24">
        <div className="container">
          <ToursExplorer tours={tours} categories={categories} />
        </div>
      </section>
    </>
  );
}
