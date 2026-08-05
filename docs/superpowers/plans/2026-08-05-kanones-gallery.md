# Νέοι κανόνες διάταξης gallery — Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Με 3 ή 4 φωτογραφίες η σελίδα της εκδρομής δείχνει **μία** φωτογραφία και ένα κουμπί που ανοίγει τις υπόλοιπες, αντί για σειρά τριών ή τεσσάρων.

**Architecture:** Ο κανόνας ζει ήδη σε μία καθαρή συνάρτηση, `galleryLayout(count)` στο `lib/gallery.ts`, και το component απλώς τον ακολουθεί. Άρα η αλλαγή είναι δύο γραμμές στη συνάρτηση, η αφαίρεση των δύο παραλλαγών που μένουν αχρησιμοποίητες (`trio`, `quad`), και η αντίστοιχη απλοποίηση του component.

**Tech Stack:** TypeScript, React 19 client component, vitest + @testing-library/react.

## Global Constraints

- Χωρίς νέα npm dependencies.
- Όλα τα κείμενα στα ελληνικά· Tailwind inline, μόνο theme tokens.
- Node δεν υπάρχει global. Πριν από κάθε npm/npx:
  `export PATH="/private/tmp/claude-501/-Users-marios-Desktop-Projects-serigiannis-main/7dd49705-4a6a-426d-837c-352b391a5f07/scratchpad/node-v22.14.0-darwin-arm64/bin:$PATH"`
- Gates: `npm run test:run` (180 περνούν τώρα), `npx tsc --noEmit`, `npm run lint`, `npm run build`.
- Commits ως `marioskifokeris@hotmail.com`. Χωρίς push.

## Οι κανόνες, πριν και μετά

| Φωτογραφίες | Σήμερα | Ζητούμενο |
|---|---|---|
| 0 | τίποτα | τίποτα (αμετάβλητο) |
| 1 | μία | μία (αμετάβλητο) |
| 2 | δύο δίπλα-δίπλα | δύο δίπλα-δίπλα (αμετάβλητο) |
| 3 | **τρεις σε σειρά** | **μία + κουμπί «Δείτε και τις 3»** |
| 4 | **τέσσερις σε σειρά** | **μία + κουμπί «Δείτε και τις 4»** |
| 5+ | 1 μεγάλη + 4 μικρές + πιλάκι | ίδιο (αμετάβλητο) |

Το carousel στο κινητό δεν αλλάζει καθόλου: εκεί ο πελάτης σέρνει και βλέπει όλες τις φωτογραφίες ανεξάρτητα από το πλήθος. Οι κανόνες αφορούν μόνο την προβολή σε υπολογιστή.

## Αποφάσεις (υποθέσεις — πείτε το αν κάποια είναι λάθος)

1. **Το κουμπί είναι το ίδιο πιλάκι που ήδη χρησιμοποιείται στις 5+**, δηλαδή «Δείτε και τις N» πάνω στη φωτογραφία, κάτω δεξιά. Δεν φτιάχνουμε δεύτερο είδος κουμπιού: είναι η ίδια ενέργεια (άνοιγμα του lightbox), και ο πελάτης που έμαθε το ένα ξέρει και το άλλο. Ολόκληρη η φωτογραφία παραμένει πατήσιμη, όπως τώρα.
2. **Οι παραλλαγές `trio` και `quad` αφαιρούνται** από τον τύπο και από το component αντί να μείνουν αχρησιμοποίητες. Νεκρός κώδικας σε union type είναι παγίδα για τον επόμενο που θα το διαβάσει.
3. **Η φωτογραφία που δείχνεται είναι η πρώτη**, δηλαδή το εξώφυλλο — το `galleryImages()` ήδη βάζει το εξώφυλλο πρώτο.

---

## File Structure

- **Modify** `lib/gallery.ts` — ο κανόνας και ο τύπος `GalleryVariant`.
- **Modify** `tests/gallery.test.ts` — οι υπάρχουσες προσδοκίες για 3 και 4.
- **Modify** `components/trips/TourGallery.tsx` — αφαίρεση του κλάδου trio/quad.
- **Modify** `tests/tour-gallery.test.tsx` — η υπάρχουσα δοκιμή των 3 φωτογραφιών.

Ένα task: ο κανόνας και το component είναι ένα παραδοτέο — αν αλλάξει μόνο ο ένας, ο τύπος και το component δεν συμφωνούν και το `tsc` κοκκινίζει.

---

## Task 1: Νέος κανόνας για 3 και 4 φωτογραφίες

**Files:**
- Modify: `lib/gallery.ts`, `components/trips/TourGallery.tsx`
- Test: `tests/gallery.test.ts`, `tests/tour-gallery.test.tsx`

**Interfaces:**
- Consumes: τίποτα από άλλα tasks.
- Produces: `galleryLayout(count)` επιστρέφει `variant: 'single' | 'duo' | 'hero'` — οι τιμές `'trio'` και `'quad'` παύουν να υπάρχουν.

- [ ] **Step 1: Άλλαξε τα υπάρχοντα tests ώστε να αποτύχουν**

Στο `tests/gallery.test.ts`, αντικατέστησε το test «2–4 photos → duo/trio/quad» με αυτά τα δύο:

```ts
  it('2 photos → duo, both visible, no See-all', () => {
    expect(galleryLayout(2)).toEqual({ variant: 'duo', visibleCount: 2, showSeeAll: false });
  });

  it('3–4 photos → one photo plus the See-all button', () => {
    expect(galleryLayout(3)).toEqual({ variant: 'single', visibleCount: 1, showSeeAll: true });
    expect(galleryLayout(4)).toEqual({ variant: 'single', visibleCount: 1, showSeeAll: true });
  });
```

Στο `tests/tour-gallery.test.tsx`, αντικατέστησε το test «shows every photo and no pill when there are three» με:

```ts
  it('shows one cell and the See-all pill when there are three', () => {
    render(<TourGallery images={photos(3)} />);
    expect(screen.getAllByTestId('gallery-cell')).toHaveLength(1);
    expect(screen.getByText('Δείτε και τις 3')).toBeInTheDocument();
  });

  it('still lists all three photos in the lightbox', () => {
    render(<TourGallery images={photos(3)} />);
    expect(screen.getAllByTestId('lightbox-photo')).toHaveLength(3);
  });
```

- [ ] **Step 2: Τρέξε τα, πρέπει να αποτύχουν**

```bash
npx vitest run tests/gallery.test.ts tests/tour-gallery.test.tsx
```

Αναμενόμενο: αποτυχία με `variant: 'trio'` αντί `'single'` στο πρώτο αρχείο, και «expected length 1, received 3» στο δεύτερο.

- [ ] **Step 3: Άλλαξε τον κανόνα**

Στο `lib/gallery.ts`, ο τύπος:

```ts
export type GalleryVariant = 'single' | 'duo' | 'hero';
```

και η συνάρτηση:

```ts
/** Map a photo count (assumed ≥ 0) to its desktop gallery layout.
 *  1 → μία· 2 → δύο δίπλα-δίπλα· 3–4 → μία με το κουμπί «Δείτε και τις N»,
 *  γιατί μια σειρά από τρεις μικρές φωτογραφίες δεν έδειχνε καμία τους καλά·
 *  5+ → το πλέγμα με τη μεγάλη και τις τέσσερις μικρές. */
export function galleryLayout(count: number): GalleryLayout {
  if (count <= 1) return { variant: 'single', visibleCount: count <= 0 ? 0 : 1, showSeeAll: false };
  if (count === 2) return { variant: 'duo', visibleCount: 2, showSeeAll: false };
  if (count <= 4) return { variant: 'single', visibleCount: 1, showSeeAll: true };
  // 5+ → signature hero grid; extras are reachable through the lightbox.
  return { variant: 'hero', visibleCount: 5, showSeeAll: true };
}
```

- [ ] **Step 4: Απλοποίησε το component**

Στο `components/trips/TourGallery.tsx`, ο τελευταίος κλάδος του desktop grid χειρίζεται σήμερα `duo | trio | quad` με πίνακα κλάσεων. Μόνο το `duo` απομένει. Αντικατέστησε τον κλάδο ώστε να ρενδάρει δύο κελιά σε δύο στήλες:

```tsx
        ) : (
          <div className="grid grid-cols-2 gap-2">
            {visible.map((image, i) => cell(image, i, '(max-width: 768px) 0px, 50vw', 'aspect-[4/3]'))}
          </div>
        )}
```

Ο κλάδος `single` και ο κλάδος `hero` μένουν ακριβώς όπως είναι. Το πιλάκι εμφανίζεται ήδη στο τελευταίο ορατό κελί μέσω `layout.showSeeAll && index === layout.visibleCount - 1`, οπότε με `visibleCount: 1` πέφτει σωστά πάνω στη μοναδική φωτογραφία — μην το πειράξεις.

Πρόσεξε ότι το `single` κελί έχει σήμερα `sizes="(max-width: 768px) 0px, 768px"` και `max-w-3xl` γύρω του. Με 3–4 φωτογραφίες αυτή η μία φωτογραφία γίνεται η κύρια εικόνα της σελίδας, άρα βγάλε τον περιορισμό πλάτους ώστε να πιάνει όλο το πλάτος όπως το πλέγμα των 5+, και διόρθωσε το `sizes` σε `'(max-width: 768px) 0px, 100vw'`. Αυτό ισχύει και για την περίπτωση της μίας μόνο φωτογραφίας — μια μοναδική φωτογραφία κεντραρισμένη σε 768px δίπλα σε πλήρους πλάτους περιεχόμενο έδειχνε χαμένη.

- [ ] **Step 5: Τρέξε τα tests, πρέπει να περνούν**

```bash
npx vitest run tests/gallery.test.ts tests/tour-gallery.test.tsx
```

- [ ] **Step 6: Όλα τα gates**

```bash
npm run test:run && npx tsc --noEmit && npm run lint && npm run build
```

Το `tsc` είναι εδώ ο φύλακας: αν έμεινε κάπου αναφορά στα `'trio'` ή `'quad'`, θα το πει.

- [ ] **Step 7: Commit**

```bash
git add lib/gallery.ts components/trips/TourGallery.tsx tests/gallery.test.ts tests/tour-gallery.test.tsx
git commit -m "feat(gallery): μία φωτογραφία και κουμπί για 3-4 φωτογραφίες"
```

---

## Χειροκίνητος έλεγχος (controller)

Με τα δεδομένα που υπάρχουν σήμερα: η εκδρομή «Μονή Αγίου Παϊσίου» έχει **4 φωτογραφίες**, άρα είναι ακριβώς η περίπτωση που αλλάζει — μετά το deploy πρέπει να δείχνει μία φωτογραφία με το πιλάκι «Δείτε και τις 4», και το πάτημα να ανοίγει το lightbox με όλες.
