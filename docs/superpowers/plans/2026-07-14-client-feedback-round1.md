# Client Feedback Round 1 Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Implement the client's feedback: nav restructure, top phone bar with 24ωρο mobile, required phone in contact form, standardized payment methods, trip date + price on ΝΕΑ articles, stable article ordering, and a «Κλείστε Online Θέση» booking flow (lead capture with required seats and a live total price).

**Architecture:** Next.js App Router + Supabase. New `trip_date`/`price` columns on `posts`; a generalized `OnlineBookingForm` (replacing `components/trips/BookingForm.tsx`) rendered on a new `/kratisi` page and on tour pages, submitting `type:'booking'` rows to the existing `leads` table; a top phone strip inside the fixed header driven by settings.

**Tech Stack:** Next.js 16 (App Router, server actions), Supabase (Postgres + RLS), react-hook-form + zod, Tailwind, vitest.

**Spec:** `docs/superpowers/specs/2026-07-14-client-feedback-round1-design.md`

## Global Constraints

- All public copy is Greek. Match existing Tailwind token classes (`primary`, `cta`, `surface`, `muted`, `border`, `deep-ink`, `gold`) and existing component idioms.
- Canonical payment-methods copy: **«Μετρητά, POS, IRIS, Πιστωτικές & Χρεωστικές Κάρτες»**.
- Booking CTA label everywhere: **«Κλείστε Online Θέση»**. Booking is lead capture — no payment processing. The live total is informational.
- 24ωρο mobile: `6976 811 825`. Never hardcode phones in components — read from settings (`lib/queries/settings.ts`), with seed fallback in `data/seed/tours.ts`.
- Supabase project ref `lucwtnzdvcpcdcmfxbqp`. Migrations are files in `supabase/migrations/` AND applied to the remote via the Supabase MCP `apply_migration` tool.
- Tests: `npx vitest run`. Build check: `npx next build`. Commit after each task (message style: `feat(site): …` / `feat(admin): …` as in git log).
- `content.ts` copy is `as const` and may be asserted in `tests/home-sections.test.tsx` / `tests/resolve-content.test.ts` — after copy edits, run vitest and update any assertion that pinned the old string.

---

### Task 1: Nav reorder + relabel (Πούλμαν → Ενοικιάσεις Πούλμαν – Μίνι Βαν)

**Files:**
- Modify: `components/layout/Navbar.tsx:10-17`
- Modify: `components/layout/Footer.tsx:67`

**Interfaces:**
- Produces: nav order Αρχική / Εκδρομές / Ενοικιάσεις Πούλμαν – Μίνι Βαν / Κρουαζιέρες / Επικοινωνία / Νέα (client item 1).

- [ ] **Step 1: Reorder/relabel NAV_ITEMS**

In `components/layout/Navbar.tsx` replace the `NAV_ITEMS` array with:

```tsx
const NAV_ITEMS = [
  { to: '/', label: 'Αρχική', icon: HomeIcon },
  { to: '/ekdromes', label: 'Εκδρομές', icon: MapPin },
  { to: '/enoikiaseis-poylman', label: 'Ενοικιάσεις Πούλμαν – Μίνι Βαν', icon: Bus },
  { to: '/kroyazieres', label: 'Κρουαζιέρες', icon: Ship },
  { to: '/epikoinonia', label: 'Επικοινωνία', icon: Mail },
  { to: '/nea', label: 'Νέα', icon: Newspaper },
];
```

The desktop link class (line ~75) currently uses `px-4`; the new label is long — change `px-4` to `px-3` in that className so six items fit at `lg`. The mobile menu uses `text-3xl` for labels; the long label wraps fine, no change.

- [ ] **Step 2: Update footer link label**

In `components/layout/Footer.tsx` line 67 change `Ενοικίαση Πούλμαν` → `Ενοικιάσεις Πούλμαν – Μίνι Βαν`.

- [ ] **Step 3: Verify**

Run: `npx next build`
Expected: build succeeds. Then `npm run dev`, open `http://localhost:3000` at ~1024px and ~1280px widths: all six items on one row, no overflow.

- [ ] **Step 4: Commit**

```bash
git add components/layout/Navbar.tsx components/layout/Footer.tsx
git commit -m "feat(site): nav order + Ενοικιάσεις Πούλμαν – Μίνι Βαν label per client feedback"
```

---

### Task 2: Top phone bar (settings-driven) with 24ωρο mobile

**Files:**
- Modify: `types/db.ts:67-95` (SettingsData)
- Modify: `data/seed/tours.ts` (seedSettings)
- Modify: `app/admin/(dashboard)/actions.ts:13-39` (saveSettings)
- Modify: `components/admin/SettingsForm.tsx:108-125` (Επικοινωνία tab)
- Modify: `app/(site)/layout.tsx`
- Modify: `components/layout/Navbar.tsx`

**Interfaces:**
- Produces: `SettingsData.phone24h?: string`; `Navbar` props `{ phones?: string[]; phone24h?: string | null }`.
- Consumes: `getSettings()` from `lib/queries/settings.ts`, `telHref()` from `lib/phone.ts`.

- [ ] **Step 1: Add `phone24h` to the settings type + seed**

In `types/db.ts`, inside `SettingsData` after `phones: string[];` add:

```ts
  phone24h?: string; // 24ωρο κινητό, shown in the header top bar
```

In `data/seed/tours.ts`, inside `seedSettings` after the `phones` line add:

```ts
  phone24h: '6976 811 825',
```

- [ ] **Step 2: Save it from the admin settings form**

In `app/admin/(dashboard)/actions.ts` `saveSettings`, after the `phones:` line add:

```ts
    phone24h: opt(g('phone_24h')),
```

In `components/admin/SettingsForm.tsx`, in the Επικοινωνία tab, change the 3-column phone grid to include the new field (4 fields, `sm:grid-cols-2`):

```tsx
          <div className="grid gap-5 sm:grid-cols-2">
            <Field label="Τηλέφωνο 1" name="phone1" defaultValue={settings.phones[0] ?? ''} />
            <Field label="Τηλέφωνο 2" name="phone2" defaultValue={settings.phones[1] ?? ''} />
            <Field label="Τηλέφωνο 3" name="phone3" defaultValue={settings.phones[2] ?? ''} />
            <Field label="Κινητό 24ώρου" name="phone_24h" defaultValue={settings.phone24h ?? ''} placeholder="π.χ. 6976 811 825" />
          </div>
```

- [ ] **Step 3: Pass settings into Navbar from the site layout**

Replace `app/(site)/layout.tsx` with:

```tsx
import { Navbar } from '@/components/layout/Navbar';
import { Footer } from '@/components/layout/Footer';
import { CookieConsent } from '@/components/layout/CookieConsent';
import { getSettings } from '@/lib/queries/settings';

export default async function SiteLayout({ children }: { children: React.ReactNode }) {
  const s = await getSettings();
  // Fallback: settings rows saved before phone24h existed — reuse the first mobile (69…) number.
  const phone24h = s.phone24h ?? s.phones.find((p) => p.replace(/\s/g, '').startsWith('69')) ?? null;
  return (
    <>
      <a href="#main" className="skip-link">Μετάβαση στο περιεχόμενο</a>
      <Navbar phones={s.phones} phone24h={phone24h} />
      {children}
      <Footer />
      <CookieConsent />
    </>
  );
}
```

- [ ] **Step 4: Render the top strip inside the fixed header**

In `components/layout/Navbar.tsx`:

Add imports: `Phone` to the lucide import list, and `import { telHref } from '@/lib/phone';`.

Change the component signature:

```tsx
export function Navbar({ phones = [], phone24h = null }: { phones?: string[]; phone24h?: string | null }) {
```

Inside `<header>` (line ~53), immediately BEFORE the existing `<div className="container flex items-center justify-between gap-4">`, add the strip (collapses on scroll so the compact sticky header stays as-is):

```tsx
        {!scrolled && (
          <div className="border-b border-surface/15">
            <div className="container flex h-9 items-center justify-between gap-4 font-sans text-[13px] text-surface/85">
              <div className="hidden items-center gap-5 sm:flex">
                {phones.map((p) => (
                  <a key={p} href={telHref(p)} className="flex items-center gap-1.5 hover:text-surface">
                    <Phone className="h-3.5 w-3.5" strokeWidth={1.75} /> {p}
                  </a>
                ))}
              </div>
              {phone24h && (
                <a href={telHref(phone24h)} className="flex items-center gap-1.5 font-semibold text-gold hover:text-surface">
                  <Phone className="h-3.5 w-3.5" strokeWidth={1.75} /> 24ωρο: {phone24h}
                </a>
              )}
            </div>
          </div>
        )}
```

Note: at scroll=0 the header is transparent over a dark hero on every page, so `text-surface`/`text-gold` are readable; when scrolled the strip is hidden entirely.

- [ ] **Step 5: Verify**

Run: `npx next build` — succeeds. In dev: phones + «24ωρο: 6976 811 825» visible at top of homepage; strip disappears on scroll; on a ~375px viewport only the 24ωρο number shows; tapping numbers produces `tel:+30…` links.

- [ ] **Step 6: Commit**

```bash
git add types/db.ts data/seed/tours.ts 'app/admin/(dashboard)/actions.ts' components/admin/SettingsForm.tsx 'app/(site)/layout.tsx' components/layout/Navbar.tsx
git commit -m "feat(site): header top bar with office phones + 24ωρο mobile from settings"
```

---

### Task 3: Contact form — phone required

**Files:**
- Modify: `components/contact/ContactForm.tsx:10-17,80-83`

- [ ] **Step 1: Make phone required in schema + UI**

In `ContactSchema` change:

```ts
  phone: z.string().min(8, 'Παρακαλώ συμπληρώστε το τηλέφωνό σας.'),
```

In the JSX change the phone field to:

```tsx
          <Field label="Τηλέφωνο *" error={errors.phone?.message}>
            <input {...register('phone')} type="tel" className={inputCls} placeholder="π.χ. 69X XXX XXXX" />
          </Field>
```

- [ ] **Step 2: Verify**

Run: `npx vitest run` — all pass. In dev, submit `/epikoinonia` form without phone → inline error appears, no lead created.

- [ ] **Step 3: Commit**

```bash
git add components/contact/ContactForm.tsx
git commit -m "feat(forms): require phone on contact form per client feedback"
```

---

### Task 4: Payment methods — standardized copy + PaymentMethods component

**Files:**
- Create: `components/shared/PaymentMethods.tsx`
- Modify: `components/layout/Footer.tsx:102-105`
- Modify: `app/(site)/oroi/page.tsx:13`
- Modify: `components/home/content.ts:33,55`
- Modify: `app/(site)/epikoinonia/page.tsx` (below the form card)

**Interfaces:**
- Produces: `PaymentMethods({ className }: { className?: string })` — light-background badge row, reused on `/kratisi` in Task 10.

- [ ] **Step 1: Create the shared component**

`components/shared/PaymentMethods.tsx`:

```tsx
import { Banknote, CreditCard, Smartphone, Nfc } from 'lucide-react';

const METHODS = [
  { Icon: Banknote, label: 'Μετρητά' },
  { Icon: Nfc, label: 'POS' },
  { Icon: Smartphone, label: 'IRIS' },
  { Icon: CreditCard, label: 'Πιστωτικές & Χρεωστικές Κάρτες' },
];

/** Accepted payment methods (client feedback item 5). Light backgrounds only. */
export function PaymentMethods({ className }: { className?: string }) {
  return (
    <div className={className}>
      <div className="font-sans text-[12px] font-semibold uppercase tracking-[0.14em] text-muted">Τρόποι πληρωμής</div>
      <ul className="mt-3 flex flex-wrap gap-2">
        {METHODS.map(({ Icon, label }) => (
          <li key={label} className="inline-flex items-center gap-2 rounded-full border border-border bg-surface px-3.5 py-1.5 font-sans text-[13px] text-body">
            <Icon className="h-4 w-4 text-primary/70" strokeWidth={1.75} /> {label}
          </li>
        ))}
      </ul>
    </div>
  );
}
```

(If `Nfc` doesn't exist in the installed lucide-react, use `Wallet` instead.)

- [ ] **Step 2: Update the four copy sites**

- `components/layout/Footer.tsx` line 104: `Κάρτα, IRIS, Τραπεζική Κατάθεση` → `Μετρητά, POS, IRIS, Πιστωτικές & Χρεωστικές Κάρτες`.
- `app/(site)/oroi/page.tsx` Πληρωμές section: replace the `p` value with `'Δεκτές πληρωμές με μετρητά, POS, IRIS ή πιστωτική/χρεωστική κάρτα. Η εξόφληση γίνεται πριν την αναχώρηση, εκτός αν συμφωνηθεί διαφορετικά.'`
- `components/home/content.ts` line 33 (trust #4 text): → `'Εξαιρετική σχέση ποιότητας-τιμής, με πληρωμή με μετρητά, POS, IRIS ή κάρτα.'`
- `components/home/content.ts` line 55 (process step 02 text): → `'Κράτηση online, τηλεφωνικά ή στο γραφείο — πληρωμή με μετρητά, POS, IRIS ή κάρτα.'` (removes the false «Κράτηση online με κάρτα» claim)
- `app/(site)/epikoinonia/page.tsx`: import `PaymentMethods` and add `<PaymentMethods className="mt-6" />` directly after the closing `</div>` of the form card (inside the `lg:col-span-7` column).

- [ ] **Step 3: Verify**

Run: `npx vitest run`. If `home-sections.test.tsx`/`resolve-content.test.ts` assert the OLD trust/process strings, update those expectations to the new copy. Then `npx next build`.

Also check with the user later: if the live `settings.legal.terms` override was saved in admin, the Όροι default text won't render — the client should update the saved legal text too (note in handoff).

- [ ] **Step 4: Commit**

```bash
git add components/shared/PaymentMethods.tsx components/layout/Footer.tsx 'app/(site)/oroi/page.tsx' components/home/content.ts 'app/(site)/epikoinonia/page.tsx' tests
git commit -m "feat(site): standardize payment methods (Μετρητά/POS/IRIS/Κάρτες) + PaymentMethods badges"
```

---

### Task 5: De-hardcode the tour-page phone

**Files:**
- Modify: `app/(site)/tour/[slug]/page.tsx:5,10-12,143-145`

- [ ] **Step 1: Read the phone from settings**

Add imports:

```tsx
import { getSettings } from '@/lib/queries/settings';
import { telHref } from '@/lib/phone';
```

In the component, change `const all = await getTours();` to fetch both:

```tsx
  const [all, settings] = await Promise.all([getTours(), getSettings()]);
  const phone = settings.phones[0] ?? null;
```

Replace the hardcoded anchor (lines 143–145) with:

```tsx
              {phone && (
                <a href={telHref(phone)} className="mt-3 flex items-center justify-center gap-2 font-sans text-[14px] font-semibold text-primary hover:text-cta">
                  <Phone className="h-4 w-4" strokeWidth={1.75} /> {phone}
                </a>
              )}
```

- [ ] **Step 2: Verify + commit**

`npx next build` succeeds; a tour page shows the settings phone.

```bash
git add 'app/(site)/tour/[slug]/page.tsx'
git commit -m "fix(site): tour page phone from settings instead of hardcoded number"
```

---

### Task 6: Migration — `posts.trip_date` + `posts.price`

**Files:**
- Create: `supabase/migrations/0006_posts_trip_date_price.sql`

**Interfaces:**
- Produces: nullable `posts.trip_date date`, `posts.price numeric(10,2)` — consumed by Tasks 7–9, 11.

- [ ] **Step 1: Write the migration file**

`supabase/migrations/0006_posts_trip_date_price.sql`:

```sql
-- Client feedback r1: ΝΕΑ articles announce excursions — structured excursion date
-- and per-person price (drives the online-booking live total).
alter table public.posts
  add column if not exists trip_date date,
  add column if not exists price numeric(10,2);
```

- [ ] **Step 2: Apply to the remote project**

Use the Supabase MCP `apply_migration` tool (project `lucwtnzdvcpcdcmfxbqp`, name `posts_trip_date_price`) with the SQL above.

- [ ] **Step 3: Verify**

Use MCP `execute_sql`: `select column_name, data_type from information_schema.columns where table_name = 'posts' and column_name in ('trip_date','price');`
Expected: two rows (`date`, `numeric`).

- [ ] **Step 4: Commit**

```bash
git add supabase/migrations/0006_posts_trip_date_price.sql
git commit -m "feat(db): posts.trip_date + posts.price for excursion articles"
```

---

### Task 7: `published_at` preservation helper (TDD) + admin actions

Fixes the bug where every admin save re-dates a post to "now" (breaks client item 3 — ordering by upload date) and adds the new fields to the write path.

**Files:**
- Create: `lib/posts-publish.ts`
- Test: `tests/posts-publish.test.ts`
- Modify: `types/db.ts:52-65` (Post)
- Modify: `app/admin/(dashboard)/actions.ts:348-400` (upsertPost, setPostStatus)

**Interfaces:**
- Produces: `resolvePublishedAt({ status, submitted, existing }): string | null` — `submitted` is the form's `published_on` (`'YYYY-MM-DD'` or `''`), `existing` the current DB value (`null` for new posts). `Post` type gains `trip_date: string | null; price: number | null;`.
- Consumed by: `upsertPost`/`setPostStatus` here; `PostForm` (Task 8) submits `published_on`, `trip_date`, `price`.

- [ ] **Step 1: Write the failing test**

`tests/posts-publish.test.ts`:

```ts
import { describe, it, expect } from 'vitest';
import { resolvePublishedAt } from '@/lib/posts-publish';

describe('resolvePublishedAt', () => {
  it('uses the explicitly submitted date (noon UTC, stable day in Greece)', () => {
    expect(resolvePublishedAt({ status: 'published', submitted: '2026-03-05', existing: null }))
      .toBe('2026-03-05T12:00:00.000Z');
  });

  it('stamps now on first publish when nothing submitted', () => {
    const out = resolvePublishedAt({ status: 'published', submitted: '', existing: null });
    expect(out).not.toBeNull();
    expect(Math.abs(Date.now() - new Date(out!).getTime())).toBeLessThan(5000);
  });

  it('preserves the existing date on re-save of a published post', () => {
    expect(resolvePublishedAt({ status: 'published', submitted: '', existing: '2026-01-02T10:00:00.000Z' }))
      .toBe('2026-01-02T10:00:00.000Z');
  });

  it('keeps the date when hiding a post (unhide restores ordering)', () => {
    expect(resolvePublishedAt({ status: 'hidden', submitted: '', existing: '2026-01-02T10:00:00.000Z' }))
      .toBe('2026-01-02T10:00:00.000Z');
  });

  it('stays null for a never-published draft', () => {
    expect(resolvePublishedAt({ status: 'draft', submitted: '', existing: null })).toBeNull();
  });
});
```

- [ ] **Step 2: Run test to verify it fails**

Run: `npx vitest run tests/posts-publish.test.ts`
Expected: FAIL — cannot resolve `@/lib/posts-publish`.

- [ ] **Step 3: Implement the helper**

`lib/posts-publish.ts`:

```ts
/**
 * Decide a post's published_at. Never resets an existing date on re-save;
 * an explicit form date always wins; first publish stamps "now".
 */
export function resolvePublishedAt(opts: {
  status: string;
  submitted: string; // 'YYYY-MM-DD' from the admin form, '' when empty
  existing: string | null; // current DB value (null for new posts)
}): string | null {
  if (opts.submitted) return new Date(`${opts.submitted}T12:00:00Z`).toISOString();
  if (opts.status === 'published' && !opts.existing) return new Date().toISOString();
  return opts.existing;
}
```

- [ ] **Step 4: Run test to verify it passes**

Run: `npx vitest run tests/posts-publish.test.ts`
Expected: 5 passed.

- [ ] **Step 5: Extend the `Post` type**

In `types/db.ts`, inside `Post` after `published_at: string | null;` add:

```ts
  trip_date: string | null; // 'YYYY-MM-DD' — ημερομηνία εκδρομής
  price: number | null;     // per-person €, drives booking total
```

- [ ] **Step 6: Rewire `upsertPost` and `setPostStatus`**

In `app/admin/(dashboard)/actions.ts` add the import:

```ts
import { resolvePublishedAt } from '@/lib/posts-publish';
```

Replace the body of `upsertPost` up to (not including) the `let postId = id;` line with:

```ts
  const sb = await createServerClient();
  const id = (formData.get('id') as string) || null;
  const slug = String(formData.get('slug') || '').trim();
  const status = String(formData.get('status') || 'draft');

  let existingPublishedAt: string | null = null;
  if (id) {
    const { data: existing } = await sb.from('posts').select('published_at').eq('id', id).maybeSingle();
    existingPublishedAt = existing?.published_at ?? null;
  }
  const priceRaw = String(formData.get('price') || '').trim();

  const payload = {
    title: String(formData.get('title') || '').trim(),
    slug,
    excerpt: (String(formData.get('excerpt') || '').trim() || null) as string | null,
    body: String(formData.get('body') || '').trim(),
    seo_title: (String(formData.get('seo_title') || '').trim() || null) as string | null,
    seo_description: (String(formData.get('seo_description') || '').trim() || null) as string | null,
    status,
    trip_date: (String(formData.get('trip_date') || '').trim() || null) as string | null,
    price: priceRaw ? Number(priceRaw) : null,
    published_at: resolvePublishedAt({
      status,
      submitted: String(formData.get('published_on') || '').trim(),
      existing: existingPublishedAt,
    }),
  };
```

Replace `setPostStatus` with (publish keeps an existing date; hiding no longer nulls it):

```ts
export async function setPostStatus(id: string, status: string) {
  const sb = await createServerClient();
  const patch: { status: string; published_at?: string } = { status };
  if (status === 'published') {
    const { data } = await sb.from('posts').select('published_at').eq('id', id).maybeSingle();
    if (!data?.published_at) patch.published_at = new Date().toISOString();
  }
  const { error } = await sb.from('posts').update(patch).eq('id', id);
  if (error) console.error('setPostStatus:', error.message);
  revalidatePosts();
}
```

- [ ] **Step 7: Full test run + commit**

Run: `npx vitest run` — all pass.

```bash
git add lib/posts-publish.ts tests/posts-publish.test.ts types/db.ts 'app/admin/(dashboard)/actions.ts'
git commit -m "fix(admin): stop re-dating posts on save; add trip_date/price to post writes"
```

---

### Task 8: Admin PostForm — Ημερομηνία εκδρομής, Τιμή, Ημερομηνία δημοσίευσης

**Files:**
- Modify: `components/admin/PostForm.tsx` (after the Κείμενο field, before Κατάσταση)
- Modify: `app/admin/(dashboard)/posts/page.tsx` (list column)

**Interfaces:**
- Consumes: `upsertPost` reads `trip_date`, `price`, `published_on` (Task 7); `Post.trip_date/price` types.

- [ ] **Step 1: Add the three fields to PostForm**

In `components/admin/PostForm.tsx`, after the Κείμενο `<label>` block insert:

```tsx
      <div className="grid gap-5 sm:grid-cols-3">
        <label className="block">
          <span className={labelCls}>Ημερομηνία εκδρομής</span>
          <input name="trip_date" type="date" defaultValue={post?.trip_date ?? ''} className={inputCls} />
        </label>
        <label className="block">
          <span className={labelCls}>Τιμή ανά άτομο (€)</span>
          <input name="price" type="number" min={0} step="0.01" defaultValue={post?.price ?? ''} className={inputCls} />
        </label>
        <label className="block">
          <span className={labelCls}>Ημερομηνία δημοσίευσης</span>
          <input name="published_on" type="date" defaultValue={post?.published_at ? post.published_at.slice(0, 10) : ''} className={inputCls} />
        </label>
      </div>
```

- [ ] **Step 2: Show trip date in the admin list**

In `app/admin/(dashboard)/posts/page.tsx` add a header cell after «Κατάσταση»:

```tsx
              <th className="px-5 py-3">Ημ/νία εκδρομής</th>
```

and the matching body cell after the status `<td>` (update the empty-state `colSpan={4}` to `colSpan={5}`):

```tsx
                <td className="px-5 py-3 text-body">
                  {p.trip_date ? new Date(p.trip_date).toLocaleDateString('el-GR') : '—'}
                </td>
```

- [ ] **Step 3: Verify**

`npx next build` succeeds. In dev `/admin/posts`: edit a migrated post, set Ημερομηνία εκδρομής, save → list shows it and «Ημ/νία δημοσίευσης» is UNCHANGED (the Task 7 bug fix, client item 3).

- [ ] **Step 4: Commit**

```bash
git add components/admin/PostForm.tsx 'app/admin/(dashboard)/posts/page.tsx'
git commit -m "feat(admin): trip date, price and editable publish date on post form"
```

---

### Task 9: Public display — trip date on cards + date/price strip on articles

**Files:**
- Modify: `components/blog/PostCard.tsx`
- Modify: `app/(site)/nea/[slug]/page.tsx`

- [ ] **Step 1: Trip-date badge on PostCard**

In `components/blog/PostCard.tsx`, inside the `aspect-[16/10]` image `<div>` (as first child, before the cover conditional), add:

```tsx
        {post.trip_date && (
          <span className="absolute left-4 top-4 z-10 rounded-full bg-cta px-3 py-1.5 font-sans text-[12px] font-semibold uppercase tracking-[0.08em] text-surface">
            Εκδρομή {new Date(post.trip_date).toLocaleDateString('el-GR')}
          </span>
        )}
```

The small `published_at` line stays as-is (upload date).

- [ ] **Step 2: Info strip on the article page**

In `app/(site)/nea/[slug]/page.tsx` add `import { Calendar } from 'lucide-react';` and, inside `<div className="container max-w-prose">` BEFORE `<PostBody …>`, add:

```tsx
          {(post.trip_date || post.price != null) && (
            <div className="mb-10 flex flex-wrap items-center gap-x-8 gap-y-4 rounded-lg border border-border bg-surface p-6 shadow-card">
              {post.trip_date && (
                <div className="flex items-center gap-2.5 text-[15px] text-body">
                  <Calendar className="h-5 w-5 shrink-0 text-cta" strokeWidth={1.75} />
                  <span><span className="font-semibold">Ημερομηνία εκδρομής:</span> {new Date(post.trip_date).toLocaleDateString('el-GR')}</span>
                </div>
              )}
              {post.price != null && (
                <div className="text-[15px] text-body">
                  <span className="font-semibold">Τιμή:</span> {post.price}€ / άτομο
                </div>
              )}
            </div>
          )}
```

(The «Κλείστε Online Θέση» button joins this strip in Task 13, once `/kratisi` exists.)

- [ ] **Step 3: Verify + commit**

`npx next build`; in dev an article with trip_date shows badge + strip.

```bash
git add components/blog/PostCard.tsx 'app/(site)/nea/[slug]/page.tsx'
git commit -m "feat(site): show excursion date (+price) on ΝΕΑ cards and articles"
```

---

### Task 10: Booking total helper (TDD)

**Files:**
- Create: `lib/booking.ts`
- Test: `tests/booking.test.ts`

**Interfaces:**
- Produces: `computeBookingTotal(seats: string, pricePerSeat: number | null | undefined): number | null` — consumed by `OnlineBookingForm` (Task 11).

- [ ] **Step 1: Write the failing test**

`tests/booking.test.ts`:

```ts
import { describe, it, expect } from 'vitest';
import { computeBookingTotal } from '@/lib/booking';

describe('computeBookingTotal', () => {
  it('multiplies seats by price', () => {
    expect(computeBookingTotal('3', 25)).toBe(75);
  });
  it('rounds to cents', () => {
    expect(computeBookingTotal('3', 33.335)).toBe(100.01);
  });
  it('returns null without a price', () => {
    expect(computeBookingTotal('3', null)).toBeNull();
    expect(computeBookingTotal('3', undefined)).toBeNull();
    expect(computeBookingTotal('3', 0)).toBeNull();
  });
  it('returns null for non-numeric or <1 seats', () => {
    expect(computeBookingTotal('', 25)).toBeNull();
    expect(computeBookingTotal('abc', 25)).toBeNull();
    expect(computeBookingTotal('0', 25)).toBeNull();
  });
});
```

- [ ] **Step 2: Run test to verify it fails**

Run: `npx vitest run tests/booking.test.ts`
Expected: FAIL — cannot resolve `@/lib/booking`.

- [ ] **Step 3: Implement**

`lib/booking.ts`:

```ts
/** Informational booking total: seats × per-person price, rounded to cents. */
export function computeBookingTotal(seats: string, pricePerSeat: number | null | undefined): number | null {
  if (!pricePerSeat || !/^\d+$/.test(seats)) return null;
  const n = Number(seats);
  if (n < 1) return null;
  return Math.round(n * pricePerSeat * 100) / 100;
}
```

- [ ] **Step 4: Run test to verify it passes**

Run: `npx vitest run tests/booking.test.ts`
Expected: 4 passed.

- [ ] **Step 5: Commit**

```bash
git add lib/booking.ts tests/booking.test.ts
git commit -m "feat(booking): computeBookingTotal helper"
```

---

### Task 11: OnlineBookingForm (required seats + live total), replaces BookingForm

**Files:**
- Create: `components/booking/OnlineBookingForm.tsx`
- Modify: `app/(site)/tour/[slug]/page.tsx:8,140-149`
- Modify: `app/admin/(dashboard)/bookings/page.tsx:13` and `app/admin/(dashboard)/requests/[id]/page.tsx:30` (label Άτομα → Θέσεις)
- Delete: `components/trips/BookingForm.tsx`

**Interfaces:**
- Produces: `OnlineBookingForm({ tourId?, subject?, pricePerSeat?, defaultDate?, sourcePath })` — client component; submits `type:'booking'` via `createLead` with REQUIRED `party_size` (Θέσεις) and the live total appended to `message`.
- Consumes: `createLead` (`app/(site)/actions.ts`), `computeBookingTotal` (Task 10).

- [ ] **Step 1: Create the component**

`components/booking/OnlineBookingForm.tsx`:

```tsx
'use client';
import { useRef, useState, type ReactNode } from 'react';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { z } from 'zod';
import { Button } from '@/components/ui/Button';
import { createLead } from '@/app/(site)/actions';
import { computeBookingTotal } from '@/lib/booking';

const Schema = z.object({
  name: z.string().min(2, 'Συμπληρώστε το όνομά σας.'),
  phone: z.string().min(8, 'Συμπληρώστε ένα έγκυρο τηλέφωνο.'),
  email: z.string().email('Μη έγκυρο email.').optional().or(z.literal('')),
  date: z.string().optional(),
  seats: z.string().regex(/^\d+$/, 'Συμπληρώστε τον αριθμό θέσεων.').refine((v) => Number(v) >= 1, 'Τουλάχιστον 1 θέση.'),
  notes: z.string().optional(),
  hp: z.string().optional(),
});
type Input = z.infer<typeof Schema>;

const inputCls = 'w-full rounded-md border border-border bg-surface px-4 py-2.5 font-sans text-[15px] text-body transition focus:border-primary focus:outline-none focus:ring-4 focus:ring-primary/10';

function Field({ label, error, children }: { label: string; error?: string; children: ReactNode }) {
  return (
    <label className="block">
      <span className="mb-1.5 block font-sans text-[13px] font-medium uppercase tracking-[0.1em] text-primary">{label}</span>
      {children}
      {error && <span className="mt-1 block text-[13px] text-cta">{error}</span>}
    </label>
  );
}

export function OnlineBookingForm({
  tourId = null,
  subject = null,
  pricePerSeat = null,
  defaultDate = null,
  sourcePath,
}: {
  tourId?: string | null;
  subject?: string | null;
  pricePerSeat?: number | null;
  defaultDate?: string | null;
  sourcePath: string;
}) {
  const [sent, setSent] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const { register, handleSubmit, watch, formState: { errors, isSubmitting } } = useForm<Input>({
    resolver: zodResolver(Schema),
    defaultValues: { date: defaultDate ?? '', seats: '' },
  });
  const mountedAt = useRef(Date.now());
  const seats = watch('seats') ?? '';
  const total = computeBookingTotal(seats, pricePerSeat);

  if (sent) {
    return (
      <div className="rounded-lg border border-olive/30 bg-olive/10 p-6 text-center">
        <h3 className="font-display text-2xl font-semibold text-primary">Το αίτημά σας παρελήφθη</h3>
        <p className="mt-2 text-muted">Θα επικοινωνήσουμε μαζί σας για την επιβεβαίωση της κράτησης.</p>
      </div>
    );
  }
  return (
    <form
      className="grid gap-4 rounded-lg border border-border bg-surface p-6 shadow-card"
      onSubmit={handleSubmit(async (d) => {
        setError(null);
        const message = [
          d.notes?.trim() || null,
          total != null ? `Ενδεικτικό σύνολο: ${d.seats} × ${pricePerSeat}€ = ${total}€` : null,
        ].filter(Boolean).join('\n');
        const res = await createLead({
          type: 'booking', tour_id: tourId, name: d.name, phone: d.phone,
          email: d.email || null, preferred_date: d.date || null,
          party_size: Number(d.seats),
          subject: subject ? `Κράτηση: ${subject}` : 'Online κράτηση',
          message: message || null, source_path: sourcePath,
          hp: d.hp, ts: mountedAt.current,
        });
        if (res.ok) setSent(true); else setError('Κάτι πήγε στραβά. Δοκιμάστε ξανά ή καλέστε μας.');
      })}
    >
      <input {...register('hp')} type="text" name="hp" tabIndex={-1} autoComplete="off" aria-hidden="true" className="absolute left-[-9999px] top-0 h-0 w-0 opacity-0" />
      <h3 className="font-display text-2xl font-semibold text-primary">Κλείστε Online Θέση</h3>
      {subject && <p className="-mt-2 text-[14px] text-muted">{subject}</p>}
      <Field label="Ονοματεπώνυμο *" error={errors.name?.message}><input {...register('name')} className={inputCls} /></Field>
      <div className="grid gap-4 sm:grid-cols-2">
        <Field label="Τηλέφωνο *" error={errors.phone?.message}><input {...register('phone')} type="tel" className={inputCls} /></Field>
        <Field label="Email" error={errors.email?.message}><input {...register('email')} className={inputCls} /></Field>
      </div>
      <div className="grid gap-4 sm:grid-cols-2">
        <Field label="Ημερομηνία"><input type="date" {...register('date')} className={inputCls} /></Field>
        <Field label="Θέσεις *" error={errors.seats?.message}><input type="number" min={1} inputMode="numeric" {...register('seats')} className={inputCls} /></Field>
      </div>
      {pricePerSeat != null && pricePerSeat > 0 && (
        <p className="rounded-md bg-primary/5 px-4 py-3 font-sans text-[14px] font-semibold text-primary" aria-live="polite">
          {total != null
            ? `Σύνολο: ${seats} × ${pricePerSeat}€ = ${total}€`
            : `Τιμή: ${pricePerSeat}€ / θέση`}
          <span className="ml-2 font-normal text-muted">(ενδεικτικό — επιβεβαίωση από το γραφείο)</span>
        </p>
      )}
      <Field label="Σημειώσεις"><textarea rows={3} {...register('notes')} className={inputCls} /></Field>
      {error && <p className="text-[14px] text-cta">{error}</p>}
      <Button type="submit" disabled={isSubmitting}>{isSubmitting ? 'Αποστολή…' : 'Στείλτε αίτημα κράτησης'}</Button>
    </form>
  );
}
```

- [ ] **Step 2: Use it on the tour page; retire the old form**

In `app/(site)/tour/[slug]/page.tsx`:
- Replace `import { BookingForm } from '@/components/trips/BookingForm';` with `import { OnlineBookingForm } from '@/components/booking/OnlineBookingForm';`
- Change the info-card button to jump to the form:

```tsx
              <Button asChild variant="accent" size="lg" className="mt-8 w-full">
                <Link href="#kratisi">Κλείστε Online Θέση</Link>
              </Button>
```

- Replace the form block:

```tsx
            <div className="mt-6 scroll-mt-28" id="kratisi">
              <OnlineBookingForm
                tourId={tour.id}
                subject={tour.title}
                pricePerSeat={tour.price_from}
                sourcePath={`/tour/${tour.slug}`}
              />
            </div>
```

- Run `grep -rn "trips/BookingForm" app components` — the tour page must be the only hit; then delete `components/trips/BookingForm.tsx`.

- [ ] **Step 3: Relabel Άτομα → Θέσεις in admin**

- `app/admin/(dashboard)/bookings/page.tsx` line 13: `<th className="px-5 py-3">Άτομα</th>` → `Θέσεις`.
- `app/admin/(dashboard)/requests/[id]/page.tsx` line 30: `<dt className="text-muted">Άτομα</dt>` → `Θέσεις`.

- [ ] **Step 4: Verify**

`npx vitest run` and `npx next build` pass. In dev on a tour page: seats empty → submit blocked with «Συμπληρώστε τον αριθμό θέσεων.»; typing seats live-updates «Σύνολο: 3 × 25€ = 75€».

- [ ] **Step 5: Commit**

```bash
git add components/booking/OnlineBookingForm.tsx 'app/(site)/tour/[slug]/page.tsx' 'app/admin/(dashboard)/bookings/page.tsx' 'app/admin/(dashboard)/requests/[id]/page.tsx'
git rm 'components/trips/BookingForm.tsx'
git commit -m "feat(booking): OnlineBookingForm with required Θέσεις + live total; replaces BookingForm"
```

---

### Task 12: `/kratisi` page

**Files:**
- Create: `app/(site)/kratisi/page.tsx`
- Modify: `app/sitemap.ts` (STATIC_ROUTES)

**Interfaces:**
- Consumes: `OnlineBookingForm`, `PaymentMethods`, `getTourBySlug` (`lib/queries/tours.ts`), `getPostBySlug` (`lib/queries/posts.ts`), `PageHero`.
- Produces: `/kratisi`, `/kratisi?tour=<slug>`, `/kratisi?post=<slug>` — CTA targets for Task 13.

- [ ] **Step 1: Create the page**

`app/(site)/kratisi/page.tsx`:

```tsx
import type { Metadata } from 'next';
import { PageHero } from '@/components/shared/PageHero';
import { PaymentMethods } from '@/components/shared/PaymentMethods';
import { OnlineBookingForm } from '@/components/booking/OnlineBookingForm';
import { getTourBySlug } from '@/lib/queries/tours';
import { getPostBySlug } from '@/lib/queries/posts';

export const metadata: Metadata = {
  title: 'Κλείστε Online Θέση',
  description: 'Κλείστε online θέση για εκδρομή ή κρουαζιέρα της Sergiani Travel. Συμπληρώστε τη φόρμα και θα σας καλέσουμε για επιβεβαίωση.',
  alternates: { canonical: '/kratisi' },
};

export default async function KratisiPage({ searchParams }: { searchParams: Promise<{ tour?: string; post?: string }> }) {
  const { tour: tourSlug, post: postSlug } = await searchParams;
  const tour = tourSlug ? await getTourBySlug(tourSlug) : null;
  const post = !tour && postSlug ? await getPostBySlug(postSlug) : null;

  const subject = tour?.title ?? post?.title ?? null;
  const pricePerSeat = tour?.price_from ?? post?.price ?? null;
  const defaultDate = post?.trip_date ?? null;
  const sourcePath = tour ? `/kratisi?tour=${tour.slug}` : post ? `/kratisi?post=${post.slug}` : '/kratisi';

  return (
    <>
      <PageHero
        eyebrow="Κρατήσεις"
        title="Κλείστε Online Θέση"
        subtitle="Συμπληρώστε τη φόρμα και θα επικοινωνήσουμε μαζί σας για την επιβεβαίωση της κράτησης."
        breadcrumbs={[{ label: 'Αρχική', href: '/' }, { label: 'Κράτηση' }]}
        heightClass="h-[44vh] min-h-[340px]"
      />
      <section className="py-16 md:py-24">
        <div className="container max-w-2xl">
          <OnlineBookingForm
            tourId={tour?.id ?? null}
            subject={subject}
            pricePerSeat={pricePerSeat}
            defaultDate={defaultDate}
            sourcePath={sourcePath}
          />
          <PaymentMethods className="mt-8" />
        </div>
      </section>
    </>
  );
}
```

- [ ] **Step 2: Add to sitemap**

In `app/sitemap.ts` add `'/kratisi',` to `STATIC_ROUTES` (after `'/epikoinonia',`).

- [ ] **Step 3: Verify**

`npx next build` passes. In dev: `/kratisi` renders the bare form; `/kratisi?post=<a-migrated-slug>` shows the article title and (if set) prefilled date + price line; `/kratisi?tour=<a-tour-slug>` shows the tour title and price/total.

- [ ] **Step 4: Commit**

```bash
git add 'app/(site)/kratisi/page.tsx' app/sitemap.ts
git commit -m "feat(site): /kratisi online booking page (tour/post prefill, payment methods)"
```

---

### Task 13: «Κλείστε Online Θέση» CTAs — navbar, homepage, articles

**Files:**
- Modify: `components/layout/Navbar.tsx:87-89,143-145`
- Modify: `components/home/Home1Hero.tsx` (CTA under search form)
- Modify: `components/home/Home1Cta.tsx` (booking button)
- Modify: `app/(site)/nea/[slug]/page.tsx` (button in the Task 9 strip)

- [ ] **Step 1: Navbar CTAs → /kratisi**

Both Navbar buttons (desktop ~line 87, mobile ~line 143): change `href="/epikoinonia"` → `href="/kratisi"` and text `Κλείστε Θέση` → `Κλείστε Online Θέση`.

- [ ] **Step 2: Homepage hero CTA**

In `components/home/Home1Hero.tsx` add `import Link from 'next/link';` and, between the search `</form>` and the `bookedNote` `<p>`, insert:

```tsx
        <div className="mt-6">
          <Button asChild variant="accent" size="lg">
            <Link href="/kratisi">Κλείστε Online Θέση</Link>
          </Button>
        </div>
```

- [ ] **Step 3: Homepage bottom CTA section**

In `components/home/Home1Cta.tsx`, inside the button group `<div className="flex flex-col gap-3 sm:flex-row sm:items-center">`, add BEFORE the phone `<a>`:

```tsx
          <Link
            href="/kratisi"
            className="inline-flex items-center justify-center rounded-full bg-surface px-6 py-3.5 font-sans text-[13px] font-semibold uppercase tracking-[0.14em] text-[#00296b] transition hover:bg-surface/85"
          >
            Κλείστε Online Θέση
          </Link>
```

- [ ] **Step 4: Article CTA**

In `app/(site)/nea/[slug]/page.tsx` add imports:

```tsx
import { Button } from '@/components/ui/Button';
```

Inside the Task 9 info strip container, after the price `<div>`, add:

```tsx
              <Button asChild variant="accent" className="ml-auto">
                <Link href={`/kratisi?post=${post.slug}`}>Κλείστε Online Θέση</Link>
              </Button>
```

Also render the strip WITH the button even when the post has neither trip_date nor price — change the strip's condition so every article carries the CTA (client item 4: «σε κάθε άρθρο»). Final condition: render the strip unconditionally; inside it, date and price stay conditional.

- [ ] **Step 5: Verify**

`npx next build`. In dev: homepage hero + bottom section + navbar all link to `/kratisi`; every `/nea/<slug>` article shows the CTA; `/kratisi?post=<slug>` opens prefilled.

- [ ] **Step 6: Commit**

```bash
git add components/layout/Navbar.tsx components/home/Home1Hero.tsx components/home/Home1Cta.tsx 'app/(site)/nea/[slug]/page.tsx'
git commit -m "feat(site): Κλείστε Online Θέση CTAs on navbar, homepage and every article"
```

---

### Task 14: End-to-end verification

- [ ] **Step 1: Static checks**

Run: `npx vitest run` → all pass. `npx next build` → succeeds.

- [ ] **Step 2: Forms → leads round-trip (real dev server, .env.local set)**

`npm run dev`, then:
1. `/epikoinonia`: submit without phone → blocked; with phone → success. (Wait >1.5s after page load before submitting — the time-trap silently drops fast submissions.)
2. `/kratisi?tour=<slug>`: pick 3 seats on a priced tour → total shown; submit → success.
3. `/nea/<slug>` → CTA → `/kratisi?post=<slug>` → submit with seats.
4. Verify rows via Supabase MCP `execute_sql`: `select type, name, phone, party_size, subject, message, source_path from leads order by created_at desc limit 5;` — booking rows have `party_size` set and the total inside `message`.
5. `/admin/bookings`: new rows visible with «Θέσεις» column.

- [ ] **Step 3: Posts ordering regression**

In `/admin/posts` edit an OLD migrated post (change one word, save). Confirm its «Ημ/νία δημοσίευσης» did NOT change and `/nea` ordering is unchanged. Toggle hide → publish on the same post: date still preserved.

- [ ] **Step 4: Final commit (if any fixups) + handoff notes**

Report to the user: (a) client should fill Ημερομηνία εκδρομής + Τιμή on the articles they care about; (b) if the admin «Νομικά» tab has saved custom Όροι text, its payment wording needs the same update by hand; (c) items 8–9 of the client's feedback don't exist — confirmed only these items were sent.
