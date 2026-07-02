import { describe, it, expect } from 'vitest';
import { decodeEntities, decodeMaybe } from '@/lib/text';

describe('decodeEntities', () => {
  it('decodes numeric entities (the migration artifact)', () => {
    expect(decodeEntities('Αράχωβα &#8211; Δελφοί')).toBe('Αράχωβα – Δελφοί');
  });
  it('decodes hex entities', () => {
    expect(decodeEntities('a &#x2013; b')).toBe('a – b');
  });
  it('decodes common named entities', () => {
    expect(decodeEntities('Ρίο &amp; Αντίρριο')).toBe('Ρίο & Αντίρριο');
    expect(decodeEntities('&laquo;Ύδρα&raquo;')).toBe('«Ύδρα»');
  });
  it('leaves plain text and unknown entities untouched', () => {
    expect(decodeEntities('Μετέωρα')).toBe('Μετέωρα');
    expect(decodeEntities('&unknownentity;')).toBe('&unknownentity;');
  });
});

describe('decodeMaybe', () => {
  it('preserves null', () => {
    expect(decodeMaybe(null)).toBeNull();
  });
  it('decodes a non-null string', () => {
    expect(decodeMaybe('21/12 &#8211; Παύλιανη')).toBe('21/12 – Παύλιανη');
  });
});
