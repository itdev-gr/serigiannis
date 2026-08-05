/** Greek copy for admin server-action error codes, keyed by the code carried in `?error=`. */
export const ADMIN_ERROR_TEXT: Record<string, string> = {
  db: 'Κάτι πήγε στραβά. Η ενέργεια ΔΕΝ αποθηκεύτηκε.',
  seat_taken: 'Η θέση είναι ήδη κατειλημμένη.',
  invalid_input: 'Μη έγκυρα στοιχεία.',
  not_found: 'Δεν βρέθηκε.',
  route_has_trips: 'Η εκδρομή έχει δρομολόγια — δεν μπορεί να διαγραφεί. Κάντε την Πρόχειρη.',
  layout_in_use: 'Το λεωφορείο χρησιμοποιείται σε πρόγραμμα ή δρομολόγια — δεν μπορεί να διαγραφεί.',
  duplicate_slug: 'Αυτό το slug χρησιμοποιείται ήδη από άλλη εκδρομή. Επιλέξτε διαφορετικό.',
  invalid_price: 'Μη έγκυρη τιμή — ελέγξτε τα ποσά και δοκιμάστε ξανά.',
  delete: 'Η διαγραφή απέτυχε. Η εκδρομή παραμένει στο site.',
};

/** The query suffix a server action redirects with so the target page flashes a banner. */
export function flashQuery(ok: boolean, code?: string): string {
  return ok ? '?saved=1' : `?error=${code ?? 'db'}`;
}

/** Append a flash marker to a path that may already carry a query string
 *  (e.g. `?tab=times`), choosing `?` or `&` as needed. */
export function withFlash(path: string, ok: boolean, code?: string): string {
  const sep = path.includes('?') ? '&' : '?';
  return `${path}${sep}${ok ? 'saved=1' : `error=${code ?? 'db'}`}`;
}
