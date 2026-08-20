import { describe, it, expect } from 'vitest';
import {
  athensDateLabel,
  athensDateTimeLabel,
  athensShortDateTimeLabel,
  athensTimeLabel,
} from '@/lib/athens-time';

// Ο server τρέχει σε UTC (Vercel) — τα labels πρέπει να βγαίνουν ώρα Ελλάδας
// ανεξάρτητα από το TZ του περιβάλλοντος: +3 το καλοκαίρι (EEST), +2 τον χειμώνα.
describe('athens time labels', () => {
  it('καλοκαίρι: 09:17 UTC → 12:17 ώρα Ελλάδας', () => {
    const iso = '2026-08-20T09:17:00Z';
    expect(athensTimeLabel(iso)).toBe('12:17');
    expect(athensShortDateTimeLabel(iso)).toBe('20/08, 12:17');
    expect(athensDateTimeLabel(iso)).toBe('20/08/2026, 12:17');
    expect(athensDateLabel(iso)).toBe('20/8/2026');
  });

  it('χειμώνας: 23:30 UTC → 01:30 της ΕΠΟΜΕΝΗΣ μέρας ώρα Ελλάδας', () => {
    const iso = '2026-01-15T23:30:00Z';
    expect(athensTimeLabel(iso)).toBe('01:30');
    expect(athensDateLabel(iso)).toBe('16/1/2026');
  });

  it('δέχεται και ISO με offset (όπως γράφει το athensDepartureAt)', () => {
    expect(athensTimeLabel('2026-08-20T07:30:00+03:00')).toBe('07:30');
  });
});
