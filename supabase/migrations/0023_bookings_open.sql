-- 0023: «κλειστή για κρατήσεις» — η εκδρομή μένει ορατή στο site αλλά δεν
-- δέχεται κρατήσεις. Ζητήθηκε από το γραφείο (feedback Αυγούστου 2026).
alter table public.tours
  add column if not exists bookings_open boolean not null default true;
