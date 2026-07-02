# Sergiani Travel — Platform

Production rebuild of https://sergianitravel.gr as a Next.js + Supabase platform:
a server-rendered public site driven by a database, plus (upcoming) an admin
dashboard for managing tours. All content is served from our own backend.

## Design System

"Aegean Editorial" — spec in `docs/superpowers/specs/2026-07-01-serigiani-redesign-design.md`.
Palette: Aegean Deep (#1B3A5C) · Terracotta (#C96A47) · Ivory Sand (#F7F2EB).
Type: Playfair Display + Inter. Motion: GSAP + ScrollTrigger, respecting `prefers-reduced-motion`.

## Architecture

- **Next.js (App Router)** — SSR/ISR public site, `next/image`, sitemap/robots/metadata.
- **Supabase** — Postgres (tours, categories, images, settings) + RLS + Auth + Storage.
- Data layer (`lib/queries/*`) reads Supabase when configured, else a seed fallback.
- Full design + plan in `docs/superpowers/specs/` and `docs/superpowers/plans/`.

## Pages

- `/` — Home
- `/ekdromes` — all tours (filters: category, price, sort)
- `/ekdromes/[category]` — per-category listings
- `/tour/[slug]` — tour detail (ISR + structured data)
- `/kroyazieres` — Cruises
- `/enoikiaseis-poylman` — Bus Rentals
- `/epikoinonia` — Contact
- `/istoriko-ekdromon` — Tour history · `/oroi` — Terms

## Running locally

```bash
npm install
cp .env.local.example .env.local   # fill in Supabase URL + keys
npm run dev
```

Then open http://localhost:3000. Without `.env.local`, the site runs on seed data.

## Supabase

Migrations live in `supabase/migrations/`; apply steps in `supabase/README.md`.

## Scripts

- `npm run dev` — start dev server (Next)
- `npm run build` — production build
- `npm run start` — serve the production build
- `npm run test:run` — run vitest suite
- `npm run lint` — oxlint

## Tech stack

Next.js, React 19, TypeScript, Tailwind CSS, GSAP, Supabase (@supabase/ssr), React Hook Form, Zod, Lucide React.
