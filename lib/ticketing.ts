import type { LayoutJson, TripKind } from '@/types/ticketing';

/** "50,00 €" — Greek formatting for integer cents. */
export function formatCents(cents: number): string {
  return `${(cents / 100).toLocaleString('el-GR', { minimumFractionDigits: 2, maximumFractionDigits: 2 })} €`;
}

/** Split a round-trip fare across the two legs (matches finalize_checkout). */
export function splitRoundPrice(roundCents: number): { outbound: number; ret: number } {
  const outbound = Math.ceil(roundCents / 2);
  return { outbound, ret: roundCents - outbound };
}

/** Price of one passenger for a fare under the given trip kind. */
export function farePriceForKind(
  fare: { price_oneway_cents: number; price_round_cents: number },
  kind: TripKind
): number {
  return kind === 'oneway' ? fare.price_oneway_cents : fare.price_round_cents;
}

/** All sellable-online seat labels of a layout (mirrors SQL layout_seats). */
export function layoutOnlineSeats(layout: LayoutJson): string[] {
  return layout.decks.flatMap((d) =>
    d.cells.filter((c) => c.type === 'seat' && c.seat && c.online !== false).map((c) => c.seat as string)
  );
}

/** All seat labels (including offline-only) of a layout. */
export function layoutAllSeats(layout: LayoutJson): string[] {
  return layout.decks.flatMap((d) =>
    d.cells.filter((c) => c.type === 'seat' && c.seat).map((c) => c.seat as string)
  );
}

export const KIND_LABEL: Record<TripKind, string> = {
  oneway: 'Απλή Μετάβαση',
  round: 'Με Επιστροφή',
  open_return: 'Ανοιχτή Επιστροφή',
};

export const ORDER_STATUS_LABEL: Record<string, string> = {
  pending: 'Σε εξέλιξη',
  awaiting_payment: 'Αναμονή πληρωμής',
  paid: 'Πληρωμένη',
  offline: 'Πληρωμή στο γραφείο',
  cancelled: 'Ακυρωμένη',
  expired: 'Έληξε',
};

export const TICKET_STATUS_LABEL: Record<string, string> = {
  valid: 'Έγκυρο',
  used: 'Χρησιμοποιημένο',
  cancelled: 'Ακυρωμένο',
};
