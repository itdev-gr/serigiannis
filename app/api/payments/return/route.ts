import { NextResponse } from 'next/server';
import { getPaymentProvider } from '@/lib/payments';
import { createServiceClient } from '@/lib/supabase/server';

/** Browser returns from the hosted payment page. Verify server-side (never trust
 *  the query alone), confirm idempotently (the webhook may have won), redirect. */
export async function GET(req: Request) {
  const url = new URL(req.url);
  const provider = getPaymentProvider();
  const site = process.env.NEXT_PUBLIC_SITE_URL || url.origin;

  if (provider.id === 'offline') {
    return NextResponse.redirect(`${site}/eisitiria`);
  }

  const verdict = await provider.verifyReturn(url.searchParams);
  if (!verdict.ok || !verdict.orderId) {
    return NextResponse.redirect(`${site}/eisitiria?error=payment`);
  }

  const sb = createServiceClient();
  const { data: order } = await sb
    .from('ticket_orders')
    .select('id, access_token')
    .eq('id', verdict.orderId)
    .maybeSingle();
  if (!order) return NextResponse.redirect(`${site}/eisitiria?error=payment`);

  const { data, error } = await sb.rpc('confirm_order_paid', {
    p_order_id: order.id,
    p_provider: provider.id,
    p_ref: verdict.ref ?? null,
  });
  if (error) console.error('return confirm:', error.message);
  const res = data as { ok: boolean; already_paid?: boolean } | null;
  if (res?.ok && !res.already_paid) {
    try {
      const { notifyTicketOrder } = await import('@/lib/ticket-notify');
      await notifyTicketOrder(order.access_token);
    } catch (e) {
      console.error('return notify:', e);
    }
  }

  return NextResponse.redirect(`${site}/eisitiria/epivevaiosi?t=${order.access_token}`);
}
