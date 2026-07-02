import { describe, it, expect } from 'vitest';
import { buildSearchHref } from '@/components/home/home-search';

describe('buildSearchHref', () => {
  it('routes to the category page when a category slug is given', () => {
    expect(buildSearchHref({ category: 'monoimeres' })).toBe('/ekdromes/monoimeres');
  });
  it('routes to all excursions when no category is given', () => {
    expect(buildSearchHref({})).toBe('/ekdromes');
    expect(buildSearchHref({ category: '' })).toBe('/ekdromes');
  });
  it('routes to all excursions for the "all" sentinel', () => {
    expect(buildSearchHref({ category: 'all' })).toBe('/ekdromes');
  });
});
