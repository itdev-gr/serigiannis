import { describe, it, expect } from 'vitest';
import { PATTERN_DAYS, weekdaysFromForm, weekdaysLabel } from '@/lib/tour-patterns';

describe('weekdaysFromForm', () => {
  it('μαζεύει τα τσεκαρισμένα wd_N σε πίνακα dow', () => {
    const checked = new Set(['wd_6', 'wd_0']);
    expect(weekdaysFromForm((n) => checked.has(n))).toEqual([0, 6]);
  });

  it('κενό όταν τίποτα δεν είναι τσεκαρισμένο', () => {
    expect(weekdaysFromForm(() => false)).toEqual([]);
  });
});

describe('weekdaysLabel', () => {
  it('«Καθημερινά» για όλες τις ημέρες', () => {
    expect(weekdaysLabel([0, 1, 2, 3, 4, 5, 6])).toBe('Καθημερινά');
  });

  it('ονόματα με σειρά Δευτέρα→Κυριακή, όχι σειρά dow', () => {
    expect(weekdaysLabel([0, 6])).toBe('Κάθε Σά, Κυ');
    expect(weekdaysLabel([1])).toBe('Κάθε Δε');
  });

  it('παύλα χωρίς ημέρες', () => {
    expect(weekdaysLabel([])).toBe('—');
  });
});

describe('PATTERN_DAYS', () => {
  it('καλύπτει και τις 7 ημέρες με dow 0..6 (0=Κυριακή)', () => {
    expect(PATTERN_DAYS.map((d) => d.d).sort()).toEqual([0, 1, 2, 3, 4, 5, 6]);
    expect(PATTERN_DAYS[0]).toEqual({ d: 1, label: 'Δε' });
    expect(PATTERN_DAYS[6]).toEqual({ d: 0, label: 'Κυ' });
  });
});
