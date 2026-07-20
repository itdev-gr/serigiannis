'use client';
import { DoorOpen, User } from 'lucide-react';
import { cn } from '@/lib/utils';
import type { LayoutJson, SeatCell } from '@/types/ticketing';

export function SeatLegend() {
  const item = (cls: string, label: string) => (
    <span className="inline-flex items-center gap-2 text-[13px] text-muted">
      <span className={cn('inline-block h-4 w-4 rounded', cls)} />
      {label}
    </span>
  );
  return (
    <div className="flex flex-wrap items-center justify-center gap-x-5 gap-y-2 py-3">
      {item('border border-primary/40 bg-sea/15', 'Διαθέσιμη')}
      {item('bg-gold', 'Επιλεγμένη')}
      {item('bg-cta/20 border border-cta/30', 'Μη διαθέσιμη')}
      {item('bg-deep-ink', 'Οδηγός')}
    </div>
  );
}

function Cell({
  cell,
  taken,
  selected,
  disabled,
  onToggle,
}: {
  cell: SeatCell;
  taken: boolean;
  selected: boolean;
  disabled: boolean;
  onToggle: (seat: string) => void;
}) {
  const style = { gridRowStart: cell.r + 1, gridColumnStart: cell.c + 1 };
  if (cell.type === 'driver') {
    return (
      <span style={style} title="Οδηγός" className="flex aspect-square items-center justify-center rounded-md bg-deep-ink text-surface">
        <User className="h-4 w-4" />
      </span>
    );
  }
  if (cell.type === 'door') {
    return (
      <span style={style} title="Πόρτα" className="flex aspect-square items-center justify-center text-muted/70">
        <DoorOpen className="h-4 w-4" />
      </span>
    );
  }
  if (cell.type === 'wc') {
    return (
      <span style={style} title="WC" className="flex aspect-square items-center justify-center rounded-md bg-background text-[10px] font-bold text-muted">
        WC
      </span>
    );
  }
  if (cell.type === 'stairs') {
    return (
      <span style={style} title="Σκάλες" className="flex aspect-square items-center justify-center rounded-md bg-background text-[14px] text-muted">
        ≡
      </span>
    );
  }
  if (cell.type !== 'seat' || !cell.seat) {
    return <span style={style} aria-hidden />;
  }

  const offline = cell.online === false;
  const unavailable = taken || offline || disabled;
  return (
    <button
      type="button"
      style={style}
      disabled={unavailable && !selected}
      aria-pressed={selected}
      aria-label={`Θέση ${cell.seat}${taken || offline ? ' — μη διαθέσιμη' : ''}`}
      onClick={() => onToggle(cell.seat!)}
      className={cn(
        'flex aspect-square min-w-8 items-center justify-center rounded-md border font-sans text-[13px] font-semibold transition',
        selected
          ? 'border-gold-hover bg-gold text-deep-ink shadow-gold'
          : taken || offline
            ? 'cursor-not-allowed border-cta/30 bg-cta/20 text-cta/70'
            : disabled
              ? 'cursor-not-allowed border-border bg-background text-muted/50'
              : 'border-primary/40 bg-sea/15 text-primary hover:border-primary hover:bg-sea/30'
      )}
    >
      {cell.seat}
    </button>
  );
}

/** Renders one bus (all decks) from LayoutJson. Front of the bus is at the top. */
export function SeatMap({
  layout,
  taken,
  selected,
  maxSeats,
  onToggle,
}: {
  layout: LayoutJson;
  taken: string[];
  selected: string[];
  maxSeats: number;
  onToggle: (seat: string) => void;
}) {
  const takenSet = new Set(taken);
  const full = selected.length >= maxSeats;

  return (
    <div className="space-y-6">
      {layout.decks.map((deck) => (
        <div key={deck.name}>
          {layout.decks.length > 1 && (
            <p className="mb-2 text-center font-display text-[15px] font-semibold uppercase tracking-[0.12em] text-muted">
              {deck.name}
            </p>
          )}
          <div className="mx-auto w-fit rounded-2xl border-2 border-border bg-background/70 p-3 sm:p-4">
            <div
              className="grid gap-1.5 sm:gap-2"
              style={{ gridTemplateColumns: `repeat(${deck.cols}, minmax(2rem, 2.75rem))` }}
            >
              {deck.cells.map((cell, i) => {
                const isSel = cell.type === 'seat' && !!cell.seat && selected.includes(cell.seat);
                return (
                  <Cell
                    key={i}
                    cell={cell}
                    taken={cell.type === 'seat' && !!cell.seat && takenSet.has(cell.seat)}
                    selected={isSel}
                    disabled={full && !isSel}
                    onToggle={onToggle}
                  />
                );
              })}
            </div>
          </div>
        </div>
      ))}
    </div>
  );
}
