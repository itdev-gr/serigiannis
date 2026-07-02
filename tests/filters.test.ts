import { describe, it, expect } from 'vitest';
import { filterTours, sortTours } from '@/lib/filters';
import type { Tour } from '@/types/db';

const t = (o: Partial<Tour>): Tour => ({
  id: 'x', slug: 'x', title: 'x', subtitle: null, summary: null, body: {},
  price_from: 50, price_original: null, currency: 'EUR', duration_label: null,
  departure_note: null, meeting_point: null, status: 'published', is_featured: false,
  cover_image_id: null, seo_title: null, seo_description: null, source_url: null,
  sort_order: 0, published_at: null, ...o,
});

const cat = (slug: string): Tour['categories'] => [
  { id: slug, slug, name_el: slug, description_el: null, sort_order: 0 },
];

describe('filterTours', () => {
  it('filters by category slug', () => {
    const a = t({ id: 'a', categories: cat('kroyazieres') });
    const b = t({ id: 'b', categories: cat('monoimeres') });
    expect(filterTours([a, b], { category: 'kroyazieres' }).map((x) => x.id)).toEqual(['a']);
  });

  it('filters by price band (lte25 is exclusive of 25)', () => {
    const cheap = t({ id: 'c', price_from: 10 });
    const edge = t({ id: 'e', price_from: 25 });
    const mid = t({ id: 'm', price_from: 50 });
    expect(filterTours([cheap, edge, mid], { priceBand: 'lte25' }).map((x) => x.id)).toEqual(['c']);
    expect(filterTours([cheap, edge, mid], { priceBand: '25to75' }).map((x) => x.id)).toEqual(['e', 'm']);
  });

  it('returns all when no filter given', () => {
    const a = t({ id: 'a' }); const b = t({ id: 'b' });
    expect(filterTours([a, b], {}).length).toBe(2);
  });
});

describe('sortTours', () => {
  it('price-asc sorts ascending by price_from', () => {
    const hi = t({ id: 'h', price_from: 90 });
    const lo = t({ id: 'l', price_from: 20 });
    expect(sortTours([hi, lo], 'price-asc').map((x) => x.id)).toEqual(['l', 'h']);
  });

  it('price-desc sorts descending', () => {
    const hi = t({ id: 'h', price_from: 90 });
    const lo = t({ id: 'l', price_from: 20 });
    expect(sortTours([lo, hi], 'price-desc').map((x) => x.id)).toEqual(['h', 'l']);
  });

  it('date sorts by next_departure soonest first, nulls last', () => {
    const soon = t({ id: 's', next_departure: '2026-07-10' });
    const later = t({ id: 'z', next_departure: '2026-09-01' });
    const none = t({ id: 'n', next_departure: null });
    expect(sortTours([later, none, soon], 'date').map((x) => x.id)).toEqual(['s', 'z', 'n']);
  });

  it('popular puts featured first', () => {
    const feat = t({ id: 'f', is_featured: true });
    const plain = t({ id: 'p', is_featured: false });
    expect(sortTours([plain, feat], 'popular').map((x) => x.id)).toEqual(['f', 'p']);
  });

  it('does not mutate the input array', () => {
    const arr = [t({ id: 'a', price_from: 2 }), t({ id: 'b', price_from: 1 })];
    sortTours(arr, 'price-asc');
    expect(arr.map((x) => x.id)).toEqual(['a', 'b']);
  });
});
