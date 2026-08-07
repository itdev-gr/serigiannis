import type { Metadata } from 'next';
import { PageHeading } from '@/components/shared/PageHeading';
import { PoylmanPageBody } from '@/components/rentals/PoylmanPageBody';
import { PoylmanQuoteForm } from '@/components/rentals/PoylmanQuoteForm';
import { PoylmanQuoteFab } from '@/components/rentals/PoylmanQuoteFab';
import { getSettings } from '@/lib/queries/settings';
import { resolvePageHero } from '@/components/home/resolve-content';

export const metadata: Metadata = {
  title: 'Ενοικιάσεις Πούλμαν για Εκδρομές',
  description:
    'Ενοικιάσεις πούλμαν για εκδρομές, σχολεία και εταιρείες με Sergiani Travel. Στόλος 8-60 θέσεων, επαγγελματίες οδηγοί, πλήρης οργάνωση ταξιδιού.',
  alternates: { canonical: '/enoikiaseis-poylman' },
};

export default async function RentalsPage() {
  const settings = await getSettings();
  const hero = resolvePageHero(settings, 'poylman', {
    title: 'Ενοικιάσεις Πούλμαν',
    subtitle:
      'Ιδιωτικές μεταφορές με σύγχρονο στόλο, έμπειρους Έλληνες οδηγούς και οργάνωση εκδρομών σε όλη την Ελλάδα.',
  });
  return (
    <>
      <PageHeading
        title={hero.title}
        subtitle={hero.subtitle}
        breadcrumbs={[{ label: 'Αρχική', href: '/' }, { label: 'Ενοικιάσεις Πούλμαν' }]}
      />

      {/* Δύο στήλες σε desktop: το περιεχόμενο αριστερά, η φόρμα προσφοράς
          δεξιά και sticky ώστε να ακολουθεί τον επισκέπτη. Το <aside> είναι
          δεύτερο στο DOM, οπότε στο κινητό η φόρμα πέφτει στο τέλος. */}
      <section className="bg-background py-16 md:py-24">
        <div className="container grid gap-10 lg:grid-cols-12">
          <div className="lg:col-span-7">
            <PoylmanPageBody />
          </div>
          <aside id="prosfora" className="scroll-mt-28 lg:col-span-5">
            <div className="lg:sticky lg:top-28">
              <PoylmanQuoteForm />
            </div>
          </aside>
        </div>
      </section>

      <PoylmanQuoteFab />
    </>
  );
}
