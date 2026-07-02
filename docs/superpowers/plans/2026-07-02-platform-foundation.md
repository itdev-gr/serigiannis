# Platform Foundation (Next.js + Supabase data layer) Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Migrate the existing Vite SPA to a Next.js (App Router) app that server-renders every public page from a typed data-access layer, with the Supabase schema/RLS authored and the Supabase clients wired — running today against a seed-data fallback and switching to the live DB the moment credentials exist.

**Architecture:** Next.js App Router with Server Components for reads and a `lib/queries/*` data-access layer. The data layer calls Supabase when `SUPABASE_URL` is set, else falls back to the existing mock data in `src/data/*` — so the site is fully buildable/testable before the DB is live. Supabase schema + RLS + storage are authored as SQL migration files now and applied later (gated on credentials). The "Aegean Editorial" design system (Tailwind config, tokens, GSAP, components) ports over intact.

**Tech Stack:** Next.js 15 (App Router), React 19, TypeScript, Tailwind CSS 3, GSAP, `@supabase/ssr` + `supabase-js`, react-hook-form + zod, lucide-react, Vitest.

## Global Constraints

- Greek-only copy (`lang="el"`). Preserve existing Greek strings verbatim when porting.
- **No links, redirects, or asset references to `sergianitravel.gr`** anywhere in shipped markup/CSS/JS. `tours.source_url` is internal metadata only.
- Accessibility WCAG AA; all motion gates on `prefers-reduced-motion: reduce`; pointer effects also gate on `(pointer: fine)`.
- Design tokens are fixed: Aegean Deep `#1B3A5C`, Sea Breeze `#5B9FD4`, Terracotta `#C96A47`/hover `#B25939`, Ivory Sand `#F7F2EB`, White Stone `#FDFCFA`, Charcoal `#1A1817`, Warm Stone `#6B6259`, Aegean Olive `#6E7C4A`, Deep Ink `#0F2233`. Fonts: Playfair Display + Inter.
- Secrets only in gitignored `.env.local` (never committed, never in client bundle). Only `NEXT_PUBLIC_*` vars reach the browser; `SUPABASE_SERVICE_ROLE_KEY` is server-only.
- Pin `@supabase/ssr` and `supabase-js` exact versions; commit `package-lock.json`.
- RLS on every table; authorization via `app_metadata.role = 'admin'` (never `user_metadata`); UPDATE policies need both `USING` and `WITH CHECK`; storage upsert needs INSERT+SELECT+UPDATE. (Supabase security checklist.)
- Tour category slugs (fixed): `monoimeres`, `polyimeres`, `thalassia-mpania`, `kroyazieres`, `pezopories`, `eksoterikou`.

---

## File Structure (target)

- `app/(site)/layout.tsx` — public shell (Navbar + Footer + PageTransition), root `<html lang="el">` in `app/layout.tsx`.
- `app/(site)/page.tsx` — Home.
- `app/(site)/ekdromes/page.tsx` + `app/(site)/ekdromes/[category]/page.tsx` — catalog + category listings.
- `app/(site)/tour/[slug]/page.tsx` — tour detail (ISR).
- `app/(site)/{kroyazieres,enoikiaseis-poylman,epikoinonia,istoriko-ekdromon,oroi}/page.tsx` — remaining pages.
- `app/sitemap.ts`, `app/robots.ts`, `app/globals.css`.
- `components/**` — ported from `src/components/**` (unchanged design, Next-compatible links/hooks).
- `lib/supabase/{server,client,middleware}.ts` — `@supabase/ssr` clients.
- `lib/queries/{tours,categories,settings}.ts` — data-access layer (Supabase-or-seed).
- `lib/filters.ts` — pure filter/sort logic (unit-tested).
- `lib/seo.ts` — metadata + JSON-LD helpers.
- `types/db.ts` — hand-written DB types (regenerated from Supabase later).
- `supabase/migrations/{0001_init,0002_rls,0003_storage_and_seed}.sql`.
- `data/seed/*` — the current `src/data/*` reused as the pre-DB fallback.

---

### Task 1: Install Next.js and establish App Router skeleton alongside Vite

**Files:**
- Create: `next.config.mjs`, `app/layout.tsx`, `app/globals.css`, `app/(site)/layout.tsx`, `app/(site)/page.tsx` (temporary placeholder)
- Modify: `package.json`, `tsconfig.json`, `.gitignore`
- Keep (for now): existing Vite files, removed in Task 12.

**Interfaces:**
- Produces: a running `next dev` on `:3000` rendering a styled placeholder home.

- [ ] **Step 1: Install Next and Supabase deps (pinned)**

```bash
npm install next@15.5.4 @supabase/ssr@0.7.0 @supabase/supabase-js@2.58.0
```
(Adjust to latest stable at build time; pin exact versions, commit the lockfile.)

- [ ] **Step 2: Add Next scripts to `package.json`** (keep vite scripts under `vite:*` until Task 12)

```jsonc
"scripts": {
  "dev": "next dev",
  "build": "next build",
  "start": "next start",
  "lint": "oxlint",
  "test": "vitest",
  "test:run": "vitest run",
  "vite:dev": "vite",
  "vite:build": "tsc -b && vite build"
}
```

- [ ] **Step 3: Create `next.config.mjs`** with Supabase Storage image host allowed

```js
/** @type {import('next').NextConfig} */
const nextConfig = {
  images: {
    remotePatterns: [
      { protocol: 'https', hostname: '*.supabase.co' },
      { protocol: 'https', hostname: '*.supabase.in' },
    ],
  },
};
export default nextConfig;
```

- [ ] **Step 4: Create `app/layout.tsx`** (root, Greek lang, fonts, globals)

```tsx
import type { Metadata } from 'next';
import './globals.css';

export const metadata: Metadata = {
  title: { default: 'Sergiani Travel · Ταξιδιωτικό Γραφείο από το 1995', template: '%s · Sergiani Travel' },
  description: 'Μονοήμερες, πολυήμερες εκδρομές, κρουαζιέρες και ενοικιάσεις πούλμαν από την Αθήνα. 30 χρόνια εμπειρίας.',
};

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="el">
      <body>{children}</body>
    </html>
  );
}
```

- [ ] **Step 5: Port `src/index.css` → `app/globals.css`** verbatim (the `@import` Google Fonts line, `@tailwind` directives, `@layer base/utilities`, reduced-motion block). No content changes.

- [ ] **Step 6: Temporary `app/(site)/page.tsx`**

```tsx
export default function Home() {
  return <main className="grid min-h-screen place-items-center bg-background text-body font-display text-4xl">Sergiani — Next.js foundation</main>;
}
```

- [ ] **Step 7: Add `.next` to `.gitignore`; verify dev server**

Run: `npm run dev` → open `http://localhost:3000`
Expected: Ivory-sand page, Playfair heading rendered. No console errors.

- [ ] **Step 8: Commit**

```bash
git add -A && git commit -m "feat(next): scaffold Next.js App Router alongside Vite"
```

---

### Task 2: Port the design system and Tailwind config to Next

**Files:**
- Modify: `tailwind.config.ts` (content globs), `postcss.config.js` (unchanged, verify)
- Create: `lib/utils.ts` (port from `src/lib/utils.ts`), `lib/gsap.ts` (port from `src/lib/gsap.ts`)

**Interfaces:**
- Produces: `cn()` from `lib/utils`, `gsap`/`ScrollTrigger`/`registerGsapPlugins` from `lib/gsap`, all Tailwind tokens available to `app/**` and `components/**`.

- [ ] **Step 1: Update `tailwind.config.ts` content globs** to include the new dirs

```ts
content: ['./app/**/*.{ts,tsx}', './components/**/*.{ts,tsx}'],
```
(Keep the entire `theme.extend` block — colors, fonts, fontSize, spacing, shadows, timing, keyframes — unchanged.)

- [ ] **Step 2: Copy `src/lib/utils.ts` → `lib/utils.ts` and `src/lib/gsap.ts` → `lib/gsap.ts`** verbatim.

- [ ] **Step 3: Verify tokens render** — temporarily add `<div className="bg-cta text-surface shadow-cta">test</div>` to home, run `npm run dev`, confirm Terracotta button style. Remove after checking.

- [ ] **Step 4: Commit**

```bash
git add -A && git commit -m "feat(next): port design system + gsap/utils libs"
```

---

### Task 3: Author Supabase schema migration (SQL files only; apply is gated on credentials)

**Files:**
- Create: `supabase/migrations/0001_init.sql`

**Interfaces:**
- Produces: tables `categories, tours, tour_categories, tour_images, tour_departures, settings`; enum `tour_status`. Consumed by Tasks 6, 11 (types) and, when applied, the live data layer.

- [ ] **Step 1: Write `0001_init.sql`**

```sql
create type tour_status as enum ('draft','published','hidden','archived');

create table public.categories (
  id uuid primary key default gen_random_uuid(),
  slug text unique not null,
  name_el text not null,
  description_el text,
  sort_order int not null default 0,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create table public.tours (
  id uuid primary key default gen_random_uuid(),
  slug text unique not null,
  title text not null,
  subtitle text,
  summary text,
  body jsonb not null default '{}'::jsonb,
  price_from numeric(10,2),
  price_original numeric(10,2),
  currency text not null default 'EUR',
  duration_label text,
  departure_note text,
  meeting_point text,
  status tour_status not null default 'draft',
  is_featured boolean not null default false,
  cover_image_id uuid,
  seo_title text,
  seo_description text,
  source_url text,
  sort_order int not null default 0,
  published_at timestamptz,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create table public.tour_categories (
  tour_id uuid not null references public.tours(id) on delete cascade,
  category_id uuid not null references public.categories(id) on delete cascade,
  is_primary boolean not null default false,
  primary key (tour_id, category_id)
);

create table public.tour_images (
  id uuid primary key default gen_random_uuid(),
  tour_id uuid not null references public.tours(id) on delete cascade,
  storage_path text not null,
  alt_el text,
  width int,
  height int,
  blurhash text,
  position int not null default 0,
  created_at timestamptz not null default now()
);

alter table public.tours
  add constraint tours_cover_image_fk
  foreign key (cover_image_id) references public.tour_images(id) on delete set null;

create table public.tour_departures (
  id uuid primary key default gen_random_uuid(),
  tour_id uuid not null references public.tours(id) on delete cascade,
  starts_on date not null,
  ends_on date,
  price_override numeric(10,2),
  note text,
  capacity int
);

create table public.settings (
  id int primary key default 1,
  data jsonb not null default '{}'::jsonb,
  updated_at timestamptz not null default now(),
  constraint settings_singleton check (id = 1)
);

create index tours_status_pub_idx on public.tours (status, published_at desc);
create index tours_featured_idx on public.tours (is_featured) where is_featured;
create index tour_categories_cat_idx on public.tour_categories (category_id);
create index tour_images_tour_pos_idx on public.tour_images (tour_id, position);
create index tour_departures_tour_date_idx on public.tour_departures (tour_id, starts_on);

create or replace function public.touch_updated_at() returns trigger
language plpgsql as $$
begin new.updated_at = now(); return new; end $$;

create trigger tours_touch before update on public.tours
  for each row execute function public.touch_updated_at();
create trigger categories_touch before update on public.categories
  for each row execute function public.touch_updated_at();
create trigger settings_touch before update on public.settings
  for each row execute function public.touch_updated_at();
```

- [ ] **Step 2: Commit** (no apply yet — gated on credentials)

```bash
git add supabase/migrations/0001_init.sql && git commit -m "feat(db): initial schema (tours, categories, images, departures, settings)"
```

> **Apply step (gated, run when Supabase access exists):** iterate the schema live with MCP `execute_sql`/`supabase db query`, run `supabase db advisors`, then `supabase db pull` to reconcile the migration. Do NOT `apply_migration` for iteration.

---

### Task 4: Author RLS + storage migrations (SQL files only; apply gated)

**Files:**
- Create: `supabase/migrations/0002_rls.sql`, `supabase/migrations/0003_storage_and_seed.sql`

- [ ] **Step 1: Write `0002_rls.sql`** — enable RLS on all tables; public reads published, admins full CRUD. Pattern for `tours` (repeat the same admin-write shape for every table; public-read predicate differs per table):

```sql
-- helper: current user is admin (reads app_metadata from JWT; SECURITY INVOKER)
create or replace function public.is_admin() returns boolean
language sql stable as $$
  select coalesce((auth.jwt() -> 'app_metadata' ->> 'role') = 'admin', false);
$$;

alter table public.tours enable row level security;
create policy tours_public_read on public.tours for select to anon, authenticated
  using (status = 'published');
create policy tours_admin_read on public.tours for select to authenticated
  using (public.is_admin());
create policy tours_admin_insert on public.tours for insert to authenticated
  with check (public.is_admin());
create policy tours_admin_update on public.tours for update to authenticated
  using (public.is_admin()) with check (public.is_admin());
create policy tours_admin_delete on public.tours for delete to authenticated
  using (public.is_admin());

-- categories: public read all, admin write
alter table public.categories enable row level security;
create policy categories_public_read on public.categories for select to anon, authenticated using (true);
create policy categories_admin_write_ins on public.categories for insert to authenticated with check (public.is_admin());
create policy categories_admin_write_upd on public.categories for update to authenticated using (public.is_admin()) with check (public.is_admin());
create policy categories_admin_write_del on public.categories for delete to authenticated using (public.is_admin());

-- tour_categories / tour_images / tour_departures: public read when parent tour is published; admin write.
alter table public.tour_categories enable row level security;
create policy tcat_public_read on public.tour_categories for select to anon, authenticated
  using (exists (select 1 from public.tours t where t.id = tour_id and t.status = 'published'));
create policy tcat_admin_read on public.tour_categories for select to authenticated using (public.is_admin());
create policy tcat_admin_ins on public.tour_categories for insert to authenticated with check (public.is_admin());
create policy tcat_admin_upd on public.tour_categories for update to authenticated using (public.is_admin()) with check (public.is_admin());
create policy tcat_admin_del on public.tour_categories for delete to authenticated using (public.is_admin());

alter table public.tour_images enable row level security;
create policy timg_public_read on public.tour_images for select to anon, authenticated
  using (exists (select 1 from public.tours t where t.id = tour_id and t.status = 'published'));
create policy timg_admin_read on public.tour_images for select to authenticated using (public.is_admin());
create policy timg_admin_ins on public.tour_images for insert to authenticated with check (public.is_admin());
create policy timg_admin_upd on public.tour_images for update to authenticated using (public.is_admin()) with check (public.is_admin());
create policy timg_admin_del on public.tour_images for delete to authenticated using (public.is_admin());

alter table public.tour_departures enable row level security;
create policy tdep_public_read on public.tour_departures for select to anon, authenticated
  using (exists (select 1 from public.tours t where t.id = tour_id and t.status = 'published'));
create policy tdep_admin_read on public.tour_departures for select to authenticated using (public.is_admin());
create policy tdep_admin_ins on public.tour_departures for insert to authenticated with check (public.is_admin());
create policy tdep_admin_upd on public.tour_departures for update to authenticated using (public.is_admin()) with check (public.is_admin());
create policy tdep_admin_del on public.tour_departures for delete to authenticated using (public.is_admin());

alter table public.settings enable row level security;
create policy settings_public_read on public.settings for select to anon, authenticated using (true);
create policy settings_admin_upd on public.settings for update to authenticated using (public.is_admin()) with check (public.is_admin());
create policy settings_admin_ins on public.settings for insert to authenticated with check (public.is_admin());
```

- [ ] **Step 2: Write `0003_storage_and_seed.sql`** — public-read image bucket, admin write (INSERT+SELECT+UPDATE for upsert), seed categories + singleton settings.

```sql
insert into storage.buckets (id, name, public) values ('tour-images','tour-images', true)
  on conflict (id) do nothing;

create policy tourimg_public_read on storage.objects for select to anon, authenticated
  using (bucket_id = 'tour-images');
create policy tourimg_admin_ins on storage.objects for insert to authenticated
  with check (bucket_id = 'tour-images' and public.is_admin());
create policy tourimg_admin_upd on storage.objects for update to authenticated
  using (bucket_id = 'tour-images' and public.is_admin())
  with check (bucket_id = 'tour-images' and public.is_admin());
create policy tourimg_admin_del on storage.objects for delete to authenticated
  using (bucket_id = 'tour-images' and public.is_admin());

insert into public.categories (slug, name_el, sort_order) values
  ('monoimeres','Μονοήμερες',1),
  ('polyimeres','Πολυήμερες',2),
  ('thalassia-mpania','Θαλάσσια Μπάνια',3),
  ('kroyazieres','Κρουαζιέρες',4),
  ('pezopories','Πεζοπορίες',5),
  ('eksoterikou','Εξωτερικού',6)
on conflict (slug) do nothing;

insert into public.settings (id, data) values (1, jsonb_build_object(
  'phones', jsonb_build_array('210 571 2451','210 821 2452','6976 811 825'),
  'address','Π. Μελά 45, Περιστέρι 121 31',
  'email','info@sergianitravel.gr',
  'hours', jsonb_build_object('weekdays','09:00–17:00','saturday','09:00–14:00')
)) on conflict (id) do nothing;
```

- [ ] **Step 3: Commit**

```bash
git add supabase/migrations/0002_rls.sql supabase/migrations/0003_storage_and_seed.sql && git commit -m "feat(db): RLS policies + storage bucket + category/settings seed"
```

---

### Task 5: Supabase clients + env template + DB types

**Files:**
- Create: `lib/supabase/server.ts`, `lib/supabase/client.ts`, `lib/supabase/middleware.ts`, `.env.local.example`, `types/db.ts`
- Modify: `.gitignore` (ensure `.env*.local`)

**Interfaces:**
- Produces: `createServerClient()` (server, cookie-aware), `createBrowserClient()` (client), `isDbConfigured()` boolean; `Tour`, `Category`, `TourImage`, `Settings` types from `types/db.ts`.

- [ ] **Step 1: `.env.local.example`**

```
NEXT_PUBLIC_SUPABASE_URL=
NEXT_PUBLIC_SUPABASE_ANON_KEY=
SUPABASE_SERVICE_ROLE_KEY=
NEXT_PUBLIC_SITE_URL=http://localhost:3000
```

- [ ] **Step 2: `types/db.ts`** — hand-written to match schema (regenerate with `supabase gen types` after apply).

```ts
export type TourStatus = 'draft' | 'published' | 'hidden' | 'archived';
export type Category = { id: string; slug: string; name_el: string; description_el: string | null; sort_order: number };
export type TourImage = { id: string; tour_id: string; storage_path: string; alt_el: string | null; width: number | null; height: number | null; blurhash: string | null; position: number };
export type Tour = {
  id: string; slug: string; title: string; subtitle: string | null; summary: string | null;
  body: Record<string, unknown>; price_from: number | null; price_original: number | null; currency: string;
  duration_label: string | null; departure_note: string | null; meeting_point: string | null;
  status: TourStatus; is_featured: boolean; cover_image_id: string | null;
  seo_title: string | null; seo_description: string | null; source_url: string | null;
  sort_order: number; published_at: string | null;
  categories?: Category[]; images?: TourImage[]; next_departure?: string | null;
};
export type Settings = { phones: string[]; address: string; email: string; hours: { weekdays: string; saturday: string } };
```

- [ ] **Step 3: `lib/supabase/server.ts`** (`@supabase/ssr`, cookie-aware) and **`client.ts`** (browser). Include:

```ts
export const isDbConfigured = () => Boolean(process.env.NEXT_PUBLIC_SUPABASE_URL && process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY);
```
(Use the current `@supabase/ssr` `createServerClient`/`createBrowserClient` cookie API — verify signatures against docs at build time; the package changes.)

- [ ] **Step 4: Commit**

```bash
git add -A && git commit -m "feat(next): supabase ssr clients, env template, db types"
```

---

### Task 6: Pure filter/sort logic (TDD) + data-access layer with seed fallback

**Files:**
- Create: `lib/filters.ts`, `tests/filters.test.ts`, `lib/queries/tours.ts`, `lib/queries/categories.ts`, `data/seed/tours.ts` (adapt existing `src/data/trips.ts` into `Tour` shape)

**Interfaces:**
- Consumes: `Tour`, `Category` from `types/db.ts`; `isDbConfigured` from `lib/supabase/server`.
- Produces: `filterTours(tours, {category, priceBand}): Tour[]`, `sortTours(tours, key): Tour[]` where key ∈ `'popular'|'price-asc'|'price-desc'|'date'`; `getTours(opts)`, `getTourBySlug(slug)`, `getFeaturedTours()`, `getCategories()`.

- [ ] **Step 1: Write failing tests `tests/filters.test.ts`**

```ts
import { describe, it, expect } from 'vitest';
import { filterTours, sortTours, PRICE_BANDS } from '@/lib/filters';
import type { Tour } from '@/types/db';

const t = (o: Partial<Tour>): Tour => ({ id:'x', slug:'x', title:'x', subtitle:null, summary:null, body:{}, price_from:50, price_original:null, currency:'EUR', duration_label:null, departure_note:null, meeting_point:null, status:'published', is_featured:false, cover_image_id:null, seo_title:null, seo_description:null, source_url:null, sort_order:0, published_at:null, ...o });

describe('filterTours', () => {
  it('filters by category slug', () => {
    const a = t({ id:'a', categories:[{ id:'1', slug:'kroyazieres', name_el:'', description_el:null, sort_order:0 }] });
    const b = t({ id:'b', categories:[{ id:'2', slug:'monoimeres', name_el:'', description_el:null, sort_order:0 }] });
    expect(filterTours([a,b], { category:'kroyazieres' }).map(x=>x.id)).toEqual(['a']);
  });
  it('filters by price band', () => {
    const cheap = t({ id:'c', price_from:10 }); const mid = t({ id:'m', price_from:50 });
    expect(filterTours([cheap,mid], { priceBand:'lte25' }).map(x=>x.id)).toEqual(['c']);
  });
});

describe('sortTours', () => {
  it('price-asc sorts ascending by price_from', () => {
    const hi = t({ id:'h', price_from:90 }); const lo = t({ id:'l', price_from:20 });
    expect(sortTours([hi,lo],'price-asc').map(x=>x.id)).toEqual(['l','h']);
  });
  it('date sorts by next_departure soonest first, nulls last', () => {
    const soon = t({ id:'s', next_departure:'2026-07-10' }); const later = t({ id:'z', next_departure:'2026-09-01' }); const none = t({ id:'n', next_departure:null });
    expect(sortTours([later,none,soon],'date').map(x=>x.id)).toEqual(['s','z','n']);
  });
});
```

- [ ] **Step 2: Run → verify fail**

Run: `npm run test:run -- filters`
Expected: FAIL (module not found).

- [ ] **Step 3: Implement `lib/filters.ts`**

```ts
import type { Tour } from '@/types/db';
export const PRICE_BANDS = { lte25:[0,25], '25to75':[25,75], gte75:[75,Infinity] } as const;
export type PriceBand = keyof typeof PRICE_BANDS;
export type SortKey = 'popular'|'price-asc'|'price-desc'|'date';

export function filterTours(tours: Tour[], f: { category?: string; priceBand?: PriceBand }): Tour[] {
  return tours.filter(t => {
    if (f.category && !(t.categories ?? []).some(c => c.slug === f.category)) return false;
    if (f.priceBand) { const [lo,hi] = PRICE_BANDS[f.priceBand]; const p = t.price_from ?? 0; if (p < lo || p >= hi) return false; }
    return true;
  });
}
export function sortTours(tours: Tour[], key: SortKey): Tour[] {
  const a = [...tours];
  switch (key) {
    case 'price-asc': return a.sort((x,y)=>(x.price_from??0)-(y.price_from??0));
    case 'price-desc': return a.sort((x,y)=>(y.price_from??0)-(x.price_from??0));
    case 'date': return a.sort((x,y)=>{ const dx=x.next_departure, dy=y.next_departure; if(!dx&&!dy)return 0; if(!dx)return 1; if(!dy)return -1; return dx<dy?-1:dx>dy?1:0; });
    case 'popular': default: return a.sort((x,y)=>Number(y.is_featured)-Number(x.is_featured));
  }
}
```

- [ ] **Step 4: Run → verify pass** (`npm run test:run -- filters` → PASS)

- [ ] **Step 5: Build the data layer `lib/queries/tours.ts`** — Supabase when configured, else seed:

```ts
import { isDbConfigured, createServerClient } from '@/lib/supabase/server';
import { seedTours } from '@/data/seed/tours';
import type { Tour } from '@/types/db';

export async function getTours(): Promise<Tour[]> {
  if (!isDbConfigured()) return seedTours;
  const sb = await createServerClient();
  const { data } = await sb.from('tours')
    .select('*, categories:tour_categories(category:categories(*)), images:tour_images(*)')
    .eq('status','published').order('sort_order');
  return (data ?? []).map(normalizeTourRow);
}
export async function getTourBySlug(slug: string): Promise<Tour | null> {
  if (!isDbConfigured()) return seedTours.find(t => t.slug === slug) ?? null;
  const sb = await createServerClient();
  const { data } = await sb.from('tours').select('*, categories:tour_categories(category:categories(*)), images:tour_images(*)').eq('slug', slug).eq('status','published').maybeSingle();
  return data ? normalizeTourRow(data) : null;
}
export async function getFeaturedTours(): Promise<Tour[]> { return (await getTours()).filter(t => t.is_featured); }
// normalizeTourRow: flatten the nested category join into Tour.categories[]
```
Create `data/seed/tours.ts` by mapping the existing `src/data/trips.ts` entries into the `Tour` shape (title, slug, price_from, category → categories[{slug}], is_featured, summary=description, a placeholder cover image). This keeps the site populated before migration.

- [ ] **Step 6: Commit**

```bash
git add -A && git commit -m "feat(next): filter/sort logic (tested) + tours data layer with seed fallback"
```

---

### Task 7: Port shared UI + layout components to Next

**Files:**
- Create under `components/`: `ui/Button.tsx`, `ui/button-variants.ts`, `ui/Badge.tsx`, `ui/TextLink.tsx`, `layout/Navbar.tsx`, `layout/Footer.tsx`, `layout/PageTransition.tsx`, `shared/*`, `home/*`, `trips/*`, `cruises/*`, `rentals/*`, `hooks/*`
- Modify: `app/(site)/layout.tsx`

**Interfaces:**
- Consumes: `cn` from `@/lib/utils`, `gsap` from `@/lib/gsap`.
- Produces: `<Navbar/>`, `<Footer/>`, `<PageTransition/>`, `<Button/>`, `<Badge/PriceBadge/>` etc. for pages.

- [ ] **Step 1: Copy components** from `src/components/**` → `components/**`. Update imports `@/components/...`, `@/hooks/...`, `@/lib/...` (these alias to project root under Next — set `paths` `@/*` in `tsconfig.json`).

- [ ] **Step 2: Next-ify client components** — add `'use client'` to any component using hooks/gsap/state (Navbar, PageTransition, RevealOnScroll, StatCounter, HomeHero, EditorialFeature, FilterBar, all interactive cards). Replace `react-router-dom` `Link`→`next/link` `Link`, `NavLink`+`useLocation`→`usePathname` from `next/navigation`, and move `buttonVariants` into `ui/button-variants.ts` (fixes the fast-refresh warning too).

- [ ] **Step 3: `app/(site)/layout.tsx`** composes `<Navbar/> {children} <Footer/>` with `<PageTransition>` wrapper.

- [ ] **Step 4: Verify** — `npm run dev`, temporary home renders with real Navbar/Footer, nav links route, no console errors.

- [ ] **Step 5: Commit**

```bash
git add -A && git commit -m "feat(next): port shared UI + site layout (nav/footer/transition)"
```

---

### Task 8: Reconstruct the Home page as a Server Component

**Files:**
- Modify: `app/(site)/page.tsx`
- Create/port: `components/home/*` sections (Hero, CategoryStrip, EditorialFeature) and reuse card components.

**Interfaces:**
- Consumes: `getFeaturedTours()`, `getCategories()`; `Tour`.

- [ ] **Step 1:** Implement `page.tsx` composing the sections from the original `HomePage.tsx` (hero, category strip, featured tours grid, dark about+stats, editorial feature, cruises teaser, testimonials, CTA strip), fetching featured tours server-side. Client sections (`HomeHero`, `EditorialFeature`, reveal wrappers) receive data as props.

- [ ] **Step 2: `generateMetadata`** for home (title/description/OG).

- [ ] **Step 3: Verify** home renders full-length; images via `next/image` show blur placeholder; no console errors; reduced-motion pass.

- [ ] **Step 4: Commit**

```bash
git add -A && git commit -m "feat(site): reconstruct Home as server component"
```

---

### Task 9: Reconstruct catalog + category listing pages with FilterBar

**Files:**
- Create: `app/(site)/ekdromes/page.tsx`, `app/(site)/ekdromes/[category]/page.tsx`, `components/trips/FilterBar.tsx`, `components/trips/TourGrid.tsx` (client)
- Reuse: `TripCard` (renamed to `TourCard`), `Pagination`.

**Interfaces:**
- Consumes: `getTours()`, `getCategories()`, `filterTours`, `sortTours`, `PRICE_BANDS`.

- [ ] **Step 1:** `FilterBar` (client): category chips (from categories), price-band chips (`Έως 25€ / 25–75€ / 75€+`), sort control, live result count with Greek pluralization (`1 εκδρομή` / `N εκδρομές`), empty-state panel + reset. State via URL search params (`useSearchParams`) so it's shareable/SSR-friendly.
- [ ] **Step 2:** `ekdromes/page.tsx` (all tours) and `ekdromes/[category]/page.tsx` (`generateStaticParams` from category slugs; validate slug → 404 if unknown) render `TourGrid` with server-fetched tours; category page pre-selects the category.
- [ ] **Step 3:** `generateMetadata` per category (title/description).
- [ ] **Step 4: Verify** — filter/sort/paginate work; empty state + reset work; unknown category → 404.
- [ ] **Step 5: Commit** `feat(site): tours catalog + category pages with filters`

---

### Task 10: Reconstruct tour detail (ISR) + remaining pages

**Files:**
- Create: `app/(site)/tour/[slug]/page.tsx`, `app/(site)/kroyazieres/page.tsx`, `app/(site)/enoikiaseis-poylman/page.tsx`, `app/(site)/epikoinonia/page.tsx`, `app/(site)/istoriko-ekdromon/page.tsx`, `app/(site)/oroi/page.tsx`

**Interfaces:**
- Consumes: `getTourBySlug`, `getTours` (for `generateStaticParams`), `getSettings`.

- [ ] **Step 1:** `tour/[slug]/page.tsx` — `export const revalidate = 3600`; `generateStaticParams` from published slugs; `generateMetadata` (title/desc/OG from tour); `notFound()` if missing; render gallery (next/image), price, duration, departures, body sections, related tours, CTA. **No source_url rendered.**
- [ ] **Step 2:** JSON-LD `TouristTrip` + `BreadcrumbList` via `lib/seo.ts` helper injected as `<script type="application/ld+json">`.
- [ ] **Step 3:** Port cruises, bus-rentals, contact (react-hook-form + zod form; contact info from `getSettings`), istoriko (archive), oroi (terms) from the existing pages/data. Contact map iframe kept (Google embed is allowed; it's not the old site).
- [ ] **Step 4: Verify** each route renders; tour detail SSR + metadata correct.
- [ ] **Step 5: Commit** `feat(site): tour detail (ISR + JSON-LD) + remaining pages`

---

### Task 11: SEO plumbing — sitemap, robots, structured data, org schema

**Files:**
- Create: `app/sitemap.ts`, `app/robots.ts`, `lib/seo.ts`

- [ ] **Step 1:** `sitemap.ts` — enumerate static routes + `getTours()` slugs → absolute URLs from `NEXT_PUBLIC_SITE_URL`.
- [ ] **Step 2:** `robots.ts` — allow all, disallow `/admin`, point to sitemap.
- [ ] **Step 3:** `lib/seo.ts` — `TravelAgency` org JSON-LD (name, since 1995, Peristeri address/phones from settings), tour/breadcrumb builders, canonical helper (our domain only).
- [ ] **Step 4: Verify** — `curl localhost:3000/sitemap.xml` lists tours; `/robots.txt` disallows `/admin`; **`grep -rn "sergianitravel.gr" app components lib` returns only `source_url` mentions in data/comments, never in rendered output.**
- [ ] **Step 5: Commit** `feat(seo): sitemap, robots, structured data`

---

### Task 12: Remove Vite, finalize build, full verification

**Files:**
- Delete: `index.html`, `src/main.tsx`, `src/App.tsx`, `vite.config.ts`, `tsconfig.app.json`, `tsconfig.node.json`, `src/**` once fully ported; remove `react-router-dom`, `vite`, `@vitejs/plugin-react` from deps.
- Modify: `package.json` (drop `vite:*` scripts), `tsconfig.json` (Next config), `README.md`.

- [ ] **Step 1:** Confirm no imports remain from `src/**` (`grep -rn "from '@/" | grep src` = none; everything under root `components/lib/app`). Move `src/test/setup.ts` and the `useReducedMotion` test to `tests/`.
- [ ] **Step 2:** Delete Vite files + deps; update Vitest config for the new paths (vitest.config or `test` in next setup with jsdom).
- [ ] **Step 3: Full verification**

```bash
npm run test:run   # filters + reducedMotion pass
npm run build      # next build succeeds; multiple route chunks
npm run lint       # zero warnings
```
- [ ] **Step 4:** Manual smoke: every route SSR-renders against seed data; no console errors; reduced-motion static; no `sergianitravel.gr` in output.
- [ ] **Step 5: Commit** `chore(next): remove Vite, finalize Next.js foundation`

---

## What this plan intentionally defers (own plans later)
- **Applying** the Supabase migrations, creating the admin user, running the migration — gated on credentials (§ Task 3/4 apply notes).
- **Content migration pipeline** (crawl 205 tours → DB/Storage) — separate plan (Phase 2).
- **Admin dashboard** (auth-guarded CRUD/hide/upload) — separate plan (Phase 4).
- Full elevation motion/texture polish beyond the ported behavior — layered in during Task 8–10 where noted, remainder tracked from the elevation spec.
