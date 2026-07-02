import Link from 'next/link';
import { Bus } from 'lucide-react';
import { Button } from '@/components/ui/Button';
import { homeContent } from './content';

export function Home1Promo() {
  const c = homeContent.promo;
  return (
    <section className="py-8" aria-label={c.title}>
      <div className="container">
        <div className="relative overflow-hidden rounded-2xl bg-mesh-blue px-8 py-14 text-surface md:px-14">
          <Bus className="absolute -right-6 -top-6 h-48 w-48 text-surface/10" strokeWidth={1} aria-hidden="true" />
          <div className="relative max-w-2xl">
            <p className="font-sans text-[13px] font-semibold uppercase tracking-[0.18em] text-gold">{c.eyebrow}</p>
            <h2 className="mt-3 font-display text-display-section text-surface">{c.title}</h2>
            <p className="mt-5 text-[17px] leading-relaxed text-surface/85">{c.body}</p>
            <div className="mt-8">
              <Button asChild variant="accent" size="lg">
                <Link href={c.ctaHref}>{c.cta}</Link>
              </Button>
            </div>
          </div>
        </div>
      </div>
    </section>
  );
}
