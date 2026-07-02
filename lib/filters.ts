import type { Tour } from '@/types/db';

export const PRICE_BANDS = {
  lte25: [0, 25],
  '25to75': [25, 75],
  gte75: [75, Infinity],
} as const;

export type PriceBand = keyof typeof PRICE_BANDS;
export type SortKey = 'popular' | 'price-asc' | 'price-desc' | 'date';

export const PRICE_BAND_LABELS: Record<PriceBand, string> = {
  lte25: 'Έως 25€',
  '25to75': '25–75€',
  gte75: '75€+',
};

export function filterTours(
  tours: Tour[],
  f: { category?: string; priceBand?: PriceBand }
): Tour[] {
  return tours.filter((t) => {
    if (f.category && !(t.categories ?? []).some((c) => c.slug === f.category)) return false;
    if (f.priceBand) {
      const [lo, hi] = PRICE_BANDS[f.priceBand];
      const p = t.price_from ?? 0;
      if (p < lo || p >= hi) return false;
    }
    return true;
  });
}

export function sortTours(tours: Tour[], key: SortKey): Tour[] {
  const arr = [...tours];
  switch (key) {
    case 'price-asc':
      return arr.sort((a, b) => (a.price_from ?? 0) - (b.price_from ?? 0));
    case 'price-desc':
      return arr.sort((a, b) => (b.price_from ?? 0) - (a.price_from ?? 0));
    case 'date':
      return arr.sort((a, b) => {
        const da = a.next_departure;
        const db = b.next_departure;
        if (!da && !db) return 0;
        if (!da) return 1;
        if (!db) return -1;
        return da < db ? -1 : da > db ? 1 : 0;
      });
    case 'popular':
    default:
      return arr.sort((a, b) => Number(b.is_featured) - Number(a.is_featured));
  }
}
