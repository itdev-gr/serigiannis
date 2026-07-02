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
