import Link from 'next/link';
import { getAdminAllFares, getAdminPatterns, getAdminRoutes, getAdminTrips } from '@/lib/queries/ticketing';
import { createExcursion } from '../ticketing-actions';
import { Button } from '@/components/ui/Button';
import { FlashBanner } from '@/components/admin/FlashBanner';
import { AdminCard, AdminPageHeader, Pill, adminInput } from '@/components/admin/ui';
import { AdminSearch } from '@/components/admin/AdminSearch';
import { searchNormalize } from '@/lib/filters';
import { formatCents, routeLabel } from '@/lib/ticketing';
import type { FareType } from '@/types/ticketing';

const GRID = 'grid grid-cols-[1fr_7rem_6rem_8rem_10rem_4rem] items-center gap-3';

/** Calendar date `days` after the given `YYYY-MM-DD`, anchored at noon UTC so DST never shifts the day. */
function addDays(ymd: string, days: number): string {
  const d = new Date(`${ymd}T12:00:00Z`);
  d.setUTCDate(d.getUTCDate() + days);
  return d.toISOString().slice(0, 10);
}

/** The active «Κανονικό» one-way price (falls back to the default fare). */
function kanonikoCents(fares: FareType[]): number {
  const active = fares.filter((f) => f.is_active);
  const k = active.find((f) => f.name.trim() === 'Κανονικό') ?? active.find((f) => f.is_default);
  return k?.price_oneway_cents ?? 0;
}

export default async function ExcursionsPage({
  searchParams,
}: {
  searchParams: Promise<{ saved?: string; error?: string; q?: string }>;
}) {
  const today = new Date().toLocaleDateString('en-CA', { timeZone: 'Europe/Athens' });
  const in30 = addDays(today, 30);
  const [allRoutes, patterns, trips, allFares, sp] = await Promise.all([
    getAdminRoutes(),
    getAdminPatterns(),
    getAdminTrips(today, in30),
    getAdminAllFares(),
    searchParams,
  ]);
  const q = sp.q;
  const routes = q
    ? allRoutes.filter((r) => searchNormalize(routeLabel(r)).includes(searchNormalize(q)))
    : allRoutes;

  // trips arrive ordered by departure_at asc → first per route is the next one
  const tripsByRoute = new Map<string, { count: number; next: string }>();
  for (const t of trips) {
    if (t.status !== 'scheduled') continue;
    const cur = tripsByRoute.get(t.route_id);
    if (cur) cur.count += 1;
    else tripsByRoute.set(t.route_id, { count: 1, next: t.service_date });
  }

  const weeklyByRoute = new Map<string, number>();
  for (const p of patterns) {
    if (!p.is_active || !p.route_id) continue;
    weeklyByRoute.set(p.route_id, (weeklyByRoute.get(p.route_id) ?? 0) + 1);
  }

  const faresByRoute = new Map<string, FareType[]>();
  for (const f of allFares) {
    const arr = faresByRoute.get(f.route_id) ?? [];
    arr.push(f);
    faresByRoute.set(f.route_id, arr);
  }

  return (
    <div className="max-w-5xl">
      <AdminPageHeader
        title="Εκδρομές & Πρόγραμμα"
        subtitle="Οι εκδρομές που πωλούνται online: στοιχεία, τιμές, πρόγραμμα και δρομολόγια — όλα σε μία σελίδα."
      />
      <FlashBanner saved={sp.saved} error={sp.error} />

      <div className="mb-4 flex">
        <AdminSearch action="/admin/excursions" placeholder="Αναζήτηση τίτλου εκδρομής…" defaultValue={q} />
      </div>

      <AdminCard className="mb-8 p-5">
        <h2 className="font-display text-lg font-semibold text-primary">Νέα εκδρομή</h2>
        <p className="mt-1 text-[13px] text-muted">Ξεκινήστε με τον τίτλο — τιμές, πρόγραμμα και σημεία συνάντησης προστίθενται μετά.</p>
        <form action={createExcursion} className="mt-4 flex flex-wrap items-center gap-3">
          <input
            name="title"
            required
            placeholder="Τίτλος εκδρομής (π.χ. Μονοήμερη Ναύπλιο)"
            className={`${adminInput} min-w-[16rem] flex-1`}
          />
          <Button type="submit">Δημιουργία</Button>
        </form>
      </AdminCard>

      <div className="overflow-x-auto rounded-lg border border-border bg-surface">
        <div className="min-w-[760px]">
          <div className={`${GRID} border-b border-border bg-background/50 px-4 py-3 font-sans text-[12px] uppercase tracking-[0.1em] text-muted`}>
            <div>Εκδρομή</div>
            <div>Κατάσταση</div>
            <div>Κανονικό</div>
            <div>Επόμενη</div>
            <div>Πρόγραμμα</div>
            <div className="text-right">—</div>
          </div>
          {routes.map((r) => {
            const sched = tripsByRoute.get(r.id);
            const weekly = weeklyByRoute.get(r.id) ?? 0;
            const cents = kanonikoCents(faresByRoute.get(r.id) ?? []);
            return (
              <div key={r.id} className={`${GRID} border-b border-border/60 px-4 py-3 last:border-0`}>
                <Link href={`/admin/excursions/${r.id}`} className="font-medium text-primary hover:underline">
                  {routeLabel(r)}
                </Link>
                <Pill tone={r.status === 'published' ? 'ok' : 'muted'}>
                  {r.status === 'published' ? 'Δημοσιευμένη' : 'Πρόχειρη'}
                </Pill>
                <span className="text-[14px] text-body">{cents > 0 ? formatCents(cents) : '—'}</span>
                <span className="text-[14px] text-muted">
                  {sched
                    ? new Date(`${sched.next}T12:00:00`).toLocaleDateString('el-GR', { day: '2-digit', month: '2-digit' })
                    : '—'}
                </span>
                <div className="text-[14px] text-muted">
                  <span className="text-body">{sched?.count ?? 0} δρομολόγια</span>
                  <span className="text-[12px]"> / 30ημ.</span>
                  {weekly > 0 && <p className="text-[12px]">{weekly} εβδομαδιαία προγράμματα</p>}
                </div>
                <div className="text-right">
                  <Link href={`/admin/excursions/${r.id}`} className="text-[13px] font-medium text-primary hover:underline">
                    Άνοιγμα →
                  </Link>
                </div>
              </div>
            );
          })}
          {routes.length === 0 && (
            <p className="px-4 py-6 text-[14px] text-muted">
              {q ? `Δεν βρέθηκαν αποτελέσματα για «${q}».` : 'Δεν υπάρχουν εκδρομές.'}
            </p>
          )}
        </div>
      </div>
    </div>
  );
}
