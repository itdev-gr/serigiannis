import Link from 'next/link';
import { getAdminPatterns, getAdminTrips } from '@/lib/queries/ticketing';
import { deletePattern, materializeTrips } from '../ticketing-actions';
import { Button } from '@/components/ui/Button';
import { ConfirmForm } from '@/components/admin/ConfirmForm';

const inputCls = 'rounded-md border border-border bg-surface px-3 py-2 font-sans text-[14px] text-body focus:border-primary focus:outline-none';
const DAY_SHORT = ['Κυ', 'Δε', 'Τρ', 'Τε', 'Πε', 'Πα', 'Σα'];

function iso(d: Date): string {
  return d.toISOString().slice(0, 10);
}

export default async function SchedulesPage() {
  const today = new Date();
  const in30 = new Date(today.getTime() + 30 * 86400000);
  const [patterns, trips] = await Promise.all([getAdminPatterns(), getAdminTrips(iso(today), iso(in30))]);

  return (
    <div className="max-w-5xl">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <h1 className="font-display text-4xl font-semibold text-primary">Δρομολόγια</h1>
        <Button asChild><Link href="/admin/schedules/new">+ Νέο πρόγραμμα</Link></Button>
      </div>

      <h2 className="mt-8 font-display text-2xl font-semibold text-primary">Επαναλαμβανόμενα προγράμματα</h2>
      <div className="mt-3 overflow-hidden rounded-lg border border-border bg-surface">
        {patterns.map((p) => (
          <div key={p.id} className="flex flex-wrap items-center justify-between gap-3 border-b border-border/60 px-4 py-3 last:border-0">
            <div>
              <Link href={`/admin/schedules/${p.id}`} className="font-medium text-primary hover:underline">
                {p.route?.origin?.name} → {p.route?.destination?.name} · {p.departure_time.slice(0, 5)}
              </Link>
              <p className="text-[13px] text-muted">
                {p.weekdays.slice().sort().map((d) => DAY_SHORT[d]).join(', ')} · {p.layout?.name}
                {' · από '}{new Date(`${p.valid_from}T12:00:00`).toLocaleDateString('el-GR')}
                {p.valid_to && ` έως ${new Date(`${p.valid_to}T12:00:00`).toLocaleDateString('el-GR')}`}
                {!p.is_active && ' · Ανενεργό'}
              </p>
            </div>
            <ConfirmForm action={deletePattern.bind(null, p.id)} message="Διαγραφή προγράμματος; Τα ήδη υλοποιημένα δρομολόγια παραμένουν.">
              <button type="submit" className="text-[13px] text-cta hover:underline">Διαγραφή</button>
            </ConfirmForm>
          </div>
        ))}
        {patterns.length === 0 && <p className="px-4 py-6 text-[14px] text-muted">Δεν υπάρχουν προγράμματα.</p>}
      </div>

      <div className="mt-6 rounded-lg border border-border bg-surface p-5">
        <form action={materializeTrips} className="flex flex-wrap items-end gap-3">
          <label className="text-[13px] text-muted">Από
            <input type="date" name="from" defaultValue={iso(today)} className={`${inputCls} block`} />
          </label>
          <label className="text-[13px] text-muted">Έως
            <input type="date" name="to" defaultValue={iso(in30)} className={`${inputCls} block`} />
          </label>
          <Button type="submit" variant="outline">Δημιουργία δρομολογίων περιόδου</Button>
          <p className="w-full text-[12px] text-muted sm:w-auto">
            Τα δρομολόγια δημιουργούνται αυτόματα και με κάθε αναζήτηση πελάτη. Εδώ τα προ-δημιουργείτε για επεξεργασία.
          </p>
        </form>
      </div>

      <h2 className="mt-10 font-display text-2xl font-semibold text-primary">Υλοποιημένα δρομολόγια (30 ημέρες)</h2>
      <div className="mt-3 overflow-hidden rounded-lg border border-border bg-surface">
        <div className="grid grid-cols-[9rem_1fr_8rem_7rem_auto] items-center gap-3 border-b border-border bg-background/50 px-4 py-3 font-sans text-[12px] uppercase tracking-[0.1em] text-muted">
          <div>Ημερομηνία</div>
          <div>Διαδρομή</div>
          <div>Ώρα</div>
          <div>Κατάσταση</div>
          <div className="text-right">—</div>
        </div>
        {trips.map((t) => (
          <div key={t.id} className="grid grid-cols-[9rem_1fr_8rem_7rem_auto] items-center gap-3 border-b border-border/60 px-4 py-2.5 last:border-0">
            <span className="text-[14px] text-body">{new Date(`${t.service_date}T12:00:00`).toLocaleDateString('el-GR', { weekday: 'short', day: '2-digit', month: '2-digit' })}</span>
            <span className="text-[14px] text-body">{t.route?.origin?.name} → {t.route?.destination?.name} <span className="text-muted">({t.layout?.name})</span></span>
            <span className="text-[14px] text-body">{new Date(t.departure_at).toLocaleTimeString('el-GR', { hour: '2-digit', minute: '2-digit', timeZone: 'Europe/Athens' })}</span>
            <span className={`w-fit rounded-full px-2.5 py-0.5 text-[12px] font-semibold ${t.status === 'scheduled' ? 'bg-olive/15 text-olive' : 'bg-cta/10 text-cta'}`}>
              {t.status === 'scheduled' ? 'Ενεργό' : 'Ακυρωμένο'}
            </span>
            <div className="text-right">
              <Link href={`/admin/schedules/trips/${t.id}`} className="text-[13px] font-medium text-primary hover:underline">Θέσεις & Διαχείριση</Link>
            </div>
          </div>
        ))}
        {trips.length === 0 && <p className="px-4 py-6 text-[14px] text-muted">Δεν υπάρχουν υλοποιημένα δρομολόγια. Πατήστε «Δημιουργία δρομολογίων περιόδου».</p>}
      </div>
    </div>
  );
}
