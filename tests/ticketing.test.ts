import { describe, it, expect } from 'vitest';
import {
  farePriceForKind,
  formatCents,
  layoutAllSeats,
  layoutOnlineSeats,
  refundPolicyText,
  splitRoundPrice,
  sortSeatsNatural,
  nextFreeSeat,
  takenSeatNumbers,
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

describe('refundPolicyText', () => {
  it('interpolates the live booking settings, not hardcoded defaults', () => {
    expect(refundPolicyText({ refund_cutoff_hours: 100, refund_pct_early: 70, refund_pct_late: 50 })).toBe(
      'Ακύρωση έως 100 ώρες πριν την αναχώρηση: επιστροφή 70% · εντός 100 ωρών: 50%.'
    );
  });
  it('matches the historical copy for the default settings', () => {
    expect(refundPolicyText({ refund_cutoff_hours: 8, refund_pct_early: 70, refund_pct_late: 50 })).toBe(
      'Ακύρωση έως 8 ώρες πριν την αναχώρηση: επιστροφή 70% · εντός 8 ωρών: 50%.'
    );
  });
});

describe('sortSeatsNatural', () => {
  it('βάζει το 2 πριν από το 10', () => {
    expect(sortSeatsNatural(['10', '2', '1'])).toEqual(['1', '2', '10']);
  });

  it('βάζει το 12A αμέσως μετά το 12', () => {
    expect(sortSeatsNatural(['12A', '13', '12'])).toEqual(['12', '12A', '13']);
  });

  it('δεν πειράζει την είσοδο', () => {
    const input = ['3', '1'];
    sortSeatsNatural(input);
    expect(input).toEqual(['3', '1']);
  });
});

describe('nextFreeSeat', () => {
  const all = ['1', '2', '3', '4', '5'];

  it('χωρίς σημείο εκκίνησης δίνει την πρώτη ελεύθερη', () => {
    expect(nextFreeSeat(all, ['1', '2'])).toBe('3');
  });

  it('μετά από θέση δίνει την επόμενη ελεύθερη προς τα εμπρός', () => {
    expect(nextFreeSeat(all, ['1', '3'], '3')).toBe('4');
  });

  it('προσπερνά τις πιασμένες προς τα εμπρός', () => {
    expect(nextFreeSeat(all, ['2', '3', '4'], '1')).toBe('5');
  });

  it('γυρνά στην αρχή όταν δεν υπάρχει άλλη μετά', () => {
    expect(nextFreeSeat(all, ['4', '5'], '4')).toBe('1');
  });

  it('δίνει null όταν είναι όλες πιασμένες', () => {
    expect(nextFreeSeat(all, all, '2')).toBeNull();
  });

  it('αγνοεί άγνωστο σημείο εκκίνησης και ξεκινά από την αρχή', () => {
    expect(nextFreeSeat(all, ['1'], '99')).toBe('2');
  });

  it('δουλεύει με άδεια λίστα θέσεων', () => {
    expect(nextFreeSeat([], [])).toBeNull();
  });
});

describe('takenSeatNumbers', () => {
  const now = 1_700_000_000_000;

  it('μετράει μια κρατημένη θέση', () => {
    const claims = [{ seat_no: '1', claim_type: 'booked', expires_at: null }];
    expect(takenSeatNumbers(claims, now)).toEqual(['1']);
  });

  it('μετράει μια κλειδωμένη θέση', () => {
    const claims = [{ seat_no: '2', claim_type: 'blocked', expires_at: null }];
    expect(takenSeatNumbers(claims, now)).toEqual(['2']);
  });

  it('μετράει μια δέσμευση που δεν έχει λήξει', () => {
    const claims = [{ seat_no: '3', claim_type: 'hold', expires_at: new Date(now + 60_000).toISOString() }];
    expect(takenSeatNumbers(claims, now)).toEqual(['3']);
  });

  it('δεν μετράει μια δέσμευση που έχει λήξει', () => {
    const claims = [{ seat_no: '4', claim_type: 'hold', expires_at: new Date(now - 60_000).toISOString() }];
    expect(takenSeatNumbers(claims, now)).toEqual([]);
  });

  it('δίνει άδεια λίστα για άδεια είσοδο', () => {
    expect(takenSeatNumbers([], now)).toEqual([]);
  });
});
