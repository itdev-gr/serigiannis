import Link from 'next/link';
import { getBookings } from '@/lib/queries/leads';

export default async function BookingsPage() {
  const bookings = await getBookings();
  return (
    <div>
      <h1 className="font-display text-4xl font-semibold text-primary">Κρατήσεις</h1>
      <p className="mt-1 text-muted">{bookings.length} αιτήματα σε κατάσταση «Κράτηση»</p>
      <div className="mt-8 overflow-hidden rounded-lg border border-border bg-surface">
        <table className="w-full text-left text-[14px]">
          <thead className="border-b border-border bg-background/50 font-sans text-[12px] uppercase tracking-[0.1em] text-muted">
            <tr><th className="px-5 py-3">Πελάτης</th><th className="px-5 py-3">Εκδρομή</th><th className="px-5 py-3">Ημερομηνία</th><th className="px-5 py-3">Άτομα</th><th className="px-5 py-3">Επικοινωνία</th></tr>
          </thead>
          <tbody>
            {bookings.length === 0 && <tr><td colSpan={5} className="px-5 py-8 text-center text-muted">Δεν υπάρχουν κρατήσεις ακόμη.</td></tr>}
            {bookings.map((b) => (
              <tr key={b.id} className="border-b border-border/60 last:border-0">
                <td className="px-5 py-3"><Link href={`/admin/requests/${b.id}`} className="font-medium text-primary hover:text-cta">{b.name}</Link></td>
                <td className="px-5 py-3 text-muted">{b.tour_title ?? b.subject ?? '—'}</td>
                <td className="px-5 py-3 text-muted">{b.preferred_date ?? '—'}</td>
                <td className="px-5 py-3 text-muted">{b.party_size ?? '—'}</td>
                <td className="px-5 py-3 text-muted">{b.phone ?? b.email ?? '—'}</td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  );
}
