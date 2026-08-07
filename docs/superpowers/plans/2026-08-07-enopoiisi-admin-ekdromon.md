# Ενοποίηση Σελίδων Εκδρομών + Εκδρομές & Πρόγραμμα σε μία σελίδα — Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Όλη η λειτουργικότητα του `/admin/excursions` μεταφέρεται μέσα στο `/admin/tours`, ώστε ο υπάλληλος να έχει έναν προορισμό για κάθε τι που αφορά εκδρομές — χωρίς καμία αλλαγή στη βάση, στα RPC ή σε ό,τι βλέπει ο πελάτης.

**Architecture:** Καθαρή αλλαγή διεπαφής. Οι δύο πίνακες (`tours`, `bus_routes`) και τα δύο συστήματα κρατήσεων μένουν **ακριβώς όπως είναι**. Το `/admin/tours` αποκτά τρίτη καρτέλα «Πούλμαν & θέσεις» με τη λίστα των διαδρομών, και η σελίδα λεπτομερειών μετακομίζει σε `/admin/tours/poylman/[id]` κρατώντας και τις 4 καρτέλες της. Οι παλιές διευθύνσεις γίνονται ανακατευθύνσεις, όπως έγινε ήδη με τα `routes`/`schedules`/`stations` (commit `73c7b45`).

**Tech Stack:** Next.js 16 App Router (server components, server actions), Tailwind 3.4, Supabase, vitest.

## Global Constraints

- **ΤΙΠΟΤΑ δεν αλλάζει για τον πελάτη.** Καμία αλλαγή σε `app/(site)/**`, `components/booking/**`, `components/ticketing/**`, `components/trips/**`, `lib/queries/**`, `lib/*-notify.ts`. Το τελικό `git diff --stat` δεν επιτρέπεται να περιέχει τέτοιο αρχείο.
- **Καμία αλλαγή στη βάση.** Κανένα νέο migration, καμία `create or replace`, κανένα RPC. Το `supabase/` μένει άθικτο.
- **Καμία αλλαγή στα δεδομένα.** 240 `tours`, 14 `bus_routes`, 11 `tour_orders`, 46 `ticket_orders`, 82 `tickets` παραμένουν ως έχουν.
- **Καμία παλιά διεύθυνση δεν πεθαίνει.** `/admin/excursions` και `/admin/excursions/<id>` συνεχίζουν να δουλεύουν ως ανακατευθύνσεις, διατηρώντας τα query params (`?tab=`, `?saved=1`, `?error=`, `?created=1`, `?q=`).
- Γλώσσα UI: **ελληνικά**. Σχόλια κώδικα στο ύφος του αρχείου που πειράζεις.
- Κάθε task τελειώνει με `npx tsc --noEmit`, `npx oxlint`, `npx vitest run` πράσινα πριν το commit.

---

## File Structure

| Αρχείο | Ευθύνη | Task |
|---|---|---|
| `lib/admin-routes.ts` (create) | Οι δύο διευθύνσεις του πούλμαν σε ΕΝΑ σημείο — `POYLMAN_LIST`, `poylmanHref(id)` | 1 |
| `app/admin/(dashboard)/ticketing-actions.ts` (modify) | 19 σκληροκωδικοποιημένα redirects περνούν από τους helpers | 1 |
| `components/admin/PoylmanRoutesList.tsx` (create) | Η λίστα διαδρομών, βγαλμένη από τη σελίδα excursions ώστε να μπει σε καρτέλα | 2 |
| `app/admin/(dashboard)/tours/page.tsx` (modify) | Ο νέος hub: 3 καρτέλες | 3 |
| `components/admin/AdminSidebar.tsx` (modify) | Μία εγγραφή «Εκδρομές» αντί για δύο που μπερδεύουν | 3 |
| `app/admin/(dashboard)/tours/poylman/[id]/page.tsx` (create, μετακόμιση) | Η σελίδα λεπτομερειών με τις 4 καρτέλες | 4 |
| `app/admin/(dashboard)/excursions/page.tsx` + `[id]/page.tsx` (replace) | Ανακατευθύνσεις που κρατούν τα query params | 5 |
| `data/odigos-content.ts` (modify) | Ο οδηγός να περιγράφει έναν προορισμό | 6 |
| `tests/admin-routes.test.ts` (create) | Φρουρά για τους helpers και το flash | 1 |

---

### Task 1: Οι διευθύνσεις του πούλμαν σε ένα σημείο

Το `ticketing-actions.ts` έχει **19** σκληροκωδικοποιημένα `/admin/excursions…`. Αν τα αλλάξεις ένα-ένα με το χέρι, κάποιο θα ξεφύγει. Τα κεντρικοποιούμε **πρώτα**, ενώ ακόμη δείχνουν στην παλιά διεύθυνση — έτσι το βήμα αυτό δεν αλλάζει καμία συμπεριφορά και επιβεβαιώνεται εύκολα.

**Η παγίδα:** η νέα λίστα είναι `/admin/tours?tab=poylman`, δηλαδή **έχει ήδη query string**. Το `flashQuery()` (`lib/admin-flash.ts:15`) προσθέτει πάντα `?`, άρα θα παρήγαγε `?tab=poylman?saved=1` και το μήνυμα επιτυχίας θα χανόταν σιωπηλά. Κάθε τέτοιο σημείο **πρέπει** να γίνει `withFlash()`, που διαλέγει `?` ή `&`.

**Files:**
- Create: `lib/admin-routes.ts`
- Create: `tests/admin-routes.test.ts`
- Modify: `app/admin/(dashboard)/ticketing-actions.ts`

**Interfaces:**
- Produces: `POYLMAN_LIST: string`, `poylmanHref(id: string): string`, `poylmanTabHref(id: string, tab: string): string` — τα χρησιμοποιούν τα Tasks 2-5.

- [ ] **Step 1: Γράψε το failing test**

`tests/admin-routes.test.ts`:
```ts
import { describe, it, expect } from 'vitest';
import { POYLMAN_LIST, poylmanHref, poylmanTabHref } from '@/lib/admin-routes';
import { withFlash } from '@/lib/admin-flash';

describe('admin-routes', () => {
  it('η λίστα πούλμαν είναι καρτέλα του hub εκδρομών', () => {
    expect(POYLMAN_LIST).toBe('/admin/tours?tab=poylman');
  });

  it('το withFlash βάζει & όταν υπάρχει ήδη query — αλλιώς χανόταν το μήνυμα', () => {
    expect(withFlash(POYLMAN_LIST, true)).toBe('/admin/tours?tab=poylman&saved=1');
    expect(withFlash(POYLMAN_LIST, false, 'db')).toBe('/admin/tours?tab=poylman&error=db');
  });

  it('σύνδεσμοι λεπτομερειών', () => {
    expect(poylmanHref('abc')).toBe('/admin/tours/poylman/abc');
    expect(poylmanTabHref('abc', 'times')).toBe('/admin/tours/poylman/abc?tab=times');
  });
});
```

- [ ] **Step 2: Τρέξε το για να δεις ότι αποτυγχάνει**

Run: `npx vitest run tests/admin-routes.test.ts`
Expected: FAIL — «Cannot find module '@/lib/admin-routes'».

- [ ] **Step 3: Φτιάξε τους helpers**

`lib/admin-routes.ts`:
```ts
/** Οι διευθύνσεις του πούλμαν, σε ΕΝΑ σημείο. Ζούσαν σκορπισμένες σε 19
 *  σημεία του ticketing-actions.ts, οπότε κάθε μετακόμιση ρίσκαρε να αφήσει
 *  κάποια πίσω. Προσοχή: το POYLMAN_LIST έχει ήδη query string — για flash
 *  μηνύματα χρησιμοποιείτε ΠΑΝΤΑ withFlash(), ποτέ flashQuery(). */
export const POYLMAN_LIST = '/admin/tours?tab=poylman';

export function poylmanHref(id: string): string {
  return `/admin/tours/poylman/${id}`;
}

export function poylmanTabHref(id: string, tab: string): string {
  return `${poylmanHref(id)}?tab=${tab}`;
}
```

- [ ] **Step 4: Τρέξε το test — περνάει;**

Run: `npx vitest run tests/admin-routes.test.ts`
Expected: PASS (3 tests).

- [ ] **Step 5: Πέρασε τα 19 redirects από τους helpers**

Στο `app/admin/(dashboard)/ticketing-actions.ts` πρόσθεσε στα imports:
```ts
import { POYLMAN_LIST, poylmanHref, poylmanTabHref } from '@/lib/admin-routes';
```
και αντικατέστησε **κάθε** literal:

| Παλιό | Νέο |
|---|---|
| `` `/admin/excursions${flashQuery(!error)}` `` | `withFlash(POYLMAN_LIST, !error)` |
| `` `/admin/excursions${flashQuery(false, 'invalid_input')}` `` | `withFlash(POYLMAN_LIST, false, 'invalid_input')` |
| `'/admin/excursions?error=db'` | `withFlash(POYLMAN_LIST, false, 'db')` |
| `'/admin/excursions'` (σκέτο) | `POYLMAN_LIST` |
| `` `/admin/excursions/${id}?tab=stoixeia` `` | `poylmanTabHref(id, 'stoixeia')` |
| `` `/admin/excursions/${id}${flashQuery(!error)}` `` | `withFlash(poylmanHref(id), !error)` |
| `` `/admin/excursions/${routeId}${flashQuery(...)}` `` | `withFlash(poylmanHref(routeId), ...)` |
| `` `/admin/excursions/${route!.id}?created=1` `` | `` `${poylmanHref(route!.id)}?created=1` `` |

Πρόσεξε επίσης το `revalidateTicketing()` και κάθε `revalidatePath('/admin/excursions')` — γίνονται `revalidatePath('/admin/tours')`.

- [ ] **Step 6: Επιβεβαίωσε ότι δεν έμεινε κανένα literal**

Run: `grep -n "/admin/excursions" "app/admin/(dashboard)/ticketing-actions.ts"`
Expected: **καμία γραμμή**.

- [ ] **Step 7: Έλεγχοι και commit**

```bash
npx tsc --noEmit && npx oxlint && npx vitest run
git add lib/admin-routes.ts tests/admin-routes.test.ts "app/admin/(dashboard)/ticketing-actions.ts"
git commit -m "refactor(admin): οι διευθύνσεις του πούλμαν σε ένα σημείο"
```

---

### Task 2: Η λίστα διαδρομών γίνεται component

**Files:**
- Create: `components/admin/PoylmanRoutesList.tsx`
- Modify: `app/admin/(dashboard)/excursions/page.tsx` (προσωρινά — το καταναλώνει)

**Interfaces:**
- Consumes: `POYLMAN_LIST`, `poylmanHref` από το Task 1.
- Produces: `<PoylmanRoutesList routes={...} patterns={...} trips={...} fares={...} q={...} />` — server component, καμία `'use client'`. Το Task 3 το βάζει στην καρτέλα.

- [ ] **Step 1: Βγάλε το σώμα της σελίδας σε component**

Αντέγραψε από το `app/admin/(dashboard)/excursions/page.tsx` **αυτούσια**: τη σταθερά του grid (γρ. 12), τη `kanonikoCents` (γρ. 22-26), τους τρεις χάρτες συγκέντρωσης (γρ. 48-67), την κάρτα «Νέα εκδρομή» (γρ. 81-93) και τις γραμμές του πίνακα (γρ. 105-135). Το component δέχεται τα ήδη φορτωμένα δεδομένα ως props — **δεν κάνει δικά του queries**, ώστε η σελίδα να ελέγχει πότε φορτώνονται.

Άλλαξε μόνο δύο πράγματα: τον σύνδεσμο κάθε γραμμής σε `poylmanHref(r.id)`, και το `action` της αναζήτησης σε `/admin/tours` με κρυφό `<input type="hidden" name="tab" value="poylman" />` ώστε η αναζήτηση να μένει στην καρτέλα.

- [ ] **Step 2: Κάνε τη σελίδα excursions να το χρησιμοποιεί**

Η `app/admin/(dashboard)/excursions/page.tsx` κρατά τα queries της και απλώς αποδίδει `<PoylmanRoutesList … />`. Έτσι το βήμα είναι **οπτικά ουδέτερο** και επιβεβαιώνεται αμέσως.

- [ ] **Step 3: Δες ότι δεν άλλαξε τίποτα**

Run: `npm run dev` → `/admin/excursions`
Expected: ίδια λίστα, ίδια αναζήτηση, ίδια κάρτα δημιουργίας. Οι σύνδεσμοι δείχνουν πλέον σε `/admin/tours/poylman/<id>` και δίνουν 404 — **αναμενόμενο**, η σελίδα φτιάχνεται στο Task 4.

- [ ] **Step 4: Έλεγχοι και commit**

```bash
npx tsc --noEmit && npx oxlint && npx vitest run
git add components/admin/PoylmanRoutesList.tsx "app/admin/(dashboard)/excursions/page.tsx"
git commit -m "refactor(admin): η λίστα πούλμαν σε component"
```

---

### Task 3: Το `/admin/tours` γίνεται ο ένας hub

**Files:**
- Modify: `app/admin/(dashboard)/tours/page.tsx`
- Modify: `components/admin/AdminSidebar.tsx`

**Interfaces:**
- Consumes: `PoylmanRoutesList` (Task 2), `POYLMAN_LIST` (Task 1).

- [ ] **Step 1: Πρόσθεσε την τρίτη καρτέλα**

Στο `tours/page.tsx`, το `TABS` (γρ. 13-16) γίνεται:
```tsx
const TABS = [
  { key: 'ekdromes', label: 'Σελίδες εκδρομών' },
  { key: 'poylman', label: 'Πούλμαν & θέσεις' },
  { key: 'katigories', label: 'Κατηγορίες' },
] as const;
```
**Κράτα το κλειδί `ekdromes` όπως είναι** — υπάρχουν αποθηκευμένοι σύνδεσμοι `?tab=ekdromes` και το `katigories` το χρησιμοποιεί ήδη το `upsertCategory`.

Ο τίτλος γίνεται «Εκδρομές» με υπότιτλο που εξηγεί τη διάκριση με απλά λόγια:
> «Οι σελίδες του καταλόγου και οι εκδρομές πούλμαν με αριθμημένες θέσεις, σε ένα σημείο.»

- [ ] **Step 2: Φόρτωσε τα δεδομένα του πούλμαν μόνο στην καρτέλα του**

Ακολούθησε το υπάρχον μοτίβο του `excursions/[id]/page.tsx:75-84` (φορτώνει τα trips μόνο στην καρτέλα «Δρομολόγια»):
```tsx
let poylman: { routes: AdminRoute[]; patterns: AdminPattern[]; trips: AdminTrip[]; fares: FareType[] } | null = null;
if (tab === 'poylman') {
  const today = new Date().toLocaleDateString('en-CA', { timeZone: 'Europe/Athens' });
  const to = addDays(today, 30);
  const [routes, patterns, trips, fares] = await Promise.all([
    getAdminRoutes(), getAdminPatterns(), getAdminTrips(today, to), getAdminAllFares(),
  ]);
  poylman = { routes, patterns, trips, fares };
}
```
Έτσι η καρτέλα «Σελίδες εκδρομών» **δεν γίνεται πιο αργή** — τέσσερα επιπλέον queries θα ήταν καθαρή επιβάρυνση για 238 από τις 240 επισκέψεις.

- [ ] **Step 3: Το κουμπί δημιουργίας ανά καρτέλα**

Στην καρτέλα `ekdromes` μένει το «Νέα Εκδρομή» → `/admin/tours/new`. Στην `poylman` δεν εμφανίζεται (η δημιουργία γίνεται από την κάρτα μέσα στη λίστα). Στην `katigories` δεν εμφανίζεται, όπως και σήμερα.

- [ ] **Step 4: Μία εγγραφή στο πλαϊνό μενού**

Στο `AdminSidebar.tsx`: **αφαίρεσε** το `{ to: '/admin/excursions', label: 'Εκδρομές & Πρόγραμμα', icon: Route }` από την ομάδα «Πωλήσεις» και **μετακίνησε** το `/admin/tours` εκεί ως πρώτη εγγραφή με label **«Εκδρομές»** (κράτα το εικονίδιο `MapPin`). Αφαίρεσέ το από την ομάδα «Περιεχόμενο Site», που κρατά μόνο «Νέα & Ανακοινώσεις».

Αυτό λύνει τη σύγχυση που περιέγραψε ο πελάτης: δεν υπάρχουν πια δύο εγγραφές που λένε «Εκδρομές».

- [ ] **Step 5: Δες το**

Run: `npm run dev` → `/admin/tours`
Expected: τρεις καρτέλες. Η «Πούλμαν & θέσεις» δείχνει τις 14 διαδρομές με αναζήτηση και κάρτα δημιουργίας. Το `?tab=ekdromes` και το `?tab=katigories` δουλεύουν όπως πριν.

- [ ] **Step 6: Έλεγχοι και commit**

```bash
npx tsc --noEmit && npx oxlint && npx vitest run
git add "app/admin/(dashboard)/tours/page.tsx" components/admin/AdminSidebar.tsx
git commit -m "feat(admin): οι εκδρομές σε έναν hub με τρεις καρτέλες"
```

---

### Task 4: Μετακόμιση της σελίδας λεπτομερειών

**Files:**
- Create: `app/admin/(dashboard)/tours/poylman/[id]/page.tsx` (το περιεχόμενο του `excursions/[id]/page.tsx`)
- Delete: `app/admin/(dashboard)/excursions/[id]/page.tsx` (γίνεται stub στο Task 5)
- Modify: `app/admin/(dashboard)/trips/[id]/page.tsx`, `app/admin/(dashboard)/page.tsx`

- [ ] **Step 1: Μετακίνησε το αρχείο αυτούσιο**

```bash
mkdir -p "app/admin/(dashboard)/tours/poylman/[id]"
git mv "app/admin/(dashboard)/excursions/[id]/page.tsx" "app/admin/(dashboard)/tours/poylman/[id]/page.tsx"
```
Το `git mv` κρατά το ιστορικό — σημαντικό για ένα αρχείο 417 γραμμών.

- [ ] **Step 2: Διόρθωσε τους εσωτερικούς συνδέσμους του**

Μέσα στο μετακομισμένο αρχείο:
- `const base = ...` γίνεται `const base = poylmanHref(id);`
- Το `backHref` του `AdminPageHeader` γίνεται `POYLMAN_LIST`, με `backLabel="Εκδρομές"`.
- Τα relative imports των actions ανεβαίνουν ένα επίπεδο: `from '../../ticketing-actions'` → `from '../../../ticketing-actions'`. **Επιβεβαίωσέ το με το `tsc`, μη το μαντέψεις.**

- [ ] **Step 3: Διόρθωσε τους δύο εξωτερικούς συνδέσμους**

- `app/admin/(dashboard)/trips/[id]/page.tsx` — ο σύνδεσμος επιστροφής γίνεται `poylmanTabHref(trip.route_id, 'dromologia')`.
- `app/admin/(dashboard)/page.tsx` (ο Πίνακας) — και οι τρεις αναφορές `/admin/excursions` γίνονται `POYLMAN_LIST`.

- [ ] **Step 4: Επιβεβαίωσε ότι δεν έμεινε τίποτα εκτός των stubs**

Run: `grep -rn "/admin/excursions" app components data lib | grep -v "excursions/page.tsx"`
Expected: μόνο τα `routes/`, `schedules/`, `stations/` stubs και το `data/odigos-content.ts` (φτιάχνονται στα Tasks 5-6).

- [ ] **Step 5: Δοκίμασε τη ροή**

Run: `npm run dev` → `/admin/tours?tab=poylman` → άνοιξε μια εκδρομή.
Expected: και οι 4 καρτέλες (Στοιχεία / Τιμές / Πρόγραμμα / Δρομολόγια) δουλεύουν, η αποθήκευση επιστρέφει στη σωστή καρτέλα με πράσινο μήνυμα, το «← Εκδρομές» γυρίζει στη λίστα.

- [ ] **Step 6: Έλεγχοι και commit**

```bash
npx tsc --noEmit && npx oxlint && npx vitest run
git add -A && git commit -m "feat(admin): η σελίδα εκδρομής πούλμαν κάτω από τις Εκδρομές"
```

---

### Task 5: Οι παλιές διευθύνσεις γίνονται ανακατευθύνσεις

Χωρίς αυτό, κάθε αποθηκευμένος σύνδεσμος του γραφείου δίνει 404.

**Files:**
- Modify: `app/admin/(dashboard)/excursions/page.tsx` (γίνεται stub)
- Create: `app/admin/(dashboard)/excursions/[id]/page.tsx` (stub)
- Modify: `app/admin/(dashboard)/routes/[id]/page.tsx` (δείχνει στο παλιό detail)

- [ ] **Step 1: Stub για τη λίστα, με διατήρηση της αναζήτησης**

`app/admin/(dashboard)/excursions/page.tsx`:
```tsx
import { redirect } from 'next/navigation';
import { POYLMAN_LIST } from '@/lib/admin-routes';

/** (P3) Η λίστα ζει πλέον ως καρτέλα του hub εκδρομών. Κρατάμε το ?q= ώστε
 *  αποθηκευμένες αναζητήσεις του γραφείου να μη χαθούν. */
export default async function ExcursionsRedirect({
  searchParams,
}: {
  searchParams: Promise<{ q?: string }>;
}) {
  const { q } = await searchParams;
  redirect(q ? `${POYLMAN_LIST}&q=${encodeURIComponent(q)}` : POYLMAN_LIST);
}
```

- [ ] **Step 2: Stub για τη σελίδα λεπτομερειών, με διατήρηση της καρτέλας**

`app/admin/(dashboard)/excursions/[id]/page.tsx`:
```tsx
import { redirect } from 'next/navigation';
import { poylmanHref } from '@/lib/admin-routes';

/** (P3) Διατηρεί ?tab= ώστε ένας παλιός σύνδεσμος «…?tab=programma» να
 *  προσγειώνεται στην ίδια καρτέλα όπως πριν. */
export default async function ExcursionDetailRedirect({
  params,
  searchParams,
}: {
  params: Promise<{ id: string }>;
  searchParams: Promise<{ tab?: string }>;
}) {
  const [{ id }, { tab }] = await Promise.all([params, searchParams]);
  redirect(tab ? `${poylmanHref(id)}?tab=${encodeURIComponent(tab)}` : poylmanHref(id));
}
```

- [ ] **Step 3: Ενημέρωσε και το παλιό stub των routes**

Το `app/admin/(dashboard)/routes/[id]/page.tsx` ανακατευθύνει σε `/admin/excursions/${id}` — δηλαδή σε ένα stub. Κάν' το να δείχνει κατευθείαν στο `poylmanHref(id)` ώστε να μην αλυσιδώνονται δύο ανακατευθύνσεις. Το ίδιο για τα `routes/page.tsx`, `schedules/*`, `stations/page.tsx` → `POYLMAN_LIST`.

- [ ] **Step 4: Δοκίμασε κάθε παλιά διεύθυνση**

Άνοιξε με τη σειρά: `/admin/excursions`, `/admin/excursions?q=μετ`, `/admin/excursions/<ένα-πραγματικό-id>`, `/admin/excursions/<id>?tab=times`, `/admin/routes`, `/admin/schedules`, `/admin/stations`.
Expected: όλες προσγειώνονται στο σωστό σημείο του νέου hub, με την αναζήτηση/καρτέλα διατηρημένη. Καμία 404, κανένας βρόχος.

- [ ] **Step 5: Έλεγχοι και commit**

```bash
npx tsc --noEmit && npx oxlint && npx vitest run
git add -A && git commit -m "feat(admin): οι παλιές διευθύνσεις εκδρομών ανακατευθύνουν στον hub"
```

---

### Task 6: Οδηγός χρήσης και τελική επαλήθευση

**Files:**
- Modify: `data/odigos-content.ts`
- Test: `tests/odigos-search.test.ts`

- [ ] **Step 1: Ενημέρωσε τον οδηγό**

Στο `data/odigos-content.ts`:
- Ενότητα `ekdromes-kyklos`: το βήμα «ΔΗΜΙΟΥΡΓΙΑ» λέει πλέον «Στις **Εκδρομές → καρτέλα Πούλμαν & θέσεις**…», και το `link` block γίνεται `href: '/admin/tours?tab=poylman'`.
- Ενότητα `selides-ekdromon`: η κόκκινη προειδοποίηση για τη σύγχυση ξαναγράφεται — δεν είναι πια δύο μενού, είναι **δύο καρτέλες της ίδιας σελίδας**:
```ts
{ kind: 'warning', text: 'Η διάκριση παραμένει, απλώς ζει σε δύο καρτέλες: «Σελίδες εκδρομών» είναι το ΠΕΡΙΕΧΟΜΕΝΟ του site (κείμενα, φωτογραφίες). «Πούλμαν & θέσεις» είναι το σύστημα που πουλάει αριθμημένες θέσεις. Μια σελίδα ΔΕΝ πουλάει θέσεις από μόνη της — αν θέλετε ο πελάτης να διαλέγει θέση, στήστε την εκδρομή στη δεύτερη καρτέλα και συνδέστε τις.' },
```
- Ενότητα `faq`: η γραμμή «Η εκδρομή δεν εμφανίζεται στη σελίδα κρατήσεων» αναφέρεται σε «καρτέλα Πούλμαν & θέσεις» αντί για «Εκδρομές & Πρόγραμμα».

- [ ] **Step 2: Πρόσθεσε φρουρά ότι ο οδηγός δεν δείχνει σε νεκρή διεύθυνση**

Στο `tests/odigos-search.test.ts`, μέσα στο `describe('odigos content', …)`:
```ts
  it('κανένας σύνδεσμος του οδηγού δεν δείχνει στην παλιά διεύθυνση εκδρομών', () => {
    const hrefs = ODIGOS_SECTIONS.flatMap((s) =>
      s.blocks.filter((b) => b.kind === 'link').map((b) => (b as { href: string }).href)
    );
    expect(hrefs.filter((h) => h.startsWith('/admin/excursions'))).toEqual([]);
  });
```

- [ ] **Step 3: Τελική σάρωση — καμία σπασμένη αναφορά**

```bash
grep -rn "/admin/excursions" app components data lib
```
Expected: **μόνο** τα δύο stub αρχεία `excursions/page.tsx` και `excursions/[id]/page.tsx` (που είναι οι ανακατευθύνσεις), τίποτε άλλο.

- [ ] **Step 4: Απόδειξε ότι δεν πειράχτηκε τίποτα του πελάτη**

```bash
git diff --stat main~6 -- "app/(site)" "components/booking" "components/ticketing" "components/trips" "lib/queries" supabase
```
Expected: **κενή έξοδος**. Αν βγάλει έστω ένα αρχείο, κάτι πήγε στραβά — σταμάτα και δες τι.

- [ ] **Step 5: Πλήρεις έλεγχοι**

```bash
npx tsc --noEmit && npx oxlint && npx vitest run && npm run build
```
Expected: όλα πράσινα.

- [ ] **Step 6: Χειροκίνητος έλεγχος καπνού στο admin**

Με τη σειρά: δημιουργία νέας εκδρομής πούλμαν από την καρτέλα → αποθήκευση τιμής → προσθήκη εβδομαδιαίου προγράμματος → άνοιγμα καρτέλας «Δρομολόγια» → άνοιγμα ενός δρομολογίου → τηλεφωνική κράτηση → επιστροφή. Κάθε βήμα πρέπει να δείχνει πράσινο μήνυμα και να προσγειώνεται στη σωστή καρτέλα.

- [ ] **Step 7: Commit και push**

```bash
git add -A && git commit -m "docs(odigos): ο οδηγός περιγράφει τον ενιαίο hub εκδρομών"
git push
```

---

## Self-Review

**Κάλυψη:** «ό,τι έχει το /admin/excursions μέσα στο /admin/tours» → Tasks 2-4 (λίστα + σελίδα λεπτομερειών με τις 4 καρτέλες + δημιουργία). «Να μην αλλάξει τίποτα στο πώς δουλεύει, ειδικά για τον πελάτη» → Global Constraints + Task 6 Step 4 που το **αποδεικνύει** με `git diff`. «Χωρίς κανένα σπασμένο σημείο» → Task 1 (κεντρικοποίηση πριν τη μετακόμιση), Task 5 (ανακατευθύνσεις με διατήρηση query), Task 6 Step 3 (τελική σάρωση).

**Placeholders:** κανένα — κάθε βήμα έχει τον πραγματικό κώδικα ή την πραγματική εντολή.

**Συνέπεια ονομάτων:** `POYLMAN_LIST`, `poylmanHref`, `poylmanTabHref` ορίζονται στο Task 1 και χρησιμοποιούνται αυτούσια στα Tasks 2-6. Το κλειδί καρτέλας `poylman` είναι ίδιο σε σελίδα, helper και οδηγό. Τα υπάρχοντα κλειδιά `ekdromes`/`katigories` δεν αλλάζουν.

**Γνωστές παγίδες που καλύφθηκαν:** το `flashQuery()` σε URL που έχει ήδη `?` (Task 1), τα relative imports μετά τη μετακόμιση (Task 4 Step 2), η αλυσίδα δύο ανακατευθύνσεων από τα παλιά stubs (Task 5 Step 3), και η επιβάρυνση της κύριας καρτέλας από περιττά queries (Task 3 Step 2).
