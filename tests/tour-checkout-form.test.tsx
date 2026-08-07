import { describe, it, expect, vi } from 'vitest';
import { fireEvent, render, screen } from '@testing-library/react';
import { TourCheckoutForm, buildTourCheckoutSchema } from '@/components/booking/TourCheckoutForm';
import type { TourOrder } from '@/types/db';

// Τα server actions τραβούν το supabase/server + next/headers — δεν
// χρειάζονται για τα renders εδώ.
vi.mock('@/app/(site)/kratisi/actions', () => ({
  submitTourCheckout: vi.fn(),
  cancelTourBooking: vi.fn(),
}));

const order = (o: Partial<TourOrder> = {}): TourOrder => ({
  id: 'o1',
  public_code: 'EA1234',
  status: 'pending',
  expires_at: null,
  tour_id: 't1',
  tour_title: 'Διήμερη Θεσσαλονίκη',
  tour_slug: 'thessaloniki',
  departure_date: '2026-08-20',
  items: [{ tier_id: 'tier1', label: 'ΤΟ ΑΤΟΜΟ ΣΕ ΔΙΚΛΙΝΟ', unit_cents: 9000, qty: 2, line_cents: 18000 }],
  party_size: 2,
  amount_total_cents: 18000,
  customer_name: null,
  email: null,
  phone: null,
  notes: null,
  passengers: [],
  meeting_point: null,
  payment_provider: null,
  paid_at: null,
  created_at: '2026-08-07T10:00:00Z',
  ...o,
});

describe('buildTourCheckoutSchema — σημείο επιβίβασης ανά ταξιδιώτη', () => {
  const base = {
    customer_name: 'Μαρία Παπαδοπούλου',
    email: 'maria@example.com',
    phone: '6900000000',
    accept_terms: true as const,
  };

  it('με στάσεις: ταξιδιώτης χωρίς σημείο απορρίπτεται, με σημείο περνά', () => {
    const schema = buildTourCheckoutSchema(true);
    const bad = schema.safeParse({
      ...base,
      passengers: [{ name: 'Μαρία Π.', phone: '', meeting_point: '' }],
    });
    expect(bad.success).toBe(false);
    const good = schema.safeParse({
      ...base,
      passengers: [{ name: 'Μαρία Π.', phone: '', meeting_point: 'Πλατεία Γαστούνης' }],
    });
    expect(good.success).toBe(true);
  });

  it('χωρίς στάσεις: το σημείο είναι προαιρετικό', () => {
    const schema = buildTourCheckoutSchema(false);
    const res = schema.safeParse({
      ...base,
      passengers: [{ name: 'Μαρία Π.', phone: '' }],
    });
    expect(res.success).toBe(true);
  });
});

describe('TourCheckoutForm — επιλογή σημείου ανά ταξιδιώτη', () => {
  it('δείχνει ένα select σημείου ανά ταξιδιώτη και κανένα order-level', () => {
    render(
      <TourCheckoutForm
        order={order()}
        token="tok"
        offline
        meetingPoints={['Πλατεία Γαστούνης', 'ΚΤΕΛ Αμαλιάδας']}
      />
    );
    expect(screen.getAllByLabelText('Σημείο επιβίβασης *')).toHaveLength(2);
    expect(screen.queryByLabelText('Σημείο συνάντησης *')).not.toBeInTheDocument();
  });

  it('χωρίς στάσεις δεν εμφανίζει κανένα select σημείου', () => {
    render(<TourCheckoutForm order={order()} token="tok" offline meetingPoints={[]} />);
    expect(screen.queryByLabelText('Σημείο επιβίβασης *')).not.toBeInTheDocument();
  });

  it('η επιλογή του 1ου προσυμπληρώνει τους κενούς αλλά όχι όσους διάλεξαν', () => {
    render(
      <TourCheckoutForm
        order={order()}
        token="tok"
        offline
        meetingPoints={['Πλατεία Γαστούνης', 'ΚΤΕΛ Αμαλιάδας']}
      />
    );
    const selects = screen.getAllByLabelText('Σημείο επιβίβασης *') as HTMLSelectElement[];
    fireEvent.change(selects[0], { target: { value: 'Πλατεία Γαστούνης' } });
    expect(selects[1].value).toBe('Πλατεία Γαστούνης');
    // Ο 2ος διαλέγει κάτι άλλο· νέα αλλαγή του 1ου δεν τον πατάει.
    fireEvent.change(selects[1], { target: { value: 'ΚΤΕΛ Αμαλιάδας' } });
    fireEvent.change(selects[0], { target: { value: 'ΚΤΕΛ Αμαλιάδας' } });
    expect(selects[1].value).toBe('ΚΤΕΛ Αμαλιάδας');
    fireEvent.change(selects[0], { target: { value: 'Πλατεία Γαστούνης' } });
    expect(selects[1].value).toBe('ΚΤΕΛ Αμαλιάδας');
  });

  it('με μία μόνο στάση προεπιλέγεται για όλους', () => {
    render(<TourCheckoutForm order={order()} token="tok" offline meetingPoints={['Πλατεία Γαστούνης']} />);
    const selects = screen.getAllByLabelText('Σημείο επιβίβασης *') as HTMLSelectElement[];
    expect(selects).toHaveLength(2);
    for (const s of selects) expect(s.value).toBe('Πλατεία Γαστούνης');
  });
});
