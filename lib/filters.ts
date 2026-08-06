import type { Tour } from '@/types/db';
import { normalizeGreek } from '@/lib/odigos-search';

/**
 * Κανονικοποίηση κειμένου για αναζήτηση σε λίστες admin: πεζά, χωρίς τόνους
 * (μέσω `normalizeGreek`) και με τελικό «ς» ενοποιημένο σε «σ», ώστε
 * «Ναύπλιος» να ταιριάζει με «ναυπλιοσ».
 */
export function searchNormalize(s: string): string {
  // Next hands back string[] for repeated query params (?q=a&q=b); guard so a
  // malformed URL 500s instead of just failing to match.
  return normalizeGreek(String(s ?? '')).replace(/ς/g, 'σ');
}

export type SortKey = 'popular' | 'price-asc' | 'price-desc' | 'date';

/** Φιλτράρισμα καταλόγου εκδρομών. Φίλτρο τιμής δεν υπάρχει και δεν προστίθεται:
 *  απόφαση του γραφείου να μη γίνεται η επιλογή εκδρομής αναζήτηση με τιμή. */
export function filterTours(tours: Tour[], f: { category?: string }): Tour[] {
  return tours.filter((t) => {
    if (f.category && !(t.categories ?? []).some((c) => c.slug === f.category)) return false;
    return true;
  });
}

export function sortTours(tours: Tour[], key: SortKey): Tour[] {
  const arr = [...tours];
  switch (key) {
    case 'price-asc':
      return arr.sort((a, b) => (a.price_from ?? 0) - (b.price_from ?? 0));
    case 'price-desc':
      return arr.sort((a, b) => (b.price_from ?? 0) - (a.price_from ?? 0));
    case 'date':
      return arr.sort((a, b) => {
        const da = a.next_departure;
        const db = b.next_departure;
        if (!da && !db) return 0;
        if (!da) return 1;
        if (!db) return -1;
        return da < db ? -1 : da > db ? 1 : 0;
      });
    case 'popular':
    default:
      return arr.sort((a, b) => Number(b.is_featured) - Number(a.is_featured));
  }
}
