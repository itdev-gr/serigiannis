'use client';
import { useMemo, useState } from 'react';
import { DoorOpen, User } from 'lucide-react';
import { cn } from '@/lib/utils';
import type { LayoutDeck, LayoutJson, SeatCell, SeatCellType } from '@/types/ticketing';

type Tool = SeatCellType | 'toggle_online';

const TOOLS: { id: Tool; label: string }[] = [
  { id: 'seat', label: 'Θέση' },
  { id: 'toggle_online', label: 'Online on/off' },
  { id: 'driver', label: 'Οδηγός' },
  { id: 'door', label: 'Πόρτα' },
  { id: 'wc', label: 'WC' },
  { id: 'stairs', label: 'Σκάλες' },
  { id: 'empty', label: 'Σβήσιμο' },
];

function emptyDeck(name: string): LayoutDeck {
  return { name, rows: 12, cols: 5, cells: [] };
}

function nextSeatNumber(decks: LayoutDeck[]): string {
  const used = new Set(
    decks.flatMap((d) => d.cells.filter((c) => c.type === 'seat' && c.seat).map((c) => Number(c.seat)))
  );
  let n = 1;
  while (used.has(n)) n++;
  return String(n);
}

/** Visual grid editor for bus seat plans. Serializes to the hidden layout_json
 *  field submitted by the surrounding server-action form. */
export function LayoutEditor({ initial }: { initial: LayoutJson | null }) {
  const [decks, setDecks] = useState<LayoutDeck[]>(
    initial?.decks?.length ? structuredClone(initial.decks) : [emptyDeck('ΟΡΟΦΟΣ')]
  );
  const [tool, setTool] = useState<Tool>('seat');

  const json = useMemo(() => JSON.stringify({ decks }), [decks]);
  const seatCount = decks.flatMap((d) => d.cells).filter((c) => c.type === 'seat').length;
  const onlineCount = decks.flatMap((d) => d.cells).filter((c) => c.type === 'seat' && c.online !== false).length;

  const setDeck = (i: number, patch: Partial<LayoutDeck>) =>
    setDecks((prev) => prev.map((d, j) => (j === i ? { ...d, ...patch } : d)));

  const applyTool = (deckIdx: number, r: number, c: number) => {
    setDecks((prev) => {
      const next = structuredClone(prev);
      const deck = next[deckIdx];
      const idx = deck.cells.findIndex((cell) => cell.r === r && cell.c === c);
      const existing = idx >= 0 ? deck.cells[idx] : null;

      if (tool === 'toggle_online') {
        if (existing?.type === 'seat') existing.online = existing.online === false;
        return next;
      }
      if (tool === 'empty') {
        if (idx >= 0) deck.cells.splice(idx, 1);
        return next;
      }
      const cell: SeatCell = { r, c, type: tool };
      if (tool === 'seat') {
        if (existing?.type === 'seat') {
          // clicking a seat again removes it
          deck.cells.splice(idx, 1);
          return next;
        }
        cell.seat = nextSeatNumber(next);
        cell.online = true;
      }
      if (idx >= 0) deck.cells[idx] = cell;
      else deck.cells.push(cell);
      return next;
    });
  };

  const renumber = () => {
    setDecks((prev) => {
      const next = structuredClone(prev);
      let n = 1;
      for (const deck of next) {
        const seats = deck.cells
          .filter((c) => c.type === 'seat')
          .sort((a, b) => a.r - b.r || a.c - b.c);
        for (const s of seats) s.seat = String(n++);
      }
      return next;
    });
  };

  const setSeatNumber = (deckIdx: number, r: number, c: number, value: string) => {
    setDecks((prev) => {
      const next = structuredClone(prev);
      const cell = next[deckIdx].cells.find((x) => x.r === r && x.c === c);
      if (cell?.type === 'seat') cell.seat = value;
      return next;
    });
  };

  return (
    <div>
      <input type="hidden" name="layout_json" value={json} />

      <div className="mb-4 flex flex-wrap items-center gap-2">
        {TOOLS.map((t) => (
          <button
            key={t.id}
            type="button"
            onClick={() => setTool(t.id)}
            className={cn(
              'rounded-md border px-3 py-1.5 text-[13px] font-medium transition',
              tool === t.id ? 'border-deep-ink bg-deep-ink text-surface' : 'border-border bg-surface text-muted hover:text-primary'
            )}
          >
            {t.label}
          </button>
        ))}
        <button type="button" onClick={renumber} className="ml-auto rounded-md border border-primary/40 px-3 py-1.5 text-[13px] font-medium text-primary hover:bg-primary/5">
          Αυτόματη αρίθμηση
        </button>
      </div>
      <p className="mb-4 text-[13px] text-muted">
        {seatCount} θέσεις · {onlineCount} διαθέσιμες online. Με το εργαλείο «Θέση» βάζετε/αφαιρείτε θέσεις. Το «Online on/off» εξαιρεί θέση από την online πώληση (π.χ. 1–8 για τα εκδοτήρια).
      </p>

      {decks.map((deck, di) => (
        <div key={di} className="mb-8 rounded-lg border border-border bg-surface p-4">
          <div className="mb-3 flex flex-wrap items-center gap-3">
            <input
              value={deck.name}
              onChange={(e) => setDeck(di, { name: e.target.value })}
              className="w-44 rounded-md border border-border px-3 py-1.5 text-[14px] font-semibold"
              aria-label="Όνομα ορόφου"
            />
            <label className="text-[13px] text-muted">Σειρές
              <input
                type="number" min={1} max={40} value={deck.rows}
                onChange={(e) => setDeck(di, { rows: Math.max(1, Math.min(40, Number(e.target.value) || 1)) })}
                className="ml-2 w-16 rounded-md border border-border px-2 py-1 text-[14px]"
              />
            </label>
            <label className="text-[13px] text-muted">Στήλες
              <input
                type="number" min={1} max={8} value={deck.cols}
                onChange={(e) => setDeck(di, { cols: Math.max(1, Math.min(8, Number(e.target.value) || 1)) })}
                className="ml-2 w-16 rounded-md border border-border px-2 py-1 text-[14px]"
              />
            </label>
            {decks.length > 1 && (
              <button type="button" onClick={() => setDecks((p) => p.filter((_, j) => j !== di))} className="ml-auto text-[13px] text-cta hover:underline">
                Αφαίρεση ορόφου
              </button>
            )}
          </div>

          <div
            className="grid w-fit gap-1 rounded-xl border-2 border-border bg-background/60 p-3"
            style={{ gridTemplateColumns: `repeat(${deck.cols}, 3rem)` }}
          >
            {Array.from({ length: deck.rows }).flatMap((_, r) =>
              Array.from({ length: deck.cols }).map((_, c) => {
                const cell = deck.cells.find((x) => x.r === r && x.c === c);
                return (
                  <div key={`${r}-${c}`} className="relative">
                    <button
                      type="button"
                      onClick={() => applyTool(di, r, c)}
                      aria-label={`Κελί ${r + 1},${c + 1}`}
                      className={cn(
                        'flex aspect-square w-full items-center justify-center rounded-md border text-[12px] font-semibold transition',
                        !cell && 'border-dashed border-border/70 bg-surface text-transparent hover:border-primary/50',
                        cell?.type === 'seat' && (cell.online === false
                          ? 'border-muted bg-muted/30 text-body'
                          : 'border-primary/50 bg-sea/20 text-primary'),
                        cell?.type === 'driver' && 'border-deep-ink bg-deep-ink text-surface',
                        (cell?.type === 'door' || cell?.type === 'wc' || cell?.type === 'stairs') && 'border-border bg-background text-muted'
                      )}
                    >
                      {cell?.type === 'seat' && (cell.seat ?? '•')}
                      {cell?.type === 'driver' && <User className="h-4 w-4" />}
                      {cell?.type === 'door' && <DoorOpen className="h-4 w-4" />}
                      {cell?.type === 'wc' && 'WC'}
                      {cell?.type === 'stairs' && '≡'}
                    </button>
                    {cell?.type === 'seat' && (
                      <input
                        value={cell.seat ?? ''}
                        onChange={(e) => setSeatNumber(di, r, c, e.target.value)}
                        className="absolute -bottom-1 left-1/2 hidden w-10 -translate-x-1/2 rounded border border-border bg-surface px-1 text-center text-[10px] group-hover:block"
                        aria-hidden
                        tabIndex={-1}
                      />
                    )}
                  </div>
                );
              })
            )}
          </div>
        </div>
      ))}

      {decks.length < 2 && (
        <button
          type="button"
          onClick={() => setDecks((p) => [...p, emptyDeck(p.length === 1 ? 'ΕΠΑΝΩ ΟΡΟΦΟΣ' : 'ΟΡΟΦΟΣ')])}
          className="rounded-md border border-primary/40 px-4 py-2 text-[14px] font-medium text-primary hover:bg-primary/5"
        >
          + Προσθήκη ορόφου (διώροφο)
        </button>
      )}
    </div>
  );
}
