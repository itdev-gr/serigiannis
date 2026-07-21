import type { Metadata } from 'next';
import Link from 'next/link';
import { PageHero } from '@/components/shared/PageHero';
import { LegalBody } from '@/components/shared/LegalBody';
import { LegalPageLayout } from '@/components/shared/LegalPageLayout';
import { LegalSimpleSections } from '@/components/shared/LegalSections';
import { getSettings } from '@/lib/queries/settings';

export const metadata: Metadata = {
  title: 'Όροι Συμμετοχής',
  description: 'Όροι συμμετοχής και προϋποθέσεις για τις εκδρομές και υπηρεσίες της Sergiani Travel.',
};

const SECTIONS = [
  { title: 'Κρατήσεις', body: 'Η κράτηση θεωρείται έγκυρη με την καταβολή προκαταβολής και την επιβεβαίωση από το γραφείο μας. Οι θέσεις είναι περιορισμένες και τηρείται σειρά προτεραιότητας.' },
  { title: 'Πληρωμές', body: 'Δεκτές πληρωμές με μετρητά, POS, IRIS ή πιστωτική/χρεωστική κάρτα. Η εξόφληση γίνεται πριν την αναχώρηση, εκτός αν συμφωνηθεί διαφορετικά.' },
  { title: 'Ακυρώσεις', body: 'Οι ακυρώσεις γίνονται δεκτές έως ορισμένο χρονικό διάστημα πριν την αναχώρηση. Οι όροι επιστροφής χρημάτων εξαρτώνται από τον χρόνο ακύρωσης και το είδος της εκδρομής.' },
  { title: 'Ευθύνη', body: 'Το γραφείο ενεργεί ως μεσολαβητής μεταξύ των ταξιδιωτών και των προμηθευτών υπηρεσιών και λαμβάνει κάθε μέτρο για την ομαλή διεξαγωγή των εκδρομών.' },
  { title: 'Προσωπικά Δεδομένα', body: 'Τα προσωπικά σας δεδομένα χρησιμοποιούνται αποκλειστικά για την εξυπηρέτηση της κράτησής σας, σύμφωνα με την ισχύουσα νομοθεσία περί προστασίας δεδομένων.' },
];

export default async function TermsPage() {
  const settings = await getSettings();
  const customBody = settings.legal?.terms?.trim();

  return (
    <>
      <PageHero
        title="Όροι Συμμετοχής"
        breadcrumbs={[{ label: 'Αρχική', href: '/' }, { label: 'Όροι Συμμετοχής' }]}
        heightClass="h-[40vh] min-h-[300px]"
      />
      <LegalPageLayout
        intro={
          <>
            Οι παρακάτω όροι είναι ενδεικτικοί. Για τους πλήρεις όρους συμμετοχής και τις λεπτομέρειες κάθε εκδρομής,
            επικοινωνήστε με το γραφείο μας. Για την πλήρη έκδοση δείτε τους{' '}
            <Link href="/oroi-proypotheseis" className="font-medium text-primary underline-offset-2 hover:underline">
              Όρους & Προϋποθέσεις
            </Link>
            .
          </>
        }
      >
        {customBody ? <LegalBody text={settings.legal!.terms!} /> : <LegalSimpleSections sections={SECTIONS} />}
      </LegalPageLayout>
    </>
  );
}
