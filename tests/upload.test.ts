import { describe, it, expect } from 'vitest';
import { UPLOAD_RULES, batchBySize, scaledDimensions, uploadRulesText, validateUploadFile } from '@/lib/upload';

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

describe('batchBySize', () => {
  it('επιστρέφει άδειο πίνακα για άδεια είσοδο', () => {
    expect(batchBySize([], 1000)).toEqual([]);
  });

  it('βάζει ένα υπερμεγέθες αρχείο μόνο του σε παρτίδα', () => {
    const files = [{ size: 5000 }];
    expect(batchBySize(files, 1000)).toEqual([[{ size: 5000 }]]);
  });

  it('υπερμεγέθες αρχείο ανάμεσα σε άλλα παίρνει τη δική του παρτίδα', () => {
    const files = [{ size: 400 }, { size: 5000 }, { size: 300 }];
    expect(batchBySize(files, 1000)).toEqual([[{ size: 400 }], [{ size: 5000 }], [{ size: 300 }]]);
  });

  it('γεμίζει ακριβώς στο όριο χωρίς να το ξεπερνά', () => {
    const files = [{ size: 500 }, { size: 500 }, { size: 1 }];
    expect(batchBySize(files, 1000)).toEqual([[{ size: 500 }, { size: 500 }], [{ size: 1 }]]);
  });

  it('ποτέ δεν ξεπερνά το όριο για παρτίδα δύο ή περισσότερων αρχείων', () => {
    const files = [{ size: 300 }, { size: 300 }, { size: 300 }, { size: 300 }];
    const batches = batchBySize(files, 1000);
    for (const batch of batches) {
      if (batch.length > 1) {
        const total = batch.reduce((sum, f) => sum + f.size, 0);
        expect(total).toBeLessThanOrEqual(1000);
      }
    }
  });

  it('διατηρεί τη σειρά εισόδου', () => {
    const files = [{ size: 100 }, { size: 900 }, { size: 200 }, { size: 800 }, { size: 50 }];
    const batches = batchBySize(files, 1000);
    expect(batches.flat()).toEqual(files);
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
