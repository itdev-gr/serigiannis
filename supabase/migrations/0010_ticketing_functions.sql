-- Sergiani Travel — ticketing RPCs. All seat mutations funnel through these
-- SECURITY DEFINER functions; the unique index seat_claims_unique is the
-- arbiter. Grants: public wizard functions -> anon+authenticated,
-- admin functions -> authenticated (guarded by is_admin()),
-- confirm_order_paid -> service_role only.

-- helper: admin guard for definer functions ------------------------------
create or replace function public.assert_admin() returns void
language plpgsql stable set search_path = '' as $$
begin
  if not public.is_admin() then
    raise exception 'forbidden';
  end if;
end $$;

-- helper: effective sales cutoff minutes for a trip ----------------------
create or replace function public.trip_cutoff_min(p_trip public.trips) returns int
language sql stable set search_path = '' as $$
  select coalesce(
    p_trip.sales_cutoff_min,
    (select r.sales_cutoff_min from public.bus_routes r where r.id = p_trip.route_id),
    (select s.default_cutoff_min from public.booking_settings s where s.id = 1),
    5);
$$;

-- materialization: patterns -> trips for one route/date range ------------
create or replace function public.materialize_trips(p_route_id uuid, p_from date, p_to date)
returns int
language plpgsql volatile security definer set search_path = '' as $$
declare
  v_count int;
begin
  insert into public.trips (pattern_id, route_id, layout_id, service_date, departure_at, sales_cutoff_min)
  select sp.id, sp.route_id, sp.layout_id, d.d,
         (d.d::timestamp + sp.departure_time) at time zone 'Europe/Athens',
         null
  from public.schedule_patterns sp
  cross join generate_series(p_from, p_to, interval '1 day') as d(d)
  where sp.route_id = p_route_id
    and sp.is_active
    and d.d >= sp.valid_from
    and (sp.valid_to is null or d.d <= sp.valid_to)
    and extract(dow from d.d)::smallint = any (sp.weekdays)
  on conflict do nothing;
  get diagnostics v_count = row_count;
  return v_count;
end $$;

-- public search: route + day's trips with live availability --------------
create or replace function public.search_trips(p_origin uuid, p_dest uuid, p_date date)
returns jsonb
language plpgsql volatile security definer set search_path = '' as $$
declare
  v_route public.bus_routes;
  v_settings public.booking_settings;
  v_trips jsonb;
begin
  select * into v_settings from public.booking_settings where id = 1;

  select * into v_route from public.bus_routes
    where origin_station_id = p_origin and destination_station_id = p_dest
      and status = 'published';
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
      'origin_id', v_route.origin_station_id,
      'destination_id', v_route.destination_station_id,
      'duration_min', v_route.duration_min),
    'trips', v_trips);
end $$;

-- public: which seats of a trip are taken (no personal data) -------------
create or replace function public.get_trip_seat_status(p_trip_id uuid)
returns jsonb
language sql stable security definer set search_path = '' as $$
  select coalesce(jsonb_agg(seat_no order by seat_no), '[]'::jsonb)
  from public.trip_seat_claims
  where trip_id = p_trip_id
    and (claim_type <> 'hold' or expires_at > now());
$$;

-- public: acquire seat holds + create pending order ----------------------
-- p = { kind: 'oneway'|'round'|'open_return',
--       legs: [ { trip_id: uuid, seats: text[] } ] (1 or 2 entries) }
create or replace function public.begin_booking(p jsonb)
returns jsonb
language plpgsql volatile security definer set search_path = '' as $$
declare
  v_kind public.trip_kind;
  v_settings public.booking_settings;
  v_legs jsonb;
  v_leg jsonb;
  v_trip public.trips;
  v_out_trip public.trips;
  v_ret_trip public.trips;
  v_out_route public.bus_routes;
  v_ret_route public.bus_routes;
  v_seats text[];
  v_out_seats text[];
  v_ret_seats text[];
  v_seat text;
  v_order_id uuid;
  v_code text;
  v_expires timestamptz;
  i int;
begin
  begin
    v_kind := (p->>'kind')::public.trip_kind;
  exception when others then
    return jsonb_build_object('ok', false, 'error', 'invalid_kind');
  end;
  v_legs := coalesce(p->'legs', '[]'::jsonb);

  if v_kind = 'round' and jsonb_array_length(v_legs) <> 2 then
    return jsonb_build_object('ok', false, 'error', 'return_leg_required');
  end if;
  if v_kind <> 'round' and jsonb_array_length(v_legs) <> 1 then
    return jsonb_build_object('ok', false, 'error', 'invalid_legs');
  end if;

  select * into v_settings from public.booking_settings where id = 1;

  for i in 0..jsonb_array_length(v_legs) - 1 loop
    v_leg := v_legs->i;
    select * into v_trip from public.trips where id = (v_leg->>'trip_id')::uuid;
    if not found or v_trip.status <> 'scheduled' then
      return jsonb_build_object('ok', false, 'error', 'trip_not_found');
    end if;
    if now() >= v_trip.departure_at - make_interval(mins => public.trip_cutoff_min(v_trip)) then
      return jsonb_build_object('ok', false, 'error', 'sales_closed');
    end if;
    if v_trip.service_date > (now() at time zone 'Europe/Athens')::date + v_settings.sales_window_days then
      return jsonb_build_object('ok', false, 'error', 'date_out_of_range');
    end if;

    select coalesce(array_agg(s.v), '{}') into v_seats
      from (select distinct jsonb_array_elements_text(v_leg->'seats') as v) s;
    if array_length(v_seats, 1) is null or array_length(v_seats, 1) < 1 then
      return jsonb_build_object('ok', false, 'error', 'no_seats');
    end if;
    if array_length(v_seats, 1) > 10 then
      return jsonb_build_object('ok', false, 'error', 'too_many_seats');
    end if;
    if exists (
      select 1 from unnest(v_seats) rs(seat)
      where rs.seat not in (
        select ls from public.bus_layouts bl, public.layout_seats(bl.layout, true) ls
        where bl.id = v_trip.layout_id)
    ) then
      return jsonb_build_object('ok', false, 'error', 'invalid_seat');
    end if;

    if i = 0 then
      v_out_trip := v_trip; v_out_seats := v_seats;
    else
      v_ret_trip := v_trip; v_ret_seats := v_seats;
    end if;
  end loop;

  if v_kind = 'round' then
    if array_length(v_out_seats, 1) <> array_length(v_ret_seats, 1) then
      return jsonb_build_object('ok', false, 'error', 'seats_mismatch');
    end if;
    if v_ret_trip.departure_at <= v_out_trip.departure_at then
      return jsonb_build_object('ok', false, 'error', 'return_before_outbound');
    end if;
    select * into v_out_route from public.bus_routes where id = v_out_trip.route_id;
    select * into v_ret_route from public.bus_routes where id = v_ret_trip.route_id;
    if v_ret_route.origin_station_id <> v_out_route.destination_station_id
       or v_ret_route.destination_station_id <> v_out_route.origin_station_id then
      return jsonb_build_object('ok', false, 'error', 'not_reverse_route');
    end if;
  end if;

  -- opportunistic cleanup of dead holds on the contended trips
  delete from public.trip_seat_claims
    where claim_type = 'hold' and expires_at <= now()
      and trip_id in (v_out_trip.id, v_ret_trip.id);

  -- unique public order code (retry on the rare collision)
  loop
    v_code := 'SG-' || public.gen_booking_code(6);
    exit when not exists (select 1 from public.ticket_orders where public_code = v_code);
  end loop;

  v_expires := now() + make_interval(mins => v_settings.hold_minutes);

  insert into public.ticket_orders (public_code, kind, status, expires_at, outbound_trip_id, return_trip_id)
    values (v_code, v_kind, 'pending', v_expires, v_out_trip.id, v_ret_trip.id)
    returning id into v_order_id;

  begin
    foreach v_seat in array v_out_seats loop
      insert into public.trip_seat_claims (trip_id, seat_no, claim_type, order_id, expires_at)
        values (v_out_trip.id, v_seat, 'hold', v_order_id, v_expires);
    end loop;
    if v_kind = 'round' then
      foreach v_seat in array v_ret_seats loop
        insert into public.trip_seat_claims (trip_id, seat_no, claim_type, order_id, expires_at)
          values (v_ret_trip.id, v_seat, 'hold', v_order_id, v_expires);
      end loop;
    end if;
  exception when unique_violation then
    -- don't leave an orphan pending order behind
    delete from public.ticket_orders where id = v_order_id;
    return jsonb_build_object('ok', false, 'error', 'seat_taken');
  end;

  return jsonb_build_object(
    'ok', true,
    'order_id', v_order_id,
    'public_code', v_code,
    'access_token', (select access_token from public.ticket_orders where id = v_order_id),
    'expires_at', v_expires);
end $$;

-- internal: create tickets from order.passenger_data and book the claims --
create or replace function public.issue_tickets_internal(p_order_id uuid, p_final_status public.order_status)
returns jsonb
language plpgsql volatile security definer set search_path = '' as $$
declare
  v_order public.ticket_orders;
  v_out_trip public.trips;
  v_pax jsonb;
  v_entry jsonb;
  v_ticket_id uuid;
  v_code text;
  v_key int := 0;
  v_expected int;
  v_held int;
begin
  select * into v_order from public.ticket_orders where id = p_order_id for update;
  if not found then
    return jsonb_build_object('ok', false, 'error', 'order_not_found');
  end if;
  if exists (select 1 from public.tickets where order_id = p_order_id) then
    return jsonb_build_object('ok', true, 'already_issued', true);
  end if;
  if v_order.passenger_data is null then
    return jsonb_build_object('ok', false, 'error', 'missing_passengers');
  end if;

  select * into v_out_trip from public.trips where id = v_order.outbound_trip_id;

  -- claims must still be present (a very late payment can lose them)
  v_expected := jsonb_array_length(v_order.passenger_data)
    * case when v_order.kind = 'round' then 2 else 1 end;
  select count(*) into v_held from public.trip_seat_claims where order_id = p_order_id;
  if v_held <> v_expected then
    return jsonb_build_object('ok', false, 'error', 'hold_lost');
  end if;

  for v_entry in select * from jsonb_array_elements(v_order.passenger_data) loop
    v_key := v_key + 1;

    loop
      v_code := public.gen_booking_code(8);
      exit when not exists (select 1 from public.tickets where code = v_code);
    end loop;
    insert into public.tickets (order_id, code, leg, passenger_key, trip_id, seat_no,
        passenger_name, fare_type_id, fare_name, fare_basis, price_cents)
      values (p_order_id, v_code, 'outbound', v_key, v_order.outbound_trip_id,
        v_entry->>'outbound_seat', v_entry->>'passenger_name',
        (v_entry->>'fare_type_id')::uuid, v_entry->>'fare_name',
        (v_entry->>'fare_basis')::public.fare_basis,
        (v_entry->>'outbound_cents')::int)
      returning id into v_ticket_id;
    update public.trip_seat_claims
      set claim_type = 'booked', ticket_id = v_ticket_id, expires_at = null
      where order_id = p_order_id and trip_id = v_order.outbound_trip_id
        and seat_no = v_entry->>'outbound_seat';

    if v_order.kind = 'round' then
      loop
        v_code := public.gen_booking_code(8);
        exit when not exists (select 1 from public.tickets where code = v_code);
      end loop;
      insert into public.tickets (order_id, code, leg, passenger_key, trip_id, seat_no,
          passenger_name, fare_type_id, fare_name, fare_basis, price_cents)
        values (p_order_id, v_code, 'return', v_key, v_order.return_trip_id,
          v_entry->>'return_seat', v_entry->>'passenger_name',
          (v_entry->>'fare_type_id')::uuid, v_entry->>'fare_name',
          (v_entry->>'fare_basis')::public.fare_basis,
          (v_entry->>'return_cents')::int)
        returning id into v_ticket_id;
      update public.trip_seat_claims
        set claim_type = 'booked', ticket_id = v_ticket_id, expires_at = null
        where order_id = p_order_id and trip_id = v_order.return_trip_id
          and seat_no = v_entry->>'return_seat';
    elsif v_order.kind = 'open_return' then
      loop
        v_code := public.gen_booking_code(8);
        exit when not exists (select 1 from public.tickets where code = v_code);
      end loop;
      insert into public.tickets (order_id, code, leg, passenger_key, trip_id, seat_no,
          passenger_name, fare_type_id, fare_name, fare_basis, price_cents,
          open_return, open_return_expires_on)
        values (p_order_id, v_code, 'return', v_key, null, null,
          v_entry->>'passenger_name',
          (v_entry->>'fare_type_id')::uuid, v_entry->>'fare_name',
          'open_return'::public.fare_basis,
          (v_entry->>'return_cents')::int,
          true, v_out_trip.service_date
            + make_interval(months => (select open_return_months from public.booking_settings where id = 1)));
    end if;
  end loop;

  update public.ticket_orders
    set status = p_final_status,
        paid_at = case when p_final_status = 'paid' then now() else paid_at end,
        expires_at = null
    where id = p_order_id;

  return jsonb_build_object('ok', true);
end $$;

-- public: write billing+passengers, compute totals, issue (offline) or
-- hand off to the payment gateway (awaiting_payment) ----------------------
-- p_passengers = [ { passenger_name, fare_type_id, outbound_seat, return_seat? } ]
create or replace function public.finalize_checkout(
  p_order_id uuid, p_token uuid, p_billing jsonb, p_passengers jsonb,
  p_provider text default 'offline')
returns jsonb
language plpgsql volatile security definer set search_path = '' as $$
declare
  v_order public.ticket_orders;
  v_out_trip public.trips;
  v_entry jsonb;
  v_fare public.fare_types;
  v_total int := 0;
  v_pax jsonb := '[]'::jsonb;
  v_out_claimed text[];
  v_ret_claimed text[];
  v_out_used text[] := '{}';
  v_ret_used text[] := '{}';
  v_basis public.fare_basis;
  v_out_cents int;
  v_ret_cents int;
  v_issue jsonb;
begin
  select * into v_order from public.ticket_orders
    where id = p_order_id and access_token = p_token for update;
  if not found then
    return jsonb_build_object('ok', false, 'error', 'order_not_found');
  end if;
  if v_order.status <> 'pending' or v_order.expires_at <= now() then
    return jsonb_build_object('ok', false, 'error', 'order_expired');
  end if;
  if p_provider not in ('offline', 'viva') then
    return jsonb_build_object('ok', false, 'error', 'invalid_provider');
  end if;
  if coalesce(p_billing->>'customer_name', '') = '' or length(p_billing->>'customer_name') < 2
     or coalesce(p_billing->>'email', '') = '' or p_billing->>'email' not like '%@%'
     or coalesce(p_billing->>'phone', '') = '' or length(p_billing->>'phone') < 8 then
    return jsonb_build_object('ok', false, 'error', 'invalid_billing');
  end if;
  if coalesce((p_billing->>'accept_terms')::boolean, false) is not true then
    return jsonb_build_object('ok', false, 'error', 'terms_required');
  end if;

  select * into v_out_trip from public.trips where id = v_order.outbound_trip_id;

  select coalesce(array_agg(seat_no), '{}') into v_out_claimed
    from public.trip_seat_claims
    where order_id = p_order_id and trip_id = v_order.outbound_trip_id and claim_type = 'hold';
  select coalesce(array_agg(seat_no), '{}') into v_ret_claimed
    from public.trip_seat_claims
    where order_id = p_order_id and trip_id = v_order.return_trip_id and claim_type = 'hold';

  if jsonb_array_length(coalesce(p_passengers, '[]'::jsonb)) <> coalesce(array_length(v_out_claimed, 1), 0) then
    return jsonb_build_object('ok', false, 'error', 'passenger_count_mismatch');
  end if;

  v_basis := case v_order.kind
    when 'oneway' then 'oneway'::public.fare_basis
    when 'round' then 'round'::public.fare_basis
    else 'open_return'::public.fare_basis end;

  for v_entry in select * from jsonb_array_elements(p_passengers) loop
    if coalesce(v_entry->>'passenger_name', '') = '' or length(v_entry->>'passenger_name') < 2 then
      return jsonb_build_object('ok', false, 'error', 'invalid_passenger_name');
    end if;

    select * into v_fare from public.fare_types
      where id = (v_entry->>'fare_type_id')::uuid
        and route_id = v_out_trip.route_id and is_active;
    if not found then
      return jsonb_build_object('ok', false, 'error', 'invalid_fare');
    end if;

    if not (v_entry->>'outbound_seat' = any (v_out_claimed))
       or v_entry->>'outbound_seat' = any (v_out_used) then
      return jsonb_build_object('ok', false, 'error', 'seat_assignment_mismatch');
    end if;
    v_out_used := v_out_used || (v_entry->>'outbound_seat');

    if v_order.kind = 'round' then
      if not (v_entry->>'return_seat' = any (v_ret_claimed))
         or v_entry->>'return_seat' = any (v_ret_used) then
        return jsonb_build_object('ok', false, 'error', 'seat_assignment_mismatch');
      end if;
      v_ret_used := v_ret_used || (v_entry->>'return_seat');
    end if;

    if v_basis = 'oneway' then
      v_out_cents := v_fare.price_oneway_cents;
      v_ret_cents := 0;
    else
      v_out_cents := ceil(v_fare.price_round_cents / 2.0)::int;
      v_ret_cents := v_fare.price_round_cents - v_out_cents;
    end if;
    v_total := v_total + v_out_cents + v_ret_cents;

    v_pax := v_pax || jsonb_build_object(
      'passenger_name', v_entry->>'passenger_name',
      'fare_type_id', v_fare.id,
      'fare_name', v_fare.name,
      'fare_basis', v_basis,
      'outbound_seat', v_entry->>'outbound_seat',
      'return_seat', v_entry->>'return_seat',
      'outbound_cents', v_out_cents,
      'return_cents', v_ret_cents);
  end loop;

  update public.ticket_orders set
    customer_name = p_billing->>'customer_name',
    email = p_billing->>'email',
    phone = p_billing->>'phone',
    address = p_billing->>'address',
    city = p_billing->>'city',
    postal_code = p_billing->>'postal_code',
    region = p_billing->>'region',
    marketing_opt_in = coalesce((p_billing->>'marketing_opt_in')::boolean, false),
    accepted_terms_at = now(),
    passenger_data = v_pax,
    amount_total_cents = v_total,
    payment_provider = p_provider,
    created_by_admin = created_by_admin or (coalesce((p_billing->>'by_admin')::boolean, false) and public.is_admin())
    where id = p_order_id;

  if p_provider = 'offline' then
    v_issue := public.issue_tickets_internal(p_order_id, 'offline'::public.order_status);
    if not coalesce((v_issue->>'ok')::boolean, false) then
      return v_issue;
    end if;
    return jsonb_build_object('ok', true, 'issued', true, 'total_cents', v_total);
  end if;

  -- gateway path: give the payment round-trip breathing room
  update public.ticket_orders
    set status = 'awaiting_payment', expires_at = expires_at + interval '5 minutes'
    where id = p_order_id;
  update public.trip_seat_claims set expires_at = expires_at + interval '5 minutes'
    where order_id = p_order_id and claim_type = 'hold';

  return jsonb_build_object('ok', true, 'issued', false, 'total_cents', v_total);
end $$;

-- service-role only: gateway confirmed payment -> issue tickets ----------
create or replace function public.confirm_order_paid(p_order_id uuid, p_provider text, p_ref text)
returns jsonb
language plpgsql volatile security definer set search_path = '' as $$
declare
  v_order public.ticket_orders;
  v_issue jsonb;
begin
  select * into v_order from public.ticket_orders where id = p_order_id for update;
  if not found then
    return jsonb_build_object('ok', false, 'error', 'order_not_found');
  end if;
  if v_order.status = 'paid' then
    return jsonb_build_object('ok', true, 'already_paid', true);
  end if;
  if v_order.status not in ('pending', 'awaiting_payment', 'offline') then
    return jsonb_build_object('ok', false, 'error', 'order_not_payable');
  end if;

  update public.ticket_orders
    set payment_provider = coalesce(p_provider, payment_provider),
        payment_ref = coalesce(p_ref, payment_ref)
    where id = p_order_id;

  if v_order.status = 'offline' then
    -- tickets already issued; just record the payment
    update public.ticket_orders set status = 'paid', paid_at = now() where id = p_order_id;
    return jsonb_build_object('ok', true);
  end if;

  v_issue := public.issue_tickets_internal(p_order_id, 'paid'::public.order_status);
  if not coalesce((v_issue->>'ok')::boolean, false) then
    if v_issue->>'error' = 'hold_lost' then
      update public.ticket_orders
        set status = 'cancelled',
            admin_notes = coalesce(admin_notes || E'\n', '') || 'ΠΛΗΡΩΜΗ ΜΕΤΑ ΤΗ ΛΗΞΗ ΔΕΣΜΕΥΣΗΣ — ΑΠΑΙΤΕΙΤΑΙ ΕΠΙΣΤΡΟΦΗ ΧΡΗΜΑΤΩΝ'
        where id = p_order_id;
    end if;
    return v_issue;
  end if;
  return jsonb_build_object('ok', true);
end $$;

-- public: user abandons checkout -----------------------------------------
create or replace function public.release_order(p_order_id uuid, p_token uuid)
returns jsonb
language plpgsql volatile security definer set search_path = '' as $$
begin
  update public.ticket_orders set status = 'cancelled'
    where id = p_order_id and access_token = p_token
      and status in ('pending', 'awaiting_payment');
  if not found then
    return jsonb_build_object('ok', false, 'error', 'order_not_found');
  end if;
  delete from public.trip_seat_claims where order_id = p_order_id and claim_type = 'hold';
  return jsonb_build_object('ok', true);
end $$;

-- public: token-gated order bundle (checkout + confirmation pages) -------
create or replace function public.get_order_by_token(p_token uuid)
returns jsonb
language plpgsql volatile security definer set search_path = '' as $$
declare
  v_order public.ticket_orders;
  v_result jsonb;
begin
  select * into v_order from public.ticket_orders where access_token = p_token;
  if not found then
    return jsonb_build_object('ok', false, 'error', 'order_not_found');
  end if;

  -- lazy expiry flip
  if v_order.status in ('pending', 'awaiting_payment') and v_order.expires_at <= now() then
    update public.ticket_orders set status = 'expired' where id = v_order.id;
    delete from public.trip_seat_claims where order_id = v_order.id and claim_type = 'hold';
    v_order.status := 'expired';
  end if;

  select jsonb_build_object(
    'ok', true,
    'order', jsonb_build_object(
      'id', v_order.id,
      'public_code', v_order.public_code,
      'kind', v_order.kind,
      'status', v_order.status,
      'expires_at', v_order.expires_at,
      'customer_name', v_order.customer_name,
      'email', v_order.email,
      'phone', v_order.phone,
      'amount_total_cents', v_order.amount_total_cents,
      'payment_provider', v_order.payment_provider,
      'paid_at', v_order.paid_at,
      'created_at', v_order.created_at),
    'legs', (
      select coalesce(jsonb_agg(jsonb_build_object(
        'leg', leg_info.leg,
        'trip_id', t.id,
        'route_id', t.route_id,
        'service_date', t.service_date,
        'departure_at', t.departure_at,
        'time', to_char(t.departure_at at time zone 'Europe/Athens', 'HH24:MI'),
        'origin', so.name,
        'destination', sd.name,
        'seats', (
          select coalesce(jsonb_agg(c.seat_no order by c.seat_no), '[]'::jsonb)
          from public.trip_seat_claims c
          where c.order_id = v_order.id and c.trip_id = t.id
            and (c.claim_type <> 'hold' or c.expires_at > now()))
      ) order by leg_info.ord), '[]'::jsonb)
      from (values ('outbound', v_order.outbound_trip_id, 1), ('return', v_order.return_trip_id, 2))
        as leg_info(leg, trip_id, ord)
      join public.trips t on t.id = leg_info.trip_id
      join public.bus_routes r on r.id = t.route_id
      join public.stations so on so.id = r.origin_station_id
      join public.stations sd on sd.id = r.destination_station_id),
    'tickets', (
      select coalesce(jsonb_agg(jsonb_build_object(
        'id', tk.id,
        'code', tk.code,
        'leg', tk.leg,
        'passenger_key', tk.passenger_key,
        'trip_id', tk.trip_id,
        'seat_no', tk.seat_no,
        'passenger_name', tk.passenger_name,
        'fare_name', tk.fare_name,
        'fare_basis', tk.fare_basis,
        'price_cents', tk.price_cents,
        'status', tk.status,
        'open_return', tk.open_return,
        'open_return_expires_on', tk.open_return_expires_on,
        'refunded_cents', tk.refunded_cents
      ) order by tk.passenger_key, tk.leg), '[]'::jsonb)
      from public.tickets tk where tk.order_id = v_order.id),
    'fares', (
      select coalesce(jsonb_agg(jsonb_build_object(
        'id', f.id, 'name', f.name, 'description', f.description,
        'price_oneway_cents', f.price_oneway_cents,
        'price_round_cents', f.price_round_cents,
        'is_default', f.is_default
      ) order by f.position), '[]'::jsonb)
      from public.fare_types f
      join public.trips t on t.id = v_order.outbound_trip_id and f.route_id = t.route_id
      where f.is_active))
  into v_result;

  return v_result;
end $$;

-- admin: materialize all routes over a range (calendar view) -------------
create or replace function public.admin_materialize_range(p_from date, p_to date)
returns int
language plpgsql volatile security definer set search_path = '' as $$
declare
  v_route uuid;
  v_total int := 0;
begin
  perform public.assert_admin();
  for v_route in select id from public.bus_routes loop
    v_total := v_total + public.materialize_trips(v_route, p_from, p_to);
  end loop;
  return v_total;
end $$;

-- admin: block / unblock a seat ------------------------------------------
create or replace function public.admin_block_seat(p_trip_id uuid, p_seat text)
returns jsonb
language plpgsql volatile security definer set search_path = '' as $$
begin
  perform public.assert_admin();
  delete from public.trip_seat_claims
    where trip_id = p_trip_id and seat_no = p_seat
      and claim_type = 'hold' and expires_at <= now();
  begin
    insert into public.trip_seat_claims (trip_id, seat_no, claim_type)
      values (p_trip_id, p_seat, 'blocked');
  exception when unique_violation then
    return jsonb_build_object('ok', false, 'error', 'seat_taken');
  end;
  return jsonb_build_object('ok', true);
end $$;

create or replace function public.admin_unblock_seat(p_trip_id uuid, p_seat text)
returns jsonb
language plpgsql volatile security definer set search_path = '' as $$
begin
  perform public.assert_admin();
  delete from public.trip_seat_claims
    where trip_id = p_trip_id and seat_no = p_seat and claim_type = 'blocked';
  if not found then
    return jsonb_build_object('ok', false, 'error', 'not_blocked');
  end if;
  return jsonb_build_object('ok', true);
end $$;

-- admin: cancel a ticket with policy refund (70% / 50% / 0 after departure)
create or replace function public.admin_cancel_ticket(p_ticket_id uuid)
returns jsonb
language plpgsql volatile security definer set search_path = '' as $$
declare
  v_ticket public.tickets;
  v_trip public.trips;
  v_settings public.booking_settings;
  v_pct int;
  v_amount int;
begin
  perform public.assert_admin();
  select * into v_ticket from public.tickets where id = p_ticket_id for update;
  if not found or v_ticket.status <> 'valid' then
    return jsonb_build_object('ok', false, 'error', 'ticket_not_cancellable');
  end if;
  select * into v_settings from public.booking_settings where id = 1;

  if v_ticket.trip_id is null then
    v_pct := v_settings.refund_pct_early;  -- unredeemed open return
  else
    select * into v_trip from public.trips where id = v_ticket.trip_id;
    if now() >= v_trip.departure_at then
      v_pct := 0;
    elsif now() <= v_trip.departure_at - make_interval(hours => v_settings.refund_cutoff_hours) then
      v_pct := v_settings.refund_pct_early;
    else
      v_pct := v_settings.refund_pct_late;
    end if;
  end if;

  v_amount := round(v_ticket.price_cents * v_pct / 100.0)::int;

  update public.tickets
    set status = 'cancelled', cancelled_at = now(), refunded_cents = v_amount
    where id = p_ticket_id;
  delete from public.trip_seat_claims where ticket_id = p_ticket_id;
  insert into public.refunds (order_id, ticket_id, amount_cents, percent, reason)
    values (v_ticket.order_id, p_ticket_id, v_amount, v_pct, 'Ακύρωση εισιτηρίου');

  return jsonb_build_object('ok', true, 'refund_cents', v_amount, 'percent', v_pct);
end $$;

-- admin: move a ticket to another trip/seat (date or seat change) --------
create or replace function public.admin_move_ticket(p_ticket_id uuid, p_trip_id uuid, p_seat text)
returns jsonb
language plpgsql volatile security definer set search_path = '' as $$
declare
  v_ticket public.tickets;
  v_trip public.trips;
begin
  perform public.assert_admin();
  select * into v_ticket from public.tickets where id = p_ticket_id for update;
  if not found or v_ticket.status <> 'valid' then
    return jsonb_build_object('ok', false, 'error', 'ticket_not_movable');
  end if;
  select * into v_trip from public.trips where id = p_trip_id;
  if not found or v_trip.status <> 'scheduled' then
    return jsonb_build_object('ok', false, 'error', 'trip_not_found');
  end if;
  if not exists (
    select 1 from public.bus_layouts bl, public.layout_seats(bl.layout, false) ls
    where bl.id = v_trip.layout_id and ls = p_seat) then
    return jsonb_build_object('ok', false, 'error', 'invalid_seat');
  end if;

  delete from public.trip_seat_claims
    where trip_id = p_trip_id and seat_no = p_seat
      and claim_type = 'hold' and expires_at <= now();
  begin
    insert into public.trip_seat_claims (trip_id, seat_no, claim_type, order_id, ticket_id)
      values (p_trip_id, p_seat, 'booked', v_ticket.order_id, p_ticket_id);
  exception when unique_violation then
    return jsonb_build_object('ok', false, 'error', 'seat_taken');
  end;
  delete from public.trip_seat_claims
    where ticket_id = p_ticket_id and not (trip_id = p_trip_id and seat_no = p_seat);

  update public.tickets set trip_id = p_trip_id, seat_no = p_seat,
      open_return = false
    where id = p_ticket_id;
  return jsonb_build_object('ok', true);
end $$;

-- admin: redeem an open-return ticket onto a concrete trip/seat ----------
create or replace function public.admin_redeem_open_return(p_ticket_id uuid, p_trip_id uuid, p_seat text)
returns jsonb
language plpgsql volatile security definer set search_path = '' as $$
declare
  v_ticket public.tickets;
  v_trip public.trips;
begin
  perform public.assert_admin();
  select * into v_ticket from public.tickets where id = p_ticket_id for update;
  if not found or v_ticket.status <> 'valid' or not v_ticket.open_return or v_ticket.trip_id is not null then
    return jsonb_build_object('ok', false, 'error', 'not_open_return');
  end if;
  select * into v_trip from public.trips where id = p_trip_id;
  if not found or v_trip.status <> 'scheduled' then
    return jsonb_build_object('ok', false, 'error', 'trip_not_found');
  end if;
  if v_ticket.open_return_expires_on is not null and v_trip.service_date > v_ticket.open_return_expires_on then
    return jsonb_build_object('ok', false, 'error', 'open_return_expired');
  end if;
  return public.admin_move_ticket(p_ticket_id, p_trip_id, p_seat);
end $$;

-- admin: validate (board) a ticket by its code ---------------------------
create or replace function public.admin_validate_ticket(p_code text)
returns jsonb
language plpgsql volatile security definer set search_path = '' as $$
declare
  v_ticket public.tickets;
  v_info jsonb;
begin
  perform public.assert_admin();
  select * into v_ticket from public.tickets where code = upper(trim(p_code)) for update;
  if not found then
    return jsonb_build_object('ok', false, 'error', 'not_found');
  end if;

  select jsonb_build_object(
    'ticket_id', t.id, 'code', t.code, 'passenger_name', t.passenger_name,
    'seat_no', t.seat_no, 'fare_name', t.fare_name, 'status', t.status,
    'validated_at', t.validated_at, 'open_return', t.open_return,
    'trip', case when tr.id is null then null else jsonb_build_object(
      'service_date', tr.service_date,
      'time', to_char(tr.departure_at at time zone 'Europe/Athens', 'HH24:MI'),
      'origin', so.name, 'destination', sd.name) end)
  into v_info
  from public.tickets t
  left join public.trips tr on tr.id = t.trip_id
  left join public.bus_routes r on r.id = tr.route_id
  left join public.stations so on so.id = r.origin_station_id
  left join public.stations sd on sd.id = r.destination_station_id
  where t.id = v_ticket.id;

  if v_ticket.status = 'cancelled' then
    return jsonb_build_object('ok', false, 'error', 'cancelled', 'ticket', v_info);
  end if;
  if v_ticket.status = 'used' then
    return jsonb_build_object('ok', false, 'error', 'already_used', 'ticket', v_info);
  end if;
  if v_ticket.trip_id is null then
    return jsonb_build_object('ok', false, 'error', 'open_return_unredeemed', 'ticket', v_info);
  end if;

  update public.tickets set status = 'used', validated_at = now() where id = v_ticket.id;
  return jsonb_build_object('ok', true, 'ticket', v_info);
end $$;

-- grants ------------------------------------------------------------------
revoke execute on function
  public.materialize_trips(uuid, date, date),
  public.search_trips(uuid, uuid, date),
  public.get_trip_seat_status(uuid),
  public.begin_booking(jsonb),
  public.issue_tickets_internal(uuid, public.order_status),
  public.finalize_checkout(uuid, uuid, jsonb, jsonb, text),
  public.confirm_order_paid(uuid, text, text),
  public.release_order(uuid, uuid),
  public.get_order_by_token(uuid),
  public.admin_materialize_range(date, date),
  public.admin_block_seat(uuid, text),
  public.admin_unblock_seat(uuid, text),
  public.admin_cancel_ticket(uuid),
  public.admin_move_ticket(uuid, uuid, text),
  public.admin_redeem_open_return(uuid, uuid, text),
  public.admin_validate_ticket(text)
from public, anon, authenticated;

grant execute on function
  public.search_trips(uuid, uuid, date),
  public.get_trip_seat_status(uuid),
  public.begin_booking(jsonb),
  public.finalize_checkout(uuid, uuid, jsonb, jsonb, text),
  public.release_order(uuid, uuid),
  public.get_order_by_token(uuid)
to anon, authenticated;

grant execute on function
  public.admin_materialize_range(date, date),
  public.admin_block_seat(uuid, text),
  public.admin_unblock_seat(uuid, text),
  public.admin_cancel_ticket(uuid),
  public.admin_move_ticket(uuid, uuid, text),
  public.admin_redeem_open_return(uuid, uuid, text),
  public.admin_validate_ticket(text)
to authenticated;

-- confirm_order_paid + internals: service_role / definer-context only.
grant execute on function public.confirm_order_paid(uuid, text, text) to service_role;
