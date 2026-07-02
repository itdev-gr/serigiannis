import { getClients } from '@/lib/queries/leads';

export default async function ClientsPage() {
  const clients = await getClients();
  return (
    <div>
      <h1 className="font-display text-4xl font-semibold text-primary">Πελάτες</h1>
      <p className="mt-1 text-muted">{clients.length} συνολικά (ομαδοποίηση κατά email/τηλέφωνο)</p>
      <div className="mt-8 overflow-hidden rounded-lg border border-border bg-surface">
        <table className="w-full text-left text-[14px]">
          <thead className="border-b border-border bg-background/50 font-sans text-[12px] uppercase tracking-[0.1em] text-muted">
            <tr><th className="px-5 py-3">Όνομα</th><th className="px-5 py-3">Επικοινωνία</th><th className="px-5 py-3">Αιτήματα</th><th className="px-5 py-3">Τελευταία δραστηριότητα</th></tr>
          </thead>
          <tbody>
            {clients.length === 0 && <tr><td colSpan={4} className="px-5 py-8 text-center text-muted">Δεν υπάρχουν πελάτες ακόμη.</td></tr>}
            {clients.map((c) => (
              <tr key={c.key} className="border-b border-border/60 last:border-0">
                <td className="px-5 py-3 font-medium text-primary">{c.name}</td>
                <td className="px-5 py-3 text-muted">{c.phone ?? c.email ?? '—'}</td>
                <td className="px-5 py-3 text-muted">{c.count}</td>
                <td className="px-5 py-3 text-muted">{new Date(c.lastActivity).toLocaleDateString('el-GR')}</td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  );
}
