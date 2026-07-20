'use server';
import { redirect } from 'next/navigation';
import { createServerClient } from '@/lib/supabase/server';
import { getPaymentProvider } from '@/lib/payments';
import type { SearchResult, TripKind } from '@/types/ticketing';

export type TwoWaySearch = {
  ok: boolean;
  error?: string;
  outbound?: SearchResult;
  inbound?: SearchResult;
};

/** Step 1 → 2: trips for the requested day (and the reverse leg for round trips). */
export async function searchTrips(input: {
  originId: string;
  destId: string;
  date: string;
  kind: TripKind;
  returnDate?: string;
}): Promise<TwoWaySearch> {
  const sb = await createServerClient();
  const { data: outbound, error } = await sb.rpc('search_trips', {
    p_origin: input.originId,
    p_dest: input.destId,
    p_date: input.date,
  });
  if (error) { console.error('searchTrips:', error.message); return { ok: false, error: 'db' }; }

  if (input.kind !== 'round') return { ok: true, outbound: outbound as SearchResult };

  const { data: inbound, error: e2 } = await sb.rpc('search_trips', {
    p_origin: input.destId,
    p_dest: input.originId,
    p_date: input.returnDate || input.date,
  });
  if (e2) { console.error('searchTrips return:', e2.message); return { ok: false, error: 'db' }; }
  return { ok: true, outbound: outbound as SearchResult, inbound: inbound as SearchResult };
}

/** Fresh taken-seats list for a trip (polled by the seat map). */
export async function getTakenSeats(tripId: string): Promise<string[]> {
  const sb = await createServerClient();
  const { data, error } = await sb.rpc('get_trip_seat_status', { p_trip_id: tripId });
  if (error) { console.error('getTakenSeats:', error.message); return []; }
  return (data as string[]) ?? [];
}

/** Step 3 → 4: acquire the 30' seat holds; redirects to checkout on success. */
export async function beginCheckout(input: {
  kind: TripKind;
  legs: { tripId: string; seats: string[] }[];
}): Promise<{ ok: false; error: string }> {
  const sb = await createServerClient();
  const { data, error } = await sb.rpc('begin_booking', {
    p: {
      kind: input.kind,
      legs: input.legs.map((l) => ({ trip_id: l.tripId, seats: l.seats })),
    },
  });
  if (error) { console.error('beginCheckout:', error.message); return { ok: false, error: 'db' }; }
  const res = data as { ok: boolean; error?: string; order_id?: string; access_token?: string };
  if (!res.ok) return { ok: false, error: res.error ?? 'unknown' };
  redirect(`/eisitiria/checkout?order=${res.order_id}&t=${res.access_token}`);
}

export type CheckoutInput = {
  orderId: string;
  token: string;
  billing: {
    customer_name: string;
    email: string;
    phone: string;
    address?: string;
    city?: string;
    postal_code?: string;
    region?: string;
    marketing_opt_in?: boolean;
    accept_terms: boolean;
  };
  passengers: { passenger_name: string; fare_type_id: string; outbound_seat: string; return_seat?: string }[];
};

/** Step 4: finalize. Offline → tickets issue now; gateway → redirect to the bank. */
export async function submitCheckout(input: CheckoutInput): Promise<{ ok: false; error: string }> {
  const provider = getPaymentProvider();
  const sb = await createServerClient();
  const { data, error } = await sb.rpc('finalize_checkout', {
    p_order_id: input.orderId,
    p_token: input.token,
    p_billing: input.billing,
    p_passengers: input.passengers,
    p_provider: provider.id,
  });
  if (error) { console.error('submitCheckout:', error.message); return { ok: false, error: 'db' }; }
  const res = data as { ok: boolean; error?: string; issued?: boolean; total_cents?: number };
  if (!res.ok) return { ok: false, error: res.error ?? 'unknown' };

  if (res.issued) {
    // Phase 1 (offline): tickets are out — email customer + office, then confirm page.
    try {
      const { notifyTicketOrder } = await import('@/lib/ticket-notify');
      await notifyTicketOrder(input.token);
    } catch (e) { console.error('ticket notify:', e); }
    redirect(`/eisitiria/epivevaiosi?t=${input.token}`);
  }

  // Phase 2 (gateway): create the hosted checkout session and send the browser there.
  const site = process.env.NEXT_PUBLIC_SITE_URL || 'http://localhost:3000';
  let url: string;
  try {
    const session = await provider.createRedirect({
      orderId: input.orderId,
      publicCode: input.orderId,
      amountCents: res.total_cents ?? 0,
      email: input.billing.email,
      returnUrl: `${site}/api/payments/return`,
    });
    url = session.url;
  } catch (e) {
    console.error('payment redirect:', e);
    return { ok: false, error: 'payment_init' };
  }
  redirect(url);
}

/** «Ακύρωση» on checkout: release the holds. */
export async function cancelCheckout(orderId: string, token: string): Promise<void> {
  const sb = await createServerClient();
  const { error } = await sb.rpc('release_order', { p_order_id: orderId, p_token: token });
  if (error) console.error('cancelCheckout:', error.message);
  redirect('/eisitiria');
}
