'use server';
import { redirect } from 'next/navigation';
import { createServerClient } from '@/lib/supabase/server';
import { getPaymentProvider } from '@/lib/payments';

export type BookingItem = { tier_id: string; qty: number };

/** Tour page «Κάντε Κράτηση» → pending order (prices re-computed in SQL) → checkout. */
export async function beginTourBooking(input: {
  tourId: string;
  departureId: string | null;
  items: BookingItem[];
}): Promise<{ ok: false; error: string } | void> {
  const sb = await createServerClient();
  const { data, error } = await sb.rpc('create_tour_order', {
    p: {
      tour_id: input.tourId,
      departure_id: input.departureId,
      items: input.items.map((i) => ({ tier_id: i.tier_id, qty: i.qty })),
    },
  });
  if (error) {
    console.error('beginTourBooking:', error.message);
    return { ok: false, error: 'db' };
  }
  const res = data as { ok: boolean; error?: string; order_id?: string; access_token?: string };
  if (!res.ok || !res.order_id || !res.access_token) {
    return { ok: false, error: res.error ?? 'db' };
  }
  redirect(`/kratisi/checkout?order=${res.order_id}&t=${res.access_token}`);
}

export type TourCheckoutInput = {
  orderId: string;
  token: string;
  customer: {
    customer_name: string;
    email: string;
    phone: string;
    notes?: string;
    marketing_opt_in?: boolean;
    accept_terms: boolean;
  };
};

/** Checkout submit: store the customer, then hand off to the gateway (or, with
 *  PAYMENT_PROVIDER=offline, book it for payment at the office). */
export async function submitTourCheckout(input: TourCheckoutInput): Promise<{ ok: false; error: string } | void> {
  const provider = getPaymentProvider();
  const sb = await createServerClient();
  const { data, error } = await sb.rpc('finalize_tour_order', {
    p_order_id: input.orderId,
    p_token: input.token,
    p_customer: input.customer,
    p_provider: provider.id,
  });
  if (error) {
    console.error('submitTourCheckout:', error.message);
    return { ok: false, error: 'db' };
  }
  const res = data as {
    ok: boolean;
    error?: string;
    offline?: boolean;
    already_paid?: boolean;
    public_code?: string;
    total_cents?: number;
  };
  if (!res.ok) return { ok: false, error: res.error ?? 'db' };

  if (res.already_paid) redirect(`/kratisi/epivevaiosi?t=${input.token}`);

  if (res.offline) {
    try {
      const { notifyTourOrder } = await import('@/lib/tour-notify');
      await notifyTourOrder(input.token);
    } catch (e) {
      console.error('tour notify:', e);
    }
    redirect(`/kratisi/epivevaiosi?t=${input.token}`);
  }

  const site = process.env.NEXT_PUBLIC_SITE_URL || 'http://localhost:3000';
  let url: string;
  try {
    const session = await provider.createRedirect({
      orderId: input.orderId,
      publicCode: res.public_code ?? input.orderId,
      amountCents: res.total_cents ?? 0,
      email: input.customer.email,
      returnUrl: `${site}/api/payments/return?k=tour`,
      description: 'Κράτηση εκδρομής',
    });
    url = session.url;
  } catch (e) {
    console.error('tour payment redirect:', e);
    return { ok: false, error: 'payment_init' };
  }
  redirect(url);
}

/** «Ακύρωση» on checkout: drop the pending order and go back to the tour. */
export async function cancelTourBooking(orderId: string, token: string, tourSlug: string | null): Promise<void> {
  const sb = await createServerClient();
  const { error } = await sb.rpc('release_tour_order', { p_order_id: orderId, p_token: token });
  if (error) console.error('cancelTourBooking:', error.message);
  redirect(tourSlug ? `/tour/${tourSlug}` : '/ekdromes');
}
