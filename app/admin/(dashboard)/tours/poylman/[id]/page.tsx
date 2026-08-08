import Link from 'next/link';
import { notFound } from 'next/navigation';
import { createServerClient } from '@/lib/supabase/server';
import {
  getAdminLayouts,
  getAdminPatterns,
  getAdminRoute,
  getAdminRouteFares,
  getAdminTrips,
  getRouteLinkedTours,
  getTripsOccupancy,
  type AdminTrip,
} from '@/lib/queries/ticketing';
import {
  createTrip,
  deletePattern,
  deleteRoute,
  retireExcursion,
  upsertFareType,
  upsertPattern,
  upsertRoute,
} from '../../../ticketing-actions';
import { Button } from '@/components/ui/Button';
import { ConfirmForm } from '@/components/admin/ConfirmForm';
import { FlashBanner } from '@/components/admin/FlashBanner';
import { AdminCard, AdminPageHeader, Pill, adminInput, adminLabel } from '@/components/admin/ui';
import { routeLabel } from '@/lib/ticketing';
import { POYLMAN_LIST, poylmanHref } from '@/lib/admin-routes';
import { DURATION_UNITS, splitDuration } from '@/lib/duration';
import { cn } from '@/lib/utils';

const DAYS = [
  { d: 1, label: 'Δε' }, { d: 2, label: 'Τρ' }, { d: 3, label: 'Τε' },
  { d: 4, label: 'Πε' }, { d: 5, label: 'Πα' }, { d: 6, label: 'Σα' }, { d: 0, label: 'Κυ' },
];

const TABS = [
  { key: 'stoixeia', label: 'Στοιχεία' },
  { key: 'times', label: 'Τιμές' },
  { key: 'programma', label: 'Πρόγραμμα' },
  { key: 'dromologia', label: 'Δρομολόγια' },
] as const;
type TabKey = (typeof TABS)[number]['key'];

/** Calendar date `days` after the given `YYYY-MM-DD`, anchored at noon UTC so DST never shifts the day. */
function addDays(ymd: string, days: number): string {
  const d = new Date(`${ymd}T12:00:00Z`);
  d.setUTCDate(d.getUTCDate() + days);
  return d.toISOString().slice(0, 10);
}

export default async function ExcursionDetailPage({
  params,
  searchParams,
}: {
  params: Promise<{ id: string }>;
  searchParams: Promise<{ tab?: string; saved?: string; error?: string; created?: string }>;
}) {
  const { id } = await params;
  const sp = await searchParams;
  const tab: TabKey = TABS.find((t) => t.key === sp.tab)?.key ?? 'stoixeia';

  const route = await getAdminRoute(id);
  if (!route) notFound();

  const today = new Date().toLocaleDateString('en-CA', { timeZone: 'Europe/Athens' });
  const in30 = addDays(today, 30);

  const [fares, allPatterns, layouts, linkedTours] = await Promise.all([
    getAdminRouteFares(id),
    getAdminPatterns(),
    getAdminLayouts(),
    getRouteLinkedTours(id),
  ]);
  const patterns = allPatterns.filter((p) => p.route_id === id);

  let trips: AdminTrip[] = [];
  let occupancy = new Map<string, { taken: number }>();
  if (tab === 'dromologia') {
    // idempotent, admin-granted materialization so the tab lists every upcoming run
    const sb = await createServerClient();
    await sb.rpc('admin_materialize_range', { p_from: today, p_to: in30 });
    const all = await getAdminTrips(today, in30);
    trips = all.filter((t) => t.route_id === id);
    occupancy = await getTripsOccupancy(trips.map((t) => t.id));
  }

  const base = poylmanHref(id);
  // Τα λεπτά της βάσης εμφανίζονται στη μεγαλύτερη ακέραια μονάδα τους.
  const duration = splitDuration(route.duration_min);

  return (
    <div className="max-w-4xl">
      <AdminPageHeader title={routeLabel(route)} backHref={POYLMAN_LIST} backLabel="Εκδρομές" />

      <div className="mb-6 flex flex-wrap gap-2">
        {TABS.map((t) => (
          <Link
            key={t.key}
            href={`${base}?tab=${t.key}`}
            className={cn(
              'rounded-full px-4 py-1.5 text-[14px] font-medium transition-colors',
              t.key === tab ? 'bg-primary text-surface' : 'bg-background text-body hover:bg-primary/10'
            )}
          >
            {t.label}
          </Link>
        ))}
      </div>

      {sp.created === '1' && (
        <AdminCard className="mb-6 border-olive/40 bg-olive/5">
          <h2 className="font-display text-lg font-semibold text-primary">Η εκδρομή δημιουργήθηκε — επόμενα βήματα:</h2>
          <ol className="mt-3 list-decimal space-y-1 pl-5 text-[14px] text-body">
            <li>Ορίστε τιμές (καρτέλα <Link href={`${base}?tab=times`} className="underline">Τιμές</Link>).</li>
            <li>Βεβαιωθείτε ότι υπάρχει λεωφορείο (<Link href="/admin/layouts" className="underline">Λεωφορεία</Link>).</li>
            <li>Προσθέστε πρόγραμμα (καρτέλα <Link href={`${base}?tab=programma`} className="underline">Πρόγραμμα</Link>).</li>
          </ol>
        </AdminCard>
      )}

      <FlashBanner saved={sp.saved} error={sp.error} />

      {tab === 'stoixeia' && (
        <div className="space-y-8">
          <AdminCard className="border-primary/20 bg-primary/5">
            <h2 className="font-sans text-[15px] font-semibold text-primary">Σελίδα εκδρομής στο site</h2>
            {linkedTours.length > 0 ? (
              <ul className="mt-2 space-y-1 text-[14px] text-body">
                {linkedTours.map((t) => (
                  <li key={t.id}>
                    <Link href={`/admin/tours/${t.id}/edit`} className="font-semibold underline underline-offset-2 hover:text-cta">
                      {t.title}
                    </Link>{' '}
                    — στέλνει τους επισκέπτες της εδώ για κράτηση θέσης.
                  </li>
                ))}
              </ul>
            ) : (
              <p className="mt-2 text-[14px] text-muted">
                Καμία σελίδα του site δεν δείχνει σε αυτή την εκδρομή. Τη σύνδεση την ορίζετε από τη{' '}
                <Link href="/admin/tours" className="underline underline-offset-2 hover:text-cta">
                  σελίδα της εκδρομής
                </Link>
                , στο πεδίο «Σύνδεση με εκδρομή πούλμαν».
              </p>
            )}
          </AdminCard>

          <form action={upsertRoute} className="grid gap-4 rounded-lg border border-border bg-surface p-6 sm:grid-cols-2">
            <input type="hidden" name="id" value={route.id} />
            <input type="hidden" name="origin_station_id" value={route.origin_station_id} />
            <input type="hidden" name="destination_station_id" value={route.destination_station_id} />
            <input type="hidden" name="redirect_to" value={`${base}?tab=stoixeia`} />
            <label className={cn(adminLabel, 'sm:col-span-2')}>Τίτλος εκδρομής
              <input name="title" required defaultValue={route.title ?? ''} placeholder="π.χ. Μονοήμερη Ναύπλιο" className={adminInput} />
            </label>
            <label className={cn(adminLabel, 'sm:col-span-2')}>Σημεία συνάντησης (ένα ανά γραμμή)
              <textarea name="boarding_points" rows={3} defaultValue={(route.boarding_points ?? []).join('\n')} className={adminInput} />
            </label>
            <label className={adminLabel}>Κατάσταση
              <select name="status" defaultValue={route.status} className={adminInput}>
                <option value="published">Δημοσιευμένη</option>
                <option value="draft">Πρόχειρη</option>
              </select>
            </label>
            <label className={adminLabel}>Διάρκεια
              <div className="mt-1 flex gap-2">
                <input name="duration_min" type="number" min={0} defaultValue={duration.value} className={adminInput} />
                <select name="duration_unit" defaultValue={duration.unit} className={`${adminInput} w-32 shrink-0`}>
                  {DURATION_UNITS.map((u) => <option key={u.value} value={u.value}>{u.label}</option>)}
                </select>
              </div>
            </label>
            <label className={adminLabel}>Cutoff πώλησης (λεπτά)
              <input name="sales_cutoff_min" type="number" defaultValue={route.sales_cutoff_min ?? ''} placeholder="default" className={adminInput} />
            </label>
            <details className="sm:col-span-2">
              <summary className="cursor-pointer text-[13px] text-muted">Προχωρημένα</summary>
              <label className={cn(adminLabel, 'mt-3 max-w-[10rem]')}>Σειρά εμφάνισης
                <input name="position" type="number" defaultValue={route.position} className={adminInput} />
              </label>
            </details>
            <div className="sm:col-span-2"><Button type="submit">Αποθήκευση</Button></div>
          </form>

          <AdminCard className="border-cta/30">
            <h2 className="font-display text-lg font-semibold text-primary">Επικίνδυνη ζώνη</h2>
            <div className="mt-4 flex flex-wrap items-center gap-4">
              {route.status === 'published' && (
                <ConfirmForm
                  action={retireExcursion.bind(null, route.id)}
                  message="Απόσυρση εκδρομής; Θα γίνει Πρόχειρη και δεν θα πωλείται online μέχρι να τη δημοσιεύσετε ξανά."
                  title="Απόσυρση εκδρομής"
                  confirmLabel="Απόσυρση"
                  variant="default"
                >
                  <button type="button" className="rounded-md border border-border px-4 py-2 text-[14px] font-medium text-body hover:bg-background">
                    Απόσυρση (→ Πρόχειρη)
                  </button>
                </ConfirmForm>
              )}
              <ConfirmForm
                action={deleteRoute.bind(null, route.id)}
                message="Οριστική διαγραφή εκδρομής; Θα διαγραφούν τιμές και προγράμματα."
              >
                <button type="button" className="text-[14px] font-medium text-cta hover:underline">Διαγραφή εκδρομής</button>
              </ConfirmForm>
            </div>
            <p className="mt-3 text-[13px] text-muted">Εκδρομές με δρομολόγια δεν διαγράφονται — κάντε τις Πρόχειρες.</p>
          </AdminCard>
        </div>
      )}

      {tab === 'times' && (
        <div className="overflow-x-auto rounded-lg border border-border bg-surface">
          <div className="min-w-[560px]">
            <div className="grid grid-cols-[1fr_8rem_8rem] items-center gap-3 border-b border-border bg-background/50 px-4 py-3 font-sans text-[12px] uppercase tracking-[0.1em] text-muted">
              <div>Κατηγορία / Δικαιούχοι</div>
              <div>Τιμή (€)</div>
              <div className="text-right">—</div>
            </div>
            {fares.map((f) => {
              const formId = `fare-${f.id}`;
              return (
                <div key={f.id} className="grid grid-cols-[1fr_8rem_8rem] items-start gap-3 border-b border-border/60 px-4 py-3 last:border-0">
                  <form id={formId} action={upsertFareType} className="hidden">
                    <input type="hidden" name="id" value={f.id} />
                    <input type="hidden" name="route_id" value={route.id} />
                    <input type="hidden" name="name" value={f.name} />
                    <input type="hidden" name="position" value={f.position} />
                    <input type="hidden" name="price_round" value={(f.price_round_cents / 100).toFixed(2)} />
                    <input type="hidden" name="redirect_to" value={`${base}?tab=times`} />
                    {f.requires_document && <input type="hidden" name="requires_document" value="on" />}
                    {f.is_default && <input type="hidden" name="is_default" value="on" />}
                    {f.is_active && <input type="hidden" name="is_active" value="on" />}
                  </form>
                  <div>
                    <p className="font-medium text-primary">{f.name}</p>
                    <textarea
                      form={formId}
                      name="description"
                      defaultValue={f.description ?? ''}
                      rows={2}
                      placeholder="Δικαιούχοι / περιγραφή"
                      className={cn(adminInput, 'mt-2')}
                    />
                  </div>
                  <input
                    form={formId}
                    name="price_oneway"
                    type="number"
                    step="0.01"
                    min="0"
                    defaultValue={(f.price_oneway_cents / 100).toFixed(2)}
                    className={adminInput}
                  />
                  <div className="text-right">
                    <Button type="submit" form={formId} size="sm" variant="outline">Αποθήκευση</Button>
                  </div>
                </div>
              );
            })}
            {fares.length === 0 && <p className="px-4 py-6 text-[14px] text-muted">Δεν υπάρχουν κατηγορίες εισιτηρίων.</p>}
          </div>
        </div>
      )}

      {tab === 'programma' && (
        <div className="space-y-8">
          <div className="space-y-3">
            <h2 className="font-display text-lg font-semibold text-primary">Εβδομαδιαία προγράμματα</h2>
            {patterns.length === 0 && <p className="text-[14px] text-muted">Δεν υπάρχουν εβδομαδιαία προγράμματα ακόμη.</p>}
            {patterns.map((p) => (
              <div key={p.id} className="rounded-lg border border-border bg-surface p-4">
                <form action={upsertPattern} className="space-y-3">
                  <input type="hidden" name="id" value={p.id} />
                  <input type="hidden" name="route_id" value={route.id} />
                  <input type="hidden" name="redirect_to" value={`${base}?tab=programma`} />
                  <div className="flex flex-wrap items-end gap-3">
                    <label className={adminLabel}>Ώρα
                      <input type="time" name="departure_time" defaultValue={p.departure_time.slice(0, 5)} required className={cn(adminInput, 'w-32')} />
                    </label>
                    <label className={cn(adminLabel, 'min-w-[10rem] flex-1')}>Λεωφορείο
                      <select name="layout_id" defaultValue={p.layout_id} required className={adminInput}>
                        {layouts.map((l) => <option key={l.id} value={l.id}>{l.name}</option>)}
                      </select>
                    </label>
                    <label className="flex items-center gap-2 pb-2 text-[14px] text-body">
                      <input type="checkbox" name="is_active" defaultChecked={p.is_active} className="h-4 w-4" /> Ενεργό
                    </label>
                  </div>
                  <div className="flex flex-wrap gap-2">
                    {DAYS.map(({ d, label }) => (
                      <label key={d} className="flex items-center gap-1.5 rounded-md border border-border px-2.5 py-1.5 text-[13px]">
                        <input type="checkbox" name={`wd_${d}`} defaultChecked={p.weekdays.includes(d)} className="h-4 w-4" /> {label}
                      </label>
                    ))}
                  </div>
                  <div className="flex flex-wrap items-end gap-3">
                    <label className={adminLabel}>Από
                      <input type="date" name="valid_from" defaultValue={p.valid_from} required className={adminInput} />
                    </label>
                    <label className={adminLabel}>Έως (προαιρετικό)
                      <input type="date" name="valid_to" defaultValue={p.valid_to ?? ''} className={adminInput} />
                    </label>
                    <Button type="submit" size="sm" variant="outline">Αποθήκευση</Button>
                  </div>
                </form>
                <div className="mt-3 border-t border-border/60 pt-3">
                  <ConfirmForm
                    action={deletePattern.bind(null, p.id, `${base}?tab=programma`)}
                    message="Διαγραφή προγράμματος; Τα ήδη δημιουργημένα δρομολόγια παραμένουν."
                  >
                    <button type="button" className="text-[13px] text-cta hover:underline">Διαγραφή προγράμματος</button>
                  </ConfirmForm>
                </div>
              </div>
            ))}
          </div>

          <AdminCard>
            <h3 className="font-display text-lg font-semibold text-primary">Νέο εβδομαδιαίο πρόγραμμα</h3>
            {layouts.length === 0 ? (
              <p className="mt-3 text-[14px] text-muted">Δημιουργήστε πρώτα ένα <Link href="/admin/layouts" className="underline">λεωφορείο</Link>.</p>
            ) : (
              <form action={upsertPattern} className="mt-4 grid gap-4">
                <input type="hidden" name="route_id" value={route.id} />
                <input type="hidden" name="redirect_to" value={`${base}?tab=programma`} />
                <input type="hidden" name="is_active" value="on" />
                <div className="grid gap-4 sm:grid-cols-2">
                  <label className={adminLabel}>Λεωφορείο
                    <select name="layout_id" required className={adminInput}>
                      <option value="">— Επιλέξτε —</option>
                      {layouts.map((l) => <option key={l.id} value={l.id}>{l.name}</option>)}
                    </select>
                  </label>
                  <label className={adminLabel}>Ώρα αναχώρησης
                    <input type="time" name="departure_time" required className={adminInput} />
                  </label>
                  <label className={adminLabel}>Ισχύει από
                    <input type="date" name="valid_from" defaultValue={today} required className={adminInput} />
                  </label>
                  <label className={adminLabel}>Έως (προαιρετικό)
                    <input type="date" name="valid_to" className={adminInput} />
                  </label>
                </div>
                <div className="flex flex-wrap gap-2">
                  {DAYS.map(({ d, label }) => (
                    <label key={d} className="flex items-center gap-1.5 rounded-md border border-border px-2.5 py-1.5 text-[13px]">
                      <input type="checkbox" name={`wd_${d}`} className="h-4 w-4" /> {label}
                    </label>
                  ))}
                </div>
                <div><Button type="submit">Προσθήκη προγράμματος</Button></div>
              </form>
            )}
          </AdminCard>

          <AdminCard>
            <h3 className="font-display text-lg font-semibold text-primary">Έκτακτη ημερομηνία (μία μέρα)</h3>
            {layouts.length === 0 ? (
              <p className="mt-3 text-[14px] text-muted">Δημιουργήστε πρώτα ένα <Link href="/admin/layouts" className="underline">λεωφορείο</Link>.</p>
            ) : (
              <form action={createTrip} className="mt-4 grid gap-3 sm:grid-cols-[1fr_10rem_8rem_auto] sm:items-end">
                <input type="hidden" name="route_id" value={route.id} />
                <input type="hidden" name="redirect_to" value={`${base}?tab=programma`} />
                <label className={adminLabel}>Λεωφορείο
                  <select name="layout_id" required className={adminInput}>
                    <option value="">— Επιλέξτε —</option>
                    {layouts.map((l) => <option key={l.id} value={l.id}>{l.name}</option>)}
                  </select>
                </label>
                <label className={adminLabel}>Ημερομηνία
                  <input type="date" name="service_date" required className={adminInput} />
                </label>
                <label className={adminLabel}>Ώρα
                  <input type="time" name="departure_time" required className={adminInput} />
                </label>
                <div><Button type="submit" variant="outline">Προσθήκη</Button></div>
              </form>
            )}
          </AdminCard>
        </div>
      )}

      {tab === 'dromologia' && (
        <div>
          <p className="mb-3 text-[13px] text-muted">Επερχόμενα δρομολόγια των επόμενων 30 ημερών (δημιουργούνται αυτόματα από το πρόγραμμα).</p>
          <div className="overflow-x-auto rounded-lg border border-border bg-surface">
            <div className="min-w-[640px]">
              <div className="grid grid-cols-[12rem_1fr_7rem_6rem_5rem] items-center gap-3 border-b border-border bg-background/50 px-4 py-3 font-sans text-[12px] uppercase tracking-[0.1em] text-muted">
                <div>Ημ/νία & ώρα</div>
                <div>Λεωφορείο</div>
                <div>Κατάσταση</div>
                <div>Θέσεις</div>
                <div className="text-right">—</div>
              </div>
              {trips.map((t) => {
                const taken = occupancy.get(t.id)?.taken ?? 0;
                return (
                  <div key={t.id} className="grid grid-cols-[12rem_1fr_7rem_6rem_5rem] items-center gap-3 border-b border-border/60 px-4 py-2.5 last:border-0">
                    <span className="text-[14px] text-body">
                      {new Date(`${t.service_date}T12:00:00`).toLocaleDateString('el-GR', { weekday: 'short', day: '2-digit', month: '2-digit' })}
                      {' · '}
                      {new Date(t.departure_at).toLocaleTimeString('el-GR', { hour: '2-digit', minute: '2-digit', timeZone: 'Europe/Athens' })}
                    </span>
                    <span className="text-[14px] text-muted">{t.layout?.name ?? '—'}</span>
                    <Pill tone={t.status === 'scheduled' ? 'ok' : 'danger'}>{t.status === 'scheduled' ? 'Ενεργό' : 'Ακυρωμένο'}</Pill>
                    <span className="text-[14px] text-body">{taken}/{t.online_seats_total}</span>
                    <div className="text-right">
                      <Link href={`/admin/trips/${t.id}`} className="text-[13px] font-medium text-primary hover:underline">Θέσεις →</Link>
                    </div>
                  </div>
                );
              })}
              {trips.length === 0 && (
                <p className="px-4 py-6 text-[14px] text-muted">Δεν υπάρχουν επερχόμενα δρομολόγια. Προσθέστε πρόγραμμα ή έκτακτη ημερομηνία στην καρτέλα «Πρόγραμμα».</p>
              )}
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
