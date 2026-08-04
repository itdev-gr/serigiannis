-- 0021: online booking for tour pages (client request 2026-08-04).
-- The tour sidebar becomes a real booking widget: pick a departure date, pick
-- how many people per price category, pay the FULL amount online (Viva).
-- Prices live in tour_price_tiers; dates in tour_departures (0001, until now
-- unused). Orders never trust client prices — create_tour_order re-prices
-- every line from the tiers table.

-- price categories per tour ------------------------------------------------
-- e.g. «Το άτομο σε δίκλινο» 170,00 € (πριν 200,00 €), «Παιδιά έως 9 ετών» 80,00 €
create table public.tour_price_tiers (
  id uuid primary key default gen_random_uuid(),
  tour_id uuid not null references public.tours(id) on delete cascade,
  label text not null,
  price_cents int not null check (price_cents >= 0),
  price_original_cents int check (price_original_cents >= 0),
  max_qty int not null default 20 check (max_qty between 1 and 99),
  position int not null default 0,
  is_active boolean not null default true,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);
create index tour_tiers_tour_pos_idx on public.tour_price_tiers (tour_id, position);
create trigger tour_price_tiers_touch before update on public.tour_price_tiers
  for each row execute function public.touch_updated_at();

-- departures gain an on/off switch so the office can hide a date without
-- deleting it (and losing the orders' date label).
alter table public.tour_departures
  add column if not exists is_active boolean not null default true;

-- orders --------------------------------------------------------------------
-- No seats, no tickets: one order = one tour departure for N people, split
-- across price categories. Snapshot the labels/prices in `items` so an admin
-- price edit never rewrites history.
create table public.tour_orders (
  id uuid primary key default gen_random_uuid(),
  public_code text not null unique,
  access_token uuid not null unique default gen_random_uuid(),
  tour_id uuid references public.tours(id) on delete set null,
  departure_id uuid references public.tour_departures(id) on delete set null,
  tour_title text not null,
  tour_slug text,
  departure_date date,
  status public.order_status not null default 'pending',
  expires_at timestamptz,
  items jsonb not null default '[]'::jsonb,
  party_size int not null default 0,
  amount_total_cents int not null default 0,
  currency text not null default 'EUR',
  customer_name text,
  email text,
  phone text,
  notes text,
  marketing_opt_in boolean not null default false,
  accepted_terms_at timestamptz,
  payment_provider text,
  payment_ref text,
  paid_at timestamptz,
  admin_notes text,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);
create index tour_orders_status_idx on public.tour_orders (status, created_at desc);
create index tour_orders_tour_idx on public.tour_orders (tour_id, departure_date);
create index tour_orders_email_idx on public.tour_orders (lower(email));
create index tour_orders_payref_idx on public.tour_orders (payment_ref);
create trigger tour_orders_touch before update on public.tour_orders
  for each row execute function public.touch_updated_at();

-- payment_events now serves both order families, so its order_id can no longer
-- be a ticket_orders FK.
alter table public.payment_events
  drop constraint if exists payment_events_order_id_fkey;

-- RLS -----------------------------------------------------------------------
alter table public.tour_price_tiers enable row level security;
create policy ttiers_public_read on public.tour_price_tiers for select to anon, authenticated
  using (is_active and exists (
    select 1 from public.tours t where t.id = tour_id and t.status = 'published'));
create policy ttiers_admin_read on public.tour_price_tiers for select to authenticated
  using (public.is_admin());
create policy ttiers_admin_insert on public.tour_price_tiers for insert to authenticated
  with check (public.is_admin());
create policy ttiers_admin_update on public.tour_price_tiers for update to authenticated
  using (public.is_admin()) with check (public.is_admin());
create policy ttiers_admin_delete on public.tour_price_tiers for delete to authenticated
  using (public.is_admin());

-- orders: no public policies — guests reach their own order only through the
-- token-gated RPCs below.
alter table public.tour_orders enable row level security;
create policy torders_tour_admin_read on public.tour_orders for select to authenticated
  using (public.is_admin());
create policy torders_tour_admin_update on public.tour_orders for update to authenticated
  using (public.is_admin()) with check (public.is_admin());
create policy torders_tour_admin_delete on public.tour_orders for delete to authenticated
  using (public.is_admin());

-- helper: people already committed on a departure (live holds + sales) ------
create or replace function public.tour_departure_taken(p_departure_id uuid)
returns int
language sql stable security definer set search_path = '' as $$
  select coalesce(sum(o.party_size), 0)::int
  from public.tour_orders o
  where o.departure_id = p_departure_id
    and (o.status in ('paid', 'offline', 'awaiting_payment')
      or (o.status = 'pending' and o.expires_at > now()));
$$;

-- public: create a pending order from the tour-page widget ------------------
-- p = { tour_id, departure_id?, items: [ { tier_id, qty } ] }
create or replace function public.create_tour_order(p jsonb)
returns jsonb
language plpgsql volatile security definer set search_path = '' as $$
declare
  v_tour public.tours;
  v_dep public.tour_departures;
  v_item jsonb;
  v_tier public.tour_price_tiers;
  v_qty int;
  v_items jsonb := '[]'::jsonb;
  v_total int := 0;
  v_party int := 0;
  v_has_dates boolean;
  v_capacity int;
  v_code text;
  v_order public.tour_orders;
  i int;
begin
  select * into v_tour from public.tours
    where id = (p->>'tour_id')::uuid and status = 'published';
  if not found then
    return jsonb_build_object('ok', false, 'error', 'tour_not_found');
  end if;

  select exists (
    select 1 from public.tour_departures d
    where d.tour_id = v_tour.id and d.is_active and d.starts_on >= current_date)
  into v_has_dates;

  if p ? 'departure_id' and nullif(p->>'departure_id', '') is not null then
    select * into v_dep from public.tour_departures
      where id = (p->>'departure_id')::uuid and tour_id = v_tour.id
        and is_active and starts_on >= current_date;
    if not found then
      return jsonb_build_object('ok', false, 'error', 'departure_not_found');
    end if;
  elsif v_has_dates then
    return jsonb_build_object('ok', false, 'error', 'departure_required');
  end if;

  for v_item in select * from jsonb_array_elements(coalesce(p->'items', '[]'::jsonb)) loop
    v_qty := coalesce((v_item->>'qty')::int, 0);
    continue when v_qty <= 0;
    select * into v_tier from public.tour_price_tiers
      where id = (v_item->>'tier_id')::uuid and tour_id = v_tour.id and is_active;
    if not found then
      return jsonb_build_object('ok', false, 'error', 'invalid_tier');
    end if;
    if v_qty > v_tier.max_qty then
      return jsonb_build_object('ok', false, 'error', 'qty_too_high');
    end if;
    v_items := v_items || jsonb_build_object(
      'tier_id', v_tier.id,
      'label', v_tier.label,
      'unit_cents', v_tier.price_cents,
      'qty', v_qty,
      'line_cents', v_tier.price_cents * v_qty);
    v_total := v_total + v_tier.price_cents * v_qty;
    v_party := v_party + v_qty;
  end loop;

  if v_party = 0 then
    return jsonb_build_object('ok', false, 'error', 'no_people');
  end if;
  if v_total <= 0 then
    return jsonb_build_object('ok', false, 'error', 'zero_total');
  end if;

  if v_dep.id is not null and v_dep.capacity is not null then
    v_capacity := v_dep.capacity - public.tour_departure_taken(v_dep.id);
    if v_party > v_capacity then
      return jsonb_build_object('ok', false, 'error', 'sold_out', 'seats_left', greatest(v_capacity, 0));
    end if;
  end if;

  for i in 1..8 loop
    v_code := 'E' || public.gen_booking_code(5);
    begin
      insert into public.tour_orders (
        public_code, tour_id, departure_id, tour_title, tour_slug, departure_date,
        status, expires_at, items, party_size, amount_total_cents, currency)
      values (
        v_code, v_tour.id, v_dep.id, v_tour.title, v_tour.slug, v_dep.starts_on,
        'pending', now() + interval '45 minutes', v_items, v_party, v_total, v_tour.currency)
      returning * into v_order;
      exit;
    exception when unique_violation then
      v_order := null;
    end;
  end loop;
  if v_order.id is null then
    return jsonb_build_object('ok', false, 'error', 'code_collision');
  end if;

  return jsonb_build_object(
    'ok', true,
    'order_id', v_order.id,
    'access_token', v_order.access_token,
    'public_code', v_order.public_code,
    'total_cents', v_order.amount_total_cents);
end $$;

-- public: token-gated order bundle (checkout + confirmation pages) ----------
create or replace function public.get_tour_order_by_token(p_token uuid)
returns jsonb
language plpgsql volatile security definer set search_path = '' as $$
declare
  v_order public.tour_orders;
begin
  select * into v_order from public.tour_orders where access_token = p_token;
  if not found then
    return jsonb_build_object('ok', false, 'error', 'order_not_found');
  end if;

  -- lazy expiry flip (same pattern as get_order_by_token)
  if v_order.status = 'pending' and v_order.expires_at is not null and v_order.expires_at <= now() then
    update public.tour_orders set status = 'expired' where id = v_order.id;
    v_order.status := 'expired';
  end if;

  return jsonb_build_object(
    'ok', true,
    'order', jsonb_build_object(
      'id', v_order.id,
      'public_code', v_order.public_code,
      'status', v_order.status,
      'expires_at', v_order.expires_at,
      'tour_id', v_order.tour_id,
      'tour_title', v_order.tour_title,
      'tour_slug', v_order.tour_slug,
      'departure_date', v_order.departure_date,
      'items', v_order.items,
      'party_size', v_order.party_size,
      'amount_total_cents', v_order.amount_total_cents,
      'customer_name', v_order.customer_name,
      'email', v_order.email,
      'phone', v_order.phone,
      'notes', v_order.notes,
      'payment_provider', v_order.payment_provider,
      'paid_at', v_order.paid_at,
      'created_at', v_order.created_at));
end $$;

-- public: write the customer details and hand off to the gateway -----------
-- p_customer = { customer_name, email, phone, notes?, marketing_opt_in?, accept_terms }
create or replace function public.finalize_tour_order(
  p_order_id uuid, p_token uuid, p_customer jsonb, p_provider text)
returns jsonb
language plpgsql volatile security definer set search_path = '' as $$
declare
  v_order public.tour_orders;
begin
  select * into v_order from public.tour_orders
    where id = p_order_id and access_token = p_token for update;
  if not found then
    return jsonb_build_object('ok', false, 'error', 'order_not_found');
  end if;
  if v_order.status = 'paid' then
    return jsonb_build_object('ok', true, 'already_paid', true, 'total_cents', v_order.amount_total_cents);
  end if;
  if v_order.status not in ('pending', 'awaiting_payment') then
    return jsonb_build_object('ok', false, 'error', 'order_not_payable');
  end if;
  if v_order.status = 'pending' and v_order.expires_at is not null and v_order.expires_at <= now() then
    update public.tour_orders set status = 'expired' where id = v_order.id;
    return jsonb_build_object('ok', false, 'error', 'order_expired');
  end if;
  if coalesce(length(trim(p_customer->>'customer_name')), 0) < 2
     or coalesce(p_customer->>'email', '') !~ '^[^@[:space:]]+@[^@[:space:]]+\.[^@[:space:]]+$'
     or coalesce(length(regexp_replace(coalesce(p_customer->>'phone', ''), '[^0-9]', '', 'g')), 0) < 8 then
    return jsonb_build_object('ok', false, 'error', 'invalid_customer');
  end if;
  if not coalesce((p_customer->>'accept_terms')::boolean, false) then
    return jsonb_build_object('ok', false, 'error', 'terms_required');
  end if;

  update public.tour_orders set
      customer_name = trim(p_customer->>'customer_name'),
      email = lower(trim(p_customer->>'email')),
      phone = trim(p_customer->>'phone'),
      notes = nullif(trim(coalesce(p_customer->>'notes', '')), ''),
      marketing_opt_in = coalesce((p_customer->>'marketing_opt_in')::boolean, false),
      accepted_terms_at = now(),
      payment_provider = p_provider,
      status = case when p_provider = 'offline' then 'offline'::public.order_status
                    else 'awaiting_payment'::public.order_status end,
      expires_at = case when p_provider = 'offline' then null else now() + interval '45 minutes' end
    where id = p_order_id;

  return jsonb_build_object(
    'ok', true,
    'offline', p_provider = 'offline',
    'public_code', v_order.public_code,
    'total_cents', v_order.amount_total_cents);
end $$;

-- public: abandon checkout --------------------------------------------------
create or replace function public.release_tour_order(p_order_id uuid, p_token uuid)
returns jsonb
language plpgsql volatile security definer set search_path = '' as $$
begin
  update public.tour_orders set status = 'cancelled'
    where id = p_order_id and access_token = p_token
      and status in ('pending', 'awaiting_payment');
  if not found then
    return jsonb_build_object('ok', false, 'error', 'order_not_found');
  end if;
  return jsonb_build_object('ok', true);
end $$;

-- service-role only: gateway confirmed payment -----------------------------
create or replace function public.confirm_tour_order_paid(p_order_id uuid, p_provider text, p_ref text)
returns jsonb
language plpgsql volatile security definer set search_path = '' as $$
declare
  v_order public.tour_orders;
begin
  select * into v_order from public.tour_orders where id = p_order_id for update;
  if not found then
    return jsonb_build_object('ok', false, 'error', 'order_not_found');
  end if;
  if v_order.status = 'paid' then
    return jsonb_build_object('ok', true, 'already_paid', true);
  end if;
  if v_order.status not in ('pending', 'awaiting_payment', 'offline', 'expired') then
    return jsonb_build_object('ok', false, 'error', 'order_not_payable');
  end if;

  update public.tour_orders set
      status = 'paid',
      paid_at = now(),
      expires_at = null,
      payment_provider = coalesce(p_provider, payment_provider),
      payment_ref = coalesce(p_ref, payment_ref)
    where id = p_order_id;
  return jsonb_build_object('ok', true);
end $$;

-- admin: office actions on a tour order ------------------------------------
create or replace function public.admin_set_tour_order_status(p_order_id uuid, p_status public.order_status)
returns jsonb
language plpgsql volatile security definer set search_path = '' as $$
begin
  perform public.assert_admin();
  if p_status not in ('paid', 'offline', 'cancelled') then
    return jsonb_build_object('ok', false, 'error', 'invalid_status');
  end if;
  update public.tour_orders set
      status = p_status,
      paid_at = case when p_status = 'paid' then coalesce(paid_at, now()) else paid_at end,
      expires_at = null
    where id = p_order_id;
  if not found then
    return jsonb_build_object('ok', false, 'error', 'order_not_found');
  end if;
  return jsonb_build_object('ok', true);
end $$;

-- grants --------------------------------------------------------------------
revoke execute on function
  public.tour_departure_taken(uuid),
  public.create_tour_order(jsonb),
  public.get_tour_order_by_token(uuid),
  public.finalize_tour_order(uuid, uuid, jsonb, text),
  public.release_tour_order(uuid, uuid),
  public.confirm_tour_order_paid(uuid, text, text),
  public.admin_set_tour_order_status(uuid, public.order_status)
from public, anon, authenticated;

grant execute on function
  public.create_tour_order(jsonb),
  public.get_tour_order_by_token(uuid),
  public.finalize_tour_order(uuid, uuid, jsonb, text),
  public.release_tour_order(uuid, uuid)
to anon, authenticated;

grant execute on function
  public.admin_set_tour_order_status(uuid, public.order_status)
to authenticated;

grant execute on function public.confirm_tour_order_paid(uuid, text, text) to service_role;
