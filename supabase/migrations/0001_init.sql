-- Sergiani Travel — initial schema
-- Tables: categories, tours, tour_categories, tour_images, tour_departures, settings

create type tour_status as enum ('draft','published','hidden','archived');

create table public.categories (
  id uuid primary key default gen_random_uuid(),
  slug text unique not null,
  name_el text not null,
  description_el text,
  sort_order int not null default 0,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create table public.tours (
  id uuid primary key default gen_random_uuid(),
  slug text unique not null,
  title text not null,
  subtitle text,
  summary text,
  body jsonb not null default '{}'::jsonb,
  price_from numeric(10,2),
  price_original numeric(10,2),
  currency text not null default 'EUR',
  duration_label text,
  departure_note text,
  meeting_point text,
  status tour_status not null default 'draft',
  is_featured boolean not null default false,
  cover_image_id uuid,
  seo_title text,
  seo_description text,
  source_url text,
  sort_order int not null default 0,
  published_at timestamptz,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create table public.tour_categories (
  tour_id uuid not null references public.tours(id) on delete cascade,
  category_id uuid not null references public.categories(id) on delete cascade,
  is_primary boolean not null default false,
  primary key (tour_id, category_id)
);

create table public.tour_images (
  id uuid primary key default gen_random_uuid(),
  tour_id uuid not null references public.tours(id) on delete cascade,
  storage_path text not null,
  alt_el text,
  width int,
  height int,
  blurhash text,
  position int not null default 0,
  created_at timestamptz not null default now()
);

alter table public.tours
  add constraint tours_cover_image_fk
  foreign key (cover_image_id) references public.tour_images(id) on delete set null;

create table public.tour_departures (
  id uuid primary key default gen_random_uuid(),
  tour_id uuid not null references public.tours(id) on delete cascade,
  starts_on date not null,
  ends_on date,
  price_override numeric(10,2),
  note text,
  capacity int
);

create table public.settings (
  id int primary key default 1,
  data jsonb not null default '{}'::jsonb,
  updated_at timestamptz not null default now(),
  constraint settings_singleton check (id = 1)
);

create index tours_status_pub_idx on public.tours (status, published_at desc);
create index tours_featured_idx on public.tours (is_featured) where is_featured;
create index tour_categories_cat_idx on public.tour_categories (category_id);
create index tour_images_tour_pos_idx on public.tour_images (tour_id, position);
create index tour_departures_tour_date_idx on public.tour_departures (tour_id, starts_on);

create or replace function public.touch_updated_at() returns trigger
language plpgsql set search_path = '' as $$
begin
  new.updated_at = now();
  return new;
end $$;

create trigger tours_touch before update on public.tours
  for each row execute function public.touch_updated_at();
create trigger categories_touch before update on public.categories
  for each row execute function public.touch_updated_at();
create trigger settings_touch before update on public.settings
  for each row execute function public.touch_updated_at();
