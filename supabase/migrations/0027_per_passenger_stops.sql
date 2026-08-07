-- 0027: υποχρεωτικό σημείο επιβίβασης ΑΝΑ επιβάτη (κρατήσεις εκδρομών + εισιτήρια).
--
-- Μέχρι τώρα το σημείο επιβίβασης ήταν ένα ανά παραγγελία. Πλέον, όταν η
-- εκδρομή/διαδρομή έχει ορισμένα σημεία, ΚΑΘΕ επιβάτης πρέπει να δηλώσει το
-- δικό του πριν την πληρωμή. Οι order-level στήλες (tour_orders.meeting_point,
-- ticket_orders.boarding_point) γίνονται παράγωγες: το κοινό σημείο όλων των
-- επιβατών, αλλιώς NULL — έτσι οι υπάρχουσες εμφανίσεις/παλιές παραγγελίες
-- συνεχίζουν να δουλεύουν απαράλλαχτες.
--
-- ΣΥΜΒΑΤΟΤΗΤΑ DEPLOY: κάθε νέο RPC δέχεται την order-level τιμή ως fallback
-- για επιβάτες χωρίς δικό τους σημείο, ώστε παλιά tabs/clients (που στέλνουν
-- μόνο order-level) να δουλεύουν στο παράθυρο του deploy. Γι' αυτό το αρχείο
-- εφαρμόζεται ΠΡΙΝ γίνει push ο κώδικας (SQL editor, project lucwtnzdvcpcdcmfxbqp).
--
-- create-or-replace διατηρεί τα υπάρχοντα grants· δεν χρειάζονται grant statements.
--
-- Smoke tests μετά την εφαρμογή (SQL editor, με πραγματικά ids):
--   * finalize_tour_order σε εκδρομή ΜΕ meeting_points:
--     - passengers χωρίς meeting_point και χωρίς order-level  -> error invalid_meeting_point
--     - passenger με meeting_point εκτός λίστας               -> error invalid_meeting_point
--     - λιγότεροι passengers από party_size                   -> error passenger_count_mismatch
--     - old-client σχήμα (order-level meeting_point, καθόλου ανά επιβάτη) -> ok,
--       και κάθε passenger entry παίρνει το order-level σημείο
--   * finalize_tour_order σε εκδρομή ΧΩΡΙΣ meeting_points: συμπεριφορά ίδια με πριν.
--   * finalize_checkout σε διαδρομή ΜΕ boarding_points:
--     - passenger χωρίς boarding_point (και χωρίς billing fallback) -> missing_boarding_point
--     - passenger με μη-μέλος boarding_point                       -> invalid_boarding_point
--     - by_admin + is_admin() χωρίς σημείο                          -> ok (NULL)
--   * μετά από offline finalize_checkout: τα outbound tickets έχουν boarding_point,
--     τα return/open-return NULL.

-- ============================================================================
-- ΤΟΜΕΑΣ Α: ΚΡΑΤΗΣΕΙΣ ΕΚΔΡΟΜΩΝ (tour_orders)
-- ============================================================================

-- Πανομοιότυπη με το 0026 εκτός από το μπλοκ meeting point / passengers:
--  * το meeting_point μετακομίζει μέσα σε κάθε passenger entry (με fallback
--    στην order-level τιμή για παλιούς clients),
--  * ΝΕΟΣ έλεγχος count(passengers) = party_size όταν υπάρχουν σημεία
--    (ανατρέπει συνειδητά την επιείκεια του 0024: με υποχρεωτικό σημείο ανά
--    ταξιδιώτη, μια ελλιπής λίστα δεν έχει πού να γράψει τα σημεία),
--  * το tour_orders.meeting_point γίνεται παράγωγο (κοινό σημείο ή NULL).
create or replace function public.finalize_tour_order(
  p_order_id uuid, p_token uuid, p_customer jsonb, p_provider text)
returns jsonb
language plpgsql volatile security definer set search_path = '' as $$
declare
  v_order public.tour_orders;
  v_tour_meeting_points text[];
  v_has_points boolean;
  v_order_point text;
  v_stop text;
  v_shared text := null;
  v_mixed boolean := false;
  v_passengers jsonb := '[]'::jsonb;
  v_raw jsonb;
  v_p jsonb;
  v_name text;
  v_phone text;
  v_count int := 0;
  v_cap int;
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
  if v_order.status in ('pending', 'awaiting_payment')
     and v_order.expires_at is not null and v_order.expires_at <= now() then
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

  select meeting_points into v_tour_meeting_points from public.tours where id = v_order.tour_id;
  v_has_points := coalesce(array_length(v_tour_meeting_points, 1), 0) > 0;

  -- Order-level σημείο: δεν απαιτείται πια (πηγή αλήθειας είναι το ανά
  -- επιβάτη), αλλά γίνεται δεκτό ως fallback για clients προ-0027. Αν
  -- σταλεί, πρέπει να είναι έγκυρο.
  v_order_point := nullif(left(trim(coalesce(p_customer->>'meeting_point', '')), 200), '');
  if v_has_points and v_order_point is not null
     and not (v_order_point = any (v_tour_meeting_points)) then
    return jsonb_build_object('ok', false, 'error', 'invalid_meeting_point');
  end if;

  -- Cap 40 όπως πριν, τεντωμένο ως το party_size ώστε ο νέος έλεγχος
  -- πλήθους να μην κλειδώνει μεγάλα γκρουπ· το 200 μένει σκληρό όριο.
  v_cap := least(greatest(40, v_order.party_size), 200);

  v_raw := p_customer->'passengers';
  if jsonb_typeof(v_raw) = 'array' then
    for v_p in select value from jsonb_array_elements(v_raw) limit 200 loop
      exit when v_count >= v_cap;
      continue when jsonb_typeof(v_p) <> 'object';
      v_name := nullif(left(trim(coalesce(v_p->>'name', '')), 120), '');
      continue when v_name is null;
      v_phone := nullif(left(trim(coalesce(v_p->>'phone', '')), 40), '');
      if v_has_points then
        v_stop := nullif(left(trim(coalesce(v_p->>'meeting_point', '')), 200), '');
        if v_stop is null then
          v_stop := v_order_point;  -- old client: κληρονομεί το order-level
        end if;
        if v_stop is null or not (v_stop = any (v_tour_meeting_points)) then
          return jsonb_build_object('ok', false, 'error', 'invalid_meeting_point');
        end if;
        if not v_mixed and v_shared is null then
          v_shared := v_stop;
        elsif not v_mixed and v_shared is distinct from v_stop then
          v_mixed := true;
          v_shared := null;
        end if;
        v_passengers := v_passengers
          || jsonb_build_object('name', v_name, 'phone', v_phone, 'meeting_point', v_stop);
      else
        v_passengers := v_passengers || jsonb_build_object('name', v_name, 'phone', v_phone);
      end if;
      v_count := v_count + 1;
    end loop;
  end if;

  if v_has_points and v_count <> v_order.party_size then
    return jsonb_build_object('ok', false, 'error', 'passenger_count_mismatch');
  end if;

  update public.tour_orders set
      customer_name = trim(p_customer->>'customer_name'),
      email = lower(trim(p_customer->>'email')),
      phone = trim(p_customer->>'phone'),
      notes = nullif(trim(coalesce(p_customer->>'notes', '')), ''),
      marketing_opt_in = coalesce((p_customer->>'marketing_opt_in')::boolean, false),
      passengers = v_passengers,
      -- Παράγωγο πλέον: το κοινό σημείο όλων των επιβατών, αλλιώς NULL.
      meeting_point = case when v_has_points then v_shared else null end,
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

-- ============================================================================
-- ΤΟΜΕΑΣ Β: ΕΙΣΙΤΗΡΙΑ (ticket_orders / tickets)
-- ============================================================================

-- Το σημείο επιβίβασης του επιβάτη γράφεται πλέον και στο εισιτήριό του
-- (μόνο στο σκέλος αναχώρησης — η επιστροφή επιβιβάζει από τον προορισμό).
alter table public.tickets add column if not exists boarding_point text;

-- Πανομοιότυπη με το 0020 εκτός από:
--  * boarding_point ανά επιβάτη (fallback στο p_billing για παλιούς clients
--    και για το prefill του βήματος αναζήτησης),
--  * για admin (by_admin + is_admin) το σημείο είναι προαιρετικό, αλλά
--    ελέγχεται membership όταν δίνεται,
--  * ticket_orders.boarding_point = κοινό σημείο όλων ή NULL (παράγωγο).
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
      'boarding_point', v_bp);
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

-- Πανομοιότυπη με το 0017 εκτός από το insert του σκέλους αναχώρησης, που
-- γράφει πλέον και το boarding_point του επιβάτη από το passenger_data.
-- Καλύπτει και τα δύο μονοπάτια πληρωμής (offline εδώ, gateway μέσω 0010).
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
        boarding_point)
      values (p_order_id, v_code, 'outbound', v_key, v_order.outbound_trip_id,
        v_entry->>'outbound_seat', v_entry->>'passenger_name', v_entry->>'passenger_phone',
        (v_entry->>'fare_type_id')::uuid, v_entry->>'fare_name',
        (v_entry->>'fare_basis')::public.fare_basis,
        (v_entry->>'outbound_cents')::int,
        nullif(v_entry->>'boarding_point', ''))
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

-- Πανομοιότυπη με το 0017 συν:
--  * 'boarding_point' ανά εισιτήριο (σελίδα επιβεβαίωσης / email),
--  * top-level 'boarding_points' (η λίστα της διαδρομής) ώστε το checkout να
--    δείχνει τον επιλογέα σημείου ανά επιβάτη.
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
        'boarding_point', tk.boarding_point
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
