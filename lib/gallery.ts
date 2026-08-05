// Pure layout logic for the tour gallery — ported from findtourin's
// src/lib/gallery.ts. Decides, from the photo count, which desktop layout
// variant to render and whether the «Δείτε και τις N» pill appears.
// Framework-free so it stays unit-testable and TourGallery can stay thin.
import { imageUrl } from '@/lib/images';
import type { TourImage } from '@/types/db';

export type GalleryVariant = 'single' | 'duo' | 'trio' | 'quad' | 'hero';

export type GalleryLayout = {
  /** Desktop layout variant, chosen by photo count. */
  variant: GalleryVariant;
  /** How many photos the desktop layout renders inline; the rest live only in the lightbox. */
  visibleCount: number;
  /** Overlay the «Δείτε και τις N» pill (only meaningful in the hero variant). */
  showSeeAll: boolean;
};

/** Map a photo count (assumed ≥ 0) to its desktop gallery layout. */
export function galleryLayout(count: number): GalleryLayout {
  if (count <= 1) return { variant: 'single', visibleCount: count <= 0 ? 0 : 1, showSeeAll: false };
  if (count === 2) return { variant: 'duo', visibleCount: 2, showSeeAll: false };
  if (count === 3) return { variant: 'trio', visibleCount: 3, showSeeAll: false };
  if (count === 4) return { variant: 'quad', visibleCount: 4, showSeeAll: false };
  // 5+ → signature hero grid; extras are reachable through the lightbox.
  return { variant: 'hero', visibleCount: 5, showSeeAll: true };
}

export type GalleryImage = { url: string; alt: string };

/** A tour's photos ready for the gallery: cover first, then the rest by
 *  position, unresolvable URLs dropped. */
export function galleryImages(tour: {
  images?: TourImage[] | null;
  cover_image_id?: string | null;
  title: string;
}): GalleryImage[] {
  const all = (tour.images ?? []).slice().sort((a, b) => a.position - b.position);
  const cover = all.find((i) => i.id === tour.cover_image_id);
  const ordered = cover ? [cover, ...all.filter((i) => i.id !== cover.id)] : all;
  return ordered
    .map((image) => ({ url: imageUrl(image), alt: image.alt_el ?? tour.title }))
    .filter((i): i is GalleryImage => i.url !== null);
}
