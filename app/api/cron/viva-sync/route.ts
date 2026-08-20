import { NextResponse } from 'next/server';
import { recentAthensDates, syncVivaTransactions } from '@/lib/viva-sync';

/** Reconciliation συναλλαγών Viva (vercel.json cron, κάθε 15′): σαρώνει
 *  σήμερα+χθες και πιάνει ό,τι έχασε το webhook — POS/link χρεώσεις αλλά και
 *  site παραγγελίες που έμειναν απλήρωτες ενώ ο πελάτης χρεώθηκε. Με ?days=N
 *  (έως 90) γίνεται και backfill ιστορικού. Ο Vercel στέλνει αυτόματα το
 *  Authorization: Bearer CRON_SECRET στα cron requests. */
export async function GET(req: Request) {
  const secret = process.env.CRON_SECRET;
  if (!secret || req.headers.get('authorization') !== `Bearer ${secret}`) {
    return NextResponse.json({ ok: false }, { status: 401 });
  }
  const daysParam = Number(new URL(req.url).searchParams.get('days'));
  const days = Math.min(90, Math.max(2, Number.isFinite(daysParam) ? daysParam : 2));
  const result = await syncVivaTransactions(recentAthensDates(days));
  if (result.errors.length) console.error('viva-sync cron:', result.errors.join(' | '));
  return NextResponse.json({ ok: result.errors.length === 0, ...result });
}
