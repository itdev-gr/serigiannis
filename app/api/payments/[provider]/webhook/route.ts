import { NextResponse } from 'next/server';
import { getProviderById } from '@/lib/payments';
import { createServiceClient } from '@/lib/supabase/server';

/** Gateway webhook: verify → dedupe via payment_events → confirm_order_paid → email.
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

  const { data, error } = await sb.rpc('confirm_order_paid', {
    p_order_id: event.orderId,
    p_provider: provider.id,
    p_ref: event.ref,
  });
  if (error) {
    console.error('confirm_order_paid:', error.message);
    return NextResponse.json({ ok: false }, { status: 500 });
  }
  const res = data as { ok: boolean; error?: string };
  if (res.ok && !('already_paid' in (res as object))) {
    try {
      const { data: order } = await sb.from('ticket_orders').select('access_token').eq('id', event.orderId).maybeSingle();
      if (order?.access_token) {
        const { notifyTicketOrder } = await import('@/lib/ticket-notify');
        await notifyTicketOrder(order.access_token);
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
