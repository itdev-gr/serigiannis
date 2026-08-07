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
  invalid_phone: 'Χρειάζεται τηλέφωνο με τουλάχιστον 8 ψηφία. Η κράτηση ΔΕΝ έγινε.',
  invalid_fare: 'Ο ναύλος δεν είναι διαθέσιμος. Επιλέξτε άλλον — η κράτηση ΔΕΝ έγινε.',
  invalid_boarding_point: 'Το σημείο επιβίβασης δεν είναι έγκυρο. Ανανεώστε τη σελίδα και δοκιμάστε ξανά.',
  duplicate_post_slug: 'Αυτό το slug χρησιμοποιείται ήδη από άλλο άρθρο. Επιλέξτε διαφορετικό.',
  duplicate_category: 'Υπάρχει ήδη κατηγορία με αυτό το slug.',
  category_in_use: 'Η κατηγορία αφαιρέθηκε και από τις εκδρομές που τη χρησιμοποιούσαν.',
  seat_not_blocked: 'Η θέση δεν ήταν κλειδωμένη.',
  delete_image: 'Η διαγραφή της φωτογραφίας απέτυχε. Η φωτογραφία παραμένει.',
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
