import { createServerClient, isDbConfigured } from '@/lib/supabase/server';

/** Γραμμή του μητρώου συναλλαγών Viva όπως τη δείχνει το admin. */
export type AdminVivaTransaction = {
  transaction_id: string;
  order_code: string | null;
  amount_cents: number;
  status: string;
  source_code: string | null;
  terminal_id: number | null;
  bank_id: string | null;
  card_number: string | null;
  card_type: string | null;
  issuing_bank: string | null;
  receipt_ref: string | null;
  payment_method: string;
  customer_trns: string | null;
  merchant_trns: string | null;
  full_name: string | null;
  email: string | null;
  /** Χειροκίνητα στοιχεία του γραφείου (0037) — κυρίως για χρεώσεις POS. */
  office_name: string | null;
  office_email: string | null;
  office_phone: string | null;
  occurred_at: string;
  order_family: 'tour' | 'ticket' | null;
  order_id: string | null;
};

/** Συναλλαγές για τη σελίδα «Πληρωμές» (RLS: μόνο admin), νεότερες πρώτα. */
export async function getAdminVivaTransactions(): Promise<AdminVivaTransaction[]> {
  if (!isDbConfigured()) return [];
  const sb = await createServerClient();
  const { data, error } = await sb
    .from('viva_transactions')
    .select(
      'transaction_id, order_code, amount_cents, status, source_code, terminal_id, bank_id, card_number, card_type, issuing_bank, receipt_ref, payment_method, customer_trns, merchant_trns, full_name, email, office_name, office_email, office_phone, occurred_at, order_family, order_id'
    )
    .order('occurred_at', { ascending: false })
    .limit(500);
  if (error) {
    console.error('getAdminVivaTransactions:', error.message);
    return [];
  }
  return (data ?? []) as AdminVivaTransaction[];
}
