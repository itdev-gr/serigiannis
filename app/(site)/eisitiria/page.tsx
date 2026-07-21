import type { Metadata } from 'next';
import { PageHero } from '@/components/shared/PageHero';
import { PaymentMethods } from '@/components/shared/PaymentMethods';
import { Stepper } from '@/components/ticketing/Stepper';
import { SearchForm } from '@/components/ticketing/SearchForm';
import { getBookingSettings, getPublishedRoutes, getStations } from '@/lib/queries/ticketing';

export const revalidate = 300;

export const metadata: Metadata = {
  title: 'Εισιτήρια Λεωφορείων',
  description:
    'Κλείστε online εισιτήρια λεωφορείου: επιλέξτε δρομολόγιο, θέση και εκδώστε το εισιτήριό σας ηλεκτρονικά.',
  alternates: { canonical: '/eisitiria' },
};

export default async function EisitiriaPage() {
  const [stations, routes, settings] = await Promise.all([
    getStations(),
    getPublishedRoutes(),
    getBookingSettings(),
  ]);

  return (
    <>
      <PageHero
        title="Εισιτήρια Λεωφορείων"
        subtitle="Επιλέξτε διαδρομή και ημερομηνία, διαλέξτε τις θέσεις σας πάνω στο λεωφορείο και εκδώστε τα εισιτήριά σας online."
        breadcrumbs={[{ label: 'Αρχική', href: '/' }, { label: 'Εισιτήρια' }]}
        heightClass="h-[44vh] min-h-[360px]"
      />
      <section className="py-16 md:py-24">
        <div className="container max-w-4xl">
          <Stepper current={1} />
          <SearchForm stations={stations} routes={routes} windowDays={settings.sales_window_days} />
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
