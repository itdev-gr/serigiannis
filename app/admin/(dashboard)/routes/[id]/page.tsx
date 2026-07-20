import Link from 'next/link';
import { notFound } from 'next/navigation';
import { getAdminRoute, getAdminRouteFares } from '@/lib/queries/ticketing';
import { copyFaresToReverse, deleteFareType, upsertFareType, upsertRoute } from '../../ticketing-actions';
import { Button } from '@/components/ui/Button';
import { ConfirmForm } from '@/components/admin/ConfirmForm';

const inputCls = 'w-full rounded-md border border-border bg-surface px-3 py-2 font-sans text-[14px] text-body focus:border-primary focus:outline-none focus:ring-4 focus:ring-primary/10';
const FARE_GRID = 'grid grid-cols-[10rem_1fr_6rem_6rem_3.5rem_3.5rem_4rem_auto] items-start gap-2';

export default async function RouteDetailPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const route = await getAdminRoute(id);
  if (!route) notFound();
  const fares = await getAdminRouteFares(id);

  return (
    <div className="max-w-5xl">
      <p className="mb-2 text-[13px]"><Link href="/admin/routes" className="text-muted hover:text-primary">← Γραμμές</Link></p>
      <h1 className="font-display text-4xl font-semibold text-primary">
        {route.origin?.name} → {route.destination?.name}
      </h1>

      <form action={upsertRoute} className="mt-6 grid gap-3 rounded-lg border border-border bg-surface p-6 sm:grid-cols-[8rem_8rem_8rem_8rem_auto]">
        <input type="hidden" name="id" value={route.id} />
        <input type="hidden" name="origin_station_id" value={route.origin_station_id} />
        <input type="hidden" name="destination_station_id" value={route.destination_station_id} />
        <label className="block text-[13px] text-muted">Κατάσταση
          <select name="status" defaultValue={route.status} className={inputCls}>
            <option value="published">Δημοσιευμένη</option>
            <option value="draft">Πρόχειρη</option>
          </select>
        </label>
        <label className="block text-[13px] text-muted">Διάρκεια (λεπτά)
          <input name="duration_min" type="number" defaultValue={route.duration_min ?? ''} className={inputCls} />
        </label>
        <label className="block text-[13px] text-muted">Cutoff πώλησης (λεπτά)
          <input name="sales_cutoff_min" type="number" defaultValue={route.sales_cutoff_min ?? ''} placeholder="default" className={inputCls} />
        </label>
        <label className="block text-[13px] text-muted">Σειρά
          <input name="position" type="number" defaultValue={route.position} className={inputCls} />
        </label>
        <div className="self-end"><Button type="submit">Αποθήκευση</Button></div>
      </form>

      <div className="mt-10 flex flex-wrap items-center justify-between gap-3">
        <h2 className="font-display text-2xl font-semibold text-primary">Ναύλοι</h2>
        <ConfirmForm action={copyFaresToReverse.bind(null, route.id)} message="Αντιγραφή των ναύλων στην αντίστροφη κατεύθυνση; Οι υπάρχοντες ναύλοι της θα αντικατασταθούν.">
          <Button type="submit" variant="outline" size="sm">Αντιγραφή στην αντίστροφη</Button>
        </ConfirmForm>
      </div>

      <div className="mt-4 overflow-x-auto rounded-lg border border-border bg-surface">
        <div className="min-w-[900px]">
          <div className={`${FARE_GRID} border-b border-border bg-background/50 px-4 py-3 font-sans text-[12px] uppercase tracking-[0.1em] text-muted`}>
            <div>Όνομα</div>
            <div>Δικαιούχοι</div>
            <div>Απλή (€)</div>
            <div>Με επιστρ. (€)</div>
            <div>Πάσο</div>
            <div>Default</div>
            <div>Ενεργός</div>
            <div className="text-right">—</div>
          </div>
          {fares.map((f) => {
            const formId = `fare-${f.id}`;
            return (
              <div key={f.id} className={`${FARE_GRID} border-b border-border/60 px-4 py-2 last:border-0`}>
                <form id={formId} action={upsertFareType} className="hidden">
                  <input type="hidden" name="id" value={f.id} />
                  <input type="hidden" name="route_id" value={route.id} />
                  <input type="hidden" name="position" value={f.position} />
                </form>
                <input form={formId} name="name" defaultValue={f.name} className={inputCls} />
                <textarea form={formId} name="description" defaultValue={f.description ?? ''} rows={2} className={inputCls} />
                <input form={formId} name="price_oneway" type="number" step="0.01" defaultValue={(f.price_oneway_cents / 100).toFixed(2)} className={inputCls} />
                <input form={formId} name="price_round" type="number" step="0.01" defaultValue={(f.price_round_cents / 100).toFixed(2)} className={inputCls} />
                <input form={formId} name="requires_document" type="checkbox" defaultChecked={f.requires_document} className="mt-3 h-4 w-4" />
                <input form={formId} name="is_default" type="checkbox" defaultChecked={f.is_default} className="mt-3 h-4 w-4" />
                <input form={formId} name="is_active" type="checkbox" defaultChecked={f.is_active} className="mt-3 h-4 w-4" />
                <div className="flex flex-col items-end gap-2">
                  <Button type="submit" form={formId} size="sm" variant="outline">Αποθήκευση</Button>
                  <ConfirmForm action={deleteFareType.bind(null, f.id, route.id)} message={`Διαγραφή ναύλου «${f.name}»;`}>
                    <button type="submit" className="text-[13px] text-cta hover:underline">Διαγραφή</button>
                  </ConfirmForm>
                </div>
              </div>
            );
          })}
        </div>
      </div>

      <div className="mt-8 rounded-lg border border-border bg-surface p-6">
        <h3 className="font-display text-xl font-semibold text-primary">Νέος ναύλος</h3>
        <form action={upsertFareType} className="mt-4 grid gap-3 sm:grid-cols-[10rem_1fr_6rem_6rem_auto]">
          <input type="hidden" name="route_id" value={route.id} />
          <input type="hidden" name="is_active" value="on" />
          <input name="name" placeholder="Όνομα (π.χ. Κανονικό)" required className={inputCls} />
          <input name="description" placeholder="Δικαιούχοι" className={inputCls} />
          <input name="price_oneway" type="number" step="0.01" placeholder="Απλή €" required className={inputCls} />
          <input name="price_round" type="number" step="0.01" placeholder="Με επιστρ. €" required className={inputCls} />
          <Button type="submit">Προσθήκη</Button>
        </form>
      </div>
    </div>
  );
}
