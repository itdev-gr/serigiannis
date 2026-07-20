import { Button } from '@/components/ui/Button';
import { saveBookingSettings } from '@/app/admin/(dashboard)/ticketing-actions';
import type { BookingSettings } from '@/types/ticketing';

const inputCls = 'w-full rounded-md border border-border bg-surface px-3 py-2 font-sans text-[14px] text-body focus:border-primary focus:outline-none focus:ring-4 focus:ring-primary/10';

const FIELDS: { key: keyof BookingSettings; label: string }[] = [
  { key: 'hold_minutes', label: 'Δέσμευση θέσεων (λεπτά)' },
  { key: 'sales_window_days', label: 'Παράθυρο πωλήσεων (ημέρες)' },
  { key: 'default_cutoff_min', label: 'Cutoff online πώλησης (λεπτά)' },
  { key: 'refund_cutoff_hours', label: 'Όριο πλήρους επιστροφής (ώρες)' },
  { key: 'refund_pct_early', label: 'Επιστροφή πριν το όριο (%)' },
  { key: 'refund_pct_late', label: 'Επιστροφή μετά το όριο (%)' },
  { key: 'open_return_months', label: 'Ισχύς ανοιχτής επιστροφής (μήνες)' },
];

/** Booking engine settings card, rendered on /admin/settings. */
export function BookingSettingsForm({ settings }: { settings: BookingSettings }) {
  return (
    <form action={saveBookingSettings} className="mt-10 rounded-lg border border-border bg-surface p-6">
      <h2 className="font-display text-2xl font-semibold text-primary">Εισιτήρια Λεωφορείων</h2>
      <p className="mt-1 text-[13px] text-muted">
        Κανόνες του συστήματος κρατήσεων. Ισχύουν άμεσα για όλες τις γραμμές (τα cutoff μπορούν να
        παρακαμφθούν ανά γραμμή ή ανά δρομολόγιο).
      </p>
      <div className="mt-5 grid gap-4 sm:grid-cols-3 lg:grid-cols-4">
        {FIELDS.map((f) => (
          <label key={f.key} className="block text-[13px] text-muted">
            {f.label}
            <input name={f.key} type="number" defaultValue={settings[f.key]} className={inputCls} />
          </label>
        ))}
      </div>
      <div className="mt-5"><Button type="submit">Αποθήκευση</Button></div>
    </form>
  );
}
