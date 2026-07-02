-- Sergiani Travel — storage bucket + seed data
-- Public-read image bucket; admin-only write (INSERT+SELECT+UPDATE needed for upsert).

insert into storage.buckets (id, name, public)
values ('tour-images','tour-images', true)
on conflict (id) do nothing;

create policy tourimg_public_read on storage.objects for select to anon, authenticated
  using (bucket_id = 'tour-images');
create policy tourimg_admin_insert on storage.objects for insert to authenticated
  with check (bucket_id = 'tour-images' and public.is_admin());
create policy tourimg_admin_update on storage.objects for update to authenticated
  using (bucket_id = 'tour-images' and public.is_admin())
  with check (bucket_id = 'tour-images' and public.is_admin());
create policy tourimg_admin_delete on storage.objects for delete to authenticated
  using (bucket_id = 'tour-images' and public.is_admin());

-- Seed the six tour categories (matches live-site taxonomy).
insert into public.categories (slug, name_el, sort_order) values
  ('monoimeres','Μονοήμερες',1),
  ('polyimeres','Πολυήμερες',2),
  ('thalassia-mpania','Θαλάσσια Μπάνια',3),
  ('kroyazieres','Κρουαζιέρες',4),
  ('pezopories','Πεζοπορίες',5),
  ('eksoterikou','Εξωτερικού',6)
on conflict (slug) do nothing;

-- Seed the singleton settings row (contact info from the live site).
insert into public.settings (id, data) values (1, jsonb_build_object(
  'phones', jsonb_build_array('210 571 2451','210 821 2452','6976 811 825'),
  'address','Π. Μελά 45, Περιστέρι 121 31',
  'email','info@sergianitravel.gr',
  'hours', jsonb_build_object('weekdays','09:00–17:00','saturday','09:00–14:00'),
  'social', jsonb_build_object(
    'facebook','https://facebook.com/sergiani.travelgr',
    'instagram','https://instagram.com/sergiani_travel',
    'youtube','https://youtube.com/@sergianitravel'
  )
)) on conflict (id) do nothing;
