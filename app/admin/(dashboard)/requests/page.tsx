import Link from 'next/link';
import { athensDateLabel } from '@/lib/athens-time';
import { getLeads, groupClients } from '@/lib/queries/leads';
import { StatusBadge, TypeBadge } from '@/components/admin/StatusBadge';
import { AdminPageHeader } from '@/components/admin/ui';
import { AdminSearch } from '@/components/admin/AdminSearch';
import { searchNormalize } from '@/lib/filters';
import { cn } from '@/lib/utils';
import type { Lead, Client } from '@/types/db';

const TABS = [
  { key: 'ola', label: 'Όλα' },
  { key: 'kratiseis', label: 'Κρατήσεις' },
  { key: 'pelates', label: 'Πελάτες' },
] as const;
type TabKey = (typeof TABS)[number]['key'];

const TH = 'px-5 py-3';
const THEAD = 'border-b border-border bg-background/50 font-sans text-[12px] uppercase tracking-[0.1em] text-muted';

function leadMatches(l: Lead, needle: string): boolean {
  return [l.name, l.phone, l.email, l.subject, l.tour_title].some((v) => v && searchNormalize(v).includes(needle));
}

function clientMatches(c: Client, needle: string): boolean {
  return [c.name, c.phone, c.email].some((v) => v && searchNormalize(v).includes(needle));
}

export default async function RequestsPage({
  searchParams,
}: {
  searchParams: Promise<{ tab?: string; q?: string }>;
}) {
  const sp = await searchParams;
  const tab: TabKey = TABS.find((t) => t.key === sp.tab)?.key ?? 'ola';
  const q = sp.q;

  const allLeads = await getLeads();
  const needle = q ? searchNormalize(q) : '';
  const leads = needle ? allLeads.filter((l) => leadMatches(l, needle)) : allLeads;
  const bookings = leads.filter((l) => l.status === 'booked');
  const allClients = groupClients(allLeads);
  const clients = needle ? allClients.filter((c) => clientMatches(c, needle)) : allClients;

  const count = tab === 'kratiseis' ? bookings.length : tab === 'pelates' ? clients.length : leads.length;
  const countLabel =
    tab === 'kratiseis' ? 'αιτήματα σε κατάσταση «Κράτηση»'
    : tab === 'pelates' ? 'πελάτες (ομαδοποίηση κατά email/τηλέφωνο)'
    : 'αιτήματα συνολικά';

  return (
    <div>
      <AdminPageHeader
        title="Αιτήματα & Πελάτες"
        subtitle="Αιτήματα από τις φόρμες επικοινωνίας, προσφοράς και κράτησης — και οι πελάτες που προκύπτουν από αυτά."
      />

      <div className="mb-6 flex flex-wrap gap-2">
        {TABS.map((t) => (
          <Link
            key={t.key}
            href={t.key === 'ola' ? '/admin/requests' : `/admin/requests?tab=${t.key}`}
            className={cn(
              'rounded-full px-4 py-1.5 text-[14px] font-medium transition-colors',
              t.key === tab ? 'bg-primary text-surface' : 'bg-background text-body hover:bg-primary/10'
            )}
          >
            {t.label}
          </Link>
        ))}
        <AdminSearch
          action="/admin/requests"
          placeholder="Αναζήτηση ονόματος / τηλεφώνου / email / θέματος…"
          defaultValue={q}
          hidden={{ tab: tab !== 'ola' ? tab : undefined }}
        />
      </div>

      <p className="mb-4 text-muted">{count} {countLabel}</p>

      {tab === 'ola' && (
        <div className="overflow-x-auto">
          <div className="min-w-[640px] overflow-hidden rounded-lg border border-border bg-surface">
            <table className="w-full text-left text-[14px]">
              <thead className={THEAD}>
                <tr><th className={TH}>Όνομα</th><th className={TH}>Τύπος</th><th className={TH}>Θέμα / Εκδρομή</th><th className={TH}>Επικοινωνία</th><th className={TH}>Κατάσταση</th></tr>
              </thead>
              <tbody>
                {leads.length === 0 && (
                  <tr>
                    <td colSpan={5} className="px-5 py-8 text-center text-muted">
                      {q ? `Δεν βρέθηκαν αποτελέσματα για «${q}».` : 'Δεν υπάρχουν αιτήματα ακόμη.'}
                    </td>
                  </tr>
                )}
                {leads.map((l) => (
                  <tr key={l.id} className="border-b border-border/60 last:border-0 hover:bg-background/40">
                    <td className={TH}><Link href={`/admin/requests/${l.id}`} className="font-medium text-primary hover:text-cta">{l.name}</Link></td>
                    <td className={TH}><TypeBadge type={l.type} /></td>
                    <td className={`${TH} text-muted`}>{l.tour_title ?? l.subject ?? '—'}</td>
                    <td className={`${TH} text-muted`}>{l.phone ?? l.email ?? '—'}</td>
                    <td className={TH}><StatusBadge status={l.status} /></td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      )}

      {tab === 'kratiseis' && (
        <div className="overflow-x-auto">
          <div className="min-w-[640px] overflow-hidden rounded-lg border border-border bg-surface">
            <table className="w-full text-left text-[14px]">
              <thead className={THEAD}>
                <tr><th className={TH}>Πελάτης</th><th className={TH}>Εκδρομή</th><th className={TH}>Ημερομηνία</th><th className={TH}>Θέσεις</th><th className={TH}>Επικοινωνία</th></tr>
              </thead>
              <tbody>
                {bookings.length === 0 && (
                  <tr>
                    <td colSpan={5} className="px-5 py-8 text-center text-muted">
                      {q ? `Δεν βρέθηκαν αποτελέσματα για «${q}».` : 'Δεν υπάρχουν κρατήσεις ακόμη.'}
                    </td>
                  </tr>
                )}
                {bookings.map((b) => (
                  <tr key={b.id} className="border-b border-border/60 last:border-0">
                    <td className={TH}><Link href={`/admin/requests/${b.id}`} className="font-medium text-primary hover:text-cta">{b.name}</Link></td>
                    <td className={`${TH} text-muted`}>{b.tour_title ?? b.subject ?? '—'}</td>
                    <td className={`${TH} text-muted`}>{b.preferred_date ?? '—'}</td>
                    <td className={`${TH} text-muted`}>{b.party_size ?? '—'}</td>
                    <td className={`${TH} text-muted`}>{b.phone ?? b.email ?? '—'}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      )}

      {tab === 'pelates' && (
        <div className="overflow-x-auto">
          <div className="min-w-[640px] overflow-hidden rounded-lg border border-border bg-surface">
            <table className="w-full text-left text-[14px]">
              <thead className={THEAD}>
                <tr><th className={TH}>Όνομα</th><th className={TH}>Επικοινωνία</th><th className={TH}>Αιτήματα</th><th className={TH}>Τελευταία δραστηριότητα</th></tr>
              </thead>
              <tbody>
                {clients.length === 0 && (
                  <tr>
                    <td colSpan={4} className="px-5 py-8 text-center text-muted">
                      {q ? `Δεν βρέθηκαν αποτελέσματα για «${q}».` : 'Δεν υπάρχουν πελάτες ακόμη.'}
                    </td>
                  </tr>
                )}
                {clients.map((c) => {
                  // Το πιο πρόσφατο αίτημα του πελάτη: χωρίς σύνδεσμο η καρτέλα
                  // ήταν αδιέξοδο — έβλεπες το όνομα και δεν πήγαινες πουθενά.
                  const latest = c.leads[0];
                  return (
                    <tr key={c.key} className="border-b border-border/60 last:border-0">
                      <td className={`${TH} font-medium text-primary`}>
                        {latest ? (
                          <Link href={`/admin/requests/${latest.id}`} className="hover:text-cta">{c.name}</Link>
                        ) : (
                          c.name
                        )}
                      </td>
                      <td className={`${TH} text-muted`}>
                        {c.phone ? (
                          <a href={`tel:${c.phone.replace(/\s+/g, '')}`} className="text-primary hover:text-cta">{c.phone}</a>
                        ) : c.email ? (
                          <a href={`mailto:${c.email}`} className="text-primary hover:text-cta">{c.email}</a>
                        ) : (
                          '—'
                        )}
                      </td>
                      <td className={`${TH} text-muted`}>{c.count}</td>
                      <td className={`${TH} text-muted`}>{athensDateLabel(c.lastActivity)}</td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        </div>
      )}
    </div>
  );
}
