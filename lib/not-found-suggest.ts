import { slugify } from '@/lib/excursions';

/** Ό,τι χρειάζεται η πρόταση για να δείξει μια εκδρομή. */
export type SuggestCandidate = { slug: string; title: string };

/** Λέξεις μικρότερες από αυτό δεν λένε τίποτα («i», «to», «se»). */
const MIN_TOKEN = 3;

/** Τα ίδια ελληνικά γράφονται με λατινικά με πολλούς τρόπους, και αυτό
 *  συμβαίνει ΜΕΣΑ στα δεδομένα του site: το ένα slug λέει «DIHMERH», το άλλο
 *  «diimeri»· το «Αγίου» γίνεται «agioy» από το slugify αλλά ο κόσμος γράφει
 *  «agiou». Χωρίς εξομάλυνση, οι προτάσεις αστοχούν ακριβώς στις περιπτώσεις
 *  που τις χρειαζόμαστε. Τα «th» και «ch» προστατεύονται πρώτα, αλλιώς το
 *  h→i θα διέλυε το «thessaloniki». */
function foldGreeklish(token: string): string {
  return token
    // Κεφαλαία ως δείκτες: τα tokens είναι πάντα πεζά μετά το slugify, οπότε
    // δεν μπερδεύονται με πραγματικό περιεχόμενο (σε αντίθεση με ψηφία).
    .replace(/th/g, 'T')
    .replace(/ch/g, 'X')
    .replace(/u/g, 'y')
    .replace(/h/g, 'i')
    .replace(/w/g, 'o')
    .replace(/c/g, 'k');
}

/** Οι λέξεις μιας διεύθυνσης, σε λατινικά και χωρίς τα κοινά συνδετικά.
 *  Δέχεται ολόκληρο path («/tour/kati-allo») ή σκέτο slug. */
export function pathTokens(input: string): string[] {
  const raw = String(input ?? '');
  if (!raw.trim()) return [];
  const last = raw.split('?')[0].split('/').filter(Boolean).pop() ?? '';
  let decoded = last;
  try {
    decoded = decodeURIComponent(last);
  } catch {
    // κακοσχηματισμένο %-encoding: κρατάμε το ακατέργαστο
  }
  const seen = new Set<string>();
  for (const t of slugify(decoded).split('-')) {
    if (t.length >= MIN_TOKEN) seen.add(t);
  }
  return [...seen];
}

/** Οι λέξεις με τις οποίες μπορεί να ταυτιστεί μια εκδρομή: από το slug της και
 *  από τον (ελληνικό) τίτλο της, λατινοποιημένο ώστε να συγκρίνεται με το slug. */
function candidateTokens(c: SuggestCandidate): Set<string> {
  const out = new Set<string>();
  for (const source of [c.slug ?? '', slugify(c.title ?? '')]) {
    for (const t of String(source).split('-')) {
      if (t.length >= MIN_TOKEN) out.add(foldGreeklish(t));
    }
  }
  return out;
}

/** Ταιριάζει μια λέξη με τις λέξεις μιας εκδρομής: ίδια, ή η μία αρχή της άλλης
 *  (πιάνει «meteor» ↔ «meteora», «monoimer» ↔ «monoimeri»). */
function tokenHits(token: string, against: Set<string>): boolean {
  if (against.has(token)) return true;
  for (const t of against) {
    if (token.length >= 4 && t.startsWith(token)) return true;
    if (t.length >= 4 && token.startsWith(t)) return true;
  }
  return false;
}

/** Οι πιο πιθανές εκδρομές για μια διεύθυνση που δεν βρέθηκε.
 *
 *  Χρησιμοποιείται στη σελίδα 404: αντί για αδιέξοδο, ο επισκέπτης που ήρθε από
 *  το Google σε εκδρομή που διαγράφηκε ή μετονομάστηκε βλέπει τις σχετικές που
 *  όντως υπάρχουν. Καθαρή συνάρτηση — καμία πρόσβαση σε βάση ή δίκτυο.
 *
 *  Επιστρέφει κενό όταν δεν υπάρχει καμία κοινή λέξη· καλύτερα τίποτα παρά
 *  τυχαίες προτάσεις που μοιάζουν με σφάλμα. */
export function suggestTours<T extends SuggestCandidate>(
  wantedPath: string,
  candidates: T[],
  limit = 4
): T[] {
  const wanted = pathTokens(wantedPath);
  if (wanted.length === 0 || !Array.isArray(candidates)) return [];

  const scored: { c: T; hits: number; ratio: number }[] = [];
  for (const c of candidates) {
    if (!c?.slug) continue;
    const tokens = candidateTokens(c);
    let hits = 0;
    for (const w of wanted) if (tokenHits(foldGreeklish(w), tokens)) hits++;
    if (hits > 0) scored.push({ c, hits, ratio: hits / wanted.length });
  }

  scored.sort((a, b) => {
    if (b.hits !== a.hits) return b.hits - a.hits;
    if (b.ratio !== a.ratio) return b.ratio - a.ratio;
    // Ισοπαλία: η πιο «σφιχτή» εκδρομή πρώτη — λιγότερος θόρυβος στον τίτλο.
    return a.c.slug.length - b.c.slug.length;
  });

  return scored.slice(0, limit).map((s) => s.c);
}
