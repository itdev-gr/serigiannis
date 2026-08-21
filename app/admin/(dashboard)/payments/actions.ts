'use server';

import { revalidatePath } from 'next/cache';
import { redirect } from 'next/navigation';
import { createServerClient } from '@/lib/supabase/server';
import { recentAthensDates, syncVivaTransactions } from '@/lib/viva-sync';

/** Χειροκίνητα στοιχεία πελάτη πάνω σε συναλλαγή (κυρίως POS, όπου η Viva δεν
 *  δίνει τίποτα). Γράφει τα office_* πεδία με τη σύνοδο του admin (RLS
 *  is_admin) — ο αυτόματος συγχρονισμός δεν τα αγγίζει ποτέ. */
export async function saveVivaTransactionContact(transactionId: string, formData: FormData) {
  const clean = (k: string) => {
    const v = String(formData.get(k) ?? '').trim();
    return v === '' ? null : v;
  };
  const sb = await createServerClient();
  const { error } = await sb
    .from('viva_transactions')
    .update({
      office_name: clean('office_name'),
      office_email: clean('office_email'),
      office_phone: clean('office_phone'),
    })
    .eq('transaction_id', transactionId);
  if (error) console.error('saveVivaTransactionContact:', error.message);
  revalidatePath('/admin/payments');
  const back = String(formData.get('back') ?? '/admin/payments');
  redirect(back.startsWith('/admin/payments') ? back : '/admin/payments');
}

/** Χειροκίνητος συγχρονισμός των τελευταίων 7 ημερών από το κουμπί της
 *  σελίδας «Πληρωμές». Ο συγχρονισμός γράφει με service ρόλο, οπότε πρώτα
 *  ρητός έλεγχος ότι ο συνδεδεμένος χρήστης είναι admin — δεν αρκεί το RLS. */
export async function syncRecentVivaTransactions(): Promise<void> {
  const sb = await createServerClient();
  const { data } = await sb.auth.getUser();
  const role = (data.user?.app_metadata as { role?: string } | undefined)?.role;
  if (role !== 'admin') return;

  const result = await syncVivaTransactions(recentAthensDates(7));
  if (result.errors.length) console.error('viva manual sync:', result.errors.join(' | '));
  revalidatePath('/admin/payments');
}
