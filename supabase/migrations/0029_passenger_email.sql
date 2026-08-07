-- 0029: προαιρετικό email ανά επιβάτη (idempotent, backward compatible).
--
-- Ο πληρωτής συνεχίζει να λαμβάνει ΕΝΑ email με όλα τα εισιτήρια. Επιπλέον,
-- όποιος επιβάτης συμπλήρωσε δικό του email λαμβάνει ξεχωριστό μήνυμα ΜΟΝΟ με
-- το δικό του εισιτήριο (χωρίς τιμές, σύνολο ή στοιχεία των υπολοίπων) — η
-- αποστολή γίνεται στο lib/ticket-notify.ts, εδώ μόνο η αποθήκευση.
--
-- Το πεδίο είναι προαιρετικό παντού: clients που δεν το στέλνουν γράφουν NULL
-- και συμπεριφέρονται ακριβώς όπως πριν, γι' αυτό το migration εφαρμόζεται
-- με ασφάλεια ΠΡΙΝ το push του κώδικα.
--
-- Εφαρμογή: χειροκίνητα στο project lucwtnzdvcpcdcmfxbqp (SQL editor).
-- create-or-replace διατηρεί τα grants — δεν χρειάζονται grant statements.

alter table public.tickets add column if not exists passenger_email text;

-- Πανομοιότυπη με το 0027 συν: sanitise/έλεγχος του προαιρετικού
-- passenger_email και αποθήκευσή του στο passenger_data.
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
  v_is_admin boolean;
  v_has_stops boolean;
  v_bp text;
  v_email text;
  v_common_bp text;
  v_bp_mixed boolean := false;
  v_first_pax boolean := true;
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
  select * into v_route from public.bus_routes where id = v_out_trip.route_id;
  v_is_admin := coalesce((p_billing->>'by_admin')::boolean, false) and public.is_admin();
  v_has_stops := coalesce(array_length(v_route.boarding_points, 1), 0) > 0;

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

    -- Προαιρετικό email επιβάτη: αν δοθεί, στέλνουμε ξεχωριστά το εισιτήριό
    -- του. Κενό = ο επιβάτης δεν θέλει δικό του αντίγραφο.
    v_email := nullif(lower(left(trim(coalesce(v_entry->>'passenger_email', '')), 200)), '');
    if v_email is not null and v_email not like '%@%' then
      return jsonb_build_object('ok', false, 'error', 'invalid_passenger_email');
    end if;

    -- Σημείο επιβίβασης ανά επιβάτη· fallback στην order-level τιμή που
    -- στέλνουν clients προ-0027 (και το prefill του βήματος αναζήτησης).
    v_bp := coalesce(nullif(left(trim(coalesce(v_entry->>'boarding_point', '')), 200), ''),
                     nullif(left(trim(coalesce(p_billing->>'boarding_point', '')), 200), ''));
    if v_has_stops then
      if v_bp is null then
        if not v_is_admin then
          return jsonb_build_object('ok', false, 'error', 'missing_boarding_point');
        end if;
      elsif not (v_bp = any (v_route.boarding_points)) then
        return jsonb_build_object('ok', false, 'error', 'invalid_boarding_point');
      end if;
    end if;
    if v_first_pax then
      v_common_bp := v_bp;
      v_first_pax := false;
    elsif v_common_bp is distinct from v_bp then
      v_bp_mixed := true;
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
      'return_cents', v_ret_cents,
      'boarding_point', v_bp,
      'passenger_email', v_email);
  end loop;

  update public.ticket_orders set
    customer_name = p_billing->>'customer_name',
    email = p_billing->>'email',
    phone = p_billing->>'phone',
    address = p_billing->>'address',
    city = p_billing->>'city',
    postal_code = p_billing->>'postal_code',
    region = p_billing->>'region',
    -- Παράγωγο πλέον: το κοινό σημείο όλων των επιβατών, αλλιώς NULL.
    boarding_point = case when v_bp_mixed then null else v_common_bp end,
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

-- Πανομοιότυπη με το 0027 συν: το passenger_email γράφεται και στα τρία
-- σκέλη (αναχώρηση, επιστροφή, ανοιχτή επιστροφή) — σε αντίθεση με το
-- boarding_point που αφορά μόνο την αναχώρηση, εδώ ο παραλήπτης πρέπει να
-- συνοδεύει κάθε εισιτήριό του.
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
        passenger_name, passenger_phone, fare_type_id, fare_name, fare_basis, price_cents,
        boarding_point, passenger_email)
      values (p_order_id, v_code, 'outbound', v_key, v_order.outbound_trip_id,
        v_entry->>'outbound_seat', v_entry->>'passenger_name', v_entry->>'passenger_phone',
        (v_entry->>'fare_type_id')::uuid, v_entry->>'fare_name',
        (v_entry->>'fare_basis')::public.fare_basis,
        (v_entry->>'outbound_cents')::int,
        nullif(v_entry->>'boarding_point', ''), nullif(v_entry->>'passenger_email', ''))
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
          passenger_name, passenger_phone, fare_type_id, fare_name, fare_basis, price_cents,
          passenger_email)
        values (p_order_id, v_code, 'return', v_key, v_order.return_trip_id,
          v_entry->>'return_seat', v_entry->>'passenger_name', v_entry->>'passenger_phone',
          (v_entry->>'fare_type_id')::uuid, v_entry->>'fare_name',
          (v_entry->>'fare_basis')::public.fare_basis,
          (v_entry->>'return_cents')::int,
          nullif(v_entry->>'passenger_email', ''))
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
          open_return, open_return_expires_on, passenger_email)
        values (p_order_id, v_code, 'return', v_key, null, null,
          v_entry->>'passenger_name', v_entry->>'passenger_phone',
          (v_entry->>'fare_type_id')::uuid, v_entry->>'fare_name',
          'open_return'::public.fare_basis,
          (v_entry->>'return_cents')::int,
          true, v_out_trip.service_date
            + make_interval(months => (select open_return_months from public.booking_settings where id = 1)),
          nullif(v_entry->>'passenger_email', ''));
    end if;
  end loop;

  update public.ticket_orders
    set status = p_final_status,
        paid_at = case when p_final_status = 'paid' then now() else paid_at end,
        expires_at = null
    where id = p_order_id;

  return jsonb_build_object('ok', true);
end $$;

-- Πανομοιότυπη με το 0027 συν: 'passenger_email' ανά εισιτήριο, ώστε να το
-- βλέπει το lib/ticket-notify.ts (αντλεί αποκλειστικά από αυτό το RPC).
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
    'boarding_points', (
      select coalesce(to_jsonb(r.boarding_points), '[]'::jsonb)
      from public.trips t
      join public.bus_routes r on r.id = t.route_id
      where t.id = v_order.outbound_trip_id),
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
        'refunded_cents', tk.refunded_cents,
        'boarding_point', tk.boarding_point,
        'passenger_email', tk.passenger_email
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
