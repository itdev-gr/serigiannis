// src/components/trips/Pagination.tsx
import { ChevronLeft, ChevronRight } from 'lucide-react';

export function Pagination({ current, total, onChange }: { current: number; total: number; onChange: (page: number) => void }) {
  if (total <= 1) return null;
  const pages: (number | 'ellipsis')[] = [];
  for (let i = 1; i <= total; i++) {
    if (i === 1 || i === total || Math.abs(i - current) <= 1) pages.push(i);
    else if (pages[pages.length - 1] !== 'ellipsis') pages.push('ellipsis');
  }
  return (
    <nav aria-label="Pagination" className="mt-16 flex items-center justify-center gap-2">
      <button type="button" onClick={() => onChange(Math.max(1, current - 1))} disabled={current === 1} className="grid h-10 w-10 place-items-center rounded-full border border-border text-primary transition hover:bg-primary hover:text-surface disabled:opacity-40" aria-label="Προηγούμενη σελίδα">
        <ChevronLeft className="h-4 w-4" strokeWidth={1.75} />
      </button>
      {pages.map((p, i) =>
        p === 'ellipsis' ? (
          <span key={`e${i}`} className="px-2 text-muted">…</span>
        ) : (
          <button
            key={p}
            type="button"
            onClick={() => onChange(p)}
            className={`grid h-10 w-10 place-items-center rounded-full font-sans text-[14px] font-semibold transition ${
              p === current ? 'bg-cta text-surface' : 'text-primary hover:bg-primary/10'
            }`}
            aria-current={p === current ? 'page' : undefined}
          >
            {p}
          </button>
        )
      )}
      <button type="button" onClick={() => onChange(Math.min(total, current + 1))} disabled={current === total} className="grid h-10 w-10 place-items-center rounded-full border border-border text-primary transition hover:bg-primary hover:text-surface disabled:opacity-40" aria-label="Επόμενη σελίδα">
        <ChevronRight className="h-4 w-4" strokeWidth={1.75} />
      </button>
    </nav>
  );
}
