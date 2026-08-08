/** Η διάρκεια αποθηκεύεται ΠΑΝΤΑ σε λεπτά (`bus_routes.duration_min`, int).
 *  Οι συναρτήσεις εδώ υπάρχουν μόνο για να μη χρειάζεται ο υπάλληλος να
 *  υπολογίζει «2880» για μια διήμερη εκδρομή. */

export type DurationUnit = 'min' | 'hour' | 'day';

const PER_UNIT: Record<DurationUnit, number> = { min: 1, hour: 60, day: 1440 };

export const DURATION_UNITS: { value: DurationUnit; label: string }[] = [
  { value: 'min', label: 'λεπτά' },
  { value: 'hour', label: 'ώρες' },
  { value: 'day', label: 'μέρες' },
];

/** Ασφαλής μετατροπή ενός string φόρμας σε μονάδα· άγνωστη τιμή → λεπτά. */
export function durationUnit(raw: string): DurationUnit {
  return raw === 'hour' || raw === 'day' ? raw : 'min';
}

/** Λεπτά → η ΜΕΓΑΛΥΤΕΡΗ μονάδα που τα εκφράζει ακέραια: 2880 → 2 μέρες,
 *  120 → 2 ώρες, 90 → 90 λεπτά (δεν σπάει σε 1,5 ώρα). */
export function splitDuration(min: number | null | undefined): { value: number | ''; unit: DurationUnit } {
  if (min == null || !Number.isFinite(min)) return { value: '', unit: 'min' };
  if (min !== 0 && min % PER_UNIT.day === 0) return { value: min / PER_UNIT.day, unit: 'day' };
  if (min !== 0 && min % PER_UNIT.hour === 0) return { value: min / PER_UNIT.hour, unit: 'hour' };
  return { value: min, unit: 'min' };
}

/** Μονάδα → λεπτά. Πάντα ακέραια: η στήλη είναι `int` και ένα «1,5 ώρες»
 *  θα απορριπτόταν από τη βάση. */
export function toMinutes(value: number, unit: DurationUnit): number {
  return Math.round(value * PER_UNIT[unit]);
}
