-- Sergiani Travel — blog/news posts (ΝΕΑ). Reuses tour_status enum + shared functions.
create table public.posts (
  id uuid primary key default gen_random_uuid(),
  slug text unique not null,
  title text not null,
  excerpt text,
  body text not null default '',
  cover_path text,               -- path in the 'tour-images' storage bucket (reused)
  status tour_status not null default 'draft',
  seo_title text,
  seo_description text,
  published_at timestamptz,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);
create index posts_status_pub_idx on public.posts (status, published_at desc);

create trigger posts_touch before update on public.posts
  for each row execute function public.touch_updated_at();

alter table public.posts enable row level security;
-- Public reads only published posts; admins have full CRUD.
create policy posts_public_read on public.posts for select to anon, authenticated
  using (status = 'published');
create policy posts_admin_read   on public.posts for select to authenticated using (public.is_admin());
create policy posts_admin_insert on public.posts for insert to authenticated with check (public.is_admin());
create policy posts_admin_update on public.posts for update to authenticated using (public.is_admin()) with check (public.is_admin());
create policy posts_admin_delete on public.posts for delete to authenticated using (public.is_admin());
