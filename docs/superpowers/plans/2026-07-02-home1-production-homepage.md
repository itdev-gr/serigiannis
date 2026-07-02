# Home 1 Production Homepage Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Replace serigiani's home page with a production-ready home built in the tourex **Home 1** design, rendered natively in React/Tailwind and driven by the live Supabase data layer with real Greek content.

**Architecture:** Each Home 1 section becomes a focused **presentational** component in `components/home/` that receives its data via props. The home page (`app/(site)/page.tsx`, a Server Component) fetches from the existing data layer (`getFeaturedTours`, `getTours`, `getCategories`, `getSettings`, `data/site` stats/testimonials) and composes the sections inside the existing `(site)` layout (Navbar + Footer). Only the hero is a Client Component (interactive search form); it receives categories as props. This keeps every section unit-testable with seed data and adds **no new dependencies**.

**Tech Stack:** Next.js 16 App Router, React 19 Server Components, Tailwind 3 (tokens in `tailwind.config.ts`), Supabase data layer with seed fallback, GSAP/framer-motion (existing helpers), vitest + @testing-library/react (jsdom).

## Global Constraints

- **Language:** All UI copy in Greek. Document lang stays `el`.
- **No new dependencies.** Reuse existing components: `Button`, `Badge`/`PriceBadge`, `TourCard`, `SectionHeading`, `StatCounter`, `TestimonialBlock`, `Reveal`/`Stagger`/`StaggerItem`, `TourImage`.
- **Server Components by default.** Add `'use client'` only where interactivity/GSAP requires it (Hero, and any section using `StatCounter` which is already a client component).
- **Data access only via `lib/queries/*`** (`getTours`, `getFeaturedTours`, `getCategories`, `getSettings`) and `data/site` (`stats`, `testimonials`). Never call Supabase directly from components.
- **Sections are presentational:** they receive already-fetched data via props (so they render under seed fallback in tests). The page Server Component does the fetching.
- **Design tokens only** from `tailwind.config.ts` (`primary`, `cta`, `gold`, `deep-ink`, `sea`, `surface`, `muted`, `background`, `border`; `font-display`, `font-sans`; `text-display-hero/section/editorial`; `shadow-card/card-hover/cta/gold`; `ease-editorial`). No raw hex except where existing code already does (`#00296b` on gold).
- **Container:** wrap section content in `<div className="container">` (configured centered, responsive padding, max `1280px`).
- **Accessibility:** each section is a `<section>` with an accessible name (visible `<h2>` or `aria-label`); images have Greek `alt`; motion respects `prefers-reduced-motion` (existing helpers already do).
- **Tests:** live in `tests/` as `*.test.tsx`, run with `npm run test:run`. Alias `@` → repo root.
- **Commit** after each task with a `feat:`/`refactor:` message.
- Reference for the *look* being reproduced: tourex Home 1 at `~/Desktop/Cursor/tourex` (`src/components/homes/home-one/*`). Match layout/rhythm, not its Bootstrap classes.

## File Structure

```
app/(site)/page.tsx                     # MODIFY — new home: fetch + compose sections
app/(site)/arxiki-legacy/page.tsx       # CREATE — preserves the current home body
components/home/
  content.ts                            # CREATE — static Greek copy for the home (hero, process, promo)
  Home1Hero.tsx                         # CREATE — client; hero + search form
  home-search.ts                        # CREATE — pure buildSearchHref() helper (unit-tested)
  Home1Destinations.tsx                 # CREATE — category/destination cards ("Location")
  Home1About.tsx                        # CREATE — about + StatCounter grid ("About")
  Home1Listing.tsx                      # CREATE — featured tours grid ("Listing")
  Home1Promo.tsx                        # CREATE — πούλμαν/offer band ("Ads")
  Home1Process.tsx                      # CREATE — "how it works" steps ("Process")
  Home1Testimonials.tsx                 # CREATE — reviews ("Testimonial")
  Home1News.tsx                         # CREATE — upcoming/proposed tours ("Blog")
  Home1Cta.tsx                          # CREATE — contact CTA ("Cta")
tests/home-search.test.ts               # CREATE — buildSearchHref unit tests
tests/home-sections.test.tsx            # CREATE — render tests for sections
```

The existing `components/home/{HomeHero,CategoryStrip,EditorialFeature,StorySection}.tsx` are used by the legacy page and stay in place (moved with it). The new home uses only the `Home1*` components.

---

## Task 0: Content reconciled from the site crawl — DONE (verbatim strings below)

**Status:** The full crawl of https://sergianitravel.gr/ completed. The real Greek
copy is already baked into `content.ts` (Task 2 Step 5) and the testimonials/settings
updates (Steps below). No re-crawl needed.

**Crawl-confirmed facts used in this plan:**
- Real hero subhead, per-category section blurbs, the 4 "Γιατί να μας Εμπιστευτείτε"
  trust points, and the real About paragraph — all in `content.ts`.
- Contact: Π. Μελά 45, Περιστέρι 121 31 (Μετρό Αγίου Αντωνίου); phones 210 571 2451,
  210 821 2452, mobile 24ωρο 6976 811 825; info@sergianitravel.gr; socials FB
  `/sergiani.travelgr/`, IG `@sergiani_travel`, YT `@sergianitravel`. These match
  `data/seed/tours.ts` `seedSettings` already — no change needed.
- Real testimonials (update `data/site.ts` — Step 1 below).

**Unresolved conflicts (decisions folded in; see the plan handoff note):**
- **Opening hours differ on the live site:** contact page says Δευ–Παρ 9:30–19:30 /
  Σάβ 10:00–14:00, while footer & about say 09:00–17:00 / Σάβ 09:00–14:00. This plan
  keeps the **footer/settings version (09:00–17:00, Σάβ 09:00–14:00)** already in
  `seedSettings` and `Footer.tsx`. Change later if the owner confirms otherwise.
- **Founding year:** 1995 everywhere except the bus page (1993). Plan uses **1995**.
- **ΜΗΤΕ/ΓΕΜΗ/ΑΦΜ:** not present anywhere on the live site. No legal number is added;
  footer legal line stays «© 2026 Sergiani Travel. Με επιφύλαξη παντός δικαιώματος.»
- **Homepage stat values** are JS counters (not in HTML). Plan keeps the existing
  `data/site.ts` values (30+, 500+, 10.000+, 50+), consistent with «από το 1995 / πάνω
  από 30 χρόνια / χιλιάδες ταξιδιώτες».

**Files:**
- Modify: `data/site.ts` (testimonials → real quotes)

- [ ] **Step 1: Replace `testimonials` in `data/site.ts`** with the real ★★★★★ reviews from the site:

```ts
export const testimonials: Testimonial[] = [
  { id: 'q1', name: 'Μαρία Κ.', city: 'Αθήνα', quote: 'Εξαιρετική οργάνωση και φιλικό προσωπικό! Η μονοήμερη στα Μετέωρα ήταν αξέχαστη. Θα ξαναπάμε σίγουρα!' },
  { id: 'q2', name: 'Γιώργος Π.', city: 'Περιστέρι', quote: 'Πολυήμερη εκδρομή στην Καππαδοκία, τέλεια! Τιμές λογικές, ξενοδοχεία πολύ καλά, ο συνοδός άψογος.' },
  { id: 'q3', name: 'Ελένη Μ.', city: 'Ομόνοια', quote: 'Καθημερινά θαλάσσια μπάνια στην Ψάθα — πολύ βολικό για εμάς τους Αθηναίους. Καθαρή θάλασσα, σωστό πρόγραμμα!' },
];
```

- [ ] **Step 2:** Run `npm run test:run` (Expected: PASS) and `npm run build` (Expected: success).
- [ ] **Step 3:** Commit.

```bash
git add data/site.ts
git commit -m "content: real testimonials from sergianitravel.gr crawl"
```

> Execution note: this task is content-only. The rest of the crawl copy is already in
> `content.ts` (Task 2), so Tasks 1–13 can run in order.

---

## Task 1: Preserve the current home at `/arxiki-legacy`

**Files:**
- Create: `app/(site)/arxiki-legacy/page.tsx`
- Modify: `app/(site)/page.tsx` (its current content moves out; replaced in Task 11)

**Interfaces:**
- Produces: route `/arxiki-legacy` rendering the previous home body.

- [ ] **Step 1: Create the legacy page** by copying the *current* `app/(site)/page.tsx` verbatim into `app/(site)/arxiki-legacy/page.tsx`, adding a metadata export and `noindex`:

```tsx
import type { Metadata } from 'next';
// ...paste the CURRENT app/(site)/page.tsx imports and default export body here verbatim...
// Rename the exported function to LegacyHomePage.

export const metadata: Metadata = {
  title: 'Παλιά Αρχική',
  robots: { index: false, follow: false },
};
```

- [ ] **Step 2: Leave `app/(site)/page.tsx` temporarily** rendering the same content (do not break `/` yet). It will be replaced in Task 11.

- [ ] **Step 3: Verify both routes build**

Run: `npm run build`
Expected: success; routes `/` and `/arxiki-legacy` both listed.

- [ ] **Step 4: Commit**

```bash
git add app/\(site\)/arxiki-legacy/page.tsx
git commit -m "feat: preserve current home at /arxiki-legacy"
```

---

## Task 2: Home static content + search helper

Creates the copy module and the pure search-href helper (TDD).

**Files:**
- Create: `components/home/content.ts`
- Create: `components/home/home-search.ts`
- Test: `tests/home-search.test.ts`

**Interfaces:**
- Produces: `homeContent` (typed copy object); `buildSearchHref(input: { category?: string }): string`.

- [ ] **Step 1: Write the failing test** `tests/home-search.test.ts`:

```ts
import { describe, it, expect } from 'vitest';
import { buildSearchHref } from '@/components/home/home-search';

describe('buildSearchHref', () => {
  it('routes to the category page when a category slug is given', () => {
    expect(buildSearchHref({ category: 'monoimeres' })).toBe('/ekdromes/monoimeres');
  });
  it('routes to all excursions when no category is given', () => {
    expect(buildSearchHref({})).toBe('/ekdromes');
    expect(buildSearchHref({ category: '' })).toBe('/ekdromes');
  });
  it('routes to all excursions for the "all" sentinel', () => {
    expect(buildSearchHref({ category: 'all' })).toBe('/ekdromes');
  });
});
```

- [ ] **Step 2: Run it, verify it fails**

Run: `npm run test:run -- home-search`
Expected: FAIL ("Cannot find module '@/components/home/home-search'").

- [ ] **Step 3: Implement `components/home/home-search.ts`**

```ts
/** Build the target href for the hero search form from a chosen category slug. */
export function buildSearchHref(input: { category?: string }): string {
  const c = (input.category ?? '').trim();
  if (!c || c === 'all') return '/ekdromes';
  return `/ekdromes/${c}`;
}
```

- [ ] **Step 4: Run it, verify it passes**

Run: `npm run test:run -- home-search`
Expected: PASS (3 tests).

- [ ] **Step 5: Create `components/home/content.ts`** (concrete Greek copy — refined in Task 0):

```ts
// Static Greek copy for the Home 1 homepage. Tour/category/contact data comes from
// the DB layer; this file holds editorial copy only. Strings are the real copy from
// sergianitravel.gr (crawl, Task 0), trimmed for a big-hero layout.

export const homeContent = {
  hero: {
    eyebrow: 'Ταξιδιωτικό Γραφείο Περιστέρι · Από το 1995',
    titleTop: 'Εκδρομές από Αθήνα,',
    titleEmph: 'κάθε εβδομάδα',
    subtitle:
      'Μονοήμερες & πολυήμερες εκδρομές, θαλάσσια μπάνια, κρουαζιέρες και ενοικιάσεις πούλμαν — αποδράσεις από την Αθήνα για όλη την Ελλάδα.',
    bookedNote: 'Χιλιάδες ταξιδιώτες μάς εμπιστεύτηκαν',
    searchLabel: 'Βρείτε την εκδρομή σας',
    searchCta: 'Αναζήτηση',
    allOption: 'Όλες οι εκδρομές',
  },
  destinations: {
    eyebrow: 'Προορισμοί',
    title: 'Πού θα ταξιδέψουμε',
    subtitle: 'Διαλέξτε κατηγορία και ανακαλύψτε τις επόμενες αναχωρήσεις.',
  },
  about: {
    eyebrow: 'Ποιοι είμαστε',
    title: 'Ταξιδιωτικό γραφείο στο Περιστέρι, από το 1995',
    body: 'Τρεις δεκαετίες μετά, είμαστε ένα από τα πιο αξιόπιστα ταξιδιωτικά γραφεία της Αθήνας. Έχουμε ταξιδέψει χιλιάδες ταξιδιώτες, οικογένειες, σχολεία και επιχειρήσεις σε όλη την Ελλάδα και το εξωτερικό — με αξιοπιστία, ασφάλεια και μεράκι.',
    cta: 'Ελάτε να γνωριστούμε',
    ctaHref: '/epikoinonia',
    // Real "Γιατί να μας Εμπιστευτείτε" trust points from the homepage.
    trust: [
      { title: 'Εμπειρία από το 1995', text: 'Πάνω από 30 χρόνια οργανώνουμε αξέχαστες εκδρομές με αξιοπιστία και επαγγελματισμό.' },
      { title: 'Ασφάλεια & Αξιοπιστία', text: 'Πλήρης ταξιδιωτική ασφάλεια, άρτια οργάνωση και έμπειροι συνοδοί σε κάθε εκδρομή.' },
      { title: 'Μεγάλη Ποικιλία', text: 'Μονοήμερες, πολυήμερες, κρουαζιέρες, θαλάσσια μπάνια και ενοικιάσεις πούλμαν.' },
      { title: 'Προσιτές Τιμές', text: 'Εξαιρετική σχέση ποιότητας-τιμής, με δυνατότητα κατάθεσης και πληρωμής με κάρτα.' },
    ],
  },
  listing: {
    eyebrow: 'Ξεχωριστές Επιλογές',
    title: 'Οι πιο δημοφιλείς εκδρομές μας',
    subtitle: 'Επιλεγμένες από τους ταξιδιώτες μας — αποδράσεις με αρχή και τέλος στην Αθήνα.',
    action: 'Όλες οι εκδρομές',
    actionHref: '/ekdromes',
  },
  promo: {
    eyebrow: 'Ενοικιάσεις Πούλμαν & Μίνι Βαν',
    title: 'Ιδιωτικές μεταφορές για την ομάδα σας',
    body: 'Σχολικές εκδρομές, εκδηλώσεις, εταιρικές & VIP μετακινήσεις — σύγχρονος στόλος οχημάτων κάθε μεγέθους (minivan, minibus, πούλμαν) με έμπειρους Έλληνες οδηγούς.',
    cta: 'Ζητήστε προσφορά',
    ctaHref: '/enoikiaseis-poylman',
  },
  process: {
    eyebrow: 'Πώς λειτουργεί',
    title: 'Τρία βήματα για την επόμενη απόδρασή σας',
    steps: [
      { n: '01', title: 'Επιλέξτε εκδρομή', text: 'Δείτε τους προορισμούς και τις ημερομηνίες αναχώρησης.' },
      { n: '02', title: 'Κλείστε θέση', text: 'Κράτηση online με κάρτα, στο γραφείο ή με κατάθεση — απαντάμε την ίδια μέρα.' },
      { n: '03', title: 'Ταξιδέψτε', text: 'Ανεβείτε στο πούλμαν και αφήστε τα υπόλοιπα σε εμάς.' },
    ],
  },
  testimonials: {
    eyebrow: 'Τι Λένε οι Πελάτες μας',
    title: 'Ταξιδιώτες που μας εμπιστεύτηκαν',
  },
  news: {
    eyebrow: 'Επόμενες Αναχωρήσεις',
    title: 'Προτεινόμενες εκδρομές',
    subtitle: 'Κρατήστε έγκαιρα τη θέση σας για τις πιο ζητημένες αποδράσεις.',
    action: 'Δείτε το πρόγραμμα',
    actionHref: '/ekdromes',
  },
  cta: {
    title: 'Έτοιμοι για την επόμενη περιπέτεια;',
    body: 'Καλέστε μας ή στείλτε μας μήνυμα — απαντάμε την ίδια μέρα.',
    messageCta: 'Στείλτε μήνυμα',
    messageHref: '/epikoinonia',
  },
} as const;
```

- [ ] **Step 6: Run tests + build**

Run: `npm run test:run -- home-search` (Expected: PASS), then `npm run build` (Expected: success).

- [ ] **Step 7: Commit**

```bash
git add components/home/home-search.ts components/home/content.ts tests/home-search.test.ts
git commit -m "feat: home static content module + search href helper"
```

---

## Task 3: `Home1Hero` — hero + search form (Banner)

**Files:**
- Create: `components/home/Home1Hero.tsx`
- Test: covered by `tests/home-sections.test.tsx` (Task 12 aggregates; add the hero case here)

**Interfaces:**
- Consumes: `homeContent.hero`, `buildSearchHref`, `Category[]` (via props), `Button`.
- Produces: `Home1Hero({ categories }: { categories: Category[] })` (client component).

- [ ] **Step 1: Write the failing test** — append to `tests/home-sections.test.tsx` (create the file if first):

```tsx
import { describe, it, expect } from 'vitest';
import { render, screen } from '@testing-library/react';
import type { Category } from '@/types/db';
import { Home1Hero } from '@/components/home/Home1Hero';

const cats: Category[] = [
  { id: '1', slug: 'monoimeres', name_el: 'Μονοήμερες', description_el: null, sort_order: 1 },
  { id: '2', slug: 'kroyazieres', name_el: 'Κρουαζιέρες', description_el: null, sort_order: 2 },
];

describe('Home1Hero', () => {
  it('renders the hero heading and a destination option per category', () => {
    render(<Home1Hero categories={cats} />);
    expect(screen.getByRole('heading', { level: 1 })).toHaveTextContent('περιπέτεια');
    expect(screen.getByRole('option', { name: 'Μονοήμερες' })).toBeInTheDocument();
    expect(screen.getByRole('option', { name: 'Κρουαζιέρες' })).toBeInTheDocument();
    expect(screen.getByRole('option', { name: 'Όλες οι εκδρομές' })).toBeInTheDocument();
  });
});
```

- [ ] **Step 2: Run it, verify it fails**

Run: `npm run test:run -- home-sections`
Expected: FAIL ("Cannot find module '@/components/home/Home1Hero'").

- [ ] **Step 3: Implement `components/home/Home1Hero.tsx`**

```tsx
'use client';
import { useState } from 'react';
import { useRouter } from 'next/navigation';
import { Search } from 'lucide-react';
import type { Category } from '@/types/db';
import { Button } from '@/components/ui/Button';
import { homeContent } from './content';
import { buildSearchHref } from './home-search';

const HERO_SRC = `${process.env.NEXT_PUBLIC_SUPABASE_URL}/storage/v1/object/public/tour-images/site/home-hero.jpg`;

export function Home1Hero({ categories }: { categories: Category[] }) {
  const c = homeContent.hero;
  const router = useRouter();
  const [category, setCategory] = useState('all');

  return (
    <section className="relative flex min-h-[92vh] w-full items-center overflow-hidden bg-deep-ink">
      <div
        className="absolute inset-0 bg-cover bg-center"
        style={{ backgroundImage: `url(${HERO_SRC})` }}
        aria-hidden="true"
      />
      <div className="absolute inset-0 bg-gradient-to-b from-deep-ink/45 via-deep-ink/35 to-deep-ink/85" />
      <div className="container relative z-10 py-32 text-center text-surface">
        <p className="mx-auto mb-6 inline-flex items-center gap-3 rounded-full border border-surface/25 bg-surface/10 px-4 py-2 font-sans text-[11px] font-semibold uppercase tracking-[0.2em] backdrop-blur-sm">
          <span className="h-1.5 w-1.5 rounded-full bg-gold" />
          {c.eyebrow}
        </p>
        <h1 className="mx-auto max-w-4xl font-display text-display-hero leading-[1.02] text-balance">
          {c.titleTop}<br />
          <span className="italic text-gold">{c.titleEmph}</span>
        </h1>
        <p className="mx-auto mt-6 max-w-2xl text-[19px] leading-relaxed text-surface/85">{c.subtitle}</p>

        <form
          className="mx-auto mt-10 flex w-full max-w-2xl flex-col gap-3 rounded-2xl bg-surface/95 p-3 shadow-card-hover backdrop-blur sm:flex-row sm:items-center"
          onSubmit={(e) => {
            e.preventDefault();
            router.push(buildSearchHref({ category }));
          }}
        >
          <label className="sr-only" htmlFor="hero-destination">{c.searchLabel}</label>
          <select
            id="hero-destination"
            value={category}
            onChange={(e) => setCategory(e.target.value)}
            className="h-12 flex-1 rounded-xl border border-border bg-background px-4 font-sans text-[15px] text-body outline-none focus-visible:ring-2 focus-visible:ring-primary"
          >
            <option value="all">{c.allOption}</option>
            {categories.map((cat) => (
              <option key={cat.id} value={cat.slug}>{cat.name_el}</option>
            ))}
          </select>
          <Button type="submit" variant="accent" size="lg" className="h-12 shrink-0">
            <Search className="h-4 w-4" strokeWidth={2} /> {c.searchCta}
          </Button>
        </form>

        <p className="mt-6 font-sans text-[13px] uppercase tracking-[0.14em] text-surface/70">{c.bookedNote}</p>
      </div>
    </section>
  );
}
```

- [ ] **Step 4: Run it, verify it passes**

Run: `npm run test:run -- home-sections`
Expected: PASS.

- [ ] **Step 5: Commit**

```bash
git add components/home/Home1Hero.tsx tests/home-sections.test.tsx
git commit -m "feat: Home1Hero with destination search form"
```

---

## Task 4: `Home1Destinations` — category cards (Location)

**Files:**
- Create: `components/home/Home1Destinations.tsx`
- Test: add case to `tests/home-sections.test.tsx`

**Interfaces:**
- Consumes: `Category[]`, `Tour[]` (for a representative image per category via `coverImage`), `homeContent.destinations`, `SectionHeading`, `TourImage`/`imageUrl`.
- Produces: `Home1Destinations({ categories, tours }: { categories: Category[]; tours: Tour[] })` (server component).

- [ ] **Step 1: Write the failing test** — append to `tests/home-sections.test.tsx`:

```tsx
import { Home1Destinations } from '@/components/home/Home1Destinations';
// reuse `cats`; minimal tours array:
const tours = [] as import('@/types/db').Tour[];

describe('Home1Destinations', () => {
  it('renders a card linking to each category page', () => {
    render(<Home1Destinations categories={cats} tours={tours} />);
    const link = screen.getByRole('link', { name: /Μονοήμερες/ });
    expect(link).toHaveAttribute('href', '/ekdromes/monoimeres');
  });
});
```

- [ ] **Step 2: Run, verify fail.** Run: `npm run test:run -- home-sections` → FAIL (missing module).

- [ ] **Step 3: Implement `components/home/Home1Destinations.tsx`**

```tsx
import Link from 'next/link';
import { ArrowUpRight } from 'lucide-react';
import type { Category, Tour } from '@/types/db';
import { coverImage, imageUrl } from '@/lib/images';
import { SectionHeading } from '@/components/shared/SectionHeading';
import { homeContent } from './content';

function categoryImage(slug: string, tours: Tour[]): string | null {
  const match = tours.find((t) => t.categories?.some((c) => c.slug === slug));
  return match ? imageUrl(coverImage(match)) : null;
}

export function Home1Destinations({ categories, tours }: { categories: Category[]; tours: Tour[] }) {
  const c = homeContent.destinations;
  return (
    <section className="py-24 md:py-32" aria-label={c.title}>
      <div className="container">
        <SectionHeading eyebrow={c.eyebrow} title={c.title} subtitle={c.subtitle} />
        <div className="mt-14 grid gap-5 sm:grid-cols-2 lg:grid-cols-3">
          {categories.map((cat) => {
            const img = categoryImage(cat.slug, tours);
            return (
              <Link
                key={cat.id}
                href={`/ekdromes/${cat.slug}`}
                className="group relative flex aspect-[4/5] flex-col justify-end overflow-hidden rounded-lg bg-primary/10 p-6 text-surface shadow-card transition-all duration-300 ease-editorial hover:-translate-y-1 hover:shadow-card-hover"
              >
                {img && (
                  // eslint-disable-next-line @next/next/no-img-element
                  <img src={img} alt="" aria-hidden="true" className="absolute inset-0 h-full w-full object-cover transition-transform duration-700 ease-editorial group-hover:scale-105" />
                )}
                <div className="absolute inset-0 bg-gradient-to-t from-deep-ink/80 via-deep-ink/20 to-transparent" />
                <div className="relative flex items-end justify-between">
                  <h3 className="font-display text-[26px] font-semibold leading-tight">{cat.name_el}</h3>
                  <ArrowUpRight className="h-6 w-6 transition-transform group-hover:translate-x-1 group-hover:-translate-y-1" strokeWidth={1.75} />
                </div>
              </Link>
            );
          })}
        </div>
      </div>
    </section>
  );
}
```

> Note: uses a plain `<img>` (not `next/image`) because the source is a resolved absolute URL from `imageUrl()` and this is a decorative background; `alt=""` + `aria-hidden` keeps it out of the a11y tree (the link is named by its heading).

- [ ] **Step 4: Run, verify pass.** Run: `npm run test:run -- home-sections` → PASS.

- [ ] **Step 5: Commit**

```bash
git add components/home/Home1Destinations.tsx tests/home-sections.test.tsx
git commit -m "feat: Home1Destinations category cards"
```

---

## Task 5: `Home1About` — story + stats (About)

**Files:**
- Create: `components/home/Home1About.tsx`
- Test: add case to `tests/home-sections.test.tsx`

**Interfaces:**
- Consumes: `homeContent.about`, `stats` (`data/site`), `StatCounter`, `Button`, `Link`.
- Produces: `Home1About()` (server component; imports `stats` directly — static data).

- [ ] **Step 1: Write the failing test** — append:

```tsx
import { Home1About } from '@/components/home/Home1About';

describe('Home1About', () => {
  it('renders the about heading, the four stats labels, and the trust points', () => {
    render(<Home1About />);
    expect(screen.getByRole('heading', { name: /Περιστέρι/ })).toBeInTheDocument();
    expect(screen.getByText('Χρόνια Εμπειρίας')).toBeInTheDocument();
    expect(screen.getByText('Προορισμοί')).toBeInTheDocument();
    expect(screen.getByText('Εμπειρία από το 1995')).toBeInTheDocument();
    expect(screen.getByText('Προσιτές Τιμές')).toBeInTheDocument();
  });
});
```

- [ ] **Step 2: Run, verify fail.**

- [ ] **Step 3: Implement `components/home/Home1About.tsx`**

```tsx
import Link from 'next/link';
import { ShieldCheck } from 'lucide-react';
import { stats } from '@/data/site';
import { StatCounter } from '@/components/shared/StatCounter';
import { Button } from '@/components/ui/Button';
import { homeContent } from './content';

export function Home1About() {
  const c = homeContent.about;
  return (
    <section className="bg-deep-ink py-24 text-surface md:py-32" aria-label={c.title}>
      <div className="container grid gap-16 md:grid-cols-12 md:items-start">
        <div className="md:col-span-5">
          <p className="font-sans text-[13px] font-semibold uppercase tracking-[0.18em] text-gold">{c.eyebrow}</p>
          <h2 className="mt-4 font-display text-display-section text-surface">{c.title}</h2>
          <p className="mt-6 text-[17px] leading-relaxed text-surface/80">{c.body}</p>
          <div className="mt-8">
            <Button asChild variant="ghost">
              <Link href={c.ctaHref}>{c.cta}</Link>
            </Button>
          </div>
        </div>
        <div className="md:col-span-7">
          <div className="grid grid-cols-2 gap-10 md:gap-14">
            {stats.map((stat) => <StatCounter key={stat.id} stat={stat} />)}
          </div>
          <ul className="mt-14 grid gap-6 sm:grid-cols-2">
            {c.trust.map((item) => (
              <li key={item.title} className="flex gap-4">
                <ShieldCheck className="mt-1 h-6 w-6 shrink-0 text-gold" strokeWidth={1.5} aria-hidden="true" />
                <div>
                  <h3 className="font-display text-[19px] font-semibold text-surface">{item.title}</h3>
                  <p className="mt-1 text-[15px] leading-relaxed text-surface/70">{item.text}</p>
                </div>
              </li>
            ))}
          </ul>
        </div>
      </div>
    </section>
  );
}
```

- [ ] **Step 4: Run, verify pass.**

- [ ] **Step 5: Commit**

```bash
git add components/home/Home1About.tsx tests/home-sections.test.tsx
git commit -m "feat: Home1About story + animated stats"
```

---

## Task 6: `Home1Listing` — featured tours (Listing)

**Files:**
- Create: `components/home/Home1Listing.tsx`
- Test: add case to `tests/home-sections.test.tsx`

**Interfaces:**
- Consumes: `Tour[]`, `homeContent.listing`, `SectionHeading`, `TourCard`, `TextLink`.
- Produces: `Home1Listing({ tours }: { tours: Tour[] })` (server component).

- [ ] **Step 1: Write the failing test** — append (build a seed-shaped tour inline):

```tsx
import { Home1Listing } from '@/components/home/Home1Listing';
import type { Tour } from '@/types/db';

const tour = (o: Partial<Tour>): Tour => ({
  id: 'a', slug: 'ydra', title: 'Ύδρα', subtitle: null, summary: 'Το νησί του Μιαούλη', body: {},
  price_from: 25, price_original: null, currency: 'EUR', duration_label: 'Μονοήμερη',
  departure_note: null, meeting_point: null, status: 'published', is_featured: true,
  cover_image_id: null, seo_title: null, seo_description: null, source_url: null,
  sort_order: 0, published_at: null, categories: [], images: [], ...o,
});

describe('Home1Listing', () => {
  it('renders a card per featured tour', () => {
    render(<Home1Listing tours={[tour({ id: 'a', slug: 'ydra', title: 'Ύδρα' })]} />);
    expect(screen.getByRole('heading', { name: 'Ύδρα' })).toBeInTheDocument();
    expect(screen.getByRole('link', { name: /Ύδρα/ })).toHaveAttribute('href', '/tour/ydra');
  });
});
```

- [ ] **Step 2: Run, verify fail.**

- [ ] **Step 3: Implement `components/home/Home1Listing.tsx`**

```tsx
import type { Tour } from '@/types/db';
import { SectionHeading } from '@/components/shared/SectionHeading';
import { TextLink } from '@/components/ui/TextLink';
import { TourCard } from '@/components/trips/TourCard';
import { homeContent } from './content';

export function Home1Listing({ tours }: { tours: Tour[] }) {
  const c = homeContent.listing;
  if (tours.length === 0) return null;
  return (
    <section className="py-24 md:py-32" aria-label={c.title}>
      <div className="container">
        <SectionHeading
          eyebrow={c.eyebrow}
          title={c.title}
          subtitle={c.subtitle}
          action={<TextLink href={c.actionHref}>{c.action}</TextLink>}
        />
        <div className="mt-14 grid gap-6 sm:grid-cols-2 lg:grid-cols-3">
          {tours.map((t) => <TourCard key={t.id} tour={t} />)}
        </div>
      </div>
    </section>
  );
}
```

- [ ] **Step 4: Run, verify pass.**

- [ ] **Step 5: Commit**

```bash
git add components/home/Home1Listing.tsx tests/home-sections.test.tsx
git commit -m "feat: Home1Listing featured tours grid"
```

---

## Task 7: `Home1Promo` — πούλμαν band (Ads)

**Files:**
- Create: `components/home/Home1Promo.tsx`
- Test: add case to `tests/home-sections.test.tsx`

**Interfaces:**
- Consumes: `homeContent.promo`, `Button`, `Link`, lucide `Bus`.
- Produces: `Home1Promo()` (server component).

- [ ] **Step 1: Write the failing test** — append:

```tsx
import { Home1Promo } from '@/components/home/Home1Promo';

describe('Home1Promo', () => {
  it('renders the promo heading and CTA to bus rentals', () => {
    render(<Home1Promo />);
    expect(screen.getByRole('link', { name: /Ζητήστε προσφορά/ })).toHaveAttribute('href', '/enoikiaseis-poylman');
  });
});
```

- [ ] **Step 2: Run, verify fail.**

- [ ] **Step 3: Implement `components/home/Home1Promo.tsx`**

```tsx
import Link from 'next/link';
import { Bus } from 'lucide-react';
import { Button } from '@/components/ui/Button';
import { homeContent } from './content';

export function Home1Promo() {
  const c = homeContent.promo;
  return (
    <section className="py-8" aria-label={c.title}>
      <div className="container">
        <div className="relative overflow-hidden rounded-2xl bg-mesh-blue px-8 py-14 text-surface md:px-14">
          <Bus className="absolute -right-6 -top-6 h-48 w-48 text-surface/10" strokeWidth={1} aria-hidden="true" />
          <div className="relative max-w-2xl">
            <p className="font-sans text-[13px] font-semibold uppercase tracking-[0.18em] text-gold">{c.eyebrow}</p>
            <h2 className="mt-3 font-display text-display-section text-surface">{c.title}</h2>
            <p className="mt-5 text-[17px] leading-relaxed text-surface/85">{c.body}</p>
            <div className="mt-8">
              <Button asChild variant="accent" size="lg">
                <Link href={c.ctaHref}>{c.cta}</Link>
              </Button>
            </div>
          </div>
        </div>
      </div>
    </section>
  );
}
```

- [ ] **Step 4: Run, verify pass.**

- [ ] **Step 5: Commit**

```bash
git add components/home/Home1Promo.tsx tests/home-sections.test.tsx
git commit -m "feat: Home1Promo bus-rental band"
```

---

## Task 8: `Home1Process` — how it works (Process)

**Files:**
- Create: `components/home/Home1Process.tsx`
- Test: add case to `tests/home-sections.test.tsx`

**Interfaces:**
- Consumes: `homeContent.process`, `SectionHeading`.
- Produces: `Home1Process()` (server component).

- [ ] **Step 1: Write the failing test** — append:

```tsx
import { Home1Process } from '@/components/home/Home1Process';

describe('Home1Process', () => {
  it('renders all three steps', () => {
    render(<Home1Process />);
    expect(screen.getByText('Επιλέξτε εκδρομή')).toBeInTheDocument();
    expect(screen.getByText('Κλείστε θέση')).toBeInTheDocument();
    expect(screen.getByText('Ταξιδέψτε')).toBeInTheDocument();
  });
});
```

- [ ] **Step 2: Run, verify fail.**

- [ ] **Step 3: Implement `components/home/Home1Process.tsx`**

```tsx
import { SectionHeading } from '@/components/shared/SectionHeading';
import { homeContent } from './content';

export function Home1Process() {
  const c = homeContent.process;
  return (
    <section className="bg-background py-24 md:py-32" aria-label={c.title}>
      <div className="container">
        <SectionHeading eyebrow={c.eyebrow} title={c.title} align="center" />
        <ol className="mt-14 grid gap-6 md:grid-cols-3">
          {c.steps.map((s) => (
            <li key={s.n} className="relative rounded-lg border border-border bg-surface p-8 shadow-card">
              <span className="font-display text-6xl font-bold text-gold/40 tabular">{s.n}</span>
              <h3 className="mt-4 font-display text-[24px] font-semibold text-primary">{s.title}</h3>
              <p className="mt-3 text-[16px] leading-relaxed text-muted">{s.text}</p>
            </li>
          ))}
        </ol>
      </div>
    </section>
  );
}
```

- [ ] **Step 4: Run, verify pass.**

- [ ] **Step 5: Commit**

```bash
git add components/home/Home1Process.tsx tests/home-sections.test.tsx
git commit -m "feat: Home1Process three-step how-it-works"
```

---

## Task 9: `Home1Testimonials` — reviews (Testimonial)

**Files:**
- Create: `components/home/Home1Testimonials.tsx`
- Test: add case to `tests/home-sections.test.tsx`

**Interfaces:**
- Consumes: `testimonials` (`data/site`), `homeContent.testimonials`, `SectionHeading`, `TestimonialBlock`, `Stagger`/`StaggerItem`.
- Produces: `Home1Testimonials()` (server component; `Stagger` is client but composes fine).

- [ ] **Step 1: Write the failing test** — append:

```tsx
import { Home1Testimonials } from '@/components/home/Home1Testimonials';

describe('Home1Testimonials', () => {
  it('renders each testimonial author', () => {
    render(<Home1Testimonials />);
    expect(screen.getByText('Μαρία Κ.')).toBeInTheDocument();
    expect(screen.getByText('Γιώργος Π.')).toBeInTheDocument();
  });
});
```

- [ ] **Step 2: Run, verify fail.**

- [ ] **Step 3: Implement `components/home/Home1Testimonials.tsx`**

```tsx
import { testimonials } from '@/data/site';
import { SectionHeading } from '@/components/shared/SectionHeading';
import { TestimonialBlock } from '@/components/shared/TestimonialBlock';
import { Stagger, StaggerItem } from '@/components/motion/Reveal';
import { homeContent } from './content';

export function Home1Testimonials() {
  const c = homeContent.testimonials;
  return (
    <section className="py-24 md:py-32" aria-label={c.title}>
      <div className="container">
        <SectionHeading eyebrow={c.eyebrow} title={c.title} align="center" />
        <Stagger className="mt-14 grid gap-6 md:grid-cols-3">
          {testimonials.map((t) => (
            <StaggerItem key={t.id}>
              <TestimonialBlock item={t} />
            </StaggerItem>
          ))}
        </Stagger>
      </div>
    </section>
  );
}
```

- [ ] **Step 4: Run, verify pass.**

- [ ] **Step 5: Commit**

```bash
git add components/home/Home1Testimonials.tsx tests/home-sections.test.tsx
git commit -m "feat: Home1Testimonials reviews grid"
```

---

## Task 10: `Home1News` — proposed/upcoming tours (Blog)

**Files:**
- Create: `components/home/Home1News.tsx`
- Test: add case to `tests/home-sections.test.tsx`

**Interfaces:**
- Consumes: `Tour[]` (up to 3 non-featured, else any), `homeContent.news`, `SectionHeading`, `TourCard`, `TextLink`.
- Produces: `Home1News({ tours }: { tours: Tour[] })` (server component).

- [ ] **Step 1: Write the failing test** — append:

```tsx
import { Home1News } from '@/components/home/Home1News';

describe('Home1News', () => {
  it('renders up to three tour cards', () => {
    const list = [
      tour({ id: 'a', slug: 'tinos', title: 'Τήνος' }),
      tour({ id: 'b', slug: 'delphi', title: 'Δελφοί' }),
      tour({ id: 'c', slug: 'meteora', title: 'Μετέωρα' }),
      tour({ id: 'd', slug: 'pilio', title: 'Πήλιο' }),
    ];
    render(<Home1News tours={list} />);
    expect(screen.getAllByRole('link', { name: /Λεπτομέρειες/ }).length).toBe(3);
  });
});
```

- [ ] **Step 2: Run, verify fail.**

- [ ] **Step 3: Implement `components/home/Home1News.tsx`**

```tsx
import type { Tour } from '@/types/db';
import { SectionHeading } from '@/components/shared/SectionHeading';
import { TextLink } from '@/components/ui/TextLink';
import { TourCard } from '@/components/trips/TourCard';
import { homeContent } from './content';

export function Home1News({ tours }: { tours: Tour[] }) {
  const c = homeContent.news;
  const items = tours.slice(0, 3);
  if (items.length === 0) return null;
  return (
    <section className="bg-background py-24 md:py-32" aria-label={c.title}>
      <div className="container">
        <SectionHeading
          eyebrow={c.eyebrow}
          title={c.title}
          subtitle={c.subtitle}
          action={<TextLink href={c.actionHref}>{c.action}</TextLink>}
        />
        <div className="mt-14 grid gap-6 sm:grid-cols-2 lg:grid-cols-3">
          {items.map((t) => <TourCard key={t.id} tour={t} />)}
        </div>
      </div>
    </section>
  );
}
```

- [ ] **Step 4: Run, verify pass.**

- [ ] **Step 5: Commit**

```bash
git add components/home/Home1News.tsx tests/home-sections.test.tsx
git commit -m "feat: Home1News proposed tours grid"
```

---

## Task 11: `Home1Cta` — contact CTA (Cta)

**Files:**
- Create: `components/home/Home1Cta.tsx`
- Test: add case to `tests/home-sections.test.tsx`

**Interfaces:**
- Consumes: `SettingsData` (via props), `homeContent.cta`, lucide `Phone`, `Link`.
- Produces: `Home1Cta({ settings }: { settings: SettingsData })` (server component).

- [ ] **Step 1: Write the failing test** — append:

```tsx
import { Home1Cta } from '@/components/home/Home1Cta';
import type { SettingsData } from '@/types/db';

const settings: SettingsData = {
  phones: ['210 571 2451', '6976 811 825'],
  address: 'Π. Μελά 45, Περιστέρι 121 31',
  email: 'info@sergianitravel.gr',
  hours: { weekdays: '09:00–17:00', saturday: '09:00–14:00' },
};

describe('Home1Cta', () => {
  it('renders a tel: link for the primary phone', () => {
    render(<Home1Cta settings={settings} />);
    expect(screen.getByRole('link', { name: /210 571 2451/ })).toHaveAttribute('href', 'tel:+302105712451');
  });
});
```

- [ ] **Step 2: Run, verify fail.**

- [ ] **Step 3: Implement `components/home/Home1Cta.tsx`**

```tsx
import Link from 'next/link';
import { Phone } from 'lucide-react';
import type { SettingsData } from '@/types/db';
import { homeContent } from './content';

/** Greek phone → tel: E.164 (strip spaces, prefix +30 for local 10-digit numbers). */
function telHref(phone: string): string {
  const digits = phone.replace(/\s+/g, '');
  return digits.startsWith('+') ? `tel:${digits}` : `tel:+30${digits}`;
}

export function Home1Cta({ settings }: { settings: SettingsData }) {
  const c = homeContent.cta;
  const phone = settings.phones[0] ?? '210 571 2451';
  return (
    <section className="bg-gold py-16 text-[#00296b]" aria-label={c.title}>
      <div className="container flex flex-col items-center justify-between gap-6 text-center md:flex-row md:text-left">
        <div>
          <h2 className="font-display text-3xl font-semibold md:text-4xl">{c.title}</h2>
          <p className="mt-2 text-[17px] text-[#00296b]/80">{c.body}</p>
        </div>
        <div className="flex flex-col gap-3 sm:flex-row sm:items-center">
          <a
            href={telHref(phone)}
            className="inline-flex items-center gap-3 rounded-full bg-[#00296b] px-6 py-3 font-display text-2xl font-semibold text-surface transition hover:bg-primary"
          >
            <Phone className="h-5 w-5" strokeWidth={1.75} /> {phone}
          </a>
          <Link
            href={c.messageHref}
            className="font-sans text-[13px] font-semibold uppercase tracking-[0.14em] underline underline-offset-4 hover:text-[#00296b]/70"
          >
            {c.messageCta}
          </Link>
        </div>
      </div>
    </section>
  );
}
```

- [ ] **Step 4: Run, verify pass.**

- [ ] **Step 5: Commit**

```bash
git add components/home/Home1Cta.tsx tests/home-sections.test.tsx
git commit -m "feat: Home1Cta contact call-to-action"
```

---

## Task 12: Compose the new home page + SEO

**Files:**
- Modify: `app/(site)/page.tsx` (replace body with the new composition)

**Interfaces:**
- Consumes: `getFeaturedTours`, `getTours`, `getCategories`, `getSettings`, all `Home1*` sections.

- [ ] **Step 1: Replace `app/(site)/page.tsx`** with:

```tsx
import type { Metadata } from 'next';
import { getFeaturedTours, getTours } from '@/lib/queries/tours';
import { getCategories } from '@/lib/queries/categories';
import { getSettings } from '@/lib/queries/settings';
import { Home1Hero } from '@/components/home/Home1Hero';
import { Home1Destinations } from '@/components/home/Home1Destinations';
import { Home1About } from '@/components/home/Home1About';
import { Home1Listing } from '@/components/home/Home1Listing';
import { Home1Promo } from '@/components/home/Home1Promo';
import { Home1Process } from '@/components/home/Home1Process';
import { Home1Testimonials } from '@/components/home/Home1Testimonials';
import { Home1News } from '@/components/home/Home1News';
import { Home1Cta } from '@/components/home/Home1Cta';

export const metadata: Metadata = {
  title: 'Sergiani Travel · Εκδρομές, Κρουαζιέρες & Πούλμαν από την Αθήνα',
  description:
    'Μονοήμερες και πολυήμερες εκδρομές, κρουαζιέρες και ενοικιάσεις πούλμαν από την Αθήνα. 30 χρόνια εμπειρίας, άνετα πούλμαν, ξεκάθαρες τιμές.',
  alternates: { canonical: '/' },
};

export default async function HomePage() {
  const [featured, allTours, categories, settings] = await Promise.all([
    getFeaturedTours(),
    getTours(),
    getCategories(),
    getSettings(),
  ]);
  const news = allTours.filter((t) => !t.is_featured);

  return (
    <>
      <Home1Hero categories={categories} />
      <Home1Destinations categories={categories} tours={allTours} />
      <Home1About />
      <Home1Listing tours={featured} />
      <Home1Promo />
      <Home1Process />
      <Home1Testimonials />
      <Home1News tours={news.length ? news : allTours} />
      <Home1Cta settings={settings} />
    </>
  );
}
```

- [ ] **Step 2: Build**

Run: `npm run build`
Expected: success; `/` compiles as a dynamic/server route.

- [ ] **Step 3: Commit**

```bash
git add app/\(site\)/page.tsx
git commit -m "feat: compose Home 1 production homepage from live data"
```

---

## Task 13: Full verification

- [ ] **Step 1: Lint**

Run: `npm run lint`
Expected: no errors. Fix any oxlint issues in the new files.

- [ ] **Step 2: Unit tests**

Run: `npm run test:run`
Expected: all tests pass (existing + new `home-search`, `home-sections`).

- [ ] **Step 3: Build**

Run: `npm run build`
Expected: success, no type errors.

- [ ] **Step 4: Manual smoke (dev)**

Run: `npm run dev` (serigiani; port 3000). Open `http://localhost:3000/` and confirm:
  - All 9 sections render in Greek, in Home 1 order.
  - Hero search: choosing "Μονοήμερες" + Αναζήτηση navigates to `/ekdromes/monoimeres`; "Όλες" → `/ekdromes`.
  - Featured/News cards link to `/tour/<slug>`; category cards → `/ekdromes/<slug>`; πούλμαν CTA → `/enoikiaseis-poylman`; phone is a working `tel:` link.
  - Stats animate (or show final values with reduced motion).
  - `/arxiki-legacy` still renders the old home; `/ekdromes`, `/kroyazieres`, `/epikoinonia`, `/admin` unchanged.

- [ ] **Step 5: Accessibility spot-check** — keyboard-tab through hero form and links; verify each `<section>` has a heading/label; images have alt (decorative ones `alt=""`).

- [ ] **Step 6: Run Task 0** (crawl reconciliation) if not already done, then re-run Steps 2–3.

- [ ] **Step 7: Final commit** (if any fixes)

```bash
git add -A
git commit -m "chore: home page verification fixes"
```

---

## Self-Review (completed by author)

- **Spec coverage:** Hero+search (T3), Location→Destinations (T4), About+stats (T5), Listing (T6), Ads→Promo (T7), Process (T8), Testimonials (T9), Blog→News (T10), Cta (T11), compose+SEO (T12), legacy preserve (T1), crawl reconcile (T0), verify (T13). All spec sections mapped.
- **Placeholder scan:** none — every component has full code; copy is concrete Greek in `content.ts`.
- **Type consistency:** section prop types match the page's fetched data (`Category[]`, `Tour[]`, `SettingsData`); helper names (`buildSearchHref`, `telHref`, `categoryImage`) are defined where used; reused component props (`TourCard{tour}`, `StatCounter{stat}`, `TestimonialBlock{item}`, `SectionHeading`, `Button` variants) match their real signatures.
```
