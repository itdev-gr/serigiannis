import { describe, it, expect } from 'vitest';
import {
  bookableDepartures,
  buildOrderItems,
  centsToEuroInput,
  clampQty,
  departureLabel,
  formatCents,
  headlinePrice,
  isBookable,
  itemsPartySize,
  itemsTotalCents,
  parseEuroToCents,
  passengerLabels,
} from '@/lib/booking';
import type { TourDeparture, TourOrderItem, TourPriceTier } from '@/types/db';

const tier = (over: Partial<TourPriceTier> & { id: string }): TourPriceTier => ({
  tour_id: 't1',
  label: 'Κατηγορία',
  price_cents: 10000,
  price_original_cents: null,
  max_qty: 20,
  position: 0,
  is_active: true,
  ...over,
});

const departure = (over: Partial<TourDeparture> & { id: string; starts_on: string }): TourDeparture => ({
  tour_id: 't1',
  ends_on: null,
  note: null,
  capacity: null,
  is_active: true,
  ...over,
});

describe('clampQty', () => {
  it('floors into 0…max', () => {
    expect(clampQty('3', 20)).toBe(3);
    expect(clampQty(25, 20)).toBe(20);
    expect(clampQty(-2, 20)).toBe(0);
    expect(clampQty('', 20)).toBe(0);
    expect(clampQty('abc', 20)).toBe(0);
    expect(clampQty('2.7', 20)).toBe(2);
  });
});

describe('buildOrderItems', () => {
  const tiers = [
    tier({ id: 'a', label: 'Δίκλινο', price_cents: 17000, position: 0 }),
    tier({ id: 'b', label: 'Παιδί', price_cents: 8000, position: 1 }),
  ];

  it('keeps only chosen tiers, in tier order', () => {
    const items = buildOrderItems(tiers, { b: 2, a: 1 });
    expect(items.map((i) => i.tier_id)).toEqual(['a', 'b']);
    expect(items[1].line_cents).toBe(16000);
  });

  it('totals and counts people', () => {
    const items = buildOrderItems(tiers, { a: 2, b: 1 });
    expect(itemsTotalCents(items)).toBe(42000);
    expect(itemsPartySize(items)).toBe(3);
  });

  it('drops zero and over-max quantities to the allowed range', () => {
    const items = buildOrderItems([tier({ id: 'a', max_qty: 2, price_cents: 5000 })], { a: 9 });
    expect(items[0].qty).toBe(2);
    expect(buildOrderItems(tiers, { a: 0, b: 0 })).toEqual([]);
  });
});

describe('headlinePrice', () => {
  it('uses the FIRST active tier by position (την κανονική) and its «πριν» price', () => {
    const h = headlinePrice([
      tier({ id: 'a', price_cents: 17000, price_original_cents: 20000, position: 0 }),
      tier({ id: 'b', price_cents: 25000, position: 1 }),
    ]);
    expect(h).toEqual({ cents: 17000, originalCents: 20000 });
  });

  // Βρέθηκε στο ζωντανό site: εκδρομή 10 € με παιδικό 5 € έδειχνε «από 5 €» —
  // η επικεφαλίδα είναι η κανονική τιμή, όχι η φθηνότερη έκπτωση.
  it('δεν διαλέγει το φθηνότερο παιδικό αντί της κανονικής, ακόμη και με ανακατεμένη σειρά', () => {
    const h = headlinePrice([
      tier({ id: 'child', label: 'Παιδικό έως 9 ετών', price_cents: 500, price_original_cents: 1200, position: 1 }),
      tier({ id: 'adult', label: 'Κανονικό', price_cents: 1000, price_original_cents: 1200, position: 0 }),
    ]);
    expect(h).toEqual({ cents: 1000, originalCents: 1200 });
  });

  it('ignores a «πριν» price that is not higher', () => {
    expect(headlinePrice([tier({ id: 'a', price_cents: 17000, price_original_cents: 17000 })])).toEqual({
      cents: 17000,
      originalCents: null,
    });
  });

  it('is null without active tiers', () => {
    expect(headlinePrice([])).toBeNull();
    expect(headlinePrice([tier({ id: 'a', is_active: false })])).toBeNull();
  });
});

describe('bookableDepartures', () => {
  it('drops past and inactive dates and sorts ascending', () => {
    const list = bookableDepartures(
      [
        departure({ id: '1', starts_on: '2026-09-01' }),
        departure({ id: '2', starts_on: '2026-07-01' }),
        departure({ id: '3', starts_on: '2026-08-20', is_active: false }),
        departure({ id: '4', starts_on: '2026-08-04' }),
      ],
      '2026-08-04'
    );
    expect(list.map((d) => d.id)).toEqual(['4', '1']);
  });
});

describe('departureLabel', () => {
  it('shows a range and the note when present', () => {
    expect(departureLabel({ starts_on: '2026-08-04', ends_on: null, note: null })).toContain('2026');
    const range = departureLabel({ starts_on: '2026-08-04', ends_on: '2026-08-07', note: '4 ημέρες' });
    expect(range).toContain('–');
    expect(range).toContain('4 ημέρες');
  });
});

describe('euro parsing', () => {
  it('reads Greek and plain formats', () => {
    expect(parseEuroToCents('170')).toBe(17000);
    expect(parseEuroToCents('170,50')).toBe(17050);
    expect(parseEuroToCents('170.50')).toBe(17050);
    expect(parseEuroToCents('1.250,00 €')).toBe(125000);
    expect(parseEuroToCents('1,250.00')).toBe(125000);
  });

  it('is null for empty or invalid input', () => {
    expect(parseEuroToCents('')).toBeNull();
    expect(parseEuroToCents(null)).toBeNull();
    expect(parseEuroToCents('—')).toBeNull();
  });

  it('round-trips through the admin input', () => {
    expect(parseEuroToCents(centsToEuroInput(17050))).toBe(17050);
    expect(centsToEuroInput(null)).toBe('');
  });
});

describe('isBookable', () => {
  it('open + tiers → true', () => {
    expect(isBookable({ bookings_open: true }, [tier({ id: 'a' })])).toBe(true);
  });

  it('closed + tiers → false', () => {
    expect(isBookable({ bookings_open: false }, [tier({ id: 'a' })])).toBe(false);
  });

  it('open + no tiers → false', () => {
    expect(isBookable({ bookings_open: true }, [])).toBe(false);
  });

  it('undefined bookings_open + tiers → true (seed rows without the column)', () => {
    expect(isBookable({}, [tier({ id: 'a' })])).toBe(true);
  });
});

describe('passengerLabels', () => {
  const item = (over: Partial<TourOrderItem> & { label: string; qty: number }): TourOrderItem => ({
    tier_id: 't',
    unit_cents: 0,
    line_cents: 0,
    ...over,
  });

  it('expands each item’s qty into labelled rows, in order', () => {
    const labels = passengerLabels({
      items: [item({ label: 'Δίκλινο', qty: 2 }), item({ label: 'Παιδί', qty: 1 })],
      party_size: 3,
    });
    expect(labels).toEqual(['Δίκλινο 1', 'Δίκλινο 2', 'Παιδί 1']);
  });

  it('falls back to «Ταξιδιώτης N» from party_size when items is empty', () => {
    expect(passengerLabels({ items: [], party_size: 3 })).toEqual(['Ταξιδιώτης 1', 'Ταξιδιώτης 2', 'Ταξιδιώτης 3']);
  });

  it('is empty for party_size 0 and no items', () => {
    expect(passengerLabels({ items: [], party_size: 0 })).toEqual([]);
  });
});

describe('formatCents', () => {
  it('formats euro amounts with two decimals', () => {
    expect(formatCents(17000)).toMatch(/^170[.,]00\s?€$/);
    expect(formatCents(0)).toMatch(/^0[.,]00\s?€$/);
  });
});
