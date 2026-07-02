import Link from 'next/link';
import { ShieldCheck } from 'lucide-react';
import { stats } from '@/data/site';
import { StatCounter } from '@/components/shared/StatCounter';
import { Button } from '@/components/ui/Button';
import { homeContent } from './content';

export function Home1About() {
  const c = homeContent.about;
  return (
    <section className="bg-deep-ink py-24 text-surface md:py-32" aria-label={c.title}>
      <div className="container grid gap-16 md:grid-cols-12 md:items-start">
        <div className="md:col-span-5">
          <p className="font-sans text-[13px] font-semibold uppercase tracking-[0.18em] text-gold">{c.eyebrow}</p>
          <h2 className="mt-4 font-display text-display-section text-surface">{c.title}</h2>
          <p className="mt-6 text-[17px] leading-relaxed text-surface/80">{c.body}</p>
          <div className="mt-8">
            <Button asChild variant="ghost">
              <Link href={c.ctaHref}>{c.cta}</Link>
            </Button>
          </div>
        </div>
        <div className="md:col-span-7">
          <div className="grid grid-cols-2 gap-10 md:gap-14">
            {stats.map((stat) => <StatCounter key={stat.id} stat={stat} />)}
          </div>
          <ul className="mt-14 grid gap-6 sm:grid-cols-2">
            {c.trust.map((item) => (
              <li key={item.title} className="flex gap-4">
                <ShieldCheck className="mt-1 h-6 w-6 shrink-0 text-gold" strokeWidth={1.5} aria-hidden="true" />
                <div>
                  <h3 className="font-display text-[19px] font-semibold text-surface">{item.title}</h3>
                  <p className="mt-1 text-[15px] leading-relaxed text-surface/70">{item.text}</p>
                </div>
              </li>
            ))}
          </ul>
        </div>
      </div>
    </section>
  );
}
