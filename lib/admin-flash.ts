/** Greek copy for admin server-action error codes, keyed by the code carried in `?error=`. */
export const ADMIN_ERROR_TEXT: Record<string, string> = {
  db: 'Κάτι πήγε στραβά. Η ενέργεια ΔΕΝ αποθηκεύτηκε.',
  seat_taken: 'Η θέση είναι ήδη κατειλημμένη.',
  invalid_input: 'Μη έγκυρα στοιχεία.',
  not_found: 'Δεν βρέθηκε.',
  route_has_trips: 'Η εκδρομή έχει δρομολόγια — δεν μπορεί να διαγραφεί. Κάντε την Πρόχειρη.',
};

/** The query suffix a server action redirects with so the target page flashes a banner. */
export function flashQuery(ok: boolean, code?: string): string {
  return ok ? '?saved=1' : `?error=${code ?? 'db'}`;
}
