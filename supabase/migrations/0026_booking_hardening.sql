-- 0026: θωράκιση της κράτησης εκδρομών μετά από έλεγχο ασφαλείας (2026-08-06).
-- Τέσσερα προβλήματα, όλα στην πλευρά των εκδρομών (η πλευρά των εισιτηρίων
-- τα είχε ήδη λυμένα σωστά — εδώ ευθυγραμμίζουμε τα δύο υποσυστήματα):
--
--   1. Οι κρατήσεις σε 'awaiting_payment' ΔΕΝ έληγαν ποτέ: η tour_departure_taken
--      τις μετρούσε χωρίς έλεγχο expires_at και καμία συνάρτηση δεν τις γύριζε σε
--      'expired' (μόνο τα 'pending'). Ένας πελάτης που εγκατέλειπε τη σελίδα
--      πληρωμής κρατούσε θέσεις για πάντα. Λανθάνον όσο PAYMENT_PROVIDER=offline,
--      ενεργό από τη στιγμή που ανάβει η Viva.
--   2. Η create_tour_order αγνοούσε το tours.bookings_open («Κλειστή για
--      κρατήσεις»): μια cached σελίδα εκδρομής μπορούσε να κλείσει κράτηση μετά
--      το κλείσιμο.
--   3. Ο έλεγχος χωρητικότητας ήταν check-then-insert χωρίς κλείδωμα: δύο
--      ταυτόχρονες κρατήσεις περνούσαν και οι δύο πάνω από το όριο.
--   4. Δύο εγγραφές της ίδιας κατηγορίας τιμής στο ίδιο αίτημα παρέκαμπταν το
--      max_qty (20 + 20 = 40 άτομα σε κατηγορία με όριο 20).
--
-- Καμία αλλαγή σε τιμές, σε υπάρχουσες κρατήσεις ή στο σχήμα.

-- 1. Ποιες θέσεις είναι όντως πιασμένες --------------------------------------
-- 'paid'/'offline' μετράνε πάντα. 'pending'/'awaiting_payment' μετράνε μόνο όσο
-- η δέσμευσή τους ζει. expires_at is null σε αυτά τα δύο σημαίνει «χωρίς λήξη»
-- και μετράει — προτιμούμε να δείξουμε λιγότερες θέσεις παρά να υπερπουλήσουμε.
create or replace function public.tour_departure_taken(p_departure_id uuid)
returns int
language sql stable security definer set search_path = '' as $$
  select coalesce(sum(o.party_size), 0)::int
  from public.tour_orders o
  where o.departure_id = p_departure_id
    and (o.status in ('paid', 'offline')
      or (o.status in ('pending', 'awaiting_payment')
          and (o.expires_at is null or o.expires_at > now())));
$$;

-- 2. Δημιουργία κράτησης ------------------------------------------------------
-- Αλλαγές σε σχέση με το 0021: έλεγχος bookings_open, κλείδωμα της αναχώρησης
-- πριν τον έλεγχο χωρητικότητας, και άθροιση των ποσοτήτων ανά κατηγορία πριν
-- τον έλεγχο max_qty. Οι τιμές εξακολουθούν να διαβάζονται ΜΟΝΟ από τη βάση.
create or replace function public.create_tour_order(p jsonb)
returns jsonb
language plpgsql volatile security definer set search_path = '' as $$
declare
  v_tour public.tours;
  v_dep public.tour_departures;
  v_item jsonb;
  v_tier public.tour_price_tiers;
  v_qty int;
  v_key text;
  v_qty_by_tier jsonb := '{}'::jsonb;
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

  -- Το γραφείο μπορεί να κλείσει μια εκδρομή για κρατήσεις κρατώντας τη ορατή.
  -- Η σελίδα κρύβει το κουτί κράτησης, αλλά είναι cached — ο server αποφασίζει.
  if coalesce(v_tour.bookings_open, true) is not true then
    return jsonb_build_object('ok', false, 'error', 'bookings_closed');
  end if;

  select exists (
    select 1 from public.tour_departures d
    where d.tour_id = v_tour.id and d.is_active and d.starts_on >= current_date)
  into v_has_dates;

  if p ? 'departure_id' and nullif(p->>'departure_id', '') is not null then
    -- `for update`: κρατάει τη γραμμή της αναχώρησης μέχρι το commit, ώστε δύο
    -- ταυτόχρονες κρατήσεις να μη διαβάσουν και οι δύο την ίδια διαθεσιμότητα.
    select * into v_dep from public.tour_departures
      where id = (p->>'departure_id')::uuid and tour_id = v_tour.id
        and is_active and starts_on >= current_date
      for update;
    if not found then
      return jsonb_build_object('ok', false, 'error', 'departure_not_found');
    end if;
  elsif v_has_dates then
    return jsonb_build_object('ok', false, 'error', 'departure_required');
  end if;

  -- Πρώτο πέρασμα: άθροισε τις ποσότητες ανά κατηγορία, ώστε δύο εγγραφές της
  -- ίδιας κατηγορίας να μην παρακάμπτουν το max_qty της.
  for v_item in select * from jsonb_array_elements(coalesce(p->'items', '[]'::jsonb)) loop
    v_qty := coalesce((v_item->>'qty')::int, 0);
    continue when v_qty <= 0;
    v_key := v_item->>'tier_id';
    if v_key is null then
      return jsonb_build_object('ok', false, 'error', 'invalid_tier');
    end if;
    v_qty_by_tier := jsonb_set(v_qty_by_tier, array[v_key],
      to_jsonb(coalesce((v_qty_by_tier->>v_key)::int, 0) + v_qty), true);
  end loop;

  -- Δεύτερο πέρασμα: με τη σειρά εμφάνισης των κατηγοριών της εκδρομής, ώστε η
  -- ανάλυση της κράτησης να είναι πάντα σταθερή ανεξάρτητα από τη σειρά του
  -- αιτήματος. Ό,τι μείνει αζήτητο δείχνει σε κατηγορία που δεν ανήκει εδώ.
  for v_tier in select * from public.tour_price_tiers
    where tour_id = v_tour.id and is_active order by position, id loop
    v_qty := coalesce((v_qty_by_tier->>(v_tier.id::text))::int, 0);
    v_qty_by_tier := v_qty_by_tier - (v_tier.id::text);
    continue when v_qty <= 0;
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

  if v_qty_by_tier <> '{}'::jsonb then
    return jsonb_build_object('ok', false, 'error', 'invalid_tier');
  end if;

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

-- 3. Λήξη και για τις δύο καταστάσεις ----------------------------------------
-- Πανομοιότυπη με το 0024 εκτός από το ότι το lazy expiry καλύπτει πλέον και το
-- 'awaiting_payment', όπως ήδη κάνει η get_order_by_token των εισιτηρίων.
create or replace function public.get_tour_order_by_token(p_token uuid)
returns jsonb
language plpgsql volatile security definer set search_path = '' as $$
declare
  v_order public.tour_orders;
  v_tour_meeting_points text[];
begin
  select * into v_order from public.tour_orders where access_token = p_token;
  if not found then
    return jsonb_build_object('ok', false, 'error', 'order_not_found');
  end if;

  if v_order.status in ('pending', 'awaiting_payment')
     and v_order.expires_at is not null and v_order.expires_at <= now() then
    update public.tour_orders set status = 'expired' where id = v_order.id;
    v_order.status := 'expired';
  end if;

  select meeting_points into v_tour_meeting_points from public.tours where id = v_order.tour_id;

  return jsonb_build_object(
    'ok', true,
    'meeting_points', coalesce(to_jsonb(v_tour_meeting_points), '[]'::jsonb),
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
      'passengers', v_order.passengers,
      'meeting_point', v_order.meeting_point,
      'payment_provider', v_order.payment_provider,
      'paid_at', v_order.paid_at,
      'created_at', v_order.created_at));
end $$;

-- 4. Οριστικοποίηση: η ληγμένη «σε αναμονή πληρωμής» δεν ξαναζωντανεύει -------
-- Πανομοιότυπη με το 0024 εκτός από τον έλεγχο λήξης, που καλύπτει πλέον και το
-- 'awaiting_payment' (πριν, μια ληγμένη τέτοια κράτηση έπαιρνε νέα 45λεπτη ζωή
-- σε κάθε υποβολή της φόρμας, χωρίς κανέναν επανέλεγχο διαθεσιμότητας).
create or replace function public.finalize_tour_order(
  p_order_id uuid, p_token uuid, p_customer jsonb, p_provider text)
returns jsonb
language plpgsql volatile security definer set search_path = '' as $$
declare
  v_order public.tour_orders;
  v_tour_meeting_points text[];
  v_passengers jsonb := '[]'::jsonb;
  v_raw jsonb;
  v_p jsonb;
  v_name text;
  v_phone text;
  v_count int := 0;
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
  if coalesce(array_length(v_tour_meeting_points, 1), 0) > 0 then
    if coalesce(p_customer->>'meeting_point', '') = ''
       or not (p_customer->>'meeting_point' = any (v_tour_meeting_points)) then
      return jsonb_build_object('ok', false, 'error', 'invalid_meeting_point');
    end if;
  end if;

  v_raw := p_customer->'passengers';
  if jsonb_typeof(v_raw) = 'array' then
    for v_p in select value from jsonb_array_elements(v_raw) limit 200 loop
      exit when v_count >= 40;
      continue when jsonb_typeof(v_p) <> 'object';
      v_name := nullif(left(trim(coalesce(v_p->>'name', '')), 120), '');
      continue when v_name is null;
      v_phone := nullif(left(trim(coalesce(v_p->>'phone', '')), 40), '');
      v_passengers := v_passengers || jsonb_build_object('name', v_name, 'phone', v_phone);
      v_count := v_count + 1;
    end loop;
  end if;

  update public.tour_orders set
      customer_name = trim(p_customer->>'customer_name'),
      email = lower(trim(p_customer->>'email')),
      phone = trim(p_customer->>'phone'),
      notes = nullif(trim(coalesce(p_customer->>'notes', '')), ''),
      marketing_opt_in = coalesce((p_customer->>'marketing_opt_in')::boolean, false),
      passengers = v_passengers,
      meeting_point = case when coalesce(array_length(v_tour_meeting_points, 1), 0) > 0
                           then left(trim(p_customer->>'meeting_point'), 200)
                           else null end,
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

-- 5. Καθυστερημένη πληρωμή: πληρώνεται, αλλά το γραφείο ειδοποιείται ---------
-- Η πληρωμή επιβεβαιώνεται πάντα (τα χρήματα έχουν ήδη χρεωθεί — δεν την
-- πετάμε), αλλά όταν έφτασε μετά τη λήξη ή όταν η αναχώρηση έχει πλέον
-- υπερκαλυφθεί, γράφεται σημείωση στην κράτηση ώστε να το δει ο υπάλληλος.
-- Ίδια λογική με το «ΠΛΗΡΩΜΗ ΜΕΤΑ ΤΗ ΛΗΞΗ ΔΕΣΜΕΥΣΗΣ» των εισιτηρίων (0010).
create or replace function public.confirm_tour_order_paid(p_order_id uuid, p_provider text, p_ref text)
returns jsonb
language plpgsql volatile security definer set search_path = '' as $$
declare
  v_order public.tour_orders;
  v_note text := null;
  v_capacity int;
  v_taken_by_others int;
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

  if v_order.status = 'expired'
     or (v_order.expires_at is not null and v_order.expires_at <= now()) then
    v_note := 'ΠΛΗΡΩΜΗ ΜΕΤΑ ΤΗ ΛΗΞΗ ΤΗΣ ΚΡΑΤΗΣΗΣ — ΕΛΕΓΞΤΕ ΔΙΑΘΕΣΙΜΟΤΗΤΑ, ΙΣΩΣ ΧΡΕΙΑΖΕΤΑΙ ΕΠΙΣΤΡΟΦΗ ΧΡΗΜΑΤΩΝ';
  end if;

  -- Οι ΑΛΛΕΣ κρατήσεις της αναχώρησης, συν αυτή εδώ: η tour_departure_taken δεν
  -- κάνει για αυτόν τον έλεγχο γιατί, αν η κράτηση είναι ακόμη ενεργή, μετράει
  -- και την ίδια — θα διπλομετρούσε τα άτομά της.
  if v_order.departure_id is not null then
    select d.capacity into v_capacity from public.tour_departures d where d.id = v_order.departure_id;
    if v_capacity is not null then
      select coalesce(sum(o.party_size), 0)::int into v_taken_by_others
      from public.tour_orders o
      where o.departure_id = v_order.departure_id
        and o.id <> v_order.id
        and (o.status in ('paid', 'offline')
          or (o.status in ('pending', 'awaiting_payment')
              and (o.expires_at is null or o.expires_at > now())));
      if v_taken_by_others + v_order.party_size > v_capacity then
        v_note := coalesce(v_note || ' · ', '') || 'ΥΠΕΡΒΑΣΗ ΟΡΙΟΥ ΘΕΣΕΩΝ ΣΤΗΝ ΑΝΑΧΩΡΗΣΗ';
      end if;
    end if;
  end if;

  update public.tour_orders set
      status = 'paid',
      paid_at = now(),
      expires_at = null,
      payment_provider = coalesce(p_provider, payment_provider),
      payment_ref = coalesce(p_ref, payment_ref),
      admin_notes = case when v_note is null then admin_notes
                         else coalesce(admin_notes || E'\n', '') || v_note end
    where id = p_order_id;
  return jsonb_build_object('ok', true, 'attention', v_note);
end $$;
