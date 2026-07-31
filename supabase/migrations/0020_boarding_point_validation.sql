-- 0020: server-side σημείο-συνάντησης validation.
-- Re-defines finalize_checkout (verbatim copy from 0017) with a boarding-point
-- check: the meeting point must be one of the excursion's defined boarding_points.
-- Admin phone bookings (by_admin + is_admin) are exempt — they collect it verbally.
-- create-or-replace preserves existing grants; no grant statements needed.

create or replace function public.finalize_checkout(
  p_order_id uuid, p_token uuid, p_billing jsonb, p_passengers jsonb,
  p_provider text default 'offline')
returns jsonb
language plpgsql volatile security definer set search_path = '' as $$
declare
  v_order public.ticket_orders;
  v_out_trip public.trips;
  v_route public.bus_routes;
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
  -- meeting point must be one of the excursion's defined boarding points
  -- (skipped for admin phone bookings, which collect it verbally)
  select * into v_route from public.bus_routes where id = v_out_trip.route_id;
  if coalesce(array_length(v_route.boarding_points, 1), 0) > 0
     and not (coalesce((p_billing->>'by_admin')::boolean, false) and public.is_admin()) then
    if coalesce(p_billing->>'boarding_point', '') = ''
       or not (p_billing->>'boarding_point' = any (v_route.boarding_points)) then
      return jsonb_build_object('ok', false, 'error', 'invalid_boarding_point');
    end if;
  end if;

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
