import { describe, it, expect } from 'vitest';
import { render, screen, fireEvent } from '@testing-library/react';
import { TripSeatPanel } from '@/components/admin/TripSeatPanel';
import type { FareType, LayoutJson } from '@/types/ticketing';

// Minimal three-seat layout — enough to exercise the map without depending
// on real trip data.
const layout: LayoutJson = {
  decks: [
    {
      name: 'ΚΑΤΩ',
      rows: 1,
      cols: 3,
      cells: [
        { r: 0, c: 0, type: 'seat', seat: '11' },
        { r: 0, c: 1, type: 'seat', seat: '12' },
        { r: 0, c: 2, type: 'seat', seat: '13' },
      ],
    },
  ],
};

const fares: FareType[] = [
  {
    id: 'f1',
    route_id: 'r1',
    name: 'Κανονικό',
    description: null,
    price_oneway_cents: 1000,
    price_round_cents: 2000,
    requires_document: false,
    is_default: true,
    position: 1,
    is_active: true,
  },
];

/** Stands in for the trip page: `key` mirrors `sp.after ?? 'first'` there,
 *  so re-rendering this with a new `panelKey` simulates the post-booking
 *  redirect (soft nav, same route, new `after` search param), while
 *  re-rendering with the SAME `panelKey` simulates an unrelated re-render
 *  (e.g. the revalidatePath that follows a block/unblock). */
function Harness({ panelKey, initialSeat }: { panelKey: string; initialSeat: string }) {
  return (
    <TripSeatPanel
      key={panelKey}
      tripId="trip-1"
      layout={layout}
      claims={[]}
      fares={fares}
      initialSeat={initialSeat}
      seatsLeft={3}
      boardingPoints={[]}
    />
  );
}

const seatInput = () => screen.getByPlaceholderText('π.χ. 12') as HTMLInputElement;

describe('TripSeatPanel auto-advance (Finding 1)', () => {
  it('seeds the seat field from the server-computed suggestion', () => {
    render(<Harness panelKey="first" initialSeat="11" />);
    expect(seatInput()).toHaveValue('11');
  });

  it('picks up the next suggestion once remounted with a new key, as happens after a booking redirect', () => {
    const { rerender } = render(<Harness panelKey="first" initialSeat="11" />);
    expect(seatInput()).toHaveValue('11');
    expect(screen.getByText('Πρόταση: επόμενη ελεύθερη')).toBeInTheDocument();

    // Simulates the redirect to ?after=11, which recomputes suggested="12"
    // and — per app/admin/(dashboard)/trips/[id]/page.tsx — changes the key.
    rerender(<Harness panelKey="11" initialSeat="12" />);
    expect(seatInput()).toHaveValue('12');
    // ManualBookingForm's own `suggestedSeat` badge (useState(seat), same
    // staleness bug as the seat field) must also have refreshed: it only
    // renders when the current seat equals the value captured at mount, so
    // this only holds if the whole subtree — not just TripSeatPanel — remounted.
    expect(screen.getByText('Πρόταση: επόμενη ελεύθερη')).toBeInTheDocument();
  });

  it('does not clobber a clerk-typed seat on a re-render that keeps the same key', () => {
    const { rerender } = render(<Harness panelKey="first" initialSeat="11" />);
    fireEvent.change(seatInput(), { target: { value: '13' } });
    expect(seatInput()).toHaveValue('13');

    // Same key (e.g. an unrelated revalidatePath) — the panel must not remount,
    // so the clerk's manual entry must survive even though `initialSeat` changed.
    rerender(<Harness panelKey="first" initialSeat="99" />);
    expect(seatInput()).toHaveValue('13');
  });
});
