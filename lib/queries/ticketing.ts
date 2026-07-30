import { createPublicClient, createServerClient, isDbConfigured } from '@/lib/supabase/server';
import type {
  BookingSettings,
  BusLayout,
  BusRoute,
  Excursion,
  FareType,
  SchedulePattern,
  Station,
  Trip,
} from '@/types/ticketing';
import { groupRouteDates, type RouteDateRow } from '@/lib/excursions';

const DEFAULT_SETTINGS: BookingSettings = {
  hold_minutes: 30,
  sales_window_days: 30,
  default_cutoff_min: 5,
  refund_cutoff_hours: 8,
  refund_pct_early: 70,
  refund_pct_late: 50,
  open_return_months: 3,
};

// ---------------------------------------------------------------- public

export async function getStations(): Promise<Station[]> {
  if (!isDbConfigured()) return [];
  const sb = createPublicClient();
  const { data, error } = await sb.from('stations').select('*').order('position');
  if (error) { console.error('getStations:', error.message); return []; }
  return (data ?? []) as Station[];
}

export async function getBookingSettings(): Promise<BookingSettings> {
  if (!isDbConfigured()) return DEFAULT_SETTINGS;
  const sb = createPublicClient();
  const { data, error } = await sb.from('booking_settings').select('*').eq('id', 1).maybeSingle();
  if (error || !data) {
    if (error) console.error('getBookingSettings:', error.message);
    return DEFAULT_SETTINGS;
  }
  return data as BookingSettings;
}

type ExcursionRouteRow = BusRoute & { destination: { name: string } | null };

/** Published routes as excursions, with the dates they actually run. */
export async function getExcursions(): Promise<Excursion[]> {
  const sb = createPublicClient();
  const [routesRes, datesRes] = await Promise.all([
    sb
      .from('bus_routes')
      .select('*, destination:stations!bus_routes_destination_station_id_fkey(name)')
      .eq('status', 'published')
      .order('position'),
    sb.rpc('list_route_dates'),
  ]);
  if (routesRes.error) { console.error('getExcursions routes:', routesRes.error.message); return []; }
  if (datesRes.error) { console.error('getExcursions dates:', datesRes.error.message); return []; }
  const dateMap = groupRouteDates((datesRes.data ?? []) as RouteDateRow[]);
  return ((routesRes.data ?? []) as ExcursionRouteRow[]).map((r) => ({
    id: r.id,
    title: r.title?.trim() || (r.destination?.name ?? '—'),
    boarding_points: r.boarding_points ?? [],
    dates: dateMap.get(r.id) ?? [],
  }));
}

export async function getTripWithLayout(tripId: string): Promise<{ trip: Trip; layout: BusLayout } | null> {
  if (!isDbConfigured()) return null;
  const sb = createPublicClient();
  const { data: trip, error } = await sb.from('trips').select('*').eq('id', tripId).maybeSingle();
  if (error || !trip) { if (error) console.error('getTripWithLayout:', error.message); return null; }
  const { data: layout, error: e2 } = await sb.from('bus_layouts').select('*').eq('id', trip.layout_id).maybeSingle();
  if (e2 || !layout) { if (e2) console.error('getTripWithLayout:', e2.message); return null; }
  return { trip: trip as Trip, layout: layout as BusLayout };
}

export async function getRouteFares(routeId: string): Promise<FareType[]> {
  if (!isDbConfigured()) return [];
  const sb = createPublicClient();
  const { data, error } = await sb.from('fare_types').select('*').eq('route_id', routeId).order('position');
  if (error) { console.error('getRouteFares:', error.message); return []; }
  return (data ?? []) as FareType[];
}

// ----------------------------------------------------------------- admin

export async function getAdminStations(): Promise<Station[]> {
  const sb = await createServerClient();
  const { data } = await sb.from('stations').select('*').order('position');
  return (data ?? []) as Station[];
}

export type AdminRoute = BusRoute & { origin: { name: string } | null; destination: { name: string } | null };

export async function getAdminRoutes(): Promise<AdminRoute[]> {
  const sb = await createServerClient();
  const { data } = await sb
    .from('bus_routes')
    .select('*, origin:stations!bus_routes_origin_station_id_fkey(name), destination:stations!bus_routes_destination_station_id_fkey(name)')
    .order('position');
  return (data ?? []) as AdminRoute[];
}

export async function getAdminRoute(id: string): Promise<AdminRoute | null> {
  const sb = await createServerClient();
  const { data } = await sb
    .from('bus_routes')
    .select('*, origin:stations!bus_routes_origin_station_id_fkey(name), destination:stations!bus_routes_destination_station_id_fkey(name)')
    .eq('id', id)
    .maybeSingle();
  return (data as AdminRoute) ?? null;
}

export async function getAdminRouteFares(routeId: string): Promise<FareType[]> {
  const sb = await createServerClient();
  const { data } = await sb.from('fare_types').select('*').eq('route_id', routeId).order('position');
  return (data ?? []) as FareType[];
}

/** All fares across every route — for the excursions list (avoids per-route N+1). */
export async function getAdminAllFares(): Promise<FareType[]> {
  const sb = await createServerClient();
  const { data } = await sb.from('fare_types').select('*').order('position');
  return (data ?? []) as FareType[];
}

export async function getAdminLayouts(): Promise<BusLayout[]> {
  const sb = await createServerClient();
  const { data } = await sb.from('bus_layouts').select('*').order('created_at');
  return (data ?? []) as BusLayout[];
}

export async function getAdminLayout(id: string): Promise<BusLayout | null> {
  const sb = await createServerClient();
  const { data } = await sb.from('bus_layouts').select('*').eq('id', id).maybeSingle();
  return (data as BusLayout) ?? null;
}

export type AdminPattern = SchedulePattern & {
  route: { id: string; title: string | null; origin: { name: string } | null; destination: { name: string } | null } | null;
  layout: { name: string } | null;
};

export async function getAdminPatterns(): Promise<AdminPattern[]> {
  const sb = await createServerClient();
  const { data } = await sb
    .from('schedule_patterns')
    .select('*, route:bus_routes(id, title, origin:stations!bus_routes_origin_station_id_fkey(name), destination:stations!bus_routes_destination_station_id_fkey(name)), layout:bus_layouts(name)')
    .order('departure_time');
  return (data ?? []) as AdminPattern[];
}

export async function getAdminPattern(id: string): Promise<SchedulePattern | null> {
  const sb = await createServerClient();
  const { data } = await sb.from('schedule_patterns').select('*').eq('id', id).maybeSingle();
  return (data as SchedulePattern) ?? null;
}

export type AdminTrip = Trip & {
  route: { title: string | null; origin: { name: string } | null; destination: { name: string } | null } | null;
  layout: { name: string } | null;
};

export async function getAdminTrips(from: string, to: string): Promise<AdminTrip[]> {
  const sb = await createServerClient();
  const { data } = await sb
    .from('trips')
    .select('*, route:bus_routes(title, origin:stations!bus_routes_origin_station_id_fkey(name), destination:stations!bus_routes_destination_station_id_fkey(name)), layout:bus_layouts(name)')
    .gte('service_date', from)
    .lte('service_date', to)
    .order('departure_at');
  return (data ?? []) as AdminTrip[];
}

export async function getAdminTrip(id: string): Promise<AdminTrip | null> {
  const sb = await createServerClient();
  const { data } = await sb
    .from('trips')
    .select('*, route:bus_routes(title, origin:stations!bus_routes_origin_station_id_fkey(name), destination:stations!bus_routes_destination_station_id_fkey(name)), layout:bus_layouts(name)')
    .eq('id', id)
    .maybeSingle();
  return (data as AdminTrip) ?? null;
}

export type AdminSeatClaim = {
  id: string;
  seat_no: string;
  claim_type: 'hold' | 'booked' | 'blocked';
  order_id: string | null;
  ticket_id: string | null;
  expires_at: string | null;
  ticket?: { passenger_name: string; code: string; order_id: string } | null;
};

export async function getTripClaims(tripId: string): Promise<AdminSeatClaim[]> {
  const sb = await createServerClient();
  const { data } = await sb
    .from('trip_seat_claims')
    .select('id, seat_no, claim_type, order_id, ticket_id, expires_at, ticket:tickets(passenger_name, code, order_id)')
    .eq('trip_id', tripId);
  return (data ?? []) as unknown as AdminSeatClaim[];
}

/** Taken-seat counts per trip (booked + blocked + live holds; expired holds excluded).
 *  Mirrors the SQL predicate `claim_type <> 'hold' OR expires_at > now()`. */
export async function getTripsOccupancy(tripIds: string[]): Promise<Map<string, { taken: number }>> {
  const map = new Map<string, { taken: number }>();
  if (tripIds.length === 0) return map;
  const sb = await createServerClient();
  const { data } = await sb
    .from('trip_seat_claims')
    .select('trip_id, claim_type, expires_at')
    .in('trip_id', tripIds);
  const now = Date.now();
  for (const c of (data ?? []) as { trip_id: string; claim_type: string; expires_at: string | null }[]) {
    const active = c.claim_type !== 'hold' || (c.expires_at != null && new Date(c.expires_at).getTime() > now);
    if (!active) continue;
    const entry = map.get(c.trip_id) ?? { taken: 0 };
    entry.taken += 1;
    map.set(c.trip_id, entry);
  }
  return map;
}

export type AdminOrder = {
  id: string;
  public_code: string;
  access_token: string;
  kind: string;
  status: string;
  customer_name: string | null;
  email: string | null;
  phone: string | null;
  boarding_point: string | null;
  amount_total_cents: number;
  payment_provider: string | null;
  paid_at: string | null;
  admin_notes: string | null;
  created_by_admin: boolean;
  created_at: string;
  expires_at: string | null;
};

export async function getAdminOrders(status?: string): Promise<AdminOrder[]> {
  const sb = await createServerClient();
  let q = sb.from('ticket_orders').select('*').order('created_at', { ascending: false }).limit(300);
  if (status) q = q.eq('status', status);
  const { data } = await q;
  return (data ?? []) as AdminOrder[];
}

export type AdminTicket = {
  id: string;
  code: string;
  leg: 'outbound' | 'return';
  passenger_key: number;
  trip_id: string | null;
  seat_no: string | null;
  passenger_name: string;
  passenger_phone: string | null;
  fare_name: string;
  fare_basis: string;
  price_cents: number;
  status: 'valid' | 'used' | 'cancelled';
  open_return: boolean;
  open_return_expires_on: string | null;
  refunded_cents: number | null;
  validated_at: string | null;
  trip?: {
    route_id: string;
    service_date: string;
    departure_at: string;
    route: { title: string | null; origin: { name: string } | null; destination: { name: string } | null } | null;
  } | null;
};

export async function getAdminOrder(id: string): Promise<{ order: AdminOrder; tickets: AdminTicket[] } | null> {
  const sb = await createServerClient();
  const { data: order } = await sb.from('ticket_orders').select('*').eq('id', id).maybeSingle();
  if (!order) return null;
  const { data: tickets } = await sb
    .from('tickets')
    .select('*, trip:trips(route_id, service_date, departure_at, route:bus_routes(title, origin:stations!bus_routes_origin_station_id_fkey(name), destination:stations!bus_routes_destination_station_id_fkey(name)))')
    .eq('order_id', id)
    .order('passenger_key')
    .order('leg');
  return { order: order as AdminOrder, tickets: (tickets ?? []) as AdminTicket[] };
}

export async function getAdminBookingSettings(): Promise<BookingSettings> {
  const sb = await createServerClient();
  const { data } = await sb.from('booking_settings').select('*').eq('id', 1).maybeSingle();
  return (data as BookingSettings) ?? DEFAULT_SETTINGS;
}
