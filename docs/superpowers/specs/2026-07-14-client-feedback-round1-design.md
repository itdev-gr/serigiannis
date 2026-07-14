# Client Feedback Round 1 — Analysis & Plan (2026-07-14)

Client feedback (verbatim, Greek) arrived as a numbered list. Items 8–9 don't exist —
confirmed the client only provided these items (numbering just jumps to 10).

**Clarifications received (2026-07-14):**
- «ΚΛΕΙΣΤΕ ONLINE ΘΕΣΗ» = booking request form (no online payment). It must capture
  the **number of people** and **live-update the total price** as the seat count
  changes (total = seats × per-person price).
- The excursion date is a structured field on ΝΕΑ articles. Single date.

## Feedback → current state → change

### 1. Menu: ΑΡΧΙΚΗ – ΕΚΔΡΟΜΕΣ – ΕΝΟΙΚΙΑΣΕΙΣ ΠΟΥΛΜΑΝ ΜΙΝΙ ΒΑΝ – ΚΡΟΥΑΖΙΕΡΕΣ – ΕΠΙΚΟΙΝΩΝΙΑ – ΝΕΑ

- **Now:** `components/layout/Navbar.tsx` `NAV_ITEMS` (lines 10–17): Αρχική, Εκδρομές,
  Κρουαζιέρες, Πούλμαν, Επικοινωνία, Νέα.
- **Change:** move Πούλμαν before Κρουαζιέρες and relabel it
  «Ενοικιάσεις Πούλμαν – Μίνι Βαν» ("ΝΙΝΙ" in the feedback is a typo for ΜΙΝΙ).
  Mirror the label in the footer ("Ενοικίαση Πούλμαν" link) and anywhere else it appears.
  Watch desktop navbar width — the new label is long; test at md/lg breakpoints.

### 2. Articles must show the excursion date (ΗΜΕΡΟΜΗΝΙΑ ΕΚΔΡΟΜΗΣ)

- **Now:** «άρθρα» = the ΝΕΑ blog posts (`posts` table). They only have
  `published_at/created_at/updated_at` — **no trip-date field** (`supabase/migrations/0005_posts.sql`).
  The old WordPress site announced excursions as blog posts, so the client will keep
  posting excursion announcements in ΝΕΑ.
- **Change (confirmed):** add nullable `trip_date date` **and** nullable
  `price numeric(10,2)` (per-person, needed for the booking total — see item 4) to
  `posts` in one migration. Add «Ημερομηνία εκδρομής» and «Τιμή ανά άτομο (€)» fields
  to `components/admin/PostForm.tsx` and `upsertPost`, display the trip date
  prominently (calendar icon + el-GR format) on `components/blog/PostCard.tsx` and the
  article page `app/(site)/nea/[slug]/page.tsx`.

### 3. Articles listed by upload date

- **Now:** `getPosts()` already orders by `published_at desc` — correct in principle.
  **But there is a bug:** `upsertPost` / `setPostStatus`
  (`app/admin/(dashboard)/actions.ts` lines ~361, ~396) overwrite `published_at` with
  "now" on **every** save, and null it when unpublishing. Editing an old article
  re-dates it to today and reshuffles the listing; migrated posts lose their original dates.
- **Change:** set `published_at` only on **first** publish (preserve existing value on
  later saves); add an editable «Ημερομηνία δημοσίευσης» field to PostForm so the
  client can back-date/correct. Ordering stays `published_at desc`.

### 4. «ΚΛΕΙΣΤΕ ONLINE ΘΕΣΗ» on the homepage and on every article

- **Now:** the only booking form is `components/trips/BookingForm.tsx`, rendered solely
  on tour detail pages; it writes a `type:'booking'` lead. Homepage and articles have
  no booking CTA; the navbar «Κλείστε Θέση» just links to `/epikoinonia`.
- **Change (confirmed):** booking stays lead-capture (no online payment), and the form
  must show a **live total price** that updates with the seat count.
  - Create a dedicated booking page **`/kratisi`** hosting a generalized booking form
    (name, τηλέφωνο required, email, ημερομηνία, **Θέσεις required**, σημειώσεις).
    It accepts `?tour=<slug>` or `?post=<slug>`; the server component loads the entity
    and passes title + per-person price (+ trip date for posts) to the form. With a
    price present, the form renders «Σύνολο: Θέσεις × τιμή = X €» live; without one,
    no total line. The total is informational (final price confirmed by the office).
  - Add «ΚΛΕΙΣΤΕ ONLINE ΘΕΣΗ» CTAs: homepage hero + a visible homepage section, every
    article page (→ `/kratisi?post=<slug>`, lead gets `subject = Κράτηση: <title>`,
    `source_path = /nea/<slug>`), and retarget the navbar CTA from `/epikoinonia`
    to `/kratisi`.
  - Tour pages keep their inline BookingForm (already the better UX there) — it gains
    the same live-total behavior using `tours.price_from`.
  - Include the computed total in the lead `notes`/message so the office sees what
    the customer saw.

### 5. Payment methods: Μετρητά – POS – IRIS – Πιστωτικές κάρτες

- **Now:** footer says «Κάρτα, IRIS, Τραπεζική Κατάθεση» (`Footer.tsx` ~103); Terms page
  says «μετρητά, κάρτα, IRIS ή τραπεζική κατάθεση» (`app/(site)/oroi/page.tsx` ~13);
  homepage copy (`components/home/content.ts` ~55) claims «Κράτηση online με κάρτα» —
  aspirational and inaccurate (no online card payment exists).
- **Change:** standardize the list to «Μετρητά, POS, IRIS, Πιστωτικές/Χρεωστικές κάρτες»
  in footer, Terms, contact page and the new `/kratisi` page (small icon strip under the
  form). Fix the misleading homepage copy.

### 6. «Στείλτε μας μήνυμα»: phone required

- **Now:** `components/contact/ContactForm.tsx` — phone optional (zod + placeholder
  «Προαιρετικό»).
- **Change:** zod `phone` min 8 required, label «Τηλέφωνο *», drop the placeholder.
  DB `leads.phone` stays nullable (other lead types are unaffected).

### 7. Phones on the header bar + 24ωρο mobile 6976811825

- **Now:** no top bar; the header shows no phone. `6976 811 825` exists only as
  `phones[2]` in settings; nothing is labeled 24ωρο. Tour pages hardcode
  `210 571 2451` instead of reading settings (`app/(site)/tour/[slug]/page.tsx` ~143).
- **Change:** new slim `TopBar` above the navbar: office phones (from
  `settings.phones`) + «24ωρο: 6976 811 825» with tel: links. Add a `phone_24h`
  settings key (Επικοινωνία tab) rather than hardcoding. The navbar is fixed and
  transparent-over-hero: render the top bar as part of the fixed header stack and let
  it collapse on scroll (navbar returns to top-0). While in there, replace the
  hardcoded tour-page phone with settings.

### 10. Online bookings must capture seats (Θέσεις)

- **Now:** BookingForm has «Άτομα» (`party`) but it's **optional**; `leads.party_size`
  exists in the DB.
- **Change:** make seats **required** (min 1) in the tour BookingForm and in the new
  `/kratisi` form, label it «Θέσεις». Verify the admin leads view displays
  `party_size` clearly.

## Implementation phases

1. **Quick wins (no schema):** nav reorder/relabel · contact-form phone required ·
   payment-methods text standardization · TopBar with phones + 24ωρο ·
   de-hardcode tour-page phone.
2. **Posts schema + admin:** `trip_date` + `price` migration · PostForm date/price
   fields · fix `published_at` overwrite bug · display trip date on cards/articles.
3. **Booking:** `/kratisi` page + generalized booking form (seats required, live
   total) · CTAs on homepage/articles/navbar · seats required + live total on tour
   BookingForm.
4. **Verify:** build + vitest · manual e2e of all three forms → `leads` rows ·
   admin leads/posts round-trip (edit an old post, confirm its date survives).

Each phase is independently shippable, in order of effort/risk.
