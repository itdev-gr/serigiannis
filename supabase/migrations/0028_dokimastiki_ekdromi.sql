-- 0028: δοκιμαστική εκδρομή για end-to-end testing (idempotent, ΜΟΝΟ inserts).
--
-- Στήνει δύο δοκιμαστικά προϊόντα στη ζωντανή βάση, ώστε το γραφείο να δοκιμάζει
-- ολόκληρο τον κύκλο κράτησης — και ειδικά το «σημείο επιβίβασης ανά επιβάτη»
-- του 0027 — χωρίς να αγγίζει πραγματικές εκδρομές και θέσεις:
--   Α. Σελίδα εκδρομής «ΔΟΚΙΜΑΣΤΙΚΗ ΕΚΔΡΟΜΗ» (slug: dokimastiki-ekdromi)
--      → /tour/dokimastiki-ekdromi → «Κάντε Κράτηση» → /kratisi/checkout
--   Β. Εκδρομή πούλμαν «ΔΟΚΙΜΑΣΤΙΚΗ ΕΚΔΡΟΜΗ ΠΟΥΛΜΑΝ» με αριθμημένες θέσεις
--      → /eisitiria → αναζήτηση → θέσεις → checkout
--
-- Είναι ΔΗΜΟΣΙΕΥΜΕΝΑ (δεν υπάρχει κρυφή-αλλά-κρατήσιμη κατάσταση: και το
-- getTourBySlug και το create_tour_order απαιτούν status='published'), γι' αυτό
-- ο τίτλος λέει ρητά ότι πρόκειται για δοκιμή και το sort_order=9999 τα στέλνει
-- στο τέλος του καταλόγου.
--
-- Εφαρμογή: χειροκίνητα στο project lucwtnzdvcpcdcmfxbqp (SQL editor).
-- Ξανατρέξιμο είναι ακίνδυνο — κάθε insert είναι φρουρημένος.
--
-- ΚΑΘΑΡΙΣΜΟΣ (ΜΗΝ το τρέξετε κατά λάθος — σβήνει τα δοκιμαστικά δεδομένα):
--   delete from public.tours where slug = 'dokimastiki-ekdromi';
--   delete from public.bus_routes r using public.stations s
--     where r.destination_station_id = s.id and s.slug = 'dokimastikos-proorismos';
--   delete from public.stations where slug = 'dokimastikos-proorismos';
--   -- Οι δοκιμαστικές κρατήσεις επιβιώνουν (tour_orders.tour_id → on delete set null).
--   -- Για να φύγουν κι αυτές:
--   delete from public.tour_orders where tour_title ilike 'ΔΟΚΙΜΑΣΤΙΚΗ%';

do $$
declare
  v_tour uuid;
  v_cat uuid;
  v_img uuid;
begin
  -- ============================================================ Α. ΣΕΛΙΔΑ ΕΚΔΡΟΜΗΣ
  if not exists (select 1 from public.tours where slug = 'dokimastiki-ekdromi') then
    insert into public.tours (
        slug, title, subtitle, summary, status, bookings_open, is_featured,
        price_from, price_original, duration_label, departure_note,
        meeting_point, meeting_points, sort_order, published_at)
      values (
        'dokimastiki-ekdromi',
        'ΔΟΚΙΜΑΣΤΙΚΗ ΕΚΔΡΟΜΗ — μην κάνετε κράτηση',
        'Εσωτερική δοκιμή του συστήματος κρατήσεων',
        'Η εκδρομή αυτή υπάρχει μόνο για να δοκιμάζει το γραφείο τη διαδικασία κράτησης από άκρη σε άκρη. Δεν πραγματοποιείται ποτέ — αν φτάσατε εδώ κατά λάθος, δείτε τις πραγματικές μας εκδρομές στον κατάλογο.',
        'published', true, false,
        45.00, 55.00, 'Μονοήμερη', 'Δοκιμαστική αναχώρηση — δεν εκτελείται.',
        'Δείτε τα διαθέσιμα σημεία επιβίβασης κατά την κράτηση.',
        array[
          '07:00 — Sergiani Travel, Παύλου Μελά 45 (Μετρό Αγ. Αντωνίου)',
          '07:20 — Ομόνοια, Hondos Center',
          '07:40 — Ελευσίνα, Practiker'
        ],
        9999, now())
      returning id into v_tour;

    -- Κατηγορία «Μονοήμερες» ώστε να δοκιμάζεται και η σελίδα κατηγορίας.
    select id into v_cat from public.categories where slug = 'monoimeres';
    if v_cat is not null then
      insert into public.tour_categories (tour_id, category_id, is_primary)
        values (v_tour, v_cat, true) on conflict do nothing;
    end if;

    -- Φωτογραφίες: απόλυτα URL (σύμβαση data/seed/tours.ts) — καμία μεταφόρτωση.
    insert into public.tour_images (tour_id, storage_path, alt_el, width, height, position) values
      (v_tour, 'https://picsum.photos/seed/dokimastiki-1/1600/1067', 'Δοκιμαστική φωτογραφία 1', 1600, 1067, 0),
      (v_tour, 'https://picsum.photos/seed/dokimastiki-2/1600/1067', 'Δοκιμαστική φωτογραφία 2', 1600, 1067, 1),
      (v_tour, 'https://picsum.photos/seed/dokimastiki-3/1600/1067', 'Δοκιμαστική φωτογραφία 3', 1600, 1067, 2);
    select id into v_img from public.tour_images
      where tour_id = v_tour order by position limit 1;
    update public.tours set cover_image_id = v_img where id = v_tour;

    -- Κατηγορίες τιμών (σε λεπτά — προσοχή, διαφορετική μονάδα από το price_from).
    insert into public.tour_price_tiers (tour_id, label, price_cents, price_original_cents, max_qty, position) values
      (v_tour, 'Το άτομο σε δίκλινο', 4500, 5500, 6, 0),
      (v_tour, 'Παιδί έως 12 ετών',   2500, null, 4, 1),
      (v_tour, 'Μονόκλινο',           6000, null, 2, 2);

    -- Αναχωρήσεις: σχετικές με το current_date ώστε να μη «λήξουν» ποτέ.
    -- Η δεύτερη έχει capacity 2 για να δοκιμάζεται το «δεν υπάρχουν θέσεις».
    insert into public.tour_departures (tour_id, starts_on, note, capacity, is_active) values
      (v_tour, current_date + 14, 'Δοκιμαστική αναχώρηση Α (χωρίς όριο)', null, true),
      (v_tour, current_date + 21, 'Δοκιμαστική αναχώρηση Β (μόνο 2 θέσεις)', 2, true),
      (v_tour, current_date + 28, 'Δοκιμαστική αναχώρηση Γ', 20, true);
  end if;
end $$;

do $$
declare
  v_from uuid;
  v_to uuid;
  v_layout uuid;
  v_route uuid;
begin
  -- ============================================================ Β. ΕΚΔΡΟΜΗ ΠΟΥΛΜΑΝ
  select id into v_from from public.stations where slug = 'sergiani-afetiria';
  insert into public.stations (slug, name, code, position)
    values ('dokimastikos-proorismos', 'ΔΟΚΙΜΑΣΤΙΚΟΣ ΠΡΟΟΡΙΣΜΟΣ', 'ΔΟΚ', 99)
    on conflict (slug) do nothing;
  select id into v_to from public.stations where slug = 'dokimastikos-proorismos';
  select id into v_layout from public.bus_layouts where name = 'Mini Bus 20 θέσεων';

  if v_from is not null and v_layout is not null
     and not exists (select 1 from public.bus_routes where destination_station_id = v_to) then
    insert into public.bus_routes (
        origin_station_id, destination_station_id, title, status,
        duration_min, boarding_points, position)
      values (
        v_from, v_to,
        'ΔΟΚΙΜΑΣΤΙΚΗ ΕΚΔΡΟΜΗ ΠΟΥΛΜΑΝ — μην κάνετε κράτηση',
        'published', 120,
        array[
          '07:00 — Sergiani Travel, Παύλου Μελά 45 (Μετρό Αγ. Αντωνίου)',
          '07:20 — Ομόνοια, Hondos Center',
          '07:40 — Ελευσίνα, Practiker'
        ],
        99)
      returning id into v_route;

    insert into public.fare_types (route_id, name, description, price_oneway_cents, price_round_cents, requires_document, is_default, position) values
      (v_route, 'Κανονικό', 'Δοκιμαστικός ναύλος ενηλίκων.', 1500, 2500, false, true, 0),
      (v_route, 'Παιδικό (έως 12)', 'Δοκιμαστικός παιδικός ναύλος.', 800, 1400, false, false, 1);

    insert into public.schedule_patterns (route_id, layout_id, departure_time, weekdays, valid_from, notes)
      values (v_route, v_layout, '09:00', array[0,1,2,3,4,5,6]::smallint[], current_date, 'Δοκιμαστικό πρόγραμμα — καθημερινά');

    perform public.materialize_trips(v_route, current_date, current_date + 14);
  end if;
end $$;
