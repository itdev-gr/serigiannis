/** Παλιές διευθύνσεις εκδρομών που άλλαξαν, ώστε οι ήδη μοιρασμένοι σύνδεσμοι
 *  να μη γίνουν 404.
 *
 *  Δύο εκδρομές είχαν slug με κενά και κεφαλαία («THESSALONIKI DIHMERH EKDROMH»),
 *  που έσπαγε όταν ο σύνδεσμος στελνόταν ως απλό κείμενο σε Viber, WhatsApp ή
 *  email — η εφαρμογή έκοβε τη διεύθυνση στο πρώτο κενό. Τα slug καθαρίστηκαν
 *  και οι παλιές μορφές ανακατευθύνουν μόνιμα (308) εδώ.
 *
 *  Όταν αλλάζει ξανά slug δημοσιευμένης εκδρομής, πρόσθεσε γραμμή εδώ. Τα
 *  κλειδιά γράφονται ΑΠΟΚΩΔΙΚΟΠΟΙΗΜΕΝΑ (με πραγματικά κενά): το Next δίνει το
 *  `params.slug` ήδη αποκωδικοποιημένο.
 */
const TOUR_ALIASES: Record<string, string> = {
  'THESSALONIKI DIHMERH EKDROMH': 'thessaloniki-diimeri-ekdromi',
  'ekdromi sta lixadonisia': 'ekdromi-sta-lixadonisia',
};

/** Το νέο slug για μια παλιά διεύθυνση, ή null όταν δεν είναι γνωστή παλιά μορφή.
 *  Η αναζήτηση αγνοεί πεζά/κεφαλαία και το «+» που βάζουν κάποιοι clients στη
 *  θέση του κενού, ώστε να πιάνονται όλες οι μορφές που κυκλοφορούν. */
export function resolveTourAlias(slug: string): string | null {
  const raw = String(slug ?? '');
  if (!raw) return null;
  const candidates = [raw, raw.replace(/\+/g, ' ')];
  for (const [oldSlug, newSlug] of Object.entries(TOUR_ALIASES)) {
    if (candidates.some((c) => c.toLowerCase() === oldSlug.toLowerCase())) return newSlug;
  }
  return null;
}
