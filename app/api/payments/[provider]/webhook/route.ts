import { NextResponse } from 'next/server';
import { getProviderById } from '@/lib/payments';
import { createServiceClient } from '@/lib/supabase/server';

/** Gateway webhook: verify → dedupe via payment_events → confirm → email.
 *  The gateway does not tell us which order family it is, so the order id is
 *  looked up in ticket_orders first and tour_orders second.
 *  Always 200 on handled/irrelevant events so the gateway stops retrying. */
export async function POST(req: Request, ctx: { params: Promise<{ provider: string }> }) {
  const { provider: providerId } = await ctx.params;
  const provider = getProviderById(providerId);
  if (!provider || provider.id === 'offline') {
    return NextResponse.json({ ok: false }, { status: 404 });
  }

  const event = await provider.verifyWebhook(req);
  if (!event) return NextResponse.json({ ok: true, ignored: true });

  const sb = createServiceClient();

  // idempotency: first writer wins, redeliveries no-op
  const { error: insErr } = await sb.from('payment_events').insert({
    provider: provider.id,
    event_id: event.eventId,
    order_id: event.orderId,
    payload: { kind: event.kind, ref: event.ref },
  });
  if (insErr) {
    if (insErr.code === '23505') return NextResponse.json({ ok: true, duplicate: true });
    console.error('payment_events insert:', insErr.message);
  }

  if (event.kind !== 'paid') return NextResponse.json({ ok: true });

  const { data: ticketOrder } = await sb
    .from('ticket_orders')
    .select('id, access_token')
    .eq('id', event.orderId)
    .maybeSingle();

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
  if (res.ok && !res.already_paid) {
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
  }
  return NextResponse.json({ ok: true });
}

/** Viva webhook validation handshake (GET with a verification key echo). */
export async function GET() {
  const key = process.env.VIVA_WEBHOOK_KEY;
  return NextResponse.json(key ? { Key: key } : { ok: true });
}
