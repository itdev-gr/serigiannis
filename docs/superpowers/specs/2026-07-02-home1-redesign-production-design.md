# Serigiani — Home 1 design, rebuilt in React/Tailwind, wired to the backend

**Date:** 2026-07-02
**Status:** Approved direction — supersedes `2026-07-02-tourex-home1-port-design.md`
(the earlier "faithful self-contained Bootstrap port" is abandoned)

## Decision log (confirmed with user)

- **Technique:** Rebuild the tourex **Home 1** *layout/look* natively in serigiani's
  existing **Next.js (App Router) + React Server Components + Tailwind** stack, wired
  to **Supabase**. No Bootstrap, no Redux. Rationale (user): React + serigiani's data
  layer is "more friendly for the back end."
- **Scope:** **The whole project** adopts this new design language, **starting with
  the home page**. Delivered as a decomposed sequence of plans (see Roadmap).
- **Chrome:** Keep serigiani's existing Greek **Navbar** + **Footer** (already wired to
  real phones/address/hours/socials); align styling to the new look. Do not rebuild.
- **Content:** Real Serigiani content — from the live-site crawl of
  https://sergianitravel.gr/ plus the existing Greek data layer. English demo copy is
  not used.

## Goal

Replace serigiani's current home page with a production-ready home built in the
**Home 1** design (hero + booking/search, destination/category strip, about + stats,
featured-tour listing, "how it works" process, testimonials, news/CTA), populated
with **real Greek content** and driven by the **live database**, then extend the same
design language across the site and harden the whole project for production.

## Existing serigiani assets to reuse (do not reinvent)

**Data layer** (`lib/queries/*`, seed fallback in `data/seed/tours.ts`):
- `getTours()`, `getFeaturedTours()`, `getTourBySlug()`, `getPublishedSlugs()`
- `getCategories()`
- `getSettings()` → `{ phones, address, email, hours, social }`
- Falls back to real Greek seed data when `isDbConfigured()` is false.

**Schema** (`supabase/migrations/0001_init.sql`): `categories`, `tours`,
`tour_categories`, `tour_images`, `tour_departures`, `settings`. Types in `types/db.ts`.

**Components** to reuse/extend:
- Chrome: `components/layout/Navbar.tsx`, `Footer.tsx`, `PageTransition.tsx`
- UI: `components/ui/{Button,Badge,TextLink,TourImage}.tsx`, `button-variants.ts`
- Trips: `components/trips/{TourCard,FeatureTripCard,ToursExplorer,Pagination}.tsx`
- Shared: `components/shared/{SectionHeading,StatCounter,TestimonialBlock,PageHero,RevealOnScroll}.tsx`
- Motion: `components/motion/{Reveal,MotionPrimitives}.tsx`; GSAP via `lib/gsap.ts`,
  `hooks/useGsapContext.ts`, `hooks/useReducedMotion.ts`
- SEO: `lib/seo.ts`; images: `lib/images.ts`
- Design tokens: `tailwind.config.ts` (colors ink/primary/cta/gold, `font-display`
  Poppins, `font-sans` Open Sans, `text-display-hero/section/editorial`, shadows).

**Static content:** `data/site.ts` (`stats`, `testimonials`).

## Home 1 → serigiani section mapping

Each new home section is a focused component in `components/home/` (Server Component
unless it needs client interactivity). Content source noted per section; final copy is
refined from the site crawl.

| # | Home 1 section | New component | Content / data source |
|---|---|---|---|
| 1 | Hero + booking form | `Home1Hero` (client) | Hero copy (crawl); search form: destination = `getCategories()`, date, persons → routes to `/ekdromes?...` |
| 2 | Location / destinations | `Home1Destinations` | `getCategories()` + top featured tours as destination cards |
| 3 | About + fun facts | `Home1About` | About copy (crawl) + `stats` from `data/site.ts` via `StatCounter` |
| 4 | Listing (tours) | `Home1Listing` | `getFeaturedTours()` → `TourCard` |
| 5 | Ads / promo | `Home1Promo` | Πούλμαν rental / featured multi-day promo (crawl + settings) |
| 6 | Process ("how it works") | `Home1Process` | Booking steps: Επιλέξτε → Κλείστε θέση → Ταξιδέψτε |
| 7 | Testimonials | `Home1Testimonials` | `testimonials` from `data/site.ts` (+ real reviews from crawl if found) |
| 8 | Blog / news | `Home1News` | See "Blog/news decision" below |
| 9 | CTA | `Home1Cta` | `getSettings()` phones/email → call/contact CTA |

New home page `app/(site)/page.tsx` composes sections 1–9 inside the existing
`(site)` layout (Navbar/Footer). The current home body moves to
`/arxiki-legacy` (already agreed) so it is preserved and comparable.

### Blog/news decision

serigiani has **no posts table**. For the home "Blog/news" slot, the production-safe
choice (no new table, no thin content) is a **"Επόμενες Αναχωρήσεις / Προτεινόμενες
Εκδρομές"** section sourced from `getTours()` (soonest `tour_departures` or featured),
rendered with `TourCard`. A real editorial blog is deferred to a later plan; if the
crawl reveals substantial article content, revisit adding a `posts` table then.

## Production hardening (applies site-wide)

- **SEO:** per-route `metadata`, canonical, OpenGraph; JSON-LD (`TravelAgency`,
  `Trip`/`TouristTrip`, `BreadcrumbList`) via `lib/seo.ts`; `app/sitemap.ts` covers all
  published tours + static routes; `app/robots.ts`.
- **Accessibility:** semantic landmarks, alt text, focus states, `aria-current`,
  keyboard nav, `prefers-reduced-motion` honored (already patterned in home components).
- **Performance:** `next/image` with sizes/priority, self-hosted fonts or preconnect,
  Server Components by default, minimal client JS, Core Web Vitals budget.
- **Data/config:** `.env.local` documented; DB-configured vs seed-fallback both work;
  images via Supabase Storage (`lib/images.ts`).
- **i18n:** Greek throughout (`lang="el"`), Greek number/date formatting.

## Roadmap (decomposed plans — each ships working software)

1. **Plan 1 — Production Home Page (Home 1 design).** This spec's core; fully detailed
   in the first implementation plan. Delivers the new `/` end-to-end with real data.
2. **Plan 2 — Inner pages to the new design language.** `/ekdromes`, `/ekdromes/[category]`,
   `/kroyazieres`, `/enoikiaseis-poylman`, `/tour/[slug]`, `/epikoinonia`, `/oroi`,
   `/istoriko-ekdromon` — restyle to match, keep DB wiring.
3. **Plan 3 — Production hardening & launch.** SEO/schema/sitemap completeness, a11y
   audit, performance budget, admin polish, deploy checklist.

Each plan is written and executed on its own; this document is the shared spec.

## Verification (Plan 1)

- `/` renders all Home 1 sections in Greek with live data; matches Home 1 layout.
- Search form routes to `/ekdromes` with correct filters.
- Works both DB-configured and seed-fallback (`npm run build`, `npm run dev`).
- `/arxiki-legacy` preserves the old home. Other routes unchanged.
- `npm run test:run`, `npm run lint`, `npm run build` all green.
- Lighthouse/Core Web Vitals sane; a11y checks pass.

## Out of scope (Plan 1)

- Inner-page redesign (Plan 2), full launch hardening (Plan 3), editorial blog table,
  payment/booking transactions.
