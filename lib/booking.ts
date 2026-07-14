/** Informational booking total: seats × per-person price, rounded to cents. */
export function computeBookingTotal(seats: string, pricePerSeat: number | null | undefined): number | null {
  if (!pricePerSeat || !/^\d+$/.test(seats)) return null;
  const n = Number(seats);
  if (n < 1) return null;
  return Math.round(n * pricePerSeat * 100) / 100;
}
