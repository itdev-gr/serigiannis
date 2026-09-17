import { describe, expect, it, vi, beforeEach } from 'vitest';
import { fireEvent, render, screen } from '@testing-library/react';
import type { Category, Tour } from '@/types/db';
import { ToursExplorer, explorerHref, parseExplorerParams } from '@/components/trips/ToursExplorer';

const push = vi.fn();
let search = '';
let pathname = '/ekdromes';
vi.mock('next/navigation', () => ({
  useRouter: () => ({ push, replace: vi.fn(), refresh: vi.fn(), prefetch: vi.fn() }),
  useSearchParams: () => new URLSearchParams(search),
  usePathname: () => pathname,
}));

const cats: Category[] = [
  { id: '1', slug: 'monoimeres', name_el: 'Μονοήμερες', description_el: null, sort_order: 1 },
  { id: '2', slug: 'kroyazieres', name_el: 'Κρουαζιέρες', description_el: null, sort_order: 2 },
];

const tour = (i: number, cat: Category = cats[0]): Tour => ({
  id: `t${i}`,
  slug: `tour-${i}`,
  title: `Εκδρομή ${i}`,
  subtitle: null,
  short_description: null,
  summary: null,
  body: {},
  price_from: 10 + i,
  price_original: null,
  currency: 'EUR',
  duration_label: null,
  departure_note: null,
  meeting_point: null,
  meeting_points: [],
  highlights: [],
  included: [],
  not_included: [],
  not_allowed: [],
  route_id: null,
  status: 'published',
  is_featured: false,
  bookings_open: true,
  cover_image_id: null,
  seo_title: null,
  seo_description: null,
  source_url: null,
  sort_order: i,
  published_at: null,
  categories: [cat],
  images: [],
  price_tiers: [],
  departures: [],
});

// 20 εκδρομές = 3 σελίδες των 9.
const tours = Array.from({ length: 20 }, (_, i) => tour(i + 1, i % 4 === 0 ? cats[1] : cats[0]));

beforeEach(() => {
  push.mockClear();
  search = '';
  pathname = '/ekdromes';
  window.scrollTo = vi.fn();
});

describe('parseExplorerParams', () => {
  const slugs = cats.map((c) => c.slug);
  it('προεπιλογές χωρίς params', () => {
    expect(parseExplorerParams(null, slugs)).toEqual({ category: undefined, sort: 'date', page: 1 });
  });
  it('διαβάζει έγκυρες τιμές και απορρίπτει άκυρες', () => {
    expect(parseExplorerParams(new URLSearchParams('category=kroyazieres&sort=price-asc&page=3'), slugs)).toEqual({
      category: 'kroyazieres',
      sort: 'price-asc',
      page: 3,
    });
    expect(parseExplorerParams(new URLSearchParams('category=xyz&sort=bogus&page=-2'), slugs)).toEqual({
      category: undefined,
      sort: 'date',
      page: 1,
    });
    expect(parseExplorerParams(new URLSearchParams('page=abc'), slugs).page).toBe(1);
  });
  it('η κλειδωμένη κατηγορία νικά ό,τι λέει το URL', () => {
    expect(parseExplorerParams(new URLSearchParams('category=kroyazieres'), slugs, 'monoimeres').category).toBe('monoimeres');
  });
});

describe('explorerHref', () => {
  it('γράφει μόνο ό,τι διαφέρει από τις προεπιλογές', () => {
    expect(explorerHref('/ekdromes', { category: undefined, sort: 'date', page: 1 })).toBe('/ekdromes');
    expect(explorerHref('/ekdromes', { category: 'monoimeres', sort: 'date', page: 4 })).toBe('/ekdromes?category=monoimeres&page=4');
    expect(explorerHref('/ekdromes', { category: undefined, sort: 'price-desc', page: 1 })).toBe('/ekdromes?sort=price-desc');
  });
  it('σε σελίδα κατηγορίας η κατηγορία δεν μπαίνει ποτέ στο URL', () => {
    expect(explorerHref('/ekdromes/monoimeres', { category: 'monoimeres', sort: 'date', page: 2 }, 'monoimeres')).toBe(
      '/ekdromes/monoimeres?page=2'
    );
  });
});

describe('ToursExplorer — κατάσταση στη διεύθυνση', () => {
  it('ξεκινά από τη σελίδα που λέει το URL (επιστροφή από εκδρομή)', () => {
    search = 'page=3';
    render(<ToursExplorer tours={tours} categories={cats} />);
    expect(screen.getByRole('button', { name: '3' })).toHaveAttribute('aria-current', 'page');
    // 20 εκδρομές: η 3η σελίδα έχει τις 2 τελευταίες.
    expect(screen.getAllByRole('link').filter((a) => a.getAttribute('href')?.startsWith('/tour/'))).toHaveLength(2);
  });

  it('η αλλαγή σελίδας γίνεται με push (εγγραφή ιστορικού) χωρίς scroll του router', () => {
    search = 'page=3';
    render(<ToursExplorer tours={tours} categories={cats} />);
    fireEvent.click(screen.getByRole('button', { name: 'Προηγούμενη σελίδα' }));
    expect(push).toHaveBeenCalledWith('/ekdromes?page=2', { scroll: false });
    expect(window.scrollTo).toHaveBeenCalled();
  });

  it('φίλτρο κατηγορίας γυρνά στη σελίδα 1 και κρατά την ταξινόμηση', () => {
    search = 'sort=price-asc&page=2';
    render(<ToursExplorer tours={tours} categories={cats} />);
    fireEvent.click(screen.getByRole('button', { name: 'Κρουαζιέρες' }));
    expect(push).toHaveBeenCalledWith('/ekdromes?category=kroyazieres&sort=price-asc', { scroll: false });
  });

  it('«Καθαρισμός όλων» επιστρέφει στην καθαρή διεύθυνση', () => {
    search = 'category=monoimeres&sort=popular&page=2';
    render(<ToursExplorer tours={tours} categories={cats} />);
    fireEvent.click(screen.getByRole('button', { name: 'Καθαρισμός όλων' }));
    expect(push).toHaveBeenCalledWith('/ekdromes', { scroll: false });
  });

  it('σε σελίδα κατηγορίας η σελίδα 2 γράφεται μόνο ως ?page=2', () => {
    pathname = '/ekdromes/monoimeres';
    render(<ToursExplorer tours={tours} categories={cats} lockedCategory="monoimeres" />);
    fireEvent.click(screen.getByRole('button', { name: 'Επόμενη σελίδα' }));
    expect(push).toHaveBeenCalledWith('/ekdromes/monoimeres?page=2', { scroll: false });
  });
});
