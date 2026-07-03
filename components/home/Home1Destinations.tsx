import Link from 'next/link';
import { ArrowUpRight } from 'lucide-react';
import type { Category, Tour } from '@/types/db';
import { coverImage, imageUrl } from '@/lib/images';
import { SectionHeading } from '@/components/shared/SectionHeading';
import { homeContent } from './content';
import type { DestinationsCopy } from './resolve-content';

function categoryImage(slug: string, tours: Tour[]): string | null {
  const match = tours.find((t) => t.categories?.some((c) => c.slug === slug));
  return match ? imageUrl(coverImage(match)) : null;
}

export function Home1Destinations({
  categories,
  tours,
  content = homeContent.destinations,
}: {
  categories: Category[];
  tours: Tour[];
  content?: DestinationsCopy;
}) {
  const c = content;
  return (
    <section className="py-24 md:py-32" aria-label={c.title}>
      <div className="container">
        <SectionHeading eyebrow={c.eyebrow} title={c.title} subtitle={c.subtitle} />
        <div className="mt-14 grid gap-5 sm:grid-cols-2 lg:grid-cols-3">
          {categories.map((cat) => {
            const img = categoryImage(cat.slug, tours);
            return (
              <Link
                key={cat.id}
                href={`/ekdromes/${cat.slug}`}
                className="group relative flex aspect-[4/5] flex-col justify-end overflow-hidden rounded-lg bg-primary/10 p-6 text-surface shadow-card transition-all duration-300 ease-editorial hover:-translate-y-1 hover:shadow-card-hover"
              >
                {img && (
                  <img
                    src={img}
                    alt=""
                    aria-hidden="true"
                    className="absolute inset-0 h-full w-full object-cover transition-transform duration-700 ease-editorial group-hover:scale-105"
                  />
                )}
                <div className="absolute inset-0 bg-gradient-to-t from-deep-ink/80 via-deep-ink/20 to-transparent" />
                <div className="relative flex items-end justify-between">
                  <h3 className="font-display text-[26px] font-semibold leading-tight">{cat.name_el}</h3>
                  <ArrowUpRight className="h-6 w-6 transition-transform group-hover:translate-x-1 group-hover:-translate-y-1" strokeWidth={1.75} />
                </div>
              </Link>
            );
          })}
        </div>
      </div>
    </section>
  );
}
