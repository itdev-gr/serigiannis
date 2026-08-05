import { describe, it, expect } from 'vitest';
import { UPLOAD_RULES, scaledDimensions, uploadRulesText, validateUploadFile } from '@/lib/upload';

describe('validateUploadFile', () => {
  it('δέχεται JPEG, PNG και WebP μέσα στο όριο', () => {
    for (const type of ['image/jpeg', 'image/png', 'image/webp']) {
      expect(validateUploadFile({ name: 'a.jpg', type, size: 5_000_000 })).toEqual({ ok: true });
    }
  });

  it('απορρίπτει HEIC με οδηγία, όχι με κωδικό', () => {
    const res = validateUploadFile({ name: 'IMG_1234.HEIC', type: 'image/heic', size: 3_000_000 });
    expect(res.ok).toBe(false);
    if (!res.ok) expect(res.message).toMatch(/JPG/);
  });

  it('απορρίπτει ό,τι δεν είναι εικόνα', () => {
    const res = validateUploadFile({ name: 'programma.pdf', type: 'application/pdf', size: 100_000 });
    expect(res.ok).toBe(false);
  });

  it('απορρίπτει αρχείο πάνω από το όριο', () => {
    const res = validateUploadFile({ name: 'raw.jpg', type: 'image/jpeg', size: UPLOAD_RULES.maxBytes + 1 });
    expect(res.ok).toBe(false);
    if (!res.ok) expect(res.message).toMatch(/MB/);
  });

  it('δέχεται αρχείο ακριβώς στο όριο', () => {
    expect(validateUploadFile({ name: 'a.jpg', type: 'image/jpeg', size: UPLOAD_RULES.maxBytes }).ok).toBe(true);
  });
});

describe('scaledDimensions', () => {
  it('σμικρύνει τη μεγάλη πλευρά στο όριο και κρατά την αναλογία', () => {
    expect(scaledDimensions(4000, 3000, 2400)).toEqual({ width: 2400, height: 1800 });
    expect(scaledDimensions(3000, 4000, 2400)).toEqual({ width: 1800, height: 2400 });
  });

  it('δεν μεγεθύνει ποτέ', () => {
    expect(scaledDimensions(800, 600, 2400)).toEqual({ width: 800, height: 600 });
  });

  it('στρογγυλοποιεί σε ακέραια pixel', () => {
    const { width, height } = scaledDimensions(3333, 2001, 2400);
    expect(Number.isInteger(width)).toBe(true);
    expect(Number.isInteger(height)).toBe(true);
  });

  it('αντέχει μηδενικές διαστάσεις χωρίς NaN', () => {
    expect(scaledDimensions(0, 0, 2400)).toEqual({ width: 0, height: 0 });
  });
});

describe('uploadRulesText', () => {
  it('αναφέρει τύπους, ελάχιστο πλάτος και όριο μεγέθους', () => {
    const text = uploadRulesText();
    expect(text).toMatch(/JPG/);
    expect(text).toMatch(/1600/);
    expect(text).toMatch(/25 MB/);
  });
});
