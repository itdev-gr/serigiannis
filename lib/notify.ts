type LeadEmail = { type: string; name: string; phone?: string | null; email?: string | null; subject?: string | null; message?: string | null; tourTitle?: string | null };
const TYPE_LABEL: Record<string, string> = { contact: 'Επικοινωνία', quote: 'Προσφορά Πούλμαν', booking: 'Κράτηση' };

/** Email the office about a new enquiry. No-op unless RESEND_API_KEY is set. Never throws. */
export async function sendLeadNotification(lead: LeadEmail, toEmail: string): Promise<void> {
  const key = process.env.RESEND_API_KEY;
  if (!key || !toEmail) return;
  const from = process.env.RESEND_FROM || 'Sergiani Travel <onboarding@resend.dev>';
  const label = TYPE_LABEL[lead.type] ?? lead.type;
  const rows = [
    ['Τύπος', label], ['Όνομα', lead.name], ['Τηλέφωνο', lead.phone], ['Email', lead.email],
    ['Εκδρομή', lead.tourTitle], ['Θέμα', lead.subject], ['Μήνυμα', lead.message],
  ].filter(([, v]) => v).map(([k, v]) => `<tr><td style="padding:4px 12px 4px 0;color:#5b6b82">${k}</td><td style="padding:4px 0">${String(v).replace(/</g,'&lt;')}</td></tr>`).join('');
  const html = `<div style="font-family:sans-serif"><h2 style="color:#00296b">Νέο αίτημα, ${label}</h2><table>${rows}</table><p style="color:#5b6b82;font-size:13px">Δείτε το στο <a href="https://serigiannis.vercel.app/admin/requests">/admin/requests</a>.</p></div>`;
  try {
    const res = await fetch('https://api.resend.com/emails', {
      method: 'POST',
      headers: { Authorization: `Bearer ${key}`, 'Content-Type': 'application/json' },
      body: JSON.stringify({ from, to: [toEmail], subject: `Νέο αίτημα (${label}), ${lead.name}`, html }),
    });
    if (!res.ok) console.error('sendLeadNotification:', res.status, await res.text());
  } catch (e) { console.error('sendLeadNotification:', e); }
}
