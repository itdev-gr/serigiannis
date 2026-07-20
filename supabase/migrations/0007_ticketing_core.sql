-- Sergiani Travel — bus ticketing core (KTEL-style e-ticketing)
-- Reference data: stations, directional routes, fare types, bus layouts,
-- recurring schedule patterns, materialized trips, booking settings.

create type trip_kind       as enum ('oneway','round','open_return');
create type trip_status     as enum ('scheduled','cancelled');
create type order_status    as enum ('pending','awaiting_payment','paid','offline','cancelled','expired');
create type ticket_status   as enum ('valid','used','cancelled');
create type ticket_leg      as enum ('outbound','return');
create type fare_basis      as enum ('oneway','round','open_return');
create type seat_claim_type as enum ('hold','booked','blocked');

create table public.stations (
  id uuid primary key default gen_random_uuid(),
  slug text unique not null,
  name text not null,
  code text,
  position int not null default 0,
  is_active boolean not null default true,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

-- Directional: the reverse direction is a second row (created together by the
-- admin action). Keeps per-direction fare/cutoff freedom without pair tables.
create table public.bus_routes (
  id uuid primary key default gen_random_uuid(),
  origin_station_id uuid not null references public.stations(id),
  destination_station_id uuid not null references public.stations(id),
  status text not null default 'published' check (status in ('draft','published')),
  duration_min int,
  sales_cutoff_min int,
  position int not null default 0,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  unique (origin_station_id, destination_station_id),
  check (origin_station_id <> destination_station_id)
);

create table public.fare_types (
  id uuid primary key default gen_random_uuid(),
  route_id uuid not null references public.bus_routes(id) on delete cascade,
  name text not null,
  description text,
  price_oneway_cents int not null check (price_oneway_cents >= 0),
  price_round_cents  int not null check (price_round_cents  >= 0),
  requires_document boolean not null default false,
  is_default boolean not null default false,
  position int not null default 0,
  is_active boolean not null default true,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);
create index fare_types_route_idx on public.fare_types (route_id, position);

-- Seat plan as JSONB: {decks:[{name,rows,cols,cells:[{r,c,type,seat,online}]}]}
-- cell.type: seat|aisle|driver|door|wc|stairs|empty. seat cells carry a unique
-- seat label and online=false for seats withheld from online sale.
create table public.bus_layouts (
  id uuid primary key default gen_random_uuid(),
  name text not null,
  layout jsonb not null,
  online_seats_total int not null default 0,
  is_active boolean not null default true,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create or replace function public.layout_seats(p jsonb, only_online boolean)
returns setof text
language sql immutable set search_path = '' as $$
  select cell->>'seat'
  from jsonb_array_elements(coalesce(p->'decks', '[]'::jsonb)) as d,
       jsonb_array_elements(coalesce(d->'cells', '[]'::jsonb)) as cell
  where cell->>'type' = 'seat'
    and (not only_online or coalesce((cell->>'online')::boolean, true));
$$;

create or replace function public.bus_layouts_before_write() returns trigger
language plpgsql set search_path = '' as $$
declare
  v_total int;
  v_dupes int;
begin
  select count(*) into v_total from public.layout_seats(new.layout, true);
  if v_total = 0 then
    raise exception 'layout_needs_online_seats';
  end if;
  select count(*) - count(distinct s) into v_dupes
    from public.layout_seats(new.layout, false) s;
  if v_dupes > 0 then
    raise exception 'layout_duplicate_seat_numbers';
  end if;
  new.online_seats_total = v_total;
  return new;
end $$;

create trigger bus_layouts_before_write before insert or update on public.bus_layouts
  for each row execute function public.bus_layouts_before_write();

create table public.schedule_patterns (
  id uuid primary key default gen_random_uuid(),
  route_id uuid not null references public.bus_routes(id) on delete cascade,
  layout_id uuid not null references public.bus_layouts(id),
  departure_time time not null,
  weekdays smallint[] not null check (weekdays <@ array[0,1,2,3,4,5,6]::smallint[]),
  valid_from date not null,
  valid_to date,
  is_active boolean not null default true,
  notes text,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);
create index patterns_route_idx on public.schedule_patterns (route_id) where is_active;

-- One row per concrete departure. Materialized lazily from patterns (idempotent
-- via the unique indexes); manual extra trips have pattern_id null.
create table public.trips (
  id uuid primary key default gen_random_uuid(),
  pattern_id uuid references public.schedule_patterns(id) on delete set null,
  route_id uuid not null references public.bus_routes(id),
  layout_id uuid not null references public.bus_layouts(id),
  service_date date not null,
  departure_at timestamptz not null,
  status trip_status not null default 'scheduled',
  sales_cutoff_min int,
  online_seats_total int not null default 0,
  notes text,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  unique (route_id, departure_at)
);
create unique index trips_pattern_date_uq on public.trips (pattern_id, service_date)
  where pattern_id is not null;
create index trips_search_idx on public.trips (route_id, service_date);
create index trips_departure_idx on public.trips (departure_at);

create or replace function public.trips_before_write() returns trigger
language plpgsql set search_path = '' as $$
begin
  select l.online_seats_total into new.online_seats_total
    from public.bus_layouts l where l.id = new.layout_id;
  return new;
end $$;

create trigger trips_before_write before insert or update of layout_id on public.trips
  for each row execute function public.trips_before_write();

create table public.booking_settings (
  id smallint primary key default 1 check (id = 1),
  hold_minutes int not null default 30,
  sales_window_days int not null default 30,
  default_cutoff_min int not null default 5,
  refund_cutoff_hours int not null default 8,
  refund_pct_early int not null default 70,
  refund_pct_late int not null default 50,
  open_return_months int not null default 3,
  updated_at timestamptz not null default now()
);
insert into public.booking_settings (id) values (1) on conflict do nothing;

create trigger stations_touch before update on public.stations
  for each row execute function public.touch_updated_at();
create trigger bus_routes_touch before update on public.bus_routes
  for each row execute function public.touch_updated_at();
create trigger fare_types_touch before update on public.fare_types
  for each row execute function public.touch_updated_at();
create trigger bus_layouts_touch before update on public.bus_layouts
  for each row execute function public.touch_updated_at();
create trigger schedule_patterns_touch before update on public.schedule_patterns
  for each row execute function public.touch_updated_at();
create trigger trips_touch before update on public.trips
  for each row execute function public.touch_updated_at();
create trigger booking_settings_touch before update on public.booking_settings
  for each row execute function public.touch_updated_at();
