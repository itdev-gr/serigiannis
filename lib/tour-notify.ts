import { createServiceClient } from '@/lib/supabase/server';
import { formatCents } from '@/lib/booking';
import type { TourOrder } from '@/types/db';

const esc = (v: unknown) => String(v ?? '').replace(/</g, '&lt;');

const STATUS_LINE: Record<string, string> = {
  paid: 'Εξοφλήθηκε online.',
  offline: 'Η εξόφληση θα γίνει στο γραφείο μας.',
  awaiting_payment: 'Εκκρεμεί η ολοκλήρωση της πληρωμής.',
};

/** Email the customer their tour booking + notify the office.
 *  Same Resend pattern as lib/notify.ts: no-op without RESEND_API_KEY, never throws. */
export async function notifyTourOrder(accessToken: string): Promise<void> {
  const key = process.env.RESEND_API_KEY;
  const site = process.env.NEXT_PUBLIC_SITE_URL || 'https://serigiannis.vercel.app';

  let order: TourOrder;
  try {
    const sb = createServiceClient();
    const { data, error } = await sb.from('tour_orders').select('*').eq('access_token', accessToken).maybeSingle();
    if (error || !data) {
      if (error) console.error('notifyTourOrder:', error.message);
      return;
    }
    order = data as TourOrder;
  } catch (e) {
    console.error('notifyTourOrder:', e);
    return;
  }
  if (!key) return;

  const dateLine = order.departure_date
    ? new Date(`${order.departure_date}T12:00:00`).toLocaleDateString('el-GR', {
        weekday: 'long',
        day: '2-digit',
        month: 'long',
        year: 'numeric',
      })
    : 'Θα οριστεί σε συνεννόηση με το γραφείο';

  const itemRows = (order.items ?? [])
    .map(
      (i) => `<tr>
        <td style="padding:6px 12px 6px 0;color:#16233b">${esc(i.label)}<br>
          <span style="color:#5b6b82;font-size:13px">${i.qty} × ${esc(formatCents(i.unit_cents))}</span></td>
        <td style="padding:6px 0;text-align:right;font-weight:600;color:#16233b">${esc(formatCents(i.line_cents))}</td>
      </tr>`
    )
    .join('');

  const summary = `
    <p style="margin:0 0 4px;color:#16233b">Αναχώρηση: <strong>${esc(dateLine)}</strong></p>
    <p style="margin:0 0 12px;color:#16233b">Κωδικός κράτησης: <strong>${esc(order.public_code)}</strong></p>
    ${order.meeting_point ? `<p style="margin:0 0 12px;color:#16233b">Σημείο συνάντησης: <strong>${esc(order.meeting_point)}</strong></p>` : ''}
    <table style="width:100%;max-width:520px;border-collapse:collapse">${itemRows}
      <tr><td style="padding-top:10px;border-top:1px solid #dbe2ec;font-weight:700;color:#00296b">Σύνολο</td>
        <td style="padding-top:10px;border-top:1px solid #dbe2ec;text-align:right;font-weight:700;color:#00296b">
          ${esc(formatCents(order.amount_total_cents))}</td></tr>
    </table>`;

  const passengerRows = (order.passengers ?? [])
    .map((p) => `<li>${esc(p.name)}${p.phone ? ` — ${esc(p.phone)}` : ''}</li>`)
    .join('');
  const passengersHtml = passengerRows
    ? `<p style="margin:14px 0 4px;color:#16233b;font-weight:600">Ταξιδιώτες</p>
       <ul style="margin:0 0 12px;padding-left:18px;color:#16233b">${passengerRows}</ul>`
    : '';

  const from = process.env.RESEND_FROM || 'Sergiani Travel <onboarding@resend.dev>';

  if (order.email) {
    const html = `
    <div style="font-family:sans-serif;max-width:640px">
      <h2 style="color:#00296b">Η κράτησή σας, ${esc(order.public_code)}</h2>
      <p style="color:#16233b">${esc(order.tour_title)} — ${esc(STATUS_LINE[order.status] ?? '')}</p>
      ${summary}
      ${order.notes ? `<p style="color:#5b6b82;font-size:13px">Σημειώσεις: ${esc(order.notes)}</p>` : ''}
      <p style="color:#5b6b82;font-size:13px">Δείτε την κράτησή σας online:
        <a href="${site}/kratisi/epivevaiosi?t=${accessToken}">${site}/kratisi/epivevaiosi</a></p>
      <p style="color:#5b6b82;font-size:12px">Θα επικοινωνήσουμε μαζί σας για το σημείο και την ώρα αναχώρησης.</p>
    </div>`;
    try {
      const res = await fetch('https://api.resend.com/emails', {
        method: 'POST',
        headers: { Authorization: `Bearer ${key}`, 'Content-Type': 'application/json' },
        body: JSON.stringify({ from, to: [order.email], subject: `Η κράτησή σας, ${order.public_code}`, html }),
      });
      if (!res.ok) console.error('tour email:', res.status, await res.text());
    } catch (e) {
      console.error('tour email:', e);
    }
  }

  try {
    const { getSettings } = await import('@/lib/queries/settings');
    const s = await getSettings();
    if (!s.email) return;
    const officeHtml = `
    <div style="font-family:sans-serif;max-width:640px">
      <h2 style="color:#00296b">Νέα κράτηση εκδρομής, ${esc(order.public_code)}</h2>
      <p style="color:#16233b">${esc(order.tour_title)}</p>
      <p style="color:#16233b">${esc(order.customer_name)} · ${esc(order.phone)} · ${esc(order.email)}</p>
      <p style="color:#16233b">${order.party_size} άτομα · ${esc(STATUS_LINE[order.status] ?? order.status)}</p>
      ${summary}
      ${passengersHtml}
      ${order.notes ? `<p style="color:#5b6b82;font-size:13px">Σημειώσεις πελάτη: ${esc(order.notes)}</p>` : ''}
      <p style="color:#5b6b82;font-size:13px">Διαχείριση: <a href="${site}/admin/bookings/${order.id}">/admin/bookings</a></p>
    </div>`;
    const res = await fetch('https://api.resend.com/emails', {
      method: 'POST',
      headers: { Authorization: `Bearer ${key}`, 'Content-Type': 'application/json' },
      body: JSON.stringify({
        from,
        to: [s.email],
        subject: `Νέα κράτηση εκδρομής, ${order.public_code} (${order.customer_name})`,
        html: officeHtml,
      }),
    });
    if (!res.ok) console.error('office tour email:', res.status, await res.text());
  } catch (e) {
    console.error('office tour email:', e);
  }
}
