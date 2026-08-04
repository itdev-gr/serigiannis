import { createServerClient, isDbConfigured } from '@/lib/supabase/server';
import { decodeEntities } from '@/lib/text';
import type { TourDeparture, TourOrder, TourOrderBundle, TourPriceTier } from '@/types/db';

/** Token-gated read for the checkout / confirmation pages (SECURITY DEFINER RPC). */
export async function getTourOrderByToken(token: string): Promise<TourOrderBundle> {
  if (!isDbConfigured()) return { ok: false, error: 'db' };
  const sb = await createServerClient();
  const { data, error } = await sb.rpc('get_tour_order_by_token', { p_token: token });
  if (error) {
    console.error('getTourOrderByToken:', error.message);
    return { ok: false, error: 'db' };
  }
  return (data ?? { ok: false, error: 'order_not_found' }) as TourOrderBundle;
}

/** Admin list of tour bookings, newest first (RLS: is_admin). */
export async function getAdminTourOrders(status?: string): Promise<TourOrder[]> {
  if (!isDbConfigured()) return [];
  const sb = await createServerClient();
  let q = sb.from('tour_orders').select('*').order('created_at', { ascending: false }).limit(300);
  if (status) q = q.eq('status', status);
  const { data, error } = await q;
  if (error) {
    console.error('getAdminTourOrders:', error.message);
    return [];
  }
  return (data ?? []) as TourOrder[];
}

export async function getAdminTourOrder(id: string): Promise<(TourOrder & { admin_notes: string | null }) | null> {
  if (!isDbConfigured()) return null;
  const sb = await createServerClient();
  const { data, error } = await sb.from('tour_orders').select('*').eq('id', id).maybeSingle();
  if (error) {
    console.error('getAdminTourOrder:', error.message);
    return null;
  }
  return (data as (TourOrder & { admin_notes: string | null }) | null) ?? null;
}

/** Every tier + departure of a tour (including inactive ones) for the admin editors. */
export async function getTourBookingSetup(
  tourId: string
): Promise<{ tiers: TourPriceTier[]; departures: TourDeparture[] }> {
  if (!isDbConfigured()) return { tiers: [], departures: [] };
  const sb = await createServerClient();
  const [tiers, departures] = await Promise.all([
    sb.from('tour_price_tiers').select('*').eq('tour_id', tourId).order('position'),
    sb.from('tour_departures').select('*').eq('tour_id', tourId).order('starts_on'),
  ]);
  if (tiers.error) console.error('getTourBookingSetup tiers:', tiers.error.message);
  if (departures.error) console.error('getTourBookingSetup departures:', departures.error.message);
  return {
    tiers: ((tiers.data ?? []) as TourPriceTier[]).map((t) => ({ ...t, label: decodeEntities(t.label) })),
    departures: (departures.data ?? []) as TourDeparture[],
  };
}
