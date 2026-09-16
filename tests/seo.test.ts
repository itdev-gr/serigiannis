import { describe, it, expect } from 'vitest';
import { orgJsonLd, websiteJsonLd, tourItemListJsonLd, productJsonLd, SITE_URL } from '@/lib/seo';
import { lastModifiedOf } from '@/app/sitemap';

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

describe('productJsonLd', () => {
  it('is a Product with an InStock Offer when the tour has a price', () => {
    const p = productJsonLd({
      name: 'Τήνος',
      description: 'Προσκύνημα',
      url: `${SITE_URL}/tour/tinos`,
      image: 'https://img/x.jpg',
      price: 45,
      currency: 'EUR',
      inStock: true,
      category: 'Μονοήμερες',
    });
    expect(p['@type']).toBe('Product');
    expect(p.brand).toMatchObject({ '@type': 'Brand', name: 'Sergiani Travel' });
    expect(p.image).toEqual(['https://img/x.jpg']);
    expect(p.category).toBe('Μονοήμερες');
    expect(p.offers).toMatchObject({
      '@type': 'Offer',
      price: 45,
      priceCurrency: 'EUR',
      availability: 'https://schema.org/InStock',
      url: `${SITE_URL}/tour/tinos`,
    });
  });

  it('marks closed bookings as SoldOut and omits the Offer without a price', () => {
    const closed = productJsonLd({ name: 'Ύδρα', url: '/tour/ydra', price: 30, inStock: false });
    expect(closed.offers?.availability).toBe('https://schema.org/SoldOut');
    expect(closed.offers?.priceCurrency).toBe('EUR');
    const noPrice = productJsonLd({ name: 'Ύδρα', url: '/tour/ydra', price: null });
    expect(noPrice).not.toHaveProperty('offers');
    expect(noPrice).not.toHaveProperty('image');
    expect(noPrice).not.toHaveProperty('description');
  });
});

describe('sitemap lastModifiedOf', () => {
  it('uses the row timestamp and falls back to now for missing or invalid values', () => {
    const now = new Date('2026-09-16T00:00:00Z');
    expect(lastModifiedOf('2026-08-01T10:00:00Z', now).toISOString()).toBe('2026-08-01T10:00:00.000Z');
    expect(lastModifiedOf(null, now)).toBe(now);
    expect(lastModifiedOf('not-a-date', now)).toBe(now);
  });
});
