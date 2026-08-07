import { describe, it, expect, vi } from 'vitest';
import {
  farePriceForKind,
  formatCents,
  layoutAllSeats,
  nextFreeSeat,
  refundPolicyText,
  routeLabel,
  takenSeatNumbers,
} from '@/lib/ticketing';
import {
  excursionDeepLink,
  parseBoardingPoints,
  resolveInitialRoute,
  slugify,
  slugifyWithFallback,
} from '@/lib/excursions';
import { POYLMAN_LIST, poylmanHref, poylmanTabHref } from '@/lib/admin-routes';
import { flashQuery, withFlash } from '@/lib/admin-flash';
import { setupChecklist, type TourSetupInput } from '@/lib/tour-setup';
import { filterTours, searchNormalize, sortTours } from '@/lib/filters';
import {
  bookableDepartures,
  computeBookingTotal,
  isBookable,
  passengerLabels,
  tourRouteCta,
} from '@/lib/booking';
import { passengerRecipients } from '@/lib/ticket-notify';
import { buildTourCheckoutSchema } from '@/components/booking/TourCheckoutForm';
import { buildSchema } from '@/components/ticketing/CheckoutForm';
import type { LayoutJson } from '@/types/ticketing';
import type { OrderTicket } from '@/types/ticketing';
import type { Tour, TourDeparture } from '@/types/db';

// Τα component modules τραβούν server actions (supabase/server + next/headers)
// — δεν χρειάζονται για τα schema tests.
vi.mock('@/app/(site)/eisitiria/actions', () => ({
  submitCheckout: vi.fn(),
  cancelCheckout: vi.fn(),
}));
vi.mock('@/app/(site)/kratisi/actions', () => ({
  submitTourCheckout: vi.fn(),
  cancelTourBooking: vi.fn(),
}));

/* ────────────────────────────── lib/ticketing ───────────────────────────── */

describe('routeLabel', () => {
  const pair = { origin: { name: 'Γαστούνη' }, destination: { name: 'Αθήνα' } };

  it('προτιμά τον τίτλο της εκδρομής όταν υπάρχει', () => {
    expect(routeLabel({ title: 'Μονοήμερη Ναύπλιο', ...pair })).toBe('Μονοήμερη Ναύπλιο');
  });

  it('πέφτει στο ζεύγος σταθμών χωρίς τίτλο', () => {
    expect(routeLabel({ title: null, ...pair })).toBe('Γαστούνη → Αθήνα');
    expect(routeLabel(pair)).toBe('Γαστούνη → Αθήνα');
  });

  it('τίτλος μόνο με κενά μετράει ως ανύπαρκτος', () => {
    expect(routeLabel({ title: '   ', ...pair })).toBe('Γαστούνη → Αθήνα');
  });

  it('βάζει παύλα όταν λείπει σταθμός', () => {
    expect(routeLabel({ title: null, origin: null, destination: null })).toBe('— → —');
    expect(routeLabel({ origin: { name: 'Γαστούνη' } })).toBe('Γαστούνη → —');
  });
});

describe('nextFreeSeat — φυσική σειρά', () => {
  it('μετά τη «2» δίνει τη «10», όχι αλφαβητικά', () => {
    expect(nextFreeSeat(['1', '2', '10'], [], '2')).toBe('10');
  });

  it('μετά τη «12» δίνει τη «12A» πριν τη «13»', () => {
    expect(nextFreeSeat(['12', '12A', '13'], [], '12')).toBe('12A');
  });

  it('δεν επιστρέφει την ίδια την «after» ακόμη κι αν είναι ελεύθερη', () => {
    expect(nextFreeSeat(['1', '2', '3'], [], '1')).toBe('2');
  });

  it('σε γεμάτο πούλμαν δίνει null και χωρίς σημείο εκκίνησης', () => {
    expect(nextFreeSeat(['1', '2'], ['1', '2'])).toBeNull();
  });

  it('άγνωστη «after» σε ημιγεμάτο πούλμαν πέφτει στην πρώτη ελεύθερη', () => {
    expect(nextFreeSeat(['1', '2', '3'], ['1', '2'], 'ΧΧ')).toBe('3');
  });
});

describe('takenSeatNumbers — παραλλαγές δεσμεύσεων', () => {
  const now = 1_700_000_000_000;

  it('δέσμευση χωρίς expires_at θεωρείται ληγμένη, όπως και στο SQL', () => {
    expect(takenSeatNumbers([{ seat_no: '7', claim_type: 'hold' }], now)).toEqual([]);
  });

  it('δέσμευση που λήγει ακριβώς τώρα θεωρείται ληγμένη', () => {
    const claims = [{ seat_no: '8', claim_type: 'hold', expires_at: new Date(now).toISOString() }];
    expect(takenSeatNumbers(claims, now)).toEqual([]);
  });

  it('booked + blocked + ενεργό hold μετρούν, ληγμένο hold όχι', () => {
    const claims = [
      { seat_no: '1', claim_type: 'booked', expires_at: null },
      { seat_no: '2', claim_type: 'blocked', expires_at: null },
      { seat_no: '3', claim_type: 'hold', expires_at: new Date(now + 60_000).toISOString() },
      { seat_no: '4', claim_type: 'hold', expires_at: new Date(now - 1).toISOString() },
    ];
    expect(takenSeatNumbers(claims, now)).toEqual(['1', '2', '3']);
  });

  it('ληγμένη κράτηση (booked) μετράει — η λήξη αφορά μόνο τα holds', () => {
    const claims = [{ seat_no: '5', claim_type: 'booked', expires_at: new Date(now - 60_000).toISOString() }];
    expect(takenSeatNumbers(claims, now)).toEqual(['5']);
  });
});

describe('layoutAllSeats — οριακές κατόψεις', () => {
  it('αγνοεί κελιά τύπου seat χωρίς ετικέτα θέσης', () => {
    const layout: LayoutJson = {
      decks: [
        {
          name: 'ΚΑΤΩ',
          rows: 1,
          cols: 3,
          cells: [
            { r: 0, c: 0, type: 'seat' },
            { r: 0, c: 1, type: 'seat', seat: '1' },
            { r: 0, c: 2, type: 'wc' },
          ],
        },
      ],
    };
    expect(layoutAllSeats(layout)).toEqual(['1']);
  });

  it('κάτοψη χωρίς ορόφους δίνει κενή λίστα', () => {
    expect(layoutAllSeats({ decks: [] })).toEqual([]);
  });

  it('κρατά και τις offline θέσεις, με τη σειρά των ορόφων', () => {
    const layout: LayoutJson = {
      decks: [
        { name: 'ΚΑΤΩ', rows: 1, cols: 1, cells: [{ r: 0, c: 0, type: 'seat', seat: '2', online: false }] },
        { name: 'ΕΠΑΝΩ', rows: 1, cols: 1, cells: [{ r: 0, c: 0, type: 'seat', seat: '1' }] },
      ],
    };
    expect(layoutAllSeats(layout)).toEqual(['2', '1']);
  });
});

describe('farePriceForKind & formatCents — οριακά ποσά', () => {
  it('μηδενικός ναύλος επιστρέφεται ως 0 και στα τρία είδη', () => {
    const free = { price_oneway_cents: 0, price_round_cents: 0 };
    expect(farePriceForKind(free, 'oneway')).toBe(0);
    expect(farePriceForKind(free, 'round')).toBe(0);
    expect(farePriceForKind(free, 'open_return')).toBe(0);
  });

  it('η ανοιχτή επιστροφή τιμολογείται όπως το round, ποτέ όπως το oneway', () => {
    const fare = { price_oneway_cents: 1200, price_round_cents: 2000 };
    expect(farePriceForKind(fare, 'open_return')).toBe(farePriceForKind(fare, 'round'));
    expect(farePriceForKind(fare, 'open_return')).not.toBe(farePriceForKind(fare, 'oneway'));
  });

  it('βάζει τελεία χιλιάδων στα μεγάλα ποσά', () => {
    expect(formatCents(125000)).toBe('1.250,00 €');
  });

  it('γράφει αρνητικά ποσά (επιστροφές χρημάτων) με πρόσημο', () => {
    expect(formatCents(-1500)).toBe('-15,00 €');
  });
});

describe('refundPolicyText — μηδενικές πολιτικές', () => {
  it('γράφει και 0% χωρίς να το κρύβει', () => {
    expect(refundPolicyText({ refund_cutoff_hours: 24, refund_pct_early: 100, refund_pct_late: 0 })).toBe(
      'Ακύρωση έως 24 ώρες πριν την αναχώρηση: επιστροφή 100% · εντός 24 ωρών: 0%.'
    );
  });
});

/* ───────────────────────────── lib/excursions ───────────────────────────── */

describe('parseBoardingPoints — όρια και καθάρισμα', () => {
  it('κρατά ακέραιη γραμμή ακριβώς 120 χαρακτήρων', () => {
    const exact = 'Σ'.repeat(120);
    expect(parseBoardingPoints(exact)).toEqual([exact]);
  });

  it('ξανακόβει τα κενά που αφήνει η κοπή στους 120', () => {
    const line = `${'Α'.repeat(118)}  ΚΤΕΛ`;
    expect(parseBoardingPoints(line)).toEqual(['Α'.repeat(118)]);
  });

  it('η αποδιπλοποίηση αγνοεί πεζά/κεφαλαία και τόνους', () => {
    expect(parseBoardingPoints('Αθήνα\nαθήνα')).toEqual(['Αθήνα']);
  });

  it('το όριο των 20 μετράει μοναδικά σημεία, όχι γραμμές', () => {
    const text = [...Array.from({ length: 22 }, (_, i) => `Στάση ${i + 1}`), 'Στάση 1', 'Στάση 2'].join('\n');
    const out = parseBoardingPoints(text);
    expect(out).toHaveLength(20);
    expect(out[19]).toBe('Στάση 20');
  });

  it('καθαρίζει τα \\r από γραμμές Windows', () => {
    expect(parseBoardingPoints('Γαστούνη\r\nΑμαλιάδα\r\n')).toEqual(['Γαστούνη', 'Αμαλιάδα']);
  });
});

describe('slugify — ελληνικά με τόνους και διαλυτικά', () => {
  it('το τελικό «ς» γίνεται s', () => {
    expect(slugify('Καλαμπάκας')).toBe('kalampakas');
    expect(slugify('ΚΑΛΑΜΠΑΚΑΣ')).toBe('kalampakas');
  });

  it('τα διαλυτικά αφαιρούνται όπως και οι τόνοι', () => {
    expect(slugify('Ευβοϊκός')).toBe('eyvoikos');
    expect(slugify('Άγιος Νικόλαος')).toBe('agios-nikolaos');
  });

  it('κόβει στους 60 χαρακτήρες χωρίς να αφήνει παύλα στο τέλος', () => {
    const out = slugify(Array.from({ length: 20 }, () => 'Αθήνα').join(' '));
    expect(out.length).toBeLessThanOrEqual(60);
    expect(out.endsWith('-')).toBe(false);
  });

  it('το slugifyWithFallback δεν πειράζει έγκυρα ελληνικά', () => {
    expect(slugifyWithFallback('Λιχαδονήσια')).toBe('lichadonisia');
    expect(slugifyWithFallback('...', 'ekdromi-abc')).toBe('ekdromi-abc');
  });
});

describe('resolveInitialRoute & excursionDeepLink — συνδυασμός', () => {
  it('κενός κατάλογος εκδρομών δεν επιλέγει τίποτα', () => {
    expect(resolveInitialRoute([], 'a')).toBe('');
  });

  it('το deep link του οδηγού γυρίζει πίσω στην ίδια εκδρομή', () => {
    const excursions = [{ id: 'r-1' }, { id: 'r-2' }];
    const href = excursionDeepLink('r-2')!;
    const param = new URL(href, 'https://x.gr').searchParams.get('ekdromi');
    expect(resolveInitialRoute(excursions, param)).toBe('r-2');
  });
});

/* ──────────────────── lib/admin-routes + lib/admin-flash ────────────────── */

describe('admin flash σε διευθύνσεις με query', () => {
  it('το flashQuery βάζει πάντα «?» — γι᾽ αυτό δεν κολλάει σε URL με query', () => {
    expect(flashQuery(true)).toBe('?saved=1');
    expect(flashQuery(false, 'seat_taken')).toBe('?error=seat_taken');
    // Η λάθος χρήση που τεκμηριώνει το σχόλιο του lib/admin-routes.ts:
    expect(`${POYLMAN_LIST}${flashQuery(true)}`).toBe('/admin/tours?tab=poylman?saved=1');
  });

  it('το withFlash βάζει «?» σε καθαρό path και «&» σε path με query', () => {
    expect(withFlash('/admin/tours', true)).toBe('/admin/tours?saved=1');
    expect(withFlash(poylmanTabHref('abc', 'times'), true)).toBe('/admin/tours/poylman/abc?tab=times&saved=1');
  });

  it('χωρίς κωδικό σφάλματος το withFlash πέφτει στο «db»', () => {
    expect(withFlash(poylmanHref('abc'), false)).toBe('/admin/tours/poylman/abc?error=db');
    expect(withFlash(POYLMAN_LIST, false)).toBe('/admin/tours?tab=poylman&error=db');
  });
});

/* ───────────────────────────── lib/tour-setup ───────────────────────────── */

describe('setupChecklist — πλήρεις καταστάσεις', () => {
  const base: TourSetupInput = {
    status: 'draft',
    bookings_open: true,
    summary: null,
    imageCount: 0,
    tierCount: 0,
    futureDepartureCount: 0,
    meetingPointCount: 0,
  };

  it('γυρίζει πάντα τα έξι βήματα με σταθερή σειρά', () => {
    expect(setupChecklist(base).map((i) => i.id)).toEqual([
      'summary',
      'photos',
      'pricing',
      'departures',
      'meeting_points',
      'published',
    ]);
  });

  it('όλα ελλιπή: κανένα done, οδηγία σε κάθε ανοιχτό βήμα', () => {
    const items = setupChecklist(base);
    expect(items.some((i) => i.done)).toBe(false);
    for (const id of ['summary', 'photos', 'pricing', 'departures', 'meeting_points']) {
      expect(items.find((i) => i.id === id)?.hint).toBeTruthy();
    }
    expect(items.some((i) => i.warning)).toBe(false);
  });

  it('περιγραφή μόνο με κενά μετράει ως ελλιπής', () => {
    expect(setupChecklist({ ...base, summary: '   ' }).find((i) => i.id === 'summary')?.done).toBe(false);
  });

  it('κρυφή/αρχειοθετημένη εκδρομή δεν μετράει ως δημοσιευμένη', () => {
    for (const status of ['hidden', 'archived'] as const) {
      const pub = setupChecklist({ ...base, status }).find((i) => i.id === 'published');
      expect(pub?.done).toBe(false);
      expect(pub?.warning).toBe(false);
    }
  });

  it('δημοσιευμένη+κλειστή: το «Δημοσιευμένη» είναι done με προειδοποίηση', () => {
    const pub = setupChecklist({ ...base, status: 'published', bookings_open: false }).find(
      (i) => i.id === 'published'
    );
    expect(pub?.done).toBe(true);
    expect(pub?.warning).toBe(true);
    expect(pub?.hint).toMatch(/κλειστή για κρατήσεις/);
  });

  it('δημοσιευμένη+κλειστή χωρίς σημεία: κανένα καμπανάκι για τα σημεία', () => {
    const mp = setupChecklist({ ...base, status: 'published', bookings_open: false }).find(
      (i) => i.id === 'meeting_points'
    );
    expect(mp?.done).toBe(false);
    expect(mp?.warning).toBe(false);
  });
});

/* ─────────────────────────────── lib/filters ────────────────────────────── */

const tour = (o: Partial<Tour>): Tour => ({
  id: 'x', slug: 'x', title: 'x', subtitle: null, summary: null, body: {},
  price_from: 50, price_original: null, currency: 'EUR', duration_label: null,
  departure_note: null, meeting_point: null, meeting_points: [], route_id: null,
  status: 'published', is_featured: false, bookings_open: true, cover_image_id: null,
  seo_title: null, seo_description: null, source_url: null, sort_order: 0, published_at: null,
  ...o,
});

describe('searchNormalize — ελληνικές παραλλαγές', () => {
  it('ενοποιεί κεφαλαία με τόνο και πεζά χωρίς', () => {
    expect(searchNormalize('ΆΓΙΟΣ')).toBe('αγιοσ');
  });

  it('«Ναύπλιος» και «ΝΑΥΠΛΙΟΣ» πέφτουν στο ίδιο κλειδί με τελικό σ', () => {
    expect(searchNormalize('ΝΑΥΠΛΙΟΣ')).toBe('ναυπλιοσ');
    expect(searchNormalize('Ναύπλιος')).toBe('ναυπλιοσ');
  });

  it('αφήνει ανέπαφα λατινικά και ψηφία', () => {
    expect(searchNormalize('Meteora 2026')).toBe('meteora 2026');
  });
});

describe('filterTours & sortTours — οριακά δεδομένα', () => {
  it('εκδρομή χωρίς κατηγορίες δεν περνά το φίλτρο κατηγορίας', () => {
    const a = tour({ id: 'a' });
    expect(filterTours([a], { category: 'monoimeres' })).toEqual([]);
  });

  it('κενό string κατηγορίας δεν φιλτράρει τίποτα', () => {
    const list = [tour({ id: 'a' }), tour({ id: 'b' })];
    expect(filterTours(list, { category: '' })).toHaveLength(2);
  });

  it('τιμή null μετράει ως 0 και στις δύο κατευθύνσεις', () => {
    const none = tour({ id: 'n', price_from: null });
    const cheap = tour({ id: 'c', price_from: 10 });
    expect(sortTours([cheap, none], 'price-asc').map((x) => x.id)).toEqual(['n', 'c']);
    expect(sortTours([none, cheap], 'price-desc').map((x) => x.id)).toEqual(['c', 'n']);
  });

  it('«date» βάζει τις ίδιες ημερομηνίες με σταθερή σειρά', () => {
    const a = tour({ id: 'a', next_departure: '2026-08-10' });
    const b = tour({ id: 'b', next_departure: '2026-08-10' });
    expect(sortTours([a, b], 'date').map((x) => x.id)).toEqual(['a', 'b']);
  });

  it('άγνωστο κλειδί ταξινόμησης συμπεριφέρεται σαν «popular»', () => {
    const plain = tour({ id: 'p' });
    const feat = tour({ id: 'f', is_featured: true });
    const list = [plain, feat];
    expect(sortTours(list, 'oops' as never).map((x) => x.id)).toEqual(
      sortTours(list, 'popular').map((x) => x.id)
    );
  });
});

/* ─────────────────────────────── lib/booking ────────────────────────────── */

const departure = (over: Partial<TourDeparture> & { id: string; starts_on: string }): TourDeparture => ({
  tour_id: 't1',
  ends_on: null,
  note: null,
  capacity: null,
  is_active: true,
  ...over,
});

describe('bookableDepartures — οριακές ημερομηνίες', () => {
  it('η σημερινή αναχώρηση παραμένει κρατήσιμη', () => {
    const list = bookableDepartures([departure({ id: 'today', starts_on: '2026-08-07' })], '2026-08-07');
    expect(list.map((d) => d.id)).toEqual(['today']);
  });

  it('η χθεσινή φεύγει, ακόμη κι αν είναι ενεργή', () => {
    expect(bookableDepartures([departure({ id: 'x', starts_on: '2026-08-06' })], '2026-08-07')).toEqual([]);
  });

  it('μελλοντική αλλά ανενεργή δεν εμφανίζεται', () => {
    const list = bookableDepartures(
      [departure({ id: 'off', starts_on: '2026-09-01', is_active: false })],
      '2026-08-07'
    );
    expect(list).toEqual([]);
  });

  it('κενή λίστα και δεν πειράζει την είσοδο', () => {
    const input = [departure({ id: 'b', starts_on: '2026-09-01' }), departure({ id: 'a', starts_on: '2026-08-08' })];
    expect(bookableDepartures([], '2026-08-07')).toEqual([]);
    bookableDepartures(input, '2026-08-07');
    expect(input.map((d) => d.id)).toEqual(['b', 'a']);
  });
});

describe('passengerLabels & computeBookingTotal — παραλλαγές', () => {
  it('items null πέφτει στο «Ταξιδιώτης N»', () => {
    expect(passengerLabels({ items: null as never, party_size: 2 })).toEqual(['Ταξιδιώτης 1', 'Ταξιδιώτης 2']);
  });

  it('αρνητικό party_size δεν παράγει ετικέτες', () => {
    expect(passengerLabels({ items: [], party_size: -3 })).toEqual([]);
  });

  it('θέσεις με μηδενικό πρόθεμα διαβάζονται κανονικά', () => {
    expect(computeBookingTotal('03', 20)).toBe(60);
  });

  it('αρνητικές ή δεκαδικές θέσεις απορρίπτονται', () => {
    expect(computeBookingTotal('-2', 20)).toBeNull();
    expect(computeBookingTotal('2.5', 20)).toBeNull();
  });
});

describe('isBookable & tourRouteCta — αλληλεπίδραση', () => {
  it('κλειστή εκδρομή δεν πουλάει ούτε με ενεργές τιμές ούτε με σύνδεσμο πούλμαν', () => {
    expect(isBookable({ bookings_open: false }, [{}])).toBe(false);
    expect(
      tourRouteCta({ routeId: 'r', routePublished: true, hasActiveTiers: true, bookingsOpen: false })
    ).toBeNull();
  });

  it('εκδρομή χωρίς τιμές αλλά με δημοσιευμένο πούλμαν δίνει κύριο κουμπί', () => {
    expect(isBookable({ bookings_open: true }, [])).toBe(false);
    expect(
      tourRouteCta({ routeId: 'r', routePublished: true, hasActiveTiers: false, bookingsOpen: true })
    ).toEqual({ href: '/eisitiria?ekdromi=r', primary: true });
  });
});

/* ─────────────── components/booking/TourCheckoutForm — schema ───────────── */

describe('buildTourCheckoutSchema', () => {
  const base = {
    customer_name: 'Μαρία Παπαδοπούλου',
    email: 'maria@example.com',
    phone: '6900000000',
    accept_terms: true as const,
  };
  const p = (over: Record<string, string> = {}) => ({ name: 'Μαρία Π.', phone: '', ...over });

  it('με στάσεις: όταν μόνο ένας από τους τρεις διάλεξε, όλη η φόρμα κόβεται', () => {
    const schema = buildTourCheckoutSchema(true);
    const res = schema.safeParse({
      ...base,
      passengers: [p({ meeting_point: 'Γαστούνη' }), p(), p({ meeting_point: '' })],
    });
    expect(res.success).toBe(false);
    const paths = res.success ? [] : res.error.issues.map((i) => i.path.join('.'));
    expect(paths).toContain('passengers.1.meeting_point');
    expect(paths).toContain('passengers.2.meeting_point');
    expect(paths).not.toContain('passengers.0.meeting_point');
  });

  it('με στάσεις: και οι τρεις συμπληρωμένοι περνούν', () => {
    const schema = buildTourCheckoutSchema(true);
    const res = schema.safeParse({
      ...base,
      passengers: [
        p({ meeting_point: 'Γαστούνη' }),
        p({ meeting_point: 'Αμαλιάδα' }),
        p({ meeting_point: 'Πύργος' }),
      ],
    });
    expect(res.success).toBe(true);
  });

  it('χωρίς στάσεις: κενό string στο σημείο περνάει', () => {
    expect(
      buildTourCheckoutSchema(false).safeParse({ ...base, passengers: [p({ meeting_point: '' })] }).success
    ).toBe(true);
  });

  // Ο έλεγχος μέλους της λίστας γίνεται server-side (kratisi/actions.ts),
  // όχι στο client schema — καταγράφεται εδώ ως τρέχουσα συμπεριφορά.
  it('το client schema δεν ελέγχει αν το σημείο ανήκει στη λίστα', () => {
    expect(
      buildTourCheckoutSchema(true).safeParse({ ...base, passengers: [p({ meeting_point: 'Οπουδήποτε' })] })
        .success
    ).toBe(true);
  });

  it('το τηλέφωνο ταξιδιώτη είναι προαιρετικό, το όνομα όχι', () => {
    const schema = buildTourCheckoutSchema(false);
    expect(schema.safeParse({ ...base, passengers: [{ name: 'Μαρία Π.' }] }).success).toBe(true);
    expect(schema.safeParse({ ...base, passengers: [p({ name: 'Μ' })] }).success).toBe(false);
  });

  it('χωρίς αποδοχή όρων ή με άκυρο email η φόρμα δεν περνά', () => {
    const schema = buildTourCheckoutSchema(false);
    expect(schema.safeParse({ ...base, accept_terms: false, passengers: [p()] }).success).toBe(false);
    expect(schema.safeParse({ ...base, email: 'abc', passengers: [p()] }).success).toBe(false);
    expect(schema.safeParse({ ...base, phone: '69000', passengers: [p()] }).success).toBe(false);
  });

  // Σε αντίθεση με το CheckoutForm δεν υπάρχει .length(party_size) — το
  // πλήθος ελέγχεται μόνο server-side (passenger_count_mismatch).
  it('άδεια λίστα ταξιδιωτών περνά το client schema', () => {
    expect(buildTourCheckoutSchema(true).safeParse({ ...base, passengers: [] }).success).toBe(true);
  });
});

/* ────────────── components/ticketing/CheckoutForm — schema ──────────────── */

describe('CheckoutForm buildSchema — πλήθος & πεδία επιβατών', () => {
  const billing = {
    customer_name: 'Μαρία Παπαδοπούλου',
    email: 'maria@example.com',
    phone: '6900000000',
    accept_terms: true as const,
  };
  const pax = (over: Record<string, string> = {}) => ({
    passenger_name: 'Μαρία Π.',
    passenger_phone: '6900000000',
    fare_type_id: 'fare1',
    ...over,
  });
  const STOPS = ['Πλατεία Γαστούνης', 'ΚΤΕΛ Αμαλιάδας'];

  it('περισσότεροι επιβάτες από τις θέσεις απορρίπτονται', () => {
    const schema = buildSchema(1, STOPS);
    const res = schema.safeParse({
      ...billing,
      passengers: [pax({ boarding_point: STOPS[0] }), pax({ boarding_point: STOPS[1] })],
    });
    expect(res.success).toBe(false);
  });

  it('μηδέν θέσεις σημαίνει άδεια λίστα επιβατών', () => {
    const schema = buildSchema(0, []);
    expect(schema.safeParse({ ...billing, passengers: [] }).success).toBe(true);
    expect(schema.safeParse({ ...billing, passengers: [pax()] }).success).toBe(false);
  });

  it('το σημείο επιβίβασης συγκρίνεται ακριβώς — κενά ή αλλαγή πεζών κόβουν', () => {
    const schema = buildSchema(1, STOPS);
    expect(schema.safeParse({ ...billing, passengers: [pax({ boarding_point: ' Πλατεία Γαστούνης' })] }).success).toBe(false);
    expect(schema.safeParse({ ...billing, passengers: [pax({ boarding_point: 'ΠΛΑΤΕΊΑ ΓΑΣΤΟΎΝΗΣ' })] }).success).toBe(false);
  });

  it('email επιβάτη με κενά γύρω του θεωρείται άκυρο', () => {
    const schema = buildSchema(1, []);
    expect(schema.safeParse({ ...billing, passengers: [pax({ passenger_email: ' a@example.com ' })] }).success).toBe(false);
  });

  it('λείπει τύπος εισιτηρίου ή τηλέφωνο επιβάτη: μήνυμα ανά πεδίο', () => {
    const schema = buildSchema(1, []);
    const res = schema.safeParse({
      ...billing,
      passengers: [{ passenger_name: 'Μαρία Π.', passenger_phone: '123', fare_type_id: '' }],
    });
    expect(res.success).toBe(false);
    const paths = res.success ? [] : res.error.issues.map((i) => i.path.join('.'));
    expect(paths).toEqual(expect.arrayContaining(['passengers.0.passenger_phone', 'passengers.0.fare_type_id']));
  });

  it('τα στοιχεία χρέωσης ελέγχονται ανεξάρτητα από τους επιβάτες', () => {
    const schema = buildSchema(1, []);
    const res = schema.safeParse({ ...billing, customer_name: 'Μ', accept_terms: false, passengers: [pax()] });
    expect(res.success).toBe(false);
    const paths = res.success ? [] : res.error.issues.map((i) => i.path.join('.'));
    expect(paths).toEqual(expect.arrayContaining(['customer_name', 'accept_terms']));
  });

  it('το marketing_opt_in είναι προαιρετικό αλλά πρέπει να είναι boolean', () => {
    const schema = buildSchema(1, []);
    expect(schema.safeParse({ ...billing, passengers: [pax()] }).success).toBe(true);
    expect(schema.safeParse({ ...billing, marketing_opt_in: true, passengers: [pax()] }).success).toBe(true);
    expect(
      schema.safeParse({ ...billing, marketing_opt_in: 'ναι' as never, passengers: [pax()] }).success
    ).toBe(false);
  });
});

/* ─────────────────────────── lib/ticket-notify ──────────────────────────── */

describe('passengerRecipients — μεικτές παρέες', () => {
  const ticket = (over: Partial<OrderTicket> & { passenger_key: number }): OrderTicket => ({
    id: `t${over.passenger_key}-${over.leg ?? 'outbound'}`,
    code: `C${over.passenger_key}${over.leg === 'return' ? 'R' : 'O'}`,
    leg: 'outbound',
    trip_id: 'trip1',
    seat_no: '1',
    passenger_name: `Επιβάτης ${over.passenger_key}`,
    passenger_phone: null,
    fare_name: 'Κανονικό',
    fare_basis: 'oneway',
    price_cents: 1500,
    status: 'valid',
    open_return: false,
    open_return_expires_on: null,
    refunded_cents: null,
    ...over,
  });

  it('παρέα πέντε: μόνο οι τρεις με email, με τη σειρά που εμφανίστηκαν', () => {
    const res = passengerRecipients(
      [
        ticket({ passenger_key: 1, passenger_email: 'giorgos@example.com' }),
        ticket({ passenger_key: 2 }),
        ticket({ passenger_key: 3, passenger_email: 'eleni@example.com' }),
        ticket({ passenger_key: 4, passenger_email: null }),
        ticket({ passenger_key: 5, passenger_email: 'nikos@example.com' }),
      ],
      'payer@example.com'
    );
    expect(res.map((r) => r.email)).toEqual([
      'giorgos@example.com',
      'eleni@example.com',
      'nikos@example.com',
    ]);
    expect(res.every((r) => r.tickets.length === 1)).toBe(true);
  });

  it('email μόνο με κενά αγνοείται σαν να μη δόθηκε', () => {
    const res = passengerRecipients(
      [
        ticket({ passenger_key: 1, passenger_email: '   ' }),
        ticket({ passenger_key: 2, passenger_email: 'b@example.com' }),
      ],
      null
    );
    expect(res.map((r) => r.email)).toEqual(['b@example.com']);
  });

  it('ο πληρωτής με ΚΕΦΑΛΑΙΑ διεύθυνση εξακολουθεί να παραλείπεται', () => {
    const res = passengerRecipients(
      [
        ticket({ passenger_key: 1, passenger_email: 'payer@example.com' }),
        ticket({ passenger_key: 2, passenger_email: 'friend@example.com' }),
      ],
      '  PAYER@EXAMPLE.COM  '
    );
    expect(res.map((r) => r.email)).toEqual(['friend@example.com']);
  });

  it('τρεις επιβάτες με δύο διευθύνσεις: δύο μηνύματα, σωστός διαμοιρασμός', () => {
    const res = passengerRecipients(
      [
        ticket({ passenger_key: 1, passenger_email: 'koino@example.com' }),
        ticket({ passenger_key: 2, passenger_email: 'Koino@Example.com' }),
        ticket({ passenger_key: 3, passenger_email: 'monos@example.com' }),
      ],
      'payer@example.com'
    );
    expect(res).toHaveLength(2);
    expect(res[0].tickets.map((t) => t.passenger_key)).toEqual([1, 2]);
    expect(res[1].tickets.map((t) => t.passenger_key)).toEqual([3]);
  });

  it('χωρίς email πληρωτή, ο επιβάτης-διοργανωτής παίρνει κανονικά το δικό του', () => {
    const res = passengerRecipients([ticket({ passenger_key: 1, passenger_email: 'a@example.com' })], undefined);
    expect(res.map((r) => r.email)).toEqual(['a@example.com']);
  });
});
