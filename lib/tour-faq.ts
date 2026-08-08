// Συχνές ερωτήσεις παραγόμενες από τα πεδία που ήδη έχει η εκδρομή — καμία νέα
// στήλη στη βάση. Καθαρή συνάρτηση (χωρίς React) ώστε να ελέγχεται με tests και
// να τροφοδοτεί τόσο το <TourFaq /> όσο και το FAQPage JSON-LD της σελίδας.

import type { Tour } from '@/types/db';

export type TourFaq = { q: string; a: string };

/** Τα πεδία της εκδρομής που χρειάζεται η παραγωγή ερωτήσεων. */
export type TourFaqInput = Pick<
  Tour,
  'title' | 'price_from' | 'duration_label' | 'departure_note' | 'meeting_point' | 'meeting_points'
>;

/** Κείμενο που δεν λέει τίποτα: κενό, παύλες, τελείες, «-», «—», «n/a». */
function clean(value: string | null | undefined): string | null {
  if (typeof value !== 'string') return null;
  const trimmed = value.trim();
  if (!trimmed) return null;
  if (/^[-–—.·•_\s]+$/.test(trimmed)) return null;
  if (/^(n\/?a|tba|tbd)$/i.test(trimmed)) return null;
  return trimmed;
}

/** Καθαρή λίστα σημείων επιβίβασης, χωρίς κενά και διπλά. */
function cleanPoints(points: string[] | null | undefined): string[] {
  const out: string[] = [];
  for (const point of points ?? []) {
    const value = clean(point);
    if (value && !out.includes(value)) out.push(value);
  }
  return out;
}

/** Τελεία στο τέλος, ώστε τα κομμάτια της απάντησης να ενώνονται καθαρά. */
function sentence(text: string): string {
  return /[.!;…]$/.test(text) ? text : `${text}.`;
}

const BOOKING_A =
  'Μπορείτε να κλείσετε θέση απευθείας από αυτή τη σελίδα ή τηλεφωνικά στο γραφείο μας. ' +
  'Θα λάβετε γραπτή επιβεβαίωση με όλα τα στοιχεία της εκδρομής μόλις ολοκληρωθεί η κράτηση.';

const CANCELLATION_A =
  'Για ακύρωση ή αλλαγή ημερομηνίας επικοινωνήστε με το γραφείο το συντομότερο δυνατό. ' +
  'Όσο νωρίτερα μας ενημερώσετε, τόσο πιο εύκολα τακτοποιούμε την κράτησή σας ή σας προτείνουμε άλλη αναχώρηση.';

const FALLBACKS: TourFaq[] = [
  {
    q: 'Τι χρειάζεται να έχω μαζί μου;',
    a:
      'Ταυτότητα ή διαβατήριο, άνετα παπούτσια και ρούχα ανάλογα με τον καιρό. ' +
      'Ό,τι επιπλέον χρειάζεται για τη συγκεκριμένη εκδρομή σας το λέμε στην επιβεβαίωση της κράτησης.',
  },
  {
    q: 'Πώς επικοινωνώ με το γραφείο;',
    a:
      'Τηλεφωνικά ή με μήνυμα μέσω της φόρμας επικοινωνίας. ' +
      'Απαντάμε σε κάθε ερώτημα για το πρόγραμμα, τη διαθεσιμότητα και τα σημεία επιβίβασης.',
  },
];

/**
 * 3–5 ερωτήσεις στα ελληνικά, μόνο από τα πεδία που πράγματι υπάρχουν.
 * Καμία ερώτηση με κενή απάντηση, καμία διπλή ερώτηση.
 */
export function tourFaqs(tour: TourFaqInput): TourFaq[] {
  const title = clean(tour.title);
  const duration = clean(tour.duration_label);
  const departure = clean(tour.departure_note);
  const meetingPoint = clean(tour.meeting_point);
  const points = cleanPoints(tour.meeting_points);

  const entries: TourFaq[] = [];

  entries.push({
    q: title ? `Πώς κάνω κράτηση για την εκδρομή «${title}»;` : 'Πώς κάνω κράτηση για την εκδρομή;',
    a: BOOKING_A,
  });

  if (tour.price_from != null) {
    entries.push({
      q: 'Πόσο κοστίζει η εκδρομή και τι περιλαμβάνει η τιμή;',
      a:
        `Η τιμή ξεκινά από ${tour.price_from}€ το άτομο και περιλαμβάνει τη μεταφορά με πούλμαν και τη συνοδεία του γραφείου. ` +
        'Εισιτήρια σε χώρους επίσκεψης, γεύματα και προαιρετικές δραστηριότητες δεν περιλαμβάνονται, εκτός αν αναφέρεται διαφορετικά στο πρόγραμμα.',
    });
  }

  // Από πού και τι ώρα: πρώτα τα επιλέξιμα σημεία, μετά το ένα σημείο
  // συνάντησης, και τέλος μόνο η σημείωση αναχωρήσεων.
  const where =
    points.length > 1
      ? `Η επιβίβαση γίνεται από τα εξής σημεία: ${points.join(', ')}`
      : points.length === 1
        ? `Η αναχώρηση γίνεται από ${points[0]}`
        : meetingPoint
          ? `Η αναχώρηση γίνεται από ${meetingPoint}`
          : null;
  const departureParts: string[] = [];
  if (where) departureParts.push(sentence(where));
  if (departure) departureParts.push(sentence(`Αναχωρήσεις: ${departure}`));
  if (departureParts.length > 0) {
    entries.push({ q: 'Από πού και τι ώρα φεύγει η εκδρομή;', a: departureParts.join(' ') });
  }

  if (duration) {
    entries.push({
      q: 'Πόσο διαρκεί η εκδρομή;',
      a: `${sentence(`Η εκδρομή διαρκεί ${duration}`)} Η ακριβής ώρα επιστροφής εξαρτάται από την κίνηση και το πρόγραμμα της ημέρας.`,
    });
  }

  entries.push({ q: 'Τι ισχύει για τις ακυρώσεις;', a: CANCELLATION_A });

  // Σε πολύ φτωχή εκδρομή συμπληρώνουμε με γενικές ερωτήσεις ώστε η ενότητα
  // να μη δείχνει μισοάδεια — ποτέ πάνω από πέντε συνολικά.
  for (const fallback of FALLBACKS) {
    if (entries.length >= 3) break;
    entries.push(fallback);
  }

  const seen = new Set<string>();
  const unique: TourFaq[] = [];
  for (const entry of entries) {
    if (!clean(entry.a) || seen.has(entry.q)) continue;
    seen.add(entry.q);
    unique.push(entry);
  }
  return unique.slice(0, 5);
}
