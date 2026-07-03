import type { Metadata } from 'next';
import { PageHero } from '@/components/shared/PageHero';
import { LegalBody } from '@/components/shared/LegalBody';
import { getSettings } from '@/lib/queries/settings';

export const metadata: Metadata = {
  title: 'Όροι Συμμετοχής',
  description: 'Όροι συμμετοχής και προϋποθέσεις για τις εκδρομές και υπηρεσίες της Sergiani Travel.',
};

const SECTIONS = [
  { h: 'Κρατήσεις', p: 'Η κράτηση θεωρείται έγκυρη με την καταβολή προκαταβολής και την επιβεβαίωση από το γραφείο μας. Οι θέσεις είναι περιορισμένες και τηρείται σειρά προτεραιότητας.' },
  { h: 'Πληρωμές', p: 'Δεκτές πληρωμές με μετρητά, κάρτα, IRIS ή τραπεζική κατάθεση. Η εξόφληση γίνεται πριν την αναχώρηση, εκτός αν συμφωνηθεί διαφορετικά.' },
  { h: 'Ακυρώσεις', p: 'Οι ακυρώσεις γίνονται δεκτές έως ορισμένο χρονικό διάστημα πριν την αναχώρηση. Οι όροι επιστροφής χρημάτων εξαρτώνται από τον χρόνο ακύρωσης και το είδος της εκδρομής.' },
  { h: 'Ευθύνη', p: 'Το γραφείο ενεργεί ως μεσολαβητής μεταξύ των ταξιδιωτών και των προμηθευτών υπηρεσιών και λαμβάνει κάθε μέτρο για την ομαλή διεξαγωγή των εκδρομών.' },
  { h: 'Προσωπικά Δεδομένα', p: 'Τα προσωπικά σας δεδομένα χρησιμοποιούνται αποκλειστικά για την εξυπηρέτηση της κράτησής σας, σύμφωνα με την ισχύουσα νομοθεσία περί προστασίας δεδομένων.' },
];

export default async function TermsPage() {
  const settings = await getSettings();
  const customBody = settings.legal?.terms?.trim();

  return (
    <>
      <PageHero
        eyebrow="Ενημέρωση"
        title="Όροι Συμμετοχής"
        breadcrumbs={[{ label: 'Αρχική', href: '/' }, { label: 'Όροι Συμμετοχής' }]}
        heightClass="h-[40vh] min-h-[300px]"
      />
      <section className="py-16 md:py-24">
        <div className="container max-w-prose">
          <p className="text-[15px] italic text-muted">
            Οι παρακάτω όροι είναι ενδεικτικοί. Για τους πλήρεις και επίσημους όρους συμμετοχής, επικοινωνήστε με το γραφείο μας.
          </p>
          {customBody ? (
            <LegalBody text={settings.legal!.terms!} />
          ) : (
            <div className="mt-10 space-y-10">
              {SECTIONS.map((s) => (
                <div key={s.h}>
                  <h2 className="font-display text-2xl font-semibold text-primary">{s.h}</h2>
                  <p className="mt-3 text-[17px] leading-relaxed text-muted">{s.p}</p>
                </div>
              ))}
            </div>
          )}
        </div>
      </section>
    </>
  );
}
