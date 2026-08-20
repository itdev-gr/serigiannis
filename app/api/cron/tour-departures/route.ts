import { NextResponse } from 'next/server';
import { createServiceClient } from '@/lib/supabase/server';
import { athensToday } from '@/lib/athens-time';
import { TOUR_PATTERN_HORIZON_DAYS } from '@/lib/tour-patterns';

/** Καθημερινό cron (vercel.json): κρατά γεμάτο τον ορίζοντα ημερομηνιών των
 *  εκδρομών με εβδομαδιαίο πρόγραμμα, ώστε το σύστημα να μη «στερεύει» ποτέ
 *  ακόμα κι αν κανείς δεν ανοίξει το admin. Idempotent — γεννά μόνο ό,τι
 *  λείπει (on conflict do nothing στη materialize_tour_departures). */
export async function GET(req: Request) {
  const secret = process.env.CRON_SECRET;
  if (!secret || req.headers.get('authorization') !== `Bearer ${secret}`) {
    return NextResponse.json({ ok: false }, { status: 401 });
  }

  const sb = createServiceClient();
  const { data: tours, error } = await sb
    .from('tour_departure_patterns')
    .select('tour_id')
    .eq('is_active', true);
  if (error) {
    console.error('tour-departures cron list:', error.message);
    return NextResponse.json({ ok: false }, { status: 500 });
  }

  const today = athensToday();
  const until = new Date(new Date(`${today}T12:00:00Z`).getTime() + TOUR_PATTERN_HORIZON_DAYS * 86_400_000)
    .toISOString()
    .slice(0, 10);

  let generated = 0;
  const errors: string[] = [];
  for (const tourId of [...new Set((tours ?? []).map((t) => t.tour_id as string))]) {
    const { data, error: rpcErr } = await sb.rpc('materialize_tour_departures', {
      p_tour_id: tourId,
      p_from: today,
      p_to: until,
    });
    if (rpcErr) errors.push(`${tourId}: ${rpcErr.message}`);
    else generated += (data as number) ?? 0;
  }
  if (errors.length) console.error('tour-departures cron:', errors.join(' | '));
  return NextResponse.json({ ok: errors.length === 0, generated, tours: (tours ?? []).length });
}
