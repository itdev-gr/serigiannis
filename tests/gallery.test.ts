import { describe, it, expect } from 'vitest';
import { galleryImages, galleryLayout } from '@/lib/gallery';
import type { TourImage } from '@/types/db';

const img = (id: string, position: number, alt: string | null = null): TourImage => ({
  id,
  tour_id: 't1',
  storage_path: `https://cdn.example.com/${id}.jpg`,
  alt_el: alt,
  width: null,
  height: null,
  blurhash: null,
  position,
});

describe('galleryLayout', () => {
  it('0 or 1 photo → single variant, no See-all', () => {
    expect(galleryLayout(0)).toEqual({ variant: 'single', visibleCount: 0, showSeeAll: false });
    expect(galleryLayout(1)).toEqual({ variant: 'single', visibleCount: 1, showSeeAll: false });
  });

  it('2–4 photos → duo/trio/quad, all visible, no See-all', () => {
    expect(galleryLayout(2)).toEqual({ variant: 'duo', visibleCount: 2, showSeeAll: false });
    expect(galleryLayout(3)).toEqual({ variant: 'trio', visibleCount: 3, showSeeAll: false });
    expect(galleryLayout(4)).toEqual({ variant: 'quad', visibleCount: 4, showSeeAll: false });
  });

  it('5+ photos → hero grid (1 big + 4 small) with the See-all pill', () => {
    expect(galleryLayout(5)).toEqual({ variant: 'hero', visibleCount: 5, showSeeAll: true });
    expect(galleryLayout(20)).toEqual({ variant: 'hero', visibleCount: 5, showSeeAll: true });
  });
});

describe('galleryImages', () => {
  it('puts the cover first, then the rest by position', () => {
    const list = galleryImages({
      title: 'Μάνη',
      cover_image_id: 'c',
      images: [img('a', 2), img('b', 0), img('c', 1)],
    });
    expect(list.map((i) => i.url)).toEqual([
      'https://cdn.example.com/c.jpg',
      'https://cdn.example.com/b.jpg',
      'https://cdn.example.com/a.jpg',
    ]);
  });

  it('falls back to position order when no cover is set', () => {
    const list = galleryImages({ title: 'Μάνη', cover_image_id: null, images: [img('a', 1), img('b', 0)] });
    expect(list.map((i) => i.url)).toEqual(['https://cdn.example.com/b.jpg', 'https://cdn.example.com/a.jpg']);
  });

  it('uses alt_el when present and the tour title otherwise', () => {
    const list = galleryImages({ title: 'Μάνη', cover_image_id: null, images: [img('a', 0, 'Λιμένι'), img('b', 1)] });
    expect(list[0].alt).toBe('Λιμένι');
    expect(list[1].alt).toBe('Μάνη');
  });

  it('is empty when the tour has no images', () => {
    expect(galleryImages({ title: 'Μάνη', images: [], cover_image_id: null })).toEqual([]);
    expect(galleryImages({ title: 'Μάνη' })).toEqual([]);
  });
});
