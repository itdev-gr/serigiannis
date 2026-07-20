-- Sergiani Travel — ticketing demo seed (idempotent).
-- Two stations, the route pair, KTEL-style fares, one single-deck and one
-- double-deck layout, recurring patterns. Admin replaces with real data.

do $$
declare
  v_athina uuid;
  v_thess uuid;
  v_route_out uuid;
  v_route_ret uuid;
  v_single uuid;
  v_double uuid;
  v_cells jsonb;
  v_lower jsonb;
  v_upper jsonb;
  r int;
  n int;
begin
  insert into public.stations (slug, name, code, position)
    values ('athina', 'ΑΘΗΝΑ', 'ΑΘ', 0)
    on conflict (slug) do nothing;
  insert into public.stations (slug, name, code, position)
    values ('thessaloniki', 'ΘΕΣΣΑΛΟΝΙΚΗ', 'ΘΕ', 1)
    on conflict (slug) do nothing;
  select id into v_athina from public.stations where slug = 'athina';
  select id into v_thess from public.stations where slug = 'thessaloniki';

  -- single deck: 12 rows of 2+2 plus a back row of 5 = 53 seats, 1-8 offline
  v_cells := jsonb_build_array(
    jsonb_build_object('r', 0, 'c', 2, 'type', 'door'),
    jsonb_build_object('r', 0, 'c', 4, 'type', 'driver'));
  for r in 1..12 loop
    n := (r - 1) * 4;
    v_cells := v_cells
      || jsonb_build_object('r', r, 'c', 0, 'type', 'seat', 'seat', (n + 1)::text, 'online', n + 1 > 8)
      || jsonb_build_object('r', r, 'c', 1, 'type', 'seat', 'seat', (n + 2)::text, 'online', n + 2 > 8)
      || jsonb_build_object('r', r, 'c', 3, 'type', 'seat', 'seat', (n + 3)::text, 'online', n + 3 > 8)
      || jsonb_build_object('r', r, 'c', 4, 'type', 'seat', 'seat', (n + 4)::text, 'online', n + 4 > 8);
  end loop;
  for n in 0..4 loop
    v_cells := v_cells
      || jsonb_build_object('r', 13, 'c', n, 'type', 'seat', 'seat', (49 + n)::text, 'online', true);
  end loop;

  if not exists (select 1 from public.bus_layouts where name = 'Μονώροφο 53 θέσεων') then
    insert into public.bus_layouts (name, layout)
      values ('Μονώροφο 53 θέσεων', jsonb_build_object('decks', jsonb_build_array(
        jsonb_build_object('name', 'ΟΡΟΦΟΣ', 'rows', 14, 'cols', 5, 'cells', v_cells))));
  end if;
  select id into v_single from public.bus_layouts where name = 'Μονώροφο 53 θέσεων';

  -- double decker: lower 12 seats (9-20) + wc/stairs, upper 61 seats (21-81)
  v_lower := jsonb_build_array(
    jsonb_build_object('r', 0, 'c', 2, 'type', 'door'),
    jsonb_build_object('r', 0, 'c', 4, 'type', 'driver'),
    jsonb_build_object('r', 1, 'c', 2, 'type', 'stairs'),
    jsonb_build_object('r', 4, 'c', 2, 'type', 'wc'));
  for r in 1..3 loop
    n := 9 + (r - 1) * 4;
    v_lower := v_lower
      || jsonb_build_object('r', r, 'c', 0, 'type', 'seat', 'seat', n::text, 'online', true)
      || jsonb_build_object('r', r, 'c', 1, 'type', 'seat', 'seat', (n + 1)::text, 'online', true)
      || jsonb_build_object('r', r, 'c', 3, 'type', 'seat', 'seat', (n + 2)::text, 'online', true)
      || jsonb_build_object('r', r, 'c', 4, 'type', 'seat', 'seat', (n + 3)::text, 'online', true);
  end loop;
  v_upper := '[]'::jsonb;
  for r in 0..13 loop
    n := 21 + r * 4;
    v_upper := v_upper
      || jsonb_build_object('r', r, 'c', 0, 'type', 'seat', 'seat', n::text, 'online', true)
      || jsonb_build_object('r', r, 'c', 1, 'type', 'seat', 'seat', (n + 1)::text, 'online', true)
      || jsonb_build_object('r', r, 'c', 3, 'type', 'seat', 'seat', (n + 2)::text, 'online', true)
      || jsonb_build_object('r', r, 'c', 4, 'type', 'seat', 'seat', (n + 3)::text, 'online', true);
  end loop;
  for n in 0..4 loop
    v_upper := v_upper
      || jsonb_build_object('r', 14, 'c', n, 'type', 'seat', 'seat', (77 + n)::text, 'online', true);
  end loop;

  if not exists (select 1 from public.bus_layouts where name = 'Διώροφο 73 θέσεων') then
    insert into public.bus_layouts (name, layout)
      values ('Διώροφο 73 θέσεων', jsonb_build_object('decks', jsonb_build_array(
        jsonb_build_object('name', 'ΚΑΤΩ ΟΡΟΦΟΣ', 'rows', 5, 'cols', 5, 'cells', v_lower),
        jsonb_build_object('name', 'ΕΠΑΝΩ ΟΡΟΦΟΣ', 'rows', 15, 'cols', 5, 'cells', v_upper))));
  end if;
  select id into v_double from public.bus_layouts where name = 'Διώροφο 73 θέσεων';

  insert into public.bus_routes (origin_station_id, destination_station_id, duration_min, position)
    values (v_athina, v_thess, 380, 0)
    on conflict (origin_station_id, destination_station_id) do nothing;
  insert into public.bus_routes (origin_station_id, destination_station_id, duration_min, position)
    values (v_thess, v_athina, 380, 1)
    on conflict (origin_station_id, destination_station_id) do nothing;
  select id into v_route_out from public.bus_routes
    where origin_station_id = v_athina and destination_station_id = v_thess;
  select id into v_route_ret from public.bus_routes
    where origin_station_id = v_thess and destination_station_id = v_athina;

  if not exists (select 1 from public.fare_types where route_id = v_route_out) then
    insert into public.fare_types (route_id, name, description, price_oneway_cents, price_round_cents, requires_document, is_default, position) values
      (v_route_out, 'Κανονικό', 'Όσοι δεν εντάσσονται σε κάποια κοινωνική κατηγορία.', 5000, 8000, false, true, 0),
      (v_route_out, 'Φοιτητικό/Στρατιωτικό', 'Φοιτητές εξωτερικού, σπουδαστές ΙΕΚ, στρατιώτες και στρατιωτικοί, άνεργοι, άτομα άνω των 60 ετών, παιδιά 13-18 ετών (απαιτείται επίδειξη κάρτας/πάσου).', 3800, 7000, true, false, 1),
      (v_route_out, 'Μισό/Φοιτητικό', 'Φοιτητές Α.Ε.Ι.-Α.Τ.Ε.Ι. εσωτερικού, κάτοχοι κάρτας ISIC, ΑμΕΑ με ποσοστό αναπηρίας άνω του 67%, πολύτεκνοι, τρίτεκνοι, παιδιά 0-12 ετών με δική τους θέση.', 2500, 5000, true, false, 2),
      (v_route_out, 'Δωρεάν', 'Παιδιά 0-6 ετών που δεν καταλαμβάνουν θέση.', 0, 0, false, false, 3);
  end if;
  if not exists (select 1 from public.fare_types where route_id = v_route_ret) then
    insert into public.fare_types (route_id, name, description, price_oneway_cents, price_round_cents, requires_document, is_default, position)
      select v_route_ret, name, description, price_oneway_cents, price_round_cents, requires_document, is_default, position
      from public.fare_types where route_id = v_route_out;
  end if;

  if not exists (select 1 from public.schedule_patterns where route_id = v_route_out) then
    insert into public.schedule_patterns (route_id, layout_id, departure_time, weekdays, valid_from) values
      (v_route_out, v_single, '09:00', array[0,1,2,3,4,5,6]::smallint[], current_date),
      (v_route_out, v_double, '17:30', array[5,6,0]::smallint[], current_date),
      (v_route_ret, v_single, '09:00', array[0,1,2,3,4,5,6]::smallint[], current_date),
      (v_route_ret, v_double, '17:30', array[5,6,0]::smallint[], current_date);
  end if;
end $$;
