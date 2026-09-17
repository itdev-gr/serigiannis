-- 0041: μεταφορά της «πατέντας» ΔΕΝ ΕΠΙΤΡΕΠΟΝΤΑΙ από τα «Δεν περιλαμβάνονται»
-- στη νέα λίστα not_allowed (0040).
--
-- ΓΙΑΤΙ: πριν υπάρξει η λίστα «Δεν επιτρέπονται», το γραφείο είχε βάλει μέσα
-- στα «Δεν περιλαμβάνονται» τις γραμμές «⊗ ΔΕΝ ΕΠΙΤΡΕΠΟΝΤΑΙ ΣΤΟ ΠΟΥΛΜΑΝ»,
-- «- Κατοικίδια.», «- Κάπνισμα.», «- Φαγητό / καφές.» ως έτοιμα κείμενα, και
-- 54 εκδρομές τις έχουν τσεκαρισμένες. Χωρίς μεταφορά θα εμφανίζονταν διπλά.
--
-- Backup: ο πίνακας public.tours_not_included_backup_20260917 (id, slug,
-- not_included, not_allowed) φτιάχτηκε ΠΡΙΝ την αλλαγή, 17/9/2026 — για
-- επαναφορά: update tours t set not_included=b.not_included,
-- not_allowed=b.not_allowed from tours_not_included_backup_20260917 b where b.id=t.id.
--
-- Εφαρμογή: ΧΕΙΡΟΚΙΝΗΤΑ στο project lucwtnzdvcpcdcmfxbqp (SQL editor).
-- Ξανατρέξιμο ακίνδυνο (δεύτερη φορά δεν βρίσκει τίποτα να αλλάξει).
-- Οι δημόσιες σελίδες εκδρομών ανανεώνονται μόνες τους μέσα σε 1 ώρα (ISR).

with w as (
  select id,
    array(
      select x from unnest(not_included) x
      where not (x ilike '%ΔΕΝ ΕΠΙΤΡΕΠΟΝΤΑΙ%' or x ilike '- Κατοικίδια%' or x ilike '- Κάπνισμα%' or x ilike '- Φαγητό%')
    ) as ni,
    array_remove(array[
      case when exists (select 1 from unnest(not_included) x where x ilike '- Κατοικίδια%') then 'Κατοικίδια' end,
      case when exists (select 1 from unnest(not_included) x where x ilike '- Κάπνισμα%') then 'Κάπνισμα στο πούλμαν' end,
      case when exists (select 1 from unnest(not_included) x where x ilike '- Φαγητό%') then 'Φαγητό - καφές στο πούλμαν' end
    ]::text[], null) as na
  from public.tours
  where exists (
    select 1 from unnest(not_included) x
    where x ilike '%ΔΕΝ ΕΠΙΤΡΕΠΟΝΤΑΙ%' or x ilike '- Κατοικίδια%' or x ilike '- Κάπνισμα%' or x ilike '- Φαγητό%'
  )
)
update public.tours t
set not_included = w.ni,
    not_allowed = t.not_allowed || array(select v from unnest(w.na) v where not (v = any(t.not_allowed))),
    updated_at = now()
from w
where w.id = t.id;

-- Τα παλιά έτοιμα κείμενα της πατέντας δεν χρειάζονται πια (τα νέα είναι στο
-- είδος not_allowed, 0040).
delete from public.tour_presets
where kind = 'not_included'
  and (label ilike '%ΔΕΝ ΕΠΙΤΡΕΠΟΝΤΑΙ%' or label ilike '- Κατοικίδια%' or label ilike '- Κάπνισμα%' or label ilike '- Φαγητό%');

-- Έλεγχος: περιμένουμε still_workaround = 0 και tours_with_not_allowed >= 54.
select
  (select count(*) from public.tours where exists (
     select 1 from unnest(not_included) x
     where x ilike '%ΔΕΝ ΕΠΙΤΡΕΠΟΝΤΑΙ%' or x ilike '- Κατοικίδια%' or x ilike '- Κάπνισμα%' or x ilike '- Φαγητό%')) as still_workaround,
  (select count(*) from public.tours where cardinality(not_allowed) > 0) as tours_with_not_allowed;
