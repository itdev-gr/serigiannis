-- 0038: επιλογή admin ανά εκδρομή — online πληρωμή ή μόνο αίτημα/προσφορά
-- (αίτημα 2026-08-26). Μέχρι τώρα το «με πληρωμή ή με request» προέκυπτε
-- έμμεσα (έχει κατηγορίες τιμών ή όχι)· τώρα είναι ρητός διακόπτης, ώστε μια
-- εκδρομή να δείχνει τιμές στη σελίδα αλλά να δέχεται μόνο αιτήματα.

alter table public.tours
  add column if not exists booking_mode text not null default 'online'
    check (booking_mode in ('online', 'request'));

-- create_tour_order: πανομοιότυπη με το 0026 συν τον έλεγχο του booking_mode.
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

  -- «Μόνο αίτημα / προσφορά» (0038): η σελίδα δείχνει φόρμα αιτήματος αντί για
  -- widget πληρωμής, αλλά είναι cached — ο server είναι που αρνείται.
  if v_tour.booking_mode = 'request' then
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
