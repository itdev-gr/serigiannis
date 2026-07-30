-- 0015: legacy-data fare backfill — routes created before the excursion model
-- may have no fare rows at all (e.g. one direction of a seeded pair).

-- 1) copy the full active fare set from the reverse direction when it has one
insert into public.fare_types
  (route_id, name, description, price_oneway_cents, price_round_cents,
   requires_document, is_default, position, is_active)
select r.id, f.name, f.description, f.price_oneway_cents, f.price_round_cents,
       f.requires_document, f.is_default, f.position, f.is_active
from public.bus_routes r
join public.bus_routes rev
  on rev.origin_station_id = r.destination_station_id
 and rev.destination_station_id = r.origin_station_id
join public.fare_types f on f.route_id = rev.id and f.is_active
where not exists (select 1 from public.fare_types x where x.route_id = r.id);

-- 2) any published route still without an active Κανονικό gets a zero-priced one
insert into public.fare_types
  (route_id, name, description, price_oneway_cents, price_round_cents,
   requires_document, is_default, position, is_active)
select r.id, 'Κανονικό', 'Κανονικό εισιτήριο.', 0, 0, false, true, 1, true
from public.bus_routes r
where r.status = 'published'
  and not exists (select 1 from public.fare_types x
                  where x.route_id = r.id and x.name = 'Κανονικό' and x.is_active);

-- 3) same Φοιτητικό backfill as 0013, now that Κανονικό exists everywhere
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
