import type { Metadata } from 'next';
import { PageHero } from '@/components/shared/PageHero';
import { PaymentMethods } from '@/components/shared/PaymentMethods';
import { Stepper } from '@/components/ticketing/Stepper';
import { ExcursionSearchForm } from '@/components/ticketing/ExcursionSearchForm';
import { getBookingSettings, getExcursions } from '@/lib/queries/ticketing';

export const revalidate = 300;

export const metadata: Metadata = {
  title: 'Κλείστε Online Θέσεις',
  description:
    'Κλείστε online θέσεις για τις εκδρομές μας: επιλέξτε εκδρομή και ημερομηνία, διαλέξτε τις θέσεις σας πάνω στο λεωφορείο και ολοκληρώστε την κράτησή σας ηλεκτρονικά.',
  alternates: { canonical: '/eisitiria' },
};

export default async function EisitiriaPage() {
  const [excursions, settings] = await Promise.all([getExcursions(), getBookingSettings()]);

  return (
    <>
      <PageHero
        eyebrow="Online Κράτηση Θέσεων"
        title="Κλείστε Online Θέσεις"
        subtitle="Επιλέξτε εκδρομή και ημερομηνία, διαλέξτε τις θέσεις σας πάνω στο λεωφορείο και ολοκληρώστε την κράτησή σας online."
        breadcrumbs={[{ label: 'Αρχική', href: '/' }, { label: 'Online Θέσεις' }]}
        heightClass="h-[44vh] min-h-[360px]"
      />
      <section className="py-16 md:py-24">
        <div className="container max-w-4xl">
          <Stepper current={1} />
          <ExcursionSearchForm excursions={excursions} />
          <p className="mt-6 text-center text-[13px] text-muted">
            Κρατήσεις έως {settings.sales_window_days} ημέρες πριν την αναχώρηση. Οι θέσεις σας δεσμεύονται
            για {settings.hold_minutes}′ κατά την ολοκλήρωση της αγοράς.
          </p>
          <PaymentMethods className="mt-10" />
        </div>
      </section>
    </>
  );
}
