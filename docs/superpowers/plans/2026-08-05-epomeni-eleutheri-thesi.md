# Επόμενη ελεύθερη θέση στις τηλεφωνικές κρατήσεις — Implementation Plan

**Goal:** Ο υπάλληλος δεν πληκτρολογεί ποτέ αριθμό θέσης. Η φόρμα προτείνει την πρώτη ελεύθερη, μετά από κάθε κράτηση προχωράει μόνη της στην επόμενη (11 → 12), και το πάτημα θέσης στην κάτοψη τη συμπληρώνει.

**Architecture:** Η επιλογή θέσης γίνεται κοινή κατάσταση: ένα client wrapper (`TripSeatPanel`) κρατά ποια θέση είναι επιλεγμένη και τη μοιράζεται στην κάτοψη και στη φόρμα κράτησης, που γίνεται client component. Ποιά είναι «η επόμενη ελεύθερη» το αποφασίζει καθαρή συνάρτηση στο `lib/ticketing.ts`, ώστε να δοκιμάζεται χωρίς DOM. Ο server, μετά από επιτυχή κράτηση, γυρίζει πίσω με `?after=<θέση>` ώστε η φόρμα να ανοίγει ήδη στην επόμενη.

**Tech Stack:** Next.js 16 server component σελίδα, React 19 client components, Supabase RPC (`begin_booking` / `finalize_checkout`, αμετάβλητα), vitest.

## Global Constraints

- Χωρίς νέα npm dependencies.
- Όλα τα κείμενα στα ελληνικά· Tailwind inline, μόνο theme tokens.
- **Καμία αλλαγή στη λογική κρατήσεων**: το `manualBooking` συνεχίζει να περνά από `begin_booking` + `finalize_checkout` με `p_provider: 'offline'`. Αλλάζει μόνο το πού γυρίζει μετά.
- Node δεν υπάρχει global. Πριν από κάθε npm/npx:
  `export PATH="/private/tmp/claude-501/-Users-marios-Desktop-Projects-serigiannis-main/7dd49705-4a6a-426d-837c-352b391a5f07/scratchpad/node-v22.14.0-darwin-arm64/bin:$PATH"`
- Επαλήθευση: `npm run test:run`, `npx tsc --noEmit`, `npm run lint`· το τελευταίο task και `npm run build`.
- Commits ως `marioskifokeris@hotmail.com`. Χωρίς push.

## Αποφάσεις

1. **Φυσική σειρά θέσεων:** «2» πριν από «10», και θέσεις με γράμμα («12A») αμέσως μετά τη «12». Η αλφαβητική σειρά θα έβαζε το «10» πριν το «2».
2. **Μετά την κράτηση της 11 προτείνεται η επόμενη ελεύθερη *μετά* την 11**, όχι η πρώτη ελεύθερη του λεωφορείου — αλλιώς ο υπάλληλος που γεμίζει μια οικογένεια θα πεταγόταν πίσω σε ένα κενό στη σειρά 3. Αν δεν υπάρχει άλλη μετά, γυρνά στην πρώτη ελεύθερη.
3. **Πιασμένες θεωρούνται** οι κρατημένες, οι κλειδωμένες και οι ενεργές δεσμεύσεις (hold που δεν έχει λήξει) — ό,τι ακριβώς δείχνει και η κάτοψη.
4. **Το πεδίο παραμένει επεξεργάσιμο.** Προτείνουμε, δεν επιβάλλουμε: το γραφείο πρέπει να μπορεί να βάλει θέση που ζήτησε ο πελάτης.

---

## Task 1: Ποια είναι η επόμενη ελεύθερη θέση

**Files:** Modify `lib/ticketing.ts`; Test `tests/ticketing.test.ts` (υπάρχον αρχείο, προσθήκη)

**Produces:** `sortSeatsNatural(seats: string[]): string[]` και
`nextFreeSeat(allSeats: string[], taken: string[], after?: string | null): string | null` — τα καταναλώνει το Task 2.

- [ ] **Step 1: Τα failing tests** — πρόσθεσε στο τέλος του `tests/ticketing.test.ts`:

```ts
describe('sortSeatsNatural', () => {
  it('βάζει το 2 πριν από το 10', () => {
    expect(sortSeatsNatural(['10', '2', '1'])).toEqual(['1', '2', '10']);
  });

  it('βάζει το 12A αμέσως μετά το 12', () => {
    expect(sortSeatsNatural(['12A', '13', '12'])).toEqual(['12', '12A', '13']);
  });

  it('δεν πειράζει την είσοδο', () => {
    const input = ['3', '1'];
    sortSeatsNatural(input);
    expect(input).toEqual(['3', '1']);
  });
});

describe('nextFreeSeat', () => {
  const all = ['1', '2', '3', '4', '5'];

  it('χωρίς σημείο εκκίνησης δίνει την πρώτη ελεύθερη', () => {
    expect(nextFreeSeat(all, ['1', '2'])).toBe('3');
  });

  it('μετά από θέση δίνει την επόμενη ελεύθερη προς τα εμπρός', () => {
    expect(nextFreeSeat(all, ['1', '3'], '3')).toBe('4');
  });

  it('προσπερνά τις πιασμένες προς τα εμπρός', () => {
    expect(nextFreeSeat(all, ['2', '3', '4'], '1')).toBe('5');
  });

  it('γυρνά στην αρχή όταν δεν υπάρχει άλλη μετά', () => {
    expect(nextFreeSeat(all, ['4', '5'], '4')).toBe('1');
  });

  it('δίνει null όταν είναι όλες πιασμένες', () => {
    expect(nextFreeSeat(all, all, '2')).toBeNull();
  });

  it('αγνοεί άγνωστο σημείο εκκίνησης και ξεκινά από την αρχή', () => {
    expect(nextFreeSeat(all, ['1'], '99')).toBe('2');
  });

  it('δουλεύει με άδεια λίστα θέσεων', () => {
    expect(nextFreeSeat([], [])).toBeNull();
  });
});
```

Πρόσθεσε τα `sortSeatsNatural, nextFreeSeat` στο υπάρχον import του αρχείου από `@/lib/ticketing`.

- [ ] **Step 2: Τρέξε, πρέπει να αποτύχει** — `npx vitest run tests/ticketing.test.ts` → δεν υπάρχουν οι εξαγωγές.

- [ ] **Step 3: Η υλοποίηση** — στο `lib/ticketing.ts`:

```ts
/** Φυσική σειρά θέσεων: «2» πριν από «10», «12A» αμέσως μετά τη «12». */
export function sortSeatsNatural(seats: string[]): string[] {
  const parse = (s: string) => {
    const m = s.match(/^(\d+)(.*)$/);
    return m ? { num: Number(m[1]), rest: m[2] } : { num: Number.MAX_SAFE_INTEGER, rest: s };
  };
  return [...seats].sort((a, b) => {
    const pa = parse(a);
    const pb = parse(b);
    return pa.num - pb.num || pa.rest.localeCompare(pb.rest, 'el');
  });
}

/** Η θέση που θα προτείνει η φόρμα τηλεφωνικής κράτησης: η πρώτη ελεύθερη
 *  μετά την `after` (ώστε ο υπάλληλος να προχωράει 11 → 12), αλλιώς η πρώτη
 *  ελεύθερη του οχήματος. `null` όταν δεν έχει μείνει καμία. */
export function nextFreeSeat(allSeats: string[], taken: string[], after?: string | null): string | null {
  const ordered = sortSeatsNatural(allSeats);
  const busy = new Set(taken);
  const free = ordered.filter((s) => !busy.has(s));
  if (free.length === 0) return null;
  if (after) {
    const index = ordered.indexOf(after);
    if (index >= 0) {
      const ahead = ordered.slice(index + 1).find((s) => !busy.has(s));
      if (ahead) return ahead;
    }
  }
  return free[0];
}
```

- [ ] **Step 4: Πράσινο** — `npx vitest run tests/ticketing.test.ts`, μετά `npx tsc --noEmit` και `npm run lint`.
- [ ] **Step 5: Commit** — `feat(admin): υπολογισμός επόμενης ελεύθερης θέσης`

---

## Task 2: Κοινή επιλογή θέσης σε κάτοψη και φόρμα

**Files:** Create `components/admin/TripSeatPanel.tsx`, `components/admin/ManualBookingForm.tsx`; Modify `components/admin/AdminSeatMap.tsx`, `app/admin/(dashboard)/trips/[id]/page.tsx`

Σήμερα η σελίδα δρομολογίου (`app/admin/(dashboard)/trips/[id]/page.tsx:79-105`) έχει server-rendered `<form action={manualBooking}>` με ελεύθερο πεδίο «Θέση». Η κάτοψη (`AdminSeatMap`) κρατά δική της `selected` κατάσταση για κλείδωμα/ξεκλείδωμα. Οι δύο δεν επικοινωνούν.

- [ ] **Step 1: Ανέβασε την επιλογή ένα επίπεδο**

Στο `AdminSeatMap`, αντικατέστησε την εσωτερική `selected` κατάσταση με **προαιρετικά props**: `selected: string | null` και `onSelect: (seat: string | null) => void`. Ό,τι άλλο κάνει (χρώματα, block/unblock, λεζάντα) μένει ακριβώς όπως είναι. Αν το component χρησιμοποιείται αλλού χωρίς αυτά τα props, κράτησε εσωτερικό fallback state — έλεγξε με grep πριν αποφασίσεις.

- [ ] **Step 2: Η φόρμα ως client component**

`components/admin/ManualBookingForm.tsx`: ίδια πεδία και ίδιο markup με τη σημερινή φόρμα της σελίδας (Θέση, Ναύλος, Ονοματεπώνυμο, Τηλέφωνο, Email, κουμπί «Κράτηση θέσης», η υπάρχουσα βοηθητική πρόταση από κάτω), με τρεις διαφορές:
- είναι `'use client'` και δέχεται `{ tripId, fares, seat, onSeatChange, seatsLeft }`·
- το πεδίο «Θέση» είναι ελεγχόμενο από το `seat` και γράφει πίσω με `onSeatChange` — παραμένει πλήρως επεξεργάσιμο·
- κάτω από το πεδίο, μια διακριτική ένδειξη «Πρόταση: επόμενη ελεύθερη» όταν η τιμή είναι αυτή που πρότεινε το σύστημα, και «Δεν υπάρχουν ελεύθερες θέσεις» όταν `seatsLeft === 0` (με το κουμπί απενεργοποιημένο).

Το `action={manualBooking}` μένει ως έχει — server action σε client component είναι μια χαρά.

- [ ] **Step 3: Το wrapper**

`components/admin/TripSeatPanel.tsx` (`'use client'`): κρατά `const [seat, setSeat] = useState(initialSeat ?? '')`, ρενδάρει `<AdminSeatMap … selected={seat || null} onSelect={(s) => setSeat(s ?? '')} />` και από κάτω `<ManualBookingForm … seat={seat} onSeatChange={setSeat} />`, στο ίδιο grid που έχει σήμερα η σελίδα. Δέχεται props: `tripId`, `layout`, `claims`, `fares`, `initialSeat`, `seatsLeft`.

- [ ] **Step 4: Η σελίδα**

Στη `app/admin/(dashboard)/trips/[id]/page.tsx`:
- διάβασε το `after` από τα `searchParams` (πρόσθεσέ το στον τύπο)·
- υπολόγισε τις πιασμένες θέσεις από τα `claims` — κρατημένες, κλειδωμένες και μη ληγμένα holds — και όλες τις θέσεις με το υπάρχον `layoutAllSeats(layout.layout)`·
- `const suggested = nextFreeSeat(allSeats, takenSeats, sp.after ?? null);`
- αντικατέστησε τα δύο σημερινά μπλοκ (κάτοψη και φόρμα) με ένα `<TripSeatPanel … initialSeat={suggested ?? ''} seatsLeft={allSeats.length - takenSeats.length} />`. Η φόρμα «Ρυθμίσεις δρομολογίου» μένει ακριβώς όπου είναι.

- [ ] **Step 5: Επαλήθευση** — `npm run test:run`, `npx tsc --noEmit`, `npm run lint`, `npm run build`.
- [ ] **Step 6: Commit** — `feat(admin): κοινή επιλογή θέσης σε κάτοψη και τηλεφωνική κράτηση`

---

## Task 3: Μετά την κράτηση, η επόμενη

**Files:** Modify `app/admin/(dashboard)/ticketing-actions.ts`

Σήμερα το `manualBooking` κάνει `redirect` πίσω στη σελίδα του δρομολογίου χωρίς να πει ποια θέση μόλις κρατήθηκε, οπότε η φόρμα ξαναρχίζει από την πρώτη ελεύθερη.

- [ ] **Step 1:** Στο τέλος του `manualBooking`, στο μονοπάτι επιτυχίας, πρόσθεσε το `after=<seat>` στο redirect ώστε η σελίδα να προτείνει την επόμενη ελεύθερη μετά από αυτή που μόλις κρατήθηκε. Κράτησε το υπάρχον flash μήνυμα επιτυχίας.
- [ ] **Step 2:** Στο μονοπάτι αποτυχίας «η θέση πιάστηκε» (`seat_taken`), πρόσθεσε επίσης `after=<seat>` — έτσι η φόρμα προτείνει αμέσως την επόμενη ελεύθερη αντί να αφήνει τον υπάλληλο να ψάχνει.
- [ ] **Step 3: Επαλήθευση** — `npm run test:run`, `npx tsc --noEmit`, `npm run lint`.
- [ ] **Step 4: Commit** — `feat(admin): η φόρμα προχωράει στην επόμενη ελεύθερη θέση`

---

## Χειροκίνητος έλεγχος (controller)

1. Άνοιγμα σελίδας δρομολογίου: το πεδίο «Θέση» έχει ήδη την πρώτη ελεύθερη.
2. Κράτηση → η σελίδα επιστρέφει με την επόμενη ελεύθερη συμπληρωμένη.
3. Πάτημα ελεύθερης θέσης στην κάτοψη → μπαίνει στο πεδίο.
4. Γεμάτο λεωφορείο → μήνυμα «Δεν υπάρχουν ελεύθερες θέσεις», κουμπί ανενεργό.
