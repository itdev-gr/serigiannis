import type { MetadataRoute } from 'next';
import { getPublishedSlugs } from '@/lib/queries/tours';
import { getPublishedPostSlugs } from '@/lib/queries/posts';
import { SITE_URL } from '@/lib/seo';

const STATIC_ROUTES = [
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
  '/politiki-aporritou',
  '/nea',
];

export default async function sitemap(): Promise<MetadataRoute.Sitemap> {
  const [slugs, postSlugs] = await Promise.all([getPublishedSlugs(), getPublishedPostSlugs()]);
  const now = new Date();
  return [
    ...STATIC_ROUTES.map((r) => ({ url: `${SITE_URL}${r}`, lastModified: now })),
    ...slugs.map((s) => ({ url: `${SITE_URL}/tour/${s}`, lastModified: now })),
    ...postSlugs.map((s) => ({ url: `${SITE_URL}/nea/${s}`, lastModified: now })),
  ];
}
