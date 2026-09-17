import type { Metadata } from 'next';
import { Suspense } from 'react';
import { PageHeading } from '@/components/shared/PageHeading';
import { ToursExplorer } from '@/components/trips/ToursExplorer';
import { getTours } from '@/lib/queries/tours';
import { getCategories } from '@/lib/queries/categories';
import { getSettings } from '@/lib/queries/settings';
import { resolvePageHero } from '@/components/home/resolve-content';

// Δίχτυ ασφαλείας πέρα από το revalidatePublic() των admin actions: αν κάποια
// ρητή ακύρωση αστοχήσει, ο κατάλογος φρεσκάρει μόνος του μέσα σε 5 λεπτά.
export const revalidate = 300;

export const metadata: Metadata = {
  title: { absolute: 'Εκδρομές από Αθήνα με Πούλμαν, Μονοήμερες & Πολυήμερες | Sergiani Travel' },
  description:
    'Όλες οι οργανωμένες εκδρομές της Sergiani Travel από Αθήνα: μονοήμερες, πολυήμερες, κρουαζιέρες, θαλάσσια μπάνια, πεζοπορίες και ταξίδια εξωτερικού με πούλμαν.',
  alternates: { canonical: '/ekdromes' },
};

export default async function EkdromesPage() {
  const [tours, categories, settings] = await Promise.all([getTours(), getCategories(), getSettings()]);
  const hero = resolvePageHero(settings, 'ekdromes', {
    title: 'Εκδρομές από την Αθήνα',
    subtitle: 'Επιλέξτε προορισμό, μονοήμερες αποδράσεις, πολυήμερα ταξίδια, κρουαζιέρες και πολλά ακόμη.',
  });
  return (
    <>
      <PageHeading
        eyebrow={hero.eyebrow}
        title={hero.title}
        subtitle={hero.subtitle}
        breadcrumbs={[{ label: 'Αρχική', href: '/' }, { label: 'Εκδρομές' }]}
      />
      <section className="pb-16 pt-4 md:pb-24 md:pt-6">
        <div className="container">
          {/* Το useSearchParams του καταλόγου θέλει Suspense στο static rendering. */}
          <Suspense fallback={null}>
            <ToursExplorer tours={tours} categories={categories} />
          </Suspense>
        </div>
      </section>
    </>
  );
}
