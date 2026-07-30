import type { Metadata } from 'next';
import Link from 'next/link';
import { Stepper } from '@/components/ticketing/Stepper';
import { TripList } from '@/components/ticketing/TripList';
import { searchRouteTrips } from '@/app/(site)/eisitiria/actions';

export const metadata: Metadata = {
  title: 'Δρομολόγια Εκδρομής',
  robots: { index: false },
};

export default async function DromologiaPage({
  searchParams,
}: {
  searchParams: Promise<{ route?: string; date?: string; bp?: string; pax?: string }>;
}) {
  const { route, date } = await searchParams;

  if (!route || !date) {
    return <BareMessage text="Η αναζήτηση δεν είναι πλήρης." backLabel="← Νέα αναζήτηση" />;
  }

  const result = await searchRouteTrips({ routeId: route, date });

  if (!result.ok) {
    const text =
      result.error === 'route_not_found'
        ? 'Η εκδρομή δεν βρέθηκε.'
        : result.error === 'date_out_of_range'
          ? 'Η ημερομηνία είναι εκτός της περιόδου κρατήσεων.'
          : 'Κάτι πήγε στραβά. Δοκιμάστε ξανά.';
    return <BareMessage text={text} backLabel="← Νέα αναζήτηση" />;
  }

  return (
    <section className="py-14 md:py-20">
      <div className="container max-w-5xl">
        <Stepper current={2} />
        <TripList
          kind="oneway"
          outboundLabel={result.route.title ?? '—'}
          date={date}
          outbound={result.trips}
          showDateNav={false}
        />
      </div>
    </section>
  );
}

function BareMessage({ text, backLabel }: { text: string; backLabel: string }) {
  return (
    <section className="py-24">
      <div className="container max-w-2xl text-center">
        <p className="mb-6 text-[16px] text-muted">{text}</p>
        <Link href="/eisitiria" className="font-medium text-primary hover:underline">{backLabel}</Link>
      </div>
    </section>
  );
}
