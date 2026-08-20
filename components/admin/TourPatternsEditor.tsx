import type { TourDeparturePattern } from '@/types/db';
import { PATTERN_DAYS, weekdaysLabel } from '@/lib/tour-patterns';
import { adminInput, adminLabel } from '@/components/admin/ui';
import { ConfirmForm } from '@/components/admin/ConfirmForm';
import { Button } from '@/components/ui/Button';
import { cn } from '@/lib/utils';

/** «Εβδομαδιαίο πρόγραμμα» αναχωρήσεων εκδρομής — το αντίστοιχο του tab
 *  «Πρόγραμμα» των πούλμαν: κάθε πρόγραμμα λέει «κάθε Σά, Κυ από Χ έως Υ,
 *  Ν θέσεις» και γεννά αυτόματα τις ημερομηνίες στη λίστα από κάτω.
 *  Server component — σκέτες φόρμες πάνω στα server actions. */
export function TourPatternsEditor({
  tourId,
  tourSlug,
  patterns,
  saveAction,
  deleteAction,
}: {
  tourId: string;
  tourSlug: string;
  patterns: TourDeparturePattern[];
  saveAction: (tourId: string, tourSlug: string, formData: FormData) => Promise<void>;
  deleteAction: (patternId: string, tourId: string, tourSlug: string) => Promise<void>;
}) {
  const fields = (p?: TourDeparturePattern) => (
    <>
      <div className="flex flex-wrap gap-2">
        {PATTERN_DAYS.map(({ d, label }) => (
          <label key={d} className="flex items-center gap-1.5 rounded-md border border-border px-2.5 py-1.5 text-[13px]">
            <input type="checkbox" name={`wd_${d}`} defaultChecked={p?.weekdays.includes(d)} className="h-4 w-4" /> {label}
          </label>
        ))}
      </div>
      <div className="flex flex-wrap items-end gap-3">
        <label className={adminLabel}>Από
          <input type="date" name="valid_from" defaultValue={p?.valid_from ?? ''} required className={cn(adminInput, 'w-40')} />
        </label>
        <label className={adminLabel}>Έως (κενό = χωρίς λήξη)
          <input type="date" name="valid_to" defaultValue={p?.valid_to ?? ''} className={cn(adminInput, 'w-40')} />
        </label>
        <label className={adminLabel}>Θέσεις (κενό = απεριόριστες)
          <input type="number" name="capacity" min={1} defaultValue={p?.capacity ?? ''} className={cn(adminInput, 'w-32')} />
        </label>
        <label className={cn(adminLabel, 'min-w-[10rem] flex-1')}>Σημείωση
          <input name="note" defaultValue={p?.note ?? ''} placeholder="π.χ. Αναχώρηση 08:00" className={adminInput} />
        </label>
        <label className="flex items-center gap-2 pb-2 text-[14px] text-body">
          <input type="checkbox" name="is_active" defaultChecked={p ? p.is_active : true} className="h-4 w-4" /> Ενεργό
        </label>
        <Button type="submit" size="sm" variant={p ? 'outline' : 'primary'}>
          {p ? 'Αποθήκευση' : 'Δημιουργία προγράμματος'}
        </Button>
      </div>
    </>
  );

  return (
    <section className="mt-10">
      <h2 className="font-display text-2xl font-semibold text-primary">Εβδομαδιαίο πρόγραμμα</h2>
      <p className="mt-1 max-w-2xl text-[13px] text-muted">
        Οι ημερομηνίες γεννιούνται αυτόματα για τις επόμενες εβδομάδες και εμφανίζονται στη λίστα
        «Ημερομηνίες αναχώρησης» με σήμανση «αυτόματη». Για να παραλείψετε μία ημέρα, ξετσεκάρετε
        το «Ενεργή» στη συγκεκριμένη ημερομηνία — δεν θα ξαναδημιουργηθεί.
      </p>

      <div className="mt-4 space-y-4">
        {patterns.map((p) => (
          <div key={p.id} className="rounded-lg border border-border bg-surface p-4">
            <p className="mb-3 text-[13px] font-semibold text-primary">
              {weekdaysLabel(p.weekdays)}
              {!p.is_active && <span className="ml-2 rounded-full bg-background px-2 py-0.5 text-[11px] font-semibold uppercase text-muted">Ανενεργό</span>}
            </p>
            <form action={saveAction.bind(null, tourId, tourSlug)} className="space-y-3">
              <input type="hidden" name="id" value={p.id} />
              {fields(p)}
            </form>
            <div className="mt-3 border-t border-border/60 pt-3">
              <ConfirmForm
                action={deleteAction.bind(null, p.id, tourId, tourSlug)}
                title="Διαγραφή προγράμματος"
                message="Διαγραφή προγράμματος; Οι μελλοντικές ημερομηνίες του χωρίς κρατήσεις θα αφαιρεθούν — όσες έχουν κρατήσεις παραμένουν."
                confirmLabel="Ναι, διαγραφή"
              >
                <button type="button" className="text-[13px] text-cta hover:underline">Διαγραφή προγράμματος</button>
              </ConfirmForm>
            </div>
          </div>
        ))}

        <div className="rounded-lg border border-dashed border-border bg-surface p-4">
          <p className="mb-3 text-[13px] font-semibold text-muted">Νέο πρόγραμμα</p>
          <form action={saveAction.bind(null, tourId, tourSlug)} className="space-y-3">
            {fields()}
          </form>
        </div>
      </div>
    </section>
  );
}
