# Ευκολότερο στήσιμο εκδρομής — Implementation Plan

**Goal:** Το αίτημα #2 του γραφείου: «όταν θέλουμε να φτιάξουμε μια εκδρομή να είναι πιο εύκολη στο στήσιμο, με τα κείμενα, τις φωτογραφίες, τις επιλογές, τα πόσα άτομα κλείνουν, με πλήρη στοιχεία των ατόμων, τα σημεία συνάντησης».

**Architecture:** Τρία κομμάτια που στέκονται μόνα τους. (α) Μια λίστα ελέγχου στην κορυφή της επεξεργασίας εκδρομής, που λέει τι λείπει για να πουλήσει — καθαρή συνάρτηση, άρα δοκιμάσιμη. (β) Στοιχεία κάθε επιβάτη στην κράτηση εκδρομής, όπως ήδη γίνεται στα εισιτήρια. (γ) Σημεία συνάντησης ως επιλογή του πελάτη αντί για ελεύθερο κείμενο.

**Tech Stack:** Next.js 16, React 19, Supabase (migration + RPC), vitest.

## Global Constraints

- Χωρίς νέα npm dependencies. Όλα τα κείμενα στα ελληνικά. Tailwind inline, theme tokens μόνο.
- Node: `export PATH="/private/tmp/claude-501/-Users-marios-Desktop-Projects-serigiannis-main/7dd49705-4a6a-426d-837c-352b391a5f07/scratchpad/node-v22.14.0-darwin-arm64/bin:$PATH"`
- Gates: `npm run test:run`, `npx tsc --noEmit`, `npm run lint`· το τελευταίο task και `npm run build`.
- Τα migrations **γράφονται μόνο** — τα εφαρμόζει ο controller.
- **Ζωντανό site**: 252 δημοσιευμένες εκδρομές, 4 πραγματικές κρατήσεις. Καμία αλλαγή δεν επιτρέπεται να σπάσει υπάρχουσα κράτηση ή να αλλάξει τιμή.
- Commits ως `marioskifokeris@hotmail.com`. Χωρίς push.

## Τι ΔΕΝ κάνει αυτό το πλάνο, και γιατί

Το feedback αναφέρει «θέσεις, πούλμαν». Υπάρχουν σήμερα δύο υποσυστήματα: οι **σελίδες εκδρομών** (κείμενα, φωτογραφίες, κατηγορίες τιμών, ημερομηνίες, όριο ατόμων) και οι **bookable εκδρομές με πούλμαν** (κάτοψη θέσεων, δρομολόγια, εισιτήρια). Η ένωσή τους σε ένα μοντέλο είναι εβδομάδες δουλειάς και ρίσκο πάνω σε ζωντανές κρατήσεις.

Η πρόταση: **μένουν χωριστά**. Οι πολυήμερες/προσκυνηματικές εκδρομές πουλιούνται με κατηγορίες τιμών και όριο ατόμων — δεν χρειάζονται αριθμημένη θέση. Τα δρομολόγια με πούλμαν συνεχίζουν με κάτοψη. Αν το γραφείο θέλει συγκεκριμένη θέση και στις εκδρομές, γίνεται ξεχωριστή συζήτηση: είναι διαφορετικό προϊόν, όχι λειτουργία που λείπει.

---

## Task 1: Λίστα ελέγχου «τι λείπει για να πουλήσει»

**Files:** Create `lib/tour-setup.ts`, `tests/tour-setup.test.ts`, `components/admin/TourSetupChecklist.tsx`; Modify `app/admin/(dashboard)/tours/[id]/edit/page.tsx`

Σήμερα ο υπάλληλος δεν βλέπει πουθενά γιατί μια εκδρομή δεν δέχεται κρατήσεις — πρέπει να θυμάται ότι χρειάζεται τιμές, ημερομηνίες και δημοσίευση.

- [ ] **Step 1: Τα tests** — `tests/tour-setup.test.ts`:

```ts
import { describe, it, expect } from 'vitest';
import { setupChecklist } from '@/lib/tour-setup';

const base = {
  status: 'draft' as const,
  bookings_open: true,
  summary: null as string | null,
  imageCount: 0,
  tierCount: 0,
  futureDepartureCount: 0,
};

describe('setupChecklist', () => {
  it('σημειώνει ως ολοκληρωμένα μόνο όσα υπάρχουν', () => {
    const items = setupChecklist({ ...base, summary: 'Κείμενο', imageCount: 3 });
    const byId = Object.fromEntries(items.map((i) => [i.id, i.done]));
    expect(byId.summary).toBe(true);
    expect(byId.photos).toBe(true);
    expect(byId.pricing).toBe(false);
    expect(byId.departures).toBe(false);
    expect(byId.published).toBe(false);
  });

  it('όλα ολοκληρωμένα σε πλήρη εκδρομή', () => {
    const items = setupChecklist({
      status: 'published', bookings_open: true, summary: 'Κείμενο',
      imageCount: 5, tierCount: 2, futureDepartureCount: 1,
    });
    expect(items.every((i) => i.done)).toBe(true);
  });

  it('η κλειστή για κρατήσεις εμφανίζεται ως προειδοποίηση, όχι ως ελλιπής', () => {
    const items = setupChecklist({
      status: 'published', bookings_open: false, summary: 'Κείμενο',
      imageCount: 5, tierCount: 2, futureDepartureCount: 1,
    });
    expect(items.every((i) => i.done)).toBe(true);
    expect(items.some((i) => i.warning)).toBe(true);
  });

  it('χωρίς ημερομηνίες λέει ότι δέχεται κράτηση χωρίς επιλογή ημέρας', () => {
    const items = setupChecklist({ ...base, tierCount: 1, status: 'published', summary: 'x', imageCount: 1 });
    const dep = items.find((i) => i.id === 'departures');
    expect(dep?.done).toBe(false);
    expect(dep?.hint).toMatch(/χωρίς/);
  });
});
```

- [ ] **Step 2: Τρέξε, πρέπει να αποτύχει.**

- [ ] **Step 3: Η υλοποίηση** — `lib/tour-setup.ts`. Καθαρή συνάρτηση που επιστρέφει πέντε βήματα με σταθερά `id`: `summary`, `photos`, `pricing`, `departures`, `published`. Κάθε βήμα: `{ id, label, done, hint?, warning? }`, όλα στα ελληνικά:
  - `summary` — «Περιγραφή», done όταν υπάρχει μη κενή σύνοψη.
  - `photos` — «Φωτογραφίες», done με ≥1· hint όταν 0: «Χωρίς φωτογραφίες η εκδρομή δείχνει άδεια στο site.»
  - `pricing` — «Κατηγορίες τιμών», done με ≥1· hint όταν 0: «Χωρίς τιμές, η σελίδα δείχνει φόρμα αιτήματος αντί για κράτηση.»
  - `departures` — «Ημερομηνίες αναχώρησης», done με ≥1 μελλοντική· hint όταν 0: «Ο πελάτης θα κάνει κράτηση χωρίς να διαλέξει ημερομηνία.»
  - `published` — «Δημοσιευμένη», done όταν `status === 'published'`· `warning: true` όταν είναι δημοσιευμένη αλλά `bookings_open === false`, με κείμενο ότι είναι ορατή αλλά κλειστή για κρατήσεις.

- [ ] **Step 4: Το component** — `TourSetupChecklist.tsx` (server component): κάρτα με τίτλο «Τι χρειάζεται η εκδρομή», τα πέντε βήματα με ✓ (olive) ή ○ (muted), το `hint` από κάτω σε μικρότερο γκρι, και το `warning` με τόνο `gold`. Από πάνω μια γραμμή «X από 5 έτοιμα».

- [ ] **Step 5: Στη σελίδα επεξεργασίας** — ακριβώς κάτω από τον τίτλο, πριν τη `TourForm`. Τα δεδομένα υπάρχουν ήδη στη σελίδα (`images`, `booking.tiers`, `booking.departures`, `row`)· οι μελλοντικές ημερομηνίες μετριούνται με το υπάρχον `athensToday()`.

- [ ] **Step 6: Gates + commit** — `feat(admin): λίστα ελέγχου στησίματος εκδρομής`

---

## Task 2: Στοιχεία κάθε επιβάτη στην κράτηση

**Files:** Create `supabase/migrations/0024_tour_order_passengers.sql`; Modify `types/db.ts`, `components/booking/TourCheckoutForm.tsx`, `app/(site)/kratisi/actions.ts`, `lib/tour-notify.ts`, `app/admin/(dashboard)/bookings/[id]/page.tsx`

Σήμερα η κράτηση εκδρομής κρατά μόνο τον υπεύθυνο. Το γραφείο χρειάζεται ονόματα για λίστα επιβατών.

- [ ] **Step 1: Το migration**

```sql
-- 0024: στοιχεία επιβατών ανά κράτηση εκδρομής. Το γραφείο χρειάζεται
-- ονομαστική λίστα· ο υπεύθυνος κράτησης μένει στα υπάρχοντα πεδία.
alter table public.tour_orders
  add column if not exists passengers jsonb not null default '[]'::jsonb;
```

- [ ] **Step 2: Ο τύπος** — στο `types/db.ts`: `export type TourPassenger = { name: string; phone: string | null };` και `passengers: TourPassenger[];` στο `TourOrder`.

- [ ] **Step 3: Η φόρμα** — στο `TourCheckoutForm`, κάτω από τα στοιχεία επικοινωνίας, ενότητα «Στοιχεία ταξιδιωτών» με ένα ζεύγος πεδίων (ονοματεπώνυμο υποχρεωτικό, τηλέφωνο προαιρετικό) **ανά άτομο**, με επικεφαλίδα ανά άτομο που δείχνει την κατηγορία από τα `order.items` (π.χ. «Ενήλικας 1», «Ενήλικας 2», «Παιδί 1»). Το πλήθος βγαίνει από το `order.party_size`. Ο πρώτος ταξιδιώτης προ-συμπληρώνεται με το όνομα του υπεύθυνου καθώς το πληκτρολογεί — με κουμπάκι «Ίδιος με τον υπεύθυνο κράτησης» αντί για αυτόματο συγχρονισμό που δεν μπορεί να ακυρωθεί.
  Επέκτεινε το υπάρχον zod schema ώστε να απαιτεί ονοματεπώνυμο ≥2 χαρακτήρων για κάθε ταξιδιώτη.

- [ ] **Step 4: Το action** — το `submitTourCheckout` περνά τους ταξιδιώτες στο `finalize_tour_order` ως μέρος του `p_customer`. Η SQL συνάρτηση πρέπει να τους αποθηκεύσει στη νέα στήλη **αφού τους καθαρίσει**: κράτα μόνο `name` και `phone`, κόψε στα 40 άτομα, αγνόησε ό,τι δεν είναι πίνακας. Γράψε νέα έκδοση της `finalize_tour_order` στο ίδιο migration αρχείο — η υπάρχουσα αλλάζει με `create or replace`, κρατώντας ΟΛΗ την υπόλοιπη λογική της αυτούσια (έλεγχοι κατάστασης, λήξης, στοιχείων, όρων, provider). Πρόσεξε: η συνάρτηση καλείται και από παλιό κώδικα κατά το deploy, οπότε απουσία `passengers` πρέπει να δίνει `'[]'`.

- [ ] **Step 5: Ορατά στο γραφείο** — στο `/admin/bookings/[id]`, λίστα ταξιδιωτών με όνομα και τηλέφωνο. Στο email του γραφείου (`lib/tour-notify.ts`), τα ίδια ονόματα κάτω από την ανάλυση.

- [ ] **Step 6: Gates + commit** — `feat(booking): στοιχεία ταξιδιωτών στην κράτηση εκδρομής`

---

## Task 3: Σημείο συνάντησης ως επιλογή

**Files:** Modify `supabase/migrations/0024_tour_order_passengers.sql` (ίδιο αρχείο), `types/db.ts`, `components/admin/TourForm.tsx`, `app/admin/(dashboard)/actions.ts`, `components/booking/TourBookingWidget.tsx` ή `TourCheckoutForm.tsx`, `lib/tour-notify.ts`

Το `tours.meeting_point` είναι ελεύθερο κείμενο που ο πελάτης απλώς διαβάζει. Οι bookable εκδρομές έχουν ήδη `boarding_points text[]` με επιλογή στην κράτηση — φέρνουμε το ίδιο εδώ.

- [ ] **Step 1:** Στο ίδιο migration: `alter table public.tours add column if not exists meeting_points text[] not null default '{}';` και `alter table public.tour_orders add column if not exists meeting_point text;`
- [ ] **Step 2:** Στο `TourForm`, textarea «Σημεία συνάντησης (ένα ανά γραμμή)» δίπλα στο υπάρχον ελεύθερο `meeting_point`, με βοηθητικό κείμενο ότι αν συμπληρωθούν, ο πελάτης διαλέγει ένα κατά την κράτηση. Στο `upsertTour`, μετέτρεψε τις γραμμές σε πίνακα με το υπάρχον `parseBoardingPoints` του `lib/excursions.ts` — μην ξαναγράψεις τη λογική.
- [ ] **Step 3:** Στο checkout, όταν η εκδρομή έχει σημεία, υποχρεωτικό `select` «Σημείο συνάντησης». Πέρασέ το στο `finalize_tour_order` και αποθήκευσέ το, με τον ίδιο έλεγχο που κάνει το ticketing: **το σημείο πρέπει να ανήκει στη λίστα της εκδρομής**, αλλιώς `invalid_meeting_point`.
- [ ] **Step 4:** Εμφάνισέ το στη σελίδα επιβεβαίωσης, στο admin και στα δύο emails.
- [ ] **Step 5: Gates + build + commit** — `feat(booking): επιλογή σημείου συνάντησης στις εκδρομές`

---

## Χειροκίνητος έλεγχος (controller)

1. Νέα εκδρομή: η λίστα ελέγχου δείχνει 0/5 και συμπληρώνεται καθώς προστίθενται κείμενο, φωτογραφίες, τιμές, ημερομηνίες, δημοσίευση.
2. Κράτηση 3 ατόμων: ζητούνται 3 ονόματα, φαίνονται σε admin και email.
3. Εκδρομή με σημεία συνάντησης: υποχρεωτική επιλογή, σωστή εμφάνιση παντού.
4. Υπάρχουσα κράτηση από πριν το migration: ανοίγει κανονικά με άδεια λίστα ταξιδιωτών.
