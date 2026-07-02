import { describe, it, expect } from 'vitest';
import { pickNewsTours } from '@/components/home/home-tours';
import type { Tour } from '@/types/db';

const t = (o: Partial<Tour>): Tour => ({
  id: 'x', slug: 'x', title: 'x', subtitle: null, summary: null, body: {},
  price_from: null, price_original: null, currency: 'EUR', duration_label: null,
  departure_note: null, meeting_point: null, status: 'published', is_featured: false,
  cover_image_id: null, seo_title: null, seo_description: null, source_url: null,
  sort_order: 0, published_at: null, categories: [], images: [], ...o,
});

describe('pickNewsTours', () => {
  it('returns the newest (highest sort_order) non-featured tours', () => {
    const tours = [
      t({ id: 'old', sort_order: 0 }),
      t({ id: 'mid', sort_order: 100 }),
      t({ id: 'new', sort_order: 253 }),
    ];
    expect(pickNewsTours(tours, 2).map((x) => x.id)).toEqual(['new', 'mid']);
  });

  it('excludes featured tours', () => {
    const tours = [
      t({ id: 'f', sort_order: 500, is_featured: true }),
      t({ id: 'a', sort_order: 10 }),
    ];
    expect(pickNewsTours(tours).map((x) => x.id)).toEqual(['a']);
  });

  it('does not mutate the input array order', () => {
    const tours = [t({ id: 'a', sort_order: 1 }), t({ id: 'b', sort_order: 9 })];
    pickNewsTours(tours);
    expect(tours.map((x) => x.id)).toEqual(['a', 'b']);
  });

  it('caps the result at the limit', () => {
    const tours = Array.from({ length: 6 }, (_, i) => t({ id: `t${i}`, sort_order: i }));
    expect(pickNewsTours(tours, 3)).toHaveLength(3);
  });
});
