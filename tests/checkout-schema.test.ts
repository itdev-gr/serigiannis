import { describe, it, expect, vi } from 'vitest';
import { buildSchema } from '@/components/ticketing/CheckoutForm';

// Το component module τραβάει τα server actions (supabase/server) — δεν
// χρειάζονται για τα schema tests.
vi.mock('@/app/(site)/eisitiria/actions', () => ({
  submitCheckout: vi.fn(),
  cancelCheckout: vi.fn(),
}));

const billing = {
  customer_name: 'Μαρία Παπαδοπούλου',
  email: 'maria@example.com',
  phone: '6900000000',
  address: 'Ερμού 1',
  city: 'Γαστούνη',
  postal_code: '27300',
  region: 'Δυτική Ελλάδα',
  accept_terms: true as const,
};

const passenger = (over: Record<string, string> = {}) => ({
  passenger_name: 'Μαρία Π.',
  passenger_phone: '6900000000',
  fare_type_id: 'fare1',
  ...over,
});

const STOPS = ['Πλατεία Γαστούνης', 'ΚΤΕΛ Αμαλιάδας'];

describe('CheckoutForm buildSchema — προαιρετικό email επιβάτη', () => {
  const schema = buildSchema(1, STOPS);
  const withStop = (over: Record<string, string> = {}) =>
    passenger({ boarding_point: 'Πλατεία Γαστούνης', ...over });

  it('κενό email περνάει — το πεδίο είναι προαιρετικό', () => {
    expect(schema.safeParse({ ...billing, passengers: [withStop({ passenger_email: '' })] }).success).toBe(true);
    expect(schema.safeParse({ ...billing, passengers: [withStop()] }).success).toBe(true);
  });

  it('έγκυρο email περνάει', () => {
    expect(
      schema.safeParse({ ...billing, passengers: [withStop({ passenger_email: 'a@example.com' })] }).success
    ).toBe(true);
  });

  it('άκυρο email απορρίπτεται', () => {
    expect(schema.safeParse({ ...billing, passengers: [withStop({ passenger_email: 'abc' })] }).success).toBe(false);
  });
});

describe('CheckoutForm buildSchema — σημείο επιβίβασης ανά επιβάτη', () => {
  it('με στάσεις: κενό ή μη-μέλος σημείο απορρίπτεται', () => {
    const schema = buildSchema(1, STOPS);
    expect(schema.safeParse({ ...billing, passengers: [passenger()] }).success).toBe(false);
    expect(
      schema.safeParse({ ...billing, passengers: [passenger({ boarding_point: '' })] }).success
    ).toBe(false);
    expect(
      schema.safeParse({ ...billing, passengers: [passenger({ boarding_point: 'Αλλού' })] }).success
    ).toBe(false);
  });

  it('με στάσεις: έγκυρο σημείο για κάθε επιβάτη περνά', () => {
    const schema = buildSchema(2, STOPS);
    const res = schema.safeParse({
      ...billing,
      passengers: [
        passenger({ boarding_point: 'Πλατεία Γαστούνης' }),
        passenger({ boarding_point: 'ΚΤΕΛ Αμαλιάδας' }),
      ],
    });
    expect(res.success).toBe(true);
  });

  it('χωρίς στάσεις: το σημείο είναι προαιρετικό', () => {
    const schema = buildSchema(1, []);
    expect(schema.safeParse({ ...billing, passengers: [passenger()] }).success).toBe(true);
  });

  it('ο έλεγχος πλήθους επιβατών ισχύει και με το νέο πεδίο', () => {
    const schema = buildSchema(2, STOPS);
    const res = schema.safeParse({
      ...billing,
      passengers: [passenger({ boarding_point: 'Πλατεία Γαστούνης' })],
    });
    expect(res.success).toBe(false);
  });
});
