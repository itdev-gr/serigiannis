-- 0025: σύνδεση σελίδας εκδρομής με bookable εκδρομή πούλμαν (deep-link CTA).
-- Ίδιο σχήμα με το posts.route_id του 0019: προαιρετικό, και αν η εκδρομή
-- πούλμαν διαγραφεί η σελίδα μένει ζωντανή, απλώς χωρίς σύνδεση.
-- Δεν αντιγράφονται τιμές, ημερομηνίες ή θέσεις — μόνο ο δείκτης.
alter table public.tours
  add column if not exists route_id uuid
    references public.bus_routes(id) on delete set null;
