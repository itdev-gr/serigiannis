import type { Metadata } from 'next';
import Link from 'next/link';
import { BadgeCheck, Clock, TriangleAlert } from 'lucide-react';
import { TourOrderSummary } from '@/components/booking/TourOrderSummary';
import { getTourOrderByToken } from '@/lib/queries/tour-orders';
import { getSettings } from '@/lib/queries/settings';
import { telHref } from '@/lib/phone';

export const metadata: Metadata = {
  title: 'Η Κράτησή σας',
  robots: { index: false },
};

export default async function TourBookingConfirmationPage({
  searchParams,
}: {
  searchParams: Promise<{ t?: string }>;
}) {
  const { t } = await searchParams;
  if (!t) return <Message text="Δεν βρέθηκε κράτηση." />;

  const [bundle, settings] = await Promise.all([getTourOrderByToken(t), getSettings()]);
  if (!bundle.ok) return <Message text="Η κράτηση δεν βρέθηκε." />;
  const { order } = bundle;
  const phone = settings.phones[0] ?? null;

  const paid = order.status === 'paid';
  const pendingPayment = order.status === 'awaiting_payment' || order.status === 'pending';
  const offline = order.status === 'offline';

  return (
    <section className="py-14 md:py-20">
      <div className="container max-w-3xl">
        <div
          className={`flex items-start gap-4 rounded-lg border p-6 ${
            paid || offline ? 'border-olive/30 bg-olive/10' : pendingPayment ? 'border-gold/40 bg-gold/10' : 'border-cta/30 bg-cta/5'
          }`}
        >
          {paid || offline ? (
            <BadgeCheck className="mt-0.5 h-7 w-7 shrink-0 text-olive" strokeWidth={1.75} />
          ) : pendingPayment ? (
            <Clock className="mt-0.5 h-7 w-7 shrink-0 text-deep-ink" strokeWidth={1.75} />
          ) : (
            <TriangleAlert className="mt-0.5 h-7 w-7 shrink-0 text-cta" strokeWidth={1.75} />
          )}
          <div>
            <h1 className="font-display text-3xl font-semibold text-primary">
              {paid
                ? 'Η κράτησή σας επιβεβαιώθηκε'
                : offline
                  ? 'Η κράτησή σας καταχωρήθηκε'
                  : pendingPayment
                    ? 'Η πληρωμή εκκρεμεί'
                    : 'Η κράτηση δεν ολοκληρώθηκε'}
            </h1>
            <p className="mt-2 text-[15px] text-body">
              {paid
                ? 'Λάβαμε την πληρωμή σας. Θα λάβετε email με τα στοιχεία της κράτησης.'
                : offline
                  ? 'Θα επικοινωνήσουμε μαζί σας για την εξόφληση και τις λεπτομέρειες της αναχώρησης.'
                  : pendingPayment
                    ? 'Αν ολοκληρώσατε την πληρωμή, η επιβεβαίωση μπορεί να χρειαστεί λίγα λεπτά. Ανανεώστε τη σελίδα ή καλέστε μας.'
                    : 'Η κράτηση ακυρώθηκε ή έληξε. Μπορείτε να ξεκινήσετε νέα κράτηση από τη σελίδα της εκδρομής.'}
            </p>
          </div>
        </div>

        <div className="mt-8">
          <TourOrderSummary order={order} />
        </div>

        <div className="mt-8 flex flex-wrap items-center justify-between gap-4 text-[14px]">
          <Link href={order.tour_slug ? `/tour/${order.tour_slug}` : '/ekdromes'} className="font-semibold text-primary hover:text-cta">
            ← Πίσω στην εκδρομή
          </Link>
          {phone && (
            <span className="text-muted">
              Ερωτήσεις;{' '}
              <a href={telHref(phone)} className="font-semibold text-primary hover:text-cta">{phone}</a>
            </span>
          )}
        </div>
      </div>
    </section>
  );
}

function Message({ text }: { text: string }) {
  return (
    <section className="py-24">
      <div className="container max-w-2xl text-center">
        <p className="mb-6 text-[16px] text-muted">{text}</p>
        <Link href="/ekdromes" className="font-medium text-primary hover:underline">← Όλες οι εκδρομές</Link>
      </div>
    </section>
  );
}
