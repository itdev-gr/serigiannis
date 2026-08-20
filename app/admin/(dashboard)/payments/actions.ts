'use server';

import { revalidatePath } from 'next/cache';
import { createServerClient } from '@/lib/supabase/server';
import { recentAthensDates, syncVivaTransactions } from '@/lib/viva-sync';

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
