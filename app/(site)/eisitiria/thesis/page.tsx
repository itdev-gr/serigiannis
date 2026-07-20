import type { Metadata } from 'next';
import Link from 'next/link';
import { Stepper } from '@/components/ticketing/Stepper';
import { SeatSelection, type SeatLegData } from '@/components/ticketing/SeatSelection';
import { getTakenSeats } from '@/app/(site)/eisitiria/actions';
import { createPublicClient } from '@/lib/supabase/server';
import type { LayoutJson, TripKind } from '@/types/ticketing';

export const metadata: Metadata = {
  title: 'Επιλογή Θέσεων',
  robots: { index: false },
};

async function loadLeg(tripId: string, title: string): Promise<SeatLegData | null> {
  const sb = createPublicClient();
  const { data: trip } = await sb
    .from('trips')
    .select(
      'id, service_date, departure_at, layout:bus_layouts(layout), route:bus_routes(origin:stations!bus_routes_origin_station_id_fkey(name, code), destination:stations!bus_routes_destination_station_id_fkey(name, code))'
    )
    .eq('id', tripId)
    .maybeSingle();
  if (!trip) return null;
  const t = trip as unknown as {
    id: string;
    service_date: string;
    departure_at: string;
    layout: { layout: LayoutJson } | null;
    route: { origin: { name: string; code: string | null } | null; destination: { name: string; code: string | null } | null } | null;
  };
  if (!t.layout || !t.route) return null;
  const taken = await getTakenSeats(tripId);
  return {
    tripId,
    title,
    routeLabel: `${t.route.origin?.name ?? ''} - ${t.route.destination?.name ?? ''}`,
    dateLabel: new Date(`${t.service_date}T12:00:00`).toLocaleDateString('el-GR', {
      weekday: 'long', day: '2-digit', month: '2-digit', year: 'numeric',
    }),
    time: new Date(t.departure_at).toLocaleTimeString('el-GR', {
      hour: '2-digit', minute: '2-digit', timeZone: 'Europe/Athens',
    }),
    layout: t.layout.layout,
    taken,
  };
}

export default async function ThesisPage({
  searchParams,
}: {
  searchParams: Promise<{ trip?: string; ret_trip?: string; kind?: string; from?: string; to?: string; date?: string; ret?: string }>;
}) {
  const params = await searchParams;
  const kind = (['oneway', 'round', 'open_return'].includes(params.kind ?? '') ? params.kind : 'oneway') as TripKind;

  if (!params.trip) {
    return (
      <section className="py-24">
        <div className="container max-w-2xl text-center">
          <p className="mb-6 text-[16px] text-muted">Δεν έχει επιλεγεί δρομολόγιο.</p>
          <Link href="/eisitiria" className="font-medium text-primary hover:underline">← Νέα αναζήτηση</Link>
        </div>
      </section>
    );
  }

  const legs: SeatLegData[] = [];
  const outbound = await loadLeg(params.trip, 'Λεωφορείο Αναχώρησης');
  if (outbound) legs.push(outbound);
  if (kind === 'round' && params.ret_trip) {
    const ret = await loadLeg(params.ret_trip, 'Λεωφορείο Επιστροφής');
    if (ret) legs.push(ret);
  }

  if (legs.length === 0 || (kind === 'round' && legs.length < 2)) {
    return (
      <section className="py-24">
        <div className="container max-w-2xl text-center">
          <p className="mb-6 text-[16px] text-muted">Το δρομολόγιο δεν είναι πλέον διαθέσιμο.</p>
          <Link href="/eisitiria" className="font-medium text-primary hover:underline">← Νέα αναζήτηση</Link>
        </div>
      </section>
    );
  }

  const back = new URLSearchParams();
  for (const k of ['from', 'to', 'date', 'ret', 'kind'] as const) {
    if (params[k]) back.set(k, params[k]!);
  }

  return (
    <section className="py-14 md:py-20">
      <div className="container max-w-5xl">
        <Stepper current={3} />
        <SeatSelection kind={kind} legs={legs} backHref={`/eisitiria/dromologia?${back.toString()}`} />
      </div>
    </section>
  );
}
