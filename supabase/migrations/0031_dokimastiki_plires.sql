-- 0031: πλήρως συμπληρωμένη δοκιμαστική εκδρομή (idempotent, ΜΟΝΟ inserts).
--
-- Το 0028 είχε φτιάξει μια δοκιμαστική σελίδα εκδρομής και μια δοκιμαστική
-- εκδρομή πούλμαν, αλλά (α) η σελίδα διαγράφηκε στο μεταξύ και (β) τότε δεν
-- υπήρχαν ακόμη τα πεδία highlights / included / not_included (0030) ούτε η
-- σύνδεση με το πούλμαν. Εδώ ξαναστήνεται με ΟΛΑ συμπληρωμένα, ώστε το
-- γραφείο να βλέπει πώς δείχνει μια «γεμάτη» σελίδα.
--
-- Εφαρμογή: χειροκίνητα στο project lucwtnzdvcpcdcmfxbqp (SQL editor).
-- Ξανατρέξιμο ακίνδυνο.
--
-- ΚΑΘΑΡΙΣΜΟΣ: delete from public.tours where slug = 'dokimastiki-ekdromi';

do $$
declare
  v_tour uuid;
  v_cat uuid;
  v_img uuid;
  v_route uuid;
begin
  if exists (select 1 from public.tours where slug = 'dokimastiki-ekdromi') then
    return;
  end if;

  -- Η δοκιμαστική εκδρομή πούλμαν του 0028, για τη σύνδεση «Κλείστε Online Θέση».
  select r.id into v_route
    from public.bus_routes r
    join public.stations s on s.id = r.destination_station_id
   where s.slug = 'dokimastikos-proorismos';

  insert into public.tours (
      slug, title, subtitle, summary, status, bookings_open, is_featured,
      price_from, price_original, duration_label, departure_note,
      meeting_point, meeting_points, highlights, included, not_included,
      route_id, seo_title, seo_description, sort_order, published_at)
    values (
      'dokimastiki-ekdromi',
      'ΔΟΚΙΜΑΣΤΙΚΗ ΕΚΔΡΟΜΗ — μην κάνετε κράτηση',
      'Εσωτερική δοκιμή: όλα τα πεδία συμπληρωμένα',
      E'Η εκδρομή αυτή υπάρχει μόνο για να βλέπει το γραφείο πώς δείχνει μια πλήρως συμπληρωμένη σελίδα, με όλα τα πεδία γεμάτα.\n\nΑναχωρούμε νωρίς το πρωί από την Αθήνα και κατευθυνόμαστε προς τον προορισμό με ενδιάμεση στάση για καφέ. Ο ξεναγός μας συνοδεύει σε όλη τη διαδρομή και μοιράζεται ιστορίες για κάθε σημείο που συναντάμε.\n\nΤο απόγευμα υπάρχει ελεύθερος χρόνος για φαγητό και βόλτα, πριν πάρουμε τον δρόμο της επιστροφής. Δεν πραγματοποιείται ποτέ — αν φτάσατε εδώ κατά λάθος, δείτε τις πραγματικές μας εκδρομές στον κατάλογο.',
      'published', true, false,
      45.00, 55.00, 'Μονοήμερη · 10 ώρες', 'Κάθε Σάββατο, 07:00',
      'Sergiani Travel, Παύλου Μελά 45 (Μετρό Αγ. Αντωνίου)',
      array[
        '07:00 — Sergiani Travel, Παύλου Μελά 45 (Μετρό Αγ. Αντωνίου)',
        '07:20 — Ομόνοια, Hondos Center',
        '07:40 — Ελευσίνα, Practiker'
      ],
      array[
        'Πανοραμική θέα στον κόλπο από το κάστρο',
        'Ξενάγηση στο ιστορικό κέντρο με έμπειρο συνοδό',
        'Ελεύθερος χρόνος για φαγητό σε παραδοσιακή ταβέρνα',
        'Στάση σε γραφικό ψαροχώρι για καφέ',
        'Επίσκεψη στο τοπικό μουσείο λαϊκής τέχνης'
      ],
      array[
        'Μεταφορά με σύγχρονο κλιματιζόμενο πούλμαν',
        'Έμπειρος συνοδός καθ'' όλη τη διάρκεια',
        'Ασφάλεια αστικής ευθύνης',
        'Φόροι και διόδια'
      ],
      array[
        'Είσοδοι σε μουσεία και αρχαιολογικούς χώρους',
        'Γεύματα και ποτά',
        'Προσωπικά έξοδα',
        'Ό,τι δεν αναγράφεται στα περιλαμβανόμενα'
      ],
      v_route,
      'Δοκιμαστική εκδρομή — Sergiani Travel',
      'Δοκιμαστική σελίδα εκδρομής για εσωτερικό έλεγχο. Δεν πραγματοποιείται.',
      9999, now())
    returning id into v_tour;

  select id into v_cat from public.categories where slug = 'monoimeres';
  if v_cat is not null then
    insert into public.tour_categories (tour_id, category_id, is_primary)
      values (v_tour, v_cat, true) on conflict do nothing;
  end if;

  -- Έξι φωτογραφίες ώστε να φανεί το mosaic 1+4 ΚΑΙ το κουμπί «Δείτε και τις 6».
  insert into public.tour_images (tour_id, storage_path, alt_el, width, height, position)
  select v_tour,
         format('https://picsum.photos/seed/dokimastiki-%s/1600/1600', i),
         format('Δοκιμαστική φωτογραφία %s', i),
         1600, 1600, i - 1
    from generate_series(1, 6) as i;
  select id into v_img from public.tour_images where tour_id = v_tour order by position limit 1;
  update public.tours set cover_image_id = v_img where id = v_tour;

  insert into public.tour_price_tiers (tour_id, label, price_cents, price_original_cents, max_qty, position) values
    (v_tour, 'Το άτομο σε δίκλινο', 4500, 5500, 6, 0),
    (v_tour, 'Παιδί έως 12 ετών',   2500, null, 4, 1),
    (v_tour, 'Μονόκλινο',           6000, null, 2, 2);

  insert into public.tour_departures (tour_id, starts_on, note, capacity, is_active) values
    (v_tour, current_date + 14, 'Δοκιμαστική αναχώρηση Α (χωρίς όριο)', null, true),
    (v_tour, current_date + 21, 'Δοκιμαστική αναχώρηση Β (μόνο 2 θέσεις)', 2, true),
    (v_tour, current_date + 28, 'Δοκιμαστική αναχώρηση Γ', 20, true);
end $$;
