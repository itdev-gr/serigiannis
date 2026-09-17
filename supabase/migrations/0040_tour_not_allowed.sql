-- 0040: «Δεν επιτρέπονται» ανά εκδρομή (tours.not_allowed) + έτοιμα κείμενα.
--
-- ΓΙΑΤΙ: ο πελάτης ζήτησε (17/9/2026) μια τρίτη λίστα δίπλα στα
-- «Περιλαμβάνονται / Δεν περιλαμβάνονται»: τι ΔΕΝ επιτρέπεται στην εκδρομή
-- (κατοικίδια, κάπνισμα, φαγητό στο πούλμαν). Είναι άλλο πράγμα από το «δεν
-- περιλαμβάνεται στην τιμή», οπότε δεν ανακατεύεται με εκείνη τη λίστα: νέα
-- στήλη ίδιου σχήματος με τις τρεις του 0030 (text[], ο ίδιος parser) και νέο
-- είδος στα έτοιμα κείμενα (0033), ώστε το γραφείο να τα τσεκάρει ανά εκδρομή.
--
-- Εφαρμογή: ΧΕΙΡΟΚΙΝΗΤΑ στο project lucwtnzdvcpcdcmfxbqp (SQL editor), ΠΡΙΝ
-- το push — αλλιώς η αποθήκευση εκδρομής στο admin σπάει (άγνωστη στήλη) και
-- η καρτέλα «Έτοιμα κείμενα» δεν δέχεται το νέο είδος. Ξανατρέξιμο ακίνδυνο.

alter table public.tours
  add column if not exists not_allowed text[] not null default '{}';

-- Το check του kind ξαναγράφεται με το νέο είδος. Το όνομα του constraint
-- είναι το αυτόματο του Postgres για inline check σε στήλη (0033).
alter table public.tour_presets drop constraint if exists tour_presets_kind_check;
alter table public.tour_presets
  add constraint tour_presets_kind_check
  check (kind in ('meeting_point', 'included', 'not_included', 'not_allowed'));

-- Τα κείμενα που έστειλε το γραφείο. Το «Προσωπικά έξοδα» έλειπε από τα
-- «Δεν περιλαμβάνονται» του 0033.
insert into public.tour_presets (kind, label, sort_order) values
  ('not_included', 'Προσωπικά έξοδα', 3),
  ('not_allowed', 'Κατοικίδια', 0),
  ('not_allowed', 'Κάπνισμα στο πούλμαν', 1),
  ('not_allowed', 'Φαγητό - καφές στο πούλμαν', 2)
on conflict (kind, label) do nothing;
