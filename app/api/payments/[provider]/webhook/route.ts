import { NextResponse } from 'next/server';
import { getProviderById } from '@/lib/payments';
import { flagPaymentAmountMismatch, looksLikeOrderId } from '@/lib/payments/confirm';
import { createServiceClient } from '@/lib/supabase/server';

/** Gateway webhook: verify → confirm → dedupe via payment_events → email.
 *  The gateway does not tell us which order family it is, so the order id is
 *  looked up in ticket_orders first and tour_orders second.
 *
 *  Status codes matter here: a 200 tells the gateway to stop retrying. We answer
 *  200 only when the event is handled or genuinely irrelevant, and 500 whenever
 *  we could not decide — a transient database error must not silently swallow a
 *  real payment.
 *
 *  The payment_events row is written AFTER a successful confirm, not before:
 *  written first, a delivery that failed mid-way would be deduped away on
 *  retry and the payment would never be confirmed. confirm_*_paid is itself
 *  idempotent (`already_paid`), so the event row only guards the email. */
export async function POST(req: Request, ctx: { params: Promise<{ provider: string }> }) {
  const { provider: providerId } = await ctx.params;
  const provider = getProviderById(providerId);
  if (!provider || provider.id === 'offline') {
    return NextResponse.json({ ok: false }, { status: 404 });
  }

  const rawReq = req.clone();
  const event = await provider.verifyWebhook(req);

  // Μητρώο συναλλαγών: κάθε event της Viva γράφεται στη viva_transactions,
  // ακόμα κι όταν δεν αφορά δική μας παραγγελία (POS, payment links) — το
  // γραφείο θέλει να βλέπει ΟΛΕΣ τις χρεώσεις στο admin. Best-effort: αν
  // αποτύχει, το cron reconciliation θα την ξαναβρεί.
  if (provider.id === 'viva') {
    try {
      const body = (await rawReq.json()) as { EventData?: { TransactionId?: string } };
      const transactionId = body.EventData?.TransactionId;
      if (transactionId) {
        const { recordVivaTransactionById } = await import('@/lib/viva-sync');
        const { getCheckoutTransactionRaw } = await import('@/lib/payments/viva');
        await recordVivaTransactionById(transactionId, getCheckoutTransactionRaw);
      }
    } catch (e) {
      console.error('viva transaction record:', e);
    }
  }

  if (!event) return NextResponse.json({ ok: true, ignored: true });

  const sb = createServiceClient();

  const recordEvent = async () => {
    const { error } = await sb.from('payment_events').insert({
      provider: provider.id,
      event_id: event.eventId,
      order_id: event.orderId,
      payload: { kind: event.kind, ref: event.ref },
    });
    if (error && error.code !== '23505') console.error('payment_events insert:', error.message);
    return error?.code === '23505'; // already handled by another delivery
  };

  if (event.kind !== 'paid') {
    await recordEvent();
    return NextResponse.json({ ok: true });
  }

  // merchantTrns is free text on the gateway side; anything that is not one of
  // our ids is not ours to act on (and would make the uuid comparison below throw).
  if (!looksLikeOrderId(event.orderId)) {
    console.error('webhook: unrecognised order reference', event.orderId);
    return NextResponse.json({ ok: true, ignored: true });
  }

  const { data: ticketOrder, error: lookupErr } = await sb
    .from('ticket_orders')
    .select('id, access_token')
    .eq('id', event.orderId)
    .maybeSingle();
  if (lookupErr) {
    // Unknown family → we cannot route the confirm. Ask the gateway to retry
    // rather than answering 200 and losing the payment.
    console.error('webhook order lookup:', lookupErr.message);
    return NextResponse.json({ ok: false }, { status: 500 });
  }

  const isTour = !ticketOrder;
  const rpc = isTour ? 'confirm_tour_order_paid' : 'confirm_order_paid';
  const { data, error } = await sb.rpc(rpc, {
    p_order_id: event.orderId,
    p_provider: provider.id,
    p_ref: event.ref,
  });
  if (error) {
    console.error(`${rpc}:`, error.message);
    return NextResponse.json({ ok: false }, { status: 500 });
  }
  const res = data as { ok: boolean; error?: string; already_paid?: boolean };
  if (!res.ok) {
    console.error(`${rpc} refused:`, res.error, event.orderId);
    // The order may simply not exist yet (replication lag on a fast redirect) —
    // worth a retry. Anything else is a terminal state; retrying forever helps
    // nobody, but it must still be visible in the logs.
    const retry = res.error === 'order_not_found';
    return NextResponse.json({ ok: false, error: res.error }, { status: retry ? 500 : 200 });
  }

  await flagPaymentAmountMismatch(sb, isTour ? 'tour' : 'ticket', event.orderId, event.amountCents);

  const duplicate = await recordEvent();
  if (duplicate || res.already_paid) return NextResponse.json({ ok: true, duplicate: true });

  try {
    if (isTour) {
      const { data: order } = await sb.from('tour_orders').select('access_token').eq('id', event.orderId).maybeSingle();
      if (order?.access_token) {
        const { notifyTourOrder } = await import('@/lib/tour-notify');
        await notifyTourOrder(order.access_token);
      }
    } else if (ticketOrder?.access_token) {
      const { notifyTicketOrder } = await import('@/lib/ticket-notify');
      await notifyTicketOrder(ticketOrder.access_token);
    }
  } catch (e) {
    console.error('webhook notify:', e);
  }
  return NextResponse.json({ ok: true });
}

/** Viva webhook validation handshake (GET with a verification key echo). */
export async function GET() {
  const key = process.env.VIVA_WEBHOOK_KEY;
  return NextResponse.json(key ? { Key: key } : { ok: true });
}
