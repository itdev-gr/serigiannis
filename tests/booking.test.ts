import { describe, it, expect } from 'vitest';
import { computeBookingTotal, tourRouteCta } from '@/lib/booking';

describe('computeBookingTotal', () => {
  it('multiplies seats by price', () => {
    expect(computeBookingTotal('3', 25)).toBe(75);
  });
  it('rounds to cents', () => {
    expect(computeBookingTotal('3', 33.335)).toBe(100.01);
  });
  it('returns null without a price', () => {
    expect(computeBookingTotal('3', null)).toBeNull();
    expect(computeBookingTotal('3', undefined)).toBeNull();
    expect(computeBookingTotal('3', 0)).toBeNull();
  });
  it('returns null for non-numeric or <1 seats', () => {
    expect(computeBookingTotal('', 25)).toBeNull();
    expect(computeBookingTotal('abc', 25)).toBeNull();
    expect(computeBookingTotal('0', 25)).toBeNull();
  });
});

describe('tourRouteCta', () => {
  const base = { routeId: 'r-1', routePublished: true, hasActiveTiers: false, bookingsOpen: true };

  it('κύριο κουμπί όταν η εκδρομή δεν πουλάει με κατηγορίες τιμών', () => {
    expect(tourRouteCta(base)).toEqual({ href: '/eisitiria?ekdromi=r-1', primary: true });
  });

  it('δευτερεύων σύνδεσμος όταν υπάρχει ήδη κουτί κράτησης', () => {
    expect(tourRouteCta({ ...base, hasActiveTiers: true })).toEqual({
      href: '/eisitiria?ekdromi=r-1',
      primary: false,
    });
  });

  it('τίποτα χωρίς σύνδεση', () => {
    expect(tourRouteCta({ ...base, routeId: null })).toBeNull();
  });

  it('τίποτα όταν το δρομολόγιο είναι πρόχειρο', () => {
    expect(tourRouteCta({ ...base, routePublished: false })).toBeNull();
  });

  it('τίποτα όταν η εκδρομή είναι κλειστή για κρατήσεις', () => {
    expect(tourRouteCta({ ...base, bookingsOpen: false })).toBeNull();
    expect(tourRouteCta({ ...base, hasActiveTiers: true, bookingsOpen: false })).toBeNull();
  });
});
