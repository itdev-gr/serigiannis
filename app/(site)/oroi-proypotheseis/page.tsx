import type { Metadata } from 'next';
import Link from 'next/link';
import { PageHero } from '@/components/shared/PageHero';
import { LegalPageLayout } from '@/components/shared/LegalPageLayout';
import { LegalSections } from '@/components/shared/LegalSections';
import { getSettings } from '@/lib/queries/settings';
import { buildTermsOfUseSections } from '@/lib/legal/terms-of-use';

export const metadata: Metadata = {
  title: 'Όροι & Προϋποθέσεις',
  description:
    'Γενικοί όροι χρήσης και όροι συμμετοχής για οργανωμένα ταξίδια, κρατήσεις και υπηρεσίες της Sergiani Travel, σύμφωνα με την ισχύουσα νομοθεσία (Π.Δ. 7/2018).',
  alternates: { canonical: '/oroi-proypotheseis' },
};

export default async function TermsOfUsePage() {
  const settings = await getSettings();
  const sections = buildTermsOfUseSections(settings);

  return (
    <>
      <PageHero
        title="Όροι & Προϋποθέσεις"
        breadcrumbs={[
          { label: 'Αρχική', href: '/' },
          { label: 'Όροι & Προϋποθέσεις' },
        ]}
        heightClass="h-[40vh] min-h-[300px]"
      />
      <LegalPageLayout
        intro={
          <>
            Πριν δηλώσετε συμμετοχή σε εκδρομή ή κράτηση, διαβάστε προσεκτικά τους παρακάτω όρους. Για σύντομη ενημέρωση
            μπορείτε επίσης να δείτε τους{' '}
            <Link href="/oroi" className="font-medium text-primary underline-offset-2 hover:underline">
              Όρους Συμμετοχής
            </Link>
            .
          </>
        }
      >
        <LegalSections sections={sections} />
      </LegalPageLayout>
    </>
  );
}
