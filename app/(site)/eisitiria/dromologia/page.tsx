import type { Metadata } from 'next';
import Link from 'next/link';
import { Stepper } from '@/components/ticketing/Stepper';
import { TripList } from '@/components/ticketing/TripList';
import { searchTrips } from '@/app/(site)/eisitiria/actions';
import { getStations } from '@/lib/queries/ticketing';
import type { TripKind } from '@/types/ticketing';

export const metadata: Metadata = {
  title: 'Δρομολόγια',
  robots: { index: false },
};

export default async function DromologiaPage({
  searchParams,
}: {
  searchParams: Promise<{ from?: string; to?: string; date?: string; ret?: string; kind?: string }>;
}) {
  const { from, to, date, ret, kind: rawKind } = await searchParams;
  const kind = (['oneway', 'round', 'open_return'].includes(rawKind ?? '') ? rawKind : 'oneway') as TripKind;

  if (!from || !to || !date) {
    return (
      <BareMessage text="Η αναζήτηση δεν είναι πλήρης." backLabel="← Νέα αναζήτηση" />
    );
  }

  const [stations, result] = await Promise.all([
    getStations(),
    searchTrips({ originId: from, destId: to, date, kind, returnDate: ret }),
  ]);
  const name = (id: string) => stations.find((s) => s.id === id)?.name ?? '—';
  const outbound = result.outbound && result.outbound.ok ? result.outbound.trips : null;
  const inbound = result.inbound && result.inbound.ok ? result.inbound.trips : undefined;

  if (!result.ok || !outbound) {
    const err = (!result.ok ? result.error : undefined) ?? (result.outbound && !result.outbound.ok ? result.outbound.error : 'db');
    const text =
      err === 'route_not_found'
        ? 'Δεν υπάρχει γραμμή για την επιλεγμένη διαδρομή.'
        : err === 'date_out_of_range'
          ? 'Η ημερομηνία είναι εκτός της περιόδου κρατήσεων.'
          : 'Κάτι πήγε στραβά. Δοκιμάστε ξανά.';
    return <BareMessage text={text} backLabel="← Νέα αναζήτηση" />;
  }

  return (
    <section className="py-14 md:py-20">
      <div className="container max-w-5xl">
        <Stepper current={2} />
        <TripList
          kind={kind}
          outboundLabel={`${name(from)} - ${name(to)}`}
          inboundLabel={`${name(to)} - ${name(from)}`}
          date={date}
          retDate={ret}
          outbound={outbound}
          inbound={inbound}
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
