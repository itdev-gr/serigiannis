import type { Metadata } from 'next';
import { Suspense } from 'react';
import { PageHeading } from '@/components/shared/PageHeading';
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
      <PageHeading
        eyebrow="Online Κράτηση Θέσεων"
        title="Κλείστε Online Θέσεις"
        subtitle="Επιλέξτε εκδρομή και ημερομηνία, διαλέξτε τις θέσεις σας πάνω στο λεωφορείο και ολοκληρώστε την κράτησή σας online."
        breadcrumbs={[{ label: 'Αρχική', href: '/' }, { label: 'Online Θέσεις' }]}
      />
      <section className="py-16 md:py-24">
        <div className="container max-w-4xl">
          <Stepper current={1} />
          <Suspense
            fallback={
              <div className="min-h-[320px] rounded-lg border border-border bg-surface p-6 shadow-card">
                <div className="grid gap-4 sm:grid-cols-2">
                  <div className="sm:col-span-2">
                    <div className="mb-1.5 h-3 w-28 animate-pulse rounded bg-border" />
                    <div className="h-11 w-full animate-pulse rounded-md bg-border/60" />
                  </div>
                  <div>
                    <div className="mb-1.5 h-3 w-32 animate-pulse rounded bg-border" />
                    <div className="h-11 w-full animate-pulse rounded-md bg-border/60" />
                  </div>
                  <div>
                    <div className="mb-1.5 h-3 w-20 animate-pulse rounded bg-border" />
                    <div className="h-11 w-full animate-pulse rounded-md bg-border/60" />
                  </div>
                </div>
                <div className="mt-6 flex justify-end">
                  <div className="h-11 w-40 animate-pulse rounded-md bg-primary/20" />
                </div>
              </div>
            }
          >
            <ExcursionSearchForm excursions={excursions} />
          </Suspense>
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
