# Σύνδεση σελίδας εκδρομής με εκδρομή πούλμαν — Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Μια σελίδα εκδρομής (`tours`) μπορεί να δείχνει σε μια bookable εκδρομή με πούλμαν (`bus_routes`), ώστε ο επισκέπτης να πηγαίνει με ένα κλικ στον οδηγό κρατήσεων με την εκδρομή ήδη επιλεγμένη — και ο υπάλληλος να βλέπει από κάθε πλευρά ποια εγγραφή είναι δεμένη με ποια.

**Architecture:** Ακριβώς το σχήμα που ήδη δουλεύει στα Νέα (`posts.route_id`, migration 0019): μία προαιρετική στήλη FK, ένας επιλογέας στο admin, ένα deep link `/eisitiria?ekdromi=<id>`. Καμία αντιγραφή τιμών, ημερομηνιών ή θέσεων — τα δύο υποσυστήματα μένουν χωριστά, απλώς παύουν να αγνοούν το ένα το άλλο. Η απόφαση «τι κουμπί δείχνει η σελίδα» ζει σε μία καθαρή συνάρτηση (`tourRouteCta`) ώστε να δοκιμάζεται χωρίς DOM και χωρίς βάση.

**Tech Stack:** Next.js 16 App Router (server components), React 19, Supabase (SQL migration), Tailwind 3, vitest + @testing-library/react.

## Global Constraints

- **Χωρίς νέα npm dependencies.**
- **Όλα τα κείμενα στα ελληνικά**, στο ύφος των υπαρχόντων («Κλείστε Online Θέση», «— Χωρίς σύνδεση —»).
- **Tailwind inline classes**, μόνο theme tokens: `primary`, `cta`, `gold`, `surface`, `background`, `body`, `muted`, `border`, `olive`, `deep-ink`.
- **Εικόνες μόνο μέσω `next/image`** (δεν προστίθενται εικόνες εδώ, αλλά ο κανόνας ισχύει).
- **Τα migrations γράφονται μόνο** — τα εφαρμόζει ο controller στη ζωντανή βάση. Κανένα task δεν προϋποθέτει ότι η στήλη υπάρχει ήδη στην παραγωγή· ο κώδικας πρέπει να αντέχει `route_id === undefined` σε παλιές σειρές (γι' αυτό κάθε έλεγχος γίνεται με truthiness, ποτέ με `!== null`).
- **Ζωντανό site:** 252 δημοσιευμένες εκδρομές, πραγματικές κρατήσεις. Καμία αλλαγή δεν αλλάζει τιμή, δεν σπάει υπάρχουσα κράτηση και δεν αφαιρεί υπάρχοντα τρόπο πώλησης.
- **Node:** `node -v` → v24 (fnm, ήδη στο PATH αυτού του shell). Αν λείπει, βάλε στο PATH το portable Node που αναφέρουν τα προηγούμενα πλάνα πριν από κάθε npm/npx.
- **Gates ανά task:** `npm run test:run`, `npx tsc --noEmit`, `npm run lint`. Το τελευταίο task τρέχει επιπλέον `npm run build`.
- **Commits ως `marioskifokeris@hotmail.com`** (ήδη ρυθμισμένο). **Χωρίς push.**

## Αποφάσεις

1. **Deep link, όχι ενοποίηση.** Η σύνδεση δεν αντιγράφει τιμές, ημερομηνίες ή θέσεις από το `bus_routes` στη `tours`. Είναι ένας δείκτης: «η κράτηση για αυτή την εκδρομή γίνεται εκεί». Η ενοποίηση των δύο μοντέλων παραμένει εκτός σκοπού (βλ. `2026-08-05-stisimo-ekdromis.md`, ενότητα «Τι ΔΕΝ κάνει αυτό το πλάνο»).
2. **Η CTA εμφανίζεται μόνο για δημοσιευμένο δρομολόγιο.** Ο οδηγός κρατήσεων δείχνει μόνο published routes· deep link σε πρόχειρο θα προσγείωνε τον επισκέπτη σε λίστα χωρίς προεπιλογή. Άρα ο δημόσιος κώδικας επιβεβαιώνει την κατάσταση πριν δείξει κουμπί.
3. **Η σύνδεση δεν αντικαθιστά υπάρχοντα τρόπο πώλησης.**
   - Εκδρομή **χωρίς** ενεργές κατηγορίες τιμών (σήμερα δείχνει μόνο φόρμα αιτήματος): το κουμπί «Κλείστε Online Θέση» γίνεται το **κύριο** κουμπί, και η φόρμα αιτήματος μένει από κάτω ως δεύτερη επιλογή.
   - Εκδρομή **με** ενεργές κατηγορίες τιμών: το κουτί κράτησης μένει ως έχει και η σύνδεση μπαίνει ως **δευτερεύων** σύνδεσμος από κάτω.
   - Εκδρομή **κλειστή για κρατήσεις** (`bookings_open = false`): **καμία** CTA. Το «κλειστή» υπερισχύει — αλλιώς η σελίδα θα έλεγε ταυτόχρονα «οι κρατήσεις έχουν κλείσει» και «κλείστε θέση».
4. **Η λίστα ελέγχου στησίματος μένει στα 5 βήματα.** Η σύνδεση είναι προαιρετική, δεν είναι προϋπόθεση για να πουλήσει η εκδρομή, και τα υπάρχοντα tests του `setupChecklist` μετρούν 5.
5. **Η ορατότητα είναι αμφίδρομη.** Ο υπάλληλος βλέπει τη σύνδεση και από τη μεριά της εκδρομής πούλμαν (`/admin/excursions/<id>`), αλλιώς η στήλη γίνεται κρυφή κατάσταση που κανείς δεν θυμάται.

## File Structure

| Αρχείο | Ευθύνη |
|---|---|
| `supabase/migrations/0025_tours_route_link.sql` (create) | Η στήλη `tours.route_id` — αντίγραφο του 0019 για τη `tours`. |
| `lib/excursions.ts` (modify) | `excursionDeepLink()` — το ένα σημείο που ξέρει πώς χτίζεται το `/eisitiria?ekdromi=…`. |
| `lib/booking.ts` (modify) | `tourRouteCta()` — ο κανόνας «ποια CTA δείχνει η σελίδα εκδρομής», καθαρός και δοκιμάσιμος. |
| `types/db.ts` (modify) | `Tour.route_id`. |
| `data/seed/tours.ts` (modify) | `route_id: null` στα seed rows, ώστε να ικανοποιείται ο τύπος. |
| `components/admin/TourForm.tsx` (modify) | Ο επιλογέας «Σύνδεση με εκδρομή πούλμαν», ίδιος με του `PostForm`. |
| `app/admin/(dashboard)/actions.ts` (modify) | Αποθήκευση του `route_id` στο `upsertTour`. |
| `app/admin/(dashboard)/tours/new/page.tsx`, `tours/[id]/edit/page.tsx` (modify) | Τροφοδοτούν τη φόρμα με τα διαθέσιμα δρομολόγια. |
| `lib/queries/ticketing.ts` (modify) | `getPublishedRouteTitle()` (public) και `getRouteLinkedTours()` (admin). |
| `app/(site)/tour/[slug]/page.tsx` (modify) | Ρενδάρει την CTA που αποφάσισε το `tourRouteCta`. |
| `app/(site)/nea/[slug]/page.tsx` (modify) | Χρησιμοποιεί το `excursionDeepLink` αντί για δικό του string. |
| `app/admin/(dashboard)/excursions/[id]/page.tsx` (modify) | Η αντίστροφη ορατότητα: ποια σελίδα δείχνει εδώ. |
| `data/odigos-content.ts` (modify) | Ο Οδηγός Χρήσης εξηγεί τη σύνδεση στο προσωπικό. |

---

## Task 1: Οι καθαροί κανόνες — deep link και CTA

**Files:**
- Modify: `lib/excursions.ts`
- Modify: `lib/booking.ts`
- Modify: `app/(site)/nea/[slug]/page.tsx:81`
- Test: `tests/excursions.test.ts` (υπάρχον, προσθήκη), `tests/booking.test.ts` (υπάρχον, προσθήκη)

**Interfaces:**
- Produces: `excursionDeepLink(routeId: string | null | undefined): string | null` από το `@/lib/excursions`
- Produces: `type TourRouteCta = { href: string; primary: boolean } | null` και
  `tourRouteCta(input: { routeId: string | null | undefined; routePublished: boolean; hasActiveTiers: boolean; bookingsOpen: boolean }): TourRouteCta` από το `@/lib/booking` — τα καταναλώνει το Task 4.

- [ ] **Step 1: Το failing test για το deep link** — πρόσθεσε στο τέλος του `tests/excursions.test.ts` (και βάλε το `excursionDeepLink` στο υπάρχον import από `@/lib/excursions` στην κορυφή του αρχείου):

```ts
describe('excursionDeepLink', () => {
  it('χτίζει σύνδεσμο προς τον οδηγό κρατήσεων με προεπιλεγμένη εκδρομή', () => {
    expect(excursionDeepLink('abc-123')).toBe('/eisitiria?ekdromi=abc-123');
  });

  it('null όταν δεν υπάρχει σύνδεση', () => {
    expect(excursionDeepLink(null)).toBeNull();
    expect(excursionDeepLink(undefined)).toBeNull();
    expect(excursionDeepLink('')).toBeNull();
  });

  it('κωδικοποιεί το id ώστε να μη σπάει το URL', () => {
    expect(excursionDeepLink('a b&c')).toBe('/eisitiria?ekdromi=a%20b%26c');
  });
});
```

- [ ] **Step 2: Τρέξε, πρέπει να αποτύχει**

Run: `npm run test:run -- tests/excursions.test.ts`
Expected: FAIL — `excursionDeepLink is not a function` / σφάλμα import.

- [ ] **Step 3: Η υλοποίηση** — πρόσθεσε στο `lib/excursions.ts`, αμέσως μετά τη `resolveInitialRoute`:

```ts
/** Σύνδεσμος προς τον οδηγό κρατήσεων με την εκδρομή ήδη επιλεγμένη. Null
 *  όταν δεν υπάρχει σύνδεση — ο καλών αποφασίζει το fallback. Ένα σημείο για
 *  όλο το site, ώστε το `?ekdromi=` να μη γράφεται με το χέρι σε κάθε σελίδα. */
export function excursionDeepLink(routeId: string | null | undefined): string | null {
  return routeId ? `/eisitiria?ekdromi=${encodeURIComponent(routeId)}` : null;
}
```

- [ ] **Step 4: Τρέξε, πρέπει να περάσει**

Run: `npm run test:run -- tests/excursions.test.ts`
Expected: PASS

- [ ] **Step 5: Το failing test για την CTA** — πρόσθεσε στο τέλος του `tests/booking.test.ts` (και βάλε το `tourRouteCta` στο υπάρχον import από `@/lib/booking`):

```ts
describe('tourRouteCta', () => {
  const base = { routeId: 'r-1', routePublished: true, hasActiveTiers: false, bookingsOpen: true };

  it('κύριο κουμπί όταν η εκδρομή δεν πουλάει με κατηγορίες τιμών', () => {
    expect(tourRouteCta(base)).toEqual({ href: '/eisitiria?ekdromi=r-1', primary: true });
  });

  it('δευτερεύων σύνδεσμος όταν υπάρχει ήδη κουτί κράτησης', () => {
    expect(tourRouteCta({ ...base, hasActiveTiers: true })).toEqual({
      href: '/eisitiria?ekdromi=r-1',
      primary: false,
    });
  });

  it('τίποτα χωρίς σύνδεση', () => {
    expect(tourRouteCta({ ...base, routeId: null })).toBeNull();
  });

  it('τίποτα όταν το δρομολόγιο είναι πρόχειρο', () => {
    expect(tourRouteCta({ ...base, routePublished: false })).toBeNull();
  });

  it('τίποτα όταν η εκδρομή είναι κλειστή για κρατήσεις', () => {
    expect(tourRouteCta({ ...base, bookingsOpen: false })).toBeNull();
    expect(tourRouteCta({ ...base, hasActiveTiers: true, bookingsOpen: false })).toBeNull();
  });
});
```

- [ ] **Step 6: Τρέξε, πρέπει να αποτύχει**

Run: `npm run test:run -- tests/booking.test.ts`
Expected: FAIL — `tourRouteCta is not a function`.

- [ ] **Step 7: Η υλοποίηση** — πρόσθεσε στο τέλος του `lib/booking.ts` (και στην κορυφή του αρχείου: `import { excursionDeepLink } from '@/lib/excursions';`):

```ts
/** Τι δείχνει η σελίδα εκδρομής για τη συνδεδεμένη εκδρομή πούλμαν:
 *  `primary` = γίνεται το κύριο κουμπί, αλλιώς μπαίνει ως δευτερεύων σύνδεσμος
 *  κάτω από το υπάρχον κουτί κράτησης. Null = δεν δείχνουμε τίποτα. */
export type TourRouteCta = { href: string; primary: boolean } | null;

/** Ο κανόνας: δείχνουμε σύνδεσμο μόνο όταν υπάρχει σύνδεση, το δρομολόγιο είναι
 *  δημοσιευμένο και το γραφείο δεν έχει κλείσει την εκδρομή για κρατήσεις.
 *  Το «κλειστή» υπερισχύει — μια σελίδα δεν λέει «κλειστά» και «κλείστε θέση» μαζί. */
export function tourRouteCta(input: {
  routeId: string | null | undefined;
  routePublished: boolean;
  hasActiveTiers: boolean;
  bookingsOpen: boolean;
}): TourRouteCta {
  if (!input.bookingsOpen || !input.routePublished) return null;
  const href = excursionDeepLink(input.routeId);
  if (!href) return null;
  return { href, primary: !input.hasActiveTiers };
}
```

- [ ] **Step 8: Τρέξε, πρέπει να περάσει**

Run: `npm run test:run -- tests/booking.test.ts`
Expected: PASS

- [ ] **Step 9: DRY στα Νέα** — στο `app/(site)/nea/[slug]/page.tsx` το link γράφει σήμερα το query string με το χέρι. Άλλαξε τη γραμμή 81 από:

```tsx
              <Link href={post.route_id ? `/eisitiria?ekdromi=${post.route_id}` : '/eisitiria'}>Κλείστε Online Θέση</Link>
```

σε:

```tsx
              <Link href={excursionDeepLink(post.route_id) ?? '/eisitiria'}>Κλείστε Online Θέση</Link>
```

και πρόσθεσε στα imports του αρχείου: `import { excursionDeepLink } from '@/lib/excursions';`

- [ ] **Step 10: Gates**

Run: `npm run test:run && npx tsc --noEmit && npm run lint`
Expected: όλα πράσινα (τα tests ανεβαίνουν από 185 σε 193).

- [ ] **Step 11: Commit**

```bash
git add lib/excursions.ts lib/booking.ts tests/excursions.test.ts tests/booking.test.ts "app/(site)/nea/[slug]/page.tsx"
git commit -m "feat(booking): κανόνας συνδέσμου προς την εκδρομή πούλμαν"
```

---

## Task 2: Η στήλη στη βάση και ο τύπος

**Files:**
- Create: `supabase/migrations/0025_tours_route_link.sql`
- Modify: `types/db.ts:64` (μέσα στον τύπο `Tour`)
- Modify: `data/seed/tours.ts:26-32` (μέσα στη `mk`)

**Interfaces:**
- Produces: `Tour.route_id: string | null` — το καταναλώνουν τα Tasks 3 και 4.

- [ ] **Step 1: Το migration** — δημιούργησε `supabase/migrations/0025_tours_route_link.sql`:

```sql
-- 0025: σύνδεση σελίδας εκδρομής με bookable εκδρομή πούλμαν (deep-link CTA).
-- Ίδιο σχήμα με το posts.route_id του 0019: προαιρετικό, και αν η εκδρομή
-- πούλμαν διαγραφεί η σελίδα μένει ζωντανή, απλώς χωρίς σύνδεση.
-- Δεν αντιγράφονται τιμές, ημερομηνίες ή θέσεις — μόνο ο δείκτης.
alter table public.tours
  add column if not exists route_id uuid
    references public.bus_routes(id) on delete set null;
```

Δεν χρειάζεται αλλαγή RLS: η `tours` είναι ήδη δημόσια αναγνώσιμη και η νέα στήλη ακολουθεί τις υπάρχουσες πολιτικές, όπως έγινε και με το `bookings_open` (0023).

- [ ] **Step 2: Ο τύπος** — στο `types/db.ts`, μέσα στον τύπο `Tour`, αμέσως μετά το `meeting_points: string[];`:

```ts
  /** Προαιρετική σύνδεση με bookable εκδρομή πούλμαν (bus_routes.id): η σελίδα
   *  δείχνει τότε στον οδηγό κρατήσεων. Ποτέ δεν αντιγράφει τιμές ή ημερομηνίες. */
  route_id: string | null;
```

- [ ] **Step 3: Τα seed rows** — το `mk()` στο `data/seed/tours.ts` επιστρέφει `Tour`, οπότε ο νέος υποχρεωτικός τύπος το σπάει. Στο object literal της `mk`, στη γραμμή που ήδη γράφει `duration_label: … meeting_point: null, meeting_points: [],` πρόσθεσε στο τέλος της ίδιας γραμμής `route_id: null,`:

```ts
    duration_label: s.duration, departure_note: s.dates, meeting_point: null, meeting_points: [], route_id: null,
```

- [ ] **Step 4: Gates** — εδώ ο τύπος είναι το test: αν κάποιο άλλο σημείο κατασκευάζει `Tour`, το `tsc` θα το δείξει.

Run: `npm run test:run && npx tsc --noEmit && npm run lint`
Expected: όλα πράσινα, 193 tests.

- [ ] **Step 5: Commit**

```bash
git add supabase/migrations/0025_tours_route_link.sql types/db.ts data/seed/tours.ts
git commit -m "feat(db): στήλη σύνδεσης σελίδας εκδρομής με εκδρομή πούλμαν"
```

---

## Task 3: Ο επιλογέας στο admin

**Files:**
- Modify: `components/admin/TourForm.tsx`
- Modify: `app/admin/(dashboard)/actions.ts:272-289` (το `payload` του `upsertTour`)
- Modify: `app/admin/(dashboard)/tours/new/page.tsx`
- Modify: `app/admin/(dashboard)/tours/[id]/edit/page.tsx`
- Test: `tests/tour-form.test.tsx` (νέο αρχείο)

**Interfaces:**
- Consumes: `Tour.route_id` (Task 2)
- Produces: το `TourForm` δέχεται πλέον `routes?: AdminRoute[]` και στέλνει πεδίο `route_id` στο FormData.

- [ ] **Step 1: Το failing test** — δημιούργησε `tests/tour-form.test.tsx`:

```tsx
import { describe, it, expect } from 'vitest';
import { render, screen } from '@testing-library/react';
import { TourForm } from '@/components/admin/TourForm';
import type { Category, Tour } from '@/types/db';
import type { AdminRoute } from '@/lib/queries/ticketing';

const categories: Category[] = [
  { id: 'c1', slug: 'monoimeres', name_el: 'Μονοήμερες', description_el: null, sort_order: 0 },
];

const routes: AdminRoute[] = [
  {
    id: 'r-1',
    origin_station_id: 's1',
    destination_station_id: 's2',
    status: 'published',
    duration_min: 120,
    sales_cutoff_min: 5,
    position: 0,
    title: 'Μονοήμερη Ναύπλιο',
    boarding_points: [],
    origin: { name: 'Αθήνα' },
    destination: { name: 'Ναύπλιο' },
  },
];

const tour = {
  id: 't-1',
  slug: 'monoimeri-nafplio',
  title: 'Μονοήμερη Ναύπλιο',
  subtitle: null,
  summary: null,
  body: {},
  price_from: null,
  price_original: null,
  currency: 'EUR',
  duration_label: null,
  departure_note: null,
  meeting_point: null,
  meeting_points: [],
  route_id: 'r-1',
  status: 'published',
  is_featured: false,
  bookings_open: true,
  cover_image_id: null,
  seo_title: null,
  seo_description: null,
  source_url: null,
  sort_order: 0,
  published_at: null,
} satisfies Tour;

describe('TourForm — σύνδεση με εκδρομή πούλμαν', () => {
  it('δείχνει τη συνδεδεμένη εκδρομή επιλεγμένη', () => {
    render(<TourForm tour={tour} categories={categories} routes={routes} action={() => {}} />);
    const select = screen.getByLabelText(/Σύνδεση με εκδρομή πούλμαν/) as HTMLSelectElement;
    expect(select.name).toBe('route_id');
    expect(select.value).toBe('r-1');
  });

  it('χωρίς σύνδεση όταν η εκδρομή δεν δείχνει πουθενά', () => {
    render(<TourForm tour={{ ...tour, route_id: null }} categories={categories} routes={routes} action={() => {}} />);
    const select = screen.getByLabelText(/Σύνδεση με εκδρομή πούλμαν/) as HTMLSelectElement;
    expect(select.value).toBe('');
    expect(screen.getByText('— Χωρίς σύνδεση —')).toBeInTheDocument();
  });

  it('δείχνει τον επιλογέα και σε νέα εκδρομή, άδειο', () => {
    render(<TourForm categories={categories} routes={routes} action={() => {}} />);
    const select = screen.getByLabelText(/Σύνδεση με εκδρομή πούλμαν/) as HTMLSelectElement;
    expect(select.value).toBe('');
  });
});
```

- [ ] **Step 2: Τρέξε, πρέπει να αποτύχει**

Run: `npm run test:run -- tests/tour-form.test.tsx`
Expected: FAIL — `Unable to find a label with the text of: /Σύνδεση με εκδρομή πούλμαν/`.

- [ ] **Step 3: Ο επιλογέας στη φόρμα** — στο `components/admin/TourForm.tsx`:

α) στα imports (τύπος μόνο, ώστε να μην μπει server κώδικας σε client component — ίδιο με το `PostForm`):

```tsx
import type { AdminRoute } from '@/lib/queries/ticketing';
import { routeLabel } from '@/lib/ticketing';
```

β) στα props:

```tsx
export function TourForm({
  tour,
  categories,
  routes = [],
  action,
}: {
  tour?: Tour | null;
  categories: Category[];
  routes?: AdminRoute[];
  action: (formData: FormData) => void | Promise<void>;
}) {
```

γ) το πεδίο, αμέσως μετά το `<label>` των «Σημεία συνάντησης (ένα ανά γραμμή)» και το επεξηγηματικό `<p>` που το ακολουθεί, πριν το `<div className="grid gap-5 sm:grid-cols-2">` με την Κατάσταση:

```tsx
      <label className="block">
        <span className={adminLabel}>Σύνδεση με εκδρομή πούλμαν (προαιρετικό)</span>
        <select name="route_id" defaultValue={tour?.route_id ?? ''} className={adminInput}>
          <option value="">— Χωρίς σύνδεση —</option>
          {routes.map((r) => <option key={r.id} value={r.id}>{routeLabel(r)}</option>)}
        </select>
        <span className="mt-1.5 block text-[13px] text-muted">
          Αν η ίδια εκδρομή πουλάει θέσεις με αριθμό στο «Εκδρομές &amp; Πρόγραμμα», διαλέξτε την εδώ: η σελίδα θα
          στέλνει τον επισκέπτη κατευθείαν στην κράτηση θέσης. Δεν αντιγράφονται τιμές ούτε ημερομηνίες.
        </span>
      </label>
```

- [ ] **Step 4: Τρέξε, πρέπει να περάσει**

Run: `npm run test:run -- tests/tour-form.test.tsx`
Expected: PASS (3 tests)

- [ ] **Step 5: Η αποθήκευση** — στο `app/admin/(dashboard)/actions.ts`, μέσα στο `payload` του `upsertTour`, αμέσως μετά τη γραμμή `meeting_points: parseBoardingPoints(...)`:

```ts
    route_id: (String(formData.get('route_id') || '').trim() || null) as string | null,
```

- [ ] **Step 6: Τροφοδότησε τη φόρμα (νέα εκδρομή)** — `app/admin/(dashboard)/tours/new/page.tsx` ολόκληρο:

```tsx
import { getCategories } from '@/lib/queries/categories';
import { getAdminRoutes } from '@/lib/queries/ticketing';
import { TourForm } from '@/components/admin/TourForm';
import { FlashBanner } from '@/components/admin/FlashBanner';
import { upsertTour } from '../../actions';

export default async function NewTourPage({ searchParams }: { searchParams: Promise<{ error?: string }> }) {
  const { error } = await searchParams;
  const [categories, allRoutes] = await Promise.all([getCategories(), getAdminRoutes()]);
  const routes = allRoutes.filter((r) => r.status === 'published');
  return (
    <div>
      <h1 className="mb-8 font-display text-4xl font-semibold text-primary">Νέα Εκδρομή</h1>
      <FlashBanner error={error} />
      <TourForm categories={categories} routes={routes} action={upsertTour} />
    </div>
  );
}
```

- [ ] **Step 7: Τροφοδότησε τη φόρμα (επεξεργασία)** — στο `app/admin/(dashboard)/tours/[id]/edit/page.tsx`:

α) imports: `import { getAdminRoutes } from '@/lib/queries/ticketing';` και `import { routeLabel } from '@/lib/ticketing';`

β) πρόσθεσε το `getAdminRoutes()` στο υπάρχον `Promise.all` ως έκτο στοιχείο:

```tsx
  const [{ data: row }, categories, { data: images }, booking, ordersCount, allRoutes] = await Promise.all([
    sb.from('tours').select('*, categories:tour_categories(category:categories(*))').eq('id', id).maybeSingle(),
    getCategories(),
    sb.from('tour_images').select('*').eq('tour_id', id).order('position'),
    getTourBookingSetup(id),
    sb.from('tour_orders').select('id', { count: 'exact', head: true }).eq('tour_id', id),
    getAdminRoutes(),
  ]);
```

γ) μετά το `if (!row) notFound();` και τον υπολογισμό του `tour`, κράτα επιλέξιμο και ένα πρόχειρο δρομολόγιο που είναι ήδη συνδεδεμένο (ίδιο με τα Νέα — αλλιώς η αποθήκευση θα έσπαγε σιωπηλά τη σύνδεση):

```tsx
  // Τα πρόχειρα δρομολόγια δεν προτείνονται, αλλά αν η εκδρομή είναι ήδη
  // συνδεδεμένη με ένα, μένει επιλεγμένο — αλλιώς η επόμενη αποθήκευση θα
  // έκοβε τη σύνδεση χωρίς να το ζητήσει κανείς.
  const routes = allRoutes.filter((r) => r.status === 'published');
  const linkedId = tour.route_id as string | null;
  if (linkedId && !routes.some((r) => r.id === linkedId)) {
    const linked = allRoutes.find((r) => r.id === linkedId);
    if (linked) routes.push({ ...linked, title: `${routeLabel(linked)} (πρόχειρη)` });
  }
```

δ) πέρασέ τα στη φόρμα:

```tsx
      <TourForm tour={tour} categories={categories} routes={routes} action={upsertTour} />
```

- [ ] **Step 8: Gates**

Run: `npm run test:run && npx tsc --noEmit && npm run lint`
Expected: όλα πράσινα, 196 tests.

- [ ] **Step 9: Commit**

```bash
git add components/admin/TourForm.tsx tests/tour-form.test.tsx "app/admin/(dashboard)/actions.ts" "app/admin/(dashboard)/tours/new/page.tsx" "app/admin/(dashboard)/tours/[id]/edit/page.tsx"
git commit -m "feat(admin): σύνδεση σελίδας εκδρομής με εκδρομή πούλμαν"
```

---

## Task 4: Η CTA στη δημόσια σελίδα

**Files:**
- Modify: `lib/queries/ticketing.ts` (public ενότητα, μετά τη `getExcursions`)
- Modify: `app/(site)/tour/[slug]/page.tsx`

**Interfaces:**
- Consumes: `tourRouteCta` (Task 1), `Tour.route_id` (Task 2)
- Produces: `getPublishedRouteTitle(routeId: string | null | undefined): Promise<string | null>`

- [ ] **Step 1: Η στοχευμένη ερώτηση** — στο `lib/queries/ticketing.ts`, στην **public** ενότητα αμέσως μετά τη `getExcursions`:

```ts
/** Ο τίτλος του συνδεδεμένου δρομολογίου, μόνο αν είναι δημοσιευμένο. Null όταν
 *  δεν υπάρχει σύνδεση, δεν βρέθηκε ή είναι πρόχειρο — η σελίδα εκδρομής το
 *  χρησιμοποιεί ως «επιτρέπεται να δείξω κουμπί κράτησης θέσης;». Χωρίς join σε
 *  ημερομηνίες: εδώ χρειάζεται μόνο ύπαρξη και κατάσταση. */
export async function getPublishedRouteTitle(routeId: string | null | undefined): Promise<string | null> {
  if (!routeId || !isDbConfigured()) return null;
  const sb = createPublicClient();
  const { data, error } = await sb
    .from('bus_routes')
    .select('title, destination:stations!bus_routes_destination_station_id_fkey(name)')
    .eq('id', routeId)
    .eq('status', 'published')
    .maybeSingle();
  if (error) { console.error('getPublishedRouteTitle:', error.message); return null; }
  if (!data) return null;
  const row = data as { title: string | null; destination: { name: string } | null };
  return row.title?.trim() || row.destination?.name || null;
}
```

- [ ] **Step 2: Η σελίδα διαβάζει τη σύνδεση** — στο `app/(site)/tour/[slug]/page.tsx`:

α) imports:

```tsx
import { getPublishedRouteTitle } from '@/lib/queries/ticketing';
```

και στο υπάρχον import από `@/lib/booking` πρόσθεσε το `tourRouteCta`:

```tsx
import { bookableDepartures, headlinePrice, isBookable, tourRouteCta } from '@/lib/booking';
```

β) βάλε την ερώτηση στο υπάρχον `Promise.all` (γραμμή 53):

```tsx
  const [all, settings, linkedRouteTitle] = await Promise.all([
    getTours(),
    getSettings(),
    getPublishedRouteTitle(tour.route_id),
  ]);
```

γ) αμέσως μετά τη γραμμή `const headline = headlinePrice(tiers);` πρόσθεσε:

```tsx
  // Η σύνδεση με εκδρομή πούλμαν: κύριο κουμπί όταν η σελίδα δεν πουλάει μόνη
  // της, δευτερεύων σύνδεσμος όταν πουλάει, τίποτα όταν είναι κλειστή.
  const routeCta = tourRouteCta({
    routeId: tour.route_id,
    routePublished: linkedRouteTitle != null,
    hasActiveTiers: hasPricing,
    bookingsOpen: tour.bookings_open !== false,
  });
```

- [ ] **Step 3: Ο δευτερεύων σύνδεσμος** — στο bookable branch (γραμμές 167-177), αμέσως μετά το `<TourBookingWidget … />` και **πριν** το `{detailsCard}`:

```tsx
                {routeCta && !routeCta.primary && (
                  <Link
                    href={routeCta.href}
                    className="block text-center font-sans text-[14px] font-semibold text-primary underline underline-offset-4 transition-colors hover:text-cta motion-reduce:transition-none"
                  >
                    Ή διαλέξτε συγκεκριμένη θέση στο πούλμαν →
                  </Link>
                )}
```

- [ ] **Step 4: Το κύριο κουμπί** — στο τρίτο branch (η σελίδα χωρίς κατηγορίες τιμών), αντικατέστησε ολόκληρο το υπάρχον μπλοκ:

```tsx
              <Button asChild variant="accent" size="lg" className="mt-8 w-full">
                <Link href="#kratisi">Ζητήστε Κράτηση / Προσφορά</Link>
              </Button>
```

με:

```tsx
              {routeCta?.primary ? (
                <>
                  <Button asChild variant="accent" size="lg" className="mt-8 w-full">
                    <Link href={routeCta.href}>Κλείστε Online Θέση</Link>
                  </Button>
                  <Button asChild variant="outline" size="lg" className="mt-3 w-full">
                    <Link href="#kratisi">Ζητήστε Προσφορά</Link>
                  </Button>
                </>
              ) : (
                <Button asChild variant="accent" size="lg" className="mt-8 w-full">
                  <Link href="#kratisi">Ζητήστε Κράτηση / Προσφορά</Link>
                </Button>
              )}
```

Η φόρμα αιτήματος (`OnlineBookingForm`, `id="kratisi"`) μένει ακριβώς όπου είναι — δεν αφαιρείται ποτέ τρόπος επικοινωνίας.

- [ ] **Step 5: Gates**

Run: `npm run test:run && npx tsc --noEmit && npm run lint`
Expected: όλα πράσινα, 196 tests.

- [ ] **Step 6: Commit**

```bash
git add lib/queries/ticketing.ts "app/(site)/tour/[slug]/page.tsx"
git commit -m "feat(site): κουμπί κράτησης θέσης στη συνδεδεμένη σελίδα εκδρομής"
```

---

## Task 5: Η αντίστροφη ορατότητα στο admin

**Files:**
- Modify: `lib/queries/ticketing.ts` (admin ενότητα, μετά τη `getAdminRouteFares`)
- Modify: `app/admin/(dashboard)/excursions/[id]/page.tsx`

**Interfaces:**
- Produces: `getRouteLinkedTours(routeId: string): Promise<{ id: string; title: string }[]>`

- [ ] **Step 1: Η ερώτηση** — στο `lib/queries/ticketing.ts`, στην **admin** ενότητα αμέσως μετά τη `getAdminRouteFares`:

```ts
/** Ποιες σελίδες εκδρομών δείχνουν σε αυτό το δρομολόγιο. Ο υπάλληλος πρέπει να
 *  βλέπει τη σύνδεση και από τις δύο μεριές, αλλιώς γίνεται κρυφή κατάσταση. */
export async function getRouteLinkedTours(routeId: string): Promise<{ id: string; title: string }[]> {
  const sb = await createServerClient();
  const { data, error } = await sb.from('tours').select('id, title').eq('route_id', routeId).order('title');
  if (error) { console.error('getRouteLinkedTours:', error.message); return []; }
  return (data ?? []) as { id: string; title: string }[];
}
```

- [ ] **Step 2: Η κάρτα στη σελίδα του δρομολογίου** — στο `app/admin/(dashboard)/excursions/[id]/page.tsx`:

α) πρόσθεσε το `getRouteLinkedTours` στο υπάρχον import από `@/lib/queries/ticketing`.

β) πρόσθεσέ το στο υπάρχον `Promise.all` (γραμμές 66-70):

```tsx
  const [fares, allPatterns, layouts, linkedTours] = await Promise.all([
    getAdminRouteFares(id),
    getAdminPatterns(),
    getAdminLayouts(),
    getRouteLinkedTours(id),
  ]);
```

γ) μέσα στο `{tab === 'stoixeia' && (` block, ως **πρώτο** παιδί του `<div className="space-y-8">`, πριν το `<form action={upsertRoute} …>`:

```tsx
          <AdminCard className="border-primary/20 bg-primary/5">
            <h2 className="font-sans text-[15px] font-semibold text-primary">Σελίδα εκδρομής στο site</h2>
            {linkedTours.length > 0 ? (
              <ul className="mt-2 space-y-1 text-[14px] text-body">
                {linkedTours.map((t) => (
                  <li key={t.id}>
                    <Link href={`/admin/tours/${t.id}/edit`} className="font-semibold underline underline-offset-2 hover:text-cta">
                      {t.title}
                    </Link>{' '}
                    — στέλνει τους επισκέπτες της εδώ για κράτηση θέσης.
                  </li>
                ))}
              </ul>
            ) : (
              <p className="mt-2 text-[14px] text-muted">
                Καμία σελίδα του site δεν δείχνει σε αυτή την εκδρομή. Τη σύνδεση την ορίζετε από τη{' '}
                <Link href="/admin/tours" className="underline underline-offset-2 hover:text-cta">
                  σελίδα της εκδρομής
                </Link>
                , στο πεδίο «Σύνδεση με εκδρομή πούλμαν».
              </p>
            )}
          </AdminCard>
```

- [ ] **Step 3: Gates**

Run: `npm run test:run && npx tsc --noEmit && npm run lint`
Expected: όλα πράσινα, 196 tests.

- [ ] **Step 4: Commit**

```bash
git add lib/queries/ticketing.ts "app/admin/(dashboard)/excursions/[id]/page.tsx"
git commit -m "feat(admin): ορατή η σύνδεση και από τη μεριά της εκδρομής πούλμαν"
```

---

## Task 6: Ο Οδηγός Χρήσης και το τελικό build

**Files:**
- Modify: `data/odigos-content.ts` (ενότητα `selides-ekdromon`)

- [ ] **Step 1: Λέξεις-κλειδιά** — στην ενότητα με `id: 'selides-ekdromon'`, πρόσθεσε στο `keywords` array: `'σύνδεση με εκδρομή'`, `'πούλμαν'`, `'κράτηση θέσης'`. Το τελικό array:

```ts
    keywords: ['σελίδες εκδρομών', 'κατάλογος', 'tour', 'φωτογραφίες', 'gallery', 'εξώφυλλο', 'κατηγορίες', 'προβεβλημένη', 'δημοσίευση σελίδας', 'σύνδεση με εκδρομή', 'πούλμαν', 'κράτηση θέσης'],
```

- [ ] **Step 2: Το κείμενο** — στην ίδια ενότητα, ανάμεσα στο `steps` block και στο `tip` block, πρόσθεσε:

```ts
      { kind: 'p', text: 'ΣΥΝΔΕΣΗ ΜΕ ΕΚΔΡΟΜΗ ΠΟΥΛΜΑΝ: Αν η ίδια εκδρομή πουλάει και αριθμημένες θέσεις από το «Εκδρομές & Πρόγραμμα», διαλέξτε την στο πεδίο «Σύνδεση με εκδρομή πούλμαν» της επεξεργασίας. Τότε η σελίδα του site αποκτά κουμπί «Κλείστε Online Θέση» που ανοίγει τον οδηγό κρατήσεων με την εκδρομή ήδη επιλεγμένη. Τιμές και ημερομηνίες ΔΕΝ αντιγράφονται — η σελίδα απλώς δείχνει πού γίνεται η κράτηση.' },
      { kind: 'tip', text: 'Η σύνδεση φαίνεται και ανάποδα: ανοίγοντας την εκδρομή στο «Εκδρομές & Πρόγραμμα», η καρτέλα «Στοιχεία» σας λέει ποια σελίδα του site δείχνει σε αυτή.' },
      { kind: 'warning', text: 'Το κουμπί εμφανίζεται μόνο αν η εκδρομή πούλμαν είναι «Δημοσιευμένη» και η σελίδα δεν είναι «Κλειστή για κρατήσεις». Αν το κουμπί δεν φαίνεται στο site, ελέγξτε πρώτα αυτά τα δύο.' },
```

- [ ] **Step 3: Πλήρη gates, μαζί με build**

Run: `npm run test:run && npx tsc --noEmit && npm run lint && npm run build`
Expected: όλα πράσινα, 196 tests, επιτυχές build.

- [ ] **Step 4: Commit**

```bash
git add data/odigos-content.ts
git commit -m "docs(admin): οδηγός για τη σύνδεση σελίδας με εκδρομή πούλμαν"
```

---

## Χειροκίνητος έλεγχος (controller)

Πριν από οτιδήποτε: **εφάρμοσε το `supabase/migrations/0025_tours_route_link.sql` στη ζωντανή βάση.** Χωρίς αυτό, ο επιλογέας θα αποτυγχάνει στην αποθήκευση με σφάλμα στήλης.

1. **Χωρίς σύνδεση (η συντριπτική πλειοψηφία):** άνοιξε οποιαδήποτε υπάρχουσα σελίδα εκδρομής στο site — τίποτα δεν έχει αλλάξει, ίδιο κουτί, ίδια κουμπιά.
2. **Σύνδεση σε εκδρομή χωρίς κατηγορίες τιμών:** στο admin διάλεξε μια δημοσιευμένη εκδρομή πούλμαν, αποθήκευσε, άνοιξε τη σελίδα → «Κλείστε Online Θέση» ως κύριο κουμπί, «Ζητήστε Προσφορά» από κάτω, η φόρμα αιτήματος στη θέση της. Το κουμπί ανοίγει το `/eisitiria` με την εκδρομή **ήδη επιλεγμένη** στον επιλογέα.
3. **Σύνδεση σε εκδρομή με κατηγορίες τιμών:** το κουτί κράτησης μένει πρώτο, από κάτω ο σύνδεσμος «Ή διαλέξτε συγκεκριμένη θέση στο πούλμαν →».
4. **Κλειστή για κρατήσεις:** μάρκαρε «Κλειστή για κρατήσεις» → η σελίδα δείχνει μόνο «Οι κρατήσεις έχουν κλείσει», κανένα κουμπί κράτησης θέσης.
5. **Πρόχειρο δρομολόγιο:** κάνε το συνδεδεμένο δρομολόγιο «Πρόχειρη» → το κουμπί εξαφανίζεται από το site, αλλά η σύνδεση παραμένει επιλεγμένη στο admin με την ένδειξη «(πρόχειρη)» και δεν χάνεται στην επόμενη αποθήκευση.
6. **Αντίστροφη ορατότητα:** `/admin/excursions/<id>` καρτέλα «Στοιχεία» → η κάρτα δείχνει τη συνδεδεμένη σελίδα ως σύνδεσμο· χωρίς σύνδεση, δείχνει την οδηγία.
7. **Διαγραφή εκδρομής πούλμαν:** η σελίδα του site επιβιώνει, απλώς επιστρέφει στη συμπεριφορά «χωρίς σύνδεση» (`on delete set null`).

## Τι δεν κάνει αυτό το πλάνο

- **Δεν ενοποιεί το στήσιμο.** Ο υπάλληλος συνεχίζει να στήνει τα κείμενα/φωτογραφίες στο ένα σημείο και τις θέσεις/δρομολόγια στο άλλο. Αυτό που αλλάζει είναι ότι πλέον υπάρχει ρητός δεσμός και ο πελάτης δεν χάνεται ανάμεσά τους.
- **Δεν δείχνει ημερομηνίες ή διαθεσιμότητα του πούλμαν** στη σελίδα εκδρομής. Θα απαιτούσε το `list_route_dates` σε κάθε σελίδα εκδρομής (cache 1 ώρας, 252 σελίδες) και θα έφτιαχνε δεύτερη πηγή αλήθειας για διαθεσιμότητα.
- **Δεν αγγίζει τη λίστα ελέγχου στησίματος** — η σύνδεση είναι προαιρετική, όχι προϋπόθεση πώλησης (Απόφαση 4).
