import { describe, it, expect } from 'vitest';
import { setupChecklist } from '@/lib/tour-setup';

const base = {
  status: 'draft' as const,
  bookings_open: true,
  summary: null as string | null,
  imageCount: 0,
  tierCount: 0,
  futureDepartureCount: 0,
  meetingPointCount: 0,
};

describe('setupChecklist', () => {
  it('σημειώνει ως ολοκληρωμένα μόνο όσα υπάρχουν', () => {
    const items = setupChecklist({ ...base, summary: 'Κείμενο', imageCount: 3 });
    const byId = Object.fromEntries(items.map((i) => [i.id, i.done]));
    expect(byId.summary).toBe(true);
    expect(byId.photos).toBe(true);
    expect(byId.pricing).toBe(false);
    expect(byId.departures).toBe(false);
    expect(byId.meeting_points).toBe(false);
    expect(byId.published).toBe(false);
  });

  it('όλα ολοκληρωμένα σε πλήρη εκδρομή', () => {
    const items = setupChecklist({
      status: 'published', bookings_open: true, summary: 'Κείμενο',
      imageCount: 5, tierCount: 2, futureDepartureCount: 1, meetingPointCount: 2,
    });
    expect(items.every((i) => i.done)).toBe(true);
  });

  it('η κλειστή για κρατήσεις εμφανίζεται ως προειδοποίηση, όχι ως ελλιπής', () => {
    const items = setupChecklist({
      status: 'published', bookings_open: false, summary: 'Κείμενο',
      imageCount: 5, tierCount: 2, futureDepartureCount: 1, meetingPointCount: 2,
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

  it('δημοσιευμένη+ανοιχτή εκδρομή χωρίς σημεία επιβίβασης: προειδοποίηση', () => {
    const items = setupChecklist({
      status: 'published', bookings_open: true, summary: 'Κείμενο',
      imageCount: 5, tierCount: 2, futureDepartureCount: 1, meetingPointCount: 0,
    });
    const mp = items.find((i) => i.id === 'meeting_points');
    expect(mp?.done).toBe(false);
    expect(mp?.warning).toBe(true);
    expect(mp?.hint).toMatch(/στάση/);
  });

  it('πρόχειρη εκδρομή χωρίς σημεία: ελλιπές μεν, χωρίς προειδοποίηση δε', () => {
    const items = setupChecklist(base);
    const mp = items.find((i) => i.id === 'meeting_points');
    expect(mp?.done).toBe(false);
    expect(mp?.warning).toBeFalsy();
  });

  it('με σημεία: ολοκληρωμένο, χωρίς προειδοποίηση', () => {
    const items = setupChecklist({ ...base, meetingPointCount: 3 });
    const mp = items.find((i) => i.id === 'meeting_points');
    expect(mp?.done).toBe(true);
    expect(mp?.warning).toBeFalsy();
    expect(mp?.hint).toBeUndefined();
  });
});
