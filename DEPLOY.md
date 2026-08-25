# Deploying Sergiani Travel (Vercel)

The repo is a standard Next.js 16 app. It's already **linked** to the Vercel project
**`serigiannis`** (team scope — see `.vercel/project.json` for the authoritative ids) and
the **GitHub repo is connected**, so every push to `main` triggers a production deploy.
Production domain: **`https://www.sergianitravel.gr`** (the `serigiannis.vercel.app` alias
now 308-redirects all non-`/api` traffic there).

## 1. Set environment variables (required before the first build)

`NEXT_PUBLIC_*` vars are inlined at **build time**. Without the Supabase ones, the site
falls back to seed data (12 demo tours) instead of the real database (254 tours), and the
admin login can't initialise. Set all four for the **Production** (and ideally **Preview**)
environments.

| Variable | Where to get it | Notes |
|---|---|---|
| `NEXT_PUBLIC_SUPABASE_URL` | your `.env.local` | public |
| `NEXT_PUBLIC_SUPABASE_ANON_KEY` | your `.env.local` | public |
| `SUPABASE_SERVICE_ROLE_KEY` | your `.env.local` | **secret — server only, never expose** |
| `NEXT_PUBLIC_SITE_URL` | the production domain | `https://www.sergianitravel.gr` |

**Option A — Dashboard:** Vercel → Project `serigiannis` → Settings → Environment Variables →
add each of the four (copy values from `.env.local`), scope = Production (+ Preview).

**Option B — CLI (run these yourself so the secrets stay in your session):**
```bash
vercel env add NEXT_PUBLIC_SUPABASE_URL production
vercel env add NEXT_PUBLIC_SUPABASE_ANON_KEY production
vercel env add SUPABASE_SERVICE_ROLE_KEY production
vercel env add NEXT_PUBLIC_SITE_URL production
```
Each command prompts for the value (paste from `.env.local`).

## 2. Deploy

- **Auto:** push to `main` (GitHub is connected) → Vercel builds & deploys, **or**
- **Manual:** `vercel deploy --prod`

## 3. Site URL

`NEXT_PUBLIC_SITE_URL` must be `https://www.sergianitravel.gr` (it is inlined at build
time and drives canonical URLs, `sitemap.xml`, `robots.txt` and JSON-LD). If it ever
changes, redeploy afterwards.

## 4. Verify

- `/` renders the real tours (not the 12 seed demos).
- `/admin/login` → log in (`mkifokeris@itdev.gr`) → dashboard loads.
- `/sitemap.xml` lists `https://<domain>/tour/...` (not localhost).
- Change the weak admin password: `node --env-file=.env.local scripts/create-admin.mjs <email> <newpass>`.

## 5. Tour bookings with online payment (migration 0021)

Booking straight from a tour page (`/tour/<slug>` → «Κάντε Κράτηση» → checkout → κάρτα)
needs two things:

1. **Run `supabase/migrations/0021_tour_booking.sql`** on the production database
   (Supabase → SQL Editor, or `supabase db push`). It adds `tour_price_tiers`,
   `tour_orders` and the booking RPCs.
2. **Set the gateway env vars** — without them `PAYMENT_PROVIDER` stays `offline` and a
   booking is stored as «Πληρωμή στο γραφείο» instead of charging the card:

| Variable | Notes |
|---|---|
| `PAYMENT_PROVIDER` | `viva` to charge online, `offline` (default) to book without payment |
| `VIVA_CLIENT_ID` / `VIVA_CLIENT_SECRET` | Viva Smart Checkout credentials |
| `VIVA_SOURCE_CODE` | Viva payment source |
| `VIVA_DEMO` | `1` while testing against the Viva demo environment |
| `VIVA_WEBHOOK_KEY` | echoed by `GET /api/payments/viva/webhook` during Viva's verification |

Prices and departure dates are set per tour in **/admin/tours/<id>/edit → «Κρατήσεις &
Τιμές»**; incoming bookings appear under **/admin/bookings**. A tour with no price
categories keeps the old «Ζητήστε Κράτηση / Προσφορά» form.

## Notes

- Admin auth uses Supabase **password** sign-in — no email-redirect config needed. (If you
  later add magic-link/OAuth, add the production URL to Supabase → Auth → URL Configuration.)
- Images: `next/image` allows `*.supabase.co/*.supabase.in` (real covers) plus local
  `/public` assets (hero slideshow, brand logo). No extra config needed.
