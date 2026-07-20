import { getAdminStations } from '@/lib/queries/ticketing';
import { deleteStation, upsertStation } from '../ticketing-actions';
import { Button } from '@/components/ui/Button';
import { ConfirmForm } from '@/components/admin/ConfirmForm';

const inputCls = 'w-full rounded-md border border-border bg-surface px-3 py-2 font-sans text-[14px] text-body focus:border-primary focus:outline-none focus:ring-4 focus:ring-primary/10';
const ROW_GRID = 'grid grid-cols-[1fr_1fr_5rem_5rem_4rem_auto] items-center gap-3';

export default async function StationsPage() {
  const stations = await getAdminStations();
  return (
    <div className="max-w-4xl">
      <h1 className="font-display text-4xl font-semibold text-primary">Στάσεις / Σταθμοί</h1>
      <p className="mt-2 text-[14px] text-muted">Οι αφετηρίες και οι προορισμοί που εμφανίζονται στην αναζήτηση εισιτηρίων.</p>

      <div className="mt-8 overflow-hidden rounded-lg border border-border bg-surface">
        <div className={`${ROW_GRID} border-b border-border bg-background/50 px-4 py-3 font-sans text-[12px] uppercase tracking-[0.1em] text-muted`}>
          <div>Όνομα</div>
          <div>Slug</div>
          <div>Κωδικός</div>
          <div>Σειρά</div>
          <div>Ενεργή</div>
          <div className="text-right">—</div>
        </div>
        {stations.map((s) => {
          const formId = `station-${s.id}`;
          return (
            <div key={s.id} className={`${ROW_GRID} border-b border-border/60 px-4 py-2 last:border-0`}>
              <form id={formId} action={upsertStation} className="hidden">
                <input type="hidden" name="id" value={s.id} />
              </form>
              <input form={formId} name="name" defaultValue={s.name} className={inputCls} />
              <input form={formId} name="slug" defaultValue={s.slug} className={inputCls} />
              <input form={formId} name="code" defaultValue={s.code ?? ''} className={inputCls} />
              <input form={formId} name="position" type="number" defaultValue={s.position} className={inputCls} />
              <input form={formId} name="is_active" type="checkbox" defaultChecked={s.is_active} className="h-4 w-4" />
              <div className="flex items-center justify-end gap-3">
                <Button type="submit" form={formId} size="sm" variant="outline">Αποθήκευση</Button>
                <ConfirmForm action={deleteStation.bind(null, s.id)} message={`Διαγραφή στάσης «${s.name}»; Θα αποτύχει αν χρησιμοποιείται σε γραμμές.`}>
                  <button type="submit" className="text-[13px] text-cta hover:underline">Διαγραφή</button>
                </ConfirmForm>
              </div>
            </div>
          );
        })}
      </div>

      <div className="mt-8 rounded-lg border border-border bg-surface p-6">
        <h2 className="font-display text-xl font-semibold text-primary">Νέα στάση</h2>
        <form action={upsertStation} className="mt-4 grid gap-3 sm:grid-cols-[1fr_1fr_5rem_5rem_auto]">
          <input name="name" placeholder="Όνομα (π.χ. ΑΘΗΝΑ)" required className={inputCls} />
          <input name="slug" placeholder="slug (π.χ. athina)" required className={inputCls} />
          <input name="code" placeholder="Κωδ." className={inputCls} />
          <input name="position" type="number" defaultValue={0} className={inputCls} />
          <Button type="submit">Προσθήκη</Button>
          <input type="hidden" name="is_active" value="on" />
        </form>
      </div>
    </div>
  );
}
