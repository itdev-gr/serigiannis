# Ανέβασμα φωτογραφιών που δουλεύει — Implementation Plan

**Goal:** Το γραφείο ανεβάζει φωτογραφίες από κινητό ή υπολογιστή χωρίς να σκέφτεται μέγεθος, και όταν κάτι φταίει το βλέπει γραμμένο.

**Architecture:** Τρία στρώματα. (α) Ο πραγματικός φραγμός — το default 1MB των Next.js Server Actions — ανεβαίνει στο `next.config.mjs`. (β) Ένα νέο client component συρρικνώνει κάθε εικόνα στον browser πριν φύγει, οπότε ακόμη και φωτογραφία 12MB από κινητό φτάνει ~500KB· η καθαρή λογική (έλεγχος τύπου/μεγέθους, υπολογισμός διαστάσεων) ζει σε `lib/upload.ts` και δοκιμάζεται με unit tests. (γ) Το `addTourImages` επιστρέφει αποτέλεσμα αντί να καταπίνει σφάλματα σε `console.error`, ώστε το UI να δείχνει τι πέτυχε και τι όχι.

**Tech Stack:** Next.js 16, React 19 client component, Canvas API για τη συρρίκνωση, Supabase Storage, vitest.

## Global Constraints

- Χωρίς νέα npm dependencies — η συρρίκνωση γίνεται με `createImageBitmap` + `<canvas>`.
- Όλα τα κείμενα στα ελληνικά.
- Tailwind inline classes, μόνο theme tokens (`primary`, `cta`, `gold`, `surface`, `background`, `body`, `muted`, `border`, `olive`, `deep-ink`).
- Node δεν υπάρχει global. Πριν από κάθε npm/npx:
  `export PATH="/private/tmp/claude-501/-Users-marios-Desktop-Projects-serigiannis-main/7dd49705-4a6a-426d-837c-352b391a5f07/scratchpad/node-v22.14.0-darwin-arm64/bin:$PATH"`
- Επαλήθευση ανά task: `npm run test:run`, `npx tsc --noEmit`, `npm run lint`. Το τελευταίο task τρέχει και `npm run build`.
- Commits ως `marioskifokeris@hotmail.com` (ήδη ρυθμισμένο). Χωρίς push.

## Αποφάσεις

1. **Όριο Server Action: 15MB.** Οι εικόνες φεύγουν συρρικνωμένες, αλλά το όριο μετράει το σύνολο του request — 15MB χωράει άνετα πολλαπλό ανέβασμα.
2. **Συρρίκνωση σε 2400px μεγάλης πλευράς, JPEG ποιότητα 0.85.** Το πλέγμα της gallery δείχνει το πολύ ~1216px· τα 2400 αφήνουν περιθώριο για retina χωρίς σπατάλη.
3. **Δεκτοί τύποι: JPEG, PNG, WebP.** HEIC από iPhone δεν αποκωδικοποιείται από τον browser — απορρίπτεται με ρητό μήνυμα και οδηγία («στείλτε τη ως JPG»).
4. **Όριο αρχείου πριν τη συρρίκνωση: 25MB**, ώστε ένα κατά λάθος RAW να μη ρίξει τον browser.
5. Οι φωτογραφίες παραμένουν ό,τι διαστάσεις έχουν — δεν κόβουμε σε 4:3. Το πλέγμα κάνει `object-cover`. Η οδηγία στο UI λέει «οριζόντιες» γιατί έτσι δείχνουν καλύτερα, δεν το επιβάλλει.

---

## Task 1: Καθαρή λογική uploads + tests

**Files:** Create `lib/upload.ts`, `tests/upload.test.ts`

**Produces:** `UPLOAD_RULES`, `validateUploadFile(file)`, `scaledDimensions(w, h, max)`, `uploadRulesText()` — τα καταναλώνει το Task 2.

- [ ] **Step 1: Το failing test**

`tests/upload.test.ts`:

```ts
import { describe, it, expect } from 'vitest';
import { UPLOAD_RULES, scaledDimensions, uploadRulesText, validateUploadFile } from '@/lib/upload';

describe('validateUploadFile', () => {
  it('δέχεται JPEG, PNG και WebP μέσα στο όριο', () => {
    for (const type of ['image/jpeg', 'image/png', 'image/webp']) {
      expect(validateUploadFile({ name: 'a.jpg', type, size: 5_000_000 })).toEqual({ ok: true });
    }
  });

  it('απορρίπτει HEIC με οδηγία, όχι με κωδικό', () => {
    const res = validateUploadFile({ name: 'IMG_1234.HEIC', type: 'image/heic', size: 3_000_000 });
    expect(res.ok).toBe(false);
    if (!res.ok) expect(res.message).toMatch(/JPG/);
  });

  it('απορρίπτει ό,τι δεν είναι εικόνα', () => {
    const res = validateUploadFile({ name: 'programma.pdf', type: 'application/pdf', size: 100_000 });
    expect(res.ok).toBe(false);
  });

  it('απορρίπτει αρχείο πάνω από το όριο', () => {
    const res = validateUploadFile({ name: 'raw.jpg', type: 'image/jpeg', size: UPLOAD_RULES.maxBytes + 1 });
    expect(res.ok).toBe(false);
    if (!res.ok) expect(res.message).toMatch(/MB/);
  });

  it('δέχεται αρχείο ακριβώς στο όριο', () => {
    expect(validateUploadFile({ name: 'a.jpg', type: 'image/jpeg', size: UPLOAD_RULES.maxBytes }).ok).toBe(true);
  });
});

describe('scaledDimensions', () => {
  it('σμικρύνει τη μεγάλη πλευρά στο όριο και κρατά την αναλογία', () => {
    expect(scaledDimensions(4000, 3000, 2400)).toEqual({ width: 2400, height: 1800 });
    expect(scaledDimensions(3000, 4000, 2400)).toEqual({ width: 1800, height: 2400 });
  });

  it('δεν μεγεθύνει ποτέ', () => {
    expect(scaledDimensions(800, 600, 2400)).toEqual({ width: 800, height: 600 });
  });

  it('στρογγυλοποιεί σε ακέραια pixel', () => {
    const { width, height } = scaledDimensions(3333, 2001, 2400);
    expect(Number.isInteger(width)).toBe(true);
    expect(Number.isInteger(height)).toBe(true);
  });

  it('αντέχει μηδενικές διαστάσεις χωρίς NaN', () => {
    expect(scaledDimensions(0, 0, 2400)).toEqual({ width: 0, height: 0 });
  });
});

describe('uploadRulesText', () => {
  it('αναφέρει τύπους, ελάχιστο πλάτος και όριο μεγέθους', () => {
    const text = uploadRulesText();
    expect(text).toMatch(/JPG/);
    expect(text).toMatch(/1600/);
    expect(text).toMatch(/25 MB/);
  });
});
```

- [ ] **Step 2: Τρέξε το, πρέπει να αποτύχει** — `npx vitest run tests/upload.test.ts` → `Failed to resolve import "@/lib/upload"`.

- [ ] **Step 3: Η υλοποίηση**

`lib/upload.ts`:

```ts
// Κανόνες και καθαροί υπολογισμοί για το ανέβασμα εικόνων στο admin.
// Χωρίς DOM εδώ — το component (ImageUploader) κάνει την πραγματική
// συρρίκνωση με canvas και δανείζεται αυτές τις αποφάσεις.

export const UPLOAD_RULES = {
  /** Τύποι που αποκωδικοποιεί ο browser για συρρίκνωση. */
  types: ['image/jpeg', 'image/png', 'image/webp'] as const,
  /** Πάνω από αυτό δεν το πιάνουμε καν — προστατεύει τον browser. */
  maxBytes: 25 * 1024 * 1024,
  /** Μεγάλη πλευρά μετά τη συρρίκνωση. */
  maxEdge: 2400,
  /** Ποιότητα JPEG εξόδου. */
  quality: 0.85,
  /** Συνιστώμενο ελάχιστο πλάτος πηγής. */
  minWidth: 1600,
};

export type UploadCheck = { ok: true } | { ok: false; message: string };

/** Έλεγχος πριν καν διαβαστεί το αρχείο. Το μήνυμα πάει αυτούσιο στην οθόνη. */
export function validateUploadFile(file: { name: string; type: string; size: number }): UploadCheck {
  const type = file.type.toLowerCase();
  if (type === 'image/heic' || type === 'image/heif' || /\.hei[cf]$/i.test(file.name)) {
    return { ok: false, message: 'Οι φωτογραφίες HEIC του iPhone δεν υποστηρίζονται. Στείλτε τη φωτογραφία ως JPG.' };
  }
  if (!(UPLOAD_RULES.types as readonly string[]).includes(type)) {
    return { ok: false, message: 'Δεκτές μόνο εικόνες JPG, PNG ή WebP.' };
  }
  if (file.size > UPLOAD_RULES.maxBytes) {
    return { ok: false, message: `Το αρχείο ξεπερνά τα ${Math.round(UPLOAD_RULES.maxBytes / 1024 / 1024)} MB.` };
  }
  return { ok: true };
}

/** Διαστάσεις μετά τη συρρίκνωση: η μεγάλη πλευρά πέφτει στο `max`, ποτέ μεγέθυνση. */
export function scaledDimensions(width: number, height: number, max: number): { width: number; height: number } {
  const longest = Math.max(width, height);
  if (longest <= max || longest === 0) return { width, height };
  const ratio = max / longest;
  return { width: Math.round(width * ratio), height: Math.round(height * ratio) };
}

/** Η οδηγία που διαβάζει ο υπάλληλος πάνω από το κουμπί. */
export function uploadRulesText(): string {
  return `JPG, PNG ή WebP · κατά προτίμηση οριζόντιες, τουλάχιστον ${UPLOAD_RULES.minWidth}px πλάτος · έως ${Math.round(
    UPLOAD_RULES.maxBytes / 1024 / 1024
  )} MB ανά φωτογραφία. Οι μεγάλες φωτογραφίες σμικραίνονται αυτόματα πριν σταλούν.`;
}
```

- [ ] **Step 4: Πράσινο** — `npx vitest run tests/upload.test.ts`, μετά `npx tsc --noEmit`.

- [ ] **Step 5: Commit** — `feat(admin): κανόνες και υπολογισμοί για το ανέβασμα εικόνων`

---

## Task 2: Το όριο του Server Action + αποτέλεσμα από το addTourImages

**Files:** Modify `next.config.mjs`, `app/admin/(dashboard)/actions.ts`

**Produces:** `addTourImages(tourId, formData): Promise<UploadResult>` όπου
`UploadResult = { uploaded: number; failed: { name: string; message: string }[] }` — το καταναλώνει το Task 3.

- [ ] **Step 1: Σήκωσε το όριο**

Στο `next.config.mjs`, μέσα στο `nextConfig`:

```js
  // Τα ανεβάσματα εικόνων περνούν μέσα από Server Action· το default όριο του
  // Next είναι 1MB και έκοβε σιωπηλά κάθε φωτογραφία κινητού.
  experimental: {
    serverActions: { bodySizeLimit: '15mb' },
  },
```

Τρέξε `npm run build` και βεβαιώσου ότι ΔΕΝ εμφανίζεται προειδοποίηση τύπου «Invalid next.config.mjs options detected». Αν εμφανιστεί, το κλειδί έχει μετακινηθεί σε αυτή την έκδοση του Next: βρες τη σωστή θέση στην τεκμηρίωση της εγκατεστημένης έκδοσης (`node_modules/next/package.json` για την έκδοση) και ανάφερέ το στο report.

- [ ] **Step 2: Κάνε το action να μιλάει**

Στο `app/admin/(dashboard)/actions.ts` αντικατέστησε το σώμα του `addTourImages` ώστε να μετράει επιτυχίες και να επιστρέφει αποτυχίες αντί να τις καταπίνει. Κράτησε ό,τι ήδη κάνει (θέση, πρώτη εικόνα ως εξώφυλλο, revalidate):

```ts
export type UploadResult = { uploaded: number; failed: { name: string; message: string }[] };

export async function addTourImages(tourId: string, formData: FormData): Promise<UploadResult> {
  const sb = await createServerClient();
  const failed: { name: string; message: string }[] = [];
  const { data: tour } = await sb.from('tours').select('slug, cover_image_id').eq('id', tourId).maybeSingle();
  if (!tour) return { uploaded: 0, failed: [{ name: '—', message: 'Η εκδρομή δεν βρέθηκε.' }] };

  const files = formData.getAll('files').filter((f): f is File => f instanceof File && f.size > 0);
  const { data: existing } = await sb.from('tour_images').select('position').eq('tour_id', tourId).order('position', { ascending: false }).limit(1);
  let pos = (existing?.[0]?.position ?? -1) + 1;
  let firstNewId: string | null = null;
  let uploaded = 0;

  for (const file of files) {
    const ext = (file.name.split('.').pop() || 'jpg').toLowerCase();
    const path = `${tour.slug}/gallery-${Date.now()}-${pos}.${ext === 'jpeg' ? 'jpg' : ext}`;
    const buf = Buffer.from(await file.arrayBuffer());
    const { error } = await sb.storage.from('tour-images').upload(path, buf, { contentType: file.type || 'image/jpeg', upsert: true });
    if (error) {
      console.error('addTourImages upload:', error.message);
      failed.push({ name: file.name, message: 'Η αποθήκευση απέτυχε. Δοκιμάστε ξανά.' });
      continue;
    }
    const { data: img, error: rowError } = await sb.from('tour_images').insert({ tour_id: tourId, storage_path: path, position: pos }).select('id').single();
    if (rowError || !img) {
      console.error('addTourImages row:', rowError?.message);
      failed.push({ name: file.name, message: 'Η καταχώρηση απέτυχε. Δοκιμάστε ξανά.' });
      continue;
    }
    if (!firstNewId) firstNewId = img.id;
    uploaded++;
    pos++;
  }

  if (!tour.cover_image_id && firstNewId) await sb.from('tours').update({ cover_image_id: firstNewId }).eq('id', tourId);
  revalidatePath(`/admin/tours/${tourId}/edit`);
  revalidatePublic();
  return { uploaded, failed };
}
```

- [ ] **Step 3: Επαλήθευση** — `npx tsc --noEmit` (θα παραπονεθεί για το call site στο `GalleryManager`, το φτιάχνει το Task 3· αν σε μπλοκάρει, κάνε πρώτα το Task 3 και μετά commit μαζί), `npm run lint`.

- [ ] **Step 4: Commit** — `fix(admin): όριο 15MB στα Server Actions και αποτέλεσμα από το ανέβασμα`

---

## Task 3: Ο uploader με συρρίκνωση, πρόοδο και ορατά λάθη

**Files:** Create `components/admin/ImageUploader.tsx`; Modify `components/admin/GalleryManager.tsx`

- [ ] **Step 1: Το component**

`components/admin/ImageUploader.tsx`:

```tsx
'use client';
import { useRef, useState, useTransition } from 'react';
import { ImageUp, TriangleAlert } from 'lucide-react';
import { addTourImages } from '@/app/admin/(dashboard)/actions';
import { UPLOAD_RULES, scaledDimensions, uploadRulesText, validateUploadFile } from '@/lib/upload';

/** Συρρικνώνει την εικόνα στον browser. Επιστρέφει το αρχικό αρχείο αν
 *  κάτι πάει στραβά — καλύτερα μια μεγάλη φωτογραφία παρά καμία. */
async function shrink(file: File): Promise<File> {
  try {
    const bitmap = await createImageBitmap(file);
    const { width, height } = scaledDimensions(bitmap.width, bitmap.height, UPLOAD_RULES.maxEdge);
    if (width === bitmap.width && height === bitmap.height && file.size <= 2 * 1024 * 1024) {
      bitmap.close();
      return file;
    }
    const canvas = document.createElement('canvas');
    canvas.width = width;
    canvas.height = height;
    const ctx = canvas.getContext('2d');
    if (!ctx) return file;
    ctx.drawImage(bitmap, 0, 0, width, height);
    bitmap.close();
    const blob = await new Promise<Blob | null>((resolve) => canvas.toBlob(resolve, 'image/jpeg', UPLOAD_RULES.quality));
    if (!blob) return file;
    const name = file.name.replace(/\.[^.]+$/, '') + '.jpg';
    return new File([blob], name, { type: 'image/jpeg' });
  } catch {
    return file;
  }
}

export function ImageUploader({ tourId }: { tourId: string }) {
  const inputRef = useRef<HTMLInputElement>(null);
  const [status, setStatus] = useState<string | null>(null);
  const [errors, setErrors] = useState<{ name: string; message: string }[]>([]);
  const [pending, startTransition] = useTransition();

  function onFiles(fileList: FileList | null) {
    if (!fileList || fileList.length === 0) return;
    const chosen = Array.from(fileList);
    const rejected: { name: string; message: string }[] = [];
    const accepted: File[] = [];
    for (const file of chosen) {
      const check = validateUploadFile(file);
      if (check.ok) accepted.push(file);
      else rejected.push({ name: file.name, message: check.message });
    }
    setErrors(rejected);
    if (accepted.length === 0) {
      setStatus(null);
      return;
    }

    startTransition(async () => {
      setStatus(`Προετοιμασία ${accepted.length} ${accepted.length === 1 ? 'φωτογραφίας' : 'φωτογραφιών'}…`);
      const prepared = await Promise.all(accepted.map(shrink));
      setStatus('Ανέβασμα…');
      const fd = new FormData();
      for (const file of prepared) fd.append('files', file);
      const res = await addTourImages(tourId, fd);
      setErrors((prev) => [...prev, ...res.failed]);
      setStatus(
        res.uploaded > 0
          ? `Ανέβηκαν ${res.uploaded} ${res.uploaded === 1 ? 'φωτογραφία' : 'φωτογραφίες'}.`
          : 'Δεν ανέβηκε καμία φωτογραφία.'
      );
      if (inputRef.current) inputRef.current.value = '';
    });
  }

  return (
    <div className="grid gap-3">
      <p className="text-[13px] text-muted">{uploadRulesText()}</p>
      <div className="flex flex-wrap items-center gap-4">
        <input
          ref={inputRef}
          type="file"
          multiple
          accept="image/jpeg,image/png,image/webp"
          disabled={pending}
          onChange={(e) => onFiles(e.target.files)}
          className="block text-[14px] text-muted file:mr-4 file:rounded-md file:border-0 file:bg-primary file:px-4 file:py-2 file:font-sans file:text-[13px] file:font-semibold file:text-surface disabled:opacity-50"
        />
        <span className="inline-flex items-center gap-2 text-[14px] text-muted">
          <ImageUp className="h-4 w-4" strokeWidth={1.75} />
          {pending ? status : status ?? 'Διαλέξτε φωτογραφίες'}
        </span>
      </div>
      {errors.length > 0 && (
        <ul className="grid gap-1.5 rounded-md border border-cta/30 bg-cta/5 p-3">
          {errors.map((e, i) => (
            <li key={`${e.name}-${i}`} className="flex items-start gap-2 text-[13px] text-cta">
              <TriangleAlert className="mt-0.5 h-4 w-4 shrink-0" strokeWidth={1.75} />
              <span><strong>{e.name}</strong>, {e.message}</span>
            </li>
          ))}
        </ul>
      )}
    </div>
  );
}
```

- [ ] **Step 2: Σύνδεσέ το**

Στο `components/admin/GalleryManager.tsx` αντικατέστησε ολόκληρη τη `<form action={addTourImages.bind(null, tourId)} …>` με `<ImageUploader tourId={tourId} />` και σβήσε το πλέον αχρησιμοποίητο import του `addTourImages`. Τίποτα άλλο στο αρχείο δεν αλλάζει.

- [ ] **Step 3: Επαλήθευση** — `npm run test:run`, `npx tsc --noEmit`, `npm run lint`, `npm run build`.

- [ ] **Step 4: Commit** — `feat(admin): συρρίκνωση στον browser, πρόοδος και ορατά λάθη στο ανέβασμα`

---

## Task 4: Δεύτερη γραμμή άμυνας στο bucket + οδηγίες στον Οδηγό

**Files:** Create `supabase/migrations/0022_storage_limits.sql`; Modify `data/odigos-content.ts`

- [ ] **Step 1: Το migration**

```sql
-- 0022: όρια στο bucket των εικόνων. Το UI ήδη ελέγχει και συρρικνώνει, αυτό
-- είναι το δίχτυ για ό,τι φτάσει από αλλού (π.χ. απευθείας κλήση API).
update storage.buckets
   set file_size_limit = 26214400,  -- 25 MB, όσο και το όριο του UI
       allowed_mime_types = array['image/jpeg', 'image/png', 'image/webp']
 where id = 'tour-images';
```

- [ ] **Step 2: Οδηγίες στον Οδηγό Χρήσης**

Στο `data/odigos-content.ts`, στην ενότητα με `id: 'kratiseis-ekdromon'`, πρόσθεσε πριν το τελικό `{ kind: 'link', … }`:

```ts
      { kind: 'tip', text: 'Φωτογραφίες: JPG, PNG ή WebP, κατά προτίμηση οριζόντιες, τουλάχιστον 1600px πλάτος. Ανεβάστε τις όπως είναι — το σύστημα τις σμικραίνει μόνο του πριν τις στείλει. Οι φωτογραφίες HEIC του iPhone δεν υποστηρίζονται: στείλτε τις ως JPG (Ρυθμίσεις → Κάμερα → Μορφές → Μέγιστη συμβατότητα).' },
```

- [ ] **Step 3: Επαλήθευση** — `npm run test:run`, `npx tsc --noEmit`, `npm run lint`.

- [ ] **Step 4: Commit** — `feat(admin): όρια στο bucket εικόνων και οδηγίες φωτογραφιών`

---

## Χειροκίνητος έλεγχος μετά το Task 4

Δεν μπορεί να αυτοματοποιηθεί, το κάνει ο controller:
1. Άνοιγμα `/admin/tours/<id>/edit`, ανέβασμα φωτογραφίας >5MB → ανεβαίνει, εμφανίζεται μήνυμα επιτυχίας.
2. Ανέβασμα PDF → απορρίπτεται με μήνυμα, χωρίς να σταλεί τίποτα.
3. Πολλαπλή επιλογή 5 φωτογραφιών → ανεβαίνουν όλες, ο μετρητής λέει 5.
