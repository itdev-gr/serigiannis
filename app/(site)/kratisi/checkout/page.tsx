import type { Metadata } from 'next';
import Link from 'next/link';
import { redirect } from 'next/navigation';
import { TourCheckoutForm } from '@/components/booking/TourCheckoutForm';
import { TourOrderSummary } from '@/components/booking/TourOrderSummary';
import { PaymentMethods } from '@/components/shared/PaymentMethods';
import { getTourOrderByToken } from '@/lib/queries/tour-orders';
import { getPaymentProvider } from '@/lib/payments';

export const metadata: Metadata = {
  title: 'Ολοκλήρωση Κράτησης',
  robots: { index: false },
};

export default async function TourCheckoutPage({
  searchParams,
}: {
  searchParams: Promise<{ order?: string; t?: string }>;
}) {
  const { t } = await searchParams;
  if (!t) redirect('/ekdromes');

  const bundle = await getTourOrderByToken(t);
  if (!bundle.ok) return <Message text="Η κράτηση δεν βρέθηκε." />;

  const { order } = bundle;
  if (order.status === 'paid' || order.status === 'offline') redirect(`/kratisi/epivevaiosi?t=${t}`);
  if (order.status !== 'pending' && order.status !== 'awaiting_payment') {
    return <Message text="Η κράτηση έληξε ή ακυρώθηκε. Ξεκινήστε ξανά από τη σελίδα της εκδρομής." />;
  }

  return (
    <section className="py-14 md:py-20">
      <div className="container grid max-w-5xl gap-8 lg:grid-cols-12">
        <div className="lg:col-span-7">
          <h1 className="mb-6 font-display text-display-editorial text-primary">Ολοκλήρωση κράτησης</h1>
          <TourCheckoutForm
            order={order}
            token={t}
            offline={getPaymentProvider().id === 'offline'}
            meetingPoints={bundle.meeting_points}
          />
        </div>
        <aside className="lg:col-span-5">
          <div className="sticky top-28 space-y-6">
            <TourOrderSummary order={order} />
            <PaymentMethods />
          </div>
        </aside>
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
