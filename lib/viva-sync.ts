// Συγχρονισμός συναλλαγών Viva → viva_transactions, ώστε το admin να βλέπει
// ΚΑΘΕ χρέωση (site, POS, payment links) σε ένα μέρος. Τρέχει από το webhook
// (μία συναλλαγή, real-time), από το cron /api/cron/viva-sync (σήμερα+χθες,
// reconciliation) και από το κουμπί «Συγχρονισμός» του admin. Όλα καταλήγουν
// σε idempotent upsert πάνω στο transaction_id — δεύτερο πέρασμα δεν
// διπλογράφει και δεν ξαναστέλνει email.
import type { SupabaseClient } from '@supabase/supabase-js';
import { athensToday } from '@/lib/athens-time';
import { createServiceClient } from '@/lib/supabase/server';
import { flagPaymentAmountMismatch, looksLikeOrderId } from '@/lib/payments/confirm';
import {
  getVivaTransactionLegacy,
  listVivaTransactions,
  normalizeVivaTransaction,
  type VivaTransactionRow,
} from '@/lib/payments/viva-report';

export type SyncResult = { upserted: number; confirmed: number; errors: string[] };

/** Οι τελευταίες n ημερολογιακές ημέρες (ώρα Ελλάδας), σήμερα πρώτα — το
 *  legacy API της Viva δουλεύει με ημέρα-ημέρα ερωτήματα. */
export function recentAthensDates(n: number, now: Date = new Date()): string[] {
  const today = athensToday(now);
  const noonUtc = new Date(`${today}T12:00:00Z`);
  return Array.from({ length: n }, (_, i) => {
    const d = new Date(noonUtc.getTime() - i * 86_400_000);
    return d.toISOString().slice(0, 10);
  });
}

type MatchedOrder = { family: 'tour' | 'ticket'; id: string; status: string; access_token: string };

async function findOrder(sb: SupabaseClient, orderId: string): Promise<MatchedOrder | null> {
  const { data: ticket } = await sb
    .from('ticket_orders')
    .select('id, status, access_token')
    .eq('id', orderId)
    .maybeSingle();
  if (ticket) return { family: 'ticket', ...ticket } as MatchedOrder;
  const { data: tour } = await sb
    .from('tour_orders')
    .select('id, status, access_token')
    .eq('id', orderId)
    .maybeSingle();
  if (tour) return { family: 'tour', ...tour } as MatchedOrder;
  return null;
}

/** Γράφει/ενημερώνει μία συναλλαγή και, όταν αντιστοιχεί σε δική μας
 *  παραγγελία, συμπληρώνει τη μέθοδο πληρωμής πάνω της. Δίχτυ ασφαλείας: αν η
 *  συναλλαγή είναι επιτυχής (F) και η παραγγελία έμεινε απλήρωτη (χάθηκαν και
 *  webhook και return), την επιβεβαιώνει με τα υπάρχοντα idempotent RPCs και
 *  στέλνει τα email — καμία πληρωμή του site δεν μένει πίσω. */
export async function upsertVivaTransaction(
  sb: SupabaseClient,
  row: VivaTransactionRow
): Promise<{ confirmedNow: boolean }> {
  let order: MatchedOrder | null = null;
  if (looksLikeOrderId(row.merchant_trns)) {
    order = await findOrder(sb, row.merchant_trns);
  }

  const { error } = await sb.from('viva_transactions').upsert(
    {
      ...row,
      order_family: order?.family ?? null,
      order_id: order?.id ?? null,
    },
    { onConflict: 'transaction_id' }
  );
  if (error) throw new Error(`viva_transactions upsert: ${error.message}`);

  if (!order) return { confirmedNow: false };

  const table = order.family === 'tour' ? 'tour_orders' : 'ticket_orders';
  const { error: methodErr } = await sb
    .from(table)
    .update({ payment_method: row.payment_method })
    .eq('id', order.id)
    .is('payment_method', null);
  if (methodErr) console.error('payment_method update:', methodErr.message);

  // Επιβεβαίωση μόνο για ολοκληρωμένες συναλλαγές σε παραγγελίες που ακόμα
  // περιμένουν — ό,τι άλλο (cancelled, expired, offline, paid) δεν αγγίζεται.
  if (row.status !== 'F' || !['pending', 'awaiting_payment'].includes(order.status)) {
    return { confirmedNow: false };
  }

  const rpc = order.family === 'tour' ? 'confirm_tour_order_paid' : 'confirm_order_paid';
  const { data, error: rpcErr } = await sb.rpc(rpc, {
    p_order_id: order.id,
    p_provider: 'viva',
    p_ref: row.order_code,
  });
  if (rpcErr) {
    console.error(`viva-sync ${rpc}:`, rpcErr.message);
    return { confirmedNow: false };
  }
  const res = data as { ok: boolean; already_paid?: boolean };
  if (!res.ok || res.already_paid) return { confirmedNow: false };

  await flagPaymentAmountMismatch(sb, order.family, order.id, row.amount_cents);
  try {
    if (order.family === 'tour') {
      const { notifyTourOrder } = await import('@/lib/tour-notify');
      await notifyTourOrder(order.access_token);
    } else {
      const { notifyTicketOrder } = await import('@/lib/ticket-notify');
      await notifyTicketOrder(order.access_token);
    }
  } catch (e) {
    console.error('viva-sync notify:', e);
  }
  return { confirmedNow: true };
}

/** Συγχρονισμός ολόκληρων ημερών από το legacy Transactions API. */
export async function syncVivaTransactions(dates: string[]): Promise<SyncResult> {
  const sb = createServiceClient();
  const result: SyncResult = { upserted: 0, confirmed: 0, errors: [] };
  for (const date of dates) {
    let raws: Record<string, unknown>[];
    try {
      raws = await listVivaTransactions(date);
    } catch (e) {
      result.errors.push(`${date}: ${e instanceof Error ? e.message : String(e)}`);
      continue;
    }
    for (const raw of raws) {
      const row = normalizeVivaTransaction(raw);
      if (!row) continue;
      try {
        const { confirmedNow } = await upsertVivaTransaction(sb, row);
        result.upserted++;
        if (confirmedNow) result.confirmed++;
      } catch (e) {
        result.errors.push(`${row.transaction_id}: ${e instanceof Error ? e.message : String(e)}`);
      }
    }
  }
  return result;
}

/** Καταγραφή μίας συναλλαγής από το webhook. Δοκιμάζει πρώτα το checkout v2
 *  (site πληρωμές), μετά το legacy API (POS/links). Σιωπηλά best-effort — το
 *  cron θα την ξαναβρεί ούτως ή άλλως. */
export async function recordVivaTransactionById(
  transactionId: string,
  fetchCheckoutTransaction: (id: string) => Promise<Record<string, unknown> | null>
): Promise<void> {
  let raw = await fetchCheckoutTransaction(transactionId).catch(() => null);
  if (!raw) raw = await getVivaTransactionLegacy(transactionId).catch(() => null);
  if (!raw) return;
  if (!('TransactionId' in raw) && !('transactionId' in raw)) {
    (raw as Record<string, unknown>).transactionId = transactionId;
  }
  const row = normalizeVivaTransaction(raw);
  if (!row) return;
  await upsertVivaTransaction(createServiceClient(), row);
}
