import { describe, it, expect } from 'vitest';
import { durationUnit, splitDuration, toMinutes } from '@/lib/duration';

describe('splitDuration — λεπτά στη μεγαλύτερη ακέραια μονάδα', () => {
  it('2880 λεπτά είναι 2 μέρες', () => {
    expect(splitDuration(2880)).toEqual({ value: 2, unit: 'day' });
  });

  it('120 λεπτά είναι 2 ώρες', () => {
    expect(splitDuration(120)).toEqual({ value: 2, unit: 'hour' });
  });

  it('90 λεπτά μένουν λεπτά — δεν σπάνε σε 1,5 ώρα', () => {
    expect(splitDuration(90)).toEqual({ value: 90, unit: 'min' });
  });

  it('κενή διάρκεια δίνει άδειο πεδίο σε λεπτά', () => {
    expect(splitDuration(null)).toEqual({ value: '', unit: 'min' });
    expect(splitDuration(undefined)).toEqual({ value: '', unit: 'min' });
  });

  it('το μηδέν μένει μηδέν λεπτά, δεν γίνεται «0 μέρες»', () => {
    expect(splitDuration(0)).toEqual({ value: 0, unit: 'min' });
  });
});

describe('toMinutes — πάντα ακέραια λεπτά για τη στήλη int', () => {
  it('μετατρέπει κάθε μονάδα', () => {
    expect(toMinutes(45, 'min')).toBe(45);
    expect(toMinutes(3, 'hour')).toBe(180);
    expect(toMinutes(2, 'day')).toBe(2880);
  });

  it('στρογγυλοποιεί ώστε το 1,5 ώρες να μη σπάσει τη βάση', () => {
    expect(toMinutes(1.5, 'hour')).toBe(90);
    expect(Number.isInteger(toMinutes(0.7, 'day'))).toBe(true);
  });
});

describe('durationUnit — ασφαλής ανάγνωση από τη φόρμα', () => {
  it('δέχεται τις γνωστές μονάδες', () => {
    expect(durationUnit('hour')).toBe('hour');
    expect(durationUnit('day')).toBe('day');
  });

  it('οτιδήποτε άγνωστο πέφτει σε λεπτά', () => {
    expect(durationUnit('')).toBe('min');
    expect(durationUnit('εβδομάδες')).toBe('min');
  });
});

describe('κύκλος καταχώρησης', () => {
  it('ό,τι γράφει ο υπάλληλος επιστρέφει ίδιο μετά την αποθήκευση', () => {
    for (const [value, unit] of [[2, 'day'], [3, 'hour'], [45, 'min']] as const) {
      expect(splitDuration(toMinutes(value, unit))).toEqual({ value, unit });
    }
  });
});
