import Link from 'next/link';
import type { ReactNode } from 'react';
import { ChevronRight } from 'lucide-react';
import { cn } from '@/lib/utils';

type Crumb = { label: string; href?: string };

type Props = {
  eyebrow?: string;
  title: string;
  subtitle?: string;
  breadcrumbs?: Crumb[];
  /** Ετικέτες πάνω από τον τίτλο (π.χ. κατηγορία, εμπιστοσύνη). */
  badges?: ReactNode;
  /** Στοιχεία κάτω από τον τίτλο (π.χ. σειρά εικονιδίων, περίληψη). */
  meta?: ReactNode;
};

/**
 * Compact page heading for every inner page — lives in normal document flow,
 * no fixed height, no image, no clipping. Replaces the old PageHero band.
 * The top padding clears the fixed Navbar (see components/layout/Navbar.tsx);
 * the bottom padding is deliberately modest because every page's next section
 * already supplies its own generous top spacing (py-16+/pt-10+).
 */
export function PageHeading({ eyebrow, title, subtitle, breadcrumbs, badges, meta }: Props) {
  return (
    <section className="w-full">
      {/* Το padding-top καθαρίζει το fixed Navbar. ΜΕΤΡΗΜΕΝΑ ύψη header:
          <640px ~64px (χωρίς μπάρα τηλεφώνων) · 640-768px ~119px · ≥768px 138px
          (μπάρα 61px + κύρια γραμμή 64px, από `sm:grid` και πάνω).
          Οι τιμές αφήνουν ~24px ανάσα. Μην τις κατεβάσεις «για συμπαγέστερο
          look»: με 128px στο md η διαδρομή έμπαινε κάτω από το header. */}
      <div className="container pb-8 pt-24 sm:pb-10 sm:pt-36 md:pt-40">
        {breadcrumbs && (
          <nav
            aria-label="breadcrumb"
            className="mb-5 flex flex-wrap items-center gap-1.5 font-medium uppercase tracking-[0.14em] text-muted text-[12px]"
          >
            {breadcrumbs.map((c, i) => {
              const isLast = i === breadcrumbs.length - 1;
              return (
                <span key={i} className={cn('flex items-center gap-1.5', isLast && 'hidden sm:flex')}>
                  {c.href ? (
                    <Link href={c.href} className="hover:text-primary">
                      {c.label}
                    </Link>
                  ) : (
                    <span className="text-body">{c.label}</span>
                  )}
                  {!isLast && (
                    <ChevronRight
                      className={cn('h-3 w-3 opacity-60', i === breadcrumbs.length - 2 && 'hidden sm:inline-block')}
                    />
                  )}
                </span>
              );
            })}
          </nav>
        )}
        {eyebrow && (
          <p className="mb-3 font-sans text-[13px] font-semibold uppercase tracking-[0.18em] text-cta">{eyebrow}</p>
        )}
        {badges && <div className="mb-3 flex flex-wrap items-center gap-2">{badges}</div>}
        <h1 className="max-w-4xl break-words text-balance font-display text-display-section text-primary">{title}</h1>
        {meta}
        {subtitle && (
          <p className="mt-4 max-w-prose text-[17px] leading-relaxed text-muted md:text-[18px]">{subtitle}</p>
        )}
      </div>
    </section>
  );
}
