# Admin Sidebar + Enquiry CRM — Plan 1 Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Redesign `/admin` around a left sidebar and add an enquiry-based CRM — the contact/quote/booking forms persist as `leads`, and admins manage Requests, Clients, Bookings, and Categories.

**Architecture:** One new `leads` table (RLS: anon INSERT, admin SELECT/UPDATE/DELETE). Public forms call a `createLead` server action. Read queries live in `lib/queries/leads.ts` (with a pure, unit-tested `groupClients`). The admin dashboard layout becomes a sidebar shell; `/admin` becomes the overview (Πίνακας) and the tours list moves to `/admin/tours`. New admin pages (requests, clients, bookings, categories) use Server Components + server actions, following the existing `TourForm`/`SettingsForm`/`actions.ts` patterns.

**Tech Stack:** Next.js 16 App Router, React 19 Server Components, Supabase (`@supabase/ssr`, RLS via `is_admin()`), Tailwind, vitest + @testing-library.

## Global Constraints

- **Language:** all UI copy in Greek.
- **No new dependencies.** Reuse `Button`, `Badge`, `cn`, existing admin patterns.
- **Data access only via `lib/queries/*` and server actions.** Never call Supabase from components directly. Admin reads use `createServerClient()` (cookie, RLS). Public `createLead` also uses `createServerClient()` (anon visitor → RLS `anon insert`).
- **RLS is the security boundary.** `createLead` server-side forces `status='new'` and whitelists fields — never trust client-supplied `status`/`admin_notes`.
- **Seed-safe:** every leads query must return `[]`/zeros when `!isDbConfigured()` or on error (like existing queries) so the app never crashes pre-migration.
- **Design tokens only** (`primary`, `cta`, `gold`, `olive`, `muted`, `border`, `surface`, `background`, `deep-ink`; `font-display`/`font-sans`). Match `TourForm` input styles.
- **Tests** in `tests/*.test.ts(x)`, run `npm run test:run`; alias `@`→root.
- **Commit** after each task.
- Reference spec: `docs/superpowers/specs/2026-07-02-admin-crm-design.md`.

## File Structure

```
supabase/migrations/0004_leads.sql          # CREATE — leads table + enums + RLS
types/db.ts                                  # MODIFY — Lead/LeadType/LeadStatus/LeadInput/Client
lib/queries/leads.ts                         # CREATE — groupClients (pure) + getLeads/getClients/getBookings/getLeadById/getDashboardStats
app/(site)/actions.ts                        # CREATE — 'use server' createLead (public form submit)
components/contact/ContactForm.tsx           # MODIFY — submit -> createLead
components/rentals/QuoteForm.tsx              # MODIFY — submit -> createLead
components/trips/BookingForm.tsx              # CREATE — 'book this tour' form
app/(site)/tour/[slug]/page.tsx              # MODIFY — render BookingForm
components/admin/AdminSidebar.tsx             # CREATE — sidebar nav (client)
app/admin/(dashboard)/layout.tsx             # MODIFY — sidebar shell
app/admin/(dashboard)/page.tsx               # MODIFY — becomes Πίνακας (overview)
app/admin/(dashboard)/tours/page.tsx         # CREATE — tours list (moved from page.tsx)
app/admin/(dashboard)/requests/page.tsx      # CREATE — Αιτήματα list
app/admin/(dashboard)/requests/[id]/page.tsx # CREATE — lead detail
app/admin/(dashboard)/clients/page.tsx       # CREATE — Πελάτες grouped
app/admin/(dashboard)/bookings/page.tsx      # CREATE — Κρατήσεις
app/admin/(dashboard)/categories/page.tsx    # CREATE — Κατηγορίες list + form
app/admin/(dashboard)/actions.ts             # MODIFY — setLeadStatus/saveLeadNotes/deleteLead/upsertCategory/deleteCategory
components/admin/StatusBadge.tsx             # CREATE — lead status/type badges
tests/leads.test.ts                          # CREATE — groupClients unit tests
```

---

## Task 1: `leads` table migration + apply

**Files:**
- Create: `supabase/migrations/0004_leads.sql`

- [ ] **Step 1: Write `supabase/migrations/0004_leads.sql`**

```sql
-- Sergiani Travel — enquiry leads (contact / quote / booking requests).
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
create index leads_status_idx on public.leads (status, created_at desc);
create index leads_email_idx  on public.leads (lower(email));
create index leads_tour_idx   on public.leads (tour_id);

create trigger leads_touch before update on public.leads
  for each row execute function public.touch_updated_at();

alter table public.leads enable row level security;
-- Public may submit a lead; the app pins status='new' server-side.
create policy leads_public_insert on public.leads for insert to anon, authenticated
  with check (true);
create policy leads_admin_read   on public.leads for select to authenticated using (public.is_admin());
create policy leads_admin_update on public.leads for update to authenticated using (public.is_admin()) with check (public.is_admin());
create policy leads_admin_delete on public.leads for delete to authenticated using (public.is_admin());
```

- [ ] **Step 2: Apply the migration to Supabase.**
Open Supabase Studio → SQL Editor → paste the file contents → Run. (Or, if the Supabase CLI is linked to this project: `supabase db push`.) Confirm the `leads` table exists under Table Editor.

- [ ] **Step 3: Verify RLS shape** — in SQL editor run `select * from public.leads;` as the service role (should return 0 rows, no error).

- [ ] **Step 4: Commit**

```bash
git add supabase/migrations/0004_leads.sql
git commit -m "feat(db): leads table (enquiry CRM) + RLS"
```

---

## Task 2: Types + `groupClients` (TDD) + read queries

**Files:**
- Modify: `types/db.ts`
- Create: `lib/queries/leads.ts`
- Test: `tests/leads.test.ts`

**Interfaces:**
- Produces: `Lead`, `LeadType`, `LeadStatus`, `LeadInput`, `Client` (types); `groupClients(leads: Lead[]): Client[]`; `getLeads(filter?: { type?: LeadType; status?: LeadStatus }): Promise<Lead[]>`; `getLeadById(id: string): Promise<Lead | null>`; `getClients(): Promise<Client[]>`; `getBookings(): Promise<Lead[]>`; `getDashboardStats(): Promise<{ tours: number; newRequests: number; clients: number; bookings: number }>`.

- [ ] **Step 1: Add types to `types/db.ts`** (append):

```ts
export type LeadType = 'contact' | 'quote' | 'booking';
export type LeadStatus = 'new' | 'contacted' | 'booked' | 'completed' | 'cancelled';

export type Lead = {
  id: string;
  type: LeadType;
  status: LeadStatus;
  name: string;
  email: string | null;
  phone: string | null;
  subject: string | null;
  message: string | null;
  tour_id: string | null;
  preferred_date: string | null;
  party_size: number | null;
  source_path: string | null;
  admin_notes: string | null;
  created_at: string;
  updated_at: string;
  tour_title?: string | null; // joined
};

export type LeadInput = {
  type: LeadType;
  name: string;
  email?: string | null;
  phone?: string | null;
  subject?: string | null;
  message?: string | null;
  tour_id?: string | null;
  preferred_date?: string | null;
  party_size?: number | null;
  source_path?: string | null;
};

export type Client = {
  key: string;
  name: string;
  email: string | null;
  phone: string | null;
  count: number;
  lastActivity: string;
  leads: Lead[];
};
```

- [ ] **Step 2: Write the failing test** `tests/leads.test.ts`:

```ts
import { describe, it, expect } from 'vitest';
import { groupClients } from '@/lib/queries/leads';
import type { Lead } from '@/types/db';

const lead = (o: Partial<Lead>): Lead => ({
  id: 'x', type: 'contact', status: 'new', name: 'Α', email: null, phone: null,
  subject: null, message: null, tour_id: null, preferred_date: null, party_size: null,
  source_path: null, admin_notes: null, created_at: '2026-01-01T00:00:00Z',
  updated_at: '2026-01-01T00:00:00Z', ...o,
});

describe('groupClients', () => {
  it('groups leads by lowercased email', () => {
    const clients = groupClients([
      lead({ id: '1', name: 'Μαρία', email: 'Maria@example.com', created_at: '2026-01-01T00:00:00Z' }),
      lead({ id: '2', name: 'Μαρία Κ', email: 'maria@example.com', created_at: '2026-02-01T00:00:00Z' }),
    ]);
    expect(clients).toHaveLength(1);
    expect(clients[0].count).toBe(2);
    expect(clients[0].email).toBe('maria@example.com');
  });

  it('falls back to phone when no email', () => {
    const clients = groupClients([
      lead({ id: '1', email: null, phone: '210 111' }),
      lead({ id: '2', email: null, phone: '210 111' }),
    ]);
    expect(clients).toHaveLength(1);
    expect(clients[0].count).toBe(2);
  });

  it('sorts clients by most recent activity first', () => {
    const clients = groupClients([
      lead({ id: 'old', email: 'a@a.gr', created_at: '2026-01-01T00:00:00Z' }),
      lead({ id: 'new', email: 'b@b.gr', created_at: '2026-05-01T00:00:00Z' }),
    ]);
    expect(clients[0].email).toBe('b@b.gr');
  });

  it('ignores leads with neither email nor phone', () => {
    expect(groupClients([lead({ email: null, phone: null })])).toHaveLength(0);
  });
});
```

- [ ] **Step 3: Run it, verify it fails**

Run: `npm run test:run -- leads`
Expected: FAIL ("Cannot find module '@/lib/queries/leads'").

- [ ] **Step 4: Create `lib/queries/leads.ts`**

```ts
import { isDbConfigured, createServerClient } from '@/lib/supabase/server';
import type { Client, Lead, LeadStatus, LeadType } from '@/types/db';

const SELECT = '*, tour:tours(title)';

type RawLead = Omit<Lead, 'tour_title'> & { tour?: { title: string } | null };

function normalize(row: RawLead): Lead {
  const { tour, ...rest } = row;
  return { ...(rest as Omit<Lead, 'tour_title'>), tour_title: tour?.title ?? null };
}

/** Group leads into clients by lowercased email, falling back to phone. Pure. */
export function groupClients(leads: Lead[]): Client[] {
  const map = new Map<string, Client>();
  for (const l of leads) {
    const key = (l.email && l.email.trim().toLowerCase()) || (l.phone && l.phone.replace(/\s+/g, '')) || '';
    if (!key) continue;
    const existing = map.get(key);
    if (existing) {
      existing.count += 1;
      existing.leads.push(l);
      if (l.created_at > existing.lastActivity) existing.lastActivity = l.created_at;
    } else {
      map.set(key, {
        key, name: l.name, email: l.email, phone: l.phone,
        count: 1, lastActivity: l.created_at, leads: [l],
      });
    }
  }
  return [...map.values()].sort((a, b) => (a.lastActivity < b.lastActivity ? 1 : -1));
}

export async function getLeads(filter?: { type?: LeadType; status?: LeadStatus }): Promise<Lead[]> {
  if (!isDbConfigured()) return [];
  const sb = await createServerClient();
  let q = sb.from('leads').select(SELECT).order('created_at', { ascending: false });
  if (filter?.type) q = q.eq('type', filter.type);
  if (filter?.status) q = q.eq('status', filter.status);
  const { data, error } = await q;
  if (error) { console.error('getLeads:', error.message); return []; }
  return ((data ?? []) as RawLead[]).map(normalize);
}

export async function getLeadById(id: string): Promise<Lead | null> {
  if (!isDbConfigured()) return null;
  const sb = await createServerClient();
  const { data, error } = await sb.from('leads').select(SELECT).eq('id', id).maybeSingle();
  if (error) { console.error('getLeadById:', error.message); return null; }
  return data ? normalize(data as RawLead) : null;
}

export async function getClients(): Promise<Client[]> {
  return groupClients(await getLeads());
}

export async function getBookings(): Promise<Lead[]> {
  return getLeads({ status: 'booked' });
}

export async function getDashboardStats(): Promise<{ tours: number; newRequests: number; clients: number; bookings: number }> {
  if (!isDbConfigured()) return { tours: 0, newRequests: 0, clients: 0, bookings: 0 };
  const sb = await createServerClient();
  const [tours, leads] = await Promise.all([
    sb.from('tours').select('id', { count: 'exact', head: true }).eq('status', 'published'),
    getLeads(),
  ]);
  return {
    tours: tours.count ?? 0,
    newRequests: leads.filter((l) => l.status === 'new').length,
    clients: groupClients(leads).length,
    bookings: leads.filter((l) => l.status === 'booked').length,
  };
}
```

- [ ] **Step 5: Run it, verify it passes**

Run: `npm run test:run -- leads`
Expected: PASS (4 tests).

- [ ] **Step 6: Commit**

```bash
git add types/db.ts lib/queries/leads.ts tests/leads.test.ts
git commit -m "feat(crm): lead types + leads queries + groupClients"
```

---

## Task 3: `createLead` server action + wire ContactForm

**Files:**
- Create: `app/(site)/actions.ts`
- Modify: `components/contact/ContactForm.tsx`

**Interfaces:**
- Consumes: `LeadInput`.
- Produces: `createLead(input: LeadInput): Promise<{ ok: boolean; error?: string }>`.

- [ ] **Step 1: Create `app/(site)/actions.ts`**

```ts
'use server';
import { createServerClient } from '@/lib/supabase/server';
import type { LeadInput } from '@/types/db';

/** Persist a public enquiry. Status is pinned to 'new'; only whitelisted fields are stored. */
export async function createLead(input: LeadInput): Promise<{ ok: boolean; error?: string }> {
  const name = (input.name ?? '').trim();
  if (!name || !['contact', 'quote', 'booking'].includes(input.type)) {
    return { ok: false, error: 'invalid' };
  }
  const row = {
    type: input.type,
    status: 'new' as const,
    name,
    email: input.email?.trim() || null,
    phone: input.phone?.trim() || null,
    subject: input.subject?.trim() || null,
    message: input.message?.trim() || null,
    tour_id: input.tour_id ?? null,
    preferred_date: input.preferred_date || null,
    party_size: input.party_size ?? null,
    source_path: input.source_path?.slice(0, 200) || null,
  };
  const sb = await createServerClient();
  const { error } = await sb.from('leads').insert(row);
  if (error) { console.error('createLead:', error.message); return { ok: false, error: 'db' }; }
  return { ok: true };
}
```

- [ ] **Step 2: Wire `ContactForm`.** Change the `onSubmit` in `components/contact/ContactForm.tsx`. Replace:

```tsx
  // No enquiry backend yet (deferred); simulate success.
  const onSubmit = (data: ContactInput) => { console.log('contact submit:', data); setSent(true); };
```
with:
```tsx
  const [error, setError] = useState<string | null>(null);
  const onSubmit = async (data: ContactInput) => {
    setError(null);
    const res = await createLead({
      type: 'contact',
      name: data.name,
      email: data.email,
      phone: data.phone,
      subject: data.subject,
      message: data.message,
      source_path: '/epikoinonia',
    });
    if (res.ok) setSent(true);
    else setError('Κάτι πήγε στραβά. Δοκιμάστε ξανά ή καλέστε μας.');
  };
```
Add the import at the top: `import { createLead } from '@/app/(site)/actions';`
Render `{error && <p className="text-[14px] text-cta">{error}</p>}` above the submit button.

- [ ] **Step 3: Verify build + submit.**

Run: `npm run build` (Expected: success). Then `npm run dev` (PORT=3200), open `/epikoinonia`, submit the form, and confirm a row appears in Supabase Studio → `leads` (type `contact`, status `new`).

- [ ] **Step 4: Commit**

```bash
git add app/\(site\)/actions.ts components/contact/ContactForm.tsx
git commit -m "feat(crm): persist contact form as a lead"
```

---

## Task 4: Wire QuoteForm

**Files:**
- Modify: `components/rentals/QuoteForm.tsx`

- [ ] **Step 1: Wire `QuoteForm`.** Replace:

```tsx
  // No enquiry backend yet (deferred); simulate success.
  const onSubmit = (data: QuoteInput) => { console.log('quote request:', data); setSent(true); };
```
with:
```tsx
  const [error, setError] = useState<string | null>(null);
  const onSubmit = async (data: QuoteInput) => {
    setError(null);
    const res = await createLead({
      type: 'quote',
      name: data.name,
      phone: data.phone,
      preferred_date: data.date,
      message: data.notes,
      subject: 'Αίτημα προσφοράς πούλμαν',
      source_path: '/enoikiaseis-poylman',
    });
    if (res.ok) setSent(true);
    else setError('Κάτι πήγε στραβά. Δοκιμάστε ξανά ή καλέστε μας.');
  };
```
Add import: `import { createLead } from '@/app/(site)/actions';`
Render `{error && <p className="text-[14px] text-cta">{error}</p>}` before the submit button.

- [ ] **Step 2: Verify** — `npm run build` (success), submit the πούλμαν quote form, confirm a `quote` lead row.

- [ ] **Step 3: Commit**

```bash
git add components/rentals/QuoteForm.tsx
git commit -m "feat(crm): persist quote form as a lead"
```

---

## Task 5: BookingForm on tour pages

**Files:**
- Create: `components/trips/BookingForm.tsx`
- Modify: `app/(site)/tour/[slug]/page.tsx`

**Interfaces:**
- Consumes: `createLead`. Produces: `BookingForm({ tourId, tourTitle }: { tourId: string; tourTitle: string })`.

- [ ] **Step 1: Create `components/trips/BookingForm.tsx`**

```tsx
'use client';
import { useState, type ReactNode } from 'react';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { z } from 'zod';
import { Button } from '@/components/ui/Button';
import { createLead } from '@/app/(site)/actions';

const Schema = z.object({
  name: z.string().min(2, 'Συμπληρώστε το όνομά σας.'),
  phone: z.string().min(8, 'Συμπληρώστε ένα έγκυρο τηλέφωνο.'),
  email: z.string().email('Μη έγκυρο email.').optional().or(z.literal('')),
  date: z.string().optional(),
  party: z.string().optional(),
  notes: z.string().optional(),
});
type Input = z.infer<typeof Schema>;

const inputCls = 'w-full rounded-md border border-border bg-surface px-4 py-2.5 font-sans text-[15px] text-body transition focus:border-primary focus:outline-none focus:ring-4 focus:ring-primary/10';

function Field({ label, error, children }: { label: string; error?: string; children: ReactNode }) {
  return (
    <label className="block">
      <span className="mb-1.5 block font-sans text-[13px] font-medium uppercase tracking-[0.1em] text-primary">{label}</span>
      {children}
      {error && <span className="mt-1 block text-[13px] text-cta">{error}</span>}
    </label>
  );
}

export function BookingForm({ tourId, tourTitle }: { tourId: string; tourTitle: string }) {
  const [sent, setSent] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const { register, handleSubmit, formState: { errors, isSubmitting } } = useForm<Input>({ resolver: zodResolver(Schema) });

  if (sent) {
    return (
      <div className="rounded-lg border border-olive/30 bg-olive/10 p-6 text-center">
        <h3 className="font-display text-2xl font-semibold text-primary">Το αίτημά σας παρελήφθη</h3>
        <p className="mt-2 text-muted">Θα επικοινωνήσουμε μαζί σας για τη διαθεσιμότητα.</p>
      </div>
    );
  }
  return (
    <form
      className="grid gap-4 rounded-lg border border-border bg-surface p-6 shadow-card"
      onSubmit={handleSubmit(async (d) => {
        setError(null);
        const res = await createLead({
          type: 'booking', tour_id: tourId, name: d.name, phone: d.phone,
          email: d.email || null, preferred_date: d.date || null,
          party_size: d.party ? Number(d.party) : null,
          subject: `Κράτηση: ${tourTitle}`, message: d.notes, source_path: `/tour`,
        });
        if (res.ok) setSent(true); else setError('Κάτι πήγε στραβά. Δοκιμάστε ξανά ή καλέστε μας.');
      })}
    >
      <h3 className="font-display text-2xl font-semibold text-primary">Κράτηση / Ενδιαφέρον</h3>
      <Field label="Ονοματεπώνυμο *" error={errors.name?.message}><input {...register('name')} className={inputCls} /></Field>
      <div className="grid gap-4 sm:grid-cols-2">
        <Field label="Τηλέφωνο *" error={errors.phone?.message}><input {...register('phone')} className={inputCls} /></Field>
        <Field label="Email" error={errors.email?.message}><input {...register('email')} className={inputCls} /></Field>
      </div>
      <div className="grid gap-4 sm:grid-cols-2">
        <Field label="Ημερομηνία"><input type="date" {...register('date')} className={inputCls} /></Field>
        <Field label="Άτομα"><input type="number" min={1} {...register('party')} className={inputCls} /></Field>
      </div>
      <Field label="Σημειώσεις"><textarea rows={3} {...register('notes')} className={inputCls} /></Field>
      {error && <p className="text-[14px] text-cta">{error}</p>}
      <Button type="submit" disabled={isSubmitting}>{isSubmitting ? 'Αποστολή…' : 'Στείλτε αίτημα κράτησης'}</Button>
    </form>
  );
}
```

- [ ] **Step 2: Render it on the tour page.** In `app/(site)/tour/[slug]/page.tsx`, add `import { BookingForm } from '@/components/trips/BookingForm';` and place `<BookingForm tourId={tour.id} tourTitle={tour.title} />` in the sidebar/aside column of the detail layout (next to the price/CTA block).

- [ ] **Step 3: Verify** — `npm run build` (success); open a tour page, submit the booking form, confirm a `booking` lead with the correct `tour_id`.

- [ ] **Step 4: Commit**

```bash
git add components/trips/BookingForm.tsx "app/(site)/tour/[slug]/page.tsx"
git commit -m "feat(crm): booking enquiry form on tour pages"
```

---

## Task 6: Status/type badges + admin sidebar shell

**Files:**
- Create: `components/admin/StatusBadge.tsx`
- Create: `components/admin/AdminSidebar.tsx`
- Modify: `app/admin/(dashboard)/layout.tsx`

**Interfaces:**
- Produces: `StatusBadge({ status }: { status: LeadStatus })`, `TypeBadge({ type }: { type: LeadType })`, `AdminSidebar({ email }: { email?: string })`.

- [ ] **Step 1: Create `components/admin/StatusBadge.tsx`**

```tsx
import type { LeadStatus, LeadType } from '@/types/db';

const STATUS: Record<LeadStatus, { label: string; cls: string }> = {
  new:       { label: 'Νέο',            cls: 'bg-cta/15 text-cta' },
  contacted: { label: 'Επικοινωνία',    cls: 'bg-sea/15 text-primary' },
  booked:    { label: 'Κράτηση',        cls: 'bg-olive/15 text-olive' },
  completed: { label: 'Ολοκληρώθηκε',   cls: 'bg-muted/15 text-muted' },
  cancelled: { label: 'Ακυρώθηκε',      cls: 'bg-amber/15 text-[#a15c00]' },
};
const TYPE: Record<LeadType, string> = { contact: 'Επικοινωνία', quote: 'Προσφορά', booking: 'Κράτηση' };

export function StatusBadge({ status }: { status: LeadStatus }) {
  const s = STATUS[status];
  return <span className={`inline-flex rounded-full px-2.5 py-1 font-sans text-[11px] font-semibold uppercase tracking-[0.08em] ${s.cls}`}>{s.label}</span>;
}
export function TypeBadge({ type }: { type: LeadType }) {
  return <span className="inline-flex rounded-full bg-primary/10 px-2.5 py-1 font-sans text-[11px] font-semibold uppercase tracking-[0.08em] text-primary">{TYPE[type]}</span>;
}
```

- [ ] **Step 2: Create `components/admin/AdminSidebar.tsx`**

```tsx
'use client';
import { useState } from 'react';
import Link from 'next/link';
import { usePathname } from 'next/navigation';
import { LayoutDashboard, MapPin, Tags, Inbox, Users, CalendarCheck, Settings, LogOut, ExternalLink, Menu, X } from 'lucide-react';
import { cn } from '@/lib/utils';
import { signOut } from '@/app/admin/(dashboard)/actions';

const NAV = [
  { to: '/admin', label: 'Πίνακας', icon: LayoutDashboard, exact: true },
  { to: '/admin/tours', label: 'Εκδρομές', icon: MapPin },
  { to: '/admin/categories', label: 'Κατηγορίες', icon: Tags },
  { to: '/admin/requests', label: 'Αιτήματα', icon: Inbox },
  { to: '/admin/clients', label: 'Πελάτες', icon: Users },
  { to: '/admin/bookings', label: 'Κρατήσεις', icon: CalendarCheck },
  { to: '/admin/settings', label: 'Ρυθμίσεις', icon: Settings },
];

function isActive(pathname: string, to: string, exact?: boolean) {
  return exact ? pathname === to : pathname === to || pathname.startsWith(to + '/');
}

export function AdminSidebar({ email }: { email?: string }) {
  const pathname = usePathname();
  const [open, setOpen] = useState(false);
  const links = (
    <nav className="flex flex-col gap-1">
      {NAV.map(({ to, label, icon: Icon, exact }) => {
        const active = isActive(pathname, to, exact);
        return (
          <Link key={to} href={to} onClick={() => setOpen(false)}
            className={cn('flex items-center gap-3 rounded-md px-3 py-2.5 font-sans text-[14px] transition-colors',
              active ? 'bg-primary text-surface' : 'text-body hover:bg-primary/5')}>
            <Icon className="h-4.5 w-4.5 shrink-0" strokeWidth={1.75} /> {label}
          </Link>
        );
      })}
    </nav>
  );
  return (
    <>
      {/* Mobile top bar */}
      <div className="flex items-center justify-between border-b border-border bg-surface px-4 py-3 lg:hidden">
        <Link href="/admin" className="font-display text-lg font-semibold text-primary">Sergiani <span className="text-[11px] uppercase tracking-[0.2em] text-muted">Διαχείριση</span></Link>
        <button type="button" onClick={() => setOpen(true)} aria-label="Μενού" className="grid h-10 w-10 place-items-center rounded-md text-primary hover:bg-primary/10"><Menu className="h-5 w-5" /></button>
      </div>
      {/* Desktop sidebar */}
      <aside className="hidden w-64 shrink-0 flex-col border-r border-border bg-surface p-4 lg:flex">
        <Link href="/admin" className="mb-6 px-3 font-display text-xl font-semibold text-primary">Sergiani <span className="block text-[11px] uppercase tracking-[0.2em] text-muted">Διαχείριση</span></Link>
        {links}
        <div className="mt-auto border-t border-border pt-4">
          {email && <div className="mb-2 truncate px-3 text-[12px] text-muted">{email}</div>}
          <Link href="/" target="_blank" className="flex items-center gap-3 rounded-md px-3 py-2 text-[13px] text-muted hover:bg-primary/5"><ExternalLink className="h-4 w-4" /> Ιστότοπος</Link>
          <form action={signOut}><button type="submit" className="flex w-full items-center gap-3 rounded-md px-3 py-2 text-[13px] text-muted hover:bg-cta/10 hover:text-cta"><LogOut className="h-4 w-4" /> Έξοδος</button></form>
        </div>
      </aside>
      {/* Mobile drawer */}
      <div className={cn('fixed inset-0 z-50 lg:hidden', open ? 'pointer-events-auto' : 'pointer-events-none')}>
        <div className={cn('absolute inset-0 bg-deep-ink/40 transition-opacity', open ? 'opacity-100' : 'opacity-0')} onClick={() => setOpen(false)} />
        <div className={cn('absolute left-0 top-0 h-full w-72 bg-surface p-4 shadow-xl transition-transform', open ? 'translate-x-0' : '-translate-x-full')}>
          <div className="mb-6 flex items-center justify-between">
            <span className="font-display text-lg font-semibold text-primary">Διαχείριση</span>
            <button type="button" onClick={() => setOpen(false)} aria-label="Κλείσιμο" className="grid h-10 w-10 place-items-center rounded-md text-primary hover:bg-primary/10"><X className="h-5 w-5" /></button>
          </div>
          {links}
          <form action={signOut} className="mt-4 border-t border-border pt-4"><button type="submit" className="flex w-full items-center gap-3 rounded-md px-3 py-2 text-[13px] text-muted hover:text-cta"><LogOut className="h-4 w-4" /> Έξοδος</button></form>
        </div>
      </div>
    </>
  );
}
```

- [ ] **Step 3: Rewrite `app/admin/(dashboard)/layout.tsx`** to the shell:

```tsx
import { redirect } from 'next/navigation';
import { createServerClient } from '@/lib/supabase/server';
import { AdminSidebar } from '@/components/admin/AdminSidebar';

export default async function DashboardLayout({ children }: { children: React.ReactNode }) {
  const sb = await createServerClient();
  const { data: { user } } = await sb.auth.getUser();
  const isAdmin = (user?.app_metadata as { role?: string } | undefined)?.role === 'admin';
  if (!isAdmin) redirect('/admin/login');

  return (
    <div className="flex min-h-screen flex-col bg-background lg:flex-row">
      <AdminSidebar email={user?.email} />
      <main className="min-w-0 flex-1 px-5 py-8 md:px-10">{children}</main>
    </div>
  );
}
```

- [ ] **Step 4: Verify** — `npm run build` (success). (`/admin` still renders the old tours list until Task 7; the sidebar should now appear.)

- [ ] **Step 5: Commit**

```bash
git add components/admin/StatusBadge.tsx components/admin/AdminSidebar.tsx "app/admin/(dashboard)/layout.tsx"
git commit -m "feat(admin): sidebar shell + status/type badges"
```

---

## Task 7: Move tours list to `/admin/tours`; `/admin` becomes Πίνακας

**Files:**
- Create: `app/admin/(dashboard)/tours/page.tsx` (moved content)
- Modify: `app/admin/(dashboard)/page.tsx` (becomes dashboard)

**Interfaces:**
- Consumes: `getDashboardStats`, `getLeads`, `StatusBadge`, `TypeBadge`.

- [ ] **Step 1: Move the current tours list.** Copy the **entire current** `app/admin/(dashboard)/page.tsx` into `app/admin/(dashboard)/tours/page.tsx` unchanged **except** rename the default export to `AdminToursPage` (it likely already is). This preserves the existing tours table + row actions.

- [ ] **Step 2: Replace `app/admin/(dashboard)/page.tsx`** with the dashboard:

```tsx
import Link from 'next/link';
import { getDashboardStats, getLeads } from '@/lib/queries/leads';
import { StatusBadge, TypeBadge } from '@/components/admin/StatusBadge';

const TILES = [
  { key: 'tours', label: 'Δημοσιευμένες εκδρομές', href: '/admin/tours' },
  { key: 'newRequests', label: 'Νέα αιτήματα', href: '/admin/requests' },
  { key: 'clients', label: 'Πελάτες', href: '/admin/clients' },
  { key: 'bookings', label: 'Κρατήσεις', href: '/admin/bookings' },
] as const;

export default async function DashboardPage() {
  const [stats, leads] = await Promise.all([getDashboardStats(), getLeads()]);
  const latest = leads.slice(0, 5);
  return (
    <div>
      <h1 className="font-display text-4xl font-semibold text-primary">Πίνακας</h1>
      <div className="mt-8 grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
        {TILES.map((t) => (
          <Link key={t.key} href={t.href} className="rounded-lg border border-border bg-surface p-6 shadow-card transition hover:shadow-card-hover">
            <div className="font-display text-4xl font-bold text-primary tabular">{stats[t.key]}</div>
            <div className="mt-1 font-sans text-[13px] uppercase tracking-[0.1em] text-muted">{t.label}</div>
          </Link>
        ))}
      </div>
      <div className="mt-10">
        <div className="mb-4 flex items-center justify-between">
          <h2 className="font-display text-2xl font-semibold text-primary">Τελευταία αιτήματα</h2>
          <Link href="/admin/requests" className="font-sans text-[13px] font-semibold uppercase tracking-[0.1em] text-cta hover:underline">Όλα</Link>
        </div>
        {latest.length === 0 ? (
          <p className="text-muted">Δεν υπάρχουν αιτήματα ακόμη.</p>
        ) : (
          <div className="overflow-hidden rounded-lg border border-border bg-surface">
            <table className="w-full text-left text-[14px]">
              <tbody>
                {latest.map((l) => (
                  <tr key={l.id} className="border-b border-border/60 last:border-0">
                    <td className="px-5 py-3"><Link href={`/admin/requests/${l.id}`} className="font-medium text-primary hover:text-cta">{l.name}</Link></td>
                    <td className="px-5 py-3"><TypeBadge type={l.type} /></td>
                    <td className="px-5 py-3 text-muted">{l.tour_title ?? l.subject ?? '—'}</td>
                    <td className="px-5 py-3"><StatusBadge status={l.status} /></td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>
    </div>
  );
}
```

- [ ] **Step 3: Fix the "Νέα Εκδρομή" affordance.** In `app/admin/(dashboard)/tours/page.tsx`, ensure a "Νέα Εκδρομή" link to `/admin/tours/new` exists at the top (the old sidebar/topbar link was removed with the layout). Add if missing:

```tsx
<Link href="/admin/tours/new" className="inline-flex items-center gap-1.5 rounded-full bg-cta px-4 py-2 font-sans text-[13px] font-semibold text-surface hover:bg-cta-hover">+ Νέα Εκδρομή</Link>
```

- [ ] **Step 4: Verify** — `npm run build`; `/admin` shows the dashboard tiles + latest requests; `/admin/tours` shows the tours list; `/admin/tours/new` and edit still work.

- [ ] **Step 5: Commit**

```bash
git add "app/admin/(dashboard)/page.tsx" "app/admin/(dashboard)/tours/page.tsx"
git commit -m "feat(admin): dashboard overview at /admin; tours list -> /admin/tours"
```

---

## Task 8: Requests — list + detail + status/notes actions

**Files:**
- Modify: `app/admin/(dashboard)/actions.ts` (add `setLeadStatus`, `saveLeadNotes`, `deleteLead`)
- Create: `app/admin/(dashboard)/requests/page.tsx`
- Create: `app/admin/(dashboard)/requests/[id]/page.tsx`

**Interfaces:**
- Consumes: `getLeads`, `getLeadById`, `StatusBadge`, `TypeBadge`.
- Produces: `setLeadStatus(id: string, status: LeadStatus)`, `saveLeadNotes(id: string, notes: string)`, `deleteLead(id: string)`.

- [ ] **Step 1: Add lead actions to `app/admin/(dashboard)/actions.ts`** (append; keep the existing `'use server'` header and `revalidatePublic`):

```ts
export async function setLeadStatus(id: string, status: string) {
  const sb = await createServerClient();
  await sb.from('leads').update({ status }).eq('id', id);
  revalidatePath('/admin');
  revalidatePath('/admin/requests');
  revalidatePath('/admin/bookings');
  revalidatePath(`/admin/requests/${id}`);
}

export async function saveLeadNotes(id: string, notes: string) {
  const sb = await createServerClient();
  await sb.from('leads').update({ admin_notes: notes }).eq('id', id);
  revalidatePath(`/admin/requests/${id}`);
}

export async function deleteLead(id: string) {
  const sb = await createServerClient();
  await sb.from('leads').delete().eq('id', id);
  revalidatePath('/admin/requests');
  redirect('/admin/requests');
}
```

- [ ] **Step 2: Create `app/admin/(dashboard)/requests/page.tsx`**

```tsx
import Link from 'next/link';
import { getLeads } from '@/lib/queries/leads';
import { StatusBadge, TypeBadge } from '@/components/admin/StatusBadge';

export default async function RequestsPage() {
  const leads = await getLeads();
  return (
    <div>
      <h1 className="font-display text-4xl font-semibold text-primary">Αιτήματα</h1>
      <p className="mt-1 text-muted">{leads.length} συνολικά</p>
      <div className="mt-8 overflow-hidden rounded-lg border border-border bg-surface">
        <table className="w-full text-left text-[14px]">
          <thead className="border-b border-border bg-background/50 font-sans text-[12px] uppercase tracking-[0.1em] text-muted">
            <tr><th className="px-5 py-3">Όνομα</th><th className="px-5 py-3">Τύπος</th><th className="px-5 py-3">Θέμα / Εκδρομή</th><th className="px-5 py-3">Επικοινωνία</th><th className="px-5 py-3">Κατάσταση</th></tr>
          </thead>
          <tbody>
            {leads.length === 0 && <tr><td colSpan={5} className="px-5 py-8 text-center text-muted">Δεν υπάρχουν αιτήματα ακόμη.</td></tr>}
            {leads.map((l) => (
              <tr key={l.id} className="border-b border-border/60 last:border-0 hover:bg-background/40">
                <td className="px-5 py-3"><Link href={`/admin/requests/${l.id}`} className="font-medium text-primary hover:text-cta">{l.name}</Link></td>
                <td className="px-5 py-3"><TypeBadge type={l.type} /></td>
                <td className="px-5 py-3 text-muted">{l.tour_title ?? l.subject ?? '—'}</td>
                <td className="px-5 py-3 text-muted">{l.phone ?? l.email ?? '—'}</td>
                <td className="px-5 py-3"><StatusBadge status={l.status} /></td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  );
}
```

- [ ] **Step 3: Create `app/admin/(dashboard)/requests/[id]/page.tsx`**

```tsx
import Link from 'next/link';
import { notFound } from 'next/navigation';
import { getLeadById } from '@/lib/queries/leads';
import { StatusBadge, TypeBadge } from '@/components/admin/StatusBadge';
import { setLeadStatus, saveLeadNotes, deleteLead } from '../../actions';
import { Button } from '@/components/ui/Button';
import { ConfirmForm } from '@/components/admin/ConfirmForm';

const STATUSES = ['new', 'contacted', 'booked', 'completed', 'cancelled'] as const;
const STATUS_LABEL: Record<string, string> = { new: 'Νέο', contacted: 'Επικοινωνία', booked: 'Κράτηση', completed: 'Ολοκληρώθηκε', cancelled: 'Ακυρώθηκε' };

export default async function LeadDetailPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const lead = await getLeadById(id);
  if (!lead) notFound();

  return (
    <div className="max-w-2xl">
      <Link href="/admin/requests" className="text-[13px] text-muted hover:text-primary">← Αιτήματα</Link>
      <div className="mt-3 flex items-center gap-3">
        <h1 className="font-display text-3xl font-semibold text-primary">{lead.name}</h1>
        <TypeBadge type={lead.type} /> <StatusBadge status={lead.status} />
      </div>

      <dl className="mt-6 grid grid-cols-3 gap-y-3 rounded-lg border border-border bg-surface p-6 text-[15px]">
        {lead.phone && (<><dt className="text-muted">Τηλέφωνο</dt><dd className="col-span-2"><a href={`tel:${lead.phone.replace(/\s+/g,'')}`} className="text-primary hover:text-cta">{lead.phone}</a></dd></>)}
        {lead.email && (<><dt className="text-muted">Email</dt><dd className="col-span-2"><a href={`mailto:${lead.email}`} className="text-primary hover:text-cta">{lead.email}</a></dd></>)}
        {lead.tour_title && (<><dt className="text-muted">Εκδρομή</dt><dd className="col-span-2">{lead.tour_title}</dd></>)}
        {lead.preferred_date && (<><dt className="text-muted">Ημερομηνία</dt><dd className="col-span-2">{lead.preferred_date}</dd></>)}
        {lead.party_size != null && (<><dt className="text-muted">Άτομα</dt><dd className="col-span-2">{lead.party_size}</dd></>)}
        {lead.subject && (<><dt className="text-muted">Θέμα</dt><dd className="col-span-2">{lead.subject}</dd></>)}
        {lead.message && (<><dt className="text-muted">Μήνυμα</dt><dd className="col-span-2 whitespace-pre-wrap">{lead.message}</dd></>)}
        <dt className="text-muted">Ημ/νία</dt><dd className="col-span-2">{new Date(lead.created_at).toLocaleString('el-GR')}</dd>
      </dl>

      <div className="mt-6 rounded-lg border border-border bg-surface p-6">
        <h2 className="font-sans text-[13px] font-semibold uppercase tracking-[0.1em] text-primary">Κατάσταση</h2>
        <div className="mt-3 flex flex-wrap gap-2">
          {STATUSES.map((s) => (
            <form key={s} action={setLeadStatus.bind(null, lead.id, s)}>
              <button type="submit" className={`rounded-full border px-3 py-1.5 text-[13px] ${lead.status === s ? 'border-primary bg-primary text-surface' : 'border-border text-body hover:border-primary'}`}>{STATUS_LABEL[s]}</button>
            </form>
          ))}
        </div>
      </div>

      <form action={async (fd: FormData) => { 'use server'; await saveLeadNotes(lead.id, String(fd.get('notes') || '')); }} className="mt-6 rounded-lg border border-border bg-surface p-6">
        <h2 className="font-sans text-[13px] font-semibold uppercase tracking-[0.1em] text-primary">Σημειώσεις</h2>
        <textarea name="notes" rows={4} defaultValue={lead.admin_notes ?? ''} className="mt-3 w-full rounded-md border border-border bg-surface px-4 py-2.5 text-[15px] focus:border-primary focus:outline-none focus:ring-4 focus:ring-primary/10" />
        <div className="mt-3 flex items-center justify-between">
          <Button type="submit" size="sm">Αποθήκευση σημειώσεων</Button>
          <ConfirmForm action={deleteLead.bind(null, lead.id)} message="Διαγραφή αιτήματος;"><span className="text-[13px] text-cta hover:underline">Διαγραφή</span></ConfirmForm>
        </div>
      </form>
    </div>
  );
}
```

> Note: verify `components/admin/ConfirmForm.tsx`'s prop names before use (it wraps a confirm-on-submit form; it's used on the tours page). If its API differs, replace the delete block with a plain `<form action={deleteLead.bind(null, lead.id)}><button>Διαγραφή</button></form>`.

- [ ] **Step 4: Verify** — `npm run build`; open `/admin/requests`, click a lead, change status (persists + moves in/out of bookings), save notes, and (optionally) delete.

- [ ] **Step 5: Commit**

```bash
git add "app/admin/(dashboard)/actions.ts" "app/admin/(dashboard)/requests/page.tsx" "app/admin/(dashboard)/requests/[id]/page.tsx"
git commit -m "feat(admin): requests list + detail with status/notes"
```

---

## Task 9: Clients + Bookings pages

**Files:**
- Create: `app/admin/(dashboard)/clients/page.tsx`
- Create: `app/admin/(dashboard)/bookings/page.tsx`

**Interfaces:**
- Consumes: `getClients`, `getBookings`, `StatusBadge`, `TypeBadge`.

- [ ] **Step 1: Create `app/admin/(dashboard)/clients/page.tsx`**

```tsx
import Link from 'next/link';
import { getClients } from '@/lib/queries/leads';

export default async function ClientsPage() {
  const clients = await getClients();
  return (
    <div>
      <h1 className="font-display text-4xl font-semibold text-primary">Πελάτες</h1>
      <p className="mt-1 text-muted">{clients.length} συνολικά (ομαδοποίηση κατά email/τηλέφωνο)</p>
      <div className="mt-8 overflow-hidden rounded-lg border border-border bg-surface">
        <table className="w-full text-left text-[14px]">
          <thead className="border-b border-border bg-background/50 font-sans text-[12px] uppercase tracking-[0.1em] text-muted">
            <tr><th className="px-5 py-3">Όνομα</th><th className="px-5 py-3">Επικοινωνία</th><th className="px-5 py-3">Αιτήματα</th><th className="px-5 py-3">Τελευταία δραστηριότητα</th></tr>
          </thead>
          <tbody>
            {clients.length === 0 && <tr><td colSpan={4} className="px-5 py-8 text-center text-muted">Δεν υπάρχουν πελάτες ακόμη.</td></tr>}
            {clients.map((c) => (
              <tr key={c.key} className="border-b border-border/60 last:border-0">
                <td className="px-5 py-3 font-medium text-primary">{c.name}</td>
                <td className="px-5 py-3 text-muted">{c.phone ?? c.email ?? '—'}</td>
                <td className="px-5 py-3 text-muted">{c.count}</td>
                <td className="px-5 py-3 text-muted">{new Date(c.lastActivity).toLocaleDateString('el-GR')}</td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  );
}
```

- [ ] **Step 2: Create `app/admin/(dashboard)/bookings/page.tsx`**

```tsx
import Link from 'next/link';
import { getBookings } from '@/lib/queries/leads';

export default async function BookingsPage() {
  const bookings = await getBookings();
  return (
    <div>
      <h1 className="font-display text-4xl font-semibold text-primary">Κρατήσεις</h1>
      <p className="mt-1 text-muted">{bookings.length} αιτήματα σε κατάσταση «Κράτηση»</p>
      <div className="mt-8 overflow-hidden rounded-lg border border-border bg-surface">
        <table className="w-full text-left text-[14px]">
          <thead className="border-b border-border bg-background/50 font-sans text-[12px] uppercase tracking-[0.1em] text-muted">
            <tr><th className="px-5 py-3">Πελάτης</th><th className="px-5 py-3">Εκδρομή</th><th className="px-5 py-3">Ημερομηνία</th><th className="px-5 py-3">Άτομα</th><th className="px-5 py-3">Επικοινωνία</th></tr>
          </thead>
          <tbody>
            {bookings.length === 0 && <tr><td colSpan={5} className="px-5 py-8 text-center text-muted">Δεν υπάρχουν κρατήσεις ακόμη.</td></tr>}
            {bookings.map((b) => (
              <tr key={b.id} className="border-b border-border/60 last:border-0">
                <td className="px-5 py-3"><Link href={`/admin/requests/${b.id}`} className="font-medium text-primary hover:text-cta">{b.name}</Link></td>
                <td className="px-5 py-3 text-muted">{b.tour_title ?? b.subject ?? '—'}</td>
                <td className="px-5 py-3 text-muted">{b.preferred_date ?? '—'}</td>
                <td className="px-5 py-3 text-muted">{b.party_size ?? '—'}</td>
                <td className="px-5 py-3 text-muted">{b.phone ?? b.email ?? '—'}</td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  );
}
```

- [ ] **Step 3: Verify** — `npm run build`; submit a booking form on the site → mark it "booked" in `/admin/requests/[id]` → it appears in `/admin/bookings`; the person appears once in `/admin/clients`.

- [ ] **Step 4: Commit**

```bash
git add "app/admin/(dashboard)/clients/page.tsx" "app/admin/(dashboard)/bookings/page.tsx"
git commit -m "feat(admin): clients (grouped) + bookings pages"
```

---

## Task 10: Categories CRUD

**Files:**
- Modify: `app/admin/(dashboard)/actions.ts` (add `upsertCategory`, `deleteCategory`)
- Create: `app/admin/(dashboard)/categories/page.tsx`

**Interfaces:**
- Consumes: `getCategories`, `ConfirmForm`, `Button`.
- Produces: `upsertCategory(formData: FormData)`, `deleteCategory(id: string)`.

- [ ] **Step 1: Add category actions to `app/admin/(dashboard)/actions.ts`** (append):

```ts
export async function upsertCategory(formData: FormData) {
  const sb = await createServerClient();
  const id = (formData.get('id') as string) || null;
  const payload = {
    name_el: String(formData.get('name_el') || '').trim(),
    slug: String(formData.get('slug') || '').trim(),
    sort_order: Number(formData.get('sort_order') || 0),
  };
  if (!payload.name_el || !payload.slug) return;
  if (id) await sb.from('categories').update(payload).eq('id', id);
  else await sb.from('categories').insert(payload);
  revalidatePublic();
  revalidatePath('/admin/categories');
}

export async function deleteCategory(id: string) {
  const sb = await createServerClient();
  await sb.from('categories').delete().eq('id', id);
  revalidatePublic();
  revalidatePath('/admin/categories');
}
```

- [ ] **Step 2: Create `app/admin/(dashboard)/categories/page.tsx`**

```tsx
import { getCategories } from '@/lib/queries/categories';
import { upsertCategory, deleteCategory } from '../actions';
import { Button } from '@/components/ui/Button';
import { ConfirmForm } from '@/components/admin/ConfirmForm';

const inputCls = 'w-full rounded-md border border-border bg-surface px-3 py-2 font-sans text-[14px] text-body focus:border-primary focus:outline-none focus:ring-4 focus:ring-primary/10';

export default async function CategoriesPage() {
  const categories = await getCategories();
  return (
    <div className="max-w-3xl">
      <h1 className="font-display text-4xl font-semibold text-primary">Κατηγορίες</h1>

      <div className="mt-8 overflow-hidden rounded-lg border border-border bg-surface">
        <table className="w-full text-left text-[14px]">
          <thead className="border-b border-border bg-background/50 font-sans text-[12px] uppercase tracking-[0.1em] text-muted">
            <tr><th className="px-4 py-3">Όνομα</th><th className="px-4 py-3">Slug</th><th className="px-4 py-3 w-24">Σειρά</th><th className="px-4 py-3 text-right">—</th></tr>
          </thead>
          <tbody>
            {categories.map((c) => (
              <tr key={c.id} className="border-b border-border/60 last:border-0">
                <td className="px-4 py-2">
                  <form action={upsertCategory} className="flex items-center gap-2">
                    <input type="hidden" name="id" value={c.id} />
                    <input name="name_el" defaultValue={c.name_el} className={inputCls} />
                    <input name="slug" defaultValue={c.slug} className={inputCls} />
                    <input name="sort_order" type="number" defaultValue={c.sort_order} className="w-20 rounded-md border border-border bg-surface px-3 py-2 text-[14px]" />
                    <Button type="submit" size="sm" variant="outline">Αποθήκευση</Button>
                  </form>
                </td>
                <td /><td /><td className="px-4 py-2 text-right">
                  <ConfirmForm action={deleteCategory.bind(null, c.id)} message={`Διαγραφή κατηγορίας «${c.name_el}»;`}><span className="text-[13px] text-cta hover:underline">Διαγραφή</span></ConfirmForm>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>

      <div className="mt-8 rounded-lg border border-border bg-surface p-6">
        <h2 className="font-display text-xl font-semibold text-primary">Νέα κατηγορία</h2>
        <form action={upsertCategory} className="mt-4 grid gap-3 sm:grid-cols-[1fr_1fr_6rem_auto]">
          <input name="name_el" placeholder="Όνομα" required className={inputCls} />
          <input name="slug" placeholder="slug" required className={inputCls} />
          <input name="sort_order" type="number" defaultValue={0} className={inputCls} />
          <Button type="submit">Προσθήκη</Button>
        </form>
      </div>
    </div>
  );
}
```

> Note: the per-row edit `<form>` renders inside a table cell for simplicity; the empty `<td/>` cells keep the header columns aligned. If alignment looks off, move each field into its own `<td>` with the `<form>` wrapping the whole row.

- [ ] **Step 3: Verify** — `npm run build`; `/admin/categories` lists the 6 categories; edit a name → saves; add a new category → appears on the site's category strip / footer; delete works.

- [ ] **Step 4: Commit**

```bash
git add "app/admin/(dashboard)/actions.ts" "app/admin/(dashboard)/categories/page.tsx"
git commit -m "feat(admin): categories CRUD"
```

---

## Task 11: Full verification

- [ ] **Step 1: Lint** — `npm run lint` → no errors (fix any oxlint issues in new files).
- [ ] **Step 2: Tests** — `npm run test:run` → all pass (existing + `leads`).
- [ ] **Step 3: Build** — `npm run build` → success; confirm routes: `/admin`, `/admin/tours`, `/admin/categories`, `/admin/requests`, `/admin/requests/[id]`, `/admin/clients`, `/admin/bookings`, `/admin/settings`.
- [ ] **Step 4: End-to-end (dev, PORT=3200)** with the migration applied:
  - Submit `/epikoinonia` contact form → row in `/admin/requests` (type Επικοινωνία, Νέο).
  - Submit πούλμαν quote form → row (type Προσφορά).
  - Submit a tour booking form → row (type Κράτηση, with tour).
  - In a request detail: change status → persists; set "Κράτηση" → shows in `/admin/bookings`; save notes → persists.
  - `/admin/clients` groups multiple requests from the same email/phone into one row.
  - `/admin` tiles show correct counts + latest 5 requests.
  - `/admin/categories`: edit + add + delete a category.
  - Log out via sidebar; non-admin hitting `/admin/*` → `/admin/login`.
- [ ] **Step 5: Commit any fixes**

```bash
git add -A && git commit -m "chore(admin): CRM verification fixes"
```

---

## Self-Review (completed by author)

- **Spec coverage:** sidebar shell (T6), Πίνακας (T7), leads table+RLS (T1), form persistence contact/quote/booking (T3/T4/T5), Αιτήματα list+detail+status+notes (T8), Πελάτες grouped (T9), Κρατήσεις (T9), Κατηγορίες CRUD (T10), Εκδρομές moved (T7), Ρυθμίσεις untouched. Πολυμέσα correctly deferred to Plan 2.
- **Placeholder scan:** none — full code per task; the two `> Note:` blocks are contingency guidance, not deferred work.
- **Type consistency:** `Lead`/`LeadInput`/`Client` used consistently; `createLead` (T3) signature matches its callers (T3/T4/T5); `getLeads/getClients/getBookings/getLeadById/getDashboardStats` (T2) match consumers (T7/T8/T9); `setLeadStatus/saveLeadNotes/deleteLead` (T8) and `upsertCategory/deleteCategory` (T10) match their pages; `StatusBadge`/`TypeBadge` (T6) props match usage.
```
