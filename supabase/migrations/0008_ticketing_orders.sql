-- Sergiani Travel — bus ticketing orders, tickets, seat claims, refunds,
-- payment events. The unique index on trip_seat_claims(trip_id, seat_no)
-- is the single double-booking defense; everything funnels through RPCs.

create table public.ticket_orders (
  id uuid primary key default gen_random_uuid(),
  public_code text not null unique,
  access_token uuid not null unique default gen_random_uuid(),
  kind trip_kind not null,
  status order_status not null default 'pending',
  expires_at timestamptz,
  outbound_trip_id uuid references public.trips(id),
  return_trip_id uuid references public.trips(id),
  customer_name text,
  email text,
  phone text,
  address text,
  city text,
  postal_code text,
  region text,
  marketing_opt_in boolean not null default false,
  accepted_terms_at timestamptz,
  passenger_data jsonb,
  amount_total_cents int not null default 0,
  currency text not null default 'EUR',
  payment_provider text,
  payment_ref text,
  paid_at timestamptz,
  admin_notes text,
  created_by_admin boolean not null default false,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);
create index orders_status_idx on public.ticket_orders (status, created_at desc);
create index orders_email_idx  on public.ticket_orders (lower(email));
create index orders_payref_idx on public.ticket_orders (payment_ref);
create index orders_outbound_idx on public.ticket_orders (outbound_trip_id);

create table public.tickets (
  id uuid primary key default gen_random_uuid(),
  order_id uuid not null references public.ticket_orders(id) on delete cascade,
  code text not null unique,
  leg ticket_leg not null default 'outbound',
  passenger_key smallint not null default 1,
  trip_id uuid references public.trips(id),
  seat_no text,
  passenger_name text not null,
  fare_type_id uuid references public.fare_types(id) on delete set null,
  fare_name text not null,
  fare_basis fare_basis not null,
  price_cents int not null,
  status ticket_status not null default 'valid',
  open_return boolean not null default false,
  open_return_expires_on date,
  refunded_cents int,
  cancelled_at timestamptz,
  validated_at timestamptz,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  unique (order_id, leg, passenger_key)
);
create index tickets_trip_idx  on public.tickets (trip_id) where status = 'valid';
create index tickets_order_idx on public.tickets (order_id);

-- Current seat state only: hold (expiring), booked (ticket), blocked (admin).
-- Expired holds are ignored by reads and deleted opportunistically.
create table public.trip_seat_claims (
  id uuid primary key default gen_random_uuid(),
  trip_id uuid not null references public.trips(id) on delete cascade,
  seat_no text not null,
  claim_type seat_claim_type not null,
  order_id uuid references public.ticket_orders(id) on delete cascade,
  ticket_id uuid references public.tickets(id) on delete cascade,
  expires_at timestamptz,
  created_at timestamptz not null default now(),
  check (claim_type <> 'hold' or expires_at is not null)
);
create unique index seat_claims_unique on public.trip_seat_claims (trip_id, seat_no);
create index seat_claims_order_idx  on public.trip_seat_claims (order_id);
create index seat_claims_expiry_idx on public.trip_seat_claims (expires_at) where claim_type = 'hold';

create table public.refunds (
  id uuid primary key default gen_random_uuid(),
  order_id uuid not null references public.ticket_orders(id),
  ticket_id uuid references public.tickets(id) on delete set null,
  amount_cents int not null,
  percent int not null,
  reason text,
  provider_ref text,
  created_at timestamptz not null default now()
);
create index refunds_order_idx on public.refunds (order_id);

create table public.payment_events (
  id uuid primary key default gen_random_uuid(),
  provider text not null,
  event_id text not null,
  order_id uuid references public.ticket_orders(id) on delete set null,
  payload jsonb not null,
  created_at timestamptz not null default now(),
  unique (provider, event_id)
);

create trigger ticket_orders_touch before update on public.ticket_orders
  for each row execute function public.touch_updated_at();
create trigger tickets_touch before update on public.tickets
  for each row execute function public.touch_updated_at();

-- Unambiguous alphabet (no 0/O/1/I). Ticket codes gate boarding validation;
-- order codes are the human/phone reference.
create or replace function public.gen_booking_code(p_len int) returns text
language plpgsql volatile set search_path = '' as $$
declare
  chars constant text := 'ABCDEFGHJKLMNPQRSTUVWXYZ23456789';
  out_code text := '';
  i int;
begin
  for i in 1..p_len loop
    out_code := out_code || substr(chars, 1 + floor(random() * 32)::int, 1);
  end loop;
  return out_code;
end $$;
