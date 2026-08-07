'use client';
import { useState, type ReactNode } from 'react';
import { AdminSeatMap } from '@/components/admin/AdminSeatMap';
import { ManualBookingForm } from '@/components/admin/ManualBookingForm';
import { takenSeatNumbers } from '@/lib/ticketing';
import type { AdminSeatClaim } from '@/lib/queries/ticketing';
import type { FareType, LayoutJson } from '@/types/ticketing';

/** True when a seat is currently unavailable — booked, blocked, or an
 *  unexpired hold. Shares its rule with AdminSeatMap and the trip page
 *  via `takenSeatNumbers` in lib/ticketing.ts. */
function isTaken(claims: AdminSeatClaim[], seat: string): boolean {
  return takenSeatNumbers(claims, Date.now()).includes(seat);
}

/** Shares seat selection between the live seat map and the phone-booking
 *  form. Typing a seat or clicking a free one on the map drives both the
 *  form field and the map's ring highlight. Clicking an already-taken seat
 *  (to inspect it / block-unblock) still highlights it on the map, but must
 *  not overwrite the form's seat field with a seat that can't be booked. */
export function TripSeatPanel({
  tripId,
  layout,
  claims,
  fares,
  initialSeat,
  seatsLeft,
  boardingPoints,
  children,
}: {
  tripId: string;
  layout: LayoutJson;
  claims: AdminSeatClaim[];
  fares: FareType[];
  initialSeat: string;
  seatsLeft: number;
  /** Σημεία επιβίβασης της διαδρομής — προαιρετικό πεδίο στην τηλεφωνική κράτηση. */
  boardingPoints: string[];
  /** The "Ρυθμίσεις δρομολογίου" form — a server-rendered element passed through
   *  unchanged so it can keep sharing the two-column grid with the booking
   *  form without itself becoming a client component. */
  children?: ReactNode;
}) {
  const [seat, setSeat] = useState(initialSeat ?? '');
  const [mapSelected, setMapSelected] = useState<string | null>(initialSeat || null);

  const handleMapSelect = (s: string | null) => {
    setMapSelected(s);
    if (s && !isTaken(claims, s)) setSeat(s);
  };

  const handleSeatChange = (v: string) => {
    setSeat(v);
    setMapSelected(v || null);
  };

  return (
    <>
      <div className="mt-8">
        <AdminSeatMap
          tripId={tripId}
          layout={layout}
          claims={claims}
          selected={mapSelected}
          onSelect={handleMapSelect}
        />
      </div>

      <div className="mt-10 grid gap-6 lg:grid-cols-2">
        {children}
        <ManualBookingForm
          tripId={tripId}
          fares={fares}
          seat={seat}
          onSeatChange={handleSeatChange}
          seatsLeft={seatsLeft}
          boardingPoints={boardingPoints}
        />
      </div>
    </>
  );
}
