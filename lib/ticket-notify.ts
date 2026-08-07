import QRCode from 'qrcode';
import { createServiceClient } from '@/lib/supabase/server';
import { ORDER_STATUS_LABEL, formatCents, refundPolicyText } from '@/lib/ticketing';
import { getBookingSettings } from '@/lib/queries/ticketing';
import type { OrderBundle, OrderTicket } from '@/types/ticketing';

const esc = (v: unknown) => String(v ?? '').replace(/</g, '&lt;');

/** Ποιοι επιβάτες παίρνουν ξεχωριστό email και με ποια εισιτήρια. Καθαρή
 *  συνάρτηση ώστε να ελέγχεται με tests. Κανόνες: ομαδοποίηση ανά
 *  passenger_key (ώστε ο ίδιος να πάρει και την επιστροφή του), παράλειψη
 *  όσων δεν έδωσαν email, παράλειψη του email του πληρωτή (θα του ερχόταν
 *  διπλό) και ένα μόνο μήνυμα όταν δύο επιβάτες δώσουν την ίδια διεύθυνση. */
export function passengerRecipients(
  tickets: OrderTicket[],
  payerEmail: string | null | undefined
): { email: string; tickets: OrderTicket[] }[] {
  const payer = (payerEmail ?? '').trim().toLowerCase();
  const byPassenger = new Map<number, OrderTicket[]>();
  for (const tk of tickets) {
    const list = byPassenger.get(tk.passenger_key) ?? [];
    list.push(tk);
    byPassenger.set(tk.passenger_key, list);
  }
  const byEmail = new Map<string, OrderTicket[]>();
  for (const list of byPassenger.values()) {
    const email = (list.find((t) => t.passenger_email)?.passenger_email ?? '').trim().toLowerCase();
    if (!email || email === payer) continue;
    byEmail.set(email, [...(byEmail.get(email) ?? []), ...list]);
  }
  return [...byEmail.entries()].map(([email, list]) => ({ email, tickets: list }));
}

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
  const bookingSettings = await getBookingSettings();

  const legLine = (leg: 'outbound' | 'return') => {
    const l = legs.find((x) => x.leg === leg);
    if (!l) return 'Ανοιχτή επιστροφή (χωρίς καθορισμένο δρομολόγιο)';
    return `${l.origin} → ${l.destination} · ${new Date(`${l.service_date}T12:00:00`).toLocaleDateString('el-GR')} · ${l.time}`;
  };

  const renderBlocks = (list: OrderTicket[]) =>
    list
      .map(
        (tk) => `
    <div style="border:1px solid #dbe2ec;border-radius:8px;padding:14px 16px;margin:10px 0">
      <p style="margin:0 0 6px;color:#5b6b82;font-size:12px;text-transform:uppercase">${esc(legLine(tk.leg))}</p>
      <p style="margin:0;font-size:15px"><strong>${esc(tk.passenger_name)}${tk.passenger_phone ? ' · ' + esc(tk.passenger_phone) : ''}</strong>
        · Θέση: <strong>${esc(tk.seat_no ?? 'Ανοιχτή')}</strong>
        · ${esc(tk.fare_name)} · ${esc(formatCents(tk.price_cents))}</p>
      ${tk.boarding_point ? `<p style="margin:6px 0 0;font-size:13px;color:#16233b">Σημείο επιβίβασης: <strong>${esc(tk.boarding_point)}</strong></p>` : ''}
      <p style="margin:8px 0 0;font-size:18px;letter-spacing:4px;font-family:monospace">
        Κωδικός: <strong>${esc(tk.code)}</strong></p>
    </div>`
      )
      .join('');
  const ticketBlocks = renderBlocks(tickets);

  const html = `
  <div style="font-family:sans-serif;max-width:640px">
    <h2 style="color:#00296b">Τα εισιτήριά σας, ${esc(order.public_code)}</h2>
    <p style="color:#16233b">Εκδρομή · ${esc(ORDER_STATUS_LABEL[order.status] ?? order.status)}
      · Σύνολο: <strong>${esc(formatCents(order.amount_total_cents))}</strong></p>
    ${order.boarding_point ? `<p style="color:#16233b">Σημείο επιβίβασης: <strong>${esc(order.boarding_point)}</strong></p>` : ''}
    ${order.status === 'offline' ? '<p style="color:#5b6b82">Η εξόφληση γίνεται στο γραφείο μας ή στο λεωφορείο πριν την αναχώρηση.</p>' : ''}
    ${ticketBlocks}
    <p style="color:#5b6b82;font-size:13px">Δείτε τα εισιτήριά σας online:
      <a href="${site}/eisitiria/epivevaiosi?t=${accessToken}">${site}/eisitiria/epivevaiosi</a></p>
    <p style="color:#5b6b82;font-size:12px">${esc(refundPolicyText(bookingSettings))}
      Ο κωδικός κάθε εισιτηρίου ζητείται κατά την επιβίβαση.</p>
  </div>`;

  // Map αντί για πίνακα: η παλιά θέση-προς-θέση αντιστοίχιση χαλούσε αν ένα QR
  // αποτύγχανε στη μέση (το try τύλιγε ΟΛΟ τον βρόχο). Έτσι κάθε αποστολή
  // παίρνει ακριβώς τα δικά της συνημμένα, με μία μόνο παραγωγή QR.
  const qrByCode = new Map<string, { filename: string; content: string }>();
  for (const tk of tickets) {
    try {
      const dataUrl = await QRCode.toDataURL(tk.code, { width: 240, margin: 1 });
      qrByCode.set(tk.code, { filename: `ticket-${tk.code}.png`, content: dataUrl.split(',')[1] });
    } catch (e) {
      console.error('ticket QR:', tk.code, e);
    }
  }
  const attachmentsFor = (list: OrderTicket[]) =>
    list.map((tk) => qrByCode.get(tk.code)).filter((a): a is { filename: string; content: string } => Boolean(a));
  const attachments = attachmentsFor(tickets);

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
          subject: `Τα εισιτήριά σας, ${order.public_code}`,
          html,
          attachments,
        }),
      });
      if (!res.ok) console.error('ticket email:', res.status, await res.text());
    } catch (e) {
      console.error('ticket email:', e);
    }
  }

  // Ατομικά email: όποιος επιβάτης έδωσε δικό του email παίρνει ΜΟΝΟ το δικό
  // του εισιτήριο — χωρίς σύνολο πληρωμής και χωρίς τον σύνδεσμο της
  // παραγγελίας (το token ανοίγει ολόκληρη την κράτηση, δεν πάει σε τρίτο).
  // Το Resend δέχεται ~2 αιτήματα/δευτ., γι' αυτό σειριακά με μικρή παύση.
  const recipients = passengerRecipients(tickets, order.email).slice(0, 20);
  for (const [i, r] of recipients.entries()) {
    if (i > 0) await new Promise((resolve) => setTimeout(resolve, 600));
    const personalHtml = `
    <div style="font-family:sans-serif;max-width:640px">
      <h2 style="color:#00296b">Το εισιτήριό σας, ${esc(order.public_code)}</h2>
      <p style="color:#16233b">Η κράτηση έγινε από ${esc(order.customer_name ?? 'τον διοργανωτή')}.</p>
      ${order.status === 'offline' ? '<p style="color:#5b6b82">Η εξόφληση γίνεται στο γραφείο μας ή στο λεωφορείο πριν την αναχώρηση.</p>' : ''}
      ${renderBlocks(r.tickets)}
      <p style="color:#5b6b82;font-size:12px">Ο κωδικός του εισιτηρίου ζητείται κατά την επιβίβαση.</p>
    </div>`;
    try {
      const res = await fetch('https://api.resend.com/emails', {
        method: 'POST',
        headers: { Authorization: `Bearer ${key}`, 'Content-Type': 'application/json' },
        body: JSON.stringify({
          from,
          to: [r.email],
          subject: `Το εισιτήριό σας, ${order.public_code}`,
          html: personalHtml,
          attachments: attachmentsFor(r.tickets),
        }),
      });
      if (!res.ok) console.error('passenger ticket email:', r.email, res.status, await res.text());
    } catch (e) {
      console.error('passenger ticket email:', r.email, e);
    }
  }

  // office notification
  try {
    const { getSettings } = await import('@/lib/queries/settings');
    const s = await getSettings();
    if (s.email) {
      const officeHtml = `
      <div style="font-family:sans-serif">
        <h2 style="color:#00296b">Νέα κράτηση εισιτηρίων, ${esc(order.public_code)}</h2>
        <p>${esc(order.customer_name)} · ${esc(order.phone)} · ${esc(order.email)}</p>
        <p>Εκδρομή · ${tickets.length} εισιτήρια · ${esc(formatCents(order.amount_total_cents))}
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
          subject: `Νέα κράτηση εισιτηρίων, ${order.public_code} (${order.customer_name})`,
          html: officeHtml,
        }),
      });
      if (!res.ok) console.error('office ticket email:', res.status, await res.text());
    }
  } catch (e) {
    console.error('office ticket email:', e);
  }
}
