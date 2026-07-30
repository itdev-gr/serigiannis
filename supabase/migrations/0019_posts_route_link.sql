-- 0019: link ΝΕΑ announcements to a bookable excursion (deep-link CTA).
alter table public.posts
  add column if not exists route_id uuid
    references public.bus_routes(id) on delete set null;
