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
-- Rename first, then deactivate everything else, then backfill routes
-- that have no Φοιτητικό row (price copied from Κανονικό until admin edits).
update public.fare_types
   set name = 'Φοιτητικό',
       description = 'Φοιτητές με επίδειξη ακαδημαϊκής ταυτότητας (πάσο).'
 where name = 'Φοιτητικό/Στρατιωτικό';

update public.fare_types set is_active = false
 where name not in ('Κανονικό', 'Φοιτητικό');

insert into public.fare_types
  (route_id, name, description, price_oneway_cents, price_round_cents,
   requires_document, is_default, position, is_active)
select k.route_id, 'Φοιτητικό',
       'Φοιτητές με επίδειξη ακαδημαϊκής ταυτότητας (πάσο).',
       k.price_oneway_cents, k.price_round_cents, true, false, k.position + 1, true
from public.fare_types k
where k.name = 'Κανονικό' and k.is_active
  and not exists (
    select 1 from public.fare_types f
    where f.route_id = k.route_id and f.name = 'Φοιτητικό');
