import { ChevronDown } from 'lucide-react';
import type { TourFaq as TourFaqItem } from '@/lib/tour-faq';

/**
 * Accordion συχνών ερωτήσεων με native <details> — ανοιγοκλείνει χωρίς JS,
 * άρα δουλεύει και πριν φορτώσει (ή χωρίς) το JavaScript της σελίδας.
 */
export function TourFaq({ faqs }: { faqs: TourFaqItem[] }) {
  if (faqs.length === 0) return null;

  return (
    <section className="max-w-3xl">
      <h2 className="mb-6 font-display text-2xl font-semibold text-primary">Συχνές ερωτήσεις</h2>
      <div className="divide-y divide-border border-y border-border">
        {faqs.map((faq) => (
          <details key={faq.q} data-testid="faq-item" className="group py-5">
            <summary className="flex min-h-11 cursor-pointer list-none items-center justify-between gap-3">
              <span className="font-medium text-body">{faq.q}</span>
              <ChevronDown
                className="h-5 w-5 shrink-0 text-muted transition-transform group-open:rotate-180"
                strokeWidth={1.75}
                aria-hidden="true"
              />
            </summary>
            <p className="mt-3 leading-relaxed text-muted">{faq.a}</p>
          </details>
        ))}
      </div>
    </section>
  );
}
