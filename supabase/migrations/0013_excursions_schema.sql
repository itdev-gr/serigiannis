-- 0013: excursion-mode booking — routes become excursions.
-- (client request 2026-07-30: excursion picker, meeting points,
--  Κανονικό/Φοιτητικό only, per-passenger phone)

alter table public.bus_routes
  add column if not exists title text,
  add column if not exists boarding_points text[] not null default '{}';

alter table public.ticket_orders
  add column if not exists boarding_point text;

alter table public.tickets
  add column if not exists passenger_phone text;

-- Fare catalogue: exactly two public categories (Κανονικό / Φοιτητικό).
update public.fare_types set is_active = false
 where name in ('Μισό/Φοιτητικό', 'Δωρεάν');

update public.fare_types
   set name = 'Φοιτητικό',
       description = 'Φοιτητές με επίδειξη ακαδημαϊκής ταυτότητας (πάσο).'
 where name = 'Φοιτητικό/Στρατιωτικό';
