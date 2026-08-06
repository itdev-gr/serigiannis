import Link from 'next/link';
import { ChevronRight } from 'lucide-react';

type Crumb = { label: string; href?: string };

type Props = {
  eyebrow?: string;
  title: string;
  subtitle?: string;
  breadcrumbs?: Crumb[];
};

/**
 * Compact page heading for every inner page — lives in normal document flow,
 * no fixed height, no image, no clipping. Replaces the old PageHero band.
 * The top padding clears the fixed Navbar (see components/layout/Navbar.tsx);
 * the bottom padding is deliberately modest because every page's next section
 * already supplies its own generous top spacing (py-16+/pt-10+).
 */
export function PageHeading({ eyebrow, title, subtitle, breadcrumbs }: Props) {
  return (
    <section className="w-full">
      <div className="container pb-8 pt-[7.25rem] sm:pb-10 sm:pt-[7.75rem] md:pt-32">
        {breadcrumbs && (
          <nav
            aria-label="breadcrumb"
            className="mb-5 flex flex-wrap items-center gap-1.5 font-medium uppercase tracking-[0.14em] text-muted text-[12px]"
          >
            {breadcrumbs.map((c, i) => (
              <span key={i} className="flex items-center gap-1.5">
                {c.href ? (
                  <Link href={c.href} className="hover:text-primary">
                    {c.label}
                  </Link>
                ) : (
                  <span className="text-body">{c.label}</span>
                )}
                {i < breadcrumbs.length - 1 && <ChevronRight className="h-3 w-3 opacity-60" />}
              </span>
            ))}
          </nav>
        )}
        {eyebrow && (
          <p className="mb-3 font-sans text-[13px] font-semibold uppercase tracking-[0.18em] text-cta">{eyebrow}</p>
        )}
        <h1 className="max-w-4xl text-balance font-display text-display-section text-primary">{title}</h1>
        {subtitle && (
          <p className="mt-4 max-w-prose text-[17px] leading-relaxed text-muted md:text-[18px]">{subtitle}</p>
        )}
      </div>
    </section>
  );
}
