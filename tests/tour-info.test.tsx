import { describe, it, expect } from 'vitest';
import { render, screen } from '@testing-library/react';
import { TourInfo } from '@/components/trips/TourInfo';
import type { Tour } from '@/types/db';

const tour = (o: Partial<Tour> = {}): Tour => ({
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
});

describe('TourInfo — πλακίδια «Καλό να ξέρετε»', () => {
  it('δείχνει και τα τέσσερα όταν υπάρχουν όλα τα πεδία', () => {
    render(
      <TourInfo
        tour={tour({
          duration_label: '2 ημέρες',
          departure_note: 'Κάθε Σάββατο',
          meeting_point: 'Πλατεία Ελευθερίας',
          price_from: 89,
        })}
      />,
    );
    expect(screen.getAllByTestId('info-tile')).toHaveLength(4);
    expect(screen.getByText('Διάρκεια')).toBeInTheDocument();
    expect(screen.getByText('2 ημέρες')).toBeInTheDocument();
    expect(screen.getByText('από 89€')).toBeInTheDocument();
  });

  it('δείχνει μόνο τα πλακίδια των πεδίων που υπάρχουν', () => {
    render(<TourInfo tour={tour({ duration_label: 'Ολοήμερη' })} />);
    expect(screen.getAllByTestId('info-tile')).toHaveLength(1);
    expect(screen.getByText('Διάρκεια')).toBeInTheDocument();
    expect(screen.queryByText('Αναχωρήσεις')).not.toBeInTheDocument();
    expect(screen.queryByText('Σημείο συνάντησης')).not.toBeInTheDocument();
    expect(screen.queryByText('Τιμή')).not.toBeInTheDocument();
  });

  it('η τιμή 0 δείχνει πλακίδιο, δεν θεωρείται άδειο πεδίο', () => {
    render(<TourInfo tour={tour({ price_from: 0 })} />);
    expect(screen.getByText('από 0€')).toBeInTheDocument();
  });
});

describe('TourInfo — καμία κενή ενότητα', () => {
  it('δεν γράφει τίποτα για εκδρομή χωρίς δεδομένα', () => {
    const { container } = render(<TourInfo tour={tour()} />);
    expect(container).toBeEmptyDOMElement();
  });

  it('χωρίς περιγραφή δεν δείχνει την κεφαλίδα «Περιγραφή»', () => {
    render(<TourInfo tour={tour({ duration_label: 'Ολοήμερη' })} />);
    expect(screen.queryByRole('heading', { name: 'Περιγραφή' })).not.toBeInTheDocument();
    expect(screen.getByRole('heading', { name: 'Καλό να ξέρετε' })).toBeInTheDocument();
  });

  it('περιγραφή με μόνο κενά δεν ανοίγει ενότητα', () => {
    const { container } = render(<TourInfo tour={tour({ summary: '\n   \n' })} />);
    expect(container).toBeEmptyDOMElement();
  });

  it('χωρίς πλακίδια και χωρίς στάσεις μένει μόνο η περιγραφή', () => {
    render(<TourInfo tour={tour({ summary: 'Πρώτη παράγραφος.\n\nΔεύτερη παράγραφος.' })} />);
    expect(screen.getByRole('heading', { name: 'Περιγραφή' })).toBeInTheDocument();
    expect(screen.queryByRole('heading', { name: 'Καλό να ξέρετε' })).not.toBeInTheDocument();
    expect(screen.queryByRole('heading', { name: 'Σημεία επιβίβασης' })).not.toBeInTheDocument();
    expect(screen.getByText('Πρώτη παράγραφος.')).toBeInTheDocument();
    expect(screen.getByText('Δεύτερη παράγραφος.')).toBeInTheDocument();
  });
});

describe('TourInfo — «Τι θα δείτε»', () => {
  it('δείχνει κάθε highlight σε δική του γραμμή', () => {
    render(
      <TourInfo tour={tour({ highlights: ['Ξενάγηση στα μοναστήρια', 'Ελεύθερος χρόνος στην Καλαμπάκα'] })} />,
    );
    expect(screen.getByRole('heading', { name: 'Τι θα δείτε' })).toBeInTheDocument();
    expect(screen.getAllByTestId('tour-highlight')).toHaveLength(2);
    expect(screen.getByText('Ξενάγηση στα μοναστήρια')).toBeInTheDocument();
    expect(screen.getByText('Ελεύθερος χρόνος στην Καλαμπάκα')).toBeInTheDocument();
  });

  it('χωρίς highlights δεν δείχνει την ενότητα', () => {
    render(<TourInfo tour={tour({ duration_label: 'Ολοήμερη' })} />);
    expect(screen.queryByRole('heading', { name: 'Τι θα δείτε' })).not.toBeInTheDocument();
    expect(screen.queryAllByTestId('tour-highlight')).toHaveLength(0);
  });

  it('highlights με μόνο κενά δεν ανοίγουν ενότητα', () => {
    const { container } = render(<TourInfo tour={tour({ highlights: ['', '   '] })} />);
    expect(container).toBeEmptyDOMElement();
  });
});

describe('TourInfo — «Τι περιλαμβάνεται»', () => {
  it('δείχνει και τις δύο στήλες όταν υπάρχουν και τα δύο', () => {
    render(
      <TourInfo
        tour={tour({
          included: ['Μεταφορά με πούλμαν', 'Αρχηγός εκδρομής'],
          not_included: ['Είσοδοι σε μουσεία'],
        })}
      />,
    );
    expect(screen.getByRole('heading', { name: 'Τι περιλαμβάνεται' })).toBeInTheDocument();
    expect(screen.getByRole('heading', { name: 'Περιλαμβάνονται' })).toBeInTheDocument();
    expect(screen.getByRole('heading', { name: 'Δεν περιλαμβάνονται' })).toBeInTheDocument();
    expect(screen.getAllByTestId('tour-included')).toHaveLength(2);
    expect(screen.getAllByTestId('tour-not-included')).toHaveLength(1);
    expect(screen.getByText('Είσοδοι σε μουσεία')).toBeInTheDocument();
  });

  it('μόνο «Περιλαμβάνονται»: η άλλη στήλη λείπει εντελώς', () => {
    render(<TourInfo tour={tour({ included: ['Ασφάλεια αστικής ευθύνης'] })} />);
    expect(screen.getByRole('heading', { name: 'Περιλαμβάνονται' })).toBeInTheDocument();
    expect(screen.queryByRole('heading', { name: 'Δεν περιλαμβάνονται' })).not.toBeInTheDocument();
    expect(screen.queryAllByTestId('tour-not-included')).toHaveLength(0);
  });

  it('μόνο «Δεν περιλαμβάνονται»: η άλλη στήλη λείπει εντελώς', () => {
    render(<TourInfo tour={tour({ not_included: ['Γεύματα'] })} />);
    expect(screen.getByRole('heading', { name: 'Δεν περιλαμβάνονται' })).toBeInTheDocument();
    expect(screen.queryByRole('heading', { name: 'Περιλαμβάνονται' })).not.toBeInTheDocument();
    expect(screen.queryAllByTestId('tour-included')).toHaveLength(0);
  });

  it('χωρίς καμία από τις δύο λίστες δεν δείχνει την ενότητα', () => {
    render(<TourInfo tour={tour({ duration_label: 'Ολοήμερη' })} />);
    expect(screen.queryByRole('heading', { name: 'Τι περιλαμβάνεται' })).not.toBeInTheDocument();
  });

  it('λίστες με μόνο κενά δεν ανοίγουν ενότητα', () => {
    const { container } = render(<TourInfo tour={tour({ included: [' '], not_included: ['', '  '] })} />);
    expect(container).toBeEmptyDOMElement();
  });
});

describe('TourInfo — σημεία επιβίβασης', () => {
  it('δείχνει κάθε σημείο σε δική του γραμμή', () => {
    render(
      <TourInfo tour={tour({ meeting_points: ['Πλατεία Ελευθερίας 06:45', 'ΚΤΕΛ Άργους 07:10', 'Νέα Κίος 07:25'] })} />,
    );
    expect(screen.getAllByTestId('boarding-point')).toHaveLength(3);
    expect(screen.getByText('ΚΤΕΛ Άργους 07:10')).toBeInTheDocument();
    expect(screen.getByRole('heading', { name: 'Σημεία επιβίβασης' })).toBeInTheDocument();
  });

  it('χωρίς σημεία δεν δείχνει την ενότητα', () => {
    render(<TourInfo tour={tour({ meeting_point: 'Γραφείο' })} />);
    expect(screen.queryByRole('heading', { name: 'Σημεία επιβίβασης' })).not.toBeInTheDocument();
    expect(screen.queryAllByTestId('boarding-point')).toHaveLength(0);
  });
});
