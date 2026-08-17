import { createServerClient } from '@/lib/supabase/server';

/** Όσοι τσέκαραν «Θέλω να λαμβάνω ενημερώσεις» σε οποιαδήποτε φόρμα του site:
 *  checkout εκδρομών (tour_orders), εισιτήρια (ticket_orders) και αιτήματα
 *  κράτησης (leads). Το τσεκ αποθηκεύεται πάνω στην κάθε εγγραφή — εδώ απλώς
 *  μαζεύονται όλα τα email σε μία λίστα, χωρίς διπλότυπα. */

type Subscriber = { email: string; name: string | null; source: string; at: string };

async function getSubscribers(): Promise<Subscriber[]> {
  const sb = await createServerClient();
  const [tourOrders, ticketOrders, leads] = await Promise.all([
    sb.from('tour_orders').select('email, customer_name, created_at').eq('marketing_opt_in', true).not('email', 'is', null),
    sb.from('ticket_orders').select('email, customer_name, created_at').eq('marketing_opt_in', true).not('email', 'is', null),
    sb.from('leads').select('email, name, created_at').eq('marketing_opt_in', true).not('email', 'is', null),
  ]);
  for (const r of [tourOrders, ticketOrders, leads]) {
    if (r.error) console.error('newsletter:', r.error.message);
  }

  const rows: Subscriber[] = [
    ...(tourOrders.data ?? []).map((r) => ({ email: r.email as string, name: r.customer_name as string | null, source: 'Κράτηση εκδρομής', at: r.created_at as string })),
    ...(ticketOrders.data ?? []).map((r) => ({ email: r.email as string, name: r.customer_name as string | null, source: 'Εισιτήριο', at: r.created_at as string })),
    ...(leads.data ?? []).map((r) => ({ email: r.email as string, name: r.name as string | null, source: 'Αίτημα κράτησης', at: r.created_at as string })),
  ].filter((r) => r.email && r.email.includes('@'));

  // Ένα email = μία γραμμή· κρατιέται η πιο πρόσφατη εγγραφή του.
  const byEmail = new Map<string, Subscriber>();
  for (const row of rows.sort((a, b) => a.at.localeCompare(b.at))) {
    byEmail.set(row.email.trim().toLowerCase(), { ...row, email: row.email.trim().toLowerCase() });
  }
  return [...byEmail.values()].sort((a, b) => b.at.localeCompare(a.at));
}

export default async function NewsletterPage() {
  const subscribers = await getSubscribers();

  return (
    <div>
      <div className="mb-8">
        <h1 className="font-display text-4xl font-semibold text-primary">Λίστα Ενημερώσεων</h1>
        <p className="mt-2 max-w-2xl text-[14px] text-muted">
          Όσοι τσέκαραν «Θέλω να λαμβάνω ενημερώσεις για νέες εκδρομές» σε κράτηση, εισιτήριο ή αίτημα.
          Αντιγράψτε τα email από το πλαίσιο για να τα επικολλήσετε στο πρόγραμμα αλληλογραφίας σας (στο πεδίο
          «Κρυφή κοινοποίηση / BCC», ώστε να μη βλέπει ο ένας το email του άλλου).
        </p>
        <p className="mt-1 text-muted">{subscribers.length} εγγεγραμμένοι</p>
      </div>

      {subscribers.length === 0 ? (
        <p className="rounded-lg border border-border bg-surface p-6 text-[14px] text-muted">
          Κανείς ακόμη — μόλις κάποιος πελάτης τσεκάρει το κουτάκι των ενημερώσεων, θα εμφανιστεί εδώ.
        </p>
      ) : (
        <>
          <label className="block max-w-3xl">
            <span className="mb-1.5 block font-sans text-[13px] font-medium uppercase tracking-[0.1em] text-primary">
              Όλα τα email (για αντιγραφή)
            </span>
            <textarea
              readOnly
              rows={3}
              className="w-full rounded-md border border-border bg-surface px-4 py-2.5 font-mono text-[13px] text-body"
              defaultValue={subscribers.map((s) => s.email).join(', ')}
            />
          </label>

          <div className="mt-8 max-w-3xl overflow-x-auto">
            <div className="min-w-[560px] overflow-hidden rounded-lg border border-border bg-surface">
              <div className="grid grid-cols-[1.4fr_1fr_1fr_7rem] gap-3 border-b border-border bg-background/50 px-4 py-3 font-sans text-[12px] uppercase tracking-[0.1em] text-muted">
                <div>Email</div>
                <div>Όνομα</div>
                <div>Από</div>
                <div>Ημερομηνία</div>
              </div>
              {subscribers.map((s) => (
                <div key={s.email} className="grid grid-cols-[1.4fr_1fr_1fr_7rem] gap-3 border-b border-border/60 px-4 py-2.5 text-[14px] text-body last:border-0">
                  <div className="truncate font-medium">{s.email}</div>
                  <div className="truncate text-muted">{s.name ?? '—'}</div>
                  <div className="text-muted">{s.source}</div>
                  <div className="text-muted">{new Date(s.at).toLocaleDateString('el-GR')}</div>
                </div>
              ))}
            </div>
          </div>
        </>
      )}
    </div>
  );
}
