'use client';
import { useState } from 'react';
import { Plus, Trash2 } from 'lucide-react';
import { adminInput, adminLabel } from '@/components/admin/ui';
import { Button } from '@/components/ui/Button';
import { centsToEuroInput } from '@/lib/booking';
import type { TourDeparture, TourPriceTier } from '@/types/db';

type TierRow = {
  key: string;
  id?: string;
  label: string;
  price: string;
  price_original: string;
  max_qty: string;
  is_active: boolean;
};

type DepartureRow = {
  key: string;
  id?: string;
  starts_on: string;
  ends_on: string;
  note: string;
  capacity: string;
  is_active: boolean;
};

let seq = 0;
const nextKey = () => `new-${seq++}`;

const emptyTier = (): TierRow => ({ key: nextKey(), label: '', price: '', price_original: '', max_qty: '20', is_active: true });
const emptyDeparture = (): DepartureRow => ({ key: nextKey(), starts_on: '', ends_on: '', note: '', capacity: '', is_active: true });

/** Booking setup of one tour: the price categories and the departure dates the
 *  public widget offers. Saved as JSON in one action (see saveTourBooking). */
export function TourBookingEditor({
  tourId,
  tiers,
  departures,
  action,
}: {
  tourId: string;
  tiers: TourPriceTier[];
  departures: TourDeparture[];
  action: (formData: FormData) => void | Promise<void>;
}) {
  const [tierRows, setTierRows] = useState<TierRow[]>(() =>
    tiers.map((t) => ({
      key: t.id,
      id: t.id,
      label: t.label,
      price: centsToEuroInput(t.price_cents),
      price_original: centsToEuroInput(t.price_original_cents),
      max_qty: String(t.max_qty),
      is_active: t.is_active,
    }))
  );
  const [depRows, setDepRows] = useState<DepartureRow[]>(() =>
    departures.map((d) => ({
      key: d.id,
      id: d.id,
      starts_on: d.starts_on,
      ends_on: d.ends_on ?? '',
      note: d.note ?? '',
      capacity: d.capacity != null ? String(d.capacity) : '',
      is_active: d.is_active,
    }))
  );

  const patchTier = (key: string, patch: Partial<TierRow>) =>
    setTierRows((rows) => rows.map((r) => (r.key === key ? { ...r, ...patch } : r)));
  const patchDep = (key: string, patch: Partial<DepartureRow>) =>
    setDepRows((rows) => rows.map((r) => (r.key === key ? { ...r, ...patch } : r)));

  return (
    <form action={action} className="mt-10 max-w-3xl">
      <input type="hidden" name="tour_id" value={tourId} />
      <input type="hidden" name="tiers" value={JSON.stringify(tierRows)} />
      <input type="hidden" name="departures" value={JSON.stringify(depRows)} />

      <h2 className="mb-1 font-display text-2xl font-semibold text-primary">Κρατήσεις &amp; Τιμές</h2>
      <p className="mb-5 text-[13px] text-muted">
        Όσο υπάρχει τουλάχιστον μία ενεργή κατηγορία τιμής, η σελίδα της εκδρομής δείχνει φόρμα online κράτησης με
        πληρωμή. Χωρίς κατηγορίες, δείχνει τη φόρμα αιτήματος προσφοράς.
      </p>

      <div className="rounded-lg border border-border bg-surface p-5">
        <h3 className="mb-3 font-sans text-[15px] font-semibold text-primary">Κατηγορίες τιμών</h3>
        {tierRows.length === 0 && <p className="mb-3 text-[13px] text-muted">Καμία κατηγορία — η εκδρομή δεν κλείνει online.</p>}
        <div className="grid gap-4">
          {tierRows.map((row) => (
            <div key={row.key} className="grid gap-3 rounded-md border border-border/70 p-3 sm:grid-cols-[1fr_7rem_7rem_5rem_auto]">
              <label className="block">
                <span className={adminLabel}>Περιγραφή</span>
                <input
                  value={row.label}
                  onChange={(e) => patchTier(row.key, { label: e.target.value })}
                  placeholder="π.χ. Το άτομο σε δίκλινο"
                  className={adminInput}
                />
              </label>
              <label className="block">
                <span className={adminLabel}>Τιμή (€)</span>
                <input
                  value={row.price}
                  onChange={(e) => patchTier(row.key, { price: e.target.value })}
                  inputMode="decimal"
                  placeholder="170"
                  className={adminInput}
                />
              </label>
              <label className="block">
                <span className={adminLabel}>Πριν (€)</span>
                <input
                  value={row.price_original}
                  onChange={(e) => patchTier(row.key, { price_original: e.target.value })}
                  inputMode="decimal"
                  placeholder="200"
                  className={adminInput}
                />
              </label>
              <label className="block">
                <span className={adminLabel}>Μέγ.</span>
                <input
                  value={row.max_qty}
                  onChange={(e) => patchTier(row.key, { max_qty: e.target.value })}
                  inputMode="numeric"
                  className={adminInput}
                />
              </label>
              <div className="flex items-end justify-between gap-3 sm:flex-col sm:items-center sm:justify-end">
                <label className="flex items-center gap-2 whitespace-nowrap text-[13px] text-muted">
                  <input
                    type="checkbox"
                    checked={row.is_active}
                    onChange={(e) => patchTier(row.key, { is_active: e.target.checked })}
                    className="h-4 w-4 accent-cta"
                  />
                  Ενεργή
                </label>
                <button
                  type="button"
                  onClick={() => setTierRows((rows) => rows.filter((r) => r.key !== row.key))}
                  className="text-muted transition hover:text-cta"
                  aria-label="Διαγραφή κατηγορίας"
                >
                  <Trash2 className="h-4 w-4" />
                </button>
              </div>
            </div>
          ))}
        </div>
        <button
          type="button"
          onClick={() => setTierRows((rows) => [...rows, emptyTier()])}
          className="mt-4 inline-flex items-center gap-2 rounded-md border border-border px-3 py-2 font-sans text-[13px] font-medium text-primary transition hover:border-primary"
        >
          <Plus className="h-4 w-4" /> Προσθήκη κατηγορίας
        </button>
      </div>

      <div className="mt-6 rounded-lg border border-border bg-surface p-5">
        <h3 className="mb-3 font-sans text-[15px] font-semibold text-primary">Ημερομηνίες αναχώρησης</h3>
        <p className="mb-3 text-[13px] text-muted">
          Ο πελάτης διαλέγει μόνο από αυτές. Χωρίς ημερομηνίες, η κράτηση γίνεται χωρίς επιλογή ημερομηνίας.
          Οι περασμένες ημερομηνίες κρύβονται αυτόματα.
        </p>
        <div className="grid gap-4">
          {depRows.map((row) => (
            <div key={row.key} className="grid gap-3 rounded-md border border-border/70 p-3 sm:grid-cols-[9rem_9rem_1fr_5rem_auto]">
              <label className="block">
                <span className={adminLabel}>Από</span>
                <input
                  type="date"
                  value={row.starts_on}
                  onChange={(e) => patchDep(row.key, { starts_on: e.target.value })}
                  className={adminInput}
                />
              </label>
              <label className="block">
                <span className={adminLabel}>Έως (προαιρ.)</span>
                <input
                  type="date"
                  value={row.ends_on}
                  onChange={(e) => patchDep(row.key, { ends_on: e.target.value })}
                  className={adminInput}
                />
              </label>
              <label className="block">
                <span className={adminLabel}>Σημείωση</span>
                <input
                  value={row.note}
                  onChange={(e) => patchDep(row.key, { note: e.target.value })}
                  placeholder="π.χ. 4 ημέρες"
                  className={adminInput}
                />
              </label>
              <label className="block">
                <span className={adminLabel}>Θέσεις</span>
                <input
                  value={row.capacity}
                  onChange={(e) => patchDep(row.key, { capacity: e.target.value })}
                  inputMode="numeric"
                  placeholder="—"
                  className={adminInput}
                />
              </label>
              <div className="flex items-end justify-between gap-3 sm:flex-col sm:items-center sm:justify-end">
                <label className="flex items-center gap-2 whitespace-nowrap text-[13px] text-muted">
                  <input
                    type="checkbox"
                    checked={row.is_active}
                    onChange={(e) => patchDep(row.key, { is_active: e.target.checked })}
                    className="h-4 w-4 accent-cta"
                  />
                  Ενεργή
                </label>
                <button
                  type="button"
                  onClick={() => setDepRows((rows) => rows.filter((r) => r.key !== row.key))}
                  className="text-muted transition hover:text-cta"
                  aria-label="Διαγραφή ημερομηνίας"
                >
                  <Trash2 className="h-4 w-4" />
                </button>
              </div>
            </div>
          ))}
        </div>
        <button
          type="button"
          onClick={() => setDepRows((rows) => [...rows, emptyDeparture()])}
          className="mt-4 inline-flex items-center gap-2 rounded-md border border-border px-3 py-2 font-sans text-[13px] font-medium text-primary transition hover:border-primary"
        >
          <Plus className="h-4 w-4" /> Προσθήκη ημερομηνίας
        </button>
      </div>

      <Button type="submit" size="lg" className="mt-6">Αποθήκευση κρατήσεων</Button>
    </form>
  );
}
