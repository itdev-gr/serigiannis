import Link from 'next/link';
import { getAdminRoutes, getAdminStations } from '@/lib/queries/ticketing';
import { deleteRoute, upsertRoute } from '../ticketing-actions';
import { Button } from '@/components/ui/Button';
import { ConfirmForm } from '@/components/admin/ConfirmForm';
import { Pill, adminInput } from '@/components/admin/ui';
import { routeLabel } from '@/lib/ticketing';

export default async function RoutesPage() {
  const [routes, stations] = await Promise.all([getAdminRoutes(), getAdminStations()]);
  return (
    <div className="max-w-4xl">
      <h1 className="font-display text-4xl font-semibold text-primary">Εκδρομές & Τιμές</h1>
      <p className="mt-2 text-[14px] text-muted">
        Κάθε εκδρομή έχει τίτλο, σημεία συνάντησης και δικό της τιμοκατάλογο. Πατήστε σε μια εκδρομή για τις τιμές της.
      </p>

      <div className="mt-8 overflow-hidden rounded-lg border border-border bg-surface">
        <div className="grid grid-cols-[1fr_7rem_6rem_6rem_auto] items-center gap-3 border-b border-border bg-background/50 px-4 py-3 font-sans text-[12px] uppercase tracking-[0.1em] text-muted">
          <div>Διαδρομή</div>
          <div>Κατάσταση</div>
          <div>Διάρκεια</div>
          <div>Cutoff</div>
          <div className="text-right">—</div>
        </div>
        {routes.map((r) => (
          <div key={r.id} className="grid grid-cols-[1fr_7rem_6rem_6rem_auto] items-center gap-3 border-b border-border/60 px-4 py-3 last:border-0">
            <Link href={`/admin/routes/${r.id}`} className="font-medium text-primary hover:underline">
              {routeLabel(r)}
            </Link>
            <Pill tone={r.status === 'published' ? 'ok' : 'muted'}>
              {r.status === 'published' ? 'Δημοσιευμένη' : 'Πρόχειρη'}
            </Pill>
            <span className="text-[14px] text-muted">{r.duration_min ? `${r.duration_min}′` : '—'}</span>
            <span className="text-[14px] text-muted">{r.sales_cutoff_min != null ? `${r.sales_cutoff_min}′` : 'default'}</span>
            <div className="flex items-center justify-end gap-3">
              <Link href={`/admin/routes/${r.id}`} className="text-[13px] font-medium text-primary hover:underline">Ναύλοι</Link>
              <ConfirmForm action={deleteRoute.bind(null, r.id)} message="Διαγραφή γραμμής; Θα διαγραφούν και οι ναύλοι της.">
                <button type="submit" className="text-[13px] text-cta hover:underline">Διαγραφή</button>
              </ConfirmForm>
            </div>
          </div>
        ))}
        {routes.length === 0 && <p className="px-4 py-6 text-[14px] text-muted">Δεν υπάρχουν γραμμές.</p>}
      </div>

      <div className="mt-8 rounded-lg border border-border bg-surface p-6">
        <h2 className="font-display text-xl font-semibold text-primary">Νέα εκδρομή</h2>
        <form action={upsertRoute} className="mt-4 grid gap-3 sm:grid-cols-[1fr_1fr_1fr_6rem_6rem_auto]">
          <input name="title" placeholder="Τίτλος εκδρομής (π.χ. Μονοήμερη Ναύπλιο)" className={adminInput} />
          <select name="origin_station_id" required className={adminInput}>
            <option value="">— Από —</option>
            {stations.map((s) => <option key={s.id} value={s.id}>{s.name}</option>)}
          </select>
          <select name="destination_station_id" required className={adminInput}>
            <option value="">— Προς —</option>
            {stations.map((s) => <option key={s.id} value={s.id}>{s.name}</option>)}
          </select>
          <input name="duration_min" type="number" placeholder="Λεπτά" className={adminInput} />
          <input name="sales_cutoff_min" type="number" placeholder="Cutoff′" className={adminInput} />
          <Button type="submit">Προσθήκη</Button>
          <input type="hidden" name="status" value="published" />
        </form>
      </div>
    </div>
  );
}
