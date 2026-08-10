import { describe, it, expect, vi } from 'vitest';
import { createElement as h } from 'react';
import { render, screen, fireEvent, within } from '@testing-library/react';

import {
  sortSeatsNatural,
  layoutOnlineSeats,
  layoutAllSeats,
  splitRoundPrice,
  nextFreeSeat,
  takenSeatNumbers,
  KIND_LABEL,
  ORDER_STATUS_LABEL,
  TICKET_STATUS_LABEL,
  ORDER_STATUS_TONE,
  TICKET_STATUS_TONE,
} from '@/lib/ticketing';
import { ADMIN_ERROR_TEXT, flashQuery, withFlash } from '@/lib/admin-flash';
import { POYLMAN_LIST, poylmanHref, poylmanTabHref } from '@/lib/admin-routes';
import { searchNormalize, filterTours, sortTours } from '@/lib/filters';
import { setupChecklist, type TourSetupInput } from '@/lib/tour-setup';
import { Pill, AdminPageHeader } from '@/components/admin/ui';
import { AdminSearch } from '@/components/admin/AdminSearch';
import { OrderStatusBadge, TicketStatusBadge } from '@/components/admin/StatusBadge';
import { AdminToursTable } from '@/components/admin/AdminToursTable';
import { PoylmanRoutesList } from '@/components/admin/PoylmanRoutesList';

import type { LayoutJson, TripKind, FareType, Trip } from '@/types/ticketing';
import type { Category, Tour } from '@/types/db';
import type { AdminTourRow } from '@/lib/queries/tours';
import type { AdminRoute, AdminPattern, AdminTrip } from '@/lib/queries/ticketing';

// Τα components του admin τραβούν server actions (supabase/server) — για το
// rendering δεν χρειάζονται, οπότε μπαίνουν στη θέση τους κενές συναρτήσεις.
vi.mock('@/app/admin/(dashboard)/actions', () => ({
  setStatus: vi.fn(),
  setFeatured: vi.fn(),
  deleteTour: vi.fn(),
}));
vi.mock('@/app/admin/(dashboard)/ticketing-actions', () => ({
  createExcursion: vi.fn(),
}));

/* ═══════════════════════════ lib/ticketing ═══════════════════════════ */

describe('sortSeatsNatural — αριθμητικές και αλφαριθμητικές ετικέτες', () => {
  it('ολόκληρο πούλμαν ταξινομείται αριθμητικά, όχι λεξικογραφικά', () => {
    const shuffled = ['21', '3', '10', '1', '20', '2', '11'];
    expect(sortSeatsNatural(shuffled)).toEqual(['1', '2', '3', '10', '11', '20', '21']);
  });

  it('τα γράμματα μιας σειράς μπαίνουν αλφαβητικά μετά τον σκέτο αριθμό', () => {
    expect(sortSeatsNatural(['12C', '12A', '12', '12B'])).toEqual(['12', '12A', '12B', '12C']);
  });

  it('μεικτή λίστα: η αρίθμηση καθορίζει τη σειρά, το γράμμα μόνο τις ισοπαλίες', () => {
    expect(sortSeatsNatural(['2B', '10A', '2A', '10'])).toEqual(['2A', '2B', '10', '10A']);
  });

  it('ετικέτες που δεν ξεκινούν με ψηφίο πέφτουν στο τέλος, αλφαβητικά', () => {
    expect(sortSeatsNatural(['B1', '5', 'A1', '40'])).toEqual(['5', '40', 'A1', 'B1']);
  });

  it('κενή λίστα και μονή θέση περνούν αναλλοίωτες', () => {
    expect(sortSeatsNatural([])).toEqual([]);
    expect(sortSeatsNatural(['7'])).toEqual(['7']);
  });
});

describe('layoutOnlineSeats vs layoutAllSeats — τι πουλιέται online', () => {
  const layout: LayoutJson = {
    decks: [
      {
        name: 'ΚΑΤΩ',
        rows: 2,
        cols: 3,
        cells: [
          { r: 0, c: 0, type: 'seat', seat: '1', online: false },
          { r: 0, c: 1, type: 'seat', seat: '2', online: false },
          { r: 0, c: 2, type: 'seat', seat: '3', online: true },
          { r: 1, c: 0, type: 'driver' },
          { r: 1, c: 1, type: 'seat', seat: '4' },
          { r: 1, c: 2, type: 'wc' },
        ],
      },
    ],
  };

  it('η διαφορά των δύο λιστών είναι ακριβώς οι offline θέσεις', () => {
    const all = layoutAllSeats(layout);
    const online = layoutOnlineSeats(layout);
    expect(all.filter((s) => !online.includes(s))).toEqual(['1', '2']);
  });

  it('κάτοψη με όλες τις θέσεις offline δεν πουλάει τίποτα online', () => {
    const closed: LayoutJson = {
      decks: [
        {
          name: 'ΚΑΤΩ',
          rows: 1,
          cols: 2,
          cells: [
            { r: 0, c: 0, type: 'seat', seat: '1', online: false },
            { r: 0, c: 1, type: 'seat', seat: '2', online: false },
          ],
        },
      ],
    };
    expect(layoutOnlineSeats(closed)).toEqual([]);
    expect(layoutAllSeats(closed)).toEqual(['1', '2']);
  });

  it('κελιά που δεν είναι θέσεις δεν μετρούν, ακόμη κι αν φέρουν ετικέτα', () => {
    const odd: LayoutJson = {
      decks: [
        {
          name: 'ΚΑΤΩ',
          rows: 1,
          cols: 2,
          cells: [
            { r: 0, c: 0, type: 'wc', seat: '99' } as LayoutJson['decks'][0]['cells'][0],
            { r: 0, c: 1, type: 'seat', seat: '1' },
          ],
        },
      ],
    };
    expect(layoutAllSeats(odd)).toEqual(['1']);
    expect(layoutOnlineSeats(odd)).toEqual(['1']);
  });

  it('οι δύο λίστες κρατούν τη σειρά των κελιών, όχι αριθμητική σειρά', () => {
    expect(layoutAllSeats(layout)).toEqual(['1', '2', '3', '4']);
    expect(layoutOnlineSeats(layout)).toEqual(['3', '4']);
  });
});

describe('splitRoundPrice — μονά και ζυγά λεπτά', () => {
  it('ένα λεπτό πάει ολόκληρο στη μετάβαση', () => {
    expect(splitRoundPrice(1)).toEqual({ outbound: 1, ret: 0 });
    expect(splitRoundPrice(3)).toEqual({ outbound: 2, ret: 1 });
  });

  it('η διαφορά των δύο σκελών δεν ξεπερνά ποτέ το ένα λεπτό', () => {
    for (let cents = 0; cents <= 60; cents++) {
      const { outbound, ret } = splitRoundPrice(cents);
      expect(outbound - ret).toBeLessThanOrEqual(1);
      expect(outbound + ret).toBe(cents);
    }
  });

  it('αρνητικό ποσό (επιστροφή χρημάτων) μοιράζεται προς τα πάνω', () => {
    expect(splitRoundPrice(-101)).toEqual({ outbound: -50, ret: -51 });
  });
});

describe('nextFreeSeat πάνω σε ρεαλιστική κάτοψη', () => {
  const layout: LayoutJson = {
    decks: [
      {
        name: 'ΚΑΤΩ',
        rows: 4,
        cols: 5,
        cells: [
          { r: 0, c: 0, type: 'seat', seat: '1' },
          { r: 0, c: 1, type: 'seat', seat: '2' },
          { r: 0, c: 2, type: 'aisle' },
          { r: 0, c: 3, type: 'seat', seat: '3' },
          { r: 0, c: 4, type: 'seat', seat: '4' },
          { r: 1, c: 0, type: 'seat', seat: '9' },
          { r: 1, c: 1, type: 'seat', seat: '10' },
          { r: 1, c: 2, type: 'aisle' },
          { r: 1, c: 3, type: 'seat', seat: '11' },
          { r: 1, c: 4, type: 'seat', seat: '12' },
          { r: 2, c: 0, type: 'seat', seat: '12A', online: false },
          { r: 2, c: 1, type: 'seat', seat: '13' },
          { r: 2, c: 2, type: 'wc' },
          { r: 2, c: 3, type: 'seat', seat: '20' },
          { r: 2, c: 4, type: 'seat', seat: '21' },
          { r: 3, c: 0, type: 'driver' },
        ],
      },
    ],
  };
  const now = 1_700_000_000_000;
  const iso = (delta: number) => new Date(now + delta).toISOString();

  it('η κάτοψη δίνει 12 θέσεις, από τις οποίες 11 πουλιούνται online', () => {
    expect(layoutAllSeats(layout)).toHaveLength(12);
    expect(layoutOnlineSeats(layout)).toHaveLength(11);
  });

  it('ο υπάλληλος προχωράει 11 → 12 όταν οι ενδιάμεσες είναι πιασμένες', () => {
    const taken = takenSeatNumbers(
      [
        { seat_no: '1', claim_type: 'booked', expires_at: null },
        { seat_no: '2', claim_type: 'blocked', expires_at: null },
        { seat_no: '11', claim_type: 'booked', expires_at: null },
      ],
      now
    );
    expect(nextFreeSeat(layoutAllSeats(layout), taken, '11')).toBe('12');
  });

  it('η ληγμένη δέσμευση ξαναδίνει τη θέση στη σειρά προτάσεων', () => {
    const claims = [
      { seat_no: '3', claim_type: 'hold', expires_at: iso(-1_000) },
      { seat_no: '4', claim_type: 'hold', expires_at: iso(60_000) },
    ];
    const taken = takenSeatNumbers(claims, now);
    expect(taken).toEqual(['4']);
    expect(nextFreeSeat(layoutAllSeats(layout), taken, '2')).toBe('3');
  });

  it('η offline θέση 12A προτείνεται κανονικά στην τηλεφωνική κράτηση', () => {
    const taken = takenSeatNumbers([{ seat_no: '13', claim_type: 'booked', expires_at: null }], now);
    expect(nextFreeSeat(layoutAllSeats(layout), taken, '12')).toBe('12A');
    // …ενώ στη λίστα του online πωλητηρίου δεν υπάρχει καν.
    expect(nextFreeSeat(layoutOnlineSeats(layout), taken, '12')).toBe('20');
  });
});

describe('χάρτες ετικετών και τόνων του πούλμαν', () => {
  const TONES = ['ok', 'warn', 'danger', 'muted', 'info'];
  const greek = /[Α-Ωα-ωΆΈΉΊΌΎΏάέήίόύώϊϋΐΰ]/;

  it('το KIND_LABEL καλύπτει και τα τρία είδη ταξιδιού με ελληνικό κείμενο', () => {
    const kinds: TripKind[] = ['oneway', 'round', 'open_return'];
    expect(Object.keys(KIND_LABEL).sort()).toEqual([...kinds].sort());
    for (const k of kinds) expect(KIND_LABEL[k]).toMatch(greek);
  });

  it('το ORDER_STATUS_LABEL έχει και τις έξι καταστάσεις παραγγελίας', () => {
    expect(Object.keys(ORDER_STATUS_LABEL).sort()).toEqual(
      ['awaiting_payment', 'cancelled', 'expired', 'offline', 'paid', 'pending'].sort()
    );
  });

  it('κάθε κατάσταση παραγγελίας έχει και ετικέτα και τόνο — κανένα ορφανό κλειδί', () => {
    expect(Object.keys(ORDER_STATUS_TONE).sort()).toEqual(Object.keys(ORDER_STATUS_LABEL).sort());
    for (const tone of Object.values(ORDER_STATUS_TONE)) expect(TONES).toContain(tone);
  });

  it('κάθε κατάσταση εισιτηρίου έχει και ετικέτα και τόνο', () => {
    expect(Object.keys(TICKET_STATUS_LABEL).sort()).toEqual(['cancelled', 'used', 'valid']);
    expect(Object.keys(TICKET_STATUS_TONE).sort()).toEqual(Object.keys(TICKET_STATUS_LABEL).sort());
    for (const tone of Object.values(TICKET_STATUS_TONE)) expect(TONES).toContain(tone);
  });

  it('καμία ετικέτα δεν είναι κενή και όλες είναι στα ελληνικά', () => {
    const all = [
      ...Object.values(KIND_LABEL),
      ...Object.values(ORDER_STATUS_LABEL),
      ...Object.values(TICKET_STATUS_LABEL),
    ];
    for (const label of all) {
      expect(label.trim().length).toBeGreaterThan(0);
      expect(label).toMatch(greek);
    }
  });
});

/* ═══════════════════════════ lib/admin-flash ═══════════════════════════ */

describe('ADMIN_ERROR_TEXT — το λεξικό των σφαλμάτων', () => {
  const keys = Object.keys(ADMIN_ERROR_TEXT);

  it('κάθε κωδικός δίνει μη κενό ελληνικό κείμενο', () => {
    expect(keys.length).toBeGreaterThan(10);
    for (const k of keys) {
      const text = ADMIN_ERROR_TEXT[k];
      expect(text.trim()).not.toBe('');
      expect(text).toMatch(/[Α-Ωα-ωΆΈΉΊΌΎΏάέήίόύώ]/);
    }
  });

  it('κάθε μήνυμα είναι ολοκληρωμένη πρόταση που κλείνει με τελεία', () => {
    for (const k of keys) expect(ADMIN_ERROR_TEXT[k].trim().endsWith('.')).toBe(true);
  });

  it('υπάρχουν οι κωδικοί που εκπέμπουν τα server actions του πούλμαν', () => {
    for (const k of ['db', 'seat_taken', 'invalid_input', 'not_found', 'invalid_phone', 'invalid_fare']) {
      expect(ADMIN_ERROR_TEXT[k]).toBeTruthy();
    }
  });

  it('άγνωστος κωδικός δεν έχει κείμενο — η σελίδα πρέπει να έχει fallback', () => {
    expect(ADMIN_ERROR_TEXT['ουπς']).toBeUndefined();
  });
});

describe('flashQuery & withFlash — όλοι οι συνδυασμοί', () => {
  it('όταν η ενέργεια πέτυχε ο κωδικός σφάλματος αγνοείται εντελώς', () => {
    expect(flashQuery(true, 'seat_taken')).toBe('?saved=1');
    expect(withFlash('/admin/tours', true, 'seat_taken')).toBe('/admin/tours?saved=1');
  });

  it('κάθε κωδικός του λεξικού επιστρέφεται αυτούσιος μέσα στο query', () => {
    for (const code of Object.keys(ADMIN_ERROR_TEXT)) {
      const url = withFlash('/admin/tours', false, code);
      const parsed = new URLSearchParams(url.split('?')[1]);
      expect(parsed.get('error')).toBe(code);
      expect(ADMIN_ERROR_TEXT[parsed.get('error') as string]).toBeTruthy();
    }
  });

  it('το withFlash πάνω σε path με πολλές παραμέτρους κρατά όλες', () => {
    const url = withFlash('/admin/tours?tab=poylman&q=ναυπλιο', false, 'not_found');
    const parsed = new URLSearchParams(url.split('?')[1]);
    expect(parsed.get('tab')).toBe('poylman');
    expect(parsed.get('q')).toBe('ναυπλιο');
    expect(parsed.get('error')).toBe('not_found');
  });

  it('path που τελειώνει σε «?» παράγει «?&» — άσχημο αλλά αναγνώσιμο', () => {
    expect(withFlash('/admin/tours?', true)).toBe('/admin/tours?&saved=1');
    expect(new URLSearchParams('&saved=1').get('saved')).toBe('1');
  });
});

describe('admin-routes μαζί με τα flash helpers', () => {
  it('η καρτέλα του δρομολογίου κρατά και tab και σφάλμα', () => {
    const url = withFlash(poylmanTabHref('r-9', 'trips'), false, 'seat_taken');
    expect(url).toBe('/admin/tours/poylman/r-9?tab=trips&error=seat_taken');
    expect(ADMIN_ERROR_TEXT[new URLSearchParams(url.split('?')[1]).get('error') as string]).toBe(
      'Η θέση είναι ήδη κατειλημμένη.'
    );
  });

  it('η σελίδα λεπτομερειών χωρίς tab παίρνει «?» και όχι «&»', () => {
    expect(withFlash(poylmanHref('r-9'), true)).toBe('/admin/tours/poylman/r-9?saved=1');
  });

  it('το POYLMAN_LIST διαβάζεται ως tab=poylman ακόμη και μετά το flash', () => {
    const url = withFlash(POYLMAN_LIST, true);
    const parsed = new URLSearchParams(url.split('?')[1]);
    expect(parsed.get('tab')).toBe('poylman');
    expect(parsed.get('saved')).toBe('1');
  });
});

/* ═══════════════════════════ lib/filters ═══════════════════════════ */

describe('searchNormalize — ελληνικές ιδιαιτερότητες', () => {
  it('αφαιρεί τα διαλυτικά όπως και τους τόνους', () => {
    expect(searchNormalize('ΑΪΔΑ')).toBe(searchNormalize('αιδα'));
    expect(searchNormalize('πρωτοφανΐα')).toBe(searchNormalize('πρωτοφανια'));
  });

  it('ενοποιεί όλα τα τελικά «ς» μιας πρότασης', () => {
    expect(searchNormalize('Άγιος Νικόλαος')).toBe('αγιοσ νικολαοσ');
  });

  it('δεν κόβει κενά ούτε στην αρχή ούτε στο τέλος', () => {
    expect(searchNormalize('  Αθήνα  ')).toBe('  αθηνα  ');
  });

  it('κρατά σημεία στίξης και ψηφία αναλλοίωτα', () => {
    expect(searchNormalize('Ναύπλιο - 2ήμερη (νέα)!')).toBe('ναυπλιο - 2ημερη (νεα)!');
  });

  it('είναι σταθερή: δεύτερο πέρασμα δεν αλλάζει τίποτα', () => {
    for (const s of ['Ύδρα', 'ΠΟΡΟΣ', 'Ζάκυνθος & Κεφαλονιά', '']) {
      expect(searchNormalize(searchNormalize(s))).toBe(searchNormalize(s));
    }
  });

  it('null γίνεται κενό, ενώ αριθμός διαβάζεται ως κείμενο', () => {
    expect(searchNormalize(null as unknown as string)).toBe('');
    expect(searchNormalize(undefined as unknown as string)).toBe('');
    expect(searchNormalize(2026 as unknown as string)).toBe('2026');
  });
});

describe('filterTours — κατηγορία σε συνδυασμούς', () => {
  const t = (o: Partial<Tour>): Tour =>
    ({
      id: 'x', slug: 'x', title: 'x', subtitle: null, short_description: null, summary: null, body: {},
      price_from: 50, price_original: null, currency: 'EUR', duration_label: null,
      departure_note: null, meeting_point: null, meeting_points: [], highlights: [], included: [], not_included: [], route_id: null,
      status: 'published', is_featured: false, bookings_open: true, cover_image_id: null,
      seo_title: null, seo_description: null, source_url: null, sort_order: 0, published_at: null,
      ...o,
    }) as Tour;
  const cats = (...slugs: string[]): Tour['categories'] =>
    slugs.map((slug, i) => ({ id: slug, slug, name_el: slug, description_el: null, sort_order: i }));

  it('εκδρομή σε δύο κατηγορίες περνά και από τα δύο φίλτρα', () => {
    const a = t({ id: 'a', categories: cats('monoimeres', 'kroyazieres') });
    expect(filterTours([a], { category: 'monoimeres' }).map((x) => x.id)).toEqual(['a']);
    expect(filterTours([a], { category: 'kroyazieres' }).map((x) => x.id)).toEqual(['a']);
  });

  it('άγνωστο slug κατηγορίας δίνει άδειο αποτέλεσμα, όχι όλα', () => {
    const a = t({ id: 'a', categories: cats('monoimeres') });
    expect(filterTours([a], { category: 'δεν-υπαρχει' })).toEqual([]);
  });

  it('κρατά τη σειρά της εισόδου και δεν την πειράζει', () => {
    const list = [
      t({ id: 'c', categories: cats('x') }),
      t({ id: 'a', categories: cats('x') }),
      t({ id: 'b', categories: cats('y') }),
    ];
    expect(filterTours(list, { category: 'x' }).map((x) => x.id)).toEqual(['c', 'a']);
    expect(list.map((x) => x.id)).toEqual(['c', 'a', 'b']);
  });

  it('φίλτρο κατηγορίας και ταξινόμηση συνδυάζονται χωρίς να χάνεται εκδρομή', () => {
    const list = [
      t({ id: 'hi', price_from: 90, categories: cats('monoimeres') }),
      t({ id: 'lo', price_from: 20, categories: cats('monoimeres') }),
      t({ id: 'out', price_from: 5, categories: cats('polyimeres') }),
    ];
    const shown = sortTours(filterTours(list, { category: 'monoimeres' }), 'price-asc');
    expect(shown.map((x) => x.id)).toEqual(['lo', 'hi']);
  });
});

/* ═══════════════════════════ lib/tour-setup ═══════════════════════════ */

describe('setupChecklist — ετικέτες και οδηγίες ανά βήμα', () => {
  const base: TourSetupInput = {
    status: 'draft',
    bookings_open: true,
    summary: null,
    imageCount: 0,
    tierCount: 0,
    futureDepartureCount: 0,
    meetingPointCount: 0,
  };
  const full: TourSetupInput = {
    status: 'published', bookings_open: true, summary: 'Κείμενο',
    imageCount: 2, tierCount: 1, futureDepartureCount: 1, meetingPointCount: 1,
  };

  it('τα έξι βήματα έχουν τις ελληνικές ετικέτες του καταλόγου, στη σειρά', () => {
    expect(setupChecklist(base).map((i) => i.label)).toEqual([
      'Περιγραφή',
      'Φωτογραφίες',
      'Κατηγορίες τιμών',
      'Ημερομηνίες αναχώρησης',
      'Σημεία επιβίβασης',
      'Δημοσιευμένη',
    ]);
  });

  it('σε πλήρη εκδρομή κανένα βήμα δεν κρατά οδηγία', () => {
    for (const item of setupChecklist(full)) expect(item.hint).toBeUndefined();
  });

  it('τα τέσσερα πρώτα βήματα δεν έχουν καθόλου πεδίο warning', () => {
    for (const item of setupChecklist(base).slice(0, 4)) expect(item.warning).toBeUndefined();
  });

  it('μερικώς συμπληρωμένη: οδηγία μόνο στα βήματα που λείπουν', () => {
    const items = setupChecklist({ ...base, summary: 'Κείμενο', imageCount: 4 });
    const hinted = items.filter((i) => i.hint).map((i) => i.id);
    expect(hinted).toEqual(['pricing', 'departures', 'meeting_points']);
  });

  it('κάθε οδηγία εξηγεί τι θα δει ο πελάτης, όχι απλώς ότι λείπει κάτι', () => {
    const items = setupChecklist(base);
    expect(items.find((i) => i.id === 'summary')?.hint).toMatch(/σελίδα/);
    expect(items.find((i) => i.id === 'photos')?.hint).toMatch(/site/);
    expect(items.find((i) => i.id === 'pricing')?.hint).toMatch(/αιτήματος/);
  });
});

/* ═══════════════════════════ components/admin/ui ═══════════════════════════ */

describe('Pill — οι πέντε τόνοι', () => {
  const CLS: Record<string, string> = {
    ok: 'bg-olive/15',
    warn: 'bg-gold/20',
    danger: 'bg-cta/10',
    muted: 'bg-background',
    info: 'bg-primary/10',
  };

  it('κάθε τόνος βάφει το chip με τη δική του κλάση', () => {
    for (const [tone, cls] of Object.entries(CLS)) {
      const { unmount } = render(h(Pill, { tone: tone as 'ok', children: `Δοκιμή-${tone}` }));
      expect(screen.getByText(`Δοκιμή-${tone}`).className).toContain(cls);
      unmount();
    }
  });

  it('δείχνει το περιεχόμενο που του δίνεται', () => {
    render(h(Pill, { tone: 'warn', children: 'Κλειστή' }));
    expect(screen.getByText('Κλειστή')).toBeInTheDocument();
  });

  it('είναι inline span με στρογγυλό περίγραμμα, όχι block', () => {
    render(h(Pill, { tone: 'ok', children: 'Ok' }));
    const el = screen.getByText('Ok');
    expect(el.tagName).toBe('SPAN');
    expect(el.className).toContain('rounded-full');
  });
});

describe('AdminPageHeader', () => {
  it('ο τίτλος βγαίνει ως h1', () => {
    render(h(AdminPageHeader, { title: 'Εκδρομές' }));
    expect(screen.getByRole('heading', { level: 1 })).toHaveTextContent('Εκδρομές');
  });

  it('ο υπότιτλος εμφανίζεται μόνο όταν δοθεί', () => {
    const { unmount } = render(h(AdminPageHeader, { title: 'Εκδρομές', subtitle: 'Ο κατάλογος του site' }));
    expect(screen.getByText('Ο κατάλογος του site')).toBeInTheDocument();
    unmount();
    render(h(AdminPageHeader, { title: 'Εκδρομές' }));
    expect(screen.queryByText('Ο κατάλογος του site')).not.toBeInTheDocument();
  });

  it('χωρίς backHref δεν υπάρχει καθόλου σύνδεσμος επιστροφής', () => {
    render(h(AdminPageHeader, { title: 'Εκδρομές' }));
    expect(screen.queryByRole('link')).not.toBeInTheDocument();
  });

  it('με backHref δείχνει βέλος και ετικέτα προς τη διεύθυνση που δόθηκε', () => {
    render(h(AdminPageHeader, { title: 'Δρομολόγιο', backHref: POYLMAN_LIST, backLabel: 'Πίσω στις εκδρομές' }));
    const link = screen.getByRole('link');
    expect(link).toHaveAttribute('href', '/admin/tours?tab=poylman');
    expect(link).toHaveTextContent('← Πίσω στις εκδρομές');
  });

  it('το actions slot μπαίνει δίπλα στον τίτλο', () => {
    render(
      h(AdminPageHeader, {
        title: 'Εκδρομές',
        actions: h('button', { type: 'button' }, 'Νέα εκδρομή'),
      })
    );
    expect(screen.getByRole('button', { name: 'Νέα εκδρομή' })).toBeInTheDocument();
  });
});

/* ═══════════════════════════ AdminSearch ═══════════════════════════ */

describe('AdminSearch', () => {
  const renderSearch = (props: Record<string, unknown> = {}) =>
    render(h(AdminSearch, { action: '/admin/tours', placeholder: 'Αναζήτηση…', ...props } as never));

  it('υποβάλλει με GET στη διεύθυνση που δόθηκε', () => {
    const { container } = renderSearch();
    expect(container.querySelector('form')).toHaveAttribute('action', '/admin/tours');
  });

  it('το πεδίο κειμένου λέγεται «q» και παίρνει ετικέτα από το placeholder', () => {
    renderSearch();
    const input = screen.getByLabelText('Αναζήτηση…') as HTMLInputElement;
    expect(input).toHaveAttribute('name', 'q');
    expect(input.value).toBe('');
  });

  it('το defaultValue προσυμπληρώνει τον όρο αναζήτησης', () => {
    renderSearch({ defaultValue: 'ναυπλιο' });
    expect((screen.getByLabelText('Αναζήτηση…') as HTMLInputElement).value).toBe('ναυπλιο');
  });

  it('κάθε κλειδί του hidden γίνεται κρυφό πεδίο που επιβιώνει της αναζήτησης', () => {
    const { container } = renderSearch({ hidden: { tab: 'poylman', cat: 'monoimeres' } });
    const hidden = Array.from(container.querySelectorAll('input[type="hidden"]')) as HTMLInputElement[];
    expect(hidden.map((i) => [i.name, i.value])).toEqual([
      ['tab', 'poylman'],
      ['cat', 'monoimeres'],
    ]);
  });

  it('τιμές undefined ή κενές παραλείπονται αντί να ταξιδέψουν άδειες', () => {
    const { container } = renderSearch({ hidden: { tab: 'poylman', cat: undefined, q2: '' } });
    const hidden = Array.from(container.querySelectorAll('input[type="hidden"]')) as HTMLInputElement[];
    expect(hidden).toHaveLength(1);
    expect(hidden[0].name).toBe('tab');
  });
});

/* ═══════════════════════════ StatusBadge ═══════════════════════════ */

describe('OrderStatusBadge & TicketStatusBadge', () => {
  it('κάθε κατάσταση παραγγελίας δείχνει την ελληνική της ετικέτα', () => {
    for (const [status, label] of Object.entries(ORDER_STATUS_LABEL)) {
      const { unmount } = render(h(OrderStatusBadge, { status }));
      expect(screen.getByText(label)).toBeInTheDocument();
      unmount();
    }
  });

  it('η πληρωμένη είναι πράσινη και η ακυρωμένη κόκκινη', () => {
    const { unmount } = render(h(OrderStatusBadge, { status: 'paid' }));
    expect(screen.getByText('Πληρωμένη').className).toContain('bg-olive/15');
    unmount();
    render(h(OrderStatusBadge, { status: 'cancelled' }));
    expect(screen.getByText('Ακυρωμένη').className).toContain('bg-cta/10');
  });

  it('άγνωστη κατάσταση παραγγελίας δείχνει τον ίδιο τον κωδικό, ουδέτερα', () => {
    render(h(OrderStatusBadge, { status: 'refunded' }));
    const el = screen.getByText('refunded');
    expect(el.className).toContain('bg-background');
  });

  it('κάθε κατάσταση εισιτηρίου δείχνει την ελληνική της ετικέτα', () => {
    for (const [status, label] of Object.entries(TICKET_STATUS_LABEL)) {
      const { unmount } = render(h(TicketStatusBadge, { status }));
      expect(screen.getByText(label)).toBeInTheDocument();
      unmount();
    }
  });

  it('το χρησιμοποιημένο εισιτήριο δεν βάφεται ούτε ως έγκυρο ούτε ως άκυρο', () => {
    render(h(TicketStatusBadge, { status: 'used' }));
    const el = screen.getByText('Χρησιμοποιημένο');
    expect(el.className).toContain('bg-primary/10');
    expect(el.className).not.toContain('bg-olive/15');
  });

  it('άγνωστη κατάσταση εισιτηρίου δείχνει τον κωδικό ουδέτερα', () => {
    render(h(TicketStatusBadge, { status: 'refunded' }));
    expect(screen.getByText('refunded').className).toContain('bg-background');
  });
});

/* ═══════════════════════════ AdminToursTable ═══════════════════════════ */

describe('AdminToursTable', () => {
  const categories: Category[] = [
    { id: 'c1', slug: 'monoimeres', name_el: 'Μονοήμερες', description_el: null, sort_order: 0 },
    { id: 'c2', slug: 'kroyazieres', name_el: 'Κρουαζιέρες', description_el: null, sort_order: 1 },
  ];
  const tours: AdminTourRow[] = [
    {
      id: 't1', slug: 'monoimeri-nafplio', title: 'Μονοήμερη Ναύπλιο', status: 'published',
      is_featured: false, price_from: 35, bookings_open: true,
      categories: [{ slug: 'monoimeres', name_el: 'Μονοήμερες' }],
    },
    {
      id: 't2', slug: 'kroyaziera-ydra', title: 'Κρουαζιέρα Ύδρα', status: 'draft',
      is_featured: true, price_from: null, bookings_open: false,
      categories: [{ slug: 'kroyazieres', name_el: 'Κρουαζιέρες' }],
    },
    {
      id: 't3', slug: 'meteora-2imeri', title: 'Μετέωρα 2ήμερη', status: 'hidden',
      is_featured: false, price_from: 120, bookings_open: true,
      categories: [],
    },
  ];
  const renderTable = () => render(h(AdminToursTable, { tours, categories }));
  const search = () => screen.getByLabelText('Αναζήτηση τίτλου / slug…');

  it('δείχνει μία γραμμή ανά εκδρομή, με τίτλο και slug', () => {
    renderTable();
    expect(screen.getByText('Μονοήμερη Ναύπλιο')).toBeInTheDocument();
    expect(screen.getByText('/monoimeri-nafplio')).toBeInTheDocument();
    expect(screen.getByText('3 από 3 εκδρομές')).toBeInTheDocument();
  });

  it('οι κατηγορίες βγαίνουν ως chips, και η εκδρομή χωρίς κατηγορία παίρνει παύλα', () => {
    renderTable();
    const row = screen.getByText('Μετέωρα 2ήμερη').closest('tr') as HTMLElement;
    expect(within(row).getByText('—')).toBeInTheDocument();
    const nafplio = screen.getByText('Μονοήμερη Ναύπλιο').closest('tr') as HTMLElement;
    expect(within(nafplio).getByText('Μονοήμερες')).toBeInTheDocument();
  });

  it('η κλειστή για κρατήσεις παίρνει pill «Κλειστή», οι ανοιχτές όχι', () => {
    renderTable();
    expect(screen.getAllByText('Κλειστή')).toHaveLength(1);
    const ydra = screen.getByText('Κρουαζιέρα Ύδρα').closest('tr') as HTMLElement;
    expect(within(ydra).getByText('Κλειστή')).toBeInTheDocument();
  });

  it('η κατάσταση της εκδρομής μεταφράζεται στα ελληνικά', () => {
    renderTable();
    expect(screen.getByText('Δημοσιευμένη')).toBeInTheDocument();
    expect(screen.getByText('Πρόχειρη')).toBeInTheDocument();
    expect(screen.getByText('Κρυμμένη')).toBeInTheDocument();
  });

  it('το κουμπί κατηγορίας κρατά μόνο τις εκδρομές της', () => {
    renderTable();
    fireEvent.click(screen.getByRole('button', { name: 'Κρουαζιέρες' }));
    expect(screen.getByText('1 από 3 εκδρομές')).toBeInTheDocument();
    expect(screen.getByText('Κρουαζιέρα Ύδρα')).toBeInTheDocument();
    expect(screen.queryByText('Μονοήμερη Ναύπλιο')).not.toBeInTheDocument();
  });

  it('το «Όλες» επαναφέρει ολόκληρο τον κατάλογο', () => {
    renderTable();
    fireEvent.click(screen.getByRole('button', { name: 'Κρουαζιέρες' }));
    fireEvent.click(screen.getByRole('button', { name: 'Όλες' }));
    expect(screen.getByText('3 από 3 εκδρομές')).toBeInTheDocument();
  });

  it('η αναζήτηση βρίσκει τίτλο χωρίς τόνους και slug', () => {
    renderTable();
    fireEvent.change(search(), { target: { value: 'ναυπλιο' } });
    expect(screen.getByText('1 από 3 εκδρομές')).toBeInTheDocument();
    fireEvent.change(search(), { target: { value: 'meteora' } });
    expect(screen.getByText('Μετέωρα 2ήμερη')).toBeInTheDocument();
  });

  it('φίλτρο κατηγορίας και αναζήτηση ισχύουν ταυτόχρονα', () => {
    renderTable();
    fireEvent.click(screen.getByRole('button', { name: 'Μονοήμερες' }));
    fireEvent.change(search(), { target: { value: 'ύδρα' } });
    expect(screen.getByText('0 από 3 εκδρομές')).toBeInTheDocument();
    expect(screen.getByText('Δεν βρέθηκαν εκδρομές.')).toBeInTheDocument();
  });

  it('η τιμή γράφεται «από N€», αλλιώς παύλα', () => {
    renderTable();
    expect(screen.getByText('από 35€')).toBeInTheDocument();
    const ydra = screen.getByText('Κρουαζιέρα Ύδρα').closest('tr') as HTMLElement;
    expect(within(ydra).getByText('—')).toBeInTheDocument();
  });
});

/* ═══════════════════════════ PoylmanRoutesList ═══════════════════════════ */

describe('PoylmanRoutesList', () => {
  const route = (o: Partial<AdminRoute> = {}): AdminRoute =>
    ({
      id: 'r1', origin_station_id: 's1', destination_station_id: 's2', status: 'published',
      duration_min: 120, sales_cutoff_min: 5, position: 0, title: 'Μονοήμερη Ναύπλιο',
      boarding_points: [], origin: { name: 'Αθήνα' }, destination: { name: 'Ναύπλιο' },
      ...o,
    }) as AdminRoute;

  const trip = (o: Partial<Trip> & { route_id: string }): AdminTrip =>
    ({
      id: `tr-${Math.random()}`, pattern_id: null, layout_id: 'l1',
      service_date: '2026-08-09', departure_at: '2026-08-09T06:00:00+03:00',
      status: 'scheduled', sales_cutoff_min: null, online_seats_total: 50, notes: null,
      route: null, layout: null,
      ...o,
    }) as unknown as AdminTrip;

  const fare = (o: Partial<FareType> & { route_id: string }): FareType =>
    ({
      id: `f-${Math.random()}`, name: 'Κανονικό', description: null,
      price_oneway_cents: 1250, price_round_cents: 2000, requires_document: false,
      is_default: true, position: 1, is_active: true,
      ...o,
    }) as FareType;

  const renderList = (props: Record<string, unknown> = {}) =>
    render(
      h(PoylmanRoutesList, {
        routes: [route()],
        patterns: [] as AdminPattern[],
        trips: [] as AdminTrip[],
        fares: [] as FareType[],
        ...props,
      } as never)
    );

  it('κάθε εκδρομή γίνεται γραμμή με σύνδεσμο προς τη σελίδα της', () => {
    renderList();
    const link = screen.getByRole('link', { name: 'Μονοήμερη Ναύπλιο' });
    expect(link).toHaveAttribute('href', poylmanHref('r1'));
  });

  it('εκδρομή χωρίς τίτλο δείχνει το ζεύγος σταθμών', () => {
    renderList({ routes: [route({ title: null })] });
    expect(screen.getByRole('link', { name: 'Αθήνα → Ναύπλιο' })).toBeInTheDocument();
  });

  it('η δημοσιευμένη παίρνει «Δημοσιευμένη», η πρόχειρη «Πρόχειρη»', () => {
    renderList({
      routes: [route(), route({ id: 'r2', title: 'Πρόχειρη εκδρομή', status: 'draft' })],
    });
    expect(screen.getByText('Δημοσιευμένη').className).toContain('bg-olive/15');
    expect(screen.getByText('Πρόχειρη').className).toContain('bg-background');
  });

  it('η επόμενη αναχώρηση γράφεται ως ημέρα/μήνας από το πρώτο δρομολόγιο', () => {
    renderList({
      trips: [
        trip({ route_id: 'r1', service_date: '2026-08-09' }),
        trip({ route_id: 'r1', service_date: '2026-09-01' }),
      ],
    });
    expect(screen.getByText('09/08')).toBeInTheDocument();
  });

  it('μετράει μόνο τα προγραμματισμένα δρομολόγια, όχι τα ακυρωμένα', () => {
    renderList({
      trips: [
        trip({ route_id: 'r1' }),
        trip({ route_id: 'r1', service_date: '2026-08-10' }),
        trip({ route_id: 'r1', service_date: '2026-08-11', status: 'cancelled' }),
      ],
    });
    expect(screen.getByText('2 δρομολόγια')).toBeInTheDocument();
  });

  it('χωρίς δρομολόγια δείχνει μηδέν και παύλα στην επόμενη αναχώρηση', () => {
    renderList();
    expect(screen.getByText('0 δρομολόγια')).toBeInTheDocument();
    const row = screen.getByRole('link', { name: 'Μονοήμερη Ναύπλιο' }).parentElement as HTMLElement;
    expect(within(row).getAllByText('—').length).toBeGreaterThan(0);
  });

  it('η τιμή «Κανονικό» της εκδρομής γράφεται σε ευρώ', () => {
    renderList({ fares: [fare({ route_id: 'r1' })] });
    expect(screen.getByText('12,50 €')).toBeInTheDocument();
  });

  it('η αναζήτηση κρατά μόνο τις εκδρομές που ταιριάζουν, χωρίς τόνους', () => {
    renderList({
      routes: [route(), route({ id: 'r2', title: 'Κρουαζιέρα Ύδρα' })],
      q: 'ναύπλιο',
    });
    expect(screen.getByRole('link', { name: 'Μονοήμερη Ναύπλιο' })).toBeInTheDocument();
    expect(screen.queryByRole('link', { name: 'Κρουαζιέρα Ύδρα' })).not.toBeInTheDocument();
  });

  it('άδεια λίστα χωρίς αναζήτηση λέει ότι δεν υπάρχουν εκδρομές', () => {
    renderList({ routes: [] });
    expect(screen.getByText('Δεν υπάρχουν εκδρομές πούλμαν.')).toBeInTheDocument();
  });

  it('άδειο αποτέλεσμα αναζήτησης επαναλαμβάνει τον όρο που δεν βρέθηκε', () => {
    renderList({ q: 'Σαντορίνη' });
    expect(screen.getByText('Δεν βρέθηκαν αποτελέσματα για «Σαντορίνη».')).toBeInTheDocument();
  });

  it('η αναζήτηση της καρτέλας ταξιδεύει με κρυφό tab=poylman', () => {
    const { container } = renderList();
    const hidden = container.querySelector('input[type="hidden"]') as HTMLInputElement;
    expect([hidden.name, hidden.value]).toEqual(['tab', 'poylman']);
    expect(container.querySelector('form')).toHaveAttribute('action', '/admin/tours');
  });
});
