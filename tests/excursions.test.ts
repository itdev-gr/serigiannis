import { describe, expect, it } from 'vitest';
import {
  groupRouteDates,
  parseBoardingPoints,
  resolveInitialRoute,
  slugify,
  slugifyWithFallback,
  slugNeedsCleanup,
} from '@/lib/excursions';

describe('groupRouteDates', () => {
  it('groups, dedupes and sorts dates per route', () => {
    const map = groupRouteDates([
      { route_id: 'a', service_date: '2026-08-03' },
      { route_id: 'b', service_date: '2026-08-01' },
      { route_id: 'a', service_date: '2026-08-01' },
      { route_id: 'a', service_date: '2026-08-03' },
    ]);
    expect(map.get('a')).toEqual(['2026-08-01', '2026-08-03']);
    expect(map.get('b')).toEqual(['2026-08-01']);
  });

  it('returns empty map for no rows', () => {
    expect(groupRouteDates([]).size).toBe(0);
  });
});

describe('parseBoardingPoints', () => {
  it('splits lines, trims, drops empties', () => {
    expect(parseBoardingPoints('  Πλατεία Γαστούνης \n\n ΚΤΕΛ Αμαλιάδας\n')).toEqual([
      'Πλατεία Γαστούνης',
      'ΚΤΕΛ Αμαλιάδας',
    ]);
  });

  it('empty string -> empty array', () => {
    expect(parseBoardingPoints('')).toEqual([]);
  });
});

describe('resolveInitialRoute', () => {
  const excursions = [{ id: 'a' }, { id: 'b' }];

  it('returns the param when it matches a real excursion id', () => {
    expect(resolveInitialRoute(excursions, 'b')).toBe('b');
  });

  it('returns empty string when the param matches no excursion', () => {
    expect(resolveInitialRoute(excursions, 'zzz')).toBe('');
  });

  it('returns empty string for a null/empty param', () => {
    expect(resolveInitialRoute(excursions, null)).toBe('');
    expect(resolveInitialRoute(excursions, '')).toBe('');
  });
});

describe('slugify', () => {
  it('transliterates and hyphenates a Greek title', () => {
    expect(slugify('Μονοήμερη Ναύπλιο')).toBe('monoimeri-nayplio');
  });

  it('strips accents from latin too and collapses separators', () => {
    expect(slugify('  Café  du   Monde!! ')).toBe('cafe-du-monde');
  });

  it('returns empty string when nothing alphanumeric survives', () => {
    expect(slugify('—!!—')).toBe('');
    expect(slugify('')).toBe('');
  });

  it('keeps digits', () => {
    expect(slugify('Εκδρομή 2026')).toBe('ekdromi-2026');
  });
});

describe('slugifyWithFallback', () => {
  it('slugifies normally when the input has alphanumerics', () => {
    expect(slugifyWithFallback('Μονοήμερη Ναύπλιο')).toBe('monoimeri-nayplio');
  });

  it('falls back to the generic default when nothing survives', () => {
    expect(slugifyWithFallback('—!!—')).toBe('ekdromi');
    expect(slugifyWithFallback('')).toBe('ekdromi');
  });

  it('accepts a custom fallback', () => {
    expect(slugifyWithFallback('', 'tour')).toBe('tour');
  });
});

describe('slugNeedsCleanup', () => {
  it('flags uppercase and spaces', () => {
    expect(slugNeedsCleanup('THESSALONIKI DIHMERH EKDROMH')).toBe(true);
    expect(slugNeedsCleanup('ekdromi sta lixadonisia')).toBe(true);
  });

  it('accepts already-clean slugs', () => {
    expect(slugNeedsCleanup('meteora-monoimeri')).toBe(false);
    expect(slugNeedsCleanup('ekdromi-2026')).toBe(false);
  });

  it('treats an empty slug as nothing to flag', () => {
    expect(slugNeedsCleanup('')).toBe(false);
  });
});
