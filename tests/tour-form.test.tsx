import { describe, it, expect } from 'vitest';
import { render, screen } from '@testing-library/react';
import { TourForm } from '@/components/admin/TourForm';
import type { Category, Tour } from '@/types/db';
import type { AdminRoute } from '@/lib/queries/ticketing';

const categories: Category[] = [
  { id: 'c1', slug: 'monoimeres', name_el: 'Μονοήμερες', description_el: null, sort_order: 0 },
  { id: 'c2', slug: 'kroyazieres', name_el: 'Κρουαζιέρες', description_el: null, sort_order: 1 },
  { id: 'c3', slug: 'polyimeres', name_el: 'Πολυήμερες', description_el: null, sort_order: 2 },
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
  short_description: null,
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


describe('TourForm — highlights και τι περιλαμβάνεται', () => {
  const area = (label: RegExp) => screen.getByLabelText(label) as HTMLTextAreaElement;
  // Τα included/not_included/meeting_points ζουν πλέον σε PresetPicker: το
  // textarea δεν έχει δικό του label (η επικεφαλίδα είναι legend), οπότε
  // εντοπίζεται από το name του.
  const areaByName = (container: HTMLElement, name: string) =>
    container.querySelector(`textarea[name="${name}"]`) as HTMLTextAreaElement;

  it('έχει και τα τρία πεδία με τα σωστά ονόματα', () => {
    const { container } = render(<TourForm tour={tour} categories={categories} routes={routes} action={() => {}} />);
    expect(area(/Τι θα δείτε/).name).toBe('highlights');
    expect(areaByName(container, 'included')).toBeInTheDocument();
    expect(areaByName(container, 'not_included')).toBeInTheDocument();
    expect(areaByName(container, 'meeting_points')).toBeInTheDocument();
  });

  it('γεμίζει κάθε πεδίο από την εκδρομή, μία γραμμή ανά σημείο', () => {
    const { container } = render(
      <TourForm
        tour={{
          ...tour,
          highlights: ['Ξενάγηση στα μοναστήρια', 'Ελεύθερος χρόνος'],
          included: ['Μεταφορά με πούλμαν'],
          not_included: ['Είσοδοι', 'Γεύματα'],
        }}
        categories={categories}
        routes={routes}
        action={() => {}}
      />,
    );
    expect(area(/Τι θα δείτε/).value).toBe('Ξενάγηση στα μοναστήρια\nΕλεύθερος χρόνος');
    expect(areaByName(container, 'included').value).toBe('Μεταφορά με πούλμαν');
    expect(areaByName(container, 'not_included').value).toBe('Είσοδοι\nΓεύματα');
  });

  it('νέα εκδρομή: και τα τρία πεδία άδεια', () => {
    const { container } = render(<TourForm categories={categories} routes={routes} action={() => {}} />);
    expect(area(/Τι θα δείτε/).value).toBe('');
    expect(areaByName(container, 'included').value).toBe('');
    expect(areaByName(container, 'not_included').value).toBe('');
  });
});


// Έτοιμα κείμενα: οι γραμμές της καρτέλας «Έτοιμα κείμενα» εμφανίζονται ως
// checkboxes (`<πεδίο>_preset`), οι τιμές της εκδρομής που ταιριάζουν
// προεπιλέγονται, και ό,τι δεν ταιριάζει πάει στο textarea των έξτρα γραμμών.
describe('TourForm — έτοιμα κείμενα (presets)', () => {
  const presets = {
    meeting_points: ['Πλατεία Συντάγματος', 'Σταθμός ΗΣΑΠ Πειραιά'],
    included: ['Μεταφορά με πούλμαν', 'Αρχηγός εκδρομής'],
    not_included: ['Γεύματα'],
  };

  it('τσεκάρει όσα έχει ήδη η εκδρομή και στέλνει τα υπόλοιπα ως έξτρα', () => {
    const { container } = render(
      <TourForm
        tour={{ ...tour, included: ['Μεταφορά με πούλμαν', 'Καφές στο πούλμαν'], meeting_points: ['Πλατεία Συντάγματος'] }}
        categories={categories}
        routes={routes}
        presets={presets}
        action={() => {}}
      />,
    );
    const boxes = [...container.querySelectorAll('input[name="included_preset"]')] as HTMLInputElement[];
    expect(boxes.map((b) => b.value)).toEqual(['Μεταφορά με πούλμαν', 'Αρχηγός εκδρομής']);
    expect(boxes[0].checked).toBe(true);
    expect(boxes[1].checked).toBe(false);
    const extra = container.querySelector('textarea[name="included"]') as HTMLTextAreaElement;
    expect(extra.value).toBe('Καφές στο πούλμαν');
    const meeting = [...container.querySelectorAll('input[name="meeting_points_preset"]')] as HTMLInputElement[];
    expect(meeting[0].checked).toBe(true);
    expect(meeting[1].checked).toBe(false);
  });

  it('χωρίς presets η φόρμα δουλεύει όπως πριν, με όλα στο textarea', () => {
    const { container } = render(
      <TourForm tour={{ ...tour, included: ['Μεταφορά'] }} categories={categories} routes={routes} action={() => {}} />,
    );
    expect(container.querySelectorAll('input[name="included_preset"]')).toHaveLength(0);
    expect((container.querySelector('textarea[name="included"]') as HTMLTextAreaElement).value).toBe('Μεταφορά');
  });
});


// Η φόρμα είχε ένα μονό <select> κατηγορίας ενώ το upsertTour έσβηνε όλες τις
// υπάρχουσες και ξανάγραφε μία — κάθε αποθήκευση εκδρομής με δύο κατηγορίες
// έχανε σιωπηλά τη δεύτερη.
describe('TourForm — κατηγορίες', () => {
  const checkbox = (label: string) => screen.getByRole('checkbox', { name: label }) as HTMLInputElement;

  it('προεπιλέγει ΟΛΕΣ τις κατηγορίες της εκδρομής, όχι μόνο την πρώτη', () => {
    render(
      <TourForm
        tour={{ ...tour, categories: [categories[0], categories[1]] } as Tour}
        categories={categories}
        routes={routes}
        action={() => {}}
      />
    );
    expect(checkbox('Μονοήμερες').checked).toBe(true);
    expect(checkbox('Κρουαζιέρες').checked).toBe(true);
    expect(checkbox('Πολυήμερες').checked).toBe(false);
  });

  it('όλα τα checkbox στέλνονται με το ίδιο όνομα ώστε να φτάσουν ως λίστα', () => {
    render(<TourForm tour={tour} categories={categories} routes={routes} action={() => {}} />);
    for (const name of ['Μονοήμερες', 'Κρουαζιέρες', 'Πολυήμερες']) {
      expect(checkbox(name).name).toBe('category');
    }
  });

  it('νέα εκδρομή: προεπιλέγεται μόνο η πρώτη κατηγορία', () => {
    render(<TourForm categories={categories} routes={routes} action={() => {}} />);
    expect(checkbox('Μονοήμερες').checked).toBe(true);
    expect(checkbox('Κρουαζιέρες').checked).toBe(false);
  });
});
