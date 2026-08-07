import { describe, it, expect } from 'vitest';
import { render, screen } from '@testing-library/react';
import { TourOrderSummary } from '@/components/booking/TourOrderSummary';
import type { TourOrder } from '@/types/db';

const order = (o: Partial<TourOrder> = {}): TourOrder => ({
  id: 'o1',
  public_code: 'EA1234',
  status: 'offline',
  expires_at: null,
  tour_id: 't1',
  tour_title: 'Διήμερη Θεσσαλονίκη',
  tour_slug: 'thessaloniki-diimeri-ekdromi',
  departure_date: '2026-08-08',
  items: [{ tier_id: 'tier1', label: 'ΤΟ ΑΤΟΜΟ ΣΕ ΔΙΚΛΙΝΟ', unit_cents: 9000, qty: 2, line_cents: 18000 }],
  party_size: 2,
  amount_total_cents: 18000,
  customer_name: 'Μαρία Παπαδοπούλου',
  email: 'maria@example.com',
  phone: '6900000000',
  notes: null,
  passengers: [],
  meeting_point: null,
  payment_provider: 'offline',
  paid_at: null,
  created_at: '2026-08-06T10:00:00Z',
  ...o,
});

describe('TourOrderSummary — ταξιδιώτες', () => {
  // Βρέθηκε στον έλεγχο του ζωντανού site: ο πελάτης πληκτρολογούσε ονόματα
  // ταξιδιωτών στο checkout και μετά δεν τα ξανάβλεπε πουθενά — ούτε για να
  // ελέγξει ότι τα έγραψε σωστά.
  it('δείχνει τα ονόματα των ταξιδιωτών όταν υπάρχουν', () => {
    render(
      <TourOrderSummary
        order={order({
          passengers: [
            { name: 'Μαρία Παπαδοπούλου', phone: null },
            { name: 'Γιώργος Παπαδόπουλος', phone: '6941234567' },
          ],
        })}
      />
    );
    expect(screen.getByText('Ταξιδιώτες')).toBeInTheDocument();
    expect(screen.getByText('Μαρία Παπαδοπούλου')).toBeInTheDocument();
    expect(screen.getByText('Γιώργος Παπαδόπουλος')).toBeInTheDocument();
    expect(screen.getByText(/6941234567/)).toBeInTheDocument();
  });

  it('δεν δείχνει καθόλου την ενότητα όταν δεν υπάρχουν ταξιδιώτες', () => {
    render(<TourOrderSummary order={order({ passengers: [] })} />);
    expect(screen.queryByText('Ταξιδιώτες')).not.toBeInTheDocument();
  });

  it('αντέχει παλιά κράτηση χωρίς καθόλου πεδίο ταξιδιωτών', () => {
    const legacy = order();
    delete (legacy as { passengers?: unknown }).passengers;
    render(<TourOrderSummary order={legacy} />);
    expect(screen.queryByText('Ταξιδιώτες')).not.toBeInTheDocument();
    expect(screen.getByText('EA1234')).toBeInTheDocument();
  });

  it('δείχνει το σημείο επιβίβασης κάθε ταξιδιώτη όταν υπάρχει', () => {
    render(
      <TourOrderSummary
        order={order({
          meeting_point: null, // μικτές στάσεις → το order-level είναι null
          passengers: [
            { name: 'Μαρία Παπαδοπούλου', phone: null, meeting_point: 'Πλατεία Γαστούνης' },
            { name: 'Γιώργος Παπαδόπουλος', phone: null, meeting_point: 'ΚΤΕΛ Αμαλιάδας' },
          ],
        })}
      />
    );
    expect(screen.getByText(/Πλατεία Γαστούνης/)).toBeInTheDocument();
    expect(screen.getByText(/ΚΤΕΛ Αμαλιάδας/)).toBeInTheDocument();
    expect(screen.queryByText(/Σημείο επιβίβασης:/)).not.toBeInTheDocument();
  });

  it('κοινή στάση όλων: δείχνει και την order-level γραμμή', () => {
    render(
      <TourOrderSummary
        order={order({
          meeting_point: 'Πλατεία Γαστούνης',
          passengers: [{ name: 'Μαρία Π.', phone: null, meeting_point: 'Πλατεία Γαστούνης' }],
        })}
      />
    );
    expect(screen.getByText(/Σημείο επιβίβασης:/)).toBeInTheDocument();
  });

  it('παλιοί ταξιδιώτες χωρίς σημείο εμφανίζονται όπως πριν', () => {
    render(
      <TourOrderSummary order={order({ passengers: [{ name: 'Μαρία Π.', phone: '6941234567' }] })} />
    );
    expect(screen.getByText('Μαρία Π.')).toBeInTheDocument();
    expect(screen.getByText(/6941234567/)).toBeInTheDocument();
  });

  it('κρατά τα υπόλοιπα στοιχεία της κράτησης', () => {
    render(<TourOrderSummary order={order({ passengers: [{ name: 'Μαρία', phone: null }] })} />);
    expect(screen.getByText('Διήμερη Θεσσαλονίκη')).toBeInTheDocument();
    expect(screen.getByText('EA1234')).toBeInTheDocument();
    // δύο φορές: η γραμμή της κατηγορίας και το σύνολο
    expect(screen.getAllByText('180,00 €')).toHaveLength(2);
  });
});
