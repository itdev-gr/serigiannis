import type { SupabaseClient } from '@supabase/supabase-js';
import { paymentAmountNote } from './amount';

/** Οι δύο οικογένειες παραγγελιών που περνούν από την ίδια πύλη. */
export type OrderFamily = 'tour' | 'ticket';

const TABLE: Record<OrderFamily, string> = {
  tour: 'tour_orders',
  ticket: 'ticket_orders',
};

/** Οι κωδικοί που το merchantTrns της πύλης δίνει πίσω είναι ελεύθερο κείμενο.
 *  Ό,τι δεν είναι uuid δεν είναι δική μας παραγγελία — σταματάμε πριν φτάσει σε
 *  ερώτημα με στήλη uuid, που θα έριχνε σφάλμα και θα ζητούσε επανάληψη για πάντα. */
export function looksLikeOrderId(value: string | null | undefined): value is string {
  return typeof value === 'string' && /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i.test(value);
}

/** Συγκρίνει το ποσό που χρέωσε η πύλη με το σύνολο της κράτησης και, σε
 *  ασυμφωνία, γράφει σημείωση στην κράτηση ώστε να τη δει ο υπάλληλος.
 *  Δεν ακυρώνει ποτέ πληρωμή και δεν ρίχνει: η καταγραφή της πληρωμής έχει
 *  προτεραιότητα, ο έλεγχος είναι δεύτερη γραμμή άμυνας. */
export async function flagPaymentAmountMismatch(
  sb: SupabaseClient,
  family: OrderFamily,
  orderId: string,
  paidCents: number | null | undefined
): Promise<void> {
  if (paidCents == null) return;
  const table = TABLE[family];
  const { data, error } = await sb
    .from(table)
    .select('amount_total_cents, admin_notes')
    .eq('id', orderId)
    .maybeSingle();
  if (error || !data) {
    if (error) console.error('flagPaymentAmountMismatch read:', error.message);
    return;
  }
  const row = data as { amount_total_cents: number; admin_notes: string | null };
  const note = paymentAmountNote(row.amount_total_cents, paidCents);
  if (!note) return;

  console.error(
    `payment amount mismatch (${family} ${orderId}): charged ${paidCents}, order total ${row.amount_total_cents}`
  );
  const { error: upErr } = await sb
    .from(table)
    .update({ admin_notes: row.admin_notes ? `${row.admin_notes}\n${note}` : note })
    .eq('id', orderId);
  if (upErr) console.error('flagPaymentAmountMismatch write:', upErr.message);
}
