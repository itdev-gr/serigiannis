'use client';
import { useEffect, useState } from 'react';
import Link from 'next/link';
import { ArrowRight } from 'lucide-react';

type Suggestion = { slug: string; title: string };

/** «Μήπως ψάχνατε…» στη σελίδα 404.
 *
 *  Η 404 του Next δεν ξέρει ποια διεύθυνση ζητήθηκε, οπότε τη διαβάζουμε εδώ
 *  από τον browser και ρωτάμε τον server. Αν δεν βρεθεί τίποτα σχετικό, το
 *  component δεν εμφανίζει απολύτως τίποτα — καλύτερα ένα καθαρό μήνυμα παρά
 *  άσχετες προτάσεις που μοιάζουν με σφάλμα. */
export function NotFoundSuggestions() {
  const [items, setItems] = useState<Suggestion[]>([]);

  useEffect(() => {
    let alive = true;
    const path = window.location.pathname;
    fetch(`/api/protaseis?path=${encodeURIComponent(path)}`)
      .then((r) => (r.ok ? r.json() : { suggestions: [] }))
      .then((d: { suggestions?: Suggestion[] }) => {
        if (alive && Array.isArray(d.suggestions)) setItems(d.suggestions);
      })
      .catch(() => {
        // Η 404 πρέπει να στέκει και χωρίς προτάσεις.
      });
    return () => {
      alive = false;
    };
  }, []);

  if (items.length === 0) return null;

  return (
    <div className="mt-10 rounded-lg border border-border bg-surface p-6">
      <h2 className="font-sans text-[13px] font-semibold uppercase tracking-[0.14em] text-primary">
        Μήπως ψάχνατε
      </h2>
      <ul className="mt-4 divide-y divide-border/70">
        {items.map((s) => (
          <li key={s.slug}>
            <Link
              href={`/tour/${s.slug}`}
              className="group flex items-center justify-between gap-4 py-3 text-[16px] text-body transition-colors hover:text-primary motion-reduce:transition-none"
            >
              <span>{s.title}</span>
              <ArrowRight
                className="h-4 w-4 shrink-0 text-primary/50 transition-transform group-hover:translate-x-1 motion-reduce:transition-none"
                strokeWidth={1.75}
              />
            </Link>
          </li>
        ))}
      </ul>
    </div>
  );
}
