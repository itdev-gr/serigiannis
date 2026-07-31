import { describe, expect, it } from 'vitest';
import { athensDepartureAt } from '@/lib/athens-time';

describe('athensDepartureAt', () => {
  it('uses +03:00 for summer (EEST) dates', () => {
    expect(athensDepartureAt('2026-07-15', '09:00')).toBe('2026-07-15T09:00:00+03:00');
  });

  it('uses +02:00 for winter (EET) dates', () => {
    expect(athensDepartureAt('2026-01-15', '09:00')).toBe('2026-01-15T09:00:00+02:00');
  });

  it('handles the spring-forward day (EU DST starts 2026-03-29 03:00)', () => {
    expect(athensDepartureAt('2026-03-29', '12:00')).toBe('2026-03-29T12:00:00+03:00');
  });

  it('handles the fall-back day (EU DST ends 2026-10-25 04:00)', () => {
    expect(athensDepartureAt('2026-10-25', '12:00')).toBe('2026-10-25T12:00:00+02:00');
  });
});
