import { describe, it, expect } from 'vitest';
import { passengerRecipients } from '@/lib/ticket-notify';
import type { OrderTicket } from '@/types/ticketing';

const ticket = (over: Partial<OrderTicket> & { passenger_key: number }): OrderTicket => ({
  id: `t${over.passenger_key}-${over.leg ?? 'outbound'}`,
  code: `C${over.passenger_key}${over.leg === 'return' ? 'R' : 'O'}`,
  leg: 'outbound',
  trip_id: 'trip1',
  seat_no: '1',
  passenger_name: `Επιβάτης ${over.passenger_key}`,
  passenger_phone: null,
  fare_name: 'Κανονικό',
  fare_basis: 'oneway',
  price_cents: 1500,
  status: 'valid',
  open_return: false,
  open_return_expires_on: null,
  refunded_cents: null,
  ...over,
});

describe('passengerRecipients', () => {
  it('στέλνει μόνο σε όσους έδωσαν email', () => {
    const res = passengerRecipients(
      [
        ticket({ passenger_key: 1, passenger_email: 'a@example.com' }),
        ticket({ passenger_key: 2 }),
        ticket({ passenger_key: 3, passenger_email: '' }),
      ],
      'payer@example.com'
    );
    expect(res.map((r) => r.email)).toEqual(['a@example.com']);
  });

  it('παραλείπει τον πληρωτή ώστε να μη λάβει διπλό email', () => {
    const res = passengerRecipients(
      [
        ticket({ passenger_key: 1, passenger_email: 'Payer@Example.com' }),
        ticket({ passenger_key: 2, passenger_email: 'b@example.com' }),
      ],
      'payer@example.com'
    );
    expect(res.map((r) => r.email)).toEqual(['b@example.com']);
  });

  it('δύο επιβάτες με το ίδιο email παίρνουν ΕΝΑ μήνυμα με δύο εισιτήρια', () => {
    const res = passengerRecipients(
      [
        ticket({ passenger_key: 1, passenger_email: 'same@example.com' }),
        ticket({ passenger_key: 2, passenger_email: 'SAME@example.com' }),
      ],
      'payer@example.com'
    );
    expect(res).toHaveLength(1);
    expect(res[0].email).toBe('same@example.com');
    expect(res[0].tickets).toHaveLength(2);
  });

  it('ο ίδιος επιβάτης παίρνει και αναχώρηση και επιστροφή', () => {
    const res = passengerRecipients(
      [
        ticket({ passenger_key: 1, leg: 'outbound', passenger_email: 'a@example.com' }),
        ticket({ passenger_key: 1, leg: 'return', passenger_email: 'a@example.com' }),
      ],
      'payer@example.com'
    );
    expect(res).toHaveLength(1);
    expect(res[0].tickets.map((t) => t.leg)).toEqual(['outbound', 'return']);
  });

  it('το email γράφεται και στα δύο σκέλη, αλλά αρκεί να υπάρχει σε ένα', () => {
    const res = passengerRecipients(
      [
        ticket({ passenger_key: 1, leg: 'outbound', passenger_email: null }),
        ticket({ passenger_key: 1, leg: 'return', passenger_email: 'a@example.com' }),
      ],
      null
    );
    expect(res).toHaveLength(1);
    expect(res[0].tickets).toHaveLength(2);
  });

  it('καμία αποστολή όταν κανείς δεν έδωσε email', () => {
    expect(passengerRecipients([ticket({ passenger_key: 1 })], 'payer@example.com')).toEqual([]);
  });
});
