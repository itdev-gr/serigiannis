import { NextResponse } from 'next/server';
import { getPaymentProvider } from '@/lib/payments';
import { flagPaymentAmountMismatch, looksLikeOrderId } from '@/lib/payments/confirm';
import { createServiceClient } from '@/lib/supabase/server';

/** Browser returns from the hosted payment page. Verify server-side (never trust
 *  the query alone), confirm idempotently (the webhook may have won), redirect.
 *  Two order families ride the same gateway: bus tickets and tour bookings.
 *  Viva redirects to the payment source's FIXED success/failure URL, so the
 *  `?k=tour` marker we put on the per-order return URL never survives the
 *  round-trip — the family is detected by looking the order up instead,
 *  ticket_orders first, tour_orders second (same as the webhook). `k` stays as
 *  a hint for the offline flow and for failures with no usable order id. */
export async function GET(req: Request) {
  const url = new URL(req.url);
  const provider = getPaymentProvider();
  const site = process.env.NEXT_PUBLIC_SITE_URL || url.origin;
  const kTour = url.searchParams.get('k') === 'tour';
  const failFor = (tour: boolean) => (tour ? `${site}/ekdromes?error=payment` : `${site}/eisitiria?error=payment`);

  if (provider.id === 'offline') {
    return NextResponse.redirect(kTour ? `${site}/ekdromes` : `${site}/eisitiria`);
  }

  const sb = createServiceClient();

  const findOrder = async (orderId: string) => {
    const { data: ticket } = await sb.from('ticket_orders').select('id, access_token').eq('id', orderId).maybeSingle();
    if (ticket) return { isTour: false, order: ticket };
    const { data: tour } = await sb.from('tour_orders').select('id, access_token').eq('id', orderId).maybeSingle();
    if (tour) return { isTour: true, order: tour };
    return null;
  };

  const verdict = await provider.verifyReturn(url.searchParams);
  if (!verdict.ok) {
    const found = looksLikeOrderId(verdict.orderId) ? await findOrder(verdict.orderId) : null;
    return NextResponse.redirect(failFor(found ? found.isTour : kTour));
  }
  if (!looksLikeOrderId(verdict.orderId)) return NextResponse.redirect(failFor(kTour));

  const found = await findOrder(verdict.orderId);
  if (!found) return NextResponse.redirect(failFor(kTour));
  const { isTour, order } = found;

  const { data, error } = await sb.rpc(isTour ? 'confirm_tour_order_paid' : 'confirm_order_paid', {
    p_order_id: order.id,
    p_provider: provider.id,
    p_ref: verdict.ref ?? null,
  });
  if (error) console.error('return confirm:', error.message);
  const res = data as { ok: boolean; already_paid?: boolean } | null;
  if (res?.ok) await flagPaymentAmountMismatch(sb, isTour ? 'tour' : 'ticket', order.id, verdict.amountCents);
  if (res?.ok && !res.already_paid) {
    try {
      if (isTour) {
        const { notifyTourOrder } = await import('@/lib/tour-notify');
        await notifyTourOrder(order.access_token);
      } else {
        const { notifyTicketOrder } = await import('@/lib/ticket-notify');
        await notifyTicketOrder(order.access_token);
      }
    } catch (e) {
      console.error('return notify:', e);
    }
  }

  return NextResponse.redirect(
    isTour ? `${site}/kratisi/epivevaiosi?t=${order.access_token}` : `${site}/eisitiria/epivevaiosi?t=${order.access_token}`
  );
}
