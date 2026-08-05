import { describe, it, expect } from 'vitest';
import { setupChecklist } from '@/lib/tour-setup';

const base = {
  status: 'draft' as const,
  bookings_open: true,
  summary: null as string | null,
  imageCount: 0,
  tierCount: 0,
  futureDepartureCount: 0,
};

describe('setupChecklist', () => {
  it('σημειώνει ως ολοκληρωμένα μόνο όσα υπάρχουν', () => {
    const items = setupChecklist({ ...base, summary: 'Κείμενο', imageCount: 3 });
    const byId = Object.fromEntries(items.map((i) => [i.id, i.done]));
    expect(byId.summary).toBe(true);
    expect(byId.photos).toBe(true);
    expect(byId.pricing).toBe(false);
    expect(byId.departures).toBe(false);
    expect(byId.published).toBe(false);
  });

  it('όλα ολοκληρωμένα σε πλήρη εκδρομή', () => {
    const items = setupChecklist({
      status: 'published', bookings_open: true, summary: 'Κείμενο',
      imageCount: 5, tierCount: 2, futureDepartureCount: 1,
    });
    expect(items.every((i) => i.done)).toBe(true);
  });

  it('η κλειστή για κρατήσεις εμφανίζεται ως προειδοποίηση, όχι ως ελλιπής', () => {
    const items = setupChecklist({
      status: 'published', bookings_open: false, summary: 'Κείμενο',
      imageCount: 5, tierCount: 2, futureDepartureCount: 1,
    });
    expect(items.every((i) => i.done)).toBe(true);
    expect(items.some((i) => i.warning)).toBe(true);
  });

  it('χωρίς ημερομηνίες λέει ότι δέχεται κράτηση χωρίς επιλογή ημέρας', () => {
    const items = setupChecklist({ ...base, tierCount: 1, status: 'published', summary: 'x', imageCount: 1 });
    const dep = items.find((i) => i.id === 'departures');
    expect(dep?.done).toBe(false);
    expect(dep?.hint).toMatch(/χωρίς/);
  });
});
