import { describe, expect, it } from 'vitest';
import { groupRouteDates, parseBoardingPoints } from '@/lib/excursions';

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
