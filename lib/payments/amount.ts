/** Έλεγχος ότι το ποσό που χρέωσε η πύλη είναι αυτό που ζητούσε η κράτηση.
 *
 *  Η πύλη επιστρέφει το ποσό της συναλλαγής σε ΕΥΡΩ (30.5 = 30,50 €), ενώ εμείς
 *  κρατάμε παντού λεπτά. Η μετατροπή γίνεται εδώ, σε ένα σημείο, ώστε να
 *  δοκιμάζεται χωρίς δίκτυο.
 *
 *  Σημαντικό: η ασυμφωνία ΔΕΝ ακυρώνει την πληρωμή. Τα χρήματα έχουν ήδη
 *  χρεωθεί στον πελάτη — το να αρνηθούμε να την καταγράψουμε θα άφηνε πληρωμένη
 *  κράτηση χωρίς επιβεβαίωση, που είναι χειρότερο από μια λάθος χρέωση που
 *  φαίνεται. Την καταγράφουμε και σημειώνουμε την κράτηση για έλεγχο.
 */

/** Ευρώ (δεκαδικά) → λεπτά. Null όταν η πύλη δεν έδωσε αριθμό. */
export function centsFromMajorUnits(amount: number | null | undefined): number | null {
  if (typeof amount !== 'number' || !Number.isFinite(amount)) return null;
  return Math.round(amount * 100);
}

/** Σημείωση για το γραφείο όταν το χρεωμένο ποσό δεν ταιριάζει με το σύνολο της
 *  κράτησης — null όταν ταιριάζει ή όταν δεν υπάρχει ποσό για να συγκριθεί. */
export function paymentAmountNote(expectedCents: number, paidCents: number | null): string | null {
  if (paidCents == null) return null;
  if (!Number.isFinite(expectedCents)) return null;
  if (paidCents === expectedCents) return null;
  const fmt = (c: number) => (c / 100).toFixed(2).replace('.', ',');
  return `ΑΣΥΜΦΩΝΙΑ ΠΟΣΟΥ: χρεώθηκαν ${fmt(paidCents)} € ενώ η κράτηση είναι ${fmt(expectedCents)} € — ελέγξτε τη συναλλαγή`;
}
