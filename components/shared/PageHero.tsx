'use client';
import { useRef } from 'react';
import Link from 'next/link';
import Image from 'next/image';
import { ChevronRight } from 'lucide-react';
import { gsap } from '@/lib/gsap';
import { useGsapContext } from '@/hooks/useGsapContext';
import { useReducedMotion } from '@/hooks/useReducedMotion';

type Crumb = { label: string; href?: string };

type Props = {
  photo?: string;
  photoAlt?: string;
  eyebrow?: string;
  title: string;
  subtitle?: string;
  breadcrumbs?: Crumb[];
  heightClass?: string;
};

export function PageHero({ photo, photoAlt = '', eyebrow, title, subtitle, breadcrumbs, heightClass = 'h-[62vh] min-h-[540px]' }: Props) {
  const scopeRef = useRef<HTMLElement>(null);
  const reduced = useReducedMotion();

  useGsapContext(() => {
    if (reduced) return;
    const tl = gsap.timeline({ defaults: { ease: 'power3.out' } });
    tl.from('[data-hero-image]', { scale: 1.08, duration: 1.4 })
      .from('[data-hero-eyebrow]', { y: 20, opacity: 0, duration: 0.5 }, '-=1.0')
      .from('[data-hero-title]', { y: 30, opacity: 0, duration: 0.7 }, '-=0.75')
      .from('[data-hero-subtitle]', { y: 20, opacity: 0, duration: 0.55 }, '-=0.5');
    gsap.to('[data-hero-image]', {
      yPercent: 8,
      ease: 'none',
      scrollTrigger: { trigger: scopeRef.current!, start: 'top top', end: 'bottom top', scrub: true },
    });
  }, scopeRef, []);

  return (
    <section ref={scopeRef} className={`relative w-full overflow-hidden ${heightClass}`}>
      {photo ? (
        <div data-hero-image className="absolute inset-x-0 -top-[8%] h-[116%]">
          <Image src={photo} alt={photoAlt} fill priority sizes="100vw" className="object-cover" />
        </div>
      ) : (
        <div data-hero-image className="absolute inset-0 bg-mesh-blue" />
      )}
      <div className="absolute inset-0 bg-gradient-to-b from-deep-ink/50 via-deep-ink/40 to-deep-ink/80" />
      <div className="container relative flex h-full flex-col justify-end pb-14 pt-28 text-surface">
        {breadcrumbs && (
          <nav aria-label="breadcrumb" className="mb-5 flex items-center gap-1.5 text-[12px] font-medium uppercase tracking-[0.14em] text-surface/70">
            {breadcrumbs.map((c, i) => (
              <span key={i} className="flex items-center gap-1.5">
                {c.href ? <Link href={c.href} className="hover:text-cta">{c.label}</Link> : <span>{c.label}</span>}
                {i < breadcrumbs.length - 1 && <ChevronRight className="h-3 w-3 opacity-60" />}
              </span>
            ))}
          </nav>
        )}
        {eyebrow && <p data-hero-eyebrow className="mb-3 font-sans text-[13px] font-semibold uppercase tracking-[0.18em] text-cta">{eyebrow}</p>}
        <h1 data-hero-title className="max-w-4xl font-display text-5xl font-bold leading-[1.05] text-balance text-surface md:text-6xl xl:text-7xl">{title}</h1>
        {subtitle && <p data-hero-subtitle className="mt-5 max-w-2xl text-[17px] leading-relaxed text-surface/85 md:text-[19px]">{subtitle}</p>}
      </div>
    </section>
  );
}
