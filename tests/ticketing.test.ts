import { describe, it, expect } from 'vitest';
import {
  farePriceForKind,
  formatCents,
  layoutAllSeats,
  layoutOnlineSeats,
  splitRoundPrice,
} from '@/lib/ticketing';
import type { LayoutJson } from '@/types/ticketing';

describe('splitRoundPrice', () => {
  it('splits an even round fare in half', () => {
    expect(splitRoundPrice(8000)).toEqual({ outbound: 4000, ret: 4000 });
  });
  it('gives the extra cent to the outbound leg', () => {
    expect(splitRoundPrice(9999)).toEqual({ outbound: 5000, ret: 4999 });
  });
  it('legs always sum to the round fare', () => {
    for (const cents of [0, 1, 2, 5001, 7777]) {
      const { outbound, ret } = splitRoundPrice(cents);
      expect(outbound + ret).toBe(cents);
      expect(outbound).toBeGreaterThanOrEqual(ret);
    }
  });
});

describe('farePriceForKind', () => {
  const fare = { price_oneway_cents: 5000, price_round_cents: 8000 };
  it('uses the one-way price for oneway', () => {
    expect(farePriceForKind(fare, 'oneway')).toBe(5000);
  });
  it('uses the round price for round and open_return', () => {
    expect(farePriceForKind(fare, 'round')).toBe(8000);
    expect(farePriceForKind(fare, 'open_return')).toBe(8000);
  });
});

describe('formatCents', () => {
  it('formats Greek euros', () => {
    expect(formatCents(5000)).toBe('50,00 €');
    expect(formatCents(2550)).toBe('25,50 €');
    expect(formatCents(0)).toBe('0,00 €');
  });
});

describe('layout seat extraction', () => {
  const layout: LayoutJson = {
    decks: [
      {
        name: 'ΚΑΤΩ',
        rows: 2,
        cols: 3,
        cells: [
          { r: 0, c: 0, type: 'seat', seat: '1', online: false },
          { r: 0, c: 1, type: 'aisle' },
          { r: 0, c: 2, type: 'seat', seat: '9' },
          { r: 1, c: 0, type: 'driver' },
          { r: 1, c: 2, type: 'seat', seat: '10', online: true },
        ],
      },
      {
        name: 'ΕΠΑΝΩ',
        rows: 1,
        cols: 3,
        cells: [{ r: 0, c: 0, type: 'seat', seat: '21', online: true }],
      },
    ],
  };

  it('collects all seats across decks', () => {
    expect(layoutAllSeats(layout).sort()).toEqual(['1', '10', '21', '9']);
  });
  it('excludes offline seats from online sale', () => {
    expect(layoutOnlineSeats(layout).sort()).toEqual(['10', '21', '9']);
  });
  it('treats missing online flag as sellable', () => {
    expect(layoutOnlineSeats(layout)).toContain('9');
  });
});
