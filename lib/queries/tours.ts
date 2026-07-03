import { isDbConfigured, createPublicClient, createServerClient } from '@/lib/supabase/server';
import { seedTours } from '@/data/seed/tours';
import { decodeEntities, decodeMaybe } from '@/lib/text';
import type { Category, Tour, TourImage } from '@/types/db';

// tours has two FKs to tour_images (images + cover_image_id), so the images
// embed must name the one-to-many FK explicitly to avoid PGRST201 ambiguity.
const SELECT =
  '*, categories:tour_categories(category:categories(*)), images:tour_images!tour_images_tour_id_fkey(*)';

export { imageUrl, coverImage } from '@/lib/images';

type RawTour = Omit<Tour, 'categories' | 'images'> & {
  categories?: { category: Category | null }[] | null;
  images?: TourImage[] | null;
};

function normalize(row: RawTour): Tour {
  const categories = (row.categories ?? [])
    .map((c) => c.category)
    .filter((c): c is Category => Boolean(c));
  const images = (row.images ?? []).slice().sort((a, b) => a.position - b.position);
  const { categories: _c, images: _i, ...rest } = row;
  void _c; void _i;
  const clean = rest as Omit<Tour, 'categories' | 'images'>;
  return {
    ...clean,
    title: decodeEntities(clean.title),
    subtitle: decodeMaybe(clean.subtitle),
    summary: decodeMaybe(clean.summary),
    duration_label: decodeMaybe(clean.duration_label),
    departure_note: decodeMaybe(clean.departure_note),
    categories,
    images,
  };
}

export async function getTours(): Promise<Tour[]> {
  if (!isDbConfigured()) return seedTours;
  const sb = createPublicClient();
  const { data, error } = await sb
    .from('tours')
    .select(SELECT)
    .eq('status', 'published')
    .order('sort_order');
  if (error) {
    console.error('getTours:', error.message);
    return [];
  }
  return ((data ?? []) as RawTour[]).map(normalize);
}

export async function getTourBySlug(slug: string): Promise<Tour | null> {
  if (!isDbConfigured()) return seedTours.find((t) => t.slug === slug) ?? null;
  const sb = createPublicClient();
  const { data, error } = await sb
    .from('tours')
    .select(SELECT)
    .eq('slug', slug)
    .eq('status', 'published')
    .maybeSingle();
  if (error) {
    console.error('getTourBySlug:', error.message);
    return null;
  }
  return data ? normalize(data as RawTour) : null;
}

export async function getFeaturedTours(): Promise<Tour[]> {
  return (await getTours()).filter((t) => t.is_featured);
}

export async function getPublishedSlugs(): Promise<string[]> {
  return (await getTours()).map((t) => t.slug);
}

/** Lightweight count for dashboard tiles (no row payload). */
export async function getPublishedTourCount(): Promise<number> {
  if (!isDbConfigured()) return 0;
  const sb = createPublicClient();
  const { count, error } = await sb
    .from('tours')
    .select('id', { count: 'exact', head: true })
    .eq('status', 'published');
  if (error) {
    console.error('getPublishedTourCount:', error.message);
    return 0;
  }
  return count ?? 0;
}

export type AdminTourRow = Pick<Tour, 'id' | 'slug' | 'title' | 'status' | 'is_featured' | 'price_from'> & {
  categories: { slug: string; name_el: string }[];
};

type RawAdminTour = Pick<Tour, 'id' | 'slug' | 'title' | 'status' | 'is_featured' | 'price_from'> & {
  tour_categories?: { category: { slug: string; name_el: string } | null }[] | null;
};

/** Admin list read (all statuses, session-scoped via RLS), with categories for filtering. */
export async function getAdminTours(): Promise<AdminTourRow[]> {
  if (!isDbConfigured()) return [];
  const sb = await createServerClient();
  const { data, error } = await sb
    .from('tours')
    .select('id, slug, title, status, is_featured, price_from, tour_categories(category:categories(slug, name_el))')
    .order('sort_order');
  if (error) {
    console.error('getAdminTours:', error.message);
    return [];
  }
  return ((data ?? []) as unknown as RawAdminTour[]).map((r) => {
    const { tour_categories, ...rest } = r;
    const categories = (tour_categories ?? [])
      .map((tc) => tc.category)
      .filter((c): c is { slug: string; name_el: string } => Boolean(c));
    return { ...rest, title: decodeEntities(rest.title), categories };
  });
}
