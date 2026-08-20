/** UTC offset ("+03:00" / "+02:00") of Europe/Athens at a given instant. */
function offsetAt(instant: Date): string {
  const name = new Intl.DateTimeFormat('en-US', { timeZone: 'Europe/Athens', timeZoneName: 'longOffset' })
    .formatToParts(instant)
    .find((p) => p.type === 'timeZoneName')?.value;
  const m = name?.match(/GMT([+-]\d{2}:\d{2})/);
  return m ? m[1] : '+02:00';
}

/** Today's date in Athens as 'YYYY-MM-DD' (en-CA formats exactly that way). */
export function athensToday(now: Date = new Date()): string {
  return new Intl.DateTimeFormat('en-CA', { timeZone: 'Europe/Athens' }).format(now);
}

/**
 * Athens wall-clock date+time as an ISO string with the CORRECT UTC offset for
 * that moment (EET +02:00 in winter, EEST +03:00 in summer). Two passes resolve
 * dates near a DST switch: the second lookup uses the instant implied by the
 * first guess.
 */
export function athensDepartureAt(date: string, time: string): string {
  let offset = '+02:00';
  for (let i = 0; i < 2; i++) {
    offset = offsetAt(new Date(`${date}T${time}:00${offset}`));
  }
  return `${date}T${time}:00${offset}`;
}

// ─── Εμφάνιση χρόνου ────────────────────────────────────────────────────────
// Ο server τρέχει σε UTC (Vercel), οπότε κάθε toLocaleString χωρίς timeZone
// έδειχνε ώρες 2-3 ώρες πίσω. Όλες οι εμφανίσεις timestamp περνούν από εδώ.

const DATE_TIME = new Intl.DateTimeFormat('el-GR', {
  timeZone: 'Europe/Athens',
  hour12: false,
  day: '2-digit',
  month: '2-digit',
  year: 'numeric',
  hour: '2-digit',
  minute: '2-digit',
});
const SHORT_DATE_TIME = new Intl.DateTimeFormat('el-GR', {
  timeZone: 'Europe/Athens',
  hour12: false,
  day: '2-digit',
  month: '2-digit',
  hour: '2-digit',
  minute: '2-digit',
});
const TIME_ONLY = new Intl.DateTimeFormat('el-GR', {
  timeZone: 'Europe/Athens',
  hour12: false,
  hour: '2-digit',
  minute: '2-digit',
});
const DATE_ONLY = new Intl.DateTimeFormat('el-GR', { timeZone: 'Europe/Athens' });

/** «20/08/2026, 14:35» ώρα Ελλάδας — για created_at/paid_at/validated_at. */
export function athensDateTimeLabel(iso: string): string {
  return DATE_TIME.format(new Date(iso));
}

/** «20/08, 14:35» ώρα Ελλάδας — για στήλες λιστών του admin. */
export function athensShortDateTimeLabel(iso: string): string {
  return SHORT_DATE_TIME.format(new Date(iso));
}

/** «14:35» ώρα Ελλάδας — ώρα αναχώρησης, λήξη δέσμευσης. */
export function athensTimeLabel(iso: string): string {
  return TIME_ONLY.format(new Date(iso));
}

/** «20/08/2026» ώρα Ελλάδας — ημερομηνία από timestamp (π.χ. published_at). */
export function athensDateLabel(iso: string): string {
  return DATE_ONLY.format(new Date(iso));
}
