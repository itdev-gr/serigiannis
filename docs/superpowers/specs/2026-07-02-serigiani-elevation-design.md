# Sergiani Travel — "Aegean Editorial v2" Elevation Design Spec

**Date:** 2026-07-02
**Builds on:** `2026-07-01-serigiani-redesign-design.md` (the original "Aegean Editorial" system — unchanged as the foundation)
**Deliverable:** A visual/UX elevation pass over the existing 5-page React template. No redesign; the identity (palette, type, layout language) is preserved and pushed to premium.
**Driver:** Smoke test on 2026-07-02 — build/tests/lint green, no console errors, but the image experience, motion completeness, and listing findability have clear headroom.

---

## 1. Goals & Non-Goals

### Goals
- **Perceived quality of "best possible".** Eliminate empty-image voids and layout shift; make motion feel intentional and complete; make the trip catalog easy to filter.
- Keep the **"Aegean Editorial"** identity intact — this is elevation, not a new direction.
- Stay a **static template** (no backend, mock data) and keep copy in **Greek**.
- Remove production fragility (external image CDNs) so the client demo is robust offline/anywhere.
- Preserve accessibility (WCAG AA) and full `prefers-reduced-motion` support already in place.

### Non-Goals
- No conversion/trust layer this pass: **no** sticky call bar, WhatsApp/Viber float, review stars, or association badges (explicitly deferred by the client).
- No backend, booking engine, CMS, i18n, auth, or payments.
- No change to the core palette, type scale, or information architecture.
- No bolder/experimental redesign of layouts.

### Scope of focus (chosen)
1. Image experience & speed
2. Motion & visual richness
3. Listing findability

Plus a small **Foundation** bucket that directly serves speed and removes console/lint noise.

---

## 2. Foundation (small, unblocks the rest)

| Item | Change | Why |
|---|---|---|
| Route code-splitting | Wrap the 5 page components in `React.lazy` + a `<Suspense>` fallback in `App.tsx`. GSAP/ScrollTrigger stay in a shared chunk. | The build ships one 1.1 MB JS chunk (322 KB gzip). Splitting cuts per-page payload and speeds first paint. |
| Suspense fallback | A minimal branded fallback (Ivory Sand background + subtle centered mark) matching the page-transition feel, so lazy loads never flash white. | Avoids a jarring blank during chunk fetch. |
| Router future flags | Pass `future={{ v7_startTransition: true, v7_relativeSplatPath: true }}` to the router. | Silences the two console warnings seen in the smoke test. |
| `buttonVariants` export | Move `buttonVariants` (and the `ButtonProps` type if needed) so `Button.tsx` only exports components — e.g. into `button-variants.ts`. | Clears the one oxlint fast-refresh warning; keeps HMR clean. |

**Acceptance:** `npm run build` shows more than one JS chunk; `npm run lint` is warning-free; browser console is clean on all routes.

---

## 3. Image experience & speed

The single biggest perceived-quality win. Three parts: a component, a pipeline, and the hero LCP fix.

### 3.1 `<SmartImage>` component (`src/components/ui/SmartImage.tsx`)
A single reusable image primitive used everywhere a photo currently appears.

Behavior:
- Renders an **aspect-ratio box** (from known intrinsic `width`/`height`) so layout never shifts as images load (fixes CLS).
- Shows an **LQIP blur-up**: a tiny (~20px) blurred placeholder (base64) rendered behind, scaled up and blurred, that **cross-fades out** when the full image's `load`/`decode` resolves.
- Emits responsive **`srcset` + `sizes`** from the generated widths.
- `decoding="async"`; `loading="lazy"` by default, overridable to eager for above-the-fold.
- Optional `priority` prop → sets `loading="eager"` + `fetchpriority="high"` and skips the fade delay (for the hero).
- Reduced-motion: the blur-up cross-fade uses a short CSS opacity transition already covered by the global reduced-motion rule; no JS gating needed.

Props (sketch): `{ id: string; alt: string; className?; sizes?; priority?; aspect?: string }` — `id` resolves against the image manifest (below). An optional `src` escape hatch accepts a raw URL for the fallback path (§3.4).

### 3.2 Image pipeline (vendored, local, optimized)
- A one-time Node script `scripts/gen-images.mjs` using **`sharp`** (added as a devDependency):
  1. Reads a curated source list `scripts/image-sources.ts` mapping `id → { sourceUrl, alt, focalPoint? }` for every photo in the site (hero, editorial feature, all trips, cruises, rentals, page heroes).
  2. Downloads each source once, resizes to widths **`[400, 800, 1200, 1600, 2000]`**, encodes **WebP** (primary) — AVIF optional/stretch.
  3. Computes a 20px **LQIP** and inlines it as a base64 data URI.
  4. Writes optimized files to **`public/images/<id>-<width>.webp`** and a manifest.
- Generated manifest `src/data/imageManifest.ts`: `Record<id, { srcset: string; fallbackSrc: string; width: number; height: number; lqip: string; }>`. Committed to the repo so the app never needs the script at runtime.
- **Data files** (`trips.ts`, `cruises.ts`, page heroes, etc.) stop holding raw CDN URLs and instead reference an image **`id`**. `SmartImage` resolves `id → manifest`.

### 3.3 Hero LCP fix
- Home hero and page heroes use `<SmartImage priority>`.
- Inject a `<link rel="preload" as="image" href={heroSrcset-first} imagesrcset=… imagesizes=…>` for the home hero (via a small effect or `index.html` for the fixed hero) so the LCP image starts fetching immediately.
- Until the hero decodes, the box shows the hero's LQIP/dominant color — never an empty dark gradient.

### 3.4 Fallback (documented, not the chosen path)
If the environment blocks fetching source photos during `gen-images`, `SmartImage` still works with external URLs: LQIP degrades to a solid dominant-color wash (no fetch), `srcset` uses the CDN's `w=` param. The chosen path is full local vendoring; this is the safety net and will be called out in the plan.

**Acceptance:** No image request to `unsplash.com`/`picsum.photos` at runtime; Lighthouse/np CLS ≈ 0 on Home; hero shows color instantly then sharpens; below-fold images blur-up as they enter.

---

## 4. Motion & visual richness

All additions gate on `prefers-reduced-motion: reduce` (instant final state) and reuse the existing `useGsapContext` + `useReducedMotion` + `lib/gsap` infrastructure. Pointer-driven effects also gate on `(pointer: fine)`.

| Effect | Where | Implementation |
|---|---|---|
| **Hero scroll parallax** | `HomeHero` (+ `PageHero`) | Implement the specced-but-missing `ScrollTrigger` scrub: hero image `yPercent` drifts ~8–12% as the section scrolls out. Layered under the existing mount scale-in. Disabled under reduced-motion. |
| **Magnetic CTAs** | Primary `Button` (opt-in via a `magnetic` prop or a small `useMagnetic` hook) applied to hero + key CTAs | Pointer-follow translate (max ~6–8px) easing back on leave. Gated on `(pointer: fine)` and reduced-motion. |
| **Refined card interaction** | `TripCard`, `FeatureTripCard`, `CruiseCard` | Keep the existing lift + image zoom; add a soft gradient sheen sweep on hover and a slightly deeper, warmer shadow. Tasteful, CSS-only where possible. |
| **Paper-grain texture** | Global `body` / section backgrounds | A very low-opacity tiled grain (SVG/CSS) over Ivory Sand so it reads as editorial paper stock. Must not reduce text contrast below AA. |
| **Aegean motif** | 1–2 sections (e.g. dark "about" band, CTA strip) | A faint topographic/wave line motif as a background flourish, low opacity, decorative (`aria-hidden`). |
| **Cinematic section seams** | Boundaries between light ↔ dark sections (Home about band, CTA strip) | Replace hard color cuts with a soft gradient transition or a thin SVG wave divider so sections flow. |

**Constraints:** no continuous/looping animations that would harm performance or battery; all scroll effects use `once`/scrub responsibly; keep the existing `ScrollTrigger.refresh()` on layout settle.

**Acceptance:** With reduced-motion on, all new effects resolve to static final states; with it off, hero parallax and magnetic CTAs are visible and smooth; no new console warnings; no CLS from textures.

---

## 5. Listing findability (Day Trips + Cruises)

Current state: `MonoimeresPage` shows **all 12 trips regardless of category** with sort-only; the `date` sort is a documented no-op; no result count; no empty state.

### 5.1 Filter bar (`src/components/trips/FilterBar.tsx`, replacing/absorbing `SortBar`)
One cohesive sticky bar containing:
- **Category chips:** `Όλες` + a chip per category present in the data (derived, using existing `CATEGORY_LABEL`). Single-select.
- **Price band chips:** e.g. `Έως 25€` · `25–75€` · `75€+` (single-select, `Όλες τιμές` default). Bands chosen to split the €10–€300 range meaningfully.
- **Sort** control (existing options), kept.
- **Live result count:** e.g. `12 εκδρομές` / proper Greek pluralization (`1 εκδρομή`).
- Horizontally scrollable on mobile (reuse `scrollbar-hide`), sticky under the nav as today.

### 5.2 Real date sort
- Add an optional **`nextDeparture?: string`** (ISO `YYYY-MM-DD`) to the `Trip` type and populate it in `trips.ts`.
- `date` sort orders by `nextDeparture` ascending (soonest first); trips without it sort last. Removes the current no-op.

### 5.3 Empty state
- When active filters exclude everything, render a styled panel (icon + "Δεν βρέθηκαν εκδρομές με αυτά τα φίλτρα" + a "Καθαρισμός φίλτρων" reset button) instead of an empty grid.

### 5.4 Wiring
- `MonoimeresPage` (and the cruises listing where applicable) computes `filtered = trips.filter(category).filter(priceBand)` then `sorted` then paginated. Changing any filter resets to page 1 (existing pattern). Result count reflects the filtered set.
- Cruises listing gets the same filter-bar treatment scaled to its data (category chip likely n/a; price band + sort + count + empty state apply).

**Acceptance:** Selecting a category/price band updates the grid and the count; date sort is chronological; excluding all results shows the empty panel with a working reset; keyboard-focusable chips with visible focus rings.

---

## 6. New / changed files (inventory)

**New**
- `src/components/ui/SmartImage.tsx`
- `src/data/imageManifest.ts` (generated, committed)
- `scripts/gen-images.mjs`, `scripts/image-sources.ts`
- `public/images/*.webp` (generated, committed)
- `src/components/trips/FilterBar.tsx`
- `src/hooks/useMagnetic.ts` (if hook approach chosen over inline)
- `src/components/ui/button-variants.ts` (moved export)

**Changed**
- `App.tsx` (lazy routes, Suspense, router future flags)
- `HomeHero.tsx`, `PageHero.tsx`, `EditorialFeature.tsx` (SmartImage + parallax + priority hero)
- `TripCard.tsx`, `FeatureTripCard.tsx`, `CruiseCard.tsx` (SmartImage + refined hover)
- `Button.tsx` (import variants from new file; optional `magnetic`)
- `MonoimeresPage.tsx`, `KroyazieresPage.tsx` (FilterBar, filtering, count, empty state), `RentalsPage.tsx`, `ContactPage.tsx` (SmartImage on heroes)
- `trips.ts`, `cruises.ts`, other data (image ids; `nextDeparture`)
- `index.css` / `tailwind.config.ts` (grain/motif utilities, seam gradients)
- `package.json` (add `sharp` devDep; optional `gen:images` script)

---

## 7. Accessibility & motion safety

- All new motion gated on `prefers-reduced-motion: reduce` → instant final state; pointer effects also gated on `(pointer: fine)`.
- Decorative textures/motifs are `aria-hidden` and must not push any text/background pair below **WCAG AA** contrast.
- Filter chips are real `<button>`s with `aria-pressed`, visible `focus-visible` rings, and keyboard operable.
- `SmartImage` always requires meaningful `alt`; LQIP layer is `aria-hidden`.
- Card `<Link>`s keep visible focus states (verify not suppressed by hover-only styling).

---

## 8. Verification plan

- `npm run test:run`, `npm run build` (expect multiple chunks), `npm run lint` (expect zero warnings) all green.
- Manual/scripted check per route: no console errors; no external image hosts in the network panel; CLS visually ≈ 0; hero shows instant color→sharpen.
- Reduced-motion pass (emulate `prefers-reduced-motion`) — confirm every new effect is static.
- Listing: exercise each category/price/sort combination + the empty state + reset.
- Keep/extend the existing vitest setup; add a small unit test for the filter logic (pure function) and, if practical, for `nextDeparture` sorting.

## 9. Risks & mitigations

- **Image sourcing needs network once** (for `gen-images`). Mitigation: documented external-URL fallback in `SmartImage` (§3.4); the manifest/committed assets mean it's a one-time author-side step, not a runtime dependency.
- **Bundle/`sharp` is dev-only** — never shipped to the client bundle; runtime only reads the committed manifest + `public/images`.
- **Texture over-doing it** — keep opacity very low; verify AA contrast; easy to dial back per section.
- **Scope creep into conversion/trust** — explicitly out of scope this pass.
