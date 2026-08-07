import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import { render, screen, fireEvent, waitFor, within } from '@testing-library/react';

import {
  computeBookingTotal,
  formatCents,
  isBookable,
  passengerLabels,
  tourRouteCta,
} from '@/lib/booking';
import { coverImage, coverPathUrl, imageUrl } from '@/lib/images';
import { galleryImages } from '@/lib/gallery';
import { resolveTourAlias } from '@/lib/tour-aliases';
import { pathTokens, suggestTours } from '@/lib/not-found-suggest';

import { TourBookingWidget } from '@/components/booking/TourBookingWidget';
import { TourOrderSummary } from '@/components/booking/TourOrderSummary';
import { ExcursionSearchForm } from '@/components/ticketing/ExcursionSearchForm';
import { TripList } from '@/components/ticketing/TripList';
import { FarePricesDialog } from '@/components/ticketing/FarePricesDialog';
import { Pagination } from '@/components/trips/Pagination';
import { TourCard } from '@/components/trips/TourCard';
import { PoylmanQuoteForm } from '@/components/rentals/PoylmanQuoteForm';
import { PoylmanPricingTable } from '@/components/rentals/PoylmanPricingTable';

import { beginTourBooking } from '@/app/(site)/kratisi/actions';
import { createLead } from '@/app/(site)/actions';

import type {
  Category,
  Tour,
  TourDeparture,
  TourImage,
  TourOrder,
  TourOrderItem,
  TourPriceTier,
} from '@/types/db';
import type { Excursion, OrderFare, TripRow } from '@/types/ticketing';
import type { PoylmanPriceTable } from '@/data/poylman-page';

// ── Mocks ────────────────────────────────────────────────────────────────────
// Τα server actions τραβούν supabase/server + next/headers· τα components εδώ
// γίνονται render μόνο, δεν χτυπούν βάση.
vi.mock('@/app/(site)/kratisi/actions', () => ({
  beginTourBooking: vi.fn(),
  submitTourCheckout: vi.fn(),
  cancelTourBooking: vi.fn(),
}));
vi.mock('@/app/(site)/actions', () => ({ createLead: vi.fn() }));

const push = vi.fn();
let searchParamsStr = '';
vi.mock('next/navigation', () => ({
  useRouter: () => ({ push, replace: vi.fn(), refresh: vi.fn(), prefetch: vi.fn() }),
  useSearchParams: () => new URLSearchParams(searchParamsStr),
}));

beforeEach(() => {
  vi.clearAllMocks();
  searchParamsStr = '';
});
afterEach(() => {
  vi.unstubAllEnvs();
});

// ── Fixtures ─────────────────────────────────────────────────────────────────
const tier = (over: Partial<TourPriceTier> & { id: string }): TourPriceTier => ({
  tour_id: 't1',
  label: 'Κατηγορία',
  price_cents: 10000,
  price_original_cents: null,
  max_qty: 20,
  position: 0,
  is_active: true,
  ...over,
});

const item = (over: Partial<TourOrderItem> & { label: string; qty: number }): TourOrderItem => ({
  tier_id: 'x',
  unit_cents: 0,
  line_cents: 0,
  ...over,
});

const img = (over: Partial<TourImage> & { id: string }): TourImage => ({
  tour_id: 't1',
  storage_path: `https://cdn.example.com/${over.id}.jpg`,
  alt_el: null,
  width: null,
  height: null,
  blurhash: null,
  position: 0,
  ...over,
});

const departure = (over: Partial<TourDeparture> & { id: string; starts_on: string }): TourDeparture => ({
  tour_id: 't1',
  ends_on: null,
  note: null,
  capacity: null,
  is_active: true,
  ...over,
});

// ═════════════════════════════════════════════════════════════════════════════
// lib/booking — passengerLabels με πολλές κατηγορίες
// ═════════════════════════════════════════════════════════════════════════════
describe('passengerLabels — πολλαπλές κατηγορίες και ποσότητες', () => {
  it('τρεις κατηγορίες αναπτύσσονται στη σειρά των items', () => {
    expect(
      passengerLabels({
        items: [
          item({ label: 'Δίκλινο', qty: 2 }),
          item({ label: 'Μονόκλινο', qty: 1 }),
          item({ label: 'Παιδί', qty: 3 }),
        ],
        party_size: 6,
      })
    ).toEqual([
      'Δίκλινο 1',
      'Δίκλινο 2',
      'Μονόκλινο 1',
      'Παιδί 1',
      'Παιδί 2',
      'Παιδί 3',
    ]);
  });

  it('κατηγορία με μηδενική ποσότητα δεν δίνει ετικέτα', () => {
    expect(
      passengerLabels({
        items: [item({ label: 'Δίκλινο', qty: 0 }), item({ label: 'Παιδί', qty: 2 })],
        party_size: 2,
      })
    ).toEqual(['Παιδί 1', 'Παιδί 2']);
  });

  it('όταν όλα τα items είναι μηδενικά πέφτει στο «Ταξιδιώτης N»', () => {
    expect(passengerLabels({ items: [item({ label: 'Δίκλινο', qty: 0 })], party_size: 2 })).toEqual([
      'Ταξιδιώτης 1',
      'Ταξιδιώτης 2',
    ]);
  });

  it('τα items υπερισχύουν του party_size όταν διαφωνούν', () => {
    // party_size λέει 10, τα items λένε 1 — μετράνε τα items.
    expect(passengerLabels({ items: [item({ label: 'Δίκλινο', qty: 1 })], party_size: 10 })).toEqual([
      'Δίκλινο 1',
    ]);
  });

  it('δύο items με την ίδια ετικέτα δίνουν επαναλαμβανόμενη αρίθμηση', () => {
    // Η αρίθμηση είναι ανά item, όχι ανά ετικέτα — δύο γραμμές «Ενήλικας»
    // παράγουν δύο φορές «Ενήλικας 1».
    expect(
      passengerLabels({
        items: [
          item({ tier_id: 'a', label: 'Ενήλικας', qty: 1 }),
          item({ tier_id: 'b', label: 'Ενήλικας', qty: 1 }),
        ],
        party_size: 2,
      })
    ).toEqual(['Ενήλικας 1', 'Ενήλικας 1']);
  });
});

// ═════════════════════════════════════════════════════════════════════════════
// lib/booking — computeBookingTotal / isBookable / tourRouteCta / formatCents
// ═════════════════════════════════════════════════════════════════════════════
describe('computeBookingTotal — οριακές εισόδους', () => {
  it('θέσεις με κενά γύρω τους απορρίπτονται', () => {
    expect(computeBookingTotal(' 3 ', 25)).toBeNull();
    expect(computeBookingTotal('3 ', 25)).toBeNull();
  });

  it('πρόσημο ή εκθετική γραφή απορρίπτονται', () => {
    expect(computeBookingTotal('+3', 25)).toBeNull();
    expect(computeBookingTotal('1e2', 25)).toBeNull();
    expect(computeBookingTotal('3,5', 25)).toBeNull();
  });

  it('μη πεπερασμένη τιμή: NaN δίνει null, Infinity περνάει όπως είναι', () => {
    expect(computeBookingTotal('2', Number.NaN)).toBeNull();
    expect(computeBookingTotal('2', Number.POSITIVE_INFINITY)).toBe(Number.POSITIVE_INFINITY);
  });

  it('αρνητική τιμή ανά άτομο δίνει αρνητικό σύνολο (δεν φιλτράρεται)', () => {
    expect(computeBookingTotal('2', -10)).toBe(-20);
  });

  it('πολύ μεγάλο πλήθος θέσεων υπολογίζεται κανονικά', () => {
    expect(computeBookingTotal('1000000', 1)).toBe(1000000);
  });
});

describe('isBookable — πλήρης πίνακας', () => {
  it('κλειστή χωρίς κατηγορίες → false', () => {
    expect(isBookable({ bookings_open: false }, [])).toBe(false);
  });

  it('χωρίς πεδίο bookings_open και χωρίς κατηγορίες → false', () => {
    expect(isBookable({}, [])).toBe(false);
  });

  it('κοιτά μόνο το πλήθος, όχι το περιεχόμενο των κατηγοριών', () => {
    expect(isBookable({ bookings_open: true }, [null, undefined])).toBe(true);
  });

  it('bookings_open ρητά undefined συμπεριφέρεται σαν ανοιχτή', () => {
    expect(isBookable({ bookings_open: undefined }, [tier({ id: 'a' })])).toBe(true);
  });
});

describe('tourRouteCta — υπόλοιποι κλάδοι', () => {
  const base = { routeId: 'r-1', routePublished: true, hasActiveTiers: false, bookingsOpen: true };

  it('κενό routeId δεν δίνει σύνδεσμο', () => {
    expect(tourRouteCta({ ...base, routeId: '' })).toBeNull();
  });

  it('routeId undefined δεν δίνει σύνδεσμο', () => {
    expect(tourRouteCta({ ...base, routeId: undefined })).toBeNull();
  });

  it('κλειστή ΚΑΙ πρόχειρη → τίποτα', () => {
    expect(tourRouteCta({ ...base, bookingsOpen: false, routePublished: false })).toBeNull();
  });

  it('το routeId μπαίνει κωδικοποιημένο στο query', () => {
    expect(tourRouteCta({ ...base, routeId: 'a b&c' })).toEqual({
      href: '/eisitiria?ekdromi=a%20b%26c',
      primary: true,
    });
  });
});

describe('formatCents — μικρά και στρογγυλά ποσά', () => {
  it('ένα λεπτό γράφεται με δύο δεκαδικά', () => {
    expect(formatCents(1)).toMatch(/^0[.,]01\s?€$/);
  });

  it('99 λεπτά μένουν κάτω από το ευρώ', () => {
    expect(formatCents(99)).toMatch(/^0[.,]99\s?€$/);
  });

  it('στρογγυλές εκατοντάδες ευρώ κρατούν τα δεκαδικά', () => {
    expect(formatCents(50000)).toMatch(/500[.,]00\s?€$/);
  });
});

// ═════════════════════════════════════════════════════════════════════════════
// lib/images
// ═════════════════════════════════════════════════════════════════════════════
describe('imageUrl', () => {
  it('απόλυτη διεύθυνση http/https περνάει αυτούσια', () => {
    expect(imageUrl(img({ id: 'a', storage_path: 'https://cdn.example.com/a.jpg' }))).toBe(
      'https://cdn.example.com/a.jpg'
    );
    expect(imageUrl(img({ id: 'b', storage_path: 'http://cdn.example.com/b.jpg' }))).toBe(
      'http://cdn.example.com/b.jpg'
    );
  });

  it('σχετική διαδρομή γίνεται δημόσιο URL του Storage', () => {
    vi.stubEnv('NEXT_PUBLIC_SUPABASE_URL', 'https://proj.supabase.co');
    expect(imageUrl(img({ id: 'c', storage_path: 'tours/c.jpg' }))).toBe(
      'https://proj.supabase.co/storage/v1/object/public/tour-images/tours/c.jpg'
    );
  });

  it('χωρίς ρυθμισμένο Supabase URL επιστρέφει τη σκέτη διαδρομή', () => {
    vi.stubEnv('NEXT_PUBLIC_SUPABASE_URL', '');
    expect(imageUrl(img({ id: 'c', storage_path: 'tours/c.jpg' }))).toBe('tours/c.jpg');
  });

  it('null, undefined ή κενή διαδρομή δίνουν null', () => {
    expect(imageUrl(null)).toBeNull();
    expect(imageUrl(undefined)).toBeNull();
    expect(imageUrl(img({ id: 'd', storage_path: '' }))).toBeNull();
  });
});

describe('coverImage', () => {
  it('προτιμά την εικόνα με το cover_image_id', () => {
    const tour = { images: [img({ id: 'a' }), img({ id: 'b' })], cover_image_id: 'b' };
    expect(coverImage(tour)?.id).toBe('b');
  });

  it('πέφτει στην πρώτη εικόνα όταν το cover_image_id δεν αντιστοιχεί', () => {
    const tour = { images: [img({ id: 'a' }), img({ id: 'b' })], cover_image_id: 'zzz' };
    expect(coverImage(tour)?.id).toBe('a');
  });

  it('null όταν δεν υπάρχουν εικόνες', () => {
    expect(coverImage({ images: [], cover_image_id: 'a' })).toBeNull();
    expect(coverImage({})).toBeNull();
    expect(coverImage({ images: null })).toBeNull();
  });
});

describe('coverPathUrl', () => {
  it('χτίζει δημόσιο URL για διαδρομή άρθρου', () => {
    vi.stubEnv('NEXT_PUBLIC_SUPABASE_URL', 'https://proj.supabase.co');
    expect(coverPathUrl('posts/1.jpg')).toBe(
      'https://proj.supabase.co/storage/v1/object/public/tour-images/posts/1.jpg'
    );
  });

  it('null για κενή διαδρομή ή χωρίς ρυθμισμένο Supabase URL', () => {
    expect(coverPathUrl(null)).toBeNull();
    expect(coverPathUrl('')).toBeNull();
    vi.stubEnv('NEXT_PUBLIC_SUPABASE_URL', '');
    expect(coverPathUrl('posts/1.jpg')).toBeNull();
  });
});

// ═════════════════════════════════════════════════════════════════════════════
// lib/gallery — νέες περιπτώσεις
// ═════════════════════════════════════════════════════════════════════════════
describe('galleryImages — επιπλέον περιπτώσεις', () => {
  it('άγνωστο cover_image_id αγνοείται και μένει η σειρά position', () => {
    const list = galleryImages({
      title: 'Μάνη',
      cover_image_id: 'δεν-υπάρχει',
      images: [img({ id: 'a', position: 1 }), img({ id: 'b', position: 0 })],
    });
    expect(list.map((i) => i.url)).toEqual([
      'https://cdn.example.com/b.jpg',
      'https://cdn.example.com/a.jpg',
    ]);
  });

  it('δεν πειράζει τον πίνακα εικόνων που της δόθηκε', () => {
    const images = [img({ id: 'a', position: 2 }), img({ id: 'b', position: 0 })];
    galleryImages({ title: 'Μάνη', cover_image_id: null, images });
    expect(images.map((i) => i.id)).toEqual(['a', 'b']);
  });

  it('cover με άκυρη διαδρομή πέφτει έξω αλλά οι υπόλοιπες μένουν', () => {
    const list = galleryImages({
      title: 'Μάνη',
      cover_image_id: 'broken',
      images: [img({ id: 'broken', storage_path: '', position: 5 }), img({ id: 'a', position: 1 })],
    });
    expect(list.map((i) => i.url)).toEqual(['https://cdn.example.com/a.jpg']);
  });

  it('κενό alt_el μένει κενό — δεν πέφτει στον τίτλο', () => {
    const list = galleryImages({ title: 'Μάνη', cover_image_id: null, images: [img({ id: 'a', alt_el: '' })] });
    expect(list[0].alt).toBe('');
  });
});

// ═════════════════════════════════════════════════════════════════════════════
// lib/tour-aliases — νέες περιπτώσεις
// ═════════════════════════════════════════════════════════════════════════════
describe('resolveTourAlias — επιπλέον περιπτώσεις', () => {
  it('κεφαλαία μαζί με «+» πιάνονται', () => {
    expect(resolveTourAlias('EKDROMI+STA+LIXADONISIA')).toBe('ekdromi-sta-lixadonisia');
  });

  it('κενά στην αρχή ή στο τέλος δεν καθαρίζονται — δεν βρίσκεται alias', () => {
    expect(resolveTourAlias(' ekdromi sta lixadonisia ')).toBeNull();
  });

  it('η ανακατεύθυνση δεν αλυσιδώνει: ο προορισμός δεν είναι κι αυτός alias', () => {
    const target = resolveTourAlias('lixadonisia-kavos-sergiani-travel');
    expect(target).toBe('ekdromi-sta-lixadonisia');
    expect(resolveTourAlias(target!)).toBeNull();
  });

  it('κωδικοποιημένο %20 δεν αναγνωρίζεται (το Next δίνει ήδη αποκωδικοποιημένο slug)', () => {
    expect(resolveTourAlias('THESSALONIKI%20DIHMERH%20EKDROMH')).toBeNull();
  });
});

// ═════════════════════════════════════════════════════════════════════════════
// lib/not-found-suggest — νέες περιπτώσεις
// ═════════════════════════════════════════════════════════════════════════════
describe('pathTokens & suggestTours — επιπλέον περιπτώσεις', () => {
  const tours = [
    { slug: 'ekdromi-sta-meteora-kalampaka', title: 'Εκδρομή στα Μετέωρα και Καλαμπάκα' },
    { slug: 'monoimeri-ekdromi-stin-ydra', title: 'Μονοήμερη Εκδρομή στην Ύδρα' },
    { slug: 'kroyaziera-saronikos', title: 'Κρουαζιέρα στον Σαρωνικό' },
  ];

  it('οι διπλές λέξεις κρατιούνται μία φορά', () => {
    expect(pathTokens('/tour/meteora-meteora-kalampaka')).toEqual(['meteora', 'kalampaka']);
  });

  it('κρατά μόνο το τελευταίο τμήμα, αγνοώντας την κάθετο στο τέλος', () => {
    expect(pathTokens('/ekdromes/monoimeres/meteora/')).toEqual(['meteora']);
  });

  it('όριο 0 προτάσεων δίνει κενή λίστα', () => {
    expect(suggestTours('/tour/meteora', tours, 0)).toEqual([]);
  });

  it('εκδρομή με κενό τίτλο ταιριάζει ακόμη από το slug της', () => {
    const s = suggestTours('/tour/saronikos', [
      { slug: 'kroyaziera-saronikos', title: '' },
      { slug: 'monoimeri-ekdromi-stin-ydra', title: 'Μονοήμερη Εκδρομή στην Ύδρα' },
    ]);
    expect(s[0].slug).toBe('kroyaziera-saronikos');
  });

  it('κατάλογος με μία μόνο εκδρομή δεν προτείνει ποτέ τίποτα (βάρος λέξης = 0)', () => {
    // Με έναν υποψήφιο, κάθε λέξη υπάρχει στο 100% του καταλόγου, άρα
    // log(1/1) = 0 και το σκορ δεν ξεπερνά ποτέ το μηδέν.
    expect(suggestTours('/tour/meteora', [{ slug: 'meteora-kalampaka', title: 'Μετέωρα' }])).toEqual([]);
  });
});

// ═════════════════════════════════════════════════════════════════════════════
// components/booking/TourBookingWidget
// ═════════════════════════════════════════════════════════════════════════════
describe('TourBookingWidget', () => {
  const tiers = [
    tier({ id: 'a', label: 'Δίκλινο', price_cents: 8000, price_original_cents: 10000, position: 0 }),
    tier({ id: 'b', label: 'Παιδί', price_cents: 17000, max_qty: 2, position: 1 }),
  ];
  const deps = [
    departure({ id: 'd1', starts_on: '2026-09-01' }),
    departure({ id: 'd2', starts_on: '2026-09-08' }),
  ];

  const widget = (over: Partial<React.ComponentProps<typeof TourBookingWidget>> = {}) =>
    render(
      <TourBookingWidget
        tourId="t1"
        tourSlug="thessaloniki-diimeri-ekdromi"
        tiers={tiers}
        departures={deps}
        payOnline
        {...over}
      />
    );

  const totalOf = (container: HTMLElement) =>
    container.querySelector('[aria-live="polite"]')?.textContent ?? '';

  it('δείχνει μία γραμμή ανά κατηγορία τιμής με την ετικέτα και την τιμή της', () => {
    widget();
    expect(screen.getByText('Δίκλινο')).toBeInTheDocument();
    expect(screen.getByText('Παιδί')).toBeInTheDocument();
    // 8.000 τρεις φορές: στον τίτλο, στη γραμμή της κατηγορίας και στο αρχικό σύνολο.
    expect(screen.getAllByText(formatCents(8000))).toHaveLength(3);
    expect(screen.getByText(formatCents(17000))).toBeInTheDocument();
  });

  it('δείχνει τη φθηνότερη τιμή ως τίτλο μαζί με την προηγούμενη διαγραμμένη', () => {
    widget();
    expect(screen.getAllByText(formatCents(10000))).toHaveLength(2);
    expect(screen.getByText('/ άτομο')).toBeInTheDocument();
  });

  it('ξεκινά με ένα άτομο στην πρώτη κατηγορία και μηδέν στις υπόλοιπες', () => {
    const { container } = widget();
    expect(screen.getByLabelText('Άτομα, Δίκλινο')).toHaveValue(1);
    expect(screen.getByLabelText('Άτομα, Παιδί')).toHaveValue(0);
    expect(totalOf(container)).toBe(formatCents(8000));
    expect(screen.getByText('1 άτομο')).toBeInTheDocument();
  });

  it('η αύξηση ατόμων ενημερώνει σύνολο και πλήθος', () => {
    const { container } = widget();
    fireEvent.click(screen.getByLabelText('Αύξηση, Παιδί'));
    expect(totalOf(container)).toBe(formatCents(25000));
    expect(screen.getByText('2 άτομα')).toBeInTheDocument();
  });

  it('το κουμπί αύξησης κλειδώνει στο max_qty της κατηγορίας', () => {
    widget();
    const plus = screen.getByLabelText('Αύξηση, Παιδί');
    fireEvent.click(plus);
    fireEvent.click(plus);
    expect(screen.getByLabelText('Άτομα, Παιδί')).toHaveValue(2);
    expect(plus).toBeDisabled();
  });

  it('χειροκίνητη πληκτρολόγηση πάνω από το όριο κόβεται στο max_qty', () => {
    widget();
    fireEvent.change(screen.getByLabelText('Άτομα, Παιδί'), { target: { value: '99' } });
    expect(screen.getByLabelText('Άτομα, Παιδί')).toHaveValue(2);
  });

  it('το κουμπί μείωσης είναι ανενεργό στο μηδέν', () => {
    widget();
    expect(screen.getByLabelText('Μείωση, Παιδί')).toBeDisabled();
    expect(screen.getByLabelText('Μείωση, Δίκλινο')).not.toBeDisabled();
  });

  it('με αναχωρήσεις εμφανίζεται επιλογέας ημερομηνίας με placeholder', () => {
    widget();
    const select = screen.getByRole('combobox');
    expect(select).toHaveValue('');
    expect(within(select).getAllByRole('option')).toHaveLength(3);
    expect(screen.getByText('— Επιλέξτε ημερομηνία —')).toBeInTheDocument();
  });

  it('χωρίς αναχωρήσεις δεν υπάρχει καθόλου επιλογέας ημερομηνίας', () => {
    widget({ departures: [] });
    expect(screen.queryByRole('combobox')).not.toBeInTheDocument();
    expect(screen.queryByText('Ημερομηνία αναχώρησης')).not.toBeInTheDocument();
  });

  it('μοναδική αναχώρηση προεπιλέγεται', () => {
    widget({ departures: [deps[0]] });
    expect(screen.getByRole('combobox')).toHaveValue('d1');
  });

  it('υποβολή χωρίς ημερομηνία δείχνει σφάλμα και δεν καλεί το action', () => {
    widget();
    fireEvent.click(screen.getByRole('button', { name: 'Κάντε Κράτηση' }));
    expect(screen.getByText('Επιλέξτε ημερομηνία αναχώρησης.')).toBeInTheDocument();
    expect(beginTourBooking).not.toHaveBeenCalled();
  });

  it('υποβολή χωρίς άτομα δείχνει το αντίστοιχο σφάλμα', () => {
    widget({ departures: [deps[0]] });
    fireEvent.click(screen.getByLabelText('Μείωση, Δίκλινο'));
    fireEvent.click(screen.getByRole('button', { name: 'Κάντε Κράτηση' }));
    expect(screen.getByText('Επιλέξτε τουλάχιστον ένα άτομο.')).toBeInTheDocument();
    expect(beginTourBooking).not.toHaveBeenCalled();
  });

  it('έγκυρη υποβολή στέλνει μόνο τις κατηγορίες με άτομα', async () => {
    widget({ departures: [deps[0]] });
    fireEvent.click(screen.getByLabelText('Αύξηση, Παιδί'));
    fireEvent.click(screen.getByRole('button', { name: 'Κάντε Κράτηση' }));
    await waitFor(() =>
      expect(beginTourBooking).toHaveBeenCalledWith({
        tourId: 't1',
        departureId: 'd1',
        items: [
          { tier_id: 'a', qty: 1 },
          { tier_id: 'b', qty: 1 },
        ],
      })
    );
  });

  it('γράφει «Εξόφληση στο γραφείο» όταν οι online πληρωμές είναι κλειστές', () => {
    widget({ payOnline: false });
    expect(screen.getByText('Εξόφληση στο γραφείο. Χωρίς κρυφές χρεώσεις.')).toBeInTheDocument();
  });

  it('ο σύνδεσμος προσφοράς κρατά το slug της εκδρομής', () => {
    widget();
    expect(screen.getByRole('link', { name: 'Ζητήστε προσφορά' })).toHaveAttribute(
      'href',
      '/kratisi?tour=thessaloniki-diimeri-ekdromi'
    );
  });
});

// ═════════════════════════════════════════════════════════════════════════════
// components/booking/TourOrderSummary — όσα λείπουν από το υπάρχον test
// ═════════════════════════════════════════════════════════════════════════════
describe('TourOrderSummary — υπόλοιπα πεδία', () => {
  const order = (o: Partial<TourOrder> = {}): TourOrder => ({
    id: 'o1',
    public_code: 'EA1234',
    status: 'offline',
    expires_at: null,
    tour_id: 't1',
    tour_title: 'Διήμερη Θεσσαλονίκη',
    tour_slug: 'thessaloniki-diimeri-ekdromi',
    departure_date: null,
    items: [],
    party_size: 0,
    amount_total_cents: 0,
    customer_name: null,
    email: null,
    phone: null,
    notes: null,
    passengers: [],
    meeting_point: null,
    payment_provider: 'offline',
    paid_at: null,
    created_at: '2026-08-06T10:00:00Z',
    ...o,
  });

  it('χωρίς ημερομηνία αναχώρησης δεν εμφανίζεται η αντίστοιχη γραμμή', () => {
    render(<TourOrderSummary order={order()} />);
    expect(screen.queryByText(/Αναχώρηση:/)).not.toBeInTheDocument();
  });

  it('η ημερομηνία αναχώρησης γράφεται ολογράφως στα ελληνικά', () => {
    render(<TourOrderSummary order={order({ departure_date: '2026-08-08' })} />);
    expect(screen.getByText(/Αναχώρηση:/)).toHaveTextContent(/Αυγούστου 2026/);
  });

  it('δείχνει τις σημειώσεις όταν υπάρχουν, αλλιώς τίποτα', () => {
    const { unmount } = render(<TourOrderSummary order={order({ notes: 'Θέλουμε παράθυρο' })} />);
    expect(screen.getByText(/Θέλουμε παράθυρο/)).toBeInTheDocument();
    unmount();
    render(<TourOrderSummary order={order()} />);
    expect(screen.queryByText(/Σημειώσεις:/)).not.toBeInTheDocument();
  });

  it('κάθε γραμμή δείχνει «ποσότητα × τιμή μονάδας»', () => {
    render(
      <TourOrderSummary
        order={order({
          items: [
            { tier_id: 'a', label: 'Δίκλινο', unit_cents: 9000, qty: 2, line_cents: 18000 },
            { tier_id: 'b', label: 'Παιδί', unit_cents: 5000, qty: 1, line_cents: 5000 },
          ],
          amount_total_cents: 23000,
        })}
      />
    );
    expect(screen.getByText(`2 × ${formatCents(9000)}`)).toBeInTheDocument();
    expect(screen.getByText(`1 × ${formatCents(5000)}`)).toBeInTheDocument();
    expect(screen.getByText(formatCents(23000))).toBeInTheDocument();
  });

  it('κράτηση χωρίς γραμμές δείχνει μόνο μηδενικό σύνολο', () => {
    render(<TourOrderSummary order={order()} />);
    expect(screen.getByText('Σύνολο')).toBeInTheDocument();
    expect(screen.getByText(formatCents(0))).toBeInTheDocument();
  });
});

// ═════════════════════════════════════════════════════════════════════════════
// components/ticketing/ExcursionSearchForm
// ═════════════════════════════════════════════════════════════════════════════
describe('ExcursionSearchForm', () => {
  const excursions: Excursion[] = [
    {
      id: 'r1',
      title: 'Λιχαδονήσια',
      boarding_points: ['Πλατεία Γαστούνης', 'ΚΤΕΛ Αμαλιάδας'],
      dates: ['2026-08-20', '2026-08-27'],
    },
    { id: 'r2', title: 'Μετέωρα', boarding_points: [], dates: [] },
  ];

  const form = () => render(<ExcursionSearchForm excursions={excursions} />);
  const excursionSelect = () => screen.getByLabelText(/Εκδρομή \*/);
  const dateSelect = () => screen.getByLabelText(/Ημερομηνία εκδρομής/);

  it('δείχνει μία επιλογή ανά εκδρομή μαζί με το placeholder', () => {
    form();
    expect(within(excursionSelect()).getAllByRole('option')).toHaveLength(3);
    expect(screen.getByRole('option', { name: 'Λιχαδονήσια' })).toBeInTheDocument();
    expect(screen.getByRole('option', { name: 'Μετέωρα' })).toBeInTheDocument();
  });

  it('οι ημερομηνίες είναι κλειδωμένες πριν επιλεγεί εκδρομή', () => {
    form();
    expect(dateSelect()).toBeDisabled();
    expect(screen.getByText('— Πρώτα επιλέξτε εκδρομή —')).toBeInTheDocument();
  });

  it('μετά την επιλογή εκδρομής ξεκλειδώνουν οι ημερομηνίες της', () => {
    form();
    fireEvent.change(excursionSelect(), { target: { value: 'r1' } });
    expect(dateSelect()).toBeEnabled();
    expect(within(dateSelect()).getAllByRole('option')).toHaveLength(3);
  });

  it('το σημείο επιβίβασης εμφανίζεται ως προαιρετικό μόνο όταν υπάρχουν στάσεις', () => {
    form();
    expect(screen.queryByLabelText(/Σημείο επιβίβασης/)).not.toBeInTheDocument();
    fireEvent.change(excursionSelect(), { target: { value: 'r1' } });
    expect(screen.getByLabelText(/Σημείο επιβίβασης/)).toBeInTheDocument();
    expect(screen.getByText(/Σημείο επιβίβασης \(προαιρετικό\)/)).toBeInTheDocument();
  });

  it('κενό σημείο επιβίβασης ΔΕΝ εμποδίζει την αναζήτηση', () => {
    form();
    fireEvent.change(excursionSelect(), { target: { value: 'r1' } });
    fireEvent.change(dateSelect(), { target: { value: '2026-08-20' } });
    fireEvent.click(screen.getByRole('button', { name: 'Αναζήτηση' }));
    expect(push).toHaveBeenCalledWith('/eisitiria/dromologia?route=r1&date=2026-08-20&pax=1');
  });

  it('επιλεγμένο σημείο επιβίβασης μπαίνει στο URL ως bp', () => {
    form();
    fireEvent.change(excursionSelect(), { target: { value: 'r1' } });
    fireEvent.change(dateSelect(), { target: { value: '2026-08-20' } });
    fireEvent.change(screen.getByLabelText(/Σημείο επιβίβασης/), {
      target: { value: 'ΚΤΕΛ Αμαλιάδας' },
    });
    fireEvent.click(screen.getByRole('button', { name: 'Αναζήτηση' }));
    expect(push).toHaveBeenCalledWith(
      expect.stringContaining('bp=%CE%9A%CE%A4%CE%95%CE%9B+%CE%91%CE%BC%CE%B1%CE%BB%CE%B9%CE%AC%CE%B4%CE%B1%CF%82')
    );
  });

  it('υποβολή χωρίς εκδρομή δείχνει σφάλμα', () => {
    form();
    fireEvent.click(screen.getByRole('button', { name: 'Αναζήτηση' }));
    expect(screen.getByText('Επιλέξτε εκδρομή.')).toBeInTheDocument();
    expect(push).not.toHaveBeenCalled();
  });

  it('υποβολή με εκδρομή αλλά χωρίς ημερομηνία δείχνει σφάλμα', () => {
    form();
    fireEvent.change(excursionSelect(), { target: { value: 'r1' } });
    fireEvent.click(screen.getByRole('button', { name: 'Αναζήτηση' }));
    expect(screen.getByText('Επιλέξτε ημερομηνία εκδρομής.')).toBeInTheDocument();
    expect(push).not.toHaveBeenCalled();
  });

  it('εκδρομή χωρίς προγραμματισμένες ημερομηνίες το λέει καθαρά', () => {
    form();
    fireEvent.change(excursionSelect(), { target: { value: 'r2' } });
    expect(screen.getByText(/Δεν υπάρχουν προγραμματισμένες ημερομηνίες/)).toBeInTheDocument();
  });

  it('η αλλαγή εκδρομής μηδενίζει την ήδη επιλεγμένη ημερομηνία', () => {
    form();
    fireEvent.change(excursionSelect(), { target: { value: 'r1' } });
    fireEvent.change(dateSelect(), { target: { value: '2026-08-27' } });
    expect(dateSelect()).toHaveValue('2026-08-27');
    fireEvent.change(excursionSelect(), { target: { value: 'r2' } });
    expect(dateSelect()).toHaveValue('');
  });

  it('το ?ekdromi= προεπιλέγει την εκδρομή και ξεκλειδώνει τις ημερομηνίες', () => {
    searchParamsStr = 'ekdromi=r1';
    form();
    expect(excursionSelect()).toHaveValue('r1');
    expect(dateSelect()).toBeEnabled();
  });

  it('άγνωστο ?ekdromi= αγνοείται', () => {
    searchParamsStr = 'ekdromi=δεν-υπάρχει';
    form();
    expect(excursionSelect()).toHaveValue('');
    expect(dateSelect()).toBeDisabled();
  });
});

// ═════════════════════════════════════════════════════════════════════════════
// components/ticketing/TripList — πέρα από το πληκτρολόγιο
// ═════════════════════════════════════════════════════════════════════════════
describe('TripList — εμφάνιση και ροή', () => {
  const trip = (o: Partial<TripRow> = {}): TripRow => ({
    id: 't1',
    time: '06:11',
    departure_at: '2026-08-08T06:11:00+03:00',
    seats_available: 25,
    double_decker: false,
    departed: false,
    bookable: true,
    ...o,
  });

  beforeEach(() => {
    searchParamsStr = 'route=r1&date=2026-08-08';
  });

  it('κενή μέρα δείχνει το ανάλογο μήνυμα', () => {
    render(<TripList kind="oneway" outboundLabel="Λιχαδονήσια" date="2026-08-08" outbound={[]} />);
    expect(screen.getByText('Δεν υπάρχουν δρομολόγια για την επιλεγμένη ημέρα.')).toBeInTheDocument();
  });

  it('«Επόμενο» χωρίς επιλογή δείχνει σφάλμα και δεν πλοηγεί', () => {
    render(<TripList kind="oneway" outboundLabel="Λιχαδονήσια" date="2026-08-08" outbound={[trip()]} />);
    fireEvent.click(screen.getByRole('button', { name: 'Επόμενο →' }));
    expect(screen.getByText('Δεν έχετε επιλέξει δρομολόγιο αναχώρησης.')).toBeInTheDocument();
    expect(push).not.toHaveBeenCalled();
  });

  it('μετά την επιλογή, το «Επόμενο» πάει στις θέσεις με το trip στο URL', () => {
    render(<TripList kind="oneway" outboundLabel="Λιχαδονήσια" date="2026-08-08" outbound={[trip()]} />);
    fireEvent.click(screen.getByRole('radio'));
    fireEvent.click(screen.getByRole('button', { name: 'Επόμενο →' }));
    expect(push).toHaveBeenCalledWith(expect.stringContaining('/eisitiria/thesis?'));
    expect(push).toHaveBeenCalledWith(expect.stringContaining('trip=t1'));
  });

  it('σημαίνει «Διώροφο», «Αναχώρησε» και «Πλήρες»', () => {
    render(
      <TripList
        kind="oneway"
        outboundLabel="Λιχαδονήσια"
        date="2026-08-08"
        outbound={[
          trip({ id: 'a', double_decker: true }),
          trip({ id: 'b', departed: true, bookable: false }),
          trip({ id: 'c', seats_available: 0, bookable: false }),
        ]}
      />
    );
    expect(screen.getByText('Διώροφο')).toBeInTheDocument();
    expect(screen.getByText('Αναχώρησε')).toBeInTheDocument();
    expect(screen.getByText('Πλήρες')).toBeInTheDocument();
  });

  it('τα βέλη ημέρας κρύβονται με showDateNav=false', () => {
    render(
      <TripList
        kind="oneway"
        outboundLabel="Λιχαδονήσια"
        date="2026-08-08"
        outbound={[trip()]}
        showDateNav={false}
      />
    );
    expect(screen.queryByRole('button', { name: 'Προηγούμενη ημέρα' })).not.toBeInTheDocument();
    expect(screen.queryByRole('button', { name: 'Επόμενη ημέρα' })).not.toBeInTheDocument();
  });

  it('μετ᾽ επιστροφής: δύο πίνακες και απαίτηση επιλογής επιστροφής', () => {
    render(
      <TripList
        kind="round"
        outboundLabel="Αθήνα → Ύδρα"
        inboundLabel="Ύδρα → Αθήνα"
        date="2026-08-08"
        retDate="2026-08-10"
        outbound={[trip({ id: 'out' })]}
        inbound={[trip({ id: 'back' })]}
      />
    );
    expect(screen.getByText('Δρομολόγια Αναχώρησης')).toBeInTheDocument();
    expect(screen.getByText('Δρομολόγια Επιστροφής')).toBeInTheDocument();
    fireEvent.click(screen.getAllByRole('radio')[0]);
    fireEvent.click(screen.getByRole('button', { name: 'Επόμενο →' }));
    expect(screen.getByText('Δεν έχετε επιλέξει δρομολόγιο επιστροφής.')).toBeInTheDocument();
  });
});

// ═════════════════════════════════════════════════════════════════════════════
// components/ticketing/FarePricesDialog
// ═════════════════════════════════════════════════════════════════════════════
describe('FarePricesDialog', () => {
  const fares: OrderFare[] = [
    {
      id: 'f1',
      name: 'Κανονικό',
      description: 'Για όλους',
      price_oneway_cents: 1500,
      price_round_cents: 2500,
      is_default: true,
    },
    {
      id: 'f2',
      name: 'Παιδικό',
      description: 'Έως 12 ετών',
      price_oneway_cents: 800,
      price_round_cents: 1400,
      is_default: false,
    },
  ];

  it('αρχικά δείχνει μόνο το κουμπί, όχι τον πίνακα', () => {
    render(<FarePricesDialog fares={fares} />);
    expect(screen.getByRole('button', { name: /Τιμές εισιτηρίων/ })).toBeInTheDocument();
    expect(screen.queryByRole('dialog')).not.toBeInTheDocument();
  });

  it('το κλικ ανοίγει το παράθυρο με μία γραμμή ανά κατηγορία και την τιμή απλής', () => {
    render(<FarePricesDialog fares={fares} />);
    fireEvent.click(screen.getByRole('button', { name: /Τιμές εισιτηρίων/ }));
    const dialog = screen.getByRole('dialog');
    expect(within(dialog).getByText('Κανονικό')).toBeInTheDocument();
    expect(within(dialog).getByText('Έως 12 ετών')).toBeInTheDocument();
    expect(within(dialog).getByText(formatCents(1500))).toBeInTheDocument();
    expect(within(dialog).getByText(formatCents(800))).toBeInTheDocument();
    // Δείχνει μόνο την απλή διαδρομή — η τιμή με επιστροφή δεν εμφανίζεται.
    expect(within(dialog).queryByText(formatCents(2500))).not.toBeInTheDocument();
  });

  it('το «Κλείσιμο» κλείνει το παράθυρο', () => {
    render(<FarePricesDialog fares={fares} />);
    fireEvent.click(screen.getByRole('button', { name: /Τιμές εισιτηρίων/ }));
    fireEvent.click(screen.getByRole('button', { name: 'Κλείσιμο' }));
    expect(screen.queryByRole('dialog')).not.toBeInTheDocument();
  });
});

// ═════════════════════════════════════════════════════════════════════════════
// components/trips/Pagination
// ═════════════════════════════════════════════════════════════════════════════
describe('Pagination', () => {
  it('δεν εμφανίζεται καθόλου με μία σελίδα ή λιγότερο', () => {
    const { container } = render(<Pagination current={1} total={1} onChange={vi.fn()} />);
    expect(container).toBeEmptyDOMElement();
    const zero = render(<Pagination current={1} total={0} onChange={vi.fn()} />);
    expect(zero.container).toBeEmptyDOMElement();
  });

  it('με λίγες σελίδες δείχνει όλους τους αριθμούς χωρίς αποσιωπητικά', () => {
    render(<Pagination current={2} total={3} onChange={vi.fn()} />);
    for (const n of ['1', '2', '3']) {
      expect(screen.getByRole('button', { name: n })).toBeInTheDocument();
    }
    expect(screen.queryByText('…')).not.toBeInTheDocument();
  });

  it('με πολλές σελίδες κρύβει τις μεσαίες πίσω από αποσιωπητικά', () => {
    render(<Pagination current={5} total={12} onChange={vi.fn()} />);
    expect(screen.getAllByText('…')).toHaveLength(2);
    expect(screen.getByRole('button', { name: '4' })).toBeInTheDocument();
    expect(screen.getByRole('button', { name: '12' })).toBeInTheDocument();
    expect(screen.queryByRole('button', { name: '8' })).not.toBeInTheDocument();
  });

  it('η τρέχουσα σελίδα σημαίνεται με aria-current', () => {
    render(<Pagination current={2} total={4} onChange={vi.fn()} />);
    expect(screen.getByRole('button', { name: '2' })).toHaveAttribute('aria-current', 'page');
    expect(screen.getByRole('button', { name: '1' })).not.toHaveAttribute('aria-current');
  });

  it('τα βέλη κλειδώνουν στα άκρα', () => {
    const { unmount } = render(<Pagination current={1} total={4} onChange={vi.fn()} />);
    expect(screen.getByRole('button', { name: 'Προηγούμενη σελίδα' })).toBeDisabled();
    expect(screen.getByRole('button', { name: 'Επόμενη σελίδα' })).toBeEnabled();
    unmount();
    render(<Pagination current={4} total={4} onChange={vi.fn()} />);
    expect(screen.getByRole('button', { name: 'Επόμενη σελίδα' })).toBeDisabled();
  });

  it('το κλικ σε αριθμό και στα βέλη ειδοποιεί με τη σωστή σελίδα', () => {
    const onChange = vi.fn();
    render(<Pagination current={3} total={9} onChange={onChange} />);
    fireEvent.click(screen.getByRole('button', { name: '4' }));
    expect(onChange).toHaveBeenLastCalledWith(4);
    fireEvent.click(screen.getByRole('button', { name: 'Προηγούμενη σελίδα' }));
    expect(onChange).toHaveBeenLastCalledWith(2);
    fireEvent.click(screen.getByRole('button', { name: 'Επόμενη σελίδα' }));
    expect(onChange).toHaveBeenLastCalledWith(4);
  });
});

// ═════════════════════════════════════════════════════════════════════════════
// components/trips/TourCard
// ═════════════════════════════════════════════════════════════════════════════
describe('TourCard', () => {
  const cat: Category = {
    id: 'c1',
    slug: 'monoimeres',
    name_el: 'Μονοήμερες',
    description_el: null,
    sort_order: 1,
  };
  const tour = (o: Partial<Tour> = {}): Tour => ({
    id: 'a',
    slug: 'ydra',
    title: 'Ύδρα',
    subtitle: null,
    summary: 'Το νησί του Μιαούλη',
    body: {},
    price_from: 25,
    price_original: 30,
    currency: 'EUR',
    duration_label: 'Μονοήμερη',
    departure_note: 'Κάθε Κυριακή',
    meeting_point: null,
    meeting_points: [],
    route_id: null,
    status: 'published',
    is_featured: false,
    bookings_open: true,
    cover_image_id: null,
    seo_title: null,
    seo_description: null,
    source_url: null,
    sort_order: 0,
    published_at: null,
    categories: [cat],
    images: [],
    ...o,
  });

  it('όλη η κάρτα είναι σύνδεσμος προς τη σελίδα της εκδρομής', () => {
    render(<TourCard tour={tour()} />);
    expect(screen.getByRole('link')).toHaveAttribute('href', '/tour/ydra');
  });

  it('δείχνει τίτλο, σύνοψη, διάρκεια και σημείωση αναχώρησης', () => {
    render(<TourCard tour={tour()} />);
    expect(screen.getByRole('heading', { level: 3 })).toHaveTextContent('Ύδρα');
    expect(screen.getByText('Το νησί του Μιαούλη')).toBeInTheDocument();
    expect(screen.getByText('Μονοήμερη')).toBeInTheDocument();
    expect(screen.getByText('Κάθε Κυριακή')).toBeInTheDocument();
    expect(screen.getByText('Λεπτομέρειες')).toBeInTheDocument();
  });

  it('δείχνει την πρώτη κατηγορία και την τιμή «από», με τη διαγραμμένη παλιά', () => {
    render(<TourCard tour={tour()} />);
    expect(screen.getByText('Μονοήμερες')).toBeInTheDocument();
    expect(screen.getByText('από 25€')).toBeInTheDocument();
    expect(screen.getByText('30€')).toBeInTheDocument();
  });

  it('χωρίς τιμή, κατηγορία και προαιρετικά πεδία η κάρτα μένει καθαρή', () => {
    render(
      <TourCard
        tour={tour({
          price_from: null,
          price_original: null,
          categories: [],
          summary: null,
          duration_label: null,
          departure_note: null,
        })}
      />
    );
    expect(screen.queryByText(/από/)).not.toBeInTheDocument();
    expect(screen.queryByText('Μονοήμερες')).not.toBeInTheDocument();
    expect(screen.getByRole('heading', { level: 3 })).toHaveTextContent('Ύδρα');
  });

  it('χωρίς εικόνα βάζει διακοσμητικό placeholder αντί για <img>', () => {
    const { container } = render(<TourCard tour={tour()} />);
    expect(container.querySelector('img')).toBeNull();
    expect(container.querySelector('[aria-hidden]')).toBeTruthy();
  });
});

// ═════════════════════════════════════════════════════════════════════════════
// components/rentals/PoylmanQuoteForm
// ═════════════════════════════════════════════════════════════════════════════
describe('PoylmanQuoteForm', () => {
  const fill = () => {
    fireEvent.change(screen.getByLabelText(/Ονοματεπώνυμο/), { target: { value: 'Μαρία Π.' } });
    fireEvent.change(screen.getByLabelText(/Τηλέφωνο/), { target: { value: '6900000000' } });
    fireEvent.change(screen.getByLabelText(/Διαδρομή/), { target: { value: 'Αθήνα → Δελφοί' } });
  };

  it('δείχνει όλα τα πεδία της φόρμας', () => {
    render(<PoylmanQuoteForm />);
    expect(screen.getByLabelText(/Ονοματεπώνυμο/)).toBeInTheDocument();
    expect(screen.getByLabelText(/Τηλέφωνο/)).toBeInTheDocument();
    expect(screen.getByLabelText('Email')).toBeInTheDocument();
    expect(screen.getByLabelText(/Διαδρομή/)).toBeInTheDocument();
    expect(screen.getByLabelText('Ημερομηνία')).toBeInTheDocument();
    expect(screen.getByLabelText('Άτομα')).toBeInTheDocument();
    expect(screen.getByLabelText('Μήνυμα')).toBeInTheDocument();
    expect(screen.getByRole('button', { name: 'Αποστολή αιτήματος' })).toBeInTheDocument();
  });

  it('κενή υποβολή δείχνει σφάλμα σε όνομα, τηλέφωνο και διαδρομή', async () => {
    render(<PoylmanQuoteForm />);
    fireEvent.click(screen.getByRole('button', { name: 'Αποστολή αιτήματος' }));
    expect(await screen.findByText('Συμπληρώστε το όνομά σας.')).toBeInTheDocument();
    expect(screen.getByText('Συμπληρώστε ένα έγκυρο τηλέφωνο.')).toBeInTheDocument();
    expect(screen.getByText('Πείτε μας πού θέλετε να πάτε.')).toBeInTheDocument();
    expect(createLead).not.toHaveBeenCalled();
  });

  // ΤΡΕΧΟΥΣΑ συμπεριφορά (πιθανό bug — δες την αναφορά): το άκυρο email κόβει
  // την υποβολή αλλά ΔΕΝ εμφανίζει κανένα μήνυμα, γιατί το
  // `.email().optional().or(z.literal(''))` παράγει σφάλμα ένωσης χωρίς το
  // δικό μας κείμενο. Ο επισκέπτης πατάει «Αποστολή» και δεν γίνεται τίποτα.
  it('άκυρο email κόβει σιωπηλά την υποβολή, χωρίς ορατό μήνυμα', async () => {
    render(<PoylmanQuoteForm />);
    fill();
    fireEvent.change(screen.getByLabelText('Email'), { target: { value: 'abc' } });
    fireEvent.click(screen.getByRole('button', { name: 'Αποστολή αιτήματος' }));
    await waitFor(() => expect(screen.getByLabelText('Email')).toHaveValue('abc'));
    expect(createLead).not.toHaveBeenCalled();
    expect(screen.queryByText('Μη έγκυρο email.')).not.toBeInTheDocument();
    expect(screen.queryByText('Το αίτημά σας παρελήφθη')).not.toBeInTheDocument();
  });

  it('email, ημερομηνία και άτομα είναι προαιρετικά — η υποβολή περνά κενά', async () => {
    vi.mocked(createLead).mockResolvedValue({ ok: true });
    render(<PoylmanQuoteForm />);
    fill();
    fireEvent.click(screen.getByRole('button', { name: 'Αποστολή αιτήματος' }));
    await waitFor(() => expect(createLead).toHaveBeenCalledTimes(1));
    expect(vi.mocked(createLead).mock.calls[0][0]).toMatchObject({
      type: 'quote',
      name: 'Μαρία Π.',
      phone: '6900000000',
      email: null,
      subject: 'Ενοικίαση πούλμαν: Αθήνα → Δελφοί',
      preferred_date: null,
      party_size: null,
      message: null,
      source_path: '/enoikiaseis-poylman',
    });
  });

  it('επιτυχής αποστολή αντικαθιστά τη φόρμα με μήνυμα επιβεβαίωσης', async () => {
    vi.mocked(createLead).mockResolvedValue({ ok: true });
    render(<PoylmanQuoteForm />);
    fill();
    fireEvent.click(screen.getByRole('button', { name: 'Αποστολή αιτήματος' }));
    expect(await screen.findByText('Το αίτημά σας παρελήφθη')).toBeInTheDocument();
    expect(screen.queryByLabelText(/Ονοματεπώνυμο/)).not.toBeInTheDocument();
  });

  it('αποτυχία κρατά τη φόρμα και δείχνει μήνυμα σφάλματος', async () => {
    vi.mocked(createLead).mockResolvedValue({ ok: false, error: 'db' });
    render(<PoylmanQuoteForm />);
    fill();
    fireEvent.click(screen.getByRole('button', { name: 'Αποστολή αιτήματος' }));
    expect(await screen.findByText('Κάτι πήγε στραβά. Δοκιμάστε ξανά ή καλέστε μας.')).toBeInTheDocument();
    expect(screen.getByLabelText(/Ονοματεπώνυμο/)).toBeInTheDocument();
  });

  it('συμπληρωμένα προαιρετικά πεδία φτάνουν στο lead', async () => {
    vi.mocked(createLead).mockResolvedValue({ ok: true });
    render(<PoylmanQuoteForm />);
    fill();
    fireEvent.change(screen.getByLabelText('Email'), { target: { value: 'maria@example.com' } });
    fireEvent.change(screen.getByLabelText('Ημερομηνία'), { target: { value: '2026-09-01' } });
    fireEvent.change(screen.getByLabelText('Άτομα'), { target: { value: '42' } });
    fireEvent.change(screen.getByLabelText('Μήνυμα'), { target: { value: '  Πρωί  ' } });
    fireEvent.click(screen.getByRole('button', { name: 'Αποστολή αιτήματος' }));
    await waitFor(() => expect(createLead).toHaveBeenCalledTimes(1));
    expect(vi.mocked(createLead).mock.calls[0][0]).toMatchObject({
      email: 'maria@example.com',
      preferred_date: '2026-09-01',
      party_size: 42,
      message: 'Πρωί',
    });
  });

  it('κρύβει το honeypot πεδίο από τον χρήστη και από τα βοηθήματα', () => {
    const { container } = render(<PoylmanQuoteForm />);
    const hp = container.querySelector('input[name="hp"]');
    expect(hp).toBeTruthy();
    expect(hp).toHaveAttribute('aria-hidden', 'true');
    expect(hp).toHaveAttribute('tabindex', '-1');
  });
});

// ═════════════════════════════════════════════════════════════════════════════
// components/rentals/PoylmanPricingTable
// ═════════════════════════════════════════════════════════════════════════════
describe('PoylmanPricingTable', () => {
  const table: PoylmanPriceTable = {
    id: 'transfers',
    title: 'Τιμές μεταφοράς από Αθήνα',
    note: 'Καλέστε μας για επιβεβαίωση.',
    columns: ['Taxi', 'MiniVan 8 θέσεις', 'Bus 55 θέσεις'],
    rows: [
      { destination: 'Airport El. Venizelos', prices: ['€ 55', '€ 120', '€ 210'] },
      { destination: 'Nafplio', prices: ['€ 150', '€ 270', '€ 600'] },
    ],
  };

  it('δείχνει τον τίτλο ως επικεφαλίδα και τη σημείωση', () => {
    render(<PoylmanPricingTable table={table} />);
    expect(screen.getByRole('heading', { level: 2 })).toHaveTextContent('Τιμές μεταφοράς από Αθήνα');
    expect(screen.getByText('Καλέστε μας για επιβεβαίωση.')).toBeInTheDocument();
  });

  it('χωρίς σημείωση δεν αφήνει κενή παράγραφο', () => {
    const { container } = render(<PoylmanPricingTable table={{ ...table, note: undefined }} />);
    expect(container.querySelector('p')).toBeNull();
  });

  it('η πρώτη στήλη είναι «Διαδρομή» και ακολουθούν οι στήλες οχημάτων', () => {
    render(<PoylmanPricingTable table={table} />);
    const headers = screen.getAllByRole('columnheader').map((h) => h.textContent);
    expect(headers).toEqual(['Διαδρομή', 'Taxi', 'MiniVan 8 θέσεις', 'Bus 55 θέσεις']);
  });

  it('μία γραμμή ανά προορισμό με όλες τις τιμές της', () => {
    render(<PoylmanPricingTable table={table} />);
    const rows = screen.getAllByRole('row');
    // 1 γραμμή επικεφαλίδων + 2 προορισμοί
    expect(rows).toHaveLength(3);
    expect(within(rows[1]).getAllByRole('cell').map((c) => c.textContent)).toEqual([
      'Airport El. Venizelos',
      '€ 55',
      '€ 120',
      '€ 210',
    ]);
    expect(within(rows[2]).getByText('€ 600')).toBeInTheDocument();
  });
});
