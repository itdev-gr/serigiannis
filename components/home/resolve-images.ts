import type { SettingsData } from '@/types/db';
import { DEFAULT_HERO_IMAGES } from '@/data/hero-images';
import { categoryCoverImage } from '@/data/category-images';
import { storageUrl } from '@/lib/images';

export type HomeImage = { src: string; alt: string };

/** Hero slideshow: οι εικόνες που ανέβασε ο admin (με σειρά), αλλιώς οι
 *  προεπιλεγμένες του repo. Paths που δεν μπορούν να γίνουν URL (π.χ. λείπει
 *  το NEXT_PUBLIC_SUPABASE_URL) αγνοούνται. */
export function resolveHeroImages(settings?: SettingsData): HomeImage[] {
  const admin = (settings?.homeImages?.hero ?? [])
    .map((h) => storageUrl(h.path))
    .filter((src): src is string => !!src)
    .map((src, i) => ({ src, alt: `Εικόνα ${i + 1}` }));
  return admin.length > 0 ? admin : [...DEFAULT_HERO_IMAGES];
}

/** Εξώφυλλο κάρτας κατηγορίας: admin → στατική προεπιλογή → null (οπότε η
 *  σελίδα δανείζεται το εξώφυλλο μιας εκδρομής της κατηγορίας). */
export function resolveCategoryCover(
  slug: string,
  fallbackAlt: string,
  settings?: SettingsData,
): HomeImage | null {
  const src = storageUrl(settings?.homeImages?.categories?.[slug]?.path);
  if (src) return { src, alt: fallbackAlt };
  return categoryCoverImage(slug);
}

/** Όλα τα resolved εξώφυλλα για τις κατηγορίες της αρχικής, keyed by slug
 *  (σειριοποιήσιμο, για να περάσει ως prop). */
export function resolveCategoryCovers(
  categories: { slug: string; name_el: string }[],
  settings?: SettingsData,
): Record<string, HomeImage> {
  const out: Record<string, HomeImage> = {};
  for (const cat of categories) {
    const cover = resolveCategoryCover(cat.slug, cat.name_el, settings);
    if (cover) out[cat.slug] = cover;
  }
  return out;
}
