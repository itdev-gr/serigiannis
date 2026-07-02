'use client';
import { useState } from 'react';
import { useRouter } from 'next/navigation';
import { Search } from 'lucide-react';
import type { Category } from '@/types/db';
import { Button } from '@/components/ui/Button';
import { homeContent } from './content';
import { buildSearchHref } from './home-search';

const HERO_SRC = `${process.env.NEXT_PUBLIC_SUPABASE_URL}/storage/v1/object/public/tour-images/site/home-hero.jpg`;

export function Home1Hero({ categories }: { categories: Category[] }) {
  const c = homeContent.hero;
  const router = useRouter();
  const [category, setCategory] = useState('all');

  return (
    <section className="relative flex min-h-[92vh] w-full items-center overflow-hidden bg-deep-ink">
      <div
        className="absolute inset-0 bg-cover bg-center"
        style={{ backgroundImage: `url(${HERO_SRC})` }}
        aria-hidden="true"
      />
      <div className="absolute inset-0 bg-gradient-to-b from-deep-ink/45 via-deep-ink/35 to-deep-ink/85" />
      <div className="container relative z-10 py-32 text-center text-surface">
        <p className="mx-auto mb-6 inline-flex items-center gap-3 rounded-full border border-surface/25 bg-surface/10 px-4 py-2 font-sans text-[11px] font-semibold uppercase tracking-[0.2em] backdrop-blur-sm">
          <span className="h-1.5 w-1.5 rounded-full bg-gold" />
          {c.eyebrow}
        </p>
        <h1 className="mx-auto max-w-4xl font-display text-display-hero leading-[1.02] text-balance">
          {c.titleTop}<br />
          <span className="italic text-gold">{c.titleEmph}</span>
        </h1>
        <p className="mx-auto mt-6 max-w-2xl text-[19px] leading-relaxed text-surface/85">{c.subtitle}</p>

        <form
          className="mx-auto mt-10 flex w-full max-w-2xl flex-col gap-3 rounded-2xl bg-surface/95 p-3 shadow-card-hover backdrop-blur sm:flex-row sm:items-center"
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

        <p className="mt-6 font-sans text-[13px] uppercase tracking-[0.14em] text-surface/70">{c.bookedNote}</p>
      </div>
    </section>
  );
}
