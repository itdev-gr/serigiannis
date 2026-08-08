import { describe, it, expect } from 'vitest';
import { tourFaqs, type TourFaqInput } from '@/lib/tour-faq';

const bare: TourFaqInput = {
  title: 'Μονεμβασιά',
  price_from: null,
  duration_label: null,
  departure_note: null,
  meeting_point: null,
  meeting_points: [],
};

const full: TourFaqInput = {
  title: 'Μετέωρα διήμερο',
  price_from: 89,
  duration_label: '2 ημέρες',
  departure_note: 'Κάθε Σάββατο 07:00',
  meeting_point: 'Γραφείο, Πλατεία Ελευθερίας',
  meeting_points: ['Πλατεία Ελευθερίας 06:45', 'ΚΤΕΛ Άργους 07:10'],
};

describe('tourFaqs — πλήρης εκδρομή', () => {
  it('δίνει από τρεις έως πέντε ερωτήσεις', () => {
    const faqs = tourFaqs(full);
    expect(faqs.length).toBeGreaterThanOrEqual(3);
    expect(faqs.length).toBeLessThanOrEqual(5);
  });

  it('αναφέρει τον τίτλο στην ερώτηση της κράτησης', () => {
    expect(tourFaqs(full)[0].q).toContain('Μετέωρα διήμερο');
  });

  it('λέει την τιμή εκκίνησης όταν υπάρχει', () => {
    const price = tourFaqs(full).find((f) => f.q.includes('κοστίζει'));
    expect(price?.a).toContain('89€');
  });

  it('προτιμά τα σημεία επιβίβασης από το σημείο συνάντησης', () => {
    const where = tourFaqs(full).find((f) => f.q.includes('Από πού'));
    expect(where?.a).toContain('Πλατεία Ελευθερίας 06:45');
    expect(where?.a).toContain('ΚΤΕΛ Άργους 07:10');
    expect(where?.a).not.toContain('Γραφείο, Πλατεία Ελευθερίας');
    expect(where?.a).toContain('Κάθε Σάββατο 07:00');
  });

  it('πέφτει στο σημείο συνάντησης όταν δεν υπάρχουν στάσεις', () => {
    const where = tourFaqs({ ...full, meeting_points: [] }).find((f) => f.q.includes('Από πού'));
    expect(where?.a).toContain('Γραφείο, Πλατεία Ελευθερίας');
  });

  it('κρατά μόνο τη σημείωση αναχωρήσεων όταν δεν υπάρχει κανένα σημείο', () => {
    const where = tourFaqs({ ...full, meeting_points: [], meeting_point: null }).find((f) =>
      f.q.includes('Από πού'),
    );
    expect(where?.a).toBe('Αναχωρήσεις: Κάθε Σάββατο 07:00.');
  });

  it('λέει τη διάρκεια όταν υπάρχει', () => {
    const duration = tourFaqs(full).find((f) => f.q.includes('διαρκεί'));
    expect(duration?.a).toContain('2 ημέρες');
  });

  it('έχει πάντα ερώτηση για τις ακυρώσεις', () => {
    expect(tourFaqs(full).some((f) => f.q.includes('ακυρώσεις'))).toBe(true);
  });
});

describe('tourFaqs — γυμνή εκδρομή με μόνο τίτλο', () => {
  it('δίνει τουλάχιστον τρεις ερωτήσεις', () => {
    expect(tourFaqs(bare).length).toBeGreaterThanOrEqual(3);
  });

  it('δεν επινοεί τιμή, διάρκεια ή σημείο αναχώρησης', () => {
    const faqs = tourFaqs(bare);
    expect(faqs.some((f) => f.q.includes('κοστίζει'))).toBe(false);
    expect(faqs.some((f) => f.q.includes('διαρκεί'))).toBe(false);
    expect(faqs.some((f) => f.q.includes('Από πού'))).toBe(false);
  });
});

describe('tourFaqs — ποιότητα των εγγραφών', () => {
  const cases: [string, TourFaqInput][] = [
    ['πλήρης', full],
    ['γυμνή', bare],
    ['μόνο τιμή', { ...bare, price_from: 0 }],
    ['μία στάση', { ...bare, meeting_points: ['ΚΤΕΛ Ναυπλίου'] }],
    ['κενά πεδία', { ...bare, duration_label: '   ', departure_note: '—', meeting_point: '', meeting_points: ['', ' '] }],
  ];

  for (const [name, tour] of cases) {
    it(`καμία κενή απάντηση — ${name}`, () => {
      for (const faq of tourFaqs(tour)) {
        expect(faq.q.trim().length).toBeGreaterThan(0);
        expect(faq.a.trim().length).toBeGreaterThan(0);
      }
    });

    it(`καμία διπλή ερώτηση — ${name}`, () => {
      const questions = tourFaqs(tour).map((f) => f.q);
      expect(new Set(questions).size).toBe(questions.length);
    });

    it(`πάντα τρεις έως πέντε ερωτήσεις — ${name}`, () => {
      const n = tourFaqs(tour).length;
      expect(n).toBeGreaterThanOrEqual(3);
      expect(n).toBeLessThanOrEqual(5);
    });
  }

  it('τα κενά και οι παύλες δεν γεννούν ερωτήσεις', () => {
    const faqs = tourFaqs({ ...bare, duration_label: '  ', departure_note: '—', meeting_points: ['', '   '] });
    expect(faqs.some((f) => f.q.includes('διαρκεί'))).toBe(false);
    expect(faqs.some((f) => f.q.includes('Από πού'))).toBe(false);
  });

  it('η τιμή 0 μετράει ως τιμή, δεν χάνεται σαν κενό', () => {
    const price = tourFaqs({ ...bare, price_from: 0 }).find((f) => f.q.includes('κοστίζει'));
    expect(price?.a).toContain('0€');
  });
});
