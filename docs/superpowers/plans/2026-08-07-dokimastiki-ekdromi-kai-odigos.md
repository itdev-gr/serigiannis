# Δοκιμαστική εκδρομή + ενημέρωση οδηγού χρήσης — Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Να υπάρχει μια πλήρως στημένη δοκιμαστική εκδρομή (σελίδα εκδρομής + εκδρομή πούλμαν με θέσεις) στη ζωντανή βάση για end-to-end testing του νέου συστήματος «στάση ανά επιβάτη», να κολλάει το πλαϊνό μενού του admin όταν κάνεις scroll, και ο οδηγός χρήσης να περιγράφει το νέο σύστημα.

**Architecture:** Τρία ανεξάρτητα κομμάτια. (1) Ένα CSS-only fix στο `AdminSidebar` (sticky σε όλα τα admin pages, όχι μόνο στον οδηγό). (2) Ένα idempotent seed migration `0028` που στήνει δύο δοκιμαστικά προϊόντα — μία σελίδα εκδρομής με τιμές/ημερομηνίες/στάσεις/φωτογραφίες, και μία εκδρομή πούλμαν με στάσεις/ναύλους/πρόγραμμα/δρομολόγια — ακολουθώντας το στυλ του υπάρχοντος `0012_demo_testing_seed.sql`. (3) Επέκταση του `data/odigos-content.ts` ώστε ο οδηγός να καλύπτει τις στάσεις ανά επιβάτη, με test που φρουρεί τη συμφωνία κειμένου-λειτουργίας.

**Tech Stack:** Next.js 16 App Router, React 19, Tailwind 3.4, Supabase (PostgreSQL + plpgsql RPCs), vitest + Testing Library.

## Global Constraints

- **Γλώσσα UI και περιεχομένου: ελληνικά.** Κάθε κείμενο που βλέπει ο χρήστης (τίτλοι, labels, οδηγός) γράφεται στα ελληνικά· τα σχόλια κώδικα ακολουθούν το ύφος του αρχείου που πειράζεις.
- **Migrations εφαρμόζονται ΧΕΙΡΟΚΙΝΗΤΑ** στο Supabase project `lucwtnzdvcpcdcmfxbqp` (SQL editor ή Management API `POST https://api.supabase.com/v1/projects/lucwtnzdvcpcdcmfxbqp/database/query`) **πριν** το `git push` — κανένα CI δεν τα τρέχει.
- **Η βάση είναι ΖΩΝΤΑΝΗ, με πραγματικές κρατήσεις πελατών.** Κάθε SQL εγγραφή πρέπει να είναι idempotent (`do $$ … end $$` με `on conflict do nothing` / `if not exists`) και να αγγίζει **μόνο** τις δοκιμαστικές εγγραφές. Καμία `update`/`delete` σε υπάρχουσες γραμμές.
- Το site είναι δημόσιο: η δοκιμαστική εκδρομή θα είναι **κανονικά δημοσιευμένη** (απόφαση χρήστη· δεν υπάρχει κρυφή-αλλά-κρατήσιμη κατάσταση — το `getTourBySlug` και το `create_tour_order` απαιτούν και τα δύο `status='published'`). Ο τίτλος πρέπει να λέει καθαρά ότι είναι δοκιμή.
- **Παραμένει μόνιμο sandbox** (απόφαση χρήστη). Το SQL καθαρισμού γράφεται στο header του migration, δεν εκτελείται.
- Ολοκλήρωση κάθε task: `npx tsc --noEmit`, `npx oxlint`, `npx vitest run` πράσινα πριν το commit.

---

## File Structure

| Αρχείο | Ευθύνη | Task |
|---|---|---|
| `components/admin/AdminSidebar.tsx` (modify, γρ. 82) | Το desktop `<aside>` γίνεται sticky σε όλο το ύψος της οθόνης | 1 |
| `supabase/migrations/0028_dokimastiki_ekdromi.sql` (create) | Idempotent seed: δοκιμαστική σελίδα εκδρομής + δοκιμαστική εκδρομή πούλμαν, με SQL καθαρισμού στο header | 2, 3 |
| `data/odigos-content.ts` (modify) | Το περιεχόμενο του οδηγού χρήσης — νέα/ενημερωμένα blocks για τις στάσεις ανά επιβάτη | 4 |
| `tests/odigos-search.test.ts` (modify) | Invariant test ότι ο οδηγός καλύπτει τις στάσεις ανά επιβάτη | 4 |

---

### Task 1: Sticky πλαϊνό μενού στο admin

Το `/admin/odigos` είναι πολύ μακρύ και το μενού φεύγει προς τα πάνω με το scroll. Το layout είναι `flex min-h-screen` (`app/admin/(dashboard)/layout.tsx`), οπότε το `<aside>` απλώς κυλάει μαζί με τη σελίδα. Το fix είναι καθολικό — ωφελεί και κάθε άλλη μακριά σελίδα (λίστα εκδρομών, παραγγελίες).

**Files:**
- Modify: `components/admin/AdminSidebar.tsx:82`

**Interfaces:**
- Consumes: τίποτα από άλλα tasks.
- Produces: τίποτα — καθαρά οπτική αλλαγή.

- [ ] **Step 1: Κάνε το desktop aside sticky**

Στο `components/admin/AdminSidebar.tsx`, γραμμή 82, αντικατέστησε:

```tsx
      <aside className="hidden w-64 shrink-0 flex-col border-r border-border bg-surface p-4 lg:flex">
```

με:

```tsx
      {/* sticky + h-screen: σε μακριές σελίδες (π.χ. Οδηγός Χρήσης) το μενού
          μένει ορατό όσο ο χρήστης κάνει scroll, και κυλάει μόνο του αν δεν
          χωράει σε χαμηλές οθόνες. */}
      <aside className="hidden w-64 shrink-0 flex-col self-start border-r border-border bg-surface p-4 lg:sticky lg:top-0 lg:flex lg:h-screen lg:overflow-y-auto">
```

Γιατί `self-start`: ο γονέας είναι `flex` με προεπιλογή `align-items: stretch`, που ακυρώνει το `position: sticky` (το στοιχείο έχει ήδη ύψος όσο ο container). Το `self-start` το επιτρέπει, και το `lg:h-screen` του δίνει ξανά πλήρες ύψος.

- [ ] **Step 2: Δες το με τα μάτια σου**

Run: `npm run dev`
Άνοιξε `http://localhost:3000/admin/odigos`, κάνε scroll ως το τέλος.
Expected: το αριστερό μενού («Πίνακας», «Πωλήσεις», …) μένει ορατό· το εσωτερικό TOC του οδηγού (που είναι ήδη `lg:sticky lg:top-6`) επίσης. Έλεγξε και μία μεσαία σελίδα (`/admin/tours`) ότι δεν χάλασε.

- [ ] **Step 3: Έλεγχοι και commit**

```bash
npx tsc --noEmit && npx oxlint && npx vitest run
git add components/admin/AdminSidebar.tsx
git commit -m "fix(admin): το πλαϊνό μενού μένει ορατό στο scroll"
```

---

### Task 2: Seed migration — δοκιμαστική σελίδα εκδρομής

Στήνει τη σελίδα εκδρομής (flow `/tour/<slug>` → `/kratisi`) με **όλα** συμπληρωμένα: 3 στάσεις (ώστε να ενεργοποιείται ο υποχρεωτικός επιλογέας ανά ταξιδιώτη), 3 κατηγορίες τιμών, 3 αναχωρήσεις (μία με `capacity = 2` για να δοκιμαστεί το «γέμισε»), 3 φωτογραφίες και κατηγορία «Μονοήμερες».

Οι φωτογραφίες μπαίνουν ως **απόλυτα URL** στο `storage_path` (σύμβαση του `data/seed/tours.ts`· το `lib/images.ts:4-11` τα χρησιμοποιεί ως έχουν και το `next.config` επιτρέπει το `picsum.photos`) — έτσι δεν χρειάζεται καμία μεταφόρτωση αρχείου στο storage.

**Files:**
- Create: `supabase/migrations/0028_dokimastiki_ekdromi.sql`

**Interfaces:**
- Consumes: υπάρχουσα κατηγορία με slug `monoimeres` (επιβεβαιωμένο στη ζωντανή βάση).
- Produces: εκδρομή με slug **`dokimastiki-ekdromi`** — το Task 5 τη χρησιμοποιεί για τα end-to-end tests, το Task 3 προσθέτει το κομμάτι πούλμαν στο **ίδιο** αρχείο.

- [ ] **Step 1: Γράψε το migration (header + τμήμα εκδρομής)**

Δημιούργησε το `supabase/migrations/0028_dokimastiki_ekdromi.sql`:

```sql
-- 0028: δοκιμαστική εκδρομή για end-to-end testing (idempotent, ΜΟΝΟ inserts).
--
-- Στήνει δύο δοκιμαστικά προϊόντα στη ζωντανή βάση, ώστε το γραφείο να δοκιμάζει
-- ολόκληρο τον κύκλο κράτησης — και ειδικά το «σημείο επιβίβασης ανά επιβάτη»
-- του 0027 — χωρίς να αγγίζει πραγματικές εκδρομές και θέσεις:
--   Α. Σελίδα εκδρομής «ΔΟΚΙΜΑΣΤΙΚΗ ΕΚΔΡΟΜΗ» (slug: dokimastiki-ekdromi)
--      → /tour/dokimastiki-ekdromi → «Κάντε Κράτηση» → /kratisi/checkout
--   Β. Εκδρομή πούλμαν «ΔΟΚΙΜΑΣΤΙΚΗ ΕΚΔΡΟΜΗ ΠΟΥΛΜΑΝ» με θέσεις
--      → /eisitiria → αναζήτηση → θέσεις → checkout
--
-- Είναι ΔΗΜΟΣΙΕΥΜΕΝΑ (δεν υπάρχει κρυφή-αλλά-κρατήσιμη κατάσταση: και το
-- getTourBySlug και το create_tour_order απαιτούν status='published'), γι' αυτό
-- ο τίτλος λέει ρητά ότι πρόκειται για δοκιμή και το sort_order=9999 τα στέλνει
-- στο τέλος του καταλόγου.
--
-- Εφαρμογή: χειροκίνητα στο project lucwtnzdvcpcdcmfxbqp (SQL editor).
-- Ξανατρέξιμο είναι ακίνδυνο — κάθε insert είναι φρουρημένο.
--
-- ΚΑΘΑΡΙΣΜΟΣ (ΜΗΝ το τρέξετε κατά λάθος — σβήνει τα δοκιμαστικά δεδομένα):
--   delete from public.tours where slug = 'dokimastiki-ekdromi';
--   delete from public.bus_routes r using public.stations s
--     where r.destination_station_id = s.id and s.slug = 'dokimastikos-proorismos';
--   delete from public.stations where slug in ('dokimastikos-proorismos');
--   -- Οι δοκιμαστικές κρατήσεις επιβιώνουν (tour_orders.tour_id → on delete set null).
--   -- Για να φύγουν κι αυτές:
--   delete from public.tour_orders where tour_title ilike 'ΔΟΚΙΜΑΣΤΙΚΗ%';

do $$
declare
  v_tour uuid;
  v_cat uuid;
  v_img uuid;
begin
  -- ============================================================ Α. ΣΕΛΙΔΑ ΕΚΔΡΟΜΗΣ
  if not exists (select 1 from public.tours where slug = 'dokimastiki-ekdromi') then
    insert into public.tours (
        slug, title, subtitle, summary, status, bookings_open, is_featured,
        price_from, price_original, duration_label, departure_note,
        meeting_point, meeting_points, sort_order, published_at)
      values (
        'dokimastiki-ekdromi',
        'ΔΟΚΙΜΑΣΤΙΚΗ ΕΚΔΡΟΜΗ — μην κάνετε κράτηση',
        'Εσωτερική δοκιμή του συστήματος κρατήσεων',
        'Η εκδρομή αυτή υπάρχει μόνο για να δοκιμάζει το γραφείο τη διαδικασία κράτησης από άκρη σε άκρη. Δεν πραγματοποιείται ποτέ — αν φτάσατε εδώ κατά λάθος, δείτε τις πραγματικές μας εκδρομές στον κατάλογο.',
        'published', true, false,
        45.00, 55.00, 'Μονοήμερη', 'Δοκιμαστική αναχώρηση — δεν εκτελείται.',
        'Δείτε τα διαθέσιμα σημεία επιβίβασης κατά την κράτηση.',
        array[
          '07:00 — Sergiani Travel, Παύλου Μελά 45 (Μετρό Αγ. Αντωνίου)',
          '07:20 — Ομόνοια, Hondos Center',
          '07:40 — Ελευσίνα, Practiker'
        ],
        9999, now())
      returning id into v_tour;

    -- Κατηγορία «Μονοήμερες» ώστε να δοκιμάζεται και η σελίδα κατηγορίας.
    select id into v_cat from public.categories where slug = 'monoimeres';
    if v_cat is not null then
      insert into public.tour_categories (tour_id, category_id, is_primary)
        values (v_tour, v_cat, true) on conflict do nothing;
    end if;

    -- Φωτογραφίες: απόλυτα URL (σύμβαση data/seed/tours.ts) — καμία μεταφόρτωση.
    insert into public.tour_images (tour_id, storage_path, alt_el, width, height, position) values
      (v_tour, 'https://picsum.photos/seed/dokimastiki-1/1600/1067', 'Δοκιμαστική φωτογραφία 1', 1600, 1067, 0),
      (v_tour, 'https://picsum.photos/seed/dokimastiki-2/1600/1067', 'Δοκιμαστική φωτογραφία 2', 1600, 1067, 1),
      (v_tour, 'https://picsum.photos/seed/dokimastiki-3/1600/1067', 'Δοκιμαστική φωτογραφία 3', 1600, 1067, 2);
    select id into v_img from public.tour_images
      where tour_id = v_tour order by position limit 1;
    update public.tours set cover_image_id = v_img where id = v_tour;

    -- Κατηγορίες τιμών (σε λεπτά — προσοχή, διαφορετική μονάδα από το price_from).
    insert into public.tour_price_tiers (tour_id, label, price_cents, price_original_cents, max_qty, position) values
      (v_tour, 'Το άτομο σε δίκλινο', 4500, 5500, 6, 0),
      (v_tour, 'Παιδί έως 12 ετών',   2500, null, 4, 1),
      (v_tour, 'Μονόκλινο',           6000, null, 2, 2);

    -- Αναχωρήσεις: σχετικές με το current_date ώστε να μη «λήξουν» ποτέ.
    -- Η δεύτερη έχει capacity 2 για να δοκιμάζεται το «δεν υπάρχουν θέσεις».
    insert into public.tour_departures (tour_id, starts_on, note, capacity, is_active) values
      (v_tour, current_date + 14, 'Δοκιμαστική αναχώρηση Α (χωρίς όριο)', null, true),
      (v_tour, current_date + 21, 'Δοκιμαστική αναχώρηση Β (μόνο 2 θέσεις)', 2, true),
      (v_tour, current_date + 28, 'Δοκιμαστική αναχώρηση Γ', 20, true);
  end if;
end $$;
```

- [ ] **Step 2: Εφάρμοσε το migration στη ζωντανή βάση**

Άνοιξε το SQL editor του Supabase (project `lucwtnzdvcpcdcmfxbqp`), επικόλλησε ΟΛΟ το αρχείο και τρέξ' το.
Expected: `Success. No rows returned.`

- [ ] **Step 3: Επιβεβαίωσε τα δεδομένα με SQL**

Τρέξε στο ίδιο editor:

```sql
select t.slug, t.status, t.bookings_open, array_length(t.meeting_points,1) as stops,
       (select count(*) from public.tour_price_tiers p where p.tour_id=t.id and p.is_active) as tiers,
       (select count(*) from public.tour_departures d where d.tour_id=t.id and d.is_active and d.starts_on >= current_date) as future_deps,
       (select count(*) from public.tour_images i where i.tour_id=t.id) as imgs,
       t.cover_image_id is not null as has_cover
from public.tours t where t.slug = 'dokimastiki-ekdromi';
```
Expected: μία γραμμή — `published`, `bookings_open=true`, `stops=3`, `tiers=3`, `future_deps=3`, `imgs=3`, `has_cover=true`.

- [ ] **Step 4: Επιβεβαίωσε στο site**

Άνοιξε `https://serigiannis.vercel.app/tour/dokimastiki-ekdromi` (ή τοπικά `npm run dev`).
Expected: φορτώνει η σελίδα, φαίνονται φωτογραφίες, και δεξιά το widget «Κάντε Κράτηση» με επιλογέα ημερομηνίας (3 επιλογές) και τις 3 κατηγορίες τιμών.
Αν δείξει 404 στο production: η σελίδα είναι ISR με `revalidate = 3600` και `dynamicParams` προεπιλεγμένα `true`, οπότε ένα νέο slug σερβίρεται στο πρώτο request — κάνε ανανέωση μία φορά.

- [ ] **Step 5: Commit**

```bash
git add supabase/migrations/0028_dokimastiki_ekdromi.sql
git commit -m "chore(seed): δοκιμαστική σελίδα εκδρομής για end-to-end testing"
```

---

### Task 3: Seed migration — δοκιμαστική εκδρομή πούλμαν (θέσεις)

Το δεύτερο flow (`/eisitiria`) χρειάζεται δική του δοκιμαστική διαδρομή, αλλιώς τα tests θα έπιαναν θέσεις σε πραγματικά δρομολόγια πελατών. Ακολουθεί ακριβώς το στυλ του `0012_demo_testing_seed.sql`: σταθμοί με `on conflict (slug) do nothing`, ναύλοι, εβδομαδιαίο πρόγραμμα, και υλοποίηση δρομολογίων με `materialize_trips`.

Χρησιμοποιεί τον υπάρχοντα σταθμό-αφετηρία `sergiani-afetiria` και τη διάταξη `Mini Bus 20 θέσεων` (μικρή κάτοψη → εύκολο να δοκιμαστεί και το «γέμισε το λεωφορείο»).

**Files:**
- Modify: `supabase/migrations/0028_dokimastiki_ekdromi.sql` (προσθήκη δεύτερου `do $$ … end $$` block στο τέλος)

**Interfaces:**
- Consumes: σταθμός `sergiani-afetiria`, διάταξη `Mini Bus 20 θέσεων`, συνάρτηση `public.materialize_trips(uuid, date, date)` — και τα τρία επιβεβαιωμένα στη ζωντανή βάση.
- Produces: διαδρομή με τίτλο **«ΔΟΚΙΜΑΣΤΙΚΗ ΕΚΔΡΟΜΗ ΠΟΥΛΜΑΝ — μην κάνετε κράτηση»** και σταθμό προορισμού `dokimastikos-proorismos`· το Task 5 τη χρησιμοποιεί.

- [ ] **Step 1: Πρόσθεσε το τμήμα Β στο ίδιο αρχείο**

Στο τέλος του `supabase/migrations/0028_dokimastiki_ekdromi.sql` πρόσθεσε:

```sql
do $$
declare
  v_from uuid;
  v_to uuid;
  v_layout uuid;
  v_route uuid;
begin
  -- ============================================================ Β. ΕΚΔΡΟΜΗ ΠΟΥΛΜΑΝ
  select id into v_from from public.stations where slug = 'sergiani-afetiria';
  insert into public.stations (slug, name, code, position)
    values ('dokimastikos-proorismos', 'ΔΟΚΙΜΑΣΤΙΚΟΣ ΠΡΟΟΡΙΣΜΟΣ', 'ΔΟΚ', 99)
    on conflict (slug) do nothing;
  select id into v_to from public.stations where slug = 'dokimastikos-proorismos';
  select id into v_layout from public.bus_layouts where name = 'Mini Bus 20 θέσεων';

  if v_from is not null and v_layout is not null
     and not exists (select 1 from public.bus_routes where destination_station_id = v_to) then
    insert into public.bus_routes (
        origin_station_id, destination_station_id, title, status,
        duration_min, boarding_points, position)
      values (
        v_from, v_to,
        'ΔΟΚΙΜΑΣΤΙΚΗ ΕΚΔΡΟΜΗ ΠΟΥΛΜΑΝ — μην κάνετε κράτηση',
        'published', 120,
        array[
          '07:00 — Sergiani Travel, Παύλου Μελά 45 (Μετρό Αγ. Αντωνίου)',
          '07:20 — Ομόνοια, Hondos Center',
          '07:40 — Ελευσίνα, Practiker'
        ],
        99)
      returning id into v_route;

    insert into public.fare_types (route_id, name, description, price_oneway_cents, price_round_cents, requires_document, is_default, position) values
      (v_route, 'Κανονικό', 'Δοκιμαστικός ναύλος ενηλίκων.', 1500, 2500, false, true, 0),
      (v_route, 'Παιδικό (έως 12)', 'Δοκιμαστικός παιδικός ναύλος.', 800, 1400, false, false, 1);

    insert into public.schedule_patterns (route_id, layout_id, departure_time, weekdays, valid_from, notes)
      values (v_route, v_layout, '09:00', array[0,1,2,3,4,5,6]::smallint[], current_date, 'Δοκιμαστικό πρόγραμμα — καθημερινά');

    perform public.materialize_trips(v_route, current_date, current_date + 14);
  end if;
end $$;
```

- [ ] **Step 2: Εφάρμοσε ΜΟΝΟ το νέο block στη βάση**

Στο SQL editor τρέξε το δεύτερο `do $$ … end $$` block (το πρώτο έχει ήδη τρέξει· ξανατρέξιμό του είναι ακίνδυνο αλλά περιττό).
Expected: `Success. No rows returned.`

- [ ] **Step 3: Επιβεβαίωσε με SQL**

```sql
select r.title, r.status, array_length(r.boarding_points,1) as stops,
       (select count(*) from public.fare_types f where f.route_id=r.id and f.is_active) as fares,
       (select count(*) from public.trips t where t.route_id=r.id and t.service_date >= current_date) as future_trips
from public.bus_routes r
join public.stations s on s.id = r.destination_station_id
where s.slug = 'dokimastikos-proorismos';
```
Expected: μία γραμμή — `published`, `stops=3`, `fares=2`, `future_trips` ≥ 14.

- [ ] **Step 4: Επιβεβαίωσε στο site**

Άνοιξε `/eisitiria`: στον επιλογέα «Εκδρομή» πρέπει να υπάρχει η «ΔΟΚΙΜΑΣΤΙΚΗ ΕΚΔΡΟΜΗ ΠΟΥΛΜΑΝ». Διάλεξε ημερομηνία και προχώρα ως την κάτοψη θέσεων.
Expected: εμφανίζεται το Mini Bus 20 θέσεων με ελεύθερες θέσεις.

- [ ] **Step 5: Commit**

```bash
git add supabase/migrations/0028_dokimastiki_ekdromi.sql
git commit -m "chore(seed): δοκιμαστική εκδρομή πούλμαν με θέσεις και στάσεις"
```

---

### Task 4: Ενημέρωση οδηγού χρήσης για τις στάσεις ανά επιβάτη

Ο οδηγός (`/admin/odigos`) περιγράφει ακόμη τη λογική «ένα σημείο συνάντησης ανά κράτηση». Πέντε ενότητες χρειάζονται ενημέρωση, και προστίθεται μία γραμμή στο FAQ.

**Files:**
- Modify: `data/odigos-content.ts` (ενότητες `ekdromes-kyklos`, `dromologio-theseis`, `kratiseis-ekdromon`, `selides-ekdromon`, `ti-vlepei-o-pelatis`, `faq`)
- Test: `tests/odigos-search.test.ts`

**Interfaces:**
- Consumes: τη συμπεριφορά που υλοποιήθηκε στο migration 0027 και στις φόρμες checkout.
- Produces: τίποτα για επόμενα tasks.

- [ ] **Step 1: Γράψε πρώτα το test που αποτυγχάνει**

Στο `tests/odigos-search.test.ts`, μέσα στο `describe('odigos content', …)`, πρόσθεσε:

```ts
  it('ο οδηγός εξηγεί τη στάση ανά επιβάτη', () => {
    const texts: string[] = [];
    for (const s of ODIGOS_SECTIONS) {
      for (const b of s.blocks) {
        if (b.kind === 'p' || b.kind === 'tip' || b.kind === 'warning') texts.push(b.text);
        else if (b.kind === 'steps') texts.push(...b.items);
        else if (b.kind === 'table') texts.push(...b.head, ...b.rows.flat());
      }
    }
    const all = texts.join(' ');
    expect(all).toMatch(/σημείο επιβίβασης/i);
    expect(all).toMatch(/κάθε επιβάτη|ανά επιβάτη|κάθε ταξιδιώτη/i);
  });
```

- [ ] **Step 2: Τρέξε το test για να δεις ότι αποτυγχάνει**

Run: `npx vitest run tests/odigos-search.test.ts`
Expected: FAIL στο δεύτερο `expect` (ο οδηγός λέει «σημείο συνάντησης», όχι «ανά επιβάτη»).

- [ ] **Step 3: Ενημέρωσε την ενότητα «Εκδρομές & Πρόγραμμα»**

Στο `data/odigos-content.ts`, ενότητα `ekdromes-kyklos`: στο `keywords` array πρόσθεσε `'σημεία επιβίβασης'`, `'στάσεις'`. Αντικατέστησε το βήμα «TAB ΣΤΟΙΧΕΙΑ» με:

```ts
          'TAB ΣΤΟΙΧΕΙΑ: Συμπληρώστε τα «Σημεία συνάντησης» — μία στάση σε κάθε γραμμή (π.χ. «07:20 — Ομόνοια, Hondos Center»). Αυτές είναι οι στάσεις που θα διαλέξει ο πελάτης: ΚΑΘΕ επιβάτης της κράτησης δηλώνει τη δική του, υποχρεωτικά, πριν πληρώσει. Συμπληρώστε επίσης τη διάρκεια, και αφήστε «Πρόχειρη» μέχρι να ολοκληρώσετε το στήσιμο. Πατήστε «Αποθήκευση».',
```

και πρόσθεσε μετά το `tip` της γραμμής «Η σελίδα κρατήσεων του site ανανεώνεται αυτόματα…»:

```ts
      { kind: 'warning', text: 'Γράψτε στις στάσεις ΜΟΝΟ σημεία επιβίβασης — όχι το πρόγραμμα της εκδρομής. Ό,τι γράψετε εκεί εμφανίζεται αυτούσιο στη λίστα που διαλέγει ο πελάτης. Το σύστημα κρατά έως 20 στάσεις και κόβει κάθε γραμμή στους 120 χαρακτήρες.' },
```

- [ ] **Step 4: Ενημέρωσε την ενότητα «Σελίδα δρομολογίου»**

Στην ενότητα `dromologio-theseis`, αντικατέστησε το βήμα «ΤΗΛΕΦΩΝΙΚΗ ΚΡΑΤΗΣΗ» με:

```ts
        'ΤΗΛΕΦΩΝΙΚΗ ΚΡΑΤΗΣΗ: Στη «Χειροκίνητη κράτηση (τηλεφωνική)» γράψτε τον αριθμό θέσης, διαλέξτε ναύλο, συμπληρώστε ονοματεπώνυμο και τηλέφωνο του επιβάτη, και —αν η εκδρομή έχει στάσεις— διαλέξτε «Σημείο επιβίβασης». Πατήστε «Κράτηση θέσης». Δημιουργείται κανονική κράτηση με κωδικό, σε κατάσταση «Πληρωμή στο γραφείο».',
```

και πρόσθεσε μετά το υπάρχον `tip` για το τηλέφωνο:

```ts
      { kind: 'tip', text: 'Το «Σημείο επιβίβασης» είναι προαιρετικό στην τηλεφωνική κράτηση — αν ο πελάτης δεν το έχει αποφασίσει, αφήστε «Χωρίς σημείο» και συμπληρώστε το αργότερα τηλεφωνικά. Στις online κρατήσεις είναι υποχρεωτικό για κάθε επιβάτη.' },
```

- [ ] **Step 5: Ενημέρωσε την ενότητα «Κρατήσεις Εκδρομών»**

Στην ενότητα `kratiseis-ekdromon`: στο `keywords` πρόσθεσε `'σημείο επιβίβασης'`, `'στάσεις'`. Πρόσθεσε νέο βήμα στη λίστα `steps`, αμέσως μετά το βήμα «ΗΜΕΡΟΜΗΝΙΕΣ»:

```ts
          'ΣΗΜΕΙΑ ΕΠΙΒΙΒΑΣΗΣ: Στη φόρμα της εκδρομής (πεδίο «Σημεία συνάντησης», ένα ανά γραμμή) γράψτε από πού μαζεύετε κόσμο. Όταν υπάρχει έστω μία στάση, κάθε ταξιδιώτης της κράτησης ΠΡΕΠΕΙ να διαλέξει τη δική του πριν την πληρωμή — δεν ολοκληρώνεται η κράτηση αλλιώς. Αν αφήσετε το πεδίο κενό, η κράτηση γίνεται χωρίς στάση και το γραφείο τη ζητά τηλεφωνικά.',
```

Πρόσθεσε επίσης, πριν το `link` block:

```ts
      { kind: 'tip', text: 'Στην καρτέλα της κράτησης («Κρατήσεις Εκδρομών» → άνοιγμα) βλέπετε τη στάση κάτω από το όνομα κάθε ταξιδιώτη. Όταν όλοι διάλεξαν την ίδια, εμφανίζεται και συγκεντρωτικά στο πάνω μέρος· όταν διαφέρουν, μόνο ανά άτομο. Τα ίδια στοιχεία φεύγουν και στο email του γραφείου.' },
```

- [ ] **Step 6: Ενημέρωσε τις ενότητες «Σελίδες Εκδρομών» και «Τι βλέπει ο πελάτης»**

Στην ενότητα `selides-ekdromon`, πρόσθεσε μετά το βήμα «ΔΗΜΟΣΙΕΥΣΗ» ένα νέο βήμα:

```ts
          'ΕΛΕΓΧΟΣ ΕΤΟΙΜΟΤΗΤΑΣ: Στο πάνω μέρος της επεξεργασίας υπάρχει η λίστα «Τι χρειάζεται η εκδρομή». Αν δείτε «Προσοχή» στα «Σημεία επιβίβασης», η εκδρομή είναι δημοσιευμένη και δέχεται κρατήσεις χωρίς να έχετε ορίσει στάσεις — οι πελάτες θα κρατούν χωρίς να δηλώνουν από πού θα επιβιβαστούν.',
```

Στην ενότητα `ti-vlepei-o-pelatis`, αντικατέστησε την πρώτη παράγραφο με:

```ts
      { kind: 'p', text: 'Ο επισκέπτης κλείνει θέσεις από τη σελίδα «Κλείστε Online Θέσεις» σε 4 βήματα: (1) διαλέγει εκδρομή, ημερομηνία και άτομα (το σημείο επιβίβασης εδώ είναι προαιρετικό — λειτουργεί ως προεπιλογή), (2) διαλέγει ώρα δρομολογίου, (3) διαλέγει θέσεις πάνω στην κάτοψη του λεωφορείου, (4) συμπληρώνει στοιχεία, δηλώνει σημείο επιβίβασης ΓΙΑ ΚΑΘΕ επιβάτη και ολοκληρώνει. Οι θέσεις του δεσμεύονται για {hold_minutes} λεπτά όσο συμπληρώνει τη φόρμα.' },
```

και πρόσθεσε μία γραμμή στον πίνακα «Ο πελάτης λέει…» της ίδιας ενότητας:

```ts
          ['«Είμαστε 3 άτομα και ανεβαίνουμε από διαφορετικές στάσεις»', 'Γίνεται κανονικά: στο τελευταίο βήμα κάθε επιβάτης έχει δικό του «Σημείο επιβίβασης». Η επιλογή του πρώτου συμπληρώνεται αυτόματα στους υπόλοιπους, αλλά αλλάζει ελεύθερα ανά άτομο.'],
```

- [ ] **Step 7: Πρόσθεσε γραμμή στο FAQ**

Στην ενότητα `faq`, μέσα στο `rows` array του πίνακα, πρόσθεσε:

```ts
          ['Ο πελάτης λέει ότι δεν τον αφήνει να πληρώσει', 'Πιθανότατα δεν έχει διαλέξει σημείο επιβίβασης για κάποιον επιβάτη — το πεδίο είναι υποχρεωτικό για κάθε άτομο όταν η εκδρομή έχει στάσεις. Ζητήστε του να ελέγξει όλες τις καρτέλες επιβατών στο τελευταίο βήμα.'],
```

- [ ] **Step 8: Τρέξε τα tests**

Run: `npx vitest run tests/odigos-search.test.ts`
Expected: PASS (και τα δύο νέα `expect`, καθώς και τα υπάρχοντα invariants για placeholders και μοναδικά ids).

- [ ] **Step 9: Δες τον οδηγό και κάνε commit**

Run: `npm run dev` → `http://localhost:3000/admin/odigos`, αναζήτησε «επιβίβασης».
Expected: βρίσκει τις ενημερωμένες ενότητες με υπογραμμισμένους (highlighted) τους όρους.

```bash
npx tsc --noEmit && npx oxlint && npx vitest run
git add data/odigos-content.ts tests/odigos-search.test.ts
git commit -m "docs(odigos): οδηγίες για το σημείο επιβίβασης ανά επιβάτη"
```

---

### Task 5: End-to-end επαλήθευση και παράδοση

Το «να δεις ότι όλα δουλεύουν» πριν κλείσει η δουλειά. Εκτελείται πάνω στα δοκιμαστικά δεδομένα των Tasks 2-3.

**Files:** κανένα (μόνο εκτέλεση και αναφορά)

**Interfaces:**
- Consumes: `dokimastiki-ekdromi` (Task 2), τη δοκιμαστική διαδρομή πούλμαν (Task 3), το sticky μενού (Task 1), τον ενημερωμένο οδηγό (Task 4).

- [ ] **Step 1: Κράτηση εκδρομής με 2 άτομα και διαφορετικές στάσεις**

Στο `/tour/dokimastiki-ekdromi` διάλεξε «Δοκιμαστική αναχώρηση Α», 2 άτομα «Το άτομο σε δίκλινο», πάτα «Κάντε Κράτηση».
Στο checkout, συμπλήρωσε στοιχεία και **άφησε κενή τη στάση του 2ου ταξιδιώτη** → πάτα υποβολή.
Expected: κόκκινο μήνυμα «Επιλέξτε σημείο επιβίβασης.» κάτω από το select του 2ου· δεν προχωρά.
Μετά διάλεξε **διαφορετική** στάση για κάθε ταξιδιώτη και ολοκλήρωσε.
Expected: σελίδα επιβεβαίωσης· κάτω από κάθε ταξιδιώτη φαίνεται η δική του στάση, και ΔΕΝ εμφανίζεται συγκεντρωτική γραμμή «Σημείο επιβίβασης» (γιατί διαφέρουν).

- [ ] **Step 2: Έλεγχος στο admin και στη βάση**

Άνοιξε `/admin/bookings` → τη νέα κράτηση.
Expected: κάτω από κάθε όνομα ταξιδιώτη φαίνεται η στάση του.

Στο SQL editor:
```sql
select public_code, meeting_point, jsonb_pretty(passengers)
from public.tour_orders where tour_title ilike 'ΔΟΚΙΜΑΣΤΙΚΗ%'
order by created_at desc limit 1;
```
Expected: `meeting_point` = `null` (μικτές στάσεις) και κάθε στοιχείο του `passengers` έχει `name`, `phone`, `meeting_point`.

- [ ] **Step 3: Έλεγχος ότι ο server μπλοκάρει και χωρίς τη φόρμα**

Στο SQL editor, δοκίμασε μια κράτηση με άκυρη στάση απευθείας στο RPC:
```sql
select public.finalize_tour_order(
  (select id from public.tour_orders where tour_title ilike 'ΔΟΚΙΜΑΣΤΙΚΗ%' order by created_at desc limit 1),
  (select access_token from public.tour_orders where tour_title ilike 'ΔΟΚΙΜΑΣΤΙΚΗ%' order by created_at desc limit 1),
  '{"customer_name":"Δοκιμή Δοκιμή","email":"test@example.com","phone":"6900000000","accept_terms":true,"passengers":[{"name":"Α Α","meeting_point":"ΑΝΥΠΑΡΚΤΗ ΣΤΑΣΗ"}]}'::jsonb,
  'offline');
```
Expected: επιστρέφει `{"ok": false, "error": "invalid_meeting_point"}` ή `{"ok": true, "already_paid": true}` αν η κράτηση έχει ήδη πληρωθεί — και στις δύο περιπτώσεις **δεν** αποθηκεύεται άκυρη στάση.

- [ ] **Step 4: Κράτηση εισιτηρίων με 2 επιβάτες**

Στο `/eisitiria` διάλεξε τη «ΔΟΚΙΜΑΣΤΙΚΗ ΕΚΔΡΟΜΗ ΠΟΥΛΜΑΝ», ημερομηνία, 2 άτομα, **χωρίς** να διαλέξεις σημείο στο πρώτο βήμα.
Expected: σε αφήνει να προχωρήσεις (έγινε προαιρετικό).
Διάλεξε 2 θέσεις, και στο checkout δώσε διαφορετική στάση σε κάθε επιβάτη, ολοκλήρωσε.
Expected: στη σελίδα εισιτηρίων κάθε εισιτήριο αναχώρησης δείχνει «Επιβίβαση: …» με τη δική του στάση· το εισιτήριο επιστροφής (αν διάλεξες με επιστροφή) δεν δείχνει στάση.

- [ ] **Step 5: Τηλεφωνική κράτηση από το admin**

Άνοιξε ένα δρομολόγιο της δοκιμαστικής διαδρομής από `/admin/trips/...` και κάνε χειροκίνητη κράτηση **χωρίς** να διαλέξεις σημείο επιβίβασης.
Expected: η κράτηση δημιουργείται κανονικά (το σημείο είναι προαιρετικό για το γραφείο). Επανάλαβε με σημείο και δες ότι εμφανίζεται στην καρτέλα της παραγγελίας.

- [ ] **Step 6: Έλεγχοι κώδικα, push και αναφορά**

```bash
npx tsc --noEmit && npx oxlint && npx vitest run && npm run build
git push
```

Ενημέρωσε τον χρήστη με: τους δύο συνδέσμους δοκιμής (`/tour/dokimastiki-ekdromi` και `/eisitiria`), τι επιβεβαιώθηκε σε κάθε βήμα, και ότι το SQL καθαρισμού βρίσκεται στο header του `0028_dokimastiki_ekdromi.sql` για όποτε θελήσουν να σβήσουν το sandbox.

---

## Self-Review

**Spec coverage:**
- «Δοκιμαστική εκδρομή με τα πάντα μέσα» → Tasks 2 (σελίδα εκδρομής: στάσεις, τιμές, ημερομηνίες, φωτογραφίες, κατηγορία) και 3 (πούλμαν: στάσεις, ναύλοι, πρόγραμμα, δρομολόγια, θέσεις).
- «Να δεις ότι όλα δουλεύουν» → Task 5, με συγκεκριμένα βήματα και αναμενόμενα αποτελέσματα, συμπεριλαμβανομένου του server-side ελέγχου.
- «Update τον οδηγό χρήσης» → Task 4, με test που κρατά τον οδηγό συγχρονισμένο.
- «Το side menu να είναι visible όταν κάνεις scroll στο /admin/odigos» → Task 1 (καθολικό fix, όχι μόνο για τον οδηγό).

**Placeholders:** κανένα — κάθε βήμα έχει το πραγματικό SQL/TSX/εντολή.

**Type consistency:** τα SQL ονόματα στηλών επαληθεύτηκαν στη ζωντανή βάση (`tours`, `tour_price_tiers`, `tour_departures`, `tour_images`, `tour_categories`, `bus_routes`, `fare_types`, `schedule_patterns`, `stations`)· `materialize_trips(uuid, date, date)` υπάρχει· τα slugs `monoimeres`, `sergiani-afetiria` και η διάταξη `Mini Bus 20 θέσεων` υπάρχουν. Τα ονόματα ενοτήτων του οδηγού (`ekdromes-kyklos`, `dromologio-theseis`, `kratiseis-ekdromon`, `selides-ekdromon`, `ti-vlepei-o-pelatis`, `faq`) ταιριάζουν με το `data/odigos-content.ts`.
