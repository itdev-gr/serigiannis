import { LEGACY_TOUR_ALIASES } from '@/lib/legacy-tour-aliases.mjs';

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
 *
 *  Οι διευθύνσεις του παλιού WordPress site (εκατοντάδες, από το Search Console)
 *  ζουν χωριστά στο legacy-tour-aliases.mjs· εδώ μένουν μόνο όσες προέκυψαν από
 *  δικές μας μετονομασίες. Σε σύγκρουση νικά η γραμμή αυτού του αρχείου.
 */
const TOUR_ALIASES: Record<string, string> = {
  // Slug με κενά/κεφαλαία που καθαρίστηκαν (2026-08-06).
  'THESSALONIKI DIHMERH EKDROMH': 'thessaloniki-diimeri-ekdromi',
  'ekdromi sta lixadonisia': 'ekdromi-sta-lixadonisia',
  // Διπλοεγγραφές από το αρχικό import της 2/7/2026 (1 εικόνα, σύνοψη ~140
  // χαρακτήρων, καμία τιμή/ημερομηνία/κράτηση). Αποσύρθηκαν από το site ως
  // «Κρυμμένες» — δεν διαγράφηκαν — και οι διευθύνσεις τους δείχνουν στην
  // πλήρη εκδοχή της ίδιας εκδρομής.
  'moni-agioy-pasioy-soyrotis-thessaloniki-diimeri-proskynimatiki-ekdromi': 'thessaloniki-diimeri-ekdromi',
  'lixadonisia-kavos-sergiani-travel': 'ekdromi-sta-lixadonisia',
};

/** Όλοι οι γνωστοί παλιοί slug, με κλειδί σε πεζά ώστε η αναζήτηση να είναι
 *  O(1) — ο πίνακας έχει πάνω από 200 γραμμές και τρέχει σε κάθε άγνωστο
 *  /tour/<slug>. Οι δικές μας μετονομασίες γράφονται τελευταίες, οπότε
 *  υπερισχύουν σε τυχόν διπλό κλειδί. */
const ALL_ALIASES: ReadonlyMap<string, string> = new Map(
  [...Object.entries(LEGACY_TOUR_ALIASES), ...Object.entries(TOUR_ALIASES)].map(([oldSlug, target]) => [
    oldSlug.toLowerCase(),
    target,
  ])
);

/** Ο προορισμός για μια παλιά διεύθυνση εκδρομής, ή null όταν δεν είναι γνωστή
 *  παλιά μορφή. Επιστρέφει είτε νέο slug εκδρομής είτε πλήρες path (ξεκινά με
 *  «/») όταν η παλιά σελίδα αντιστοιχεί σε κατηγορία ή άρθρο· δες
 *  `tourAliasHref` για τη μετατροπή σε διεύθυνση.
 *
 *  Η αναζήτηση αγνοεί πεζά/κεφαλαία, το «+» που βάζουν κάποιοι clients στη θέση
 *  του κενού, και το τελικό «/» που είχαν όλες οι διευθύνσεις του παλιού site. */
export function resolveTourAlias(slug: string): string | null {
  const raw = String(slug ?? '').replace(/\/+$/, '');
  if (!raw) return null;
  const candidates = [raw, raw.replace(/\+/g, ' ')];
  for (const c of candidates) {
    const hit = ALL_ALIASES.get(c.toLowerCase());
    if (hit) return hit;
  }
  return null;
}

/** Η διεύθυνση στην οποία ανακατευθύνει ένα αποτέλεσμα του `resolveTourAlias`. */
export function tourAliasHref(target: string): string {
  return target.startsWith('/') ? target : `/tour/${target}`;
}
