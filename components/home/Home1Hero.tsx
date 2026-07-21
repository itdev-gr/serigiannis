'use client';
import { useState, useEffect } from 'react';
import Image from 'next/image';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { Search } from 'lucide-react';
import type { Category } from '@/types/db';
import { Button } from '@/components/ui/Button';
import { useReducedMotion } from '@/hooks/useReducedMotion';
import { homeContent } from './content';
import type { HeroCopy } from './resolve-content';
import { buildSearchHref } from './home-search';
import { cn } from '@/lib/utils';

// Real hero images from sergianitravel.gr (self-hosted in /public/hero).
const HERO_IMAGES = [
  { src: '/hero/hero-1.jpg', alt: 'Χαλκίδα, ηλιοβασίλεμα' },
  { src: '/hero/hero-2.jpg', alt: 'Γέφυρα και φυσικό τοπίο' },
  { src: '/hero/hero-3.jpg', alt: 'Παραλία και θάλασσα' },
];

const ROTATE_MS = 5000;

export function Home1Hero({
  categories,
  content = homeContent.hero,
}: {
  categories: Category[];
  content?: HeroCopy;
}) {
  const c = content;
  const router = useRouter();
  const reduced = useReducedMotion();
  const [category, setCategory] = useState('all');
  const [active, setActive] = useState(0);

  useEffect(() => {
    if (reduced) return;
    const id = setInterval(() => setActive((i) => (i + 1) % HERO_IMAGES.length), ROTATE_MS);
    return () => clearInterval(id);
  }, [reduced]);

  return (
    <section className="relative flex h-[72svh] min-h-[520px] max-h-[680px] w-full items-center justify-center overflow-hidden bg-deep-ink md:h-[100svh] md:max-h-none md:min-h-[100svh]">
      {/* Rotating background slideshow */}
      {HERO_IMAGES.map((img, i) => (
        <div
          key={img.src}
          className={`absolute inset-0 transition-opacity duration-1000 ease-editorial ${i === active ? 'opacity-100' : 'opacity-0'}`}
          aria-hidden="true"
        >
          <Image
            src={img.src}
            alt=""
            fill
            priority={i === 0}
            sizes="100vw"
            className="object-cover object-center"
          />
        </div>
      ))}
      <div className="absolute inset-0 bg-gradient-to-b from-deep-ink/70 via-deep-ink/45 to-deep-ink/90" />

      <div className="container relative z-10 flex w-full flex-col items-center justify-center px-4 py-10 text-center text-surface sm:py-16 md:min-h-0 md:py-20">
        <h1
          className={cn(
            'mx-auto w-full max-w-6xl text-balance text-center font-display font-semibold tracking-tight text-white',
            c.titleEmph.trim() !== '' &&
              'lg:flex lg:w-fit lg:max-w-full lg:flex-row lg:flex-wrap lg:items-center lg:justify-center lg:gap-x-2.5 lg:whitespace-nowrap lg:text-[clamp(1.2rem,1.85vw,2.35rem)] xl:text-[clamp(1.35rem,2.1vw,2.65rem)]'
          )}
        >
          {c.titleTop.trim() !== '' && (
            <span className="block text-[clamp(1.35rem,6.5vw,1.85rem)] leading-[1.15] lg:inline lg:text-[length:inherit] lg:leading-[1.12]">
              {c.titleTop}
            </span>
          )}
          {c.titleEmph.trim() !== '' && (
            <span className="mt-2 block text-[clamp(0.9375rem,3.8vw,1.125rem)] font-medium leading-snug text-white/90 lg:mt-0 lg:inline lg:font-semibold lg:text-[length:inherit] lg:text-white">
              {c.titleEmph}
            </span>
          )}
        </h1>
        {c.subtitle.trim() !== '' && (
          <p className="mx-auto mt-6 max-w-2xl text-[19px] leading-relaxed text-white">{c.subtitle}</p>
        )}

        <form
          className={`mx-auto flex w-full max-w-2xl flex-col gap-3 rounded-2xl bg-surface/95 p-3 shadow-card-hover backdrop-blur sm:flex-row sm:items-center ${c.subtitle.trim() !== '' ? 'mt-10' : 'mt-8'}`}
          onSubmit={(e) => {
            e.preventDefault();
            router.push(buildSearchHref({ category }));
          }}
        >
          <label className="sr-only" htmlFor="hero-destination">{c.searchLabel}</label>
          <select
            id="hero-destination"
            value={category}
            onChange={(e) => setCategory(e.target.value)}
            className="h-12 flex-1 rounded-xl border border-border bg-background px-4 font-sans text-[15px] text-body outline-none focus-visible:ring-2 focus-visible:ring-primary"
          >
            <option value="all">{c.allOption}</option>
            {categories.map((cat) => (
              <option key={cat.id} value={cat.slug}>{cat.name_el}</option>
            ))}
          </select>
          <Button type="submit" variant="accent" size="lg" className="h-12 shrink-0">
            <Search className="h-4 w-4" strokeWidth={2} /> {c.searchCta}
          </Button>
        </form>

        <div className="mt-6">
          <Button asChild variant="accent" size="lg">
            <Link href="/kratisi">Κλείστε Online Θέση</Link>
          </Button>
        </div>

        {/* Slide indicators */}
        <div className="mt-9 flex justify-center gap-2" role="tablist" aria-label="Εικόνες προορισμών">
          {HERO_IMAGES.map((img, i) => (
            <button
              key={img.src}
              type="button"
              role="tab"
              aria-selected={i === active}
              aria-label={img.alt}
              onClick={() => setActive(i)}
              className={`h-1.5 rounded-full transition-all duration-300 ease-editorial ${
                i === active ? 'w-8 bg-gold' : 'w-2.5 bg-surface/40 hover:bg-surface/70'
              }`}
            />
          ))}
        </div>
      </div>
    </section>
  );
}
