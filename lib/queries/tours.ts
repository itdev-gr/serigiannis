import { isDbConfigured, createServerClient } from '@/lib/supabase/server';
import { seedTours } from '@/data/seed/tours';
import type { Category, Tour, TourImage } from '@/types/db';

const SELECT = '*, categories:tour_categories(category:categories(*)), images:tour_images(*)';

/** Resolve a tour image to a URL: absolute (seed) as-is, else a Supabase Storage public URL. */
export function imageUrl(image?: TourImage | null): string | null {
  const p = image?.storage_path;
  if (!p) return null;
  if (/^https?:\/\//.test(p)) return p;
  const base = process.env.NEXT_PUBLIC_SUPABASE_URL;
  return base ? `${base}/storage/v1/object/public/tour-images/${p}` : p;
}

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
  return { ...(rest as Omit<Tour, 'categories' | 'images'>), categories, images };
}

export async function getTours(): Promise<Tour[]> {
  if (!isDbConfigured()) return seedTours;
  const sb = await createServerClient();
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
  const sb = await createServerClient();
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
