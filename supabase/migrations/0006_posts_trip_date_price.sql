-- Client feedback r1: ΝΕΑ articles announce excursions — structured excursion date
-- and per-person price (drives the online-booking live total).
alter table public.posts
  add column if not exists trip_date date,
  add column if not exists price numeric(10,2);
