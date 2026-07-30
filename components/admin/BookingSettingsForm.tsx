import { Button } from '@/components/ui/Button';
import { saveBookingSettings } from '@/app/admin/(dashboard)/ticketing-actions';
import { adminInput } from '@/components/admin/ui';
import type { BookingSettings } from '@/types/ticketing';

type SettingField = { key: keyof BookingSettings; label: string };

const TOP_FIELDS: SettingField[] = [
  { key: 'hold_minutes', label: 'Δέσμευση θέσεων (λεπτά)' },
  { key: 'sales_window_days', label: 'Παράθυρο πωλήσεων (ημέρες)' },
  { key: 'default_cutoff_min', label: 'Cutoff online πώλησης (λεπτά)' },
];

const REFUND_FIELDS: SettingField[] = [
  { key: 'refund_cutoff_hours', label: 'Όριο πλήρους επιστροφής (ώρες)' },
  { key: 'refund_pct_early', label: 'Επιστροφή πριν το όριο (%)' },
  { key: 'refund_pct_late', label: 'Επιστροφή μετά το όριο (%)' },
];

function Field({ field, settings }: { field: SettingField; settings: BookingSettings }) {
  return (
    <label className="block text-[13px] text-muted">
      {field.label}
      <input name={field.key} type="number" defaultValue={settings[field.key]} className={adminInput} />
    </label>
  );
}

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
        {TOP_FIELDS.map((f) => (
          <Field key={f.key} field={f} settings={settings} />
        ))}
      </div>
      <div className="mt-6 border-t border-border pt-5">
        <h3 className="text-[13px] font-semibold text-body">Ακυρώσεις/επιστροφές</h3>
        <p className="mt-1 text-[12px] text-muted">
          Ποσοστό επιστροφής χρημάτων σε ακύρωση εισιτηρίου, ανάλογα με το πόσες ώρες πριν την αναχώρηση γίνεται.
        </p>
        <div className="mt-3 grid gap-4 sm:grid-cols-3 lg:grid-cols-4">
          {REFUND_FIELDS.map((f) => (
            <Field key={f.key} field={f} settings={settings} />
          ))}
        </div>
      </div>
      <div className="mt-5"><Button type="submit">Αποθήκευση</Button></div>
    </form>
  );
}
