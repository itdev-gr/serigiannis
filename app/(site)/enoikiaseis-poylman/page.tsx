import type { Metadata } from 'next';
import { PageHero } from '@/components/shared/PageHero';
import { PoylmanPageBody } from '@/components/rentals/PoylmanPageBody';
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
      <PageHero
        title={hero.title}
        subtitle={hero.subtitle}
        breadcrumbs={[{ label: 'Αρχική', href: '/' }, { label: 'Ενοικιάσεις Πούλμαν' }]}
        heightClass="h-[52vh] min-h-[420px]"
        textScale="lg"
      />

      <PoylmanPageBody />
    </>
  );
}
