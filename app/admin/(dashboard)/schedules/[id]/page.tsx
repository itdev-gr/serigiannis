import Link from 'next/link';
import { notFound } from 'next/navigation';
import { getAdminLayouts, getAdminPattern, getAdminRoutes } from '@/lib/queries/ticketing';
import { createTrip, upsertPattern } from '../../ticketing-actions';
import { Button } from '@/components/ui/Button';

const inputCls = 'w-full rounded-md border border-border bg-surface px-3 py-2 font-sans text-[14px] text-body focus:border-primary focus:outline-none focus:ring-4 focus:ring-primary/10';
const DAYS = [
  { d: 1, label: 'Δευτέρα' }, { d: 2, label: 'Τρίτη' }, { d: 3, label: 'Τετάρτη' },
  { d: 4, label: 'Πέμπτη' }, { d: 5, label: 'Παρασκευή' }, { d: 6, label: 'Σάββατο' }, { d: 0, label: 'Κυριακή' },
];

export default async function PatternPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const isNew = id === 'new';
  const [pattern, routes, layouts] = await Promise.all([
    isNew ? Promise.resolve(null) : getAdminPattern(id),
    getAdminRoutes(),
    getAdminLayouts(),
  ]);
  if (!isNew && !pattern) notFound();

  return (
    <div className="max-w-3xl">
      <p className="mb-2 text-[13px]"><Link href="/admin/schedules" className="text-muted hover:text-primary">← Δρομολόγια</Link></p>
      <h1 className="font-display text-4xl font-semibold text-primary">
        {isNew ? 'Νέο επαναλαμβανόμενο πρόγραμμα' : 'Επεξεργασία προγράμματος'}
      </h1>

      <form action={upsertPattern} className="mt-6 grid gap-5 rounded-lg border border-border bg-surface p-6">
        {!isNew && <input type="hidden" name="id" value={pattern!.id} />}
        <div className="grid gap-4 sm:grid-cols-2">
          <label className="block text-[13px] text-muted">Γραμμή
            <select name="route_id" defaultValue={pattern?.route_id ?? ''} required className={inputCls}>
              <option value="">— Επιλέξτε —</option>
              {routes.map((r) => (
                <option key={r.id} value={r.id}>{r.origin?.name} → {r.destination?.name}</option>
              ))}
            </select>
          </label>
          <label className="block text-[13px] text-muted">Λεωφορείο (διάταξη)
            <select name="layout_id" defaultValue={pattern?.layout_id ?? ''} required className={inputCls}>
              <option value="">— Επιλέξτε —</option>
              {layouts.map((l) => <option key={l.id} value={l.id}>{l.name}</option>)}
            </select>
          </label>
          <label className="block text-[13px] text-muted">Ώρα αναχώρησης
            <input type="time" name="departure_time" defaultValue={pattern?.departure_time?.slice(0, 5) ?? ''} required className={inputCls} />
          </label>
          <div className="grid grid-cols-2 gap-4">
            <label className="block text-[13px] text-muted">Ισχύει από
              <input type="date" name="valid_from" defaultValue={pattern?.valid_from ?? new Date().toISOString().slice(0, 10)} required className={inputCls} />
            </label>
            <label className="block text-[13px] text-muted">Έως (προαιρετικό)
              <input type="date" name="valid_to" defaultValue={pattern?.valid_to ?? ''} className={inputCls} />
            </label>
          </div>
        </div>

        <fieldset>
          <legend className="mb-2 text-[13px] font-medium uppercase tracking-[0.1em] text-primary">Ημέρες εβδομάδας</legend>
          <div className="flex flex-wrap gap-3">
            {DAYS.map(({ d, label }) => (
              <label key={d} className="flex items-center gap-2 rounded-md border border-border px-3 py-2 text-[14px]">
                <input type="checkbox" name={`wd_${d}`} defaultChecked={pattern?.weekdays?.includes(d) ?? false} className="h-4 w-4" />
                {label}
              </label>
            ))}
          </div>
        </fieldset>

        <label className="block text-[13px] text-muted">Σημειώσεις
          <input name="notes" defaultValue={pattern?.notes ?? ''} className={inputCls} />
        </label>
        <label className="flex items-center gap-2 text-[14px] text-body">
          <input type="checkbox" name="is_active" defaultChecked={pattern?.is_active ?? true} className="h-4 w-4" /> Ενεργό
        </label>
        <div><Button type="submit" size="lg">Αποθήκευση</Button></div>
      </form>

      <div className="mt-10 rounded-lg border border-border bg-surface p-6">
        <h2 className="font-display text-xl font-semibold text-primary">Έκτακτο δρομολόγιο (μία ημέρα)</h2>
        <form action={createTrip} className="mt-4 grid gap-3 sm:grid-cols-[1fr_1fr_8rem_7rem_auto]">
          <select name="route_id" required className={inputCls}>
            <option value="">— Γραμμή —</option>
            {routes.map((r) => (
              <option key={r.id} value={r.id}>{r.origin?.name} → {r.destination?.name}</option>
            ))}
          </select>
          <select name="layout_id" required className={inputCls}>
            <option value="">— Λεωφορείο —</option>
            {layouts.map((l) => <option key={l.id} value={l.id}>{l.name}</option>)}
          </select>
          <input type="date" name="service_date" required className={inputCls} />
          <input type="time" name="departure_time" required className={inputCls} />
          <Button type="submit" variant="outline">Προσθήκη</Button>
        </form>
      </div>
    </div>
  );
}
