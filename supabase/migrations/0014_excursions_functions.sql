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
        passenger_name, passenger_phone, fare_type_id, fare_name, fare_basis, price_cents)
      values (p_order_id, v_code, 'outbound', v_key, v_order.outbound_trip_id,
        v_entry->>'outbound_seat', v_entry->>'passenger_name', v_entry->>'passenger_phone',
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
          passenger_name, passenger_phone, fare_type_id, fare_name, fare_basis, price_cents)
        values (p_order_id, v_code, 'return', v_key, v_order.return_trip_id,
          v_entry->>'return_seat', v_entry->>'passenger_name', v_entry->>'passenger_phone',
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
          passenger_name, passenger_phone, fare_type_id, fare_name, fare_basis, price_cents,
          open_return, open_return_expires_on)
        values (p_order_id, v_code, 'return', v_key, null, null,
          v_entry->>'passenger_name', v_entry->>'passenger_phone',
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
    if coalesce(v_entry->>'passenger_phone', '') = '' or length(v_entry->>'passenger_phone') < 8 then
      return jsonb_build_object('ok', false, 'error', 'invalid_passenger_phone');
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
      'passenger_phone', v_entry->>'passenger_phone',
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
    boarding_point = nullif(p_billing->>'boarding_point', ''),
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
      'boarding_point', v_order.boarding_point,
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
        'passenger_phone', tk.passenger_phone,
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

-- grants ------------------------------------------------------------------
revoke execute on function
  public.list_route_dates(),
  public.search_route_trips(uuid, date)
from public, anon, authenticated;

grant execute on function
  public.list_route_dates(),
  public.search_route_trips(uuid, date)
to anon, authenticated;
