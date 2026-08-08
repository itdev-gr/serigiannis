# Διάταξη σελίδας εκδρομής κατά το πρότυπο findtourin — Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: superpowers:subagent-driven-development ή superpowers:executing-plans.

**Goal:** Η σελίδα `/tour/<slug>` να αποκτήσει τη δομή και τον ρυθμό της σελίδας εκδρομής του `findtourin-main`, με τα δεδομένα που ήδη έχουμε.

**Architecture:** Καθαρά παρουσιαστική αλλαγή στη δημόσια σελίδα εκδρομής και στα components της. Καμία αλλαγή σε βάση, RPC, admin ή κρατήσεις στη Φάση 1.

## Global Constraints

- **Καμία αλλαγή στη βάση και στις κρατήσεις.** Το `TourBookingWidget` και οι τρεις κλάδοι της δεξιάς στήλης (κρατήσιμη / κλειστή / φόρμα αιτήματος) μένουν λειτουργικά ως έχουν — αλλάζει μόνο το κέλυφός τους.
- Γλώσσα: ελληνικά. Χρώματα/γραμματοσειρές: **τα δικά μας tokens** (`primary`, `cta`, `gold`, `olive`, `muted`, `border`, `surface`) — δεν αντιγράφουμε το indigo/serif του findtourin.
- Το κινητό δεν χειροτερεύει: κάθε νέο μπλοκ στοιβάζεται καθαρά.
- Τέλος: `tsc`, `oxlint`, `vitest` (642 baseline), `build` πράσινα.

---

## Τι υπάρχει και τι λείπει

Το findtourin έχει μία στήλη `max-w-7xl` με `mt-16` ανάμεσα στα μπλοκ και **flex `1fr / 380px`** με sticky sidebar. Εμείς έχουμε εναλλασσόμενες full-bleed ζώνες `py-16 md:py-24` και `grid lg:grid-cols-12` (7/5).

**Δεδομένα που ΕΧΟΥΜΕ:** `summary`, `duration_label`, `departure_note`, `meeting_point` + `meeting_points[]`, `price_from`/`price_original`, κατηγορίες, φωτογραφίες, τιμοκατάλογος (`tour_price_tiers`), ημερομηνίες (`tour_departures`).

**Δεδομένα που ΔΕΝ έχουμε:** highlights, «τι περιλαμβάνεται / δεν περιλαμβάνεται», κριτικές. → Φάση 2.

---

## Φάση 1 — χωρίς αλλαγές στη βάση

### 1. Κεφαλίδα σελίδας — `app/(site)/tour/[slug]/page.tsx`

Κάτω από το `PageHeading` (που κρατά breadcrumbs + H1) προστίθενται, με τη σειρά του προτύπου:

- **Σειρά ετικετών** πάνω από τον τίτλο: κατηγορία (`rounded-full bg-primary/10 px-3 py-1 text-sm font-semibold text-primary`) και μία ετικέτα εμπιστοσύνης σε `olive` («Κρατήσεις απευθείας από το γραφείο»). Το `PageHeading` δέχεται νέο προαιρετικό prop `badges?: ReactNode`.
- **Σειρά στοιχείων με εικονίδια** (`mt-3.5 flex flex-wrap items-center gap-x-5 gap-y-2 text-sm text-muted`, εικονίδια `h-[17px] w-[17px]`): διάρκεια (`duration_label`), αναχωρήσεις (`departure_note`), σημείο συνάντησης, και «από {price_from}€» με την τιμή `font-semibold text-body`.
- **Παράγραφος με μια ματιά**: το `summary` σε `mt-4 max-w-3xl text-[15px] leading-relaxed text-body`.

### 2. Gallery — ίδια γεωμετρία με το πρότυπο

`lib/gallery.ts` + `components/trips/TourGallery.tsx`:
- Προστίθενται variants **`trio`** (3 στήλες) και **`quad`** (4 στήλες), όπως στο πρότυπο. Ο πίνακας γίνεται: 1 → `single`, 2 → `duo`, 3 → `trio`, 4 → `quad`, 5+ → `hero` (1 μεγάλη + 2×2).
- **Όλα τα κελιά γίνονται `aspect-square`** (σήμερα `aspect-[4/3]`) — αυτό είναι που κάνει τις εικόνες να «χωράνε» ομοιόμορφα στα πλαίσιά τους.
- Ο εξωτερικός περιέκτης `overflow-hidden rounded-2xl`, τα κελιά **χωρίς** δικές τους στρογγυλές γωνίες, `gap-2`.
- `single` → κεντραρισμένο `max-w-[500px] aspect-square`.
- Το κουμπί «Δείτε και τις N» μένει **πραγματικό `<button>`** αδελφός του πλέγματος (καλύτερο από το πρότυπο, που έχει μη-διαδραστικό span) στο `absolute bottom-3 right-3`.
- Κινητό: το καρουζέλ γίνεται `aspect-square` για συνέπεια.

### 3. Αριστερή στήλη — ρυθμός με λεπτές γραμμές

Νέο `components/trips/TourInfo.tsx` (server component) με ρίζα `divide-y divide-border`, κάθε ενότητα `py-8 first:pt-0`, H2 `text-xl font-bold text-primary`:

- **Περιγραφή** — το `summary`/`body` σε `max-w-[64ch] space-y-3.5 text-[15.5px] leading-relaxed text-muted`.
- **Καλό να ξέρετε** — `grid grid-cols-2 gap-3 md:grid-cols-4`, τέσσερα πλακίδια `rounded-2xl border border-border bg-background/60 p-4`: Διάρκεια, Αναχωρήσεις, Σημείο συνάντησης, Κατηγορία. Ετικέτα `text-xs uppercase tracking-wide text-muted`, τιμή `font-bold text-body`.
- **Σημεία επιβίβασης** — όταν `meeting_points.length > 0`, λίστα γραμμών `flex items-start gap-3 rounded-2xl border border-border bg-background/60 p-4` με εικονίδιο `MapPin`. Χρήσιμο και εμπορικά: ο επισκέπτης βλέπει από πού φεύγει.

Οι τρεις hardcoded bullets της σημερινής σελίδας αφαιρούνται — τις αντικαθιστά η σειρά εικονιδίων της κεφαλίδας.

### 4. Συχνές ερωτήσεις — νέο `components/trips/TourFaq.tsx`

Native `<details>` accordion, χωρίς JS, ακριβώς όπως το πρότυπο: `max-w-3xl`, `divide-y divide-border border-y border-border`, κάθε `<details className="group py-5">` με `<summary>` `flex min-h-11 items-center justify-between` και chevron `group-open:rotate-180`.

Οι ερωτήσεις **παράγονται από τα υπάρχοντα δεδομένα** (όπως κάνει και το πρότυπο): πώς γίνεται η κράτηση, τι περιλαμβάνει η τιμή, από πού φεύγει, τι ισχύει για ακυρώσεις. Καθαρή συνάρτηση `tourFaqs(tour)` σε `lib/tour-faq.ts` ώστε να ελέγχεται με tests.

Προστίθεται και `FAQPage` JSON-LD δίπλα στα υπάρχοντα δύο script blocks.

### 5. Δεξιά στήλη

Το `grid lg:grid-cols-12` (7/5) αντικαθίσταται από `flex flex-col gap-10 lg:flex-row` με `min-w-0 flex-1` + `w-full lg:w-[380px] shrink-0`, όπως το πρότυπο. Το sticky wrapper κρατά το **δικό μας** offset (`lg:top-40`) λόγω του ψηλότερου navbar.

Η κάρτα αποκτά το κέλυφος του προτύπου: `rounded-2xl border border-border bg-surface p-6 shadow-card`. Το περιεχόμενο (widget κράτησης / «κλειστές κρατήσεις» / τιμή + φόρμα) **δεν αλλάζει**.

### 6. Παρόμοιες εκδρομές

`md:grid-cols-2 lg:grid-cols-4` και **4 κάρτες** αντί για 3, με κεφαλίδα σε γραμμή με σύνδεσμο «Δείτε όλες →» προς τον κατάλογο.

### 7. Tests

- `tests/gallery.test.ts` — ο νέος πίνακας variants (trio/quad).
- `tests/tour-gallery.test.tsx` — 3 φωτο → 3 κελιά σε trio, 4 → quad, 6 → hero + κουμπί.
- Νέο `tests/tour-faq.test.ts` για το `tourFaqs()` (με/χωρίς τιμή, με/χωρίς στάσεις, καμία διπλή ερώτηση).
- Νέο `tests/tour-info.test.tsx` — τα πλακίδια δείχνουν μόνο όσα πεδία υπάρχουν, καμία κενή γραμμή.

---

## Φάση 2 — χρειάζεται απόφαση (δεν εκτελείται τώρα)

Τα παρακάτω του προτύπου **δεν γίνονται χωρίς νέα δεδομένα**:

- **Highlights** και **«Τι περιλαμβάνεται / δεν περιλαμβάνεται»** → χρειάζονται δύο νέες στήλες `text[]` στο `tours` και πεδία στη φόρμα του admin.
- **Κριτικές** → νέος πίνακας, φόρμα υποβολής, έλεγχος από το γραφείο, `aggregateRating` στο JSON-LD.

Και τα δύο είναι υπαρκτή αξία (και SEO), αλλά είναι ξεχωριστό έργο με migration και δουλειά στο admin.

---

## Verification

1. `npm run dev` → `/tour/<slug>` με εκδρομή που έχει 1, 2, 3, 4, 6 φωτογραφίες: σωστό πλέγμα κάθε φορά, τετράγωνα κελιά, ενιαία στρογγυλή γωνία, κουμπί μόνο όταν κρύβονται φωτογραφίες.
2. Εκδρομή **με** τιμές → widget κράτησης· **χωρίς** τιμές → φόρμα αιτήματος· **κλειστή** → μήνυμα. Και οι τρεις μέσα στη νέα κάρτα, sticky, χωρίς να μπαίνουν κάτω από το menu.
3. Οι Συχνές Ερωτήσεις ανοιγοκλείνουν χωρίς JS και εμφανίζονται στο JSON-LD (έλεγχος στο Rich Results Test).
4. Κινητό 390px: όλα στοιβάζονται, καμία οριζόντια κύλιση.
5. `npx tsc --noEmit`, `npx oxlint`, `npx vitest run`, `npm run build` πράσινα.
