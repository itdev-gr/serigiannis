import QRCode from 'qrcode';
import { createServiceClient } from '@/lib/supabase/server';
import { KIND_LABEL, ORDER_STATUS_LABEL, formatCents } from '@/lib/ticketing';
import type { OrderBundle } from '@/types/ticketing';

const esc = (v: unknown) => String(v ?? '').replace(/</g, '&lt;');

/** Email the customer their issued tickets (QR attachments) + notify the office.
 *  Same Resend pattern as lib/notify.ts: no-op without RESEND_API_KEY, never throws. */
export async function notifyTicketOrder(accessToken: string): Promise<void> {
  const key = process.env.RESEND_API_KEY;
  const site = process.env.NEXT_PUBLIC_SITE_URL || 'https://serigiannis.vercel.app';

  let bundle: OrderBundle;
  try {
    const sb = createServiceClient();
    const { data, error } = await sb.rpc('get_order_by_token', { p_token: accessToken });
    if (error || !data) { if (error) console.error('notifyTicketOrder:', error.message); return; }
    bundle = data as OrderBundle;
  } catch (e) {
    console.error('notifyTicketOrder:', e);
    return;
  }
  if (!bundle.ok || bundle.tickets.length === 0) return;
  const { order, legs, tickets } = bundle;
  if (!key) return;

  const legLine = (leg: 'outbound' | 'return') => {
    const l = legs.find((x) => x.leg === leg);
    if (!l) return 'Ανοιχτή επιστροφή (χωρίς καθορισμένο δρομολόγιο)';
    return `${l.origin} → ${l.destination} · ${new Date(`${l.service_date}T12:00:00`).toLocaleDateString('el-GR')} · ${l.time}`;
  };

  const ticketBlocks = tickets
    .map(
      (tk) => `
    <div style="border:1px solid #dbe2ec;border-radius:8px;padding:14px 16px;margin:10px 0">
      <p style="margin:0 0 6px;color:#5b6b82;font-size:12px;text-transform:uppercase">${esc(legLine(tk.leg))}</p>
      <p style="margin:0;font-size:15px"><strong>${esc(tk.passenger_name)}</strong>
        · Θέση: <strong>${esc(tk.seat_no ?? 'Ανοιχτή')}</strong>
        · ${esc(tk.fare_name)} · ${esc(formatCents(tk.price_cents))}</p>
      <p style="margin:8px 0 0;font-size:18px;letter-spacing:4px;font-family:monospace">
        Κωδικός: <strong>${esc(tk.code)}</strong></p>
    </div>`
    )
    .join('');

  const html = `
  <div style="font-family:sans-serif;max-width:640px">
    <h2 style="color:#00296b">Τα εισιτήριά σας — ${esc(order.public_code)}</h2>
    <p style="color:#16233b">${esc(KIND_LABEL[order.kind])} · ${esc(ORDER_STATUS_LABEL[order.status] ?? order.status)}
      · Σύνολο: <strong>${esc(formatCents(order.amount_total_cents))}</strong></p>
    ${order.status === 'offline' ? '<p style="color:#5b6b82">Η εξόφληση γίνεται στο γραφείο μας ή στο λεωφορείο πριν την αναχώρηση.</p>' : ''}
    ${ticketBlocks}
    <p style="color:#5b6b82;font-size:13px">Δείτε τα εισιτήριά σας online:
      <a href="${site}/eisitiria/epivevaiosi?t=${accessToken}">${site}/eisitiria/epivevaiosi</a></p>
    <p style="color:#5b6b82;font-size:12px">Ακύρωση έως 8 ώρες πριν την αναχώρηση: επιστροφή 70% · εντός 8 ωρών: 50%.
      Ο κωδικός κάθε εισιτηρίου ζητείται κατά την επιβίβαση.</p>
  </div>`;

  const attachments: { filename: string; content: string }[] = [];
  try {
    for (const tk of tickets) {
      const dataUrl = await QRCode.toDataURL(tk.code, { width: 240, margin: 1 });
      attachments.push({ filename: `ticket-${tk.code}.png`, content: dataUrl.split(',')[1] });
    }
  } catch (e) {
    console.error('ticket QR:', e);
  }

  const from = process.env.RESEND_FROM || 'Sergiani Travel <onboarding@resend.dev>';

  // customer email
  if (order.email) {
    try {
      const res = await fetch('https://api.resend.com/emails', {
        method: 'POST',
        headers: { Authorization: `Bearer ${key}`, 'Content-Type': 'application/json' },
        body: JSON.stringify({
          from,
          to: [order.email],
          subject: `Τα εισιτήριά σας — ${order.public_code}`,
          html,
          attachments,
        }),
      });
      if (!res.ok) console.error('ticket email:', res.status, await res.text());
    } catch (e) {
      console.error('ticket email:', e);
    }
  }

  // office notification
  try {
    const { getSettings } = await import('@/lib/queries/settings');
    const s = await getSettings();
    if (s.email) {
      const officeHtml = `
      <div style="font-family:sans-serif">
        <h2 style="color:#00296b">Νέα κράτηση εισιτηρίων — ${esc(order.public_code)}</h2>
        <p>${esc(order.customer_name)} · ${esc(order.phone)} · ${esc(order.email)}</p>
        <p>${esc(KIND_LABEL[order.kind])} · ${tickets.length} εισιτήρια · ${esc(formatCents(order.amount_total_cents))}
          · ${esc(ORDER_STATUS_LABEL[order.status] ?? order.status)}</p>
        ${ticketBlocks}
        <p style="color:#5b6b82;font-size:13px">Διαχείριση: <a href="${site}/admin/orders/${order.id}">/admin/orders</a></p>
      </div>`;
      const res = await fetch('https://api.resend.com/emails', {
        method: 'POST',
        headers: { Authorization: `Bearer ${key}`, 'Content-Type': 'application/json' },
        body: JSON.stringify({
          from,
          to: [s.email],
          subject: `Νέα κράτηση εισιτηρίων — ${order.public_code} (${order.customer_name})`,
          html: officeHtml,
        }),
      });
      if (!res.ok) console.error('office ticket email:', res.status, await res.text());
    }
  } catch (e) {
    console.error('office ticket email:', e);
  }
}
