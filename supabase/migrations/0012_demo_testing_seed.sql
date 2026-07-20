-- Sergiani Travel — 5 demo γραμμές για πλήρες testing (idempotent).
-- 1. ΑΘΗΝΑ (ΣΥΝΤΑΓΜΑ) ↔ ΠΑΡΑΛΙΑ ΨΑΘΑΣ    πραγματική γραμμή (13:00/20:15 καθημερινά, 10€/5€/δωρεάν)
-- 2. ΑΘΗΝΑ (ΚΗ) ↔ ΘΕΣΣΑΛΟΝΙΚΗ (ΜΑ)        πλήρες ΚΤΕΛ σενάριο, διώροφο, 4 ναύλοι
-- 3. ΑΘΗΝΑ (ΚΗ) ↔ ΠΑΤΡΑ                    cutoff 30′, 3 δρομολόγια/ημέρα
-- 4. ΑΘΗΝΑ (ΣΥ) ↔ ΣΟΥΝΙΟ                   μόνο Σαβ-Κυρ, Mini Bus 20 θέσεων
-- 5. ΑΘΗΝΑ (ΚΗ) ↔ ΝΑΥΠΛΙΟ                  Τετ-Σαβ-Κυρ
-- Τα ad-hoc σενάρια διαθεσιμότητας (sold-out Πάτρα 07:30, 3 θέσεις Θεσ/νίκη 08:00
-- για την επόμενη ημέρα) είναι blocked claims στη βάση, όχι μέρος του migration.
-- Οι γραμμές 2-5 αφαιρούνται μετά το testing· η 1 μένει (πραγματική).

do $$
declare
  v_sy uuid; v_psa uuid; v_kh uuid; v_ma uuid; v_pa uuid; v_so uuid; v_na uuid;
  v_single uuid; v_double uuid; v_mini uuid;
  v_cells jsonb; r int; n int;
  rid uuid; rid2 uuid;
begin
  -- ---------------------------------------------------------------- stations
  select id into v_sy from public.stations where slug = 'athina-syntagma';
  select id into v_psa from public.stations where slug = 'paralia-psathas';
  insert into public.stations (slug, name, code, position) values ('athina-kifisos', 'ΑΘΗΝΑ (ΚΗΦΙΣΟΣ)', 'ΚΗ', 2)
    on conflict (slug) do nothing;
  insert into public.stations (slug, name, code, position) values ('thessaloniki-makedonia', 'ΘΕΣΣΑΛΟΝΙΚΗ (ΜΑΚΕΔΟΝΙΑ)', 'ΜΑ', 3)
    on conflict (slug) do nothing;
  insert into public.stations (slug, name, code, position) values ('patra', 'ΠΑΤΡΑ', 'ΠΑ', 4)
    on conflict (slug) do nothing;
  insert into public.stations (slug, name, code, position) values ('sounio', 'ΣΟΥΝΙΟ', 'ΣΟ', 5)
    on conflict (slug) do nothing;
  insert into public.stations (slug, name, code, position) values ('nafplio', 'ΝΑΥΠΛΙΟ', 'ΝΑ', 6)
    on conflict (slug) do nothing;
  select id into v_kh from public.stations where slug = 'athina-kifisos';
  select id into v_ma from public.stations where slug = 'thessaloniki-makedonia';
  select id into v_pa from public.stations where slug = 'patra';
  select id into v_so from public.stations where slug = 'sounio';
  select id into v_na from public.stations where slug = 'nafplio';

  -- ---------------------------------------------------------------- layouts
  select id into v_single from public.bus_layouts where name = 'Μονώροφο 53 θέσεων';
  select id into v_double from public.bus_layouts where name = 'Διώροφο 73 θέσεων';

  if not exists (select 1 from public.bus_layouts where name = 'Mini Bus 20 θέσεων') then
    v_cells := jsonb_build_array(
      jsonb_build_object('r', 0, 'c', 1, 'type', 'door'),
      jsonb_build_object('r', 0, 'c', 3, 'type', 'driver'));
    for r in 1..6 loop
      n := (r - 1) * 3;
      v_cells := v_cells
        || jsonb_build_object('r', r, 'c', 0, 'type', 'seat', 'seat', (n + 1)::text, 'online', true)
        || jsonb_build_object('r', r, 'c', 1, 'type', 'seat', 'seat', (n + 2)::text, 'online', true)
        || jsonb_build_object('r', r, 'c', 3, 'type', 'seat', 'seat', (n + 3)::text, 'online', true);
    end loop;
    v_cells := v_cells
      || jsonb_build_object('r', 7, 'c', 0, 'type', 'seat', 'seat', '19', 'online', true)
      || jsonb_build_object('r', 7, 'c', 3, 'type', 'seat', 'seat', '20', 'online', true);
    insert into public.bus_layouts (name, layout) values ('Mini Bus 20 θέσεων',
      jsonb_build_object('decks', jsonb_build_array(
        jsonb_build_object('name', 'ΟΡΟΦΟΣ', 'rows', 8, 'cols', 4, 'cells', v_cells))));
  end if;
  select id into v_mini from public.bus_layouts where name = 'Mini Bus 20 θέσεων';

  -- ------------------------------------------------- 1. ΨΑΘΑ: δημοσίευση
  update public.bus_routes set status = 'published'
    where (origin_station_id, destination_station_id) in ((v_sy, v_psa), (v_psa, v_sy));

  -- ------------------------------------- 2. ΑΘΗΝΑ (ΚΗ) ↔ ΘΕΣΣΑΛΟΝΙΚΗ (ΜΑ)
  if not exists (select 1 from public.bus_routes where origin_station_id = v_kh and destination_station_id = v_ma) then
    insert into public.bus_routes (origin_station_id, destination_station_id, status, duration_min, position)
      values (v_kh, v_ma, 'published', 380, 2) returning id into rid;
    insert into public.bus_routes (origin_station_id, destination_station_id, status, duration_min, position)
      values (v_ma, v_kh, 'published', 380, 3) returning id into rid2;
    insert into public.fare_types (route_id, name, description, price_oneway_cents, price_round_cents, requires_document, is_default, position) values
      (rid, 'Κανονικό', 'Όσοι δεν εντάσσονται σε κάποια κοινωνική κατηγορία.', 5000, 8000, false, true, 0),
      (rid, 'Φοιτητικό/Στρατιωτικό', 'Φοιτητές, σπουδαστές ΙΕΚ, στρατιώτες, άνεργοι, άνω των 60, παιδιά 13-18 (απαιτείται επίδειξη κάρτας/πάσου).', 3800, 7000, true, false, 1),
      (rid, 'Μισό/Φοιτητικό', 'Φοιτητές ΑΕΙ/ΑΤΕΙ, κάτοχοι ISIC, ΑμΕΑ άνω του 67%, πολύτεκνοι, τρίτεκνοι, παιδιά 0-12 με θέση.', 2500, 5000, true, false, 2),
      (rid, 'Δωρεάν', 'Παιδιά 0-6 ετών που δεν καταλαμβάνουν θέση.', 0, 0, false, false, 3);
    insert into public.fare_types (route_id, name, description, price_oneway_cents, price_round_cents, requires_document, is_default, position)
      select rid2, name, description, price_oneway_cents, price_round_cents, requires_document, is_default, position
      from public.fare_types where route_id = rid;
    insert into public.schedule_patterns (route_id, layout_id, departure_time, weekdays, valid_from, notes) values
      (rid,  v_single, '08:00', array[0,1,2,3,4,5,6]::smallint[], current_date, null),
      (rid,  v_single, '15:00', array[0,1,2,3,4,5,6]::smallint[], current_date, null),
      (rid,  v_double, '17:30', array[5,6,0]::smallint[], current_date, 'Διώροφο Παρ-Σαβ-Κυρ'),
      (rid,  v_double, '23:59', array[0,1,2,3,4,5,6]::smallint[], current_date, 'Βραδινό διώροφο'),
      (rid2, v_single, '08:00', array[0,1,2,3,4,5,6]::smallint[], current_date, null),
      (rid2, v_single, '15:00', array[0,1,2,3,4,5,6]::smallint[], current_date, null),
      (rid2, v_double, '17:30', array[5,6,0]::smallint[], current_date, 'Διώροφο Παρ-Σαβ-Κυρ'),
      (rid2, v_double, '23:59', array[0,1,2,3,4,5,6]::smallint[], current_date, 'Βραδινό διώροφο');
  end if;

  -- --------------------------------------------- 3. ΑΘΗΝΑ (ΚΗ) ↔ ΠΑΤΡΑ
  if not exists (select 1 from public.bus_routes where origin_station_id = v_kh and destination_station_id = v_pa) then
    insert into public.bus_routes (origin_station_id, destination_station_id, status, duration_min, sales_cutoff_min, position)
      values (v_kh, v_pa, 'published', 180, 30, 4) returning id into rid;
    insert into public.bus_routes (origin_station_id, destination_station_id, status, duration_min, sales_cutoff_min, position)
      values (v_pa, v_kh, 'published', 180, 30, 5) returning id into rid2;
    insert into public.fare_types (route_id, name, description, price_oneway_cents, price_round_cents, requires_document, is_default, position) values
      (rid, 'Κανονικό', 'Όσοι δεν εντάσσονται σε κάποια κοινωνική κατηγορία.', 2200, 4000, false, true, 0),
      (rid, 'Φοιτητικό', 'Φοιτητές με επίδειξη ακαδημαϊκής ταυτότητας.', 1700, 3000, true, false, 1),
      (rid, 'Παιδικό (0-12)', 'Παιδιά έως 12 ετών με δική τους θέση.', 1100, 2000, false, false, 2);
    insert into public.fare_types (route_id, name, description, price_oneway_cents, price_round_cents, requires_document, is_default, position)
      select rid2, name, description, price_oneway_cents, price_round_cents, requires_document, is_default, position
      from public.fare_types where route_id = rid;
    insert into public.schedule_patterns (route_id, layout_id, departure_time, weekdays, valid_from) values
      (rid,  v_single, '07:30', array[0,1,2,3,4,5,6]::smallint[], current_date),
      (rid,  v_single, '12:30', array[0,1,2,3,4,5,6]::smallint[], current_date),
      (rid,  v_single, '18:30', array[0,1,2,3,4,5,6]::smallint[], current_date),
      (rid2, v_single, '07:30', array[0,1,2,3,4,5,6]::smallint[], current_date),
      (rid2, v_single, '12:30', array[0,1,2,3,4,5,6]::smallint[], current_date),
      (rid2, v_single, '18:30', array[0,1,2,3,4,5,6]::smallint[], current_date);
  end if;

  -- ------------------------------------------ 4. ΑΘΗΝΑ (ΣΥ) ↔ ΣΟΥΝΙΟ (Σαβ-Κυρ, mini bus)
  if not exists (select 1 from public.bus_routes where origin_station_id = v_sy and destination_station_id = v_so) then
    insert into public.bus_routes (origin_station_id, destination_station_id, status, duration_min, position)
      values (v_sy, v_so, 'published', 90, 6) returning id into rid;
    insert into public.bus_routes (origin_station_id, destination_station_id, status, duration_min, position)
      values (v_so, v_sy, 'published', 90, 7) returning id into rid2;
    insert into public.fare_types (route_id, name, description, price_oneway_cents, price_round_cents, requires_document, is_default, position) values
      (rid, 'Κανονικό', 'Ενήλικες.', 1500, 2500, false, true, 0),
      (rid, 'Παιδικό (έως 9 ετών)', 'Παιδιά έως 9 ετών με δική τους θέση.', 800, 1400, false, false, 1);
    insert into public.fare_types (route_id, name, description, price_oneway_cents, price_round_cents, requires_document, is_default, position)
      select rid2, name, description, price_oneway_cents, price_round_cents, requires_document, is_default, position
      from public.fare_types where route_id = rid;
    insert into public.schedule_patterns (route_id, layout_id, departure_time, weekdays, valid_from, notes) values
      (rid,  v_mini, '09:00', array[6,0]::smallint[], current_date, 'Μόνο Σαββατοκύριακα — Mini Bus'),
      (rid2, v_mini, '17:00', array[6,0]::smallint[], current_date, 'Επιστροφή από Σούνιο');
  end if;

  -- ------------------------------------------ 5. ΑΘΗΝΑ (ΚΗ) ↔ ΝΑΥΠΛΙΟ (Τετ-Σαβ-Κυρ)
  if not exists (select 1 from public.bus_routes where origin_station_id = v_kh and destination_station_id = v_na) then
    insert into public.bus_routes (origin_station_id, destination_station_id, status, duration_min, position)
      values (v_kh, v_na, 'published', 150, 8) returning id into rid;
    insert into public.bus_routes (origin_station_id, destination_station_id, status, duration_min, position)
      values (v_na, v_kh, 'published', 150, 9) returning id into rid2;
    insert into public.fare_types (route_id, name, description, price_oneway_cents, price_round_cents, requires_document, is_default, position) values
      (rid, 'Κανονικό', 'Όσοι δεν εντάσσονται σε κάποια κοινωνική κατηγορία.', 1800, 3200, false, true, 0),
      (rid, 'Φοιτητικό', 'Φοιτητές με επίδειξη ακαδημαϊκής ταυτότητας.', 1400, 2500, true, false, 1),
      (rid, 'Δωρεάν', 'Παιδιά 0-6 ετών που δεν καταλαμβάνουν θέση.', 0, 0, false, false, 2);
    insert into public.fare_types (route_id, name, description, price_oneway_cents, price_round_cents, requires_document, is_default, position)
      select rid2, name, description, price_oneway_cents, price_round_cents, requires_document, is_default, position
      from public.fare_types where route_id = rid;
    insert into public.schedule_patterns (route_id, layout_id, departure_time, weekdays, valid_from) values
      (rid,  v_single, '08:30', array[3,6,0]::smallint[], current_date),
      (rid2, v_single, '18:00', array[3,6,0]::smallint[], current_date);
  end if;

  -- ---------------------------- υλοποίηση δρομολογίων για τις επόμενες 8 ημέρες
  for rid in select id from public.bus_routes loop
    perform public.materialize_trips(rid, current_date, current_date + 8);
  end loop;
end $$;
