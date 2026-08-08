import { describe, it, expect, beforeAll, beforeEach, vi } from 'vitest';
import { render, screen, fireEvent } from '@testing-library/react';
import { RelatedToursCarousel } from '@/components/trips/RelatedToursCarousel';
import type { Tour } from '@/types/db';

// Το jsdom δεν υλοποιεί κύλιση: χωρίς stub το scrollTo σκάει.
const scrollTo = vi.fn();
beforeAll(() => {
  Element.prototype.scrollTo = scrollTo as unknown as Element['scrollTo'];
});

beforeEach(() => {
  vi.clearAllMocks();
});

const tour = (o: Partial<Tour> = {}): Tour => ({
  id: 'a', slug: 'ydra', title: 'Ύδρα', subtitle: null, summary: 'Το νησί του Μιαούλη', body: {},
  price_from: 25, price_original: null, currency: 'EUR', duration_label: 'Μονοήμερη',
  departure_note: null, meeting_point: null, meeting_points: [], highlights: [], included: [],
  not_included: [], route_id: null, status: 'published', is_featured: false, bookings_open: true,
  cover_image_id: null, seo_title: null, seo_description: null, source_url: null,
  sort_order: 0, published_at: null, categories: [], images: [], ...o,
});

const tours = (n: number): Tour[] =>
  Array.from({ length: n }, (_, i) => tour({ id: `t${i}`, slug: `tour-${i}`, title: `Εκδρομή ${i + 1}` }));

describe('RelatedToursCarousel', () => {
  it('δεν εμφανίζει τίποτα χωρίς παρόμοιες εκδρομές', () => {
    const { container } = render(<RelatedToursCarousel tours={[]} />);
    expect(container).toBeEmptyDOMElement();
  });

  it('δείχνει μία κάρτα ανά εκδρομή, έως οκτώ', () => {
    render(<RelatedToursCarousel tours={tours(8)} />);
    expect(screen.getAllByTestId('related-card')).toHaveLength(8);
    expect(screen.getAllByRole('heading', { level: 3 })[0]).toHaveTextContent('Εκδρομή 1');
  });

  it('κρατά την επικεφαλίδα και τον σύνδεσμο προς όλες τις εκδρομές', () => {
    render(<RelatedToursCarousel tours={tours(3)} />);
    expect(screen.getByRole('heading', { level: 2 })).toHaveTextContent('Παρόμοιες εκδρομές');
    expect(screen.getByRole('link', { name: /Δείτε όλες/ })).toHaveAttribute('href', '/ekdromes');
  });

  it('χωρίς τίποτα να κυλήσει δεν βάζει βέλη', () => {
    render(<RelatedToursCarousel tours={tours(1)} />);
    expect(screen.queryByTestId('related-next')).not.toBeInTheDocument();
    expect(screen.queryByTestId('related-prev')).not.toBeInTheDocument();
  });

  it('βάζει βέλη μόλις οι εκδρομές είναι περισσότερες από όσες χωρούν', () => {
    render(<RelatedToursCarousel tours={tours(8)} />);
    expect(screen.getByTestId('related-next')).toBeInTheDocument();
    expect(screen.getByTestId('related-prev')).toBeInTheDocument();
  });

  // Με λίγες κάρτες τα βέλη χρειάζονται μόνο στις στενές οθόνες: από το
  // breakpoint που τις χωράει και πάνω κρύβονται με κλάση.
  it('κρύβει τα βέλη στο breakpoint όπου οι κάρτες χωράνε', () => {
    render(<RelatedToursCarousel tours={tours(2)} />);
    expect(screen.getByTestId('related-next')).toHaveClass('sm:hidden');
  });

  it('με τρεις εκδρομές τα βέλη ζουν μέχρι το lg', () => {
    render(<RelatedToursCarousel tours={tours(3)} />);
    expect(screen.getByTestId('related-next')).toHaveClass('lg:hidden');
  });

  it('με οκτώ εκδρομές τα βέλη μένουν ορατά παντού', () => {
    const next = render(<RelatedToursCarousel tours={tours(8)} />);
    expect(next.getByTestId('related-next').className).not.toMatch(/hidden/);
  });

  it('το επόμενο και το προηγούμενο κυλούν χωρίς να σκάνε', () => {
    render(<RelatedToursCarousel tours={tours(8)} />);
    fireEvent.click(screen.getByTestId('related-next'));
    fireEvent.click(screen.getByTestId('related-prev'));
    expect(scrollTo).toHaveBeenCalledTimes(2);
  });

  it('στο τέλος τυλίγει στην αρχή και από την αρχή στο τέλος', () => {
    render(<RelatedToursCarousel tours={tours(8)} />);
    const track = screen.getByTestId('related-track');
    // Πλάτη που το jsdom δεν υπολογίζει μόνο του.
    Object.defineProperty(track, 'clientWidth', { value: 400, configurable: true });
    Object.defineProperty(track, 'scrollWidth', { value: 1200, configurable: true });

    track.scrollLeft = 800; // στο τέλος (scrollWidth - clientWidth)
    fireEvent.click(screen.getByTestId('related-next'));
    expect(scrollTo).toHaveBeenLastCalledWith(expect.objectContaining({ left: 0 }));

    track.scrollLeft = 0; // στην αρχή
    fireEvent.click(screen.getByTestId('related-prev'));
    expect(scrollTo).toHaveBeenLastCalledWith(expect.objectContaining({ left: 800 }));
  });

  it('στη μέση προχωρά μία σελίδα κάθε φορά', () => {
    render(<RelatedToursCarousel tours={tours(8)} />);
    const track = screen.getByTestId('related-track');
    Object.defineProperty(track, 'clientWidth', { value: 400, configurable: true });
    Object.defineProperty(track, 'scrollWidth', { value: 1200, configurable: true });

    track.scrollLeft = 400;
    fireEvent.click(screen.getByTestId('related-next'));
    expect(scrollTo).toHaveBeenLastCalledWith(expect.objectContaining({ left: 800 }));

    fireEvent.click(screen.getByTestId('related-prev'));
    expect(scrollTo).toHaveBeenLastCalledWith(expect.objectContaining({ left: 0 }));
  });

  it('τα βέλη του πληκτρολογίου κυλούν τη λίστα', () => {
    render(<RelatedToursCarousel tours={tours(8)} />);
    const track = screen.getByTestId('related-track');
    expect(track).toHaveAttribute('tabindex', '0');
    fireEvent.keyDown(track, { key: 'ArrowRight' });
    expect(scrollTo).toHaveBeenCalledTimes(1);
    fireEvent.keyDown(track, { key: 'ArrowLeft' });
    expect(scrollTo).toHaveBeenCalledTimes(2);
    fireEvent.keyDown(track, { key: 'ArrowUp' });
    expect(scrollTo).toHaveBeenCalledTimes(2);
  });

  // Το setup δηλώνει prefers-reduced-motion, οπότε καμία ομαλή κύλιση.
  it('σέβεται το prefers-reduced-motion', () => {
    render(<RelatedToursCarousel tours={tours(8)} />);
    fireEvent.click(screen.getByTestId('related-next'));
    expect(scrollTo).toHaveBeenLastCalledWith(expect.objectContaining({ behavior: 'auto' }));
  });
});
