import { describe, it, expect } from 'vitest';
import { render, screen } from '@testing-library/react';
import { TourForm } from '@/components/admin/TourForm';
import type { Category, Tour } from '@/types/db';
import type { AdminRoute } from '@/lib/queries/ticketing';

const categories: Category[] = [
  { id: 'c1', slug: 'monoimeres', name_el: 'Μονοήμερες', description_el: null, sort_order: 0 },
];

const routes: AdminRoute[] = [
  {
    id: 'r-1',
    origin_station_id: 's1',
    destination_station_id: 's2',
    status: 'published',
    duration_min: 120,
    sales_cutoff_min: 5,
    position: 0,
    title: 'Μονοήμερη Ναύπλιο',
    boarding_points: [],
    origin: { name: 'Αθήνα' },
    destination: { name: 'Ναύπλιο' },
  },
];

const tour = {
  id: 't-1',
  slug: 'monoimeri-nafplio',
  title: 'Μονοήμερη Ναύπλιο',
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
  route_id: 'r-1',
  status: 'published',
  is_featured: false,
  bookings_open: true,
  cover_image_id: null,
  seo_title: null,
  seo_description: null,
  source_url: null,
  sort_order: 0,
  published_at: null,
} satisfies Tour;

describe('TourForm — σύνδεση με εκδρομή πούλμαν', () => {
  it('δείχνει τη συνδεδεμένη εκδρομή επιλεγμένη', () => {
    render(<TourForm tour={tour} categories={categories} routes={routes} action={() => {}} />);
    const select = screen.getByLabelText(/Σύνδεση με εκδρομή πούλμαν/) as HTMLSelectElement;
    expect(select.name).toBe('route_id');
    expect(select.value).toBe('r-1');
  });

  it('χωρίς σύνδεση όταν η εκδρομή δεν δείχνει πουθενά', () => {
    render(<TourForm tour={{ ...tour, route_id: null }} categories={categories} routes={routes} action={() => {}} />);
    const select = screen.getByLabelText(/Σύνδεση με εκδρομή πούλμαν/) as HTMLSelectElement;
    expect(select.value).toBe('');
    expect(screen.getByText('— Χωρίς σύνδεση —')).toBeInTheDocument();
  });

  it('δείχνει τον επιλογέα και σε νέα εκδρομή, άδειο', () => {
    render(<TourForm categories={categories} routes={routes} action={() => {}} />);
    const select = screen.getByLabelText(/Σύνδεση με εκδρομή πούλμαν/) as HTMLSelectElement;
    expect(select.value).toBe('');
  });
});
