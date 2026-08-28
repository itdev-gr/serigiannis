import { afterEach, beforeEach, describe, expect, it } from 'vitest';
import { resolveCategoryCover, resolveCategoryCovers, resolveHeroImages } from '@/components/home/resolve-images';
import { DEFAULT_HERO_IMAGES } from '@/data/hero-images';
import { CATEGORY_COVER_IMAGES } from '@/data/category-images';
import type { SettingsData } from '@/types/db';

const base: SettingsData = {
  phones: [],
  address: '',
  email: '',
  hours: { weekdays: '', saturday: '' },
};

const SUPABASE = 'https://example.supabase.co';
const PUBLIC = `${SUPABASE}/storage/v1/object/public/tour-images/`;

describe('home images resolver', () => {
  let prev: string | undefined;
  beforeEach(() => {
    prev = process.env.NEXT_PUBLIC_SUPABASE_URL;
    process.env.NEXT_PUBLIC_SUPABASE_URL = SUPABASE;
  });
  afterEach(() => {
    if (prev === undefined) delete process.env.NEXT_PUBLIC_SUPABASE_URL;
    else process.env.NEXT_PUBLIC_SUPABASE_URL = prev;
  });

  it('falls back to the repo defaults without settings', () => {
    expect(resolveHeroImages(undefined)).toEqual(DEFAULT_HERO_IMAGES);
    expect(resolveHeroImages(base)).toEqual(DEFAULT_HERO_IMAGES);
    expect(resolveCategoryCover('monoimeres', 'Μονοήμερες', base)).toEqual(CATEGORY_COVER_IMAGES.monoimeres);
  });

  it('uses admin hero images in order with storage URLs', () => {
    const settings: SettingsData = {
      ...base,
      homeImages: { hero: [{ path: 'site/home/hero-2.jpg' }, { path: 'site/home/hero-1.jpg' }] },
    };
    expect(resolveHeroImages(settings)).toEqual([
      { src: `${PUBLIC}site/home/hero-2.jpg`, alt: 'Εικόνα 1' },
      { src: `${PUBLIC}site/home/hero-1.jpg`, alt: 'Εικόνα 2' },
    ]);
  });

  it('an empty admin hero list means the defaults', () => {
    expect(resolveHeroImages({ ...base, homeImages: { hero: [] } })).toEqual(DEFAULT_HERO_IMAGES);
  });

  it('overrides only the categories the admin uploaded', () => {
    const settings: SettingsData = {
      ...base,
      homeImages: { categories: { monoimeres: { path: 'site/home/category-monoimeres-1.jpg' } } },
    };
    expect(resolveCategoryCover('monoimeres', 'Μονοήμερες', settings)).toEqual({
      src: `${PUBLIC}site/home/category-monoimeres-1.jpg`,
      alt: 'Μονοήμερες',
    });
    expect(resolveCategoryCover('polyimeres', 'Πολυήμερες', settings)).toEqual(CATEGORY_COVER_IMAGES.polyimeres);
    expect(resolveCategoryCover('unknown', 'Άγνωστη', settings)).toBeNull();

    const covers = resolveCategoryCovers(
      [
        { slug: 'monoimeres', name_el: 'Μονοήμερες' },
        { slug: 'polyimeres', name_el: 'Πολυήμερες' },
        { slug: 'unknown', name_el: 'Άγνωστη' },
      ],
      settings,
    );
    expect(Object.keys(covers)).toEqual(['monoimeres', 'polyimeres']);
    expect(covers.monoimeres.src).toContain('site/home/category-monoimeres-1.jpg');
  });

  it('ignores admin paths when the storage base URL is missing', () => {
    delete process.env.NEXT_PUBLIC_SUPABASE_URL;
    const settings: SettingsData = {
      ...base,
      homeImages: {
        hero: [{ path: 'site/home/hero-1.jpg' }],
        categories: { monoimeres: { path: 'site/home/category-monoimeres-1.jpg' } },
      },
    };
    expect(resolveHeroImages(settings)).toEqual(DEFAULT_HERO_IMAGES);
    expect(resolveCategoryCover('monoimeres', 'Μονοήμερες', settings)).toEqual(CATEGORY_COVER_IMAGES.monoimeres);
  });
});
