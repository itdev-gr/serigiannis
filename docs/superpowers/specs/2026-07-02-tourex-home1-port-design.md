# Port tourex "Home 1" into serigiani as the home page

**Date:** 2026-07-02
**Status:** Approved design — ready for implementation plan

## Goal

Bring the tourex template's **Home 1** page (`~/Desktop/Cursor/tourex`, route `/`)
into the serigiani project **exactly as it looks in tourex**, together with **all
resources it uses** (styles, fonts, images, data, SVGs), and make it serigiani's
home page at `/`.

Chosen approach (confirmed with user): **faithful, self-contained port**. The page
keeps its own header/footer and English demo content; its Bootstrap/SCSS-derived
CSS is scoped to the home route so the rest of the serigiani site (Tailwind) is
never affected.

## Source vs destination — the constraints

| | tourex (source) | serigiani (destination) |
|---|---|---|
| Framework | Next 15, React 18 | Next 16, React 19 |
| Styling | Bootstrap + SCSS (compiled `main.css`) | Tailwind 3 |
| State | Redux Toolkit | (none for site) |
| `@/*` alias | `./src/*` | `./*` (repo root) |
| `@/assets/*` alias | `./public/assets/*` | (none) |

The **alias collision** is the central problem: dropping tourex files in as-is would
make `@/components`, `@/svg`, `@/redux`, `@/hooks`, `@/data` resolve to serigiani's
own folders. Solved by vendoring under a dedicated namespace.

## What "Home 1" is composed of

`tourex/src/app/page.tsx` → `<Wrapper><HomeOne/></Wrapper>`.

- `HomeOne` (`components/homes/home-one/index.tsx`) renders its **own**
  `HeaderOne` + `<main>`(`Banner, Location, About, Listing, Ads, Process,
  Testimonial, Blog, Cta`) + its **own** `FooterOne`.
- `Wrapper` adds `ScrollToTop` + `react-toastify` container + `ErrorBoundary`.
- It does **not** use serigiani's Navbar/Footer.

### Full file dependency set to vendor (from `tourex/src/`)

- `components/homes/home-one/*` (index, Banner, Location, About, Listing, Ads,
  Process, Testimonial, Blog, Cta)
- `components/common/ScrollToTop.tsx`
- `components/common/banner-form/BannerFormOne.tsx` (+ `CommonForm.tsx` if referenced)
- `layouts/Wrapper.tsx`
- `layouts/headers/HeaderOne.tsx` + `layouts/headers/Menu/*`
- `layouts/footers/FooterOne.tsx`
- `ui/ErrorBoundary.tsx`
- `svg/*` (whole dir — icons used across header/menu/home-one)
- `hooks/*` (UseSticky, UseCartInfo, …)
- `data/*` (LocationData, ListingData, BlogData, MenuData, …)
- `redux/*` (store, features/cartSlice, wishlistSlice, productSlice)
- `utils/*` (localstorage, used by redux slices)

Copying whole `svg/`, `hooks/`, `data/`, `redux/`, `utils/` is intentional — they're
small and avoid missing a transitive import.

### External npm deps Home 1 pulls in

`@reduxjs/toolkit`, `react-redux`, `swiper`, `react-toastify`, `react-flatpickr`
(+ `flatpickr` peer). No `react-countup` / `react-intersection-observer` /
`react-modal-video` / `isotope` are used by Home 1.

## Design

### 1. Vendoring (namespace isolation)

- Copy the source subset into **`vendor/tourex-home/`** preserving tourex's
  internal folder layout (`components/`, `layouts/`, `svg/`, `hooks/`, `data/`,
  `redux/`, `utils/`, `ui/`).
- Add two `tsconfig.json` path aliases (serigiani's `@/*` untouched):
  - `"@tourex/*": ["./vendor/tourex-home/*"]`
  - `"@tourex/assets/*": ["./public/assets/*"]` (more specific → wins for assets)
- Mechanical rewrite in every copied file: **`@/` → `@tourex/`**.
  Result: `@tourex/assets/img/...` → `public/assets`, everything else → vendored src.

### 2. Resources (bring everything)

- Copy `tourex/public/assets` → `serigiani/public/assets` wholesale
  (~24 MB: `css/`, `fonts/`, `img/` [304 files], `scss/`).
  `serigiani/public/assets` does not currently exist → no collision.
- This covers both bundled image imports (`@tourex/assets/img/...` via next/image)
  and string-referenced paths (`url(/assets/img/...)`, `src="/assets/img/..."`)
  served from `public/assets`.

### 3. Route wiring — `/` without double chrome

- New route group **`app/(tourex-home)/`**:
  - `layout.tsx` — `"use client"`; wraps children in Redux `<Provider store={store}>`;
    imports all tourex CSS (see §4). Renders `{children}` only (no serigiani chrome).
  - `page.tsx` — renders `<Wrapper><HomeOne/></Wrapper>`.
- **Move** current `app/(site)/page.tsx` (Greek home) to
  `app/(site)/arxiki-legacy/page.tsx` → still live at `/arxiki-legacy`, nothing lost.
  This frees `/` so `(tourex-home)/page.tsx` owns it.
- All other `(site)` routes (`/ekdromes`, `/kroyazieres`, `/admin`, …) keep
  serigiani's Navbar/Footer and are **untouched**.

### 4. CSS — pre-compiled, no `sass` toolchain

tourex loads `styles/index.css` (an `@import` chain) + compiled `main.css`.
In serigiani, import these **only** in `app/(tourex-home)/layout.tsx`:

1. `react-toastify/dist/ReactToastify.css`
2. `swiper/css/bundle`
3. `../../public/assets/css/animate.min.css`
4. `../../public/assets/css/bootstrap.min.css`
5. `../../public/assets/css/default.css`
6. `../../public/assets/css/flatpicker.css`
7. `../../public/assets/css/fontawesome-all.min.css`
8. `../../public/assets/css/main.css`  ← compiled `main.scss`; avoids adding `sass`

(`react-modal-video` CSS from tourex's index.css is dropped — component unused.)

Load order: serigiani root `globals.css` (Tailwind) loads first via the root
layout; the tourex CSS above loads *after* in the nested layout, so it wins on the
home route. Because no other route imports it, `/ekdromes` etc. never see Bootstrap.

### 5. Dependencies

Add to `package.json`: `@reduxjs/toolkit`, `react-redux`, `swiper`,
`react-toastify`, `react-flatpickr`, `flatpickr`; dev `@types/react-flatpickr`.
Install may require `--legacy-peer-deps` (React 19 vs libraries' React 18 peer ranges).

## Verification

- `/` renders the tourex Home 1, visually matching tourex's `/`.
- `/arxiki-legacy` renders the old Greek home.
- `/ekdromes`, `/kroyazieres`, `/epikoinonia`, `/admin` render unchanged (no
  Bootstrap bleed).
- `npm run build` succeeds; no unresolved `@tourex/*` imports.
- Screenshot compare home in serigiani vs tourex dev server.

## Known caveats

- **English demo content** stays as-is (faithful port; Greek content not merged).
- **React 19 / Next 16** vs tourex's React 18 / Next 15: only `react-flatpickr`
  is a likely peer-dep friction point; mitigate with `--legacy-peer-deps`.
- **`wow fadeInUp` animations**: tourex ships the classes but no WOW.js
  initializer, so — as in tourex itself — content renders fully but entrance
  animations don't fire. WOW.js can be wired later if desired.
- Tailwind's global reset sits underneath the tourex CSS; patch specific
  bleed-through if any appears.

## Out of scope

- Translating content to Greek / merging Serigiani data into Home 1.
- Rebuilding Home 1 in Tailwind.
- Porting the other tourex home variants or inner pages.
