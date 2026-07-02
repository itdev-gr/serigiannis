# Admin redesign (sidebar) + Enquiry-based CRM

**Date:** 2026-07-02
**Status:** Approved design — ready for implementation plan (Plan 1)

## Decisions (confirmed with user)

- **Booking model:** Enquiry-based CRM. The public forms save to the database as
  *leads*; admin views Requests, Clients (grouped), and Bookings (leads marked
  "booked"). No online payment/checkout — matches how Sergiani operates.
- **Scope split:** **Plan 1 (this spec)** = sidebar admin shell + dashboard + leads
  subsystem (Αιτήματα / Πελάτες / Κρατήσεις) + Κατηγορίες CRUD. **Plan 2 (later)** =
  Πολυμέσα (multi-image galleries).
- **Notifications:** dashboard only — new requests appear in `/admin` with a "new"
  badge. No email dependency (a later add-on).

## Goal

Redesign `/admin` around a **left sidebar** and add an **enquiry CRM** so the office
can manage the whole site and everything customers send in — requests, clients, and
bookings — from one place, backed by real data.

## Current state (relevant)

- Admin today: a top-bar dashboard (`app/admin/(dashboard)/layout.tsx`), a tours list
  (`page.tsx`), tour new/edit (`TourForm`), and settings (`/admin/settings`). Auth via
  Supabase (`app_metadata.role='admin'`), guarded by middleware.
- **The contact & quote forms don't persist** — `ContactForm` and `QuoteForm` only
  `console.log` and show "sent" (`// No enquiry backend yet (deferred)`).
- Schema (`supabase/migrations/`): `categories`, `tours`, `tour_categories`,
  `tour_images`, `tour_departures`, `settings`. **No leads/clients/bookings tables.**
- Data layer pattern: `lib/queries/*` with `isDbConfigured()` seed fallback;
  `createServerClient()` (cookie/RLS) and `createPublicClient()` (anon).

## Architecture

### 1. New `leads` table (migration `0004_leads.sql`)

```sql
create type lead_type   as enum ('contact','quote','booking');
create type lead_status as enum ('new','contacted','booked','completed','cancelled');

create table public.leads (
  id uuid primary key default gen_random_uuid(),
  type lead_type not null,
  status lead_status not null default 'new',
  name text not null,
  email text,
  phone text,
  subject text,
  message text,
  tour_id uuid references public.tours(id) on delete set null,
  preferred_date date,
  party_size int,
  source_path text,
  admin_notes text,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);
create index leads_status_idx  on public.leads (status, created_at desc);
create index leads_email_idx   on public.leads (lower(email));
create index leads_tour_idx    on public.leads (tour_id);
create trigger leads_touch before update on public.leads
  for each row execute function public.touch_updated_at();
```

**RLS (`0004_leads.sql`):**
```sql
alter table public.leads enable row level security;
-- Public may submit (INSERT) a lead; the app pins status='new' server-side.
create policy leads_public_insert on public.leads for insert to anon, authenticated
  with check (true);
-- Only admins can read / update / delete.
create policy leads_admin_read   on public.leads for select to authenticated using (public.is_admin());
create policy leads_admin_update on public.leads for update to authenticated using (public.is_admin()) with check (public.is_admin());
create policy leads_admin_delete on public.leads for delete to authenticated using (public.is_admin());
```

- **Clients** are derived, not stored: `leads` grouped by `lower(email)` (fallback
  `phone`) → { name, email, phone, count, lastActivity, leads[] }.
- **Bookings** are derived: `leads where status='booked'` (+ joined tour + date).

### 2. Types & queries

- `types/db.ts`: add `Lead`, `LeadType`, `LeadStatus`, `LeadInput`, `Client`.
- `lib/queries/leads.ts`:
  - `getLeads(filter?: { type?; status? }): Promise<Lead[]>` (admin, cookie client)
  - `getLeadById(id): Promise<Lead | null>`
  - `getClients(): Promise<Client[]>` (groups getLeads())
  - `getBookings(): Promise<Lead[]>` (status='booked')
  - `getDashboardStats(): Promise<{ tours; newRequests; clients; bookings }>`
  - `createLead(input: LeadInput): Promise<{ ok: boolean }>` — used by public forms;
    forces `status='new'`, whitelists fields, ignores client-supplied status.

### 3. Admin shell (sidebar)

- `app/admin/(dashboard)/layout.tsx` → sidebar layout: `AdminSidebar` (client, active
  link highlighting, mobile drawer) + `<main>` content. Sections: Πίνακας, Εκδρομές,
  Κατηγορίες, Αιτήματα, Πελάτες, Κρατήσεις, Ρυθμίσεις (+ Πολυμέσα appears in Plan 2).
  Footer of sidebar: user email, Έξοδος, Ιστότοπος (↗).
- Auth guard unchanged (layout already redirects non-admins).

### 4. Admin pages (routes under `app/admin/(dashboard)/`)

| Route | Content |
|---|---|
| `/admin` (Πίνακας) | stat tiles (tours published, new requests, clients, bookings) + 5 latest requests |
| `/admin/tours` | existing tours list (moved from `/admin`) |
| `/admin/categories` | list + create/edit/delete (name_el, slug, sort_order) |
| `/admin/requests` | all leads table; row → detail (message, status select, notes) |
| `/admin/requests/[id]` | lead detail: status change + admin notes (server actions) |
| `/admin/clients` | grouped list; row → `/admin/clients/[email]` history |
| `/admin/bookings` | `status='booked'` leads with tour + preferred date |
| `/admin/settings` | existing settings form |

> Note: `/admin` currently renders the tours list; it becomes the dashboard, and the
> tours list moves to `/admin/tours`. Update the "Νέα Εκδρομή" links accordingly.

Server actions (`app/admin/(dashboard)/actions.ts`): `setLeadStatus`, `saveLeadNotes`,
`deleteLead`; plus category actions `upsertCategory`, `deleteCategory`.

### 5. Wire the public forms to persist

- `ContactForm` → `createLead({ type:'contact', ... , source_path })`
- `QuoteForm` → `createLead({ type:'quote', ..., preferred_date })`
- **New `BookingForm`** on `app/(site)/tour/[slug]/page.tsx` → `createLead({ type:'booking',
  tour_id, preferred_date, party_size })`. Replaces/augments the static "call us" CTA.

Forms keep client-side zod validation; on submit they call the server action and show
the existing success state. Failures show an inline error (still lets users call).

### 6. Testing

- Unit: `groupClients()` (grouping/dedup by email→phone), `getDashboardStats` shaping,
  `createLead` field-whitelisting/status-pinning (pure helpers extracted where needed).
- Build + lint green; seed fallback still works (leads simply empty without DB).
- Manual: submit each form → row appears in `/admin/requests`; change status to
  "booked" → appears in `/admin/bookings`; client grouping shows the person once.

## Verification (Plan 1)

- Sidebar renders on all `/admin/*`; active section highlighted; mobile drawer works.
- Submitting contact/quote/booking forms inserts a `leads` row (RLS: anon insert ok).
- `/admin/requests` lists them; status + notes persist; `/admin/clients` groups by
  person; `/admin/bookings` shows booked ones; `Πίνακας` counts are correct.
- `/admin/categories` creates/edits/deletes categories; changes reflect on the site.
- Non-admins still bounce to `/admin/login`. `npm run test:run`, `lint`, `build` green.

## Out of scope (Plan 1)

- **Πολυμέσα** multi-image galleries (Plan 2).
- Email/notifications on new lead; online payments/checkout; capacity/inventory on
  `tour_departures`; exporting clients.
