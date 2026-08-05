# Διαχείριση εκδρομών: κλείσιμο κρατήσεων, αναζήτηση, πλήρη πεδία, διαγραφή — Implementation Plan

**Goal:** Καλύπτει τρία αιτήματα του γραφείου: (6) να κλείνει μια εκδρομή για κρατήσεις μένοντας ορατή στο site, (4) να υπάρχει αναζήτηση σε κάθε λίστα του admin, (3) να επεξεργάζεται πλήρως και να διαγράφεται μια εκδρομή.

**Architecture:** Τρία ανεξάρτητα κομμάτια πάνω στα υπάρχοντα. Το κλείσιμο είναι μία σημαία στη βάση που ο δημόσιος κώδικας ήδη ξέρει να διαβάζει από το ίδιο σημείο που αποφασίζει αν η εκδρομή είναι bookable. Η αναζήτηση γίνεται ένα κοινό component που κάθε λίστα ρενδάρει, με φιλτράρισμα στον server μέσω `?q=`. Τα πεδία και η διαγραφή είναι επέκταση της υπάρχουσας φόρμας και του υπάρχοντος action.

**Tech Stack:** Next.js 16 server components, Supabase (SQL migration + RLS ήδη σε ισχύ), vitest.

## Global Constraints

- Χωρίς νέα npm dependencies.
- Όλα τα κείμενα στα ελληνικά· Tailwind inline, μόνο theme tokens (`primary`, `cta`, `gold`, `surface`, `background`, `body`, `muted`, `border`, `olive`, `deep-ink`).
- Node δεν υπάρχει global. Πριν από κάθε npm/npx:
  `export PATH="/private/tmp/claude-501/-Users-marios-Desktop-Projects-serigiannis-main/7dd49705-4a6a-426d-837c-352b391a5f07/scratchpad/node-v22.14.0-darwin-arm64/bin:$PATH"`
- Επαλήθευση ανά task: `npm run test:run`, `npx tsc --noEmit`, `npm run lint`. Το τελευταίο και `npm run build`.
- Τα migrations **γράφονται μόνο** — τα εφαρμόζει ο controller στη ζωντανή βάση.
- Commits ως `marioskifokeris@hotmail.com`. Χωρίς push.

## Αποφάσεις

1. **Το κλείσιμο αφορά τις σελίδες εκδρομών** (`tours`), όχι τα δρομολόγια πούλμαν. Για τα δεύτερα υπάρχει ήδη «Πρόχειρη/Δημοσιευμένη», και μια «ορατή αλλά κλειστή» εκδρομή μέσα σε έναν επιλογέα κρατήσεων δεν βγάζει νόημα.
2. **Κλειστή ≠ κρυμμένη.** Η σελίδα μένει πλήρης — φωτογραφίες, πρόγραμμα, τιμές — και μόνο το κουτί κράτησης αντικαθίσταται από μήνυμα με τηλέφωνο.
3. **Η αναζήτηση φιλτράρει στον server** με `?q=`, όπως ήδη κάνουν οι Κρατήσεις. Έτσι δουλεύει και με χιλιάδες εγγραφές και μοιράζεται με link.
4. **Η διαγραφή σελίδας εκδρομής επιτρέπεται πάντα**, αλλά όταν υπάρχουν κρατήσεις το γραφείο βλέπει πόσες πριν επιβεβαιώσει. Οι κρατήσεις δεν χάνονται: το `tour_orders.tour_id` είναι `on delete set null` και το `tour_title` έχει κρατηθεί μέσα στην παραγγελία.

---

## Task 1: Η σημαία «κλειστή για κρατήσεις»

**Files:** Create `supabase/migrations/0023_bookings_open.sql`; Modify `types/db.ts`, `app/(site)/tour/[slug]/page.tsx`, `components/admin/TourForm.tsx`, `app/admin/(dashboard)/actions.ts`

- [ ] **Step 1: Το migration**

```sql
-- 0023: «κλειστή για κρατήσεις» — η εκδρομή μένει ορατή στο site αλλά δεν
-- δέχεται κρατήσεις. Ζητήθηκε από το γραφείο (feedback Αυγούστου 2026).
alter table public.tours
  add column if not exists bookings_open boolean not null default true;
```

- [ ] **Step 2: Ο τύπος** — στο `types/db.ts`, στο `Tour`, δίπλα στο `is_featured`:
  `bookings_open: boolean;`

- [ ] **Step 3: Η δημόσια σελίδα**

Στο `app/(site)/tour/[slug]/page.tsx` υπάρχει σήμερα:
`const bookable = tiers.length > 0;`
Γίνεται δύο έννοιες, γιατί είναι δύο διαφορετικά πράγματα:

```tsx
  // Έχει τιμές = μπορεί τεχνικά να πουλήσει· ανοιχτή = το γραφείο το επιτρέπει.
  const hasPricing = tiers.length > 0;
  const bookable = hasPricing && tour.bookings_open;
```

Όταν `hasPricing && !tour.bookings_open`, στη θέση του `TourBookingWidget` μπαίνει κάρτα με το ίδιο στυλ (`rounded-lg border border-border bg-surface p-6 shadow-card`):
τίτλος «Οι κρατήσεις έχουν κλείσει», κείμενο «Για αυτή την εκδρομή δεν δεχόμαστε online κρατήσεις αυτή τη στιγμή. Καλέστε μας για διαθεσιμότητα.» και, αν υπάρχει `phone`, το τηλέφωνο ως σύνδεσμος `telHref` όπως ήδη γίνεται πιο κάτω στο ίδιο αρχείο. Η κάρτα με διάρκεια/αναχωρήσεις/σημείο συνάντησης παραμένει από κάτω.

Όταν δεν υπάρχουν καθόλου τιμές, τίποτα δεν αλλάζει — μένει η σημερινή φόρμα προσφοράς.

- [ ] **Step 4: Ο διακόπτης στο admin**

Στο `components/admin/TourForm.tsx`, δίπλα στο υπάρχον checkbox «Προβεβλημένη (αρχική)»:

```tsx
        <label className="flex items-center gap-3 pt-7">
          <input type="checkbox" name="bookings_closed" defaultChecked={tour ? !tour.bookings_open : false} className="h-4 w-4 accent-cta" />
          <span className="font-sans text-[14px] text-body">Κλειστή για κρατήσεις (ορατή στο site)</span>
        </label>
```

Το πεδίο είναι σκόπιμα ανάποδο («κλειστή» αντί «ανοιχτή»): ένα κουτάκι που τσεκάρεις για να κλείσεις διαβάζεται σωστά, ένα που ξετσεκάρεις όχι.

Στο `upsertTour` (`app/admin/(dashboard)/actions.ts`) πρόσθεσε στο `payload`:
`bookings_open: formData.get('bookings_closed') !== 'on',`

- [ ] **Step 5: Επαλήθευση + commit** — `npm run test:run`, `npx tsc --noEmit`, `npm run lint`.
  Commit: `feat(admin): κλείσιμο κρατήσεων ανά εκδρομή`

---

## Task 2: Αναζήτηση σε κάθε λίστα

**Files:** Create `components/admin/AdminSearch.tsx`; Modify `app/admin/(dashboard)/posts/page.tsx`, `requests/page.tsx`, `excursions/page.tsx`, `layouts/page.tsx`, `stations/page.tsx`, `tours/page.tsx`

Σήμερα αναζήτηση έχουν μόνο οι δύο λίστες κρατήσεων. Το μοτίβο τους (`app/admin/(dashboard)/bookings/page.tsx`) είναι: `<form action="/admin/…">` με `<input name="q">`, και η σελίδα φιλτράρει το αποτέλεσμα του query.

- [ ] **Step 1: Το κοινό component**

`components/admin/AdminSearch.tsx` (server component, χωρίς `'use client'`):

```tsx
/** Αναζήτηση λίστας admin. Υποβάλλει με GET στην ίδια σελίδα, ώστε το
 *  φιλτράρισμα να γίνεται στον server και το αποτέλεσμα να μοιράζεται ως link. */
export function AdminSearch({
  action,
  placeholder,
  defaultValue,
  hidden,
}: {
  action: string;
  placeholder: string;
  defaultValue?: string;
  /** Παράμετροι που πρέπει να επιβιώσουν της αναζήτησης (π.χ. ενεργό φίλτρο). */
  hidden?: Record<string, string | undefined>;
}) {
  return (
    <form action={action} className="ml-auto">
      {Object.entries(hidden ?? {}).map(([name, value]) =>
        value ? <input key={name} type="hidden" name={name} value={value} /> : null
      )}
      <input
        name="q"
        defaultValue={defaultValue ?? ''}
        placeholder={placeholder}
        aria-label={placeholder}
        className="w-64 rounded-md border border-border bg-surface px-3 py-2 text-[14px] focus:border-primary focus:outline-none"
      />
    </form>
  );
}
```

- [ ] **Step 2: Σύνδεσε το σε κάθε λίστα**

Για καθεμιά: διάβασε `q` από τα `searchParams` (πρόσθεσέ το στον τύπο), ρεντάρισε το `AdminSearch` στη γραμμή φίλτρων (ή, αν δεν υπάρχει γραμμή, ακριβώς κάτω από τον τίτλο), και φίλτραρε τη λίστα **case-insensitive, με τα ελληνικά τονισμένα να ταιριάζουν με τα άτονα** — χρησιμοποίησε το υπάρχον `normalize` του `lib/odigos-search.ts` αν κάνει ακριβώς αυτό· αλλιώς πρόσθεσε μια μικρή καθαρή συνάρτηση `searchNormalize(s: string)` στο `lib/filters.ts` και δοκίμασέ την.

Πεδία αναζήτησης ανά λίστα:
- **Σελίδες Εκδρομών** (`tours/page.tsx` → `AdminToursTable`): τίτλος και slug. Η λίστα φιλτράρει ήδη client-side· κράτησέ το ως έχει, μόνο άλλαξε το πεδίο ώστε να δείχνει ίδιο με τα υπόλοιπα (ίδιο placeholder ύφος, ίδιο πλάτος). Μη μεταφέρεις το φιλτράρισμα στον server εδώ.
- **Νέα** (`posts`): τίτλος, slug.
- **Αιτήματα** (`requests`): όνομα, τηλέφωνο, email, θέμα. Διατήρησε το ενεργό tab μέσω `hidden`.
- **Εκδρομές & Πρόγραμμα** (`excursions`): τίτλος εκδρομής (χρησιμοποίησε το `routeLabel` που ήδη υπάρχει).
- **Λεωφορεία** (`layouts`): όνομα διάταξης.
- **Σταθμοί** (`stations`): όνομα, κωδικός.

Placeholder παντού στο ίδιο ύφος: «Αναζήτηση…» με το τι ψάχνει, π.χ. «Αναζήτηση τίτλου…».

- [ ] **Step 3: Επαλήθευση + commit** — και τα τρία gates. Commit: `feat(admin): αναζήτηση σε όλες τις λίστες`

---

## Task 3: Πλήρη πεδία εκδρομής

**Files:** Modify `components/admin/TourForm.tsx`, `app/admin/(dashboard)/actions.ts`

Η φόρμα εκθέτει 8 πεδία· ο πίνακας `tours` έχει αρκετά ακόμη που το γραφείο δεν μπορεί να αγγίξει.

- [ ] **Step 1:** Πρόσθεσε στη φόρμα, με το υπάρχον στυλ (`adminLabel` + `adminInput`, δύο στήλες όπου ταιριάζει):
  - **Υπότιτλος** (`subtitle`) — μονή γραμμή.
  - **Σημείο συνάντησης** (`meeting_point`) — μονή γραμμή, placeholder «π.χ. Πλατεία Συντάγματος, 07:00».
  - **Προηγούμενη τιμή (€)** (`price_original`) — δίπλα στο «Τιμή από», με βοηθητικό κείμενο ότι εμφανίζεται διαγραμμένη.
  - **Σειρά εμφάνισης** (`sort_order`) — αριθμός, με βοηθητικό «μικρότερος αριθμός = πιο ψηλά».
  - **SEO τίτλος** (`seo_title`) και **SEO περιγραφή** (`seo_description`) — σε δικό τους πλαίσιο με επικεφαλίδα «SEO», ώστε να μην τρομάζει· βοηθητικό κείμενο ότι αν μείνουν κενά χρησιμοποιούνται ο τίτλος και η σύνοψη.

- [ ] **Step 2:** Στο `upsertTour`, πέρασε τα νέα πεδία στο `payload` με την ίδια λογική «κενό → null» που ήδη χρησιμοποιείται. Το `price_original` και το `sort_order` είναι αριθμοί: κενό → `null` / `0` αντίστοιχα. Πρόσεξε ότι το `price_original` μπορεί να γραφτεί «200» ή «200,00» — χρησιμοποίησε το υπάρχον `parseEuroToCents` ΜΟΝΟ αν αποθηκεύεις cents· η στήλη `price_original` είναι `numeric(10,2)` σε ευρώ, οπότε κάνε απλή μετατροπή με υποστήριξη κόμματος.

- [ ] **Step 3: Επαλήθευση + commit** — `feat(admin): πλήρη πεδία στη φόρμα εκδρομής`

---

## Task 4: Διαγραφή που τελειώνει

**Files:** Modify `app/admin/(dashboard)/actions.ts`, `components/admin/AdminToursTable.tsx`, `app/admin/(dashboard)/tours/[id]/edit/page.tsx`

Σήμερα η διαγραφή υπάρχει μόνο στη λίστα, με σκέτο `confirm()`, και δεν λέει τι παρασύρει.

- [ ] **Step 1:** Στη σελίδα επεξεργασίας, στο κάτω μέρος, πρόσθεσε «Επικίνδυνη ζώνη» — πλαίσιο με `border-cta/30` που περιέχει:
  - πόσες κρατήσεις έχει η εκδρομή (`tour_orders` με αυτό το `tour_id`), αν έχει·
  - κουμπί «Διαγραφή εκδρομής» μέσα σε `ConfirmForm`, με μήνυμα που αναφέρει το πλήθος κρατήσεων όταν υπάρχουν: «Η εκδρομή έχει N κρατήσεις. Θα διαγραφεί από το site· οι κρατήσεις παραμένουν στο αρχείο. Συνέχεια;»·
  - δίπλα του, κουμπί «Απόσυρση από το site» που απλώς θέτει `status = 'draft'`, ως ασφαλέστερη εναλλακτική (υπάρχει ήδη το action `setStatus`).

- [ ] **Step 2:** Το `deleteTour` να καθαρίζει και τα αρχεία εικόνων από το storage πριν σβήσει τη γραμμή (τα `tour_images` φεύγουν με cascade, τα αρχεία στο bucket όχι — σήμερα μένουν ορφανά για πάντα). Χρησιμοποίησε το ίδιο μοτίβο με το `deleteTourImage`: μάζεψε τα `storage_path` της εκδρομής και κάλεσε `remove()` μία φορά με όλα.

- [ ] **Step 3:** Μετά τη διαγραφή, revalidate και τη σελίδα της εκδρομής (`/tour/<slug>`) εκτός από τα υπάρχοντα, ώστε να μη μείνει στη cache — το γραφείο παραπονέθηκε ότι «μένει μέσα στο site».

- [ ] **Step 4: Επαλήθευση + commit** — και τα τέσσερα gates. Commit: `feat(admin): πλήρης διαγραφή εκδρομής με καθαρισμό αρχείων`

---

## Χειροκίνητος έλεγχος (controller)

1. Κλείσιμο κρατήσεων σε εκδρομή με τιμές → η σελίδα δείχνει το μήνυμα, όχι το κουτί κράτησης.
2. Αναζήτηση σε κάθε λίστα με ελληνικά, τονισμένα και άτονα.
3. Διαγραφή εκδρομής με φωτογραφίες → φεύγει από το site, δεν μένουν αρχεία στο bucket.
