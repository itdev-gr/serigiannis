# Sergiani "Aegean Blue-Gold" Redesign Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Re-skin the existing Next.js + Supabase site to the original sergianitravel.gr brand identity (blue/gold, Open Sans) but modern — new design tokens, Poppins+Open Sans type, glass/gradient depth, and a Framer Motion + GSAP motion layer — without touching the backend, data, or dashboard functionality.

**Architecture:** The current UI uses semantic Tailwind tokens (`primary`, `cta`, `background`, `surface`, `body`, `muted`, `deep-ink`, `border`) and a small set of shared components. Remapping the tokens + fonts re-skins most of the site in one move; the rest is targeted component polish (hero, badges, gradients, glass) plus a reusable motion layer. Framer Motion owns component/gesture/page/scroll-reveal motion; GSAP owns scroll-scrubbed hero parallax + numeric counters. Everything gates on `prefers-reduced-motion`.

**Tech Stack:** Next.js (App Router), React 19, TypeScript, Tailwind CSS 3, **framer-motion** (new), GSAP + ScrollTrigger (existing), Supabase.

## Global Constraints

- **This is visual only.** Do NOT change: Supabase schema/RLS, `lib/queries/*` data layer, migration scripts, admin CRUD logic, routing, or SEO structure. Behaviour and data stay identical.
- **Palette (from the live site — exact hex):** brand blue `#00519d`, deep navy `#00296b`, gold `#fdc500`, orange `#f99a00`, white `#ffffff`, soft blue-grey `#f4f7fb`, hairline `#e6e6e6`.
- **Contrast rules (WCAG AA — verbatim, non-negotiable):**
  - Text on white: navy `#00296b` (13:1) or blue `#00519d` (5.6:1). Body text `#16233b`. Muted `#5b6b82` (4.7:1). ✅
  - White text only on blue `#00519d`/navy `#00296b` (≥5.6:1). ✅
  - Gold `#fdc500` and orange `#f99a00` are **accents/gradients/icons only — never a background behind white or small text.** Gold as a filled surface must carry **navy `#00296b` text** (7.9:1). ✅
- **Fonts:** Poppins (headings, 500/600/700) + Open Sans (body, 400/600). Open Sans preserves the original's voice; Poppins modernizes headings.
- **Motion ownership:** Framer Motion = page transitions, scroll reveals (`whileInView`), gesture (`whileHover`/`whileTap`), mobile-menu `AnimatePresence`, stagger. GSAP = hero image parallax (scrub) + stat count-up. No two systems animate the same property on the same element.
- **Motion safety:** every animation checks `prefers-reduced-motion: reduce` → render final state instantly. Animate only `transform`/`opacity`/`filter`. GSAP tweens cleaned up via existing `useGsapContext`.
- Greek copy preserved verbatim. No links/assets to `sergianitravel.gr`. Responsive at 375/768/1024/1440.

---

## File Structure

- `tailwind.config.ts` — remap `theme.extend.colors` + `fontFamily` + gradients/shadows. **(the core re-skin)**
- `app/globals.css` — swap Google Fonts to Poppins+Open Sans; update `:root` color vars; add glass/gradient/grain utilities.
- `components/motion/Reveal.tsx`, `Stagger.tsx` — Framer scroll-reveal primitives (client).
- `components/motion/MotionPrimitives.tsx` — shared variants + a reduced-motion-aware `MotionConfig` wrapper.
- `app/(site)/template.tsx` — Framer page-transition wrapper (replaces the GSAP `PageTransition`).
- `components/ui/button-variants.ts` + `Button.tsx` — recolor + add `accent` (gold) variant.
- `components/ui/Badge.tsx` — `PriceBadge` → gold/navy.
- `components/home/HomeHero.tsx` — blue mesh-gradient hero + GSAP parallax + Framer title stagger.
- Per-page/section files — token-driven; targeted edits only where terracotta-specific styling needs rethinking.
- `components/shared/RevealOnScroll.tsx` — kept for large batch grids (GSAP) OR superseded by Framer `Reveal` (Task 3 decides per usage).

---

### Task 1: Install Framer Motion + remap design tokens + fonts (the core re-skin)

**Files:**
- Modify: `package.json` (add `framer-motion`), `tailwind.config.ts`, `app/globals.css`

**Interfaces:**
- Produces: Tailwind tokens `primary` `#00519d`/hover `#00296b`, `sea` `#4d83c9`, `cta` `#00519d`/hover `#00296b`, `gold` `#fdc500`, `amber` `#f99a00`, `background` `#f4f7fb`, `surface` `#ffffff`, `body` `#16233b`, `muted` `#5b6b82`, `deep-ink` `#00296b`, `olive` `#3f7d58`, `border` `rgba(0,41,107,0.12)`; `font-display` = Poppins, `font-sans` = Open Sans. Consumed by every component.

- [ ] **Step 1: Install framer-motion**

```bash
npm install framer-motion
```

- [ ] **Step 2: Remap `tailwind.config.ts` colors + fonts** — replace the `extend.colors` and `extend.fontFamily` blocks:

```ts
colors: {
  primary: { DEFAULT: '#00519d', hover: '#00296b' },
  sea: '#4d83c9',
  cta: { DEFAULT: '#00519d', hover: '#00296b' },
  gold: { DEFAULT: '#fdc500', hover: '#e6b000' },
  amber: '#f99a00',
  background: '#f4f7fb',
  surface: '#ffffff',
  body: '#16233b',
  muted: '#5b6b82',
  olive: '#3f7d58',
  'deep-ink': '#00296b',
  border: 'rgba(0, 41, 107, 0.12)',
},
fontFamily: {
  display: ['Poppins', 'system-ui', 'sans-serif'],
  sans: ['"Open Sans"', 'system-ui', '-apple-system', 'sans-serif'],
},
```
Also add to `extend.boxShadow`: `cta: '0 8px 20px -6px rgba(0, 81, 157, 0.35)'` and `gold: '0 8px 20px -6px rgba(253, 197, 0, 0.4)'`; add `extend.backgroundImage`: `{ 'mesh-blue': 'radial-gradient(60% 80% at 20% 10%, #4d83c9 0%, transparent 60%), radial-gradient(50% 70% at 90% 20%, #00519d 0%, transparent 55%), linear-gradient(160deg, #00296b, #00519d)' }`.

- [ ] **Step 3: Update `app/globals.css`** — replace the Google Fonts `@import` line with:

```css
@import url('https://fonts.googleapis.com/css2?family=Poppins:wght@500;600;700&family=Open+Sans:wght@400;500;600;700&display=swap');
```
Update `:root` vars to the new palette RGB triplets (`--color-primary: 0 81 157; --color-cta: 0 81 157; --color-bg: 244 247 251; --color-surface: 255 255 255; --color-body: 22 35 59; --color-muted: 91 107 130; --color-deep-ink: 0 41 107; --color-gold: 253 197 0;`). Keep the reduced-motion block and utilities.

- [ ] **Step 4: Verify**

```bash
npm run dev   # visit http://localhost:3000
```
Expected: entire site now blue/gold, Poppins headings, Open Sans body; no terracotta/ivory remains; no console errors.

- [ ] **Step 5: Commit**

```bash
git add -A && git commit -m "feat(redesign): remap tokens to blue-gold + Poppins/Open Sans; add framer-motion"
```

---

### Task 2: Depth utilities — glass, blue mesh, soft sections, gold accents

**Files:**
- Modify: `app/globals.css` (add `@layer utilities`)

- [ ] **Step 1: Add utilities** to `app/globals.css`:

```css
@layer utilities {
  .bg-mesh-blue { background-image: radial-gradient(60% 80% at 20% 10%, #4d83c9 0%, transparent 60%), radial-gradient(50% 70% at 90% 20%, #00519d 0%, transparent 55%), linear-gradient(160deg, #00296b, #00519d); }
  .glass { background: rgba(255,255,255,0.72); backdrop-filter: blur(14px) saturate(160%); -webkit-backdrop-filter: blur(14px) saturate(160%); }
  .glass-dark { background: rgba(0,41,107,0.55); backdrop-filter: blur(14px); -webkit-backdrop-filter: blur(14px); }
  .section-soft { background: #f4f7fb; }
  .text-gradient-blue { background: linear-gradient(120deg, #00519d, #4d83c9); -webkit-background-clip: text; background-clip: text; color: transparent; }
}
```

- [ ] **Step 2: Verify** a throwaway `<div className="bg-mesh-blue h-40">` renders the blue mesh; remove after checking.
- [ ] **Step 3: Commit** `feat(redesign): glass + blue-mesh + soft-section utilities`

---

### Task 3: Framer Motion foundation — reveal/stagger primitives + page transition

**Files:**
- Create: `components/motion/MotionPrimitives.tsx`, `components/motion/Reveal.tsx`, `app/(site)/template.tsx`
- Modify: `app/(site)/layout.tsx` (drop the GSAP `<PageTransition>` wrapper; keep skip-link/nav/footer)

**Interfaces:**
- Produces: `<Reveal>` (fade+rise on scroll into view, once), `<Stagger>` + `<StaggerItem>` (staggered children), shared `variants`. Consumed by home/listing/detail sections.

- [ ] **Step 1: `components/motion/MotionPrimitives.tsx`** (client) — reduced-motion-aware variants:

```tsx
'use client';
import { type Variants } from 'framer-motion';
export const fadeUp: Variants = {
  hidden: { opacity: 0, y: 28 },
  show: { opacity: 1, y: 0, transition: { duration: 0.6, ease: [0.22, 1, 0.36, 1] } },
};
export const staggerParent: Variants = {
  hidden: {},
  show: { transition: { staggerChildren: 0.09 } },
};
```

- [ ] **Step 2: `components/motion/Reveal.tsx`** (client):

```tsx
'use client';
import { motion } from 'framer-motion';
import { useReducedMotion } from '@/hooks/useReducedMotion';
import { fadeUp } from './MotionPrimitives';

export function Reveal({ children, className }: { children: React.ReactNode; className?: string }) {
  const reduced = useReducedMotion();
  if (reduced) return <div className={className}>{children}</div>;
  return (
    <motion.div className={className} variants={fadeUp} initial="hidden"
      whileInView="show" viewport={{ once: true, margin: '0px 0px -80px 0px' }}>
      {children}
    </motion.div>
  );
}
```
Also export `Stagger` (uses `staggerParent`, whileInView) and `StaggerItem` (uses `fadeUp`) in the same file.

- [ ] **Step 3: `app/(site)/template.tsx`** (Framer page transition — `template.tsx` re-mounts per navigation):

```tsx
'use client';
import { motion } from 'framer-motion';
import { useReducedMotion } from '@/hooks/useReducedMotion';
export default function Template({ children }: { children: React.ReactNode }) {
  const reduced = useReducedMotion();
  if (reduced) return <div id="main" tabIndex={-1}>{children}</div>;
  return (
    <motion.div id="main" tabIndex={-1} initial={{ opacity: 0, y: 12 }} animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.45, ease: [0.22, 1, 0.36, 1] }}>
      {children}
    </motion.div>
  );
}
```

- [ ] **Step 4:** In `app/(site)/layout.tsx`, remove the `<PageTransition>` import + wrapper (the `template.tsx` now handles transitions + the `#main` skip target). Keep `<a className="skip-link">`, `<Navbar/>`, `<Footer/>`.
- [ ] **Step 5: Verify** navigation fades between pages; reveals fire on scroll; reduced-motion (emulate) shows instant final states; no console errors.
- [ ] **Step 6: Commit** `feat(motion): framer reveal/stagger primitives + page transition`

---

### Task 4: Recolor Button (add gold `accent`) + PriceBadge → gold/navy

**Files:**
- Modify: `components/ui/button-variants.ts`, `components/ui/Badge.tsx`

- [ ] **Step 1:** In `button-variants.ts`, the existing variants inherit the new tokens (primary = blue). Add an `accent` variant:

```ts
accent: 'bg-gold text-[#00296b] shadow-gold hover:bg-gold-hover hover:-translate-y-0.5 active:translate-y-0',
```
(navy text on gold = 7.9:1 ✓.) Keep `primary` (blue+white), `ghost`, `outline`, `dark`.

- [ ] **Step 2:** In `Badge.tsx` `PriceBadge`, change the container to gold with navy text:

```tsx
<div className="inline-flex items-center gap-2 rounded-full bg-gold px-4 py-2 text-[#00296b] shadow-md">
  {original !== undefined && original > from && (
    <span className="font-sans text-[13px] font-semibold line-through opacity-60">{original}€</span>
  )}
  <span className="font-sans text-[16px] font-bold tabular">από {from}€</span>
</div>
```
Also update `badgeVariants.cta` to `bg-primary text-surface` (blue) and add `gold: 'bg-gold text-[#00296b]'`.

- [ ] **Step 3: Verify** buttons blue with white text; price badges gold with navy text; hover states smooth.
- [ ] **Step 4: Commit** `feat(redesign): gold accent button + gold price badge`

---

### Task 5: Home hero — blue mesh gradient + GSAP parallax + Framer title stagger

**Files:**
- Modify: `components/home/HomeHero.tsx`

- [ ] **Step 1:** Replace the flat dark overlay with a layered treatment: keep the `next/image` hero, add a `bg-gradient-to-b from-deep-ink/35 via-deep-ink/25 to-deep-ink/85` overlay AND a top `.bg-mesh-blue` accent band behind the eyebrow for brand color. Keep `priority`.
- [ ] **Step 2: GSAP parallax (implement, reduced-motion gated)** — inside the existing `useGsapContext`, add a scrubbed parallax on `[data-hero-img]`:

```tsx
gsap.to('[data-hero-img]', {
  yPercent: 12, ease: 'none',
  scrollTrigger: { trigger: scopeRef.current!, start: 'top top', end: 'bottom top', scrub: true },
});
```
(Keep the existing mount scale-in; do NOT also tween `y` on mount to avoid conflict — scrub owns scroll `y`, mount owns `scale`.)

- [ ] **Step 3:** Convert the title reveal from SplitType/GSAP to Framer word stagger for crisper control (or keep SplitType — either is fine; if keeping SplitType, leave as-is). If migrating: wrap each word in `motion.span` with `fadeUp` + parent stagger.
- [ ] **Step 4:** Recolor CTAs: primary `<Button size="lg">` (blue) → "Δείτε τις Εκδρομές"; secondary `variant="accent"` (gold) or `ghost` for "Ενοικίαση Πούλμαν".
- [ ] **Step 5: Verify** hero shows blue-brand gradient depth; image parallaxes on scroll; title staggers in; reduced-motion static; no layout shift.
- [ ] **Step 6: Commit** `feat(redesign): home hero blue-gradient + parallax + motion`

---

### Task 6: Home sections polish + motion

**Files:**
- Modify: `app/(site)/page.tsx`, `components/home/CategoryStrip.tsx`, `components/home/EditorialFeature.tsx`, `components/shared/StatCounter.tsx`, `components/shared/TestimonialBlock.tsx`

- [ ] **Step 1:** Wrap the featured-trips grid, testimonials grid, and section headings in `<Reveal>`/`<Stagger>` (Framer) instead of the GSAP `RevealOnScroll` where they are simple reveals; keep `data-reveal` GSAP only if a batch is clearly better. Ensure only ONE system per element.
- [ ] **Step 2:** "About + stats" band: set to `bg-deep-ink` (navy) — stat numbers in gold (`text-gold`) for pop (gold on navy = 9:1 ✓). Keep GSAP count-up in `StatCounter`; change the number color class to `text-gold`.
- [ ] **Step 3:** `CategoryStrip`: chips get `hover:bg-primary hover:text-surface` (blue) — already token-driven; verify. `EditorialFeature`: eyebrow/accent → `text-primary`/`text-amber`; keep GSAP mask reveal.
- [ ] **Step 4:** CTA band at page bottom: change `bg-cta` (now blue) → keep blue, OR use `bg-gold text-[#00296b]` for a gold "call us" band (higher energy). Choose gold; ensure the phone link + text use navy.
- [ ] **Step 5: Verify** home reads as a cohesive blue/gold editorial page; reveals fire once; counters run; reduced-motion static.
- [ ] **Step 6: Commit** `feat(redesign): home sections recolor + framer reveals + gold stats`

---

### Task 7: Listing + cards + filter bar

**Files:**
- Modify: `components/trips/TourCard.tsx`, `components/trips/FeatureTripCard.tsx`, `components/trips/ToursExplorer.tsx`, `components/shared/PageHero.tsx`

- [ ] **Step 1:** `PageHero`: when no photo, use `.bg-mesh-blue` instead of the old primary→deep-ink gradient (brand blue mesh). Keep overlay + parallax on `[data-hero-image]` (add the same scrub as Task 5).
- [ ] **Step 2:** `TourCard`/`FeatureTripCard`: category chip → `bg-glass text-primary` (glass) ; keep gold `PriceBadge`; card hover already CSS. Wrap the grid in `ToursExplorer` with a Framer `Stagger` on the visible page items (client — ToursExplorer already client).
- [ ] **Step 3:** `ToursExplorer` filter bar: active chip `bg-primary text-surface` (blue) — token-driven; sticky bar `glass` background. Verify count/empty-state colors.
- [ ] **Step 4: Verify** `/ekdromes` grid staggers in, filters recolor correctly, cards pop on the soft background.
- [ ] **Step 5: Commit** `feat(redesign): listing cards + filter bar + hero mesh`

---

### Task 8: Tour detail + Task 9: remaining pages

**Files (Task 8):** `app/(site)/tour/[slug]/page.tsx`
**Files (Task 9):** `app/(site)/{kroyazieres,enoikiaseis-poylman,epikoinonia,oroi,istoriko-ekdromon}/page.tsx`

- [ ] **Step 1 (detail):** Info card CTA → `variant="accent"` (gold) "Κλείστε Θέση"; price in `text-primary`; wrap description + related grid in `<Reveal>`. Keep JSON-LD/ISR untouched.
- [ ] **Step 2 (cruises/rentals/contact/terms/istoriko):** these are token-driven — verify each renders correctly in blue/gold; recolor any hard-coded accent (e.g. rentals value-prop icon circles `bg-primary/10 text-primary`; contact sidebar stays `bg-deep-ink` navy; quote/contact form focus rings now blue). Add `<Reveal>` to major sections.
- [ ] **Step 3 (rentals dark CTA):** the `bg-deep-ink` band + gold accents read well; verify contrast.
- [ ] **Step 4: Verify** every route 200, correct colors, motion, reduced-motion static.
- [ ] **Step 5: Commit** `feat(redesign): tour detail + secondary pages recolor + motion`

---

### Task 10: Dashboard reskin (inherits tokens; light touch)

**Files:** `app/admin/login/page.tsx`, `app/admin/(dashboard)/layout.tsx`, `app/admin/(dashboard)/page.tsx`, `components/admin/TourForm.tsx`

- [ ] **Step 1:** These use the same tokens → mostly auto-reskinned. Verify: login card, status badges (published = a green/olive `#3f7d58`; hidden = amber `bg-amber/15 text-amber` — note amber text needs check: `#b06f00` for text). Use `text-amber` only on light chips with sufficient contrast; if `#f99a00` fails on its 15% tint, use a darker amber `#a15c00` for the label text. Featured star → `text-gold`.
- [ ] **Step 2: Verify** `/admin/login` renders on-brand; guard still works.
- [ ] **Step 3: Commit** `feat(redesign): admin dashboard on blue-gold tokens`

---

### Task 11: QA — contrast, motion, responsive, build

**Files:** none (verification) + small fixes as found.

- [ ] **Step 1: Contrast audit** — verify against the Global Constraints table: no white text on gold/orange; no gold/orange text on white; muted `#5b6b82` used for secondary text only. Fix any violation found.
- [ ] **Step 2: Reduced-motion** — emulate `prefers-reduced-motion: reduce`; confirm hero parallax, reveals, page transition, counters all render final state instantly.
- [ ] **Step 3: Responsive** — check 375/768/1024/1440 on Home, `/ekdromes`, a tour, contact. No horizontal scroll; nav/hero legible.
- [ ] **Step 4: Gauntlet**

```bash
npm run test:run   # 10/10
npm run build      # succeeds; SSG/ISR intact
npm run lint       # clean
grep -rn "sergianitravel.gr" app components lib | grep -v source_url   # only non-rendered refs
```
- [ ] **Step 5: Commit** `chore(redesign): QA fixes; blue-gold redesign complete`

---

## Notes / deferred
- Backend, data (254 tours), migration, admin CRUD, SEO, ISR: untouched by this plan.
- Optional follow-ups (not in scope): move the 2 hard-coded hero/editorial Unsplash images into Storage; add a pinned GSAP "storytelling" section on Home; dark-mode variant.
- The admin account creation (user-side) and its role grant remain pending from the prior phase.
