import type { TourDeparture, TourOrderItem, TourPriceTier } from '@/types/db';

/** "170,00 €" — one money formatter for the whole site. */
export { formatCents } from '@/lib/ticketing';

/** Informational booking total: seats × per-person price, rounded to cents. */
export function computeBookingTotal(seats: string, pricePerSeat: number | null | undefined): number | null {
  if (!pricePerSeat || !/^\d+$/.test(seats)) return null;
  const n = Number(seats);
  if (n < 1) return null;
  return Math.round(n * pricePerSeat * 100) / 100;
}

/** Admin input («170», «170,50», «1.250,00 €») → integer cents. Null when empty
 *  or unparseable, so the caller can keep the field optional. */
export function parseEuroToCents(input: string | null | undefined): number | null {
  if (input == null) return null;
  const cleaned = String(input).replace(/[^0-9.,-]/g, '').trim();
  if (!cleaned) return null;
  // Greek input uses ',' as the decimal separator and '.' for thousands.
  const lastComma = cleaned.lastIndexOf(',');
  const lastDot = cleaned.lastIndexOf('.');
  let normalized: string;
  if (lastComma > lastDot) normalized = cleaned.replace(/\./g, '').replace(',', '.');
  else if (lastDot > lastComma) normalized = cleaned.replace(/,/g, '');
  else normalized = cleaned;
  const n = Number(normalized);
  if (!Number.isFinite(n) || n < 0) return null;
  return Math.round(n * 100);
}

/** Integer cents → the plain number an admin edits ("170.5"). */
export function centsToEuroInput(cents: number | null | undefined): string {
  if (cents == null) return '';
  return (cents / 100).toFixed(2);
}

/** Keep a widget quantity inside 0…tier.max_qty; anything unparseable is 0. */
export function clampQty(value: number | string, maxQty: number): number {
  const n = typeof value === 'number' ? value : Number(String(value).trim());
  if (!Number.isFinite(n) || n <= 0) return 0;
  return Math.min(Math.floor(n), Math.max(1, maxQty));
}

/** Order lines for the chosen quantities, in tier order. Zero-qty tiers drop out.
 *  Mirrors create_tour_order in SQL — the server re-prices, this is the preview. */
export function buildOrderItems(tiers: TourPriceTier[], qty: Record<string, number>): TourOrderItem[] {
  return tiers
    .map((t) => ({ tier: t, n: clampQty(qty[t.id] ?? 0, t.max_qty) }))
    .filter(({ n }) => n > 0)
    .map(({ tier, n }) => ({
      tier_id: tier.id,
      label: tier.label,
      unit_cents: tier.price_cents,
      qty: n,
      line_cents: tier.price_cents * n,
    }));
}

export function itemsTotalCents(items: TourOrderItem[]): number {
  return items.reduce((sum, i) => sum + i.line_cents, 0);
}

export function itemsPartySize(items: TourOrderItem[]): number {
  return items.reduce((sum, i) => sum + i.qty, 0);
}

/** The headline price of a tour page: the cheapest active tier, with its
 *  «πριν» price when one is set and actually higher. */
export function headlinePrice(tiers: TourPriceTier[]): { cents: number; originalCents: number | null } | null {
  const active = tiers.filter((t) => t.is_active);
  if (active.length === 0) return null;
  const cheapest = active.reduce((min, t) => (t.price_cents < min.price_cents ? t : min), active[0]);
  const original =
    cheapest.price_original_cents != null && cheapest.price_original_cents > cheapest.price_cents
      ? cheapest.price_original_cents
      : null;
  return { cents: cheapest.price_cents, originalCents: original };
}

/** Δέχεται κρατήσεις: έχει ενεργές κατηγορίες τιμών ΚΑΙ το γραφείο δεν την έχει κλείσει.
 *  `bookings_open` λείπει (undefined) μόνο σε παλιές seed γραμμές — αντιμετωπίζεται ως ανοιχτή. */
export function isBookable(tour: { bookings_open?: boolean }, activeTiers: unknown[]): boolean {
  return activeTiers.length > 0 && tour.bookings_open !== false;
}

/** Departures a customer may still pick: active and not in the past.
 *  `today` is an ISO 'YYYY-MM-DD' so callers stay timezone-explicit. */
export function bookableDepartures(departures: TourDeparture[], today: string): TourDeparture[] {
  return departures
    .filter((d) => d.is_active && d.starts_on >= today)
    .sort((a, b) => a.starts_on.localeCompare(b.starts_on));
}

/** «Σάβ, 12 Ιουλ 2026» — the label of a departure in the date picker. */
export function departureLabel(d: Pick<TourDeparture, 'starts_on' | 'ends_on' | 'note'>): string {
  const fmt = (iso: string) =>
    new Date(`${iso}T12:00:00`).toLocaleDateString('el-GR', { day: '2-digit', month: 'short', year: 'numeric' });
  const range = d.ends_on && d.ends_on !== d.starts_on ? `${fmt(d.starts_on)} – ${fmt(d.ends_on)}` : fmt(d.starts_on);
  return d.note ? `${range} · ${d.note}` : range;
}
