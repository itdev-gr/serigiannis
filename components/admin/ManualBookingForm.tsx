'use client';
import { useState } from 'react';
import { manualBooking } from '@/app/admin/(dashboard)/ticketing-actions';
import { Button } from '@/components/ui/Button';
import { adminInput } from '@/components/admin/ui';
import type { FareType } from '@/types/ticketing';

/** Phone-booking form: seat is controlled by the parent (`TripSeatPanel`) so a
 *  click on the seat map or a redirect after saving can both drive it, while
 *  the office can still type over the suggestion. */
export function ManualBookingForm({
  tripId,
  fares,
  seat,
  onSeatChange,
  seatsLeft,
  boardingPoints,
}: {
  tripId: string;
  fares: FareType[];
  seat: string;
  onSeatChange: (seat: string) => void;
  seatsLeft: number;
  /** Σημεία επιβίβασης της διαδρομής. Προαιρετικό στην τηλεφωνική κράτηση —
   *  ο πελάτης μπορεί να μην το ξέρει ακόμη· ελέγχεται server-side όταν δοθεί. */
  boardingPoints: string[];
}) {
  // The value the system proposed on first render — frozen so an edit that
  // happens to match it later doesn't relabel itself as "the suggestion".
  const [suggestedSeat] = useState(seat);
  const isSuggested = seat !== '' && seat === suggestedSeat;
  const full = seatsLeft === 0;

  return (
    <form action={manualBooking} className="grid gap-3 rounded-lg border border-border bg-surface p-5">
      <h2 className="font-display text-xl font-semibold text-primary">Χειροκίνητη κράτηση (τηλεφωνική)</h2>
      <input type="hidden" name="trip_id" value={tripId} />
      <div className="grid grid-cols-2 gap-3">
        <label className="block text-[13px] text-muted">Θέση
          <input
            name="seat_no"
            required
            placeholder="π.χ. 12"
            value={seat}
            onChange={(e) => onSeatChange(e.target.value)}
            className={adminInput}
          />
          {full && <span className="mt-1 block text-[12px] font-medium text-cta">Δεν υπάρχουν ελεύθερες θέσεις</span>}
          {!full && isSuggested && <span className="mt-1 block text-[12px] text-muted">Πρόταση: επόμενη ελεύθερη</span>}
        </label>
        <label className="block text-[13px] text-muted">Ναύλος
          <select name="fare_type_id" required className={adminInput}>
            {fares.map((f) => <option key={f.id} value={f.id}>{f.name} — {(f.price_oneway_cents / 100).toFixed(2)}€</option>)}
          </select>
        </label>
      </div>
      <label className="block text-[13px] text-muted">Ονοματεπώνυμο επιβάτη
        <input name="passenger_name" required className={adminInput} />
      </label>
      <div className="grid grid-cols-2 gap-3">
        <label className="block text-[13px] text-muted">Τηλέφωνο
          <input name="phone" className={adminInput} />
        </label>
        <label className="block text-[13px] text-muted">Email (προαιρετικό)
          <input name="email" type="email" className={adminInput} />
        </label>
      </div>
      {boardingPoints.length > 0 && (
        <label className="block text-[13px] text-muted">Σημείο επιβίβασης (προαιρετικό)
          <select name="boarding_point" defaultValue="" className={adminInput}>
            <option value="">— Χωρίς σημείο (άγνωστο) —</option>
            {boardingPoints.map((point) => <option key={point} value={point}>{point}</option>)}
          </select>
        </label>
      )}
      <div><Button type="submit" disabled={full}>Κράτηση θέσης</Button></div>
      <p className="text-[12px] text-muted">Δημιουργεί κράτηση με «Πληρωμή στο γραφείο». Για πολλές θέσεις επαναλάβετε ανά θέση.</p>
    </form>
  );
}
