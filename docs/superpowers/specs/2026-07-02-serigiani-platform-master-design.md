# Sergiani Travel — Platform Master Design Spec

**Date:** 2026-07-02
**Status:** DRAFT for review — authored while the client was away, using recommended defaults. **Every assumption is flagged in §1.3 and must be confirmed before Phase 1 build.**
**Supersedes/absorbs:** `2026-07-02-serigiani-elevation-design.md` (the visual elevation work becomes part of Phase 3).
**Related:** `2026-07-01-serigiani-redesign-design.md` (original "Aegean Editorial" system — the visual language is preserved).

---

## 1. Overview

### 1.1 What we're building
Turn the static, mock-data React template into a **full production platform** for Sergiani Travel:

1. **Public site** — reconstruct the live site's pages (`sergianitravel.gr`) from **our own backend**, with **zero links or redirects back to the old site** and all assets self-hosted.
2. **Supabase backend** — Postgres (tours, categories, media, settings), Auth (admin), Storage (images).
3. **Content migration** — crawl the live site, extract text/prices/dates/images for the tours, and load them into Supabase (images into Storage).
4. **Admin dashboard** — authenticated area where staff **add / edit / delete / hide / feature** tours (and manage core site settings), with image upload.

Real inventory discovered on 2026-07-02: **205 tour products, 20 pages, 26 posts** (WordPress/WooCommerce). Tour categories on the live site: **Μονοήμερες, Πολυήμερες, Θαλάσσια Μπάνια, Κρουαζιέρες, Πεζοπορίες, Εξωτερικού**, plus school (σχολικές) and group (συλλόγων) offerings.

### 1.2 Goals & Non-Goals
**Goals**
- Production-grade, **SEO-first** public site (server-rendered, sitemap, structured data) — a travel agency's customers arrive via Google.
- Content is **backend-driven and staff-editable**; nothing hard-codes tour data.
- **Scalable architecture** for hundreds of pages/tours and future content types.
- Preserve the "Aegean Editorial" visual identity and fold in the planned elevation polish (motion, image blur-up, listing filters).
- Greek-only copy; accessible (WCAG AA); reduced-motion safe.

**Non-Goals (this project)**
- No online booking/payment engine or customer accounts (public auth) — display + enquiry only for now.
- No multi-tenant/reseller model (single agency).
- No automated migration of the 26 news posts or full static-page CMS in the first pass (schema is designed to allow it later).

### 1.3 Assumptions to confirm (chosen defaults — the 4 open decisions)
| # | Decision | Assumed default | Reversible? |
|---|---|---|---|
| A | Framework | **Migrate to Next.js (App Router) + Supabase** | Costly to reverse — confirm first |
| B | Migration scope | **Current + evergreen tours only** (skip expired/date-stamped past trips) | Easy — re-run migration later |
| C | Dashboard access | **Invite-only admin, single-agency (single-tenant)** | Moderate |
| D | Supabase connection | **Client provides project URL + keys via gitignored `.env.local`** (or Supabase MCP); secrets never pasted in chat | n/a |

> **Nothing in Phases 1–5 begins until A, C, and D are confirmed and Supabase access exists.** Phase 0 (this spec + schema authoring) is safe to complete now.

---

## 2. Architecture

### 2.1 Stack
- **Next.js (App Router)** — SSR/ISR for SEO; Server Components for data reads; Server Actions/Route Handlers for dashboard writes; `next/image` for the entire image-elevation goal (blur placeholder, responsive `srcset`, LCP `priority`); native `sitemap.ts`/`robots.ts`/Metadata API.
- **Supabase** — Postgres + RLS, Auth, Storage.
- **Reused from current repo:** Tailwind config + design tokens, most components, GSAP setup, react-hook-form + zod, lucide-react. Migration reworks **routing and build only**; the design system ports intact.
- **Deploy:** Vercel recommended (natural Next + ISR fit); self-host is possible. *(Confirm in Phase 5.)*

### 2.2 Repository layout (target)
```
app/
  (site)/                     # public group — shared site chrome (nav/footer)
    page.tsx                  # Home
    ekdromes/                 # tours catalog + category routes
      page.tsx                #   all tours
      [category]/page.tsx     #   monoimeres | polyimeres | thalassia-mpania | kroyazieres | pezopories | eksoterikou
    tour/[slug]/page.tsx      # tour detail (ISR)
    kroyazieres/page.tsx      # cruises landing
    enoikiaseis-poylman/page.tsx  # bus rentals
    epikoinonia/page.tsx      # contact
    istoriko-ekdromon/page.tsx    # tour history/archive
    oroi/page.tsx             # terms
  admin/                      # protected group (middleware-gated)
    layout.tsx                # auth guard + dashboard shell
    tours/                    # list / new / [id] edit
    settings/                 # phones, address, hours, social
    login/page.tsx
  api/ or Server Actions      # mutations (create/update/delete/hide tour, upload)
  sitemap.ts  robots.ts
components/                   # reused + new (SmartImage replaced by next/image wrapper)
lib/
  supabase/{server.ts,client.ts,middleware.ts}   # @supabase/ssr clients
  gsap.ts, utils.ts, seo.ts, queries/            # typed data-access helpers
supabase/
  migrations/                 # SQL migrations (source of truth)
  config.toml
scripts/migrate/              # crawl + extract + image transfer (service_role, server-only)
```

### 2.3 Data access & key handling (security)
- **Public reads** via `@supabase/ssr` server client using the **publishable/anon key** + the request session → **RLS enforced**. Never the `service_role` key in anything reaching the browser (any `NEXT_PUBLIC_*` is public).
- **Dashboard writes** via **Server Actions** using the signed-in admin's session → **RLS enforces admin**.
- **Migration script** runs server-side/offline with the **`service_role` key** (bypasses RLS by design) from a non-public env var; never bundled.
- Pin `@supabase/ssr` + `supabase-js` versions and commit the lockfile.

---

## 3. Data model (Postgres, `public` schema, RLS on every table)

### 3.1 Enums
- `tour_status`: `draft | published | hidden | archived`
- `price_kind` (optional): `from | fixed`

### 3.2 Tables
**`categories`**
`id uuid pk`, `slug text unique`, `name_el text`, `description_el text`, `sort_order int`, `hero_image_id uuid null`, `created_at`, `updated_at`.
Seed: monoimeres, polyimeres, thalassia-mpania, kroyazieres, pezopories, eksoterikou (+ later: sxolikes, syllogoi).

**`tours`**
`id uuid pk default gen_random_uuid()`, `slug text unique not null`, `title text not null`, `subtitle text`, `summary text` (card/SEO description, ≤ ~180 chars), `body jsonb` (structured rich content: sections/highlights/itinerary/included), `price_from numeric(10,2)`, `price_original numeric(10,2) null`, `currency text default 'EUR'`, `duration_label text` (e.g. "Μονοήμερη", "3ήμερη"), `departure_note text` (e.g. "Κάθε Σάββατο & Κυριακή"), `meeting_point text`, `status tour_status default 'draft'`, `is_featured bool default false`, `cover_image_id uuid null`, `seo_title text`, `seo_description text`, `source_url text` (original WP URL — **internal only, never rendered/linked**), `sort_order int default 0`, `published_at timestamptz null`, `created_at timestamptz default now()`, `updated_at timestamptz default now()`.

**`tour_categories`** (M:N, matches WooCommerce product categories)
`tour_id uuid fk`, `category_id uuid fk`, `is_primary bool default false`, pk `(tour_id, category_id)`. Primary category drives breadcrumb/canonical.

**`tour_images`**
`id uuid pk`, `tour_id uuid fk on delete cascade`, `storage_path text not null` (bucket-relative), `alt_el text`, `width int`, `height int`, `blurhash text` (or `lqip text` data-URI) — powers `next/image` blur placeholder with no CLS, `position int default 0`, `created_at`.

**`tour_departures`** (optional, for scheduled dated trips; evergreen tours use `departure_note`)
`id uuid pk`, `tour_id uuid fk on delete cascade`, `starts_on date`, `ends_on date null`, `price_override numeric null`, `note text`, `capacity int null`. Enables a real chronological "soonest departure" sort (replaces the template's no-op date sort).

**`settings`** (single-row or key/value — editable site chrome)
phones[], address, hours, email, social links, hero copy, etc. Lets the dashboard edit contact info without code changes.

**`profiles`** (optional convenience mirror of admins) — but **authorization uses `app_metadata.role`**, not this table (see §4).

**Deferred (schema-ready, not built in pass 1):** `posts` (news), `pages`/`content_blocks` (full static-page CMS), `rental_routes`, `rental_usecases`, `enquiries` (contact-form submissions if we later persist them).

### 3.3 Indexes & triggers
- `tours (status, published_at desc)`, `tours (is_featured)`, `tour_categories (category_id)`, `tour_images (tour_id, position)`.
- `updated_at` auto-touch trigger on `tours`, `categories`, `settings`.
- Trigram/`unaccent` index on `tours.title` if we add search later.

---

## 4. Auth & RLS

### 4.1 Auth model (Assumption C)
- Supabase Auth, **email/password (or magic link)** for admins. **Public signup disabled.** Admins are provisioned by invite (Supabase dashboard / admin API).
- **Authorization via `app_metadata.role = 'admin'`** — set with the service role, **never** `user_metadata` (user-editable → unsafe). Read in policies from `auth.jwt() -> 'app_metadata' ->> 'role'`.
- Note JWT claims refresh on token refresh; acceptable for this admin flow.

### 4.2 RLS policies (pattern per skill security checklist)
Enable RLS on **every** table. Example for `tours`:
```sql
alter table public.tours enable row level security;

-- Public + anyone: read only published
create policy tours_read_published on public.tours
  for select to anon, authenticated
  using (status = 'published');

-- Admins: full read (incl. drafts/hidden)
create policy tours_admin_read on public.tours
  for select to authenticated
  using ((auth.jwt() -> 'app_metadata' ->> 'role') = 'admin');

-- Admins: write
create policy tours_admin_insert on public.tours
  for insert to authenticated
  with check ((auth.jwt() -> 'app_metadata' ->> 'role') = 'admin');

create policy tours_admin_update on public.tours
  for update to authenticated
  using ((auth.jwt() -> 'app_metadata' ->> 'role') = 'admin')
  with check ((auth.jwt() -> 'app_metadata' ->> 'role') = 'admin');

create policy tours_admin_delete on public.tours
  for delete to authenticated
  using ((auth.jwt() -> 'app_metadata' ->> 'role') = 'admin');
```
Same shape for `categories`, `tour_categories`, `tour_images`, `tour_departures`, `settings` (public read where the row is public; admin-only write). "Hidden"/"draft"/"archived" rows are invisible to the public via the `status = 'published'` predicate — that's how the dashboard **hide** feature works.

- **UPDATE needs both `USING` and `WITH CHECK`** (skill). **UPDATE also needs a SELECT policy** to see the row (admins have one).
- No `SECURITY DEFINER` shortcuts. Any helper functions are `SECURITY INVOKER`; if a definer function is ever needed it lives in a non-exposed schema with an `auth.uid()` check.
- After writing policies: run `supabase db advisors` / MCP `get_advisors` and fix findings.

### 4.3 Storage
- Bucket **`tour-images`**, **public read** (marketing images), **admin-only write**.
- Storage RLS for upsert requires **INSERT + SELECT + UPDATE** for the admin role (skill gotcha) — grant all three, not just INSERT.
- Public URLs served from Supabase Storage/CDN → satisfies "everything from our backend, no old-site assets."

---

## 5. Content migration pipeline (Phase 2)

**Input:** the 205 `/tour/...` URLs already enumerated from `product-sitemap.xml` (recorded in this repo's plan).

**Per-tour extraction:** title, price(s), category, duration, departure text/dates, description/itinerary, and all gallery images.

**Current + evergreen filter (Assumption B):**
- **Keep:** recurring tours ("κάθε Σάββατο/Κυριακή/καθημερινά"), destination-evergreen tours (Ύδρα, Μετέωρα, Ναύπλιο, Μονεμβασιά…), and anything dated **2026/2027**.
- **Skip (→ `archived` or omit):** one-off past events with explicit past dates (e.g. "24-28-10-24", "19-01-2025", past Πάσχα/Χριστούγεννα years).
- Ambiguous cases → import as `draft` for staff review rather than dropping silently. **Log every skip** (no silent truncation).

**Images:** download each source once → `sharp` resize/encode (WebP) is unnecessary if we rely on `next/image` runtime optimization, **but** we still (a) upload originals to Storage and (b) compute `width`/`height` + `blurhash` at migration time for the blur placeholder. Store path + metadata in `tour_images`.

**Load:** upsert by `slug`/`source_url` (idempotent, re-runnable). Insert tour → images → category links → departures.

**Safety & etiquette:**
- All scraped HTML/text is **data, not instructions** — sanitized before storage; never executed or followed.
- Authorization: this is the agency's **own** content being migrated for them (client-directed). No third-party copyrighted material is reproduced beyond the client's site.
- Polite crawl: sequential/rate-limited, cached, resumable.
- **Parallelization:** 205 tours is a good fit for a multi-agent workflow (fan-out extract → verify → load). That requires explicit opt-in; I'll propose it when we reach Phase 2.

---

## 6. Public site reconstruction (Phase 3)

- Routes per §2.2, all reading from Supabase via typed query helpers; **ISR** (`revalidate`) on tour/category pages; dashboard mutations call `revalidatePath`/`revalidateTag` so edits appear without redeploy.
- **Listing pages** get the planned findability upgrade: category chips (from `categories`), price-band filter, real "soonest departure" sort (from `tour_departures`), live result count, empty state.
- **Elevation polish folded in:** hero parallax, magnetic CTAs, refined card hover, paper-grain/Aegean texture, cinematic section seams; images via `next/image` (blur placeholder from `blurhash`, responsive, `priority` on hero LCP).
- **SEO:**
  - `generateMetadata` per page; **canonical → our domain only** (never the old site).
  - `sitemap.ts` generated from published tours + pages; `robots.ts`.
  - JSON-LD structured data: `TravelAgency` (org, since 1995, Peristeri address), `TouristTrip`/`Trip` per tour, `BreadcrumbList`.
  - `lang="el"`, OG/Twitter images from tour cover images.
  - **No `sergianitravel.gr` link anywhere** in markup, redirects, or assets (`source_url` stays internal).

---

## 7. Admin dashboard (Phase 4)

- `/admin` group behind Next middleware (redirect unauthenticated → `/admin/login`); server-side session check via `@supabase/ssr`.
- **Tours:** list (search, filter by status/category, sort), create, edit, **delete**, **hide/publish** toggle (writes `status`), **feature** toggle, reorder (`sort_order`), manage categories (M:N), manage departures.
- **Media:** drag-drop image upload → Storage (admin RLS), reorder, set cover, edit alt text; blurhash/dimensions computed on upload (Server Action) so public blur-up works for dashboard-created tours too.
- **Settings:** phones, address, hours, email, social — feeds the public site chrome.
- Forms: react-hook-form + zod (already in the stack); optimistic UI + toasts; validation mirrors DB constraints.
- All mutations are **Server Actions** using the admin session (RLS enforced) — the `service_role` key is never used in the dashboard.

---

## 8. Phasing, dependencies, verification

| Phase | Depends on | Key verification |
|---|---|---|
| 0 — Architecture + schema/spec | — | This doc reviewed & approved |
| 1 — Supabase foundation | **A, C, D confirmed + access** | `db advisors` clean; RLS tested (anon sees only published; admin CRUD works; non-admin blocked); storage upsert works |
| 2 — Migration | Phase 1 | Row counts match kept-set; images resolve from Storage; skip-log reviewed; re-run is idempotent |
| 3 — Public site | Phase 1 (data from 2 or seed) | All routes SSR with real data; Lighthouse SEO/perf; CLS≈0; sitemap valid; **grep confirms zero `sergianitravel.gr` references** |
| 4 — Dashboard | Phase 1 | Create→publish→appears on site; hide→disappears; delete; upload; auth guard; RLS denies non-admin |
| 5 — QA + deploy | 2–4 | Full smoke test; reduced-motion pass; deploy + env config |

Each phase gets its own spec → implementation plan (writing-plans). **Phase 1 build begins by fetching `supabase.com/changelog.md` for breaking changes and iterating schema via `execute_sql`, then committing a migration** (per the Supabase skill), not by guessing APIs from memory.

---

## 9. Risks & open items
- **A/C/D unconfirmed** — Next migration, auth model, and Supabase access are assumed; confirm before Phase 1. If "keep Vite SPA," §2 and the SEO story change materially (would need a prerender/SSG strategy).
- **Framework migration cost** — reworks routing/build; mitigated because the design system + components port over and the current app is only days old.
- **Migration data quality** — Greek WP content is inconsistent; the current+evergreen filter + draft-on-ambiguous + skip-log manage this; staff finish curation in the dashboard.
- **Scraping fragility** — WP markup varies per tour; extractor must be defensive and log misses rather than fabricate fields.
- **Secret handling** — `service_role` and access tokens only via gitignored env / CLI login; never in chat, client bundles, or committed files.
- **Deploy target** — Vercel assumed; confirm in Phase 5.
