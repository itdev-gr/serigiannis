import { describe, it, expect, vi } from 'vitest';
import { render, screen } from '@testing-library/react';
import type { Category, Tour, SettingsData } from '@/types/db';
import { Home1Hero } from '@/components/home/Home1Hero';
import { Home1Destinations } from '@/components/home/Home1Destinations';
import { Home1About } from '@/components/home/Home1About';
import { Home1Listing } from '@/components/home/Home1Listing';
import { Home1Promo } from '@/components/home/Home1Promo';
import { Home1Process } from '@/components/home/Home1Process';
import { Home1Testimonials } from '@/components/home/Home1Testimonials';
import { Home1News } from '@/components/home/Home1News';
import { Home1Cta } from '@/components/home/Home1Cta';

// Home1Hero uses next/navigation's useRouter. (matchMedia/IntersectionObserver
// stubs live in tests/setup.ts so they exist before gsap loads at import time.)
vi.mock('next/navigation', () => ({
  useRouter: () => ({ push: vi.fn(), prefetch: vi.fn() }),
}));

const cats: Category[] = [
  { id: '1', slug: 'monoimeres', name_el: 'Μονοήμερες', description_el: null, sort_order: 1 },
  { id: '2', slug: 'kroyazieres', name_el: 'Κρουαζιέρες', description_el: null, sort_order: 2 },
];

const tour = (o: Partial<Tour>): Tour => ({
  id: 'a', slug: 'ydra', title: 'Ύδρα', subtitle: null, summary: 'Το νησί του Μιαούλη', body: {},
  price_from: 25, price_original: null, currency: 'EUR', duration_label: 'Μονοήμερη',
  departure_note: null, meeting_point: null, status: 'published', is_featured: true,
  cover_image_id: null, seo_title: null, seo_description: null, source_url: null,
  sort_order: 0, published_at: null, categories: [], images: [], ...o,
});

describe('Home1Hero', () => {
  it('renders the hero heading and a destination option per category', () => {
    render(<Home1Hero categories={cats} />);
    expect(screen.getByRole('heading', { level: 1 })).toHaveTextContent('Μονοήμερες εκδρομές από Αθήνα');
    expect(screen.getByRole('option', { name: 'Μονοήμερες' })).toBeInTheDocument();
    expect(screen.getByRole('option', { name: 'Κρουαζιέρες' })).toBeInTheDocument();
    expect(screen.getByRole('option', { name: 'Όλες οι εκδρομές' })).toBeInTheDocument();
  });
});

describe('Home1Destinations', () => {
  it('renders a card linking to each category page', () => {
    render(<Home1Destinations categories={cats} tours={[]} />);
    expect(screen.getByRole('link', { name: /Μονοήμερες/ })).toHaveAttribute('href', '/ekdromes/monoimeres');
  });
});

describe('Home1About', () => {
  it('renders the about heading, the stats labels, and the trust points', () => {
    render(<Home1About />);
    expect(screen.getByRole('heading', { name: /Περιστέρι/ })).toBeInTheDocument();
    expect(screen.getByText('Χρόνια Εμπειρίας')).toBeInTheDocument();
    expect(screen.getByText('Προορισμοί')).toBeInTheDocument();
    expect(screen.getByText('Εμπειρία από το 1995')).toBeInTheDocument();
    expect(screen.getByText('Προσιτές Τιμές')).toBeInTheDocument();
  });
});

describe('Home1Listing', () => {
  it('renders a card per featured tour', () => {
    render(<Home1Listing tours={[tour({ id: 'a', slug: 'ydra', title: 'Ύδρα' })]} />);
    expect(screen.getByRole('heading', { name: 'Ύδρα' })).toBeInTheDocument();
    expect(screen.getByRole('link', { name: /Ύδρα/ })).toHaveAttribute('href', '/tour/ydra');
  });

  it('renders nothing when there are no tours', () => {
    const { container } = render(<Home1Listing tours={[]} />);
    expect(container).toBeEmptyDOMElement();
  });
});

describe('Home1Promo', () => {
  it('renders the promo CTA to bus rentals', () => {
    render(<Home1Promo />);
    expect(screen.getByRole('link', { name: /Ζητήστε προσφορά/ })).toHaveAttribute('href', '/enoikiaseis-poylman');
  });
});

describe('Home1Process', () => {
  it('renders all three steps', () => {
    render(<Home1Process />);
    expect(screen.getByText('Επιλέξτε εκδρομή')).toBeInTheDocument();
    expect(screen.getByText('Κλείστε θέση')).toBeInTheDocument();
    expect(screen.getByText('Ταξιδέψτε')).toBeInTheDocument();
  });
});

describe('Home1Testimonials', () => {
  it('renders each testimonial author', () => {
    render(<Home1Testimonials />);
    expect(screen.getByText('Μαρία Κ.')).toBeInTheDocument();
    expect(screen.getByText('Γιώργος Π.')).toBeInTheDocument();
  });
});

describe('Home1News', () => {
  it('renders up to three tour cards', () => {
    const list = [
      tour({ id: 'a', slug: 'tinos', title: 'Τήνος' }),
      tour({ id: 'b', slug: 'delphi', title: 'Δελφοί' }),
      tour({ id: 'c', slug: 'meteora', title: 'Μετέωρα' }),
      tour({ id: 'd', slug: 'pilio', title: 'Πήλιο' }),
    ];
    render(<Home1News tours={list} />);
    expect(screen.getAllByRole('link', { name: /Λεπτομέρειες/ }).length).toBe(3);
  });
});

describe('Home1Cta', () => {
  const settings: SettingsData = {
    phones: ['210 571 2451', '6976 811 825'],
    address: 'Π. Μελά 45, Περιστέρι 121 31',
    email: 'info@sergianitravel.gr',
    hours: { weekdays: '09:00–17:00', saturday: '09:00–14:00' },
  };

  it('renders a tel: link for the primary phone', () => {
    render(<Home1Cta settings={settings} />);
    expect(screen.getByRole('link', { name: /210 571 2451/ })).toHaveAttribute('href', 'tel:+302105712451');
  });
});
