# Πλήρης έλεγχος admin + πελάτη — Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development or superpowers:executing-plans. Steps use checkbox (`- [ ]`) syntax.

**Goal:** Να αποδειχθεί ότι μετά τις αλλαγές των τελευταίων ημερών (στάσεις ανά επιβάτη, email ανά επιβάτη, διορθώσεις admin, ενοποίηση εκδρομών) δεν έχει σπάσει τίποτα — ούτε στο admin ούτε στην πλευρά του πελάτη.

**Architecture:** Τρία επίπεδα ελέγχου, από το φθηνότερο στο ακριβότερο. (1) **Στατικό**: typecheck, lint, build. (2) **Αυτοματοποιημένο**: ~40 νέα vitest tests πάνω στην καθαρή λογική που δεν καλύπτεται σήμερα. (3) **Ζωντανό**: HTTP έλεγχοι στις δημόσιες σελίδες και end-to-end κρατήσεις μέσω των RPC στη βάση — που πιάνουν ό,τι δεν πιάνει το κλικ, γιατί χτυπούν τον server απευθείας.

**Tech Stack:** vitest + Testing Library, curl, Supabase Management API.

## Global Constraints

- **Καμία αλλαγή παραγωγικού κώδικα.** Μόνο νέα αρχεία tests. Αν ένας έλεγχος αποκαλύψει σφάλμα, καταγράφεται — δεν διορθώνεται μέσα σε αυτό το πλάνο.
- Οι ζωντανές δοκιμές γίνονται **μόνο** πάνω στη «ΔΟΚΙΜΑΣΤΙΚΗ ΕΚΔΡΟΜΗ» και τη «ΔΟΚΙΜΑΣΤΙΚΗ ΕΚΔΡΟΜΗ ΠΟΥΛΜΑΝ» — ποτέ σε πραγματική εκδρομή ή θέση πελάτη.
- Το admin απαιτεί σύνδεση: οι σελίδες του ελέγχονται με tests στα components/pure helpers και με έλεγχο ότι απαντούν (ανακατεύθυνση σε login, όχι 500).

---

## Task 1: Στατικός έλεγχος

- [ ] `npx tsc --noEmit` → 0 σφάλματα
- [ ] `npx oxlint` → καθαρό
- [ ] `npx vitest run` → όλα πράσινα (baseline 279)
- [ ] `npm run build` → Compiled successfully

## Task 2: 40 νέα αυτοματοποιημένα tests

Νέο `tests/regression-full.test.ts` (ή χωρισμένα ανά τομέα). Καλύπτει **κενά** — όχι επανάληψη υπαρχόντων:

**Admin (20)** — φίλτρα λίστας εκδρομών ανά κατηγορία/αναζήτηση με ελληνικά και τόνους· `nextFreeSeat` σε γεμάτο/άδειο/μεσαίο λεωφορείο· `takenSeatNumbers` με ληγμένο hold· `parseBoardingPoints` όρια· `setupChecklist` όλοι οι συνδυασμοί· `poylmanHref`/`withFlash`· `searchNormalize` με τελικό σίγμα· `kanonikoCents` χωρίς ενεργό ναύλο.

**Πελάτης (20)** — `buildTourCheckoutSchema` και `buildSchema` σε κάθε συνδυασμό στάσης/email· `passengerRecipients` edge cases· `bookableDepartures` με σημερινή/χθεσινή ημερομηνία· `farePriceForKind` για τα 3 είδη· `computeBookingTotal`· `filterTours`/`sortTours`· `refundPolicyText`· `resolveInitialRoute`.

## Task 3: Ζωντανοί έλεγχοι δημόσιων σελίδων

- [ ] HTTP 200 σε: `/`, `/ekdromes`, `/ekdromes/monoimeres`, `/tour/dokimastiki-ekdromi`, `/eisitiria`, `/enoikiaseis-poylman`, `/nea`, `/epikoinonia`, `/kroyazieres`, `/istoriko-ekdromon`, `/admin/login`
- [ ] Η δοκιμαστική εκδρομή δείχνει widget κράτησης, τιμές, ημερομηνίες, φωτογραφίες
- [ ] Η σελίδα πούλμαν δείχνει τη φόρμα προσφοράς
- [ ] 404 σε ανύπαρκτο slug, με προτάσεις

## Task 4: End-to-end κρατήσεις στη βάση

- [ ] Κράτηση εκδρομής: λείπει στάση → απόρριψη· άκυρη στάση → απόρριψη· έγκυρες → ok, αποθηκευμένες ανά επιβάτη
- [ ] Κράτηση εισιτηρίων: λείπει στάση → απόρριψη· έγκυρες → εκδίδονται εισιτήρια με στάση και email ανά επιβάτη
- [ ] Ακεραιότητα: καμία θέση κολλημένη, κανένα εισιτήριο χωρίς δρομολόγιο, καμία ορφανή εγγραφή

## Task 5: Αναφορά

Κατάλογος ευρημάτων με σοβαρότητα, ή ρητή δήλωση ότι δεν βρέθηκε τίποτα.
