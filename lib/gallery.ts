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

/** Map a photo count (assumed ≥ 0) to its desktop gallery layout.
 *  1 → μία· 2 → δύο· 3 → τρεις στήλες· 4 → τέσσερις στήλες· 5+ → το mosaic με τη
 *  μεγάλη αριστερά και 2×2 μικρές δεξιά. Έτσι δεν μένει ποτέ κενό κελί.
 *  Το κουμπί εμφανίζεται ΜΟΝΟ όταν μένουν φωτογραφίες κρυμμένες, δηλαδή από 6+. */
export function galleryLayout(count: number): GalleryLayout {
  const layout = (variant: GalleryVariant, visibleCount: number): GalleryLayout => ({
    variant,
    visibleCount,
    showSeeAll: count > visibleCount,
  });
  if (count <= 0) return layout('single', 0);
  if (count === 1) return layout('single', 1);
  if (count === 2) return layout('duo', 2);
  if (count === 3) return layout('trio', 3);
  if (count === 4) return layout('quad', 4);
  return layout('hero', 5);
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
