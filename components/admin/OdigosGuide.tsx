'use client';
import { useMemo, useState, type ReactNode } from 'react';
import Link from 'next/link';
import { Search, X, Lightbulb, TriangleAlert, ArrowRight } from 'lucide-react';
import { cn } from '@/lib/utils';
import { adminInput } from '@/components/admin/ui';
import { findMatches, sectionMatches } from '@/lib/odigos-search';
import type { OdigosBlock, OdigosSection } from '@/data/odigos-content';

/** Κείμενο με <mark> στα σημεία που ταιριάζουν με την αναζήτηση. */
function Highlighted({ text, query }: { text: string; query: string }) {
  const matches = query ? findMatches(text, query) : [];
  if (matches.length === 0) return <>{text}</>;
  const parts: ReactNode[] = [];
  let cursor = 0;
  matches.forEach(([start, end], i) => {
    if (start > cursor) parts.push(text.slice(cursor, start));
    parts.push(
      <mark key={i} className="rounded-sm bg-gold/40 px-0.5 text-deep-ink">
        {text.slice(start, end)}
      </mark>
    );
    cursor = end;
  });
  if (cursor < text.length) parts.push(text.slice(cursor));
  return <>{parts}</>;
}

function Block({ block, query }: { block: OdigosBlock; query: string }) {
  switch (block.kind) {
    case 'p':
      return (
        <p className="text-[15px] leading-relaxed text-body">
          <Highlighted text={block.text} query={query} />
        </p>
      );
    case 'steps':
      return (
        <ol className="list-none space-y-2.5">
          {block.items.map((item, i) => (
            <li key={i} className="flex gap-3 text-[15px] leading-relaxed text-body">
              <span className="mt-0.5 grid h-6 w-6 shrink-0 place-items-center rounded-full bg-primary/10 font-sans text-[12px] font-bold text-primary">
                {i + 1}
              </span>
              <span><Highlighted text={item} query={query} /></span>
            </li>
          ))}
        </ol>
      );
    case 'tip':
      return (
        <p className="flex gap-2.5 rounded-md border border-olive/30 bg-olive/10 px-4 py-3 text-[14px] leading-relaxed text-body">
          <Lightbulb className="mt-0.5 h-4.5 w-4.5 shrink-0 text-olive" strokeWidth={1.75} />
          <span><Highlighted text={block.text} query={query} /></span>
        </p>
      );
    case 'warning':
      return (
        <p className="flex gap-2.5 rounded-md border border-cta/30 bg-cta/5 px-4 py-3 text-[14px] leading-relaxed text-body">
          <TriangleAlert className="mt-0.5 h-4.5 w-4.5 shrink-0 text-cta" strokeWidth={1.75} />
          <span><Highlighted text={block.text} query={query} /></span>
        </p>
      );
    case 'table':
      return (
        <div className="overflow-x-auto rounded-md border border-border">
          <table className="w-full text-left text-[14px]">
            <thead>
              <tr className="border-b border-border bg-background">
                {block.head.map((h, i) => (
                  <th key={i} className="px-4 py-2.5 font-sans text-[12px] font-semibold uppercase tracking-[0.08em] text-muted">
                    <Highlighted text={h} query={query} />
                  </th>
                ))}
              </tr>
            </thead>
            <tbody>
              {block.rows.map((row, ri) => (
                <tr key={ri} className={ri > 0 ? 'border-t border-border' : undefined}>
                  {row.map((cell, ci) => (
                    <td key={ci} className={cn('px-4 py-2.5 align-top leading-relaxed text-body', ci === 0 && 'font-medium')}>
                      <Highlighted text={cell} query={query} />
                    </td>
                  ))}
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      );
    case 'link':
      return (
        <p>
          <Link href={block.href} className="inline-flex items-center gap-1.5 text-[14px] font-medium text-primary hover:text-cta">
            {block.label} <ArrowRight className="h-4 w-4" strokeWidth={1.75} />
          </Link>
        </p>
      );
  }
}

export function OdigosGuide({ sections }: { sections: OdigosSection[] }) {
  const [query, setQuery] = useState('');
  const q = query.trim();

  const visible = useMemo(
    () => (q ? sections.filter((s) => sectionMatches(s, q)) : sections),
    [sections, q]
  );

  const groups = useMemo(() => {
    const out: { group: string; items: OdigosSection[] }[] = [];
    for (const s of sections) {
      const last = out[out.length - 1];
      if (last && last.group === s.group) last.items.push(s);
      else out.push({ group: s.group, items: [s] });
    }
    return out;
  }, [sections]);

  return (
    <div className="flex flex-col gap-8 lg:flex-row">
      {/* TOC */}
      <nav className="shrink-0 print:hidden lg:w-60">
        <div className="lg:sticky lg:top-6">
          {groups.map(({ group, items }) => (
            <div key={group} className="mb-4">
              <p className="mb-1 px-1 font-sans text-[11px] font-semibold uppercase tracking-[0.14em] text-muted">{group}</p>
              <div className="flex flex-col">
                {items.map((s) => {
                  const dimmed = q !== '' && !visible.includes(s);
                  return (
                    <a
                      key={s.id}
                      href={`#${s.id}`}
                      className={cn(
                        'rounded-md px-2 py-1.5 text-[13px] leading-snug transition-colors hover:bg-primary/5 hover:text-primary',
                        dimmed ? 'text-muted/50' : 'text-body'
                      )}
                    >
                      {s.title.split(' — ')[0]}
                    </a>
                  );
                })}
              </div>
            </div>
          ))}
        </div>
      </nav>

      {/* Περιεχόμενο */}
      <div className="min-w-0 flex-1">
        {/* Αναζήτηση */}
        <div className="relative mb-6 print:hidden">
          <Search className="pointer-events-none absolute left-3.5 top-1/2 h-4.5 w-4.5 -translate-y-1/2 text-muted" strokeWidth={1.75} />
          <input
            type="text"
            value={query}
            onChange={(e) => setQuery(e.target.value)}
            onKeyDown={(e) => { if (e.key === 'Escape') setQuery(''); }}
            placeholder="Αναζήτηση στον οδηγό — π.χ. ακύρωση, τηλεφωνική κράτηση, φωτογραφίες…"
            aria-label="Αναζήτηση στον οδηγό"
            className={cn(adminInput, 'py-3 pl-10 pr-10 text-[15px]')}
          />
          {q && (
            <button
              type="button"
              onClick={() => setQuery('')}
              aria-label="Καθαρισμός αναζήτησης"
              className="absolute right-2.5 top-1/2 grid h-7 w-7 -translate-y-1/2 place-items-center rounded-md text-muted hover:bg-primary/10 hover:text-primary"
            >
              <X className="h-4 w-4" />
            </button>
          )}
          {q && (
            <p className="mt-2 text-[13px] text-muted" role="status">
              {visible.length === 0
                ? 'Δεν βρέθηκε τίποτα — δοκιμάστε άλλη λέξη (π.χ. «κράτηση», «τιμές», «εκδρομή»).'
                : `${visible.length} ${visible.length === 1 ? 'ενότητα βρέθηκε' : 'ενότητες βρέθηκαν'}.`}
            </p>
          )}
        </div>

        <div className="grid gap-6">
          {visible.map((s) => (
            <section key={s.id} id={s.id} className="scroll-mt-6 rounded-lg border border-border bg-surface p-6">
              <p className="mb-1 font-sans text-[11px] font-semibold uppercase tracking-[0.14em] text-muted">{s.group}</p>
              <h2 className="mb-4 font-display text-2xl font-semibold text-primary">
                <Highlighted text={s.title} query={q} />
              </h2>
              <div className="grid gap-4">
                {s.blocks.map((b, i) => (
                  <Block key={i} block={b} query={q} />
                ))}
              </div>
            </section>
          ))}
        </div>
      </div>
    </div>
  );
}
