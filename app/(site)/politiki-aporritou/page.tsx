import type { Metadata } from 'next';
import Link from 'next/link';
import { PageHero } from '@/components/shared/PageHero';
import { LegalBody } from '@/components/shared/LegalBody';
import { LegalPageLayout } from '@/components/shared/LegalPageLayout';
import { LegalSections } from '@/components/shared/LegalSections';
import { getSettings } from '@/lib/queries/settings';
import { buildPrivacyPolicySections } from '@/lib/legal/privacy-policy';

export const metadata: Metadata = {
  title: 'Πολιτική Απορρήτου',
  description:
    'Πολιτική απορρήτου και συμμόρφωση GDPR της Sergiani Travel: συλλογή, επεξεργασία, cookies και δικαιώματα των υποκειμένων των δεδομένων.',
  alternates: { canonical: '/politiki-aporritou' },
};

export default async function PrivacyPolicyPage() {
  const settings = await getSettings();
  const customBody = settings.legal?.privacy?.trim();
  const sections = buildPrivacyPolicySections(settings);

  return (
    <>
      <PageHero
        title="Πολιτική Απορρήτου"
        breadcrumbs={[{ label: 'Αρχική', href: '/' }, { label: 'Πολιτική Απορρήτου' }]}
        heightClass="h-[40vh] min-h-[300px]"
      />
      <LegalPageLayout
        intro={
          <>
            Η παρούσα πολιτική περιγράφει πώς η Sergiani Travel επεξεργάζεται τα προσωπικά σας δεδομένα, σύμφωνα με τον
            GDPR. Για τους όρους συμμετοχής σε εκδρομές δείτε και τους{' '}
            <Link href="/oroi-proypotheseis" className="font-medium text-primary underline-offset-2 hover:underline">
              Όρους & Προϋποθέσεις
            </Link>
            .
          </>
        }
      >
        {customBody ? <LegalBody text={settings.legal!.privacy!} /> : <LegalSections sections={sections} />}
      </LegalPageLayout>
    </>
  );
}
