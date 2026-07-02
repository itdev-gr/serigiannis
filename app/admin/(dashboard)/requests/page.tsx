import Link from 'next/link';
import { getLeads } from '@/lib/queries/leads';
import { StatusBadge, TypeBadge } from '@/components/admin/StatusBadge';

export default async function RequestsPage() {
  const leads = await getLeads();
  return (
    <div>
      <h1 className="font-display text-4xl font-semibold text-primary">Αιτήματα</h1>
      <p className="mt-1 text-muted">{leads.length} συνολικά</p>
      <div className="mt-8 overflow-hidden rounded-lg border border-border bg-surface">
        <table className="w-full text-left text-[14px]">
          <thead className="border-b border-border bg-background/50 font-sans text-[12px] uppercase tracking-[0.1em] text-muted">
            <tr><th className="px-5 py-3">Όνομα</th><th className="px-5 py-3">Τύπος</th><th className="px-5 py-3">Θέμα / Εκδρομή</th><th className="px-5 py-3">Επικοινωνία</th><th className="px-5 py-3">Κατάσταση</th></tr>
          </thead>
          <tbody>
            {leads.length === 0 && <tr><td colSpan={5} className="px-5 py-8 text-center text-muted">Δεν υπάρχουν αιτήματα ακόμη.</td></tr>}
            {leads.map((l) => (
              <tr key={l.id} className="border-b border-border/60 last:border-0 hover:bg-background/40">
                <td className="px-5 py-3"><Link href={`/admin/requests/${l.id}`} className="font-medium text-primary hover:text-cta">{l.name}</Link></td>
                <td className="px-5 py-3"><TypeBadge type={l.type} /></td>
                <td className="px-5 py-3 text-muted">{l.tour_title ?? l.subject ?? '—'}</td>
                <td className="px-5 py-3 text-muted">{l.phone ?? l.email ?? '—'}</td>
                <td className="px-5 py-3"><StatusBadge status={l.status} /></td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  );
}
