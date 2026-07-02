import { describe, it, expect } from 'vitest';
import { orgJsonLd, websiteJsonLd, tourItemListJsonLd, SITE_URL } from '@/lib/seo';

describe('websiteJsonLd', () => {
  it('is a WebSite with the site url', () => {
    const w = websiteJsonLd();
    expect(w['@type']).toBe('WebSite');
    expect(w.url).toBe(SITE_URL);
  });
});

describe('tourItemListJsonLd', () => {
  it('builds a positioned ItemList of tour urls', () => {
    const list = tourItemListJsonLd([
      { slug: 'ydra', title: 'Ύδρα' },
      { slug: 'meteora', title: 'Μετέωρα' },
    ]);
    expect(list['@type']).toBe('ItemList');
    expect(list.itemListElement).toHaveLength(2);
    expect(list.itemListElement[0]).toMatchObject({ position: 1, url: `${SITE_URL}/tour/ydra`, name: 'Ύδρα' });
    expect(list.itemListElement[1].position).toBe(2);
  });

  it('handles an empty list', () => {
    expect(tourItemListJsonLd([]).itemListElement).toEqual([]);
  });
});

describe('orgJsonLd', () => {
  it('is a TravelAgency', () => {
    expect(orgJsonLd()['@type']).toBe('TravelAgency');
  });
});
