import type { TourImage } from '@/types/db';

/** Resolve a tour image to a URL: absolute (interim/seed) as-is, else a Supabase Storage public URL. */
export function imageUrl(image?: TourImage | null): string | null {
  const p = image?.storage_path;
  if (!p) return null;
  if (/^https?:\/\//.test(p)) return p;
  const base = process.env.NEXT_PUBLIC_SUPABASE_URL;
  return base ? `${base}/storage/v1/object/public/tour-images/${p}` : p;
}

/** The cover image for a tour (explicit cover, else first by position). */
export function coverImage(
  tour: { images?: TourImage[] | null; cover_image_id?: string | null }
): TourImage | null {
  const imgs = tour.images ?? [];
  if (imgs.length === 0) return null;
  return imgs.find((i) => i.id === tour.cover_image_id) ?? imgs[0];
}
