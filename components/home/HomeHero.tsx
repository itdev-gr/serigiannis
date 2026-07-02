'use client';
import { useRef } from 'react';
import Link from 'next/link';
import Image from 'next/image';
import SplitType from 'split-type';
import { ChevronDown, Bus } from 'lucide-react';
import { gsap } from '@/lib/gsap';
import { useGsapContext } from '@/hooks/useGsapContext';
import { useReducedMotion } from '@/hooks/useReducedMotion';
import { Button } from '@/components/ui/Button';

// Self-hosted hero image (Supabase Storage).
const HERO_SRC = `${process.env.NEXT_PUBLIC_SUPABASE_URL}/storage/v1/object/public/tour-images/site/home-hero.jpg`;

export function HomeHero() {
  const scopeRef = useRef<HTMLElement>(null);
  const titleRef = useRef<HTMLHeadingElement>(null);
  const reduced = useReducedMotion();

  useGsapContext(() => {
    if (reduced) return;
    if (titleRef.current) {
      const split = new SplitType(titleRef.current, { types: 'words' });
      gsap.from(split.words, { yPercent: 100, opacity: 0, duration: 1, ease: 'power4.out', stagger: 0.08 });
    }
    gsap.from('[data-hero-eyebrow]', { opacity: 0, y: 15, delay: 0.2, duration: 0.7, ease: 'power2.out' });
    gsap.from('[data-hero-sub]', { opacity: 0, y: 20, delay: 0.8, duration: 0.8, ease: 'power2.out' });
    gsap.from('[data-hero-cta]', { opacity: 0, y: 20, delay: 1.1, duration: 0.7, ease: 'power2.out', stagger: 0.15 });
    gsap.from('[data-hero-scroll]', { opacity: 0, y: 10, delay: 1.6, duration: 0.6, ease: 'power2.out' });
    gsap.from('[data-hero-img]', { scale: 1.1, duration: 1.6, ease: 'power2.out' });
    // Scroll parallax (scrub owns scroll-y; mount owns scale — no conflict).
    gsap.to('[data-hero-img]', {
      yPercent: 10,
      ease: 'none',
      scrollTrigger: { trigger: scopeRef.current!, start: 'top top', end: 'bottom top', scrub: true },
    });
  }, scopeRef, [reduced]);

  return (
    <section ref={scopeRef} className="relative h-[100vh] min-h-[640px] w-full overflow-hidden">
      <div data-hero-img className="absolute inset-x-0 -top-[10%] h-[120%]">
        <Image src={HERO_SRC} alt="Λευκά και μπλε ελληνικού νησιού" fill priority sizes="100vw" className="object-cover" />
      </div>
      <div className="absolute inset-0 bg-gradient-to-b from-deep-ink/35 via-deep-ink/20 to-deep-ink/85" />
      <div className="absolute inset-0 bg-[radial-gradient(70%_55%_at_12%_100%,rgba(212,0,42,0.22),transparent_60%)]" />
      <div className="container relative flex h-full flex-col justify-end pb-20 pt-32 text-surface">
        <p data-hero-eyebrow className="mb-5 inline-flex items-center gap-3 self-start rounded-full border border-surface/25 bg-surface/10 px-4 py-2 font-sans text-[11px] font-semibold uppercase tracking-[0.2em] backdrop-blur-sm">
          <span className="h-1.5 w-1.5 rounded-full bg-cta" />
          Από το 1995 · Ταξιδιωτικό Γραφείο Περιστέρι
        </p>
        <h1 ref={titleRef} className="max-w-5xl overflow-hidden font-display text-display-hero text-balance leading-[1.02]">
          Ανακαλύψτε<br/>την Ελλάδα
        </h1>
        <p data-hero-sub className="mt-6 max-w-2xl text-[19px] leading-relaxed text-surface/85">
          Μονοήμερες, κρουαζιέρες και πολυήμερες εκδρομές από την Αθήνα. 30 χρόνια εμπειρίας. Άνετα πούλμαν, έμπειροι ξεναγοί, ξεκάθαρες τιμές.
        </p>
        <div className="mt-10 flex flex-wrap items-center gap-4">
          <div data-hero-cta>
            <Button asChild variant="primary" size="lg">
              <Link href="/ekdromes">Δείτε τις Εκδρομές</Link>
            </Button>
          </div>
          <div data-hero-cta>
            <Button asChild variant="ghost" size="lg">
              <Link href="/enoikiaseis-poylman"><Bus className="h-4 w-4" strokeWidth={1.75}/> Ενοικίαση Πούλμαν</Link>
            </Button>
          </div>
        </div>
      </div>
      <div data-hero-scroll className="absolute bottom-6 left-1/2 -translate-x-1/2 text-surface/70">
        <ChevronDown className="h-6 w-6 animate-bounce" strokeWidth={1.5} />
      </div>
    </section>
  );
}
