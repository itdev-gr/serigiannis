# Sergiani Travel — Website Redesign Template

Production-quality React template presenting a redesign of https://sergianitravel.gr, built for client review.

## Design System

"Aegean Editorial" — full spec in `docs/superpowers/specs/2026-07-01-serigiani-redesign-design.md`.

Palette: Aegean Deep (#1B3A5C) · Terracotta (#C96A47) · Ivory Sand (#F7F2EB).
Type: Playfair Display + Inter.
Motion: GSAP with ScrollTrigger, respecting `prefers-reduced-motion`.

## Pages

- `/` — Home
- `/monoimeres` — Day Trips listing
- `/kroyazieres` — Cruises listing
- `/pullman-rentals` — Bus Rentals
- `/epikoinonia` — Contact

## Running locally

```bash
npm install
npm run dev
```

Then open http://localhost:5173.

## Tech stack

React 19, TypeScript, Vite, Tailwind CSS, GSAP, React Router, React Hook Form, Zod, Lucide React.

## Scripts

- `npm run dev` — start dev server
- `npm run build` — build for production
- `npm run preview` — preview production build
- `npm run test:run` — run vitest suite
