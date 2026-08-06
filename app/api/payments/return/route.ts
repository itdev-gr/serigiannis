import { NextResponse } from 'next/server';
import { getPaymentProvider } from '@/lib/payments';
import { flagPaymentAmountMismatch, looksLikeOrderId } from '@/lib/payments/confirm';
import { createServiceClient } from '@/lib/supabase/server';

/** Browser returns from the hosted payment page. Verify server-side (never trust
 *  the query alone), confirm idempotently (the webhook may have won), redirect.
 *  Two order families ride the same gateway: bus tickets and tour bookings —
 *  `?k=tour` marks the latter (set on the return URL we hand to the gateway). */
export async function GET(req: Request) {
  const url = new URL(req.url);
  const provider = getPaymentProvider();
  const site = process.env.NEXT_PUBLIC_SITE_URL || url.origin;
  const isTour = url.searchParams.get('k') === 'tour';
  const failUrl = isTour ? `${site}/ekdromes?error=payment` : `${site}/eisitiria?error=payment`;

  if (provider.id === 'offline') {
    return NextResponse.redirect(isTour ? `${site}/ekdromes` : `${site}/eisitiria`);
  }

  const verdict = await provider.verifyReturn(url.searchParams);
  if (!verdict.ok || !looksLikeOrderId(verdict.orderId)) {
    return NextResponse.redirect(failUrl);
  }

  const sb = createServiceClient();

  if (isTour) {
    const { data: order } = await sb
      .from('tour_orders')
      .select('id, access_token')
      .eq('id', verdict.orderId)
      .maybeSingle();
    if (!order) return NextResponse.redirect(failUrl);

    const { data, error } = await sb.rpc('confirm_tour_order_paid', {
      p_order_id: order.id,
      p_provider: provider.id,
      p_ref: verdict.ref ?? null,
    });
    if (error) console.error('tour return confirm:', error.message);
    const res = data as { ok: boolean; already_paid?: boolean } | null;
    if (res?.ok) await flagPaymentAmountMismatch(sb, 'tour', order.id, verdict.amountCents);
    if (res?.ok && !res.already_paid) {
      try {
        const { notifyTourOrder } = await import('@/lib/tour-notify');
        await notifyTourOrder(order.access_token);
      } catch (e) {
        console.error('tour return notify:', e);
      }
    }
    return NextResponse.redirect(`${site}/kratisi/epivevaiosi?t=${order.access_token}`);
  }

  const { data: order } = await sb
    .from('ticket_orders')
    .select('id, access_token')
    .eq('id', verdict.orderId)
    .maybeSingle();
  if (!order) return NextResponse.redirect(failUrl);

  const { data, error } = await sb.rpc('confirm_order_paid', {
    p_order_id: order.id,
    p_provider: provider.id,
    p_ref: verdict.ref ?? null,
  });
  if (error) console.error('return confirm:', error.message);
  const res = data as { ok: boolean; already_paid?: boolean } | null;
  if (res?.ok) await flagPaymentAmountMismatch(sb, 'ticket', order.id, verdict.amountCents);
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
