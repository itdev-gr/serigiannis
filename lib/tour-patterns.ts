// Βοηθητικά για τα εβδομαδιαία προγράμματα αναχωρήσεων εκδρομών.
// Κωδικοποίηση ημερών: extract(dow) της Postgres — 0=Κυριακή … 6=Σάββατο,
// ίδια με τα schedule_patterns των λεωφορείων.

/** Πόσο μπροστά γεννάμε ημερομηνίες. Ανεξάρτητο από το sales_window_days των
 *  εισιτηρίων — οι εκδρομές κλείνονται νωρίτερα. */
export const TOUR_PATTERN_HORIZON_DAYS = 60;

/** Σειρά εμφάνισης στο admin: Δευτέρα πρώτα, Κυριακή τελευταία. */
export const PATTERN_DAYS: { d: number; label: string }[] = [
  { d: 1, label: 'Δε' },
  { d: 2, label: 'Τρ' },
  { d: 3, label: 'Τε' },
  { d: 4, label: 'Πέ' },
  { d: 5, label: 'Πα' },
  { d: 6, label: 'Σά' },
  { d: 0, label: 'Κυ' },
];

/** Τα wd_0..wd_6 checkboxes μιας φόρμας → πίνακας ημερών για τη βάση. */
export function weekdaysFromForm(has: (name: string) => boolean): number[] {
  return [0, 1, 2, 3, 4, 5, 6].filter((d) => has(`wd_${d}`));
}

/** Σύνοψη προγράμματος για λίστες: «Κάθε Σά, Κυ» / «Καθημερινά». */
export function weekdaysLabel(weekdays: number[]): string {
  if (weekdays.length === 7) return 'Καθημερινά';
  if (weekdays.length === 0) return '—';
  const names = PATTERN_DAYS.filter(({ d }) => weekdays.includes(d)).map(({ label }) => label);
  return `Κάθε ${names.join(', ')}`;
}
