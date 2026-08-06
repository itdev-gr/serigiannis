import { describe, expect, it } from 'vitest';
import { centsFromMajorUnits, paymentAmountNote } from '@/lib/payments/amount';

describe('centsFromMajorUnits', () => {
  it('μετατρέπει ευρώ σε λεπτά', () => {
    expect(centsFromMajorUnits(30)).toBe(3000);
    expect(centsFromMajorUnits(30.5)).toBe(3050);
    expect(centsFromMajorUnits(0.03)).toBe(3);
  });

  it('στρογγυλοποιεί τα δεκαδικά της κινητής υποδιαστολής', () => {
    // 170.55 * 100 = 17054.999... σε IEEE 754
    expect(centsFromMajorUnits(170.55)).toBe(17055);
  });

  it('null όταν η πύλη δεν έδωσε αριθμό', () => {
    expect(centsFromMajorUnits(null)).toBeNull();
    expect(centsFromMajorUnits(undefined)).toBeNull();
    expect(centsFromMajorUnits(Number.NaN)).toBeNull();
    expect(centsFromMajorUnits('30' as unknown as number)).toBeNull();
  });
});

describe('paymentAmountNote', () => {
  it('καμία σημείωση όταν το ποσό ταιριάζει', () => {
    expect(paymentAmountNote(3000, 3000)).toBeNull();
  });

  it('καμία σημείωση όταν δεν υπάρχει ποσό να συγκριθεί', () => {
    expect(paymentAmountNote(3000, null)).toBeNull();
  });

  it('σημειώνει την υποχρέωση με τα δύο ποσά σε ευρώ', () => {
    const note = paymentAmountNote(30000, 3000);
    expect(note).toContain('30,00');
    expect(note).toContain('300,00');
    expect(note).toContain('ΑΣΥΜΦΩΝΙΑ ΠΟΣΟΥ');
  });

  it('πιάνει και τη μεγαλύτερη χρέωση', () => {
    expect(paymentAmountNote(1000, 1500)).toContain('ΑΣΥΜΦΩΝΙΑ ΠΟΣΟΥ');
  });
});
