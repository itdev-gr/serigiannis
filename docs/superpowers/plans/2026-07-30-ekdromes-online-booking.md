# Excursion Online Booking (Client Changes) Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Repurpose the KTEL-style `/eisitiria` bus-ticket wizard into an **excursion seat-booking** system ("Κλείστε Online Θέσεις") per the client's request doc, plus content/sorting changes on ΝΕΑ articles and excursion listings.

**Architecture:** An "excursion" IS a published `bus_routes` row (it gains a display `title` and a list of `boarding_points`). The wizard's step 1 becomes: choose excursion → choose one of the **actually scheduled** dates → choose meeting point → choose number of persons. Trip kind is always `'oneway'` in the public wizard (the excursion price is `fare_types.price_oneway_cents`); only two fare categories exist: **Κανονικό** and **Φοιτητικό**. Seat holds, checkout, payments (offline / Viva Smart Checkout, which natively offers card + IRIS) stay on the existing engine. All DB changes go in NEW migration files (0013, 0014) — never edit 0001–0012.

**Tech Stack:** Next.js 16 App Router (server components + server actions), Supabase (SQL migrations + SECURITY DEFINER RPCs), zod + react-hook-form, vitest, Tailwind.

## Global Constraints

- UI copy is Greek. Client-mandated strings, verbatim: step labels `Επιλέξτε εκδρομή`, `Διαλέξτε ώρα δρομολογίου`, `Επιλέξτε τις θέσεις σας`, `Ολοκλήρωση αγοράς`; the feature is called `Κλείστε Online Θέσεις`.
- Exactly two active public fare categories per excursion: `Κανονικό`, `Φοιτητικό` (different prices; Φοιτητικό has `requires_document = true`).
- Public wizard date choice must offer ONLY dates the excursion actually runs (from `schedule_patterns` + `trips`), never a free calendar.
- Per-passenger: ονοματεπώνυμο **και τηλέφωνο** required. Per-booking billing (name/email/phone/address/…) stays required as-is (covers both card and IRIS requirements).
- Never edit applied migrations `supabase/migrations/0001…0012`. New DDL goes in `0013_…` / `0014_…`.
- Tests: `npm run test:run` (vitest). Type/compile check: `npm run build`. Lint: `npm run lint`.
- Migrations cannot be executed by the test suite; verify SQL by careful reading and verify TS callers via `npm run build`. The user applies migrations to Supabase via the project's usual flow (see `supabase/README.md`).
- Commit after every task. Conventional commits, Greek scope text allowed.
- Do NOT delete `/kratisi` (legacy request form) — it just stops being linked from nav/articles.

---

### Task 1: Migration 0013 — excursion schema + fare data cleanup

**Files:**
- Create: `supabase/migrations/0013_excursions_schema.sql`

**Interfaces:**
- Produces columns consumed by later tasks: `bus_routes.title text`, `bus_routes.boarding_points text[]`, `ticket_orders.boarding_point text`, `tickets.passenger_phone text`.
- Produces fare data state: per route only `Κανονικό` + `Φοιτητικό` active.

- [ ] **Step 1: Write the migration file**

```sql
-- 0013: excursion-mode booking — routes become excursions.
-- (client request 2026-07-30: excursion picker, meeting points,
--  Κανονικό/Φοιτητικό only, per-passenger phone)

alter table public.bus_routes
  add column if not exists title text,
  add column if not exists boarding_points text[] not null default '{}';

alter table public.ticket_orders
  add column if not exists boarding_point text;

alter table public.tickets
  add column if not exists passenger_phone text;

-- Fare catalogue: exactly two public categories (Κανονικό / Φοιτητικό).
update public.fare_types set is_active = false
 where name in ('Μισό/Φοιτητικό', 'Δωρεάν');

update public.fare_types
   set name = 'Φοιτητικό',
       description = 'Φοιτητές με επίδειξη ακαδημαϊκής ταυτότητας (πάσο).'
 where name = 'Φοιτητικό/Στρατιωτικό';
```

- [ ] **Step 2: Sanity-check against existing schema**

Read `supabase/migrations/0007_ticketing_core.sql:26-54` (bus_routes, fare_types) and `0008_ticketing_orders.sql:5-61` (ticket_orders, tickets) and confirm none of the four new column names already exist. Expected: they do not.

- [ ] **Step 3: Commit**

```bash
git add supabase/migrations/0013_excursions_schema.sql
git commit -m "feat(db): 0013 excursion schema — route title, boarding points, passenger phone, two fare categories"
```

---

### Task 2: Migration 0014 — excursion RPCs

**Files:**
- Create: `supabase/migrations/0014_excursions_functions.sql`
- Reference (copy-from, do not edit): `supabase/migrations/0010_ticketing_functions.sql`

**Interfaces:**
- Produces RPCs consumed by later tasks:
  - `public.list_route_dates()` → `table(route_id uuid, service_date date)` — all bookable dates per published route within the sales window.
  - `public.search_route_trips(p_route_id uuid, p_date date)` → jsonb `{ ok, route: { id, title, origin_id, destination_id, duration_min }, trips: [...] }` (same trip row shape as existing `search_trips`).
  - Patched `finalize_checkout` — now REQUIRES `passenger_phone` (≥8 chars) per passenger entry and persists `p_billing->>'boarding_point'` onto `ticket_orders.boarding_point`. New error code: `invalid_passenger_phone`.
  - Patched `issue_tickets_internal` — copies `passenger_phone` from `passenger_data` onto `tickets.passenger_phone`.
  - Patched `get_order_by_token` — order json gains `boarding_point`, ticket json gains `passenger_phone`.

- [ ] **Step 1: Write the two new functions + grants into 0014**

```sql
-- 0014: excursion-mode RPCs.

-- All bookable dates per published route inside the sales window:
-- union of (a) dates the active weekly patterns generate and
-- (b) already-materialized scheduled trips (incl. one-off trips).
create or replace function public.list_route_dates()
returns table(route_id uuid, service_date date)
language sql stable security definer set search_path = '' as $$
  with win as (
    select (now() at time zone 'Europe/Athens')::date as d0,
           (now() at time zone 'Europe/Athens')::date
             + (select sales_window_days from public.booking_settings where id = 1) as d1
  )
  select r.id as route_id, d.d::date as service_date
  from public.bus_routes r
  join public.schedule_patterns sp on sp.route_id = r.id and sp.is_active
  cross join win
  cross join lateral generate_series(
    greatest(win.d0, sp.valid_from),
    least(win.d1, coalesce(sp.valid_to, win.d1)),
    interval '1 day') as d(d)
  where r.status = 'published'
    and extract(dow from d.d)::smallint = any (sp.weekdays)
  union
  select t.route_id, t.service_date
  from public.trips t
  join public.bus_routes r on r.id = t.route_id and r.status = 'published'
  cross join win
  where t.status = 'scheduled'
    and t.service_date between win.d0 and win.d1
  order by 1, 2;
$$;

-- Like search_trips, but by route id (the excursion) instead of origin+dest pair.
create or replace function public.search_route_trips(p_route_id uuid, p_date date)
returns jsonb
language plpgsql volatile security definer set search_path = '' as $$
declare
  v_route public.bus_routes;
  v_settings public.booking_settings;
  v_trips jsonb;
begin
  select * into v_settings from public.booking_settings where id = 1;

  select * into v_route from public.bus_routes
    where id = p_route_id and status = 'published';
  if not found then
    return jsonb_build_object('ok', false, 'error', 'route_not_found');
  end if;

  if p_date < (now() at time zone 'Europe/Athens')::date
     or p_date > (now() at time zone 'Europe/Athens')::date + v_settings.sales_window_days then
    return jsonb_build_object('ok', false, 'error', 'date_out_of_range');
  end if;

  perform public.materialize_trips(v_route.id, p_date, p_date);

  select coalesce(jsonb_agg(jsonb_build_object(
      'id', t.id,
      'time', to_char(t.departure_at at time zone 'Europe/Athens', 'HH24:MI'),
      'departure_at', t.departure_at,
      'seats_available', greatest(t.online_seats_total - coalesce(c.taken, 0), 0),
      'double_decker', jsonb_array_length(l.layout->'decks') > 1,
      'departed', now() >= t.departure_at,
      'bookable', t.status = 'scheduled'
        and now() < t.departure_at - make_interval(mins => public.trip_cutoff_min(t))
        and greatest(t.online_seats_total - coalesce(c.taken, 0), 0) > 0
    ) order by t.departure_at), '[]'::jsonb)
  into v_trips
  from public.trips t
  join public.bus_layouts l on l.id = t.layout_id
  left join (
    select trip_id, count(*) as taken
    from public.trip_seat_claims
    where claim_type <> 'hold' or expires_at > now()
    group by trip_id
  ) c on c.trip_id = t.id
  where t.route_id = v_route.id and t.service_date = p_date and t.status = 'scheduled';

  return jsonb_build_object(
    'ok', true,
    'route', jsonb_build_object(
      'id', v_route.id,
      'title', v_route.title,
      'origin_id', v_route.origin_station_id,
      'destination_id', v_route.destination_station_id,
      'duration_min', v_route.duration_min),
    'trips', v_trips);
end $$;
```

- [ ] **Step 2: Append the patched `finalize_checkout`**

Copy the ENTIRE function `finalize_checkout` from `supabase/migrations/0010_ticketing_functions.sql:354-491` into 0014 verbatim (including the `create or replace function … returns jsonb language plpgsql …` header and the final `end $$;`), then apply exactly these three edits:

Edit (a) — after the passenger-name check inside the passengers loop:

```sql
    if coalesce(v_entry->>'passenger_name', '') = '' or length(v_entry->>'passenger_name') < 2 then
      return jsonb_build_object('ok', false, 'error', 'invalid_passenger_name');
    end if;
```

insert immediately after it:

```sql
    if coalesce(v_entry->>'passenger_phone', '') = '' or length(v_entry->>'passenger_phone') < 8 then
      return jsonb_build_object('ok', false, 'error', 'invalid_passenger_phone');
    end if;
```

Edit (b) — in the `v_pax := v_pax || jsonb_build_object(` call, after the line `'passenger_name', v_entry->>'passenger_name',` insert:

```sql
      'passenger_phone', v_entry->>'passenger_phone',
```

Edit (c) — in the `update public.ticket_orders set` block, after the line `region = p_billing->>'region',` insert:

```sql
    boarding_point = nullif(p_billing->>'boarding_point', ''),
```

- [ ] **Step 3: Append the patched `issue_tickets_internal`**

Copy the ENTIRE function `issue_tickets_internal` from `supabase/migrations/0010_ticketing_functions.sql:252-349` into 0014 verbatim, then patch ALL THREE `insert into public.tickets (…)` statements (outbound, round-return, open-return):

- In each column list, change `passenger_name, fare_type_id` → `passenger_name, passenger_phone, fare_type_id`
- In each VALUES list, change `v_entry->>'passenger_name',` → `v_entry->>'passenger_name', v_entry->>'passenger_phone',`

(Positional care: the outbound insert's values line is `v_entry->>'outbound_seat', v_entry->>'passenger_name',` — the new value goes right after `passenger_name`'s value in every insert.)

- [ ] **Step 4: Append the patched `get_order_by_token`**

Copy the ENTIRE function `get_order_by_token` from `supabase/migrations/0010_ticketing_functions.sql:552-639` into 0014 verbatim, then:

- In the `'order', jsonb_build_object(` block, after `'phone', v_order.phone,` insert:

```sql
      'boarding_point', v_order.boarding_point,
```

- In the `'tickets', (` aggregation, after `'passenger_name', tk.passenger_name,` insert:

```sql
        'passenger_phone', tk.passenger_phone,
```

- [ ] **Step 5: Append grants at the end of 0014**

```sql
revoke execute on function
  public.list_route_dates(),
  public.search_route_trips(uuid, date)
from public, anon, authenticated;

grant execute on function
  public.list_route_dates(),
  public.search_route_trips(uuid, date)
to anon, authenticated;
```

- [ ] **Step 6: Verify by re-reading**

Diff-read your 0014 against 0010's originals: the ONLY differences in the three copied functions must be the edits listed above (phone check, v_pax key, boarding_point set, 3× tickets insert, 2× jsonb keys). Any other drift is a bug.

- [ ] **Step 7: Commit**

```bash
git add supabase/migrations/0014_excursions_functions.sql
git commit -m "feat(db): 0014 excursion RPCs — route dates, search by route, passenger phone + boarding point"
```

---

### Task 3: Types + query/lib layer

**Files:**
- Modify: `types/ticketing.ts`
- Modify: `lib/queries/ticketing.ts`
- Create: `lib/excursions.ts`
- Test: `tests/excursions.test.ts`

**Interfaces:**
- Produces (consumed by Tasks 6–9, 11):
  - `Excursion = { id: string; title: string; boarding_points: string[]; dates: string[] }` (types/ticketing.ts)
  - `getExcursions(): Promise<Excursion[]>` (lib/queries/ticketing.ts)
  - `groupRouteDates(rows: RouteDateRow[]): Map<string, string[]>` and `parseBoardingPoints(text: string): string[]` (lib/excursions.ts)
  - `BusRoute` gains `title: string | null; boarding_points: string[]`
  - `SearchResult` route object gains `title?: string | null`
  - `OrderBundle` order gains `boarding_point: string | null`; `OrderTicket` gains `passenger_phone: string | null`
  - `AdminTicket` (lib/queries/ticketing.ts) gains `passenger_phone: string | null`

- [ ] **Step 1: Write the failing tests**

Create `tests/excursions.test.ts`:

```ts
import { describe, expect, it } from 'vitest';
import { groupRouteDates, parseBoardingPoints } from '@/lib/excursions';

describe('groupRouteDates', () => {
  it('groups, dedupes and sorts dates per route', () => {
    const map = groupRouteDates([
      { route_id: 'a', service_date: '2026-08-03' },
      { route_id: 'b', service_date: '2026-08-01' },
      { route_id: 'a', service_date: '2026-08-01' },
      { route_id: 'a', service_date: '2026-08-03' },
    ]);
    expect(map.get('a')).toEqual(['2026-08-01', '2026-08-03']);
    expect(map.get('b')).toEqual(['2026-08-01']);
  });

  it('returns empty map for no rows', () => {
    expect(groupRouteDates([]).size).toBe(0);
  });
});

describe('parseBoardingPoints', () => {
  it('splits lines, trims, drops empties', () => {
    expect(parseBoardingPoints('  Πλατεία Γαστούνης \n\n ΚΤΕΛ Αμαλιάδας\n')).toEqual([
      'Πλατεία Γαστούνης',
      'ΚΤΕΛ Αμαλιάδας',
    ]);
  });

  it('empty string -> empty array', () => {
    expect(parseBoardingPoints('')).toEqual([]);
  });
});
```

- [ ] **Step 2: Run tests to verify they fail**

Run: `npx vitest run tests/excursions.test.ts`
Expected: FAIL — cannot resolve `@/lib/excursions`.

- [ ] **Step 3: Implement `lib/excursions.ts`**

```ts
export type RouteDateRow = { route_id: string; service_date: string };

/** Group list_route_dates rows into route_id -> sorted unique ISO dates. */
export function groupRouteDates(rows: RouteDateRow[]): Map<string, string[]> {
  const map = new Map<string, string[]>();
  for (const r of rows) {
    const arr = map.get(r.route_id) ?? [];
    if (!arr.includes(r.service_date)) arr.push(r.service_date);
    map.set(r.route_id, arr);
  }
  for (const arr of map.values()) arr.sort();
  return map;
}

/** Admin textarea (one boarding point per line) -> clean array. */
export function parseBoardingPoints(text: string): string[] {
  return text
    .split('\n')
    .map((s) => s.trim())
    .filter(Boolean);
}
```

- [ ] **Step 4: Run tests to verify they pass**

Run: `npx vitest run tests/excursions.test.ts`
Expected: PASS (4 tests).

- [ ] **Step 5: Extend `types/ticketing.ts`**

In `BusRoute` (types/ticketing.ts:28-36) add after `position: number;`:

```ts
  title: string | null;
  boarding_points: string[];
```

Replace the `SearchResult` type (types/ticketing.ts:105-107) with:

```ts
export type SearchResult =
  | {
      ok: true;
      route: { id: string; title?: string | null; origin_id: string; destination_id: string; duration_min: number | null };
      trips: TripRow[];
    }
  | { ok: false; error: string };
```

In `OrderTicket` (types/ticketing.ts:122-137) add after `passenger_name: string;`:

```ts
  passenger_phone: string | null;
```

In `OrderBundle`'s order object (types/ticketing.ts:151-164) add after `phone: string | null;`:

```ts
        boarding_point: string | null;
```

At the end of the file add:

```ts
/** Public wizard: a bookable excursion (published route + its scheduled dates). */
export type Excursion = {
  id: string;
  title: string;
  boarding_points: string[];
  dates: string[];
};
```

- [ ] **Step 6: Extend `lib/queries/ticketing.ts`**

Add `Excursion` to the type import at the top, and `import { groupRouteDates, type RouteDateRow } from '@/lib/excursions';`. Then add below `getPublishedRoutes` (lib/queries/ticketing.ts:47):

```ts
type ExcursionRouteRow = BusRoute & { destination: { name: string } | null };

/** Published routes as excursions, with the dates they actually run. */
export async function getExcursions(): Promise<Excursion[]> {
  const sb = createPublicClient();
  const [routesRes, datesRes] = await Promise.all([
    sb
      .from('bus_routes')
      .select('*, destination:stations!bus_routes_destination_station_id_fkey(name)')
      .eq('status', 'published')
      .order('position'),
    sb.rpc('list_route_dates'),
  ]);
  if (routesRes.error) { console.error('getExcursions routes:', routesRes.error.message); return []; }
  if (datesRes.error) { console.error('getExcursions dates:', datesRes.error.message); return []; }
  const dateMap = groupRouteDates((datesRes.data ?? []) as RouteDateRow[]);
  return ((routesRes.data ?? []) as ExcursionRouteRow[]).map((r) => ({
    id: r.id,
    title: r.title?.trim() || (r.destination?.name ?? '—'),
    boarding_points: r.boarding_points ?? [],
    dates: dateMap.get(r.id) ?? [],
  }));
}
```

In the `AdminTicket` type (lib/queries/ticketing.ts:203-224) add after `passenger_name: string;`:

```ts
  passenger_phone: string | null;
```

- [ ] **Step 7: Full check + commit**

Run: `npm run test:run` → all green. Run: `npm run build` → compiles.

```bash
git add types/ticketing.ts lib/queries/ticketing.ts lib/excursions.ts tests/excursions.test.ts
git commit -m "feat(ticketing): excursion types, getExcursions query, boarding-point helpers"
```

---

### Task 4: Sort excursions by date (ΝΕΑ list + tours default sort)

Client: «ΤΑΞΙΝΟΜΗΣΗ: ΝΑ ΒΓΑΙΝΟΥΝ ΟΙ ΕΚΔΡΟΜΕΣ ΠΟΥ ΘΑ ΓΙΝΟΝΤΑΙ ΒΑΣΗ ΗΜΕΡΟΜΗΝΙΑΣ (26/07 πρώτη, 27/07 δεύτερη…)».

**Files:**
- Create: `lib/posts-sort.ts`
- Test: `tests/posts-sort.test.ts`
- Modify: `app/(site)/nea/page.tsx:12`
- Modify: `components/trips/ToursExplorer.tsx:39,56`

**Interfaces:**
- Produces: `sortPostsForListing(posts: Post[], todayIso: string): Post[]` — upcoming excursions first (trip_date ascending), then undated articles (published_at desc), then past excursions (trip_date desc).

- [ ] **Step 1: Write the failing test** — `tests/posts-sort.test.ts`:

```ts
import { describe, expect, it } from 'vitest';
import { sortPostsForListing } from '@/lib/posts-sort';
import type { Post } from '@/types/db';

const p = (id: string, trip_date: string | null, published_at: string | null): Post =>
  ({ id, trip_date, published_at } as unknown as Post);

describe('sortPostsForListing', () => {
  it('upcoming by trip_date asc, then undated by published_at desc, then past by trip_date desc', () => {
    const posts = [
      p('past-old', '2026-06-01', '2026-05-01'),
      p('undated-new', null, '2026-07-20'),
      p('up-late', '2026-08-10', '2026-07-01'),
      p('undated-old', null, '2026-07-01'),
      p('up-today', '2026-07-30', '2026-07-02'),
      p('past-recent', '2026-07-15', '2026-07-01'),
      p('up-soon', '2026-08-01', '2026-07-03'),
    ];
    const ids = sortPostsForListing(posts, '2026-07-30').map((x) => x.id);
    expect(ids).toEqual(['up-today', 'up-soon', 'up-late', 'undated-new', 'undated-old', 'past-recent', 'past-old']);
  });

  it('does not mutate the input array', () => {
    const posts = [p('a', '2026-08-01', null), p('b', '2026-07-31', null)];
    sortPostsForListing(posts, '2026-07-30');
    expect(posts[0].id).toBe('a');
  });
});
```

- [ ] **Step 2: Run it — expect FAIL** (`npx vitest run tests/posts-sort.test.ts`, cannot resolve `@/lib/posts-sort`).

- [ ] **Step 3: Implement `lib/posts-sort.ts`**

```ts
import type { Post } from '@/types/db';

/**
 * ΝΕΑ listing order (client request): the excursions that are coming up appear
 * first, soonest date first; undated articles follow (newest first); excursions
 * whose date has passed go last (most recent first).
 */
export function sortPostsForListing(posts: Post[], todayIso: string): Post[] {
  const upcoming = posts
    .filter((p) => p.trip_date && p.trip_date >= todayIso)
    .sort((a, b) => a.trip_date!.localeCompare(b.trip_date!));
  const undated = posts
    .filter((p) => !p.trip_date)
    .sort((a, b) => (b.published_at ?? '').localeCompare(a.published_at ?? ''));
  const past = posts
    .filter((p) => p.trip_date && p.trip_date < todayIso)
    .sort((a, b) => b.trip_date!.localeCompare(a.trip_date!));
  return [...upcoming, ...undated, ...past];
}
```

- [ ] **Step 4: Run it — expect PASS.**

- [ ] **Step 5: Wire into `/nea`**

In `app/(site)/nea/page.tsx` add `import { sortPostsForListing } from '@/lib/posts-sort';` and change line 12:

```ts
  const posts = sortPostsForListing(await getPosts(), new Date().toISOString().slice(0, 10));
```

- [ ] **Step 6: Default tours sort = date**

In `components/trips/ToursExplorer.tsx`:
- line 39: `const [sort, setSort] = useState<SortKey>('popular');` → `useState<SortKey>('date');`
- line 56 in `reset()`: `setSort('popular');` → `setSort('date');`

- [ ] **Step 7: Verify + commit**

Run: `npm run test:run` (all green, incl. existing `tests/filters.test.ts`) and `npm run build`.

```bash
git add lib/posts-sort.ts tests/posts-sort.test.ts "app/(site)/nea/page.tsx" components/trips/ToursExplorer.tsx
git commit -m "feat(site): sort excursions by upcoming date (ΝΕΑ list + tours default sort)"
```

---

### Task 5: Article page — photo + title only, CTA to the wizard

Client: «Όταν ανοίγουμε το άρθρο να φαίνεται η φωτογραφία και μόνο ο τίτλος, όχι περιγραφή».

**Files:**
- Modify: `app/(site)/nea/[slug]/page.tsx:62,85`

- [ ] **Step 1: Remove the excerpt from the hero**

In the `<PageHero …>` call (app/(site)/nea/[slug]/page.tsx:57-69) DELETE the line:

```tsx
        subtitle={post.excerpt ?? undefined}
```

(The excerpt stays in `generateMetadata` for SEO — do not touch that.)

- [ ] **Step 2: Point the article CTA at the wizard**

Line 85: change

```tsx
              <Link href={`/kratisi?post=${post.slug}`}>Κλείστε Online Θέση</Link>
```

to

```tsx
              <Link href="/eisitiria">Κλείστε Online Θέση</Link>
```

- [ ] **Step 3: Verify + commit**

Run: `npm run build`. Expected: compiles; no unused imports introduced.

```bash
git add "app/(site)/nea/[slug]/page.tsx"
git commit -m "feat(nea): article hero shows photo+title only; CTA goes to online seat booking"
```

---

### Task 6: Wizard step 1 — excursion picker (+ renames)

Client: «ΕΠΙΛΕΞΤΕ ΕΚΔΡΟΜΗ», «μόνο την ημερομηνία που θα πραγματοποιηθεί η εκδρομή», «σημείο συνάντησης … πόσα άτομα», «ΤΑ ΕΙΣΙΤΗΡΙΑ ΝΑ ΓΙΝΟΥΝ ΚΛΕΙΣΤΕ ONLINE ΘΕΣΕΙΣ».

**Files:**
- Create: `components/ticketing/ExcursionSearchForm.tsx`
- Delete: `components/ticketing/SearchForm.tsx`
- Modify: `components/ticketing/Stepper.tsx:1`
- Modify: `app/(site)/eisitiria/page.tsx` (full rewrite below)

**Interfaces:**
- Consumes: `getExcursions()` and `Excursion` from Task 3.
- Produces: step-2 URL contract `/eisitiria/dromologia?route=<uuid>&date=<YYYY-MM-DD>&pax=<1..10>[&bp=<string>]` consumed by Tasks 7–8.

- [ ] **Step 1: Stepper label**

`components/ticketing/Stepper.tsx:1` — change to:

```ts
const STEPS = ['Επιλέξτε εκδρομή', 'Διαλέξτε ώρα δρομολογίου', 'Επιλέξτε τις θέσεις σας', 'Ολοκλήρωση αγοράς'];
```

- [ ] **Step 2: Create `components/ticketing/ExcursionSearchForm.tsx`**

```tsx
'use client';
import { useState } from 'react';
import { useRouter } from 'next/navigation';
import { Button } from '@/components/ui/Button';
import type { Excursion } from '@/types/ticketing';

const inputCls =
  'w-full rounded-md border border-border bg-surface px-4 py-2.5 font-sans text-[15px] text-body transition focus:border-primary focus:outline-none focus:ring-4 focus:ring-primary/10';

function fmtDate(iso: string): string {
  return new Date(`${iso}T12:00:00`).toLocaleDateString('el-GR', {
    weekday: 'long', day: '2-digit', month: '2-digit', year: 'numeric',
  });
}

export function ExcursionSearchForm({ excursions }: { excursions: Excursion[] }) {
  const router = useRouter();
  const [routeId, setRouteId] = useState('');
  const [date, setDate] = useState('');
  const [bp, setBp] = useState('');
  const [pax, setPax] = useState(1);
  const [error, setError] = useState<string | null>(null);

  const chosen = excursions.find((x) => x.id === routeId);

  return (
    <form
      className="rounded-lg border border-border bg-surface p-6 shadow-card"
      onSubmit={(e) => {
        e.preventDefault();
        setError(null);
        if (!routeId) { setError('Επιλέξτε εκδρομή.'); return; }
        if (!date) { setError('Επιλέξτε ημερομηνία εκδρομής.'); return; }
        if ((chosen?.boarding_points.length ?? 0) > 0 && !bp) { setError('Επιλέξτε σημείο συνάντησης.'); return; }
        const params = new URLSearchParams({ route: routeId, date, pax: String(pax) });
        if (bp) params.set('bp', bp);
        router.push(`/eisitiria/dromologia?${params.toString()}`);
      }}
    >
      <div className="grid gap-4 sm:grid-cols-2">
        <label className="block sm:col-span-2">
          <span className="mb-1.5 block font-sans text-[13px] font-medium uppercase tracking-[0.1em] text-primary">Εκδρομή *</span>
          <select className={inputCls} value={routeId} onChange={(e) => { setRouteId(e.target.value); setDate(''); setBp(''); }}>
            <option value="">— Επιλέξτε εκδρομή —</option>
            {excursions.map((x) => (
              <option key={x.id} value={x.id}>{x.title}</option>
            ))}
          </select>
        </label>
        <label className="block">
          <span className="mb-1.5 block font-sans text-[13px] font-medium uppercase tracking-[0.1em] text-primary">Ημερομηνία εκδρομής *</span>
          <select className={inputCls} value={date} onChange={(e) => setDate(e.target.value)} disabled={!chosen}>
            <option value="">{chosen ? '— Επιλέξτε ημερομηνία —' : '— Πρώτα επιλέξτε εκδρομή —'}</option>
            {(chosen?.dates ?? []).map((d) => (
              <option key={d} value={d}>{fmtDate(d)}</option>
            ))}
          </select>
        </label>
        <label className="block">
          <span className="mb-1.5 block font-sans text-[13px] font-medium uppercase tracking-[0.1em] text-primary">Άτομα *</span>
          <select className={inputCls} value={pax} onChange={(e) => setPax(Number(e.target.value))}>
            {Array.from({ length: 10 }, (_, i) => i + 1).map((n) => (
              <option key={n} value={n}>{n === 1 ? '1 άτομο' : `${n} άτομα`}</option>
            ))}
          </select>
        </label>
        {(chosen?.boarding_points.length ?? 0) > 0 && (
          <label className="block sm:col-span-2">
            <span className="mb-1.5 block font-sans text-[13px] font-medium uppercase tracking-[0.1em] text-primary">Σημείο συνάντησης *</span>
            <select className={inputCls} value={bp} onChange={(e) => setBp(e.target.value)}>
              <option value="">— Επιλέξτε σημείο συνάντησης —</option>
              {chosen!.boarding_points.map((point) => (
                <option key={point} value={point}>{point}</option>
              ))}
            </select>
          </label>
        )}
      </div>

      {chosen && chosen.dates.length === 0 && (
        <p className="mt-4 rounded-md bg-primary/5 px-4 py-3 text-[14px] text-muted">
          Δεν υπάρχουν προγραμματισμένες ημερομηνίες για αυτή την εκδρομή. Επικοινωνήστε μαζί μας.
        </p>
      )}

      {error && <p className="mt-4 text-[14px] text-cta">{error}</p>}
      <div className="mt-6 flex justify-end">
        <Button type="submit" size="lg">Αναζήτηση</Button>
      </div>
    </form>
  );
}
```

- [ ] **Step 3: Rewrite `app/(site)/eisitiria/page.tsx`**

Replace the whole file with:

```tsx
import type { Metadata } from 'next';
import { PageHero } from '@/components/shared/PageHero';
import { PaymentMethods } from '@/components/shared/PaymentMethods';
import { Stepper } from '@/components/ticketing/Stepper';
import { ExcursionSearchForm } from '@/components/ticketing/ExcursionSearchForm';
import { getBookingSettings, getExcursions } from '@/lib/queries/ticketing';

export const revalidate = 300;

export const metadata: Metadata = {
  title: 'Κλείστε Online Θέσεις',
  description:
    'Κλείστε online θέσεις για τις εκδρομές μας: επιλέξτε εκδρομή και ημερομηνία, διαλέξτε τις θέσεις σας πάνω στο λεωφορείο και ολοκληρώστε την κράτησή σας ηλεκτρονικά.',
  alternates: { canonical: '/eisitiria' },
};

export default async function EisitiriaPage() {
  const [excursions, settings] = await Promise.all([getExcursions(), getBookingSettings()]);

  return (
    <>
      <PageHero
        eyebrow="Online Κράτηση Θέσεων"
        title="Κλείστε Online Θέσεις"
        subtitle="Επιλέξτε εκδρομή και ημερομηνία, διαλέξτε τις θέσεις σας πάνω στο λεωφορείο και ολοκληρώστε την κράτησή σας online."
        breadcrumbs={[{ label: 'Αρχική', href: '/' }, { label: 'Online Θέσεις' }]}
        heightClass="h-[44vh] min-h-[340px]"
      />
      <section className="py-16 md:py-24">
        <div className="container max-w-4xl">
          <Stepper current={1} />
          <ExcursionSearchForm excursions={excursions} />
          <p className="mt-6 text-center text-[13px] text-muted">
            Κρατήσεις έως {settings.sales_window_days} ημέρες πριν την αναχώρηση. Οι θέσεις σας δεσμεύονται
            για {settings.hold_minutes}′ κατά την ολοκλήρωση της αγοράς.
          </p>
          <PaymentMethods className="mt-10" />
        </div>
      </section>
    </>
  );
}
```

- [ ] **Step 4: Delete `components/ticketing/SearchForm.tsx`**

`git rm components/ticketing/SearchForm.tsx`. Then `grep -rn "SearchForm" app components lib` — the only remaining hits must be `ExcursionSearchForm`.

- [ ] **Step 5: Verify**

Run: `npm run build`. NOTE: `app/(site)/eisitiria/dromologia/page.tsx` still imports `searchTrips` and old params at this point — that file still compiles unchanged (old URL contract), so the build must pass. Step 2's URL contract goes live in Task 7.

- [ ] **Step 6: Commit**

```bash
git add -A
git commit -m "feat(eisitiria): step 1 = excursion picker (dates from schedule, meeting point, persons)"
```

---

### Task 7: Wizard step 2 — trips of the chosen excursion

**Files:**
- Modify: `app/(site)/eisitiria/actions.ts` (add action)
- Modify: `app/(site)/eisitiria/dromologia/page.tsx` (full rewrite below)
- Modify: `components/ticketing/TripList.tsx` (add `showDateNav` prop)

**Interfaces:**
- Consumes: RPC `search_route_trips` (Task 2), `SearchResult` with `route.title` (Task 3), URL contract from Task 6.
- Produces: `searchRouteTrips(input: { routeId: string; date: string }): Promise<SearchResult>`; forwards `route,date,bp,pax` + `trip` to `/eisitiria/thesis` (TripList already forwards all current query params and appends `trip`).

- [ ] **Step 1: Add the server action**

In `app/(site)/eisitiria/actions.ts`, below `searchTrips` (line 39), add:

```ts
/** Step 1 → 2 (excursions): trips of the chosen excursion for the chosen day. */
export async function searchRouteTrips(input: { routeId: string; date: string }): Promise<SearchResult> {
  const sb = await createServerClient();
  const { data, error } = await sb.rpc('search_route_trips', {
    p_route_id: input.routeId,
    p_date: input.date,
  });
  if (error) { console.error('searchRouteTrips:', error.message); return { ok: false, error: 'db' }; }
  return data as SearchResult;
}
```

(`SearchResult` is already imported in that file.)

- [ ] **Step 2: TripList — optional date arrows**

In `components/ticketing/TripList.tsx`:
- `TripsTable` props: add `showDateNav: boolean` to the type and destructuring.
- Replace the date `<span>` block (lines 56-64) with:

```tsx
          <span className="flex items-center gap-1 rounded-md bg-deep-ink/10 px-2 py-1 text-[13px] font-semibold text-deep-ink">
            {showDateNav && (
              <button type="button" aria-label="Προηγούμενη ημέρα" onClick={() => nav(-1)} className="rounded p-1 hover:bg-deep-ink/10">
                <ChevronLeft className="h-4 w-4" />
              </button>
            )}
            {fmtDate(date)}
            {showDateNav && (
              <button type="button" aria-label="Επόμενη ημέρα" onClick={() => nav(1)} className="rounded p-1 hover:bg-deep-ink/10">
                <ChevronRight className="h-4 w-4" />
              </button>
            )}
          </span>
```

- `TripList` props: add `showDateNav?: boolean` (type + destructure with default `= true`), and pass `showDateNav={showDateNav}` to BOTH `<TripsTable …>` calls.

- [ ] **Step 3: Rewrite `app/(site)/eisitiria/dromologia/page.tsx`**

```tsx
import type { Metadata } from 'next';
import Link from 'next/link';
import { Stepper } from '@/components/ticketing/Stepper';
import { TripList } from '@/components/ticketing/TripList';
import { searchRouteTrips } from '@/app/(site)/eisitiria/actions';

export const metadata: Metadata = {
  title: 'Δρομολόγια Εκδρομής',
  robots: { index: false },
};

export default async function DromologiaPage({
  searchParams,
}: {
  searchParams: Promise<{ route?: string; date?: string; bp?: string; pax?: string }>;
}) {
  const { route, date } = await searchParams;

  if (!route || !date) {
    return <BareMessage text="Η αναζήτηση δεν είναι πλήρης." backLabel="← Νέα αναζήτηση" />;
  }

  const result = await searchRouteTrips({ routeId: route, date });

  if (!result.ok) {
    const text =
      result.error === 'route_not_found'
        ? 'Η εκδρομή δεν βρέθηκε.'
        : result.error === 'date_out_of_range'
          ? 'Η ημερομηνία είναι εκτός της περιόδου κρατήσεων.'
          : 'Κάτι πήγε στραβά. Δοκιμάστε ξανά.';
    return <BareMessage text={text} backLabel="← Νέα αναζήτηση" />;
  }

  return (
    <section className="py-14 md:py-20">
      <div className="container max-w-5xl">
        <Stepper current={2} />
        <TripList
          kind="oneway"
          outboundLabel={result.route.title ?? '—'}
          date={date}
          outbound={result.trips}
          showDateNav={false}
        />
      </div>
    </section>
  );
}

function BareMessage({ text, backLabel }: { text: string; backLabel: string }) {
  return (
    <section className="py-24">
      <div className="container max-w-2xl text-center">
        <p className="mb-6 text-[16px] text-muted">{text}</p>
        <Link href="/eisitiria" className="font-medium text-primary hover:underline">{backLabel}</Link>
      </div>
    </section>
  );
}
```

Note: the old `searchTrips` action and `search_trips` RPC remain (unused by the wizard) — leave them; admin `manualBooking` and the DB grants are untouched.

- [ ] **Step 4: Verify + commit**

Run: `npm run build`.

```bash
git add "app/(site)/eisitiria/actions.ts" "app/(site)/eisitiria/dromologia/page.tsx" components/ticketing/TripList.tsx
git commit -m "feat(eisitiria): step 2 lists the excursion's departures for the chosen date"
```

---

### Task 8: Wizard step 3 — exact persons count + boarding-point passthrough

**Files:**
- Modify: `components/ticketing/SeatSelection.tsx`
- Modify: `app/(site)/eisitiria/thesis/page.tsx`
- Modify: `app/(site)/eisitiria/actions.ts` (`beginCheckout`)

**Interfaces:**
- Consumes: URL `?trip=<id>&route=…&date=…&pax=N[&bp=…]` (Task 7 forwards these).
- Produces: `SeatSelection` new props `requiredSeats?: number; boardingPoint?: string;` — `beginCheckout(input: { kind: TripKind; legs: {tripId, seats}[]; bp?: string })` redirects to `/eisitiria/checkout?order=…&t=…[&bp=…]`.

- [ ] **Step 1: `beginCheckout` carries the boarding point**

In `app/(site)/eisitiria/actions.ts:50-65`, change the signature and redirect:

```ts
export async function beginCheckout(input: {
  kind: TripKind;
  legs: { tripId: string; seats: string[] }[];
  bp?: string;
}): Promise<{ ok: false; error: string }> {
```

and the final redirect line:

```ts
  redirect(`/eisitiria/checkout?order=${res.order_id}&t=${res.access_token}${input.bp ? `&bp=${encodeURIComponent(input.bp)}` : ''}`);
```

- [ ] **Step 2: `SeatSelection` — required seat count + bp**

In `components/ticketing/SeatSelection.tsx`:

(a) Props (line 30):

```tsx
export function SeatSelection({
  kind,
  legs,
  backHref,
  requiredSeats,
  boardingPoint,
}: {
  kind: TripKind;
  legs: SeatLegData[];
  backHref: string;
  requiredSeats?: number;
  boardingPoint?: string;
}) {
```

(b) In `toggle` (line 41) cap at the required count:

```tsx
        return seats.length >= (requiredSeats ?? MAX_SEATS) ? seats : [...seats, seat];
```

(c) Seat counter line (lines 60-61) — show the target:

```tsx
              {selections[i].length}{requiredSeats ? ` από ${requiredSeats}` : ''} επιλεγμένες θέσεις
              {selections[i].length > 0 && `: ${[...selections[i]].sort((a, b) => Number(a) - Number(b)).join(', ')}`}
```

(d) `SeatMap` call (line 68): `maxSeats={requiredSeats ?? MAX_SEATS}`.

(e) Submit handler (lines 88-101): before the existing checks, enforce the exact count, and pass `bp`:

```tsx
          onClick={() => {
            if (selections[0].length === 0) { setError(ERROR_TEXT.no_seats); return; }
            if (requiredSeats && selections[0].length !== requiredSeats) {
              setError(`Επιλέξτε ${requiredSeats} θέσεις — έχετε επιλέξει ${selections[0].length}.`);
              return;
            }
            if (kind === 'round' && selections[0].length !== selections[1]?.length) {
              setError(ERROR_TEXT.seats_mismatch);
              return;
            }
            startTransition(async () => {
              const res = await beginCheckout({
                kind,
                legs: legs.map((leg, i) => ({ tripId: leg.tripId, seats: selections[i] })),
                bp: boardingPoint,
              });
              // beginCheckout redirects on success; a return value means failure.
              if (res && !res.ok) setError(ERROR_TEXT[res.error] ?? ERROR_TEXT.db);
            });
          }}
```

- [ ] **Step 3: `thesis/page.tsx` — new params**

Replace the `searchParams` type (line 51) with:

```tsx
  searchParams: Promise<{ trip?: string; route?: string; date?: string; bp?: string; pax?: string }>;
```

Delete the `kind` derivation (line 54) and the `kind === 'round'` return-leg block (lines 70-73), and the `kind === 'round'` clause in the guard (line 75) so it reads `if (legs.length === 0) {`. Load only the outbound leg with title `'Λεωφορείο Εκδρομής'`:

```tsx
  const legs: SeatLegData[] = [];
  const outbound = await loadLeg(params.trip, 'Λεωφορείο Εκδρομής');
  if (outbound) legs.push(outbound);
```

Replace the back-link params block (lines 86-89) with:

```tsx
  const back = new URLSearchParams();
  for (const k of ['route', 'date', 'bp', 'pax'] as const) {
    if (params[k]) back.set(k, params[k]!);
  }
```

Parse pax and render:

```tsx
  const pax = Math.min(10, Math.max(1, Number(params.pax) || 1));
```

```tsx
        <SeatSelection
          kind="oneway"
          legs={legs}
          backHref={`/eisitiria/dromologia?${back.toString()}`}
          requiredSeats={pax}
          boardingPoint={params.bp}
        />
```

Remove the now-unused `TripKind` import if nothing else in the file uses it.

- [ ] **Step 4: Verify + commit**

Run: `npm run build`.

```bash
git add components/ticketing/SeatSelection.tsx "app/(site)/eisitiria/thesis/page.tsx" "app/(site)/eisitiria/actions.ts"
git commit -m "feat(eisitiria): step 3 enforces the chosen persons count and carries the meeting point"
```

---

### Task 9: Wizard step 4 + confirmation — passenger phone, meeting point, IRIS copy

Client: «τα υπόλοιπα άτομα να έχει υποχρεωτικά ονοματεπώνυμο και τηλέφωνο», «πληρωμή κάρτας/IRIS με πλήρη στοιχεία».

**Files:**
- Modify: `components/ticketing/CheckoutForm.tsx`
- Modify: `app/(site)/eisitiria/checkout/page.tsx`
- Modify: `app/(site)/eisitiria/actions.ts` (`CheckoutInput`)
- Modify: `components/ticketing/FarePricesDialog.tsx`
- Modify: `app/(site)/eisitiria/epivevaiosi/page.tsx`

**Interfaces:**
- Consumes: `?bp=` URL param (Task 8), patched RPCs (Task 2), `OrderBundle.order.boarding_point` / `OrderTicket.passenger_phone` types (Task 3).
- Produces: `CheckoutForm` prop `boardingPoint?: string`; `CheckoutInput.billing.boarding_point?: string`; `CheckoutInput.passengers[].passenger_phone: string`.

- [ ] **Step 1: `CheckoutInput` in actions.ts**

In `app/(site)/eisitiria/actions.ts:67-82`: in `billing` add `boarding_point?: string;` after `region?: string;` — in `passengers` element type change to:

```ts
  passengers: { passenger_name: string; passenger_phone: string; fare_type_id: string; outbound_seat: string; return_seat?: string }[];
```

- [ ] **Step 2: `CheckoutForm.tsx` changes**

(a) ERROR_TEXT (line 20-29): after the `invalid_passenger_name` entry add:

```ts
  invalid_passenger_phone: 'Συμπληρώστε τηλέφωνο για κάθε επιβάτη.',
```

(b) zod passengers schema (lines 55-62): add phone:

```ts
    passengers: z
      .array(
        z.object({
          passenger_name: z.string().min(2, 'Συμπληρώστε ονοματεπώνυμο επιβάτη.'),
          passenger_phone: z.string().min(8, 'Συμπληρώστε ένα έγκυρο τηλέφωνο.'),
          fare_type_id: z.string().min(1, 'Επιλέξτε τύπο εισιτηρίου.'),
        })
      )
      .length(passengerCount),
```

(c) Component signature (line 67): add `boardingPoint`:

```tsx
export function CheckoutForm({ bundle, token, offline, boardingPoint }: { bundle: Extract<OrderBundle, { ok: true }>; token: string; offline: boolean; boardingPoint?: string }) {
```

(d) defaultValues (line 86): `passengers: outSeats.map(() => ({ passenger_name: '', passenger_phone: '', fare_type_id: defaultFare?.id ?? '' })),`

(e) submit mapping (lines 106-122): in `billing` add `boarding_point: boardingPoint,` after `region: d.region,`; in `passengers` map add `passenger_phone: p.passenger_phone,` after `passenger_name: p.passenger_name,`.

(f) Passenger row grid (line 159): change `sm:grid-cols-[110px_1fr_1fr]` → `sm:grid-cols-[90px_1fr_1fr_1fr]` and add after the name Field (lines 169-171):

```tsx
              <Field label="Τηλέφωνο επιβάτη *" error={errors.passengers?.[i]?.passenger_phone?.message}>
                <input {...register(`passengers.${i}.passenger_phone`)} type="tel" className={inputCls} />
              </Field>
```

(g) «Δρομολόγιο» section: retitle the h2 (line 187) `Δρομολόγιο` → `Εκδρομή`. After the `{legs.map(…)}` block (ends line 198) add:

```tsx
        {boardingPoint && (
          <p className="mb-2 flex flex-wrap items-center gap-x-6 gap-y-1 text-[15px] text-body">
            <span className="font-semibold uppercase text-[13px] tracking-[0.08em] text-primary">Σημείο συνάντησης:</span>
            <span>{boardingPoint}</span>
          </p>
        )}
```

(h) Totals line (line 206): change `{KIND_LABEL[kind]} · Αριθμός εισιτηρίων: {outSeats.length}` → `Εκδρομή · Αριθμός εισιτηρίων: {outSeats.length}`. Then remove `KIND_LABEL` from the `@/lib/ticketing` import (line 11) — `farePriceForKind, formatCents` stay.

(i) Gateway info copy (line 224): replace the non-offline string with:

```
'Πρόκειται να μεταβείτε στο ασφαλές περιβάλλον πληρωμών, όπου μπορείτε να πληρώσετε με κάρτα ή IRIS. Μετά την ολοκλήρωση της πληρωμής σας μην κλείσετε τον περιηγητή σας — θα επιστρέψετε αυτόματα για την έκδοση των εισιτηρίων σας.'
```

- [ ] **Step 3: `checkout/page.tsx` — pass bp through**

Line 18: `searchParams: Promise<{ order?: string; t?: string; bp?: string }>;` — line 20: `const { t, bp } = await searchParams;` — line 42: `<CheckoutForm bundle={bundle} token={t} offline={getPaymentProvider().id === 'offline'} boardingPoint={bp} />`.

- [ ] **Step 4: `FarePricesDialog.tsx` — single price column**

Remove the `Με επιστροφή` header cell (line 34) and the `price_round_cents` body cell (line 43); rename the `Απλή μετάβαση` header (line 33) to `Τιμή`.

- [ ] **Step 5: Confirmation page**

In `app/(site)/eisitiria/epivevaiosi/page.tsx`:
- Line 87: replace `{' · '}{KIND_LABEL[order.kind]}` with `{' · '}Εκδρομή`; remove `KIND_LABEL` from the import (line 5) — `ORDER_STATUS_LABEL, formatCents` stay.
- After the offline note block (lines 91-95) add:

```tsx
          {order.boarding_point && (
            <p className="mt-2 text-[14px] text-muted">
              Σημείο συνάντησης: <span className="font-semibold text-body">{order.boarding_point}</span>
            </p>
          )}
```

- [ ] **Step 6: Verify + commit**

Run: `npm run test:run && npm run build`.

```bash
git add components/ticketing/CheckoutForm.tsx components/ticketing/FarePricesDialog.tsx "app/(site)/eisitiria/checkout/page.tsx" "app/(site)/eisitiria/epivevaiosi/page.tsx" "app/(site)/eisitiria/actions.ts"
git commit -m "feat(eisitiria): checkout requires per-passenger phone, shows meeting point, card/IRIS copy"
```

---

### Task 10: Navigation renames

Client: «ΤΑ ΕΙΣΙΤΗΡΙΑ ΝΑ ΓΙΝΟΥΝ ΚΛΕΙΣΤΕ ON LINE ΘΕΣΕΙΣ».

**Files:**
- Modify: `components/layout/Navbar.tsx:15,117,173`

- [ ] **Step 1: Nav item label**

Line 15: `{ to: '/eisitiria', label: 'Εισιτήρια', icon: Ticket },` → `{ to: '/eisitiria', label: 'Κλείστε Online Θέσεις', icon: Ticket },`

- [ ] **Step 2: Repoint both CTA buttons to the wizard**

Lines 117 and 173: `<Link href="/kratisi">Κλείστε Online Θέση</Link>` → `<Link href="/eisitiria">Κλείστε Online Θέση</Link>` (two occurrences: desktop header + mobile overlay).

- [ ] **Step 3: Verify + commit**

Run: `npm run build`. Then `grep -rn '"/kratisi"' app components` — remaining hits (the `/kratisi` page itself) are fine; nav/article links must be gone.

```bash
git add components/layout/Navbar.tsx
git commit -m "feat(nav): «Εισιτήρια» → «Κλείστε Online Θέσεις», CTAs point to the booking wizard"
```

---

### Task 11: Admin — excursion fields, two default fares, passenger phone

**Files:**
- Modify: `app/admin/(dashboard)/ticketing-actions.ts` (`upsertRoute`, `manualBooking`)
- Modify: `app/admin/(dashboard)/routes/page.tsx`
- Modify: `app/admin/(dashboard)/routes/[id]/page.tsx`
- Modify: `app/admin/(dashboard)/orders/[id]/page.tsx:71`

**Interfaces:**
- Consumes: `parseBoardingPoints` (Task 3), columns from Task 1, `AdminTicket.passenger_phone` (Task 3).

- [ ] **Step 1: `upsertRoute` — title, boarding points, default fares, no auto-reverse**

Replace the whole `upsertRoute` function (`ticketing-actions.ts:51-81`) with (add `import { parseBoardingPoints } from '@/lib/excursions';` at the top of the file):

```ts
export async function upsertRoute(formData: FormData) {
  const sb = await createServerClient();
  const id = g(formData, 'id');
  const row = {
    origin_station_id: g(formData, 'origin_station_id'),
    destination_station_id: g(formData, 'destination_station_id'),
    status: g(formData, 'status') === 'draft' ? 'draft' : 'published',
    duration_min: num(formData, 'duration_min'),
    sales_cutoff_min: num(formData, 'sales_cutoff_min'),
    position: num(formData, 'position') ?? 0,
    title: g(formData, 'title') || null,
    boarding_points: parseBoardingPoints(g(formData, 'boarding_points')),
  };
  if (!row.origin_station_id || !row.destination_station_id) return;

  if (id) {
    const { error } = await sb.from('bus_routes').update(row).eq('id', id);
    if (error) console.error('upsertRoute:', error.message);
  } else {
    const { data: created, error } = await sb.from('bus_routes').insert(row).select('id').single();
    if (error) console.error('upsertRoute:', error.message);
    // every new excursion starts with the two client-mandated fare categories
    if (created) {
      const { error: e2 } = await sb.from('fare_types').insert([
        { route_id: created.id, name: 'Κανονικό', description: 'Κανονικό εισιτήριο.', price_oneway_cents: 0, price_round_cents: 0, requires_document: false, is_default: true, position: 1, is_active: true },
        { route_id: created.id, name: 'Φοιτητικό', description: 'Φοιτητές με επίδειξη ακαδημαϊκής ταυτότητας (πάσο).', price_oneway_cents: 0, price_round_cents: 0, requires_document: true, is_default: false, position: 2, is_active: true },
      ]);
      if (e2) console.error('upsertRoute fares:', e2.message);
    }
  }
  revalidateTicketing();
  redirect('/admin/routes');
}
```

- [ ] **Step 2: `manualBooking` — pass the phone through**

`ticketing-actions.ts:329`: change

```ts
    p_passengers: [{ passenger_name: name, fare_type_id: fareTypeId, outbound_seat: seat }],
```

to

```ts
    p_passengers: [{ passenger_name: name, passenger_phone: phone || '0000000000', fare_type_id: fareTypeId, outbound_seat: seat }],
```

(Without this, phone bookings would now fail the new `invalid_passenger_phone` check.)

- [ ] **Step 3: `routes/page.tsx` — title column + create-form field**

- Line 13 h1: `Γραμμές & Ναύλοι` → `Εκδρομές & Τιμές`.
- Line 14-16 helper text → `Κάθε εκδρομή έχει τίτλο, σημεία συνάντησης και δικό της τιμοκατάλογο. Πατήστε σε μια εκδρομή για τις τιμές της.`
- Route link cell (lines 28-30) — show the title first:

```tsx
            <Link href={`/admin/routes/${r.id}`} className="font-medium text-primary hover:underline">
              {r.title?.trim() || `${r.origin?.name ?? '—'} → ${r.destination?.name ?? '—'}`}
            </Link>
```

- Create form (lines 47-63): change the card h2 to `Νέα εκδρομή`, DELETE the helper line `Δημιουργείται αυτόματα και η αντίστροφη κατεύθυνση.`, change the grid to `sm:grid-cols-[1fr_1fr_1fr_6rem_6rem_auto]`, and add as FIRST field:

```tsx
          <input name="title" placeholder="Τίτλος εκδρομής (π.χ. Μονοήμερη Ναύπλιο)" className={inputCls} />
```

The two station selects stay as they are ("Από" = αφετηρία for admin bookkeeping, "Προς" = προορισμός της εκδρομής); no other change in this form.

- [ ] **Step 4: `routes/[id]/page.tsx` — title, boarding points, single price column**

(a) h1 (lines 20-22):

```tsx
      <h1 className="font-display text-4xl font-semibold text-primary">
        {route.title?.trim() || `${route.origin?.name} → ${route.destination?.name}`}
      </h1>
```

(b) Route form (lines 24-44): keep the existing grid (`sm:grid-cols-[8rem_8rem_8rem_8rem_auto]`) and INSERT, right after the three hidden inputs and before the «Κατάσταση» label, two full-width fields:

```tsx
        <label className="block text-[13px] text-muted sm:col-span-5">Τίτλος εκδρομής
          <input name="title" defaultValue={route.title ?? ''} placeholder="π.χ. Μονοήμερη Ναύπλιο" className={inputCls} />
        </label>
        <label className="block text-[13px] text-muted sm:col-span-5">Σημεία συνάντησης (ένα ανά γραμμή)
          <textarea name="boarding_points" rows={3} defaultValue={(route.boarding_points ?? []).join('\n')} className={inputCls} />
        </label>
```

(Note: `AdminRoute` extends `BusRoute`, which gained `title`/`boarding_points` in Task 3 — no query change needed since it selects `*`.)

(c) Fares header (line 47): `Ναύλοι` → `Τιμές εισιτηρίων`.

(d) Fare grid: line 9 `FARE_GRID` → `grid grid-cols-[10rem_1fr_6rem_3.5rem_3.5rem_4rem_auto] items-start gap-2`; header row (lines 55-64): delete the `<div>Με επιστρ. (€)</div>` cell and rename `Απλή (€)` → `Τιμή (€)`; fare row (lines 74-80): replace the visible `price_round` input (line 77) with a value-preserving hidden field **inside the row's form** (append next to the other hidden inputs in lines 69-73):

```tsx
                  <input type="hidden" name="price_round" value={(f.price_round_cents / 100).toFixed(2)} />
```

(e) «Νέος ναύλος» form (lines 93-103): retitle to `Νέα κατηγορία εισιτηρίου`, change grid to `sm:grid-cols-[10rem_1fr_6rem_auto]`, replace the visible `price_round` input (line 101) with `<input type="hidden" name="price_round" value="0" />`, and the `price_oneway` placeholder → `"Τιμή €"`.

- [ ] **Step 5: Order detail shows passenger phones**

`app/admin/(dashboard)/orders/[id]/page.tsx:71`: change

```tsx
              <strong>{t.passenger_name}</strong>
```

to

```tsx
              <strong>{t.passenger_name}</strong>
              {t.passenger_phone && ` · ${t.passenger_phone}`}
```

Also add under the customer block (after line 32, inside the «Πελάτης» div) the order's meeting point — requires adding `boarding_point: string | null;` to the `AdminOrder` type in `lib/queries/ticketing.ts:177-193` (after `phone`):

```tsx
          {order.boarding_point && <p className="text-[13px] text-muted">Σημείο συνάντησης: {order.boarding_point}</p>}
```

- [ ] **Step 6: Verify + commit**

Run: `npm run test:run && npm run build`.

```bash
git add app/admin lib/queries/ticketing.ts
git commit -m "feat(admin): excursion title & meeting points, two default fares, passenger phone visibility"
```

---

### Task 12: Integration verification (end-to-end)

**Files:** none (verification only)

- [ ] **Step 1: Static checks**

Run: `npm run lint && npm run test:run && npm run build` — all green.

- [ ] **Step 2: Apply migrations 0013 + 0014**

Apply to the Supabase project per `supabase/README.md` (SQL editor or CLI). Then verify in SQL editor:

```sql
select column_name from information_schema.columns
 where table_name in ('bus_routes','ticket_orders','tickets')
   and column_name in ('title','boarding_points','boarding_point','passenger_phone');
-- expect 4 rows
select name, is_active from fare_types order by route_id, position;
-- expect only Κανονικό + Φοιτητικό active per route
select * from list_route_dates() limit 5;  -- runs without error
```

If DB access is unavailable in this session, STOP and report — the user applies them.

- [ ] **Step 3: Manual wizard QA on `npm run dev`** (uses the 0012 demo seed routes; give one a title + boarding points via /admin/routes first)

1. `/eisitiria`: stepper says «Επιλέξτε εκδρομή»; form has Εκδρομή/Ημερομηνία (only scheduled dates)/Άτομα/Σημείο συνάντησης; no Από/Προς, no «Απλή Μετάβαση» tabs.
2. Step 2: single table with the excursion title, no date arrows.
3. Step 3: cannot select more seats than «Άτομα»; proceeding with fewer shows «Επιλέξτε N θέσεις…».
4. Step 4: every passenger row has name+phone+fare (Κανονικό/Φοιτητικό only); «Σημείο συνάντησης» shown; submit without a passenger phone → blocked.
5. Confirmation: boarding point + «Εκδρομή» label; tickets issued.
6. `/admin/orders/<id>`: passenger phone + meeting point visible.
7. `/nea`: upcoming-excursion articles first by date; article page: hero has photo+title only; CTA lands on `/eisitiria`.

- [ ] **Step 4: Final commit if QA produced fixes**

```bash
git add -A && git commit -m "fix(eisitiria): QA fixes for excursion booking flow"
```

---

## Client-requirement → task coverage

| Client request (docx) | Task(s) |
|---|---|
| 1. Ταξινόμηση εκδρομών βάσει ημερομηνίας | 4 |
| 2. «Εισιτήρια» → «Κλείστε Online Θέσεις» | 6, 10 |
| 3. Άρθρο: φωτογραφία + τίτλος μόνο | 5 |
| 4. Κανονικό/Φοιτητικό μόνο, διαφορετικές τιμές· μόνο ημερομηνίες εκδρομής | 1, 2, 3, 6 |
| 5. Σημείο συνάντησης, προορισμός (εκδρομή), πόσα άτομα | 1, 2, 6, 8, 9, 11 |
| 6. Κάρτα: πλήρη στοιχεία χρέωσης· λοιποί επιβάτες ον/μο + τηλέφωνο | 2, 9 (billing was already fully required) |
| 7. IRIS: υποχρεωτικά ον/μο, τηλέφωνα, mail | 9 (fields already mandatory pre-redirect; Viva Smart Checkout offers IRIS natively — requires `PAYMENT_PROVIDER=viva` env) |
| 8. Μπάρα: «Επιλέξτε εκδρομή» + βήματα 2–4 ως έχουν | 6 |
