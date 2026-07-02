import type { Metadata } from 'next';
import { PageHero } from '@/components/shared/PageHero';
import { ToursExplorer } from '@/components/trips/ToursExplorer';
import { getTours } from '@/lib/queries/tours';
import { getCategories } from '@/lib/queries/categories';

export const metadata: Metadata = {
  title: 'Εκδρομές από την Αθήνα',
  description: 'Όλες οι οργανωμένες εκδρομές της Sergiani Travel — μονοήμερες, πολυήμερες, κρουαζιέρες, θαλάσσια μπάνια και πεζοπορίες από την Αθήνα.',
};

export default async function EkdromesPage() {
  const [tours, categories] = await Promise.all([getTours(), getCategories()]);
  return (
    <>
      <PageHero
        eyebrow="2026"
        title="Εκδρομές από την Αθήνα"
        subtitle="Επιλέξτε προορισμό — μονοήμερες αποδράσεις, πολυήμερα ταξίδια, κρουαζιέρες και πολλά ακόμη."
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
