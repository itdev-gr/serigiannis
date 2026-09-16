import type { MetadataRoute } from 'next';
import { getTours } from '@/lib/queries/tours';
import { getPosts } from '@/lib/queries/posts';
import { SITE_URL } from '@/lib/seo';

export const STATIC_ROUTES = [
  '',
  '/ekdromes',
  '/ekdromes/monoimeres',
  '/ekdromes/polyimeres',
  '/ekdromes/thalassia-mpania',
  '/ekdromes/kroyazieres',
  '/ekdromes/pezopories',
  '/ekdromes/eksoterikou',
  '/kroyazieres',
  '/enoikiaseis-poylman',
  '/epikoinonia',
  '/kratisi',
  '/istoriko-ekdromon',
  '/oroi',
  '/oroi-proypotheseis',
  '/politiki-aporritou',
  '/nea',
];

/** Η ημερομηνία τελευταίας αλλαγής μιας εγγραφής, ή η τωρινή αν λείπει ή είναι
 *  άκυρη. Το `updated_at` έρχεται ως κείμενο από τη βάση. */
export function lastModifiedOf(updatedAt: string | null | undefined, fallback: Date): Date {
  if (!updatedAt) return fallback;
  const d = new Date(updatedAt);
  return Number.isNaN(d.getTime()) ? fallback : d;
}

export default async function sitemap(): Promise<MetadataRoute.Sitemap> {
  const [tours, posts] = await Promise.all([getTours(), getPosts()]);
  const now = new Date();
  // Οι εκδρομές και τα άρθρα δηλώνουν την πραγματική τους ημερομηνία αλλαγής·
  // όταν όλα έλεγαν «άλλαξε σήμερα» η Google αγνοούσε το πεδίο εντελώς.
  return [
    ...STATIC_ROUTES.map((r) => ({ url: `${SITE_URL}${r}`, lastModified: now })),
    ...tours.map((t) => ({
      url: `${SITE_URL}/tour/${encodeURIComponent(t.slug)}`,
      lastModified: lastModifiedOf(t.updated_at, now),
    })),
    ...posts.map((p) => ({
      url: `${SITE_URL}/nea/${encodeURIComponent(p.slug)}`,
      lastModified: lastModifiedOf(p.updated_at, now),
    })),
  ];
}
