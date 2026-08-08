import { describe, it, expect, vi, beforeEach } from 'vitest';
import { render, screen } from '@testing-library/react';
import { PageHeading } from '@/components/shared/PageHeading';
import type { Tour } from '@/types/db';

// Η σελίδα εκδρομής είναι async server component: τη «στήνουμε» με ψεύτικα
// queries και κάνουμε render το JSX που επιστρέφει.
const state = vi.hoisted(() => ({ tour: null as Tour | null }));

vi.mock('@/lib/queries/tours', () => ({
  getTourBySlug: vi.fn(async () => state.tour),
  getTours: vi.fn(async () => []),
  getPublishedSlugs: vi.fn(async () => []),
}));
vi.mock('@/lib/queries/settings', () => ({
  getSettings: vi.fn(async () => ({ phones: ['2310 000000'] })),
}));
vi.mock('@/lib/queries/ticketing', () => ({ isRoutePublished: vi.fn(async () => false) }));
vi.mock('@/app/(site)/actions', () => ({ createLead: vi.fn(async () => ({ ok: true })) }));

const tour = (o: Partial<Tour> = {}): Tour =>
  ({
    id: 't1',
    slug: 'meteora',
    title: 'Μετέωρα διήμερο',
    subtitle: null,
    summary: null,
    body: {},
    price_from: null,
    price_original: null,
    currency: 'EUR',
    duration_label: null,
    departure_note: null,
    meeting_point: null,
    meeting_points: [],
    highlights: [],
    included: [],
    not_included: [],
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
    ...o,
  }) as Tour;

async function renderPage(t: Tour) {
  state.tour = t;
  const { default: TourDetailPage } = await import('@/app/(site)/tour/[slug]/page');
  const ui = await TourDetailPage({ params: Promise.resolve({ slug: t.slug }) });
  return render(ui);
}

beforeEach(() => {
  state.tour = null;
});

describe('σελίδα εκδρομής — κεφαλίδα με στοιχεία', () => {
  it('δείχνει όλα τα στοιχεία όταν υπάρχουν όλα τα πεδία', async () => {
    await renderPage(
      tour({
        duration_label: '2 ημέρες',
        departure_note: 'Κάθε Σάββατο',
        meeting_point: 'Πλατεία Ελευθερίας',
        price_from: 89,
      }),
    );
    const facts = screen.getByTestId('tour-facts');
    expect(facts).toHaveTextContent('2 ημέρες');
    expect(facts).toHaveTextContent('Κάθε Σάββατο');
    expect(facts).toHaveTextContent('από 89€');
    // Το σημείο συνάντησης λείπει επίτηδες από τη σειρά: είναι μακρύ και
    // εμφανίζεται πιο κάτω, στα πλακίδια και στα σημεία επιβίβασης.
    expect(facts).not.toHaveTextContent('Πλατεία Ελευθερίας');
  });

  it('παραλείπει όσα πεδία λείπουν', async () => {
    await renderPage(tour({ duration_label: 'Ολοήμερη' }));
    const facts = screen.getByTestId('tour-facts');
    expect(facts).toHaveTextContent('Ολοήμερη');
    expect(facts.textContent).not.toContain('€');
    expect(facts.querySelectorAll('span.inline-flex')).toHaveLength(1);
  });

  it('χωρίς κανένα πεδίο δεν υπάρχει καθόλου σειρά στοιχείων', async () => {
    await renderPage(tour());
    expect(screen.queryByTestId('tour-facts')).not.toBeInTheDocument();
  });

  it('δείχνει την ετικέτα εμπιστοσύνης και την κατηγορία', async () => {
    await renderPage(
      tour({ categories: [{ id: 'c1', slug: 'proskinimatikes', name_el: 'Προσκυνηματικές' }] } as Partial<Tour>),
    );
    expect(screen.getByText('Κρατήσεις απευθείας από το γραφείο')).toBeInTheDocument();
    expect(screen.getByText('Προσκυνηματικές')).toBeInTheDocument();
  });
});

describe('σελίδα εκδρομής — σώμα', () => {
  it('εμφανίζει το TourInfo και τις συχνές ερωτήσεις', async () => {
    await renderPage(
      tour({ summary: 'Δύο ημέρες στα Μετέωρα.', duration_label: '2 ημέρες', meeting_points: ['Βέροια', 'Νάουσα'] }),
    );
    // TourInfo: πλακίδια «Καλό να ξέρετε» + σημεία επιβίβασης
    expect(screen.getAllByTestId('info-tile').length).toBeGreaterThan(0);
    expect(screen.getAllByTestId('boarding-point')).toHaveLength(2);
    // TourFaq
    expect(screen.getByText('Συχνές ερωτήσεις')).toBeInTheDocument();
    expect(screen.getAllByTestId('faq-item').length).toBeGreaterThanOrEqual(3);
  });

  it('προσθέτει FAQPage JSON-LD με τις ίδιες ερωτήσεις', async () => {
    const { container } = await renderPage(tour({ duration_label: '2 ημέρες' }));
    const script = container.querySelector('[data-testid="faq-jsonld"]');
    expect(script).not.toBeNull();
    const data = JSON.parse(script!.innerHTML) as {
      '@type': string;
      mainEntity: { name: string; acceptedAnswer: { text: string } }[];
    };
    expect(data['@type']).toBe('FAQPage');
    expect(data.mainEntity.length).toBeGreaterThanOrEqual(3);
    expect(data.mainEntity[0].acceptedAnswer.text.length).toBeGreaterThan(0);
    // Οι ερωτήσεις του JSON-LD είναι αυτές που βλέπει και ο επισκέπτης.
    for (const entry of data.mainEntity) {
      expect(screen.getByText(entry.name)).toBeInTheDocument();
    }
  });
});

describe('PageHeading — badges/meta', () => {
  it('τα αποδίδει όταν δίνονται', () => {
    render(
      <PageHeading
        title="Τίτλος"
        badges={<span>Ετικέτα</span>}
        meta={<p>Μετα-στοιχεία</p>}
      />,
    );
    expect(screen.getByText('Ετικέτα')).toBeInTheDocument();
    expect(screen.getByText('Μετα-στοιχεία')).toBeInTheDocument();
    expect(screen.getByRole('heading', { level: 1 })).toHaveTextContent('Τίτλος');
  });

  it('χωρίς αυτά η κεφαλίδα μένει όπως ήταν', () => {
    const { container } = render(<PageHeading eyebrow="Εισαγωγή" title="Τίτλος" subtitle="Υπότιτλος" />);
    expect(screen.getByText('Εισαγωγή')).toBeInTheDocument();
    expect(screen.getByText('Υπότιτλος')).toBeInTheDocument();
    expect(container.querySelectorAll('div.flex.flex-wrap')).toHaveLength(0);
  });
});
