'use client';
import { useState, useTransition } from 'react';
import { DoorOpen, User } from 'lucide-react';
import { cn } from '@/lib/utils';
import { blockSeat, unblockSeat } from '@/app/admin/(dashboard)/ticketing-actions';
import type { AdminSeatClaim } from '@/lib/queries/ticketing';
import type { LayoutJson } from '@/types/ticketing';

/** Live seat dashboard for one trip: green=free, blue=booked, amber=hold,
 *  dark=blocked. Click a seat to block/unblock it. */
export function AdminSeatMap({ tripId, layout, claims }: { tripId: string; layout: LayoutJson; claims: AdminSeatClaim[] }) {
  const [selected, setSelected] = useState<string | null>(null);
  const [pending, startTransition] = useTransition();

  const claimBySeat = new Map(claims.map((c) => [c.seat_no, c]));
  const activeClaim = (seat: string) => {
    const c = claimBySeat.get(seat);
    if (!c) return null;
    if (c.claim_type === 'hold' && c.expires_at && new Date(c.expires_at).getTime() <= Date.now()) return null;
    return c;
  };
  const sel = selected ? activeClaim(selected) : null;

  return (
    <div className="grid gap-6 lg:grid-cols-[1fr_280px]">
      <div className="space-y-6">
        {layout.decks.map((deck) => (
          <div key={deck.name}>
            {layout.decks.length > 1 && (
              <p className="mb-2 text-center text-[13px] font-semibold uppercase tracking-[0.12em] text-muted">{deck.name}</p>
            )}
            <div className="mx-auto w-fit rounded-2xl border-2 border-border bg-background/70 p-3">
              <div className="grid gap-1.5" style={{ gridTemplateColumns: `repeat(${deck.cols}, 2.6rem)` }}>
                {deck.cells.map((cell, i) => {
                  const style = { gridRowStart: cell.r + 1, gridColumnStart: cell.c + 1 };
                  if (cell.type === 'driver')
                    return <span key={i} style={style} className="flex aspect-square items-center justify-center rounded-md bg-deep-ink text-surface"><User className="h-4 w-4" /></span>;
                  if (cell.type === 'door')
                    return <span key={i} style={style} className="flex aspect-square items-center justify-center text-muted/70"><DoorOpen className="h-4 w-4" /></span>;
                  if (cell.type === 'wc')
                    return <span key={i} style={style} className="flex aspect-square items-center justify-center rounded-md bg-background text-[10px] font-bold text-muted">WC</span>;
                  if (cell.type === 'stairs')
                    return <span key={i} style={style} className="flex aspect-square items-center justify-center rounded-md bg-background text-muted">≡</span>;
                  if (cell.type !== 'seat' || !cell.seat) return <span key={i} style={style} aria-hidden />;

                  const claim = activeClaim(cell.seat);
                  return (
                    <button
                      key={i}
                      type="button"
                      style={style}
                      onClick={() => setSelected(cell.seat!)}
                      className={cn(
                        'flex aspect-square items-center justify-center rounded-md border text-[12px] font-semibold transition',
                        selected === cell.seat && 'ring-2 ring-gold',
                        !claim && (cell.online === false
                          ? 'border-muted/50 bg-muted/20 text-muted'
                          : 'border-olive/50 bg-olive/10 text-olive'),
                        claim?.claim_type === 'booked' && 'border-primary bg-primary text-surface',
                        claim?.claim_type === 'hold' && 'border-amber bg-amber/30 text-deep-ink',
                        claim?.claim_type === 'blocked' && 'border-deep-ink bg-deep-ink/80 text-surface'
                      )}
                    >
                      {cell.seat}
                    </button>
                  );
                })}
              </div>
            </div>
          </div>
        ))}
        <div className="flex flex-wrap items-center justify-center gap-x-5 gap-y-2 text-[12px] text-muted">
          <span><span className="mr-1.5 inline-block h-3 w-3 rounded bg-olive/30 align-middle" />Ελεύθερη</span>
          <span><span className="mr-1.5 inline-block h-3 w-3 rounded bg-primary align-middle" />Κρατημένη</span>
          <span><span className="mr-1.5 inline-block h-3 w-3 rounded bg-amber/60 align-middle" />Δεσμευμένη (hold)</span>
          <span><span className="mr-1.5 inline-block h-3 w-3 rounded bg-deep-ink/80 align-middle" />Κλειδωμένη</span>
          <span><span className="mr-1.5 inline-block h-3 w-3 rounded bg-muted/30 align-middle" />Εκτός online</span>
        </div>
      </div>

      <aside className="h-fit rounded-lg border border-border bg-surface p-4">
        {!selected && <p className="text-[14px] text-muted">Επιλέξτε θέση για ενέργειες.</p>}
        {selected && (
          <div>
            <p className="font-display text-2xl font-semibold text-body">Θέση {selected}</p>
            {sel?.claim_type === 'booked' && (
              <div className="mt-2 text-[14px] text-body">
                <p className="font-semibold">{sel.ticket?.passenger_name}</p>
                <p className="font-mono text-[13px] text-muted">{sel.ticket?.code}</p>
                {sel.ticket?.order_id && (
                  <a href={`/admin/orders/${sel.ticket.order_id}`} className="mt-1 inline-block text-[13px] font-medium text-primary hover:underline">
                    Άνοιγμα κράτησης →
                  </a>
                )}
              </div>
            )}
            {sel?.claim_type === 'hold' && (
              <p className="mt-2 text-[14px] text-muted">
                Προσωρινή δέσμευση έως {sel.expires_at ? new Date(sel.expires_at).toLocaleTimeString('el-GR', { hour: '2-digit', minute: '2-digit' }) : '—'}.
              </p>
            )}
            {sel?.claim_type === 'blocked' && (
              <button
                type="button"
                disabled={pending}
                onClick={() => startTransition(() => unblockSeat(tripId, selected))}
                className="mt-3 w-full rounded-md border border-primary/40 px-3 py-2 text-[14px] font-medium text-primary hover:bg-primary/5"
              >
                Ξεκλείδωμα θέσης
              </button>
            )}
            {!sel && (
              <button
                type="button"
                disabled={pending}
                onClick={() => startTransition(() => blockSeat(tripId, selected))}
                className="mt-3 w-full rounded-md border border-deep-ink px-3 py-2 text-[14px] font-medium text-deep-ink hover:bg-deep-ink/5"
              >
                Κλείδωμα θέσης (να μην πωλείται)
              </button>
            )}
          </div>
        )}
      </aside>
    </div>
  );
}
