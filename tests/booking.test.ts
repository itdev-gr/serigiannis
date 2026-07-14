import { describe, it, expect } from 'vitest';
import { computeBookingTotal } from '@/lib/booking';

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
