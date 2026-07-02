-- Sergiani Travel — Row Level Security
-- Public reads only published content; admins (app_metadata.role='admin') have full CRUD.

-- Admin check reads the caller's own JWT app_metadata (SECURITY INVOKER by default).
create or replace function public.is_admin() returns boolean
language sql stable set search_path = '' as $$
  select coalesce((auth.jwt() -> 'app_metadata' ->> 'role') = 'admin', false);
$$;

-- tours ------------------------------------------------------------------
alter table public.tours enable row level security;
create policy tours_public_read on public.tours for select to anon, authenticated
  using (status = 'published');
create policy tours_admin_read on public.tours for select to authenticated
  using (public.is_admin());
create policy tours_admin_insert on public.tours for insert to authenticated
  with check (public.is_admin());
create policy tours_admin_update on public.tours for update to authenticated
  using (public.is_admin()) with check (public.is_admin());
create policy tours_admin_delete on public.tours for delete to authenticated
  using (public.is_admin());

-- categories -------------------------------------------------------------
alter table public.categories enable row level security;
create policy categories_public_read on public.categories for select to anon, authenticated
  using (true);
create policy categories_admin_insert on public.categories for insert to authenticated
  with check (public.is_admin());
create policy categories_admin_update on public.categories for update to authenticated
  using (public.is_admin()) with check (public.is_admin());
create policy categories_admin_delete on public.categories for delete to authenticated
  using (public.is_admin());

-- tour_categories --------------------------------------------------------
alter table public.tour_categories enable row level security;
create policy tcat_public_read on public.tour_categories for select to anon, authenticated
  using (exists (select 1 from public.tours t where t.id = tour_id and t.status = 'published'));
create policy tcat_admin_read on public.tour_categories for select to authenticated
  using (public.is_admin());
create policy tcat_admin_insert on public.tour_categories for insert to authenticated
  with check (public.is_admin());
create policy tcat_admin_update on public.tour_categories for update to authenticated
  using (public.is_admin()) with check (public.is_admin());
create policy tcat_admin_delete on public.tour_categories for delete to authenticated
  using (public.is_admin());

-- tour_images ------------------------------------------------------------
alter table public.tour_images enable row level security;
create policy timg_public_read on public.tour_images for select to anon, authenticated
  using (exists (select 1 from public.tours t where t.id = tour_id and t.status = 'published'));
create policy timg_admin_read on public.tour_images for select to authenticated
  using (public.is_admin());
create policy timg_admin_insert on public.tour_images for insert to authenticated
  with check (public.is_admin());
create policy timg_admin_update on public.tour_images for update to authenticated
  using (public.is_admin()) with check (public.is_admin());
create policy timg_admin_delete on public.tour_images for delete to authenticated
  using (public.is_admin());

-- tour_departures --------------------------------------------------------
alter table public.tour_departures enable row level security;
create policy tdep_public_read on public.tour_departures for select to anon, authenticated
  using (exists (select 1 from public.tours t where t.id = tour_id and t.status = 'published'));
create policy tdep_admin_read on public.tour_departures for select to authenticated
  using (public.is_admin());
create policy tdep_admin_insert on public.tour_departures for insert to authenticated
  with check (public.is_admin());
create policy tdep_admin_update on public.tour_departures for update to authenticated
  using (public.is_admin()) with check (public.is_admin());
create policy tdep_admin_delete on public.tour_departures for delete to authenticated
  using (public.is_admin());

-- settings ---------------------------------------------------------------
alter table public.settings enable row level security;
create policy settings_public_read on public.settings for select to anon, authenticated
  using (true);
create policy settings_admin_insert on public.settings for insert to authenticated
  with check (public.is_admin());
create policy settings_admin_update on public.settings for update to authenticated
  using (public.is_admin()) with check (public.is_admin());
