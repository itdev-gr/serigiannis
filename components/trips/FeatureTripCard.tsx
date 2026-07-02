import Link from 'next/link';
import { ArrowUpRight } from 'lucide-react';
import type { Tour } from '@/types/db';
import { PriceBadge } from '@/components/ui/Badge';
import { TourImage } from '@/components/ui/TourImage';
import { coverImage } from '@/lib/images';
import { cn } from '@/lib/utils';

export function FeatureTripCard({ tour, size = 'lg' }: { tour: Tour; size?: 'lg' | 'sm' }) {
  const cover = coverImage(tour);
  const meta = [tour.duration_label, tour.departure_note].filter(Boolean).join(' · ');
  return (
    <Link
      href={`/tour/${tour.slug}`}
      className={cn(
        'group relative block overflow-hidden rounded-md',
        size === 'lg' ? 'aspect-[5/6] lg:aspect-[4/5]' : 'aspect-[4/3]'
      )}
    >
      <div className="absolute inset-0 transition-transform duration-700 ease-editorial group-hover:scale-105">
        <TourImage
          image={cover}
          alt={cover?.alt_el ?? tour.title}
          sizes={size === 'lg' ? '(max-width: 1024px) 100vw, 58vw' : '(max-width: 1024px) 100vw, 42vw'}
        />
      </div>
      <div className="absolute inset-0 bg-gradient-to-t from-deep-ink via-deep-ink/30 to-transparent" />

      {tour.price_from != null && (
        <div className="absolute right-4 top-4">
          <PriceBadge from={tour.price_from} original={tour.price_original ?? undefined} />
        </div>
      )}

      <div className={cn('absolute inset-x-0 bottom-0 flex flex-col text-surface', size === 'lg' ? 'p-8 lg:p-10' : 'p-6')}>
        {meta && (
          <p className="mb-2 font-sans text-[11px] font-semibold uppercase tracking-[0.18em] text-cta">{meta}</p>
        )}
        <h3 className={cn('font-display font-semibold text-balance leading-[1.1]', size === 'lg' ? 'text-4xl lg:text-5xl' : 'text-2xl')}>
          {tour.title}
        </h3>
        {size === 'lg' && tour.summary && <p className="mt-3 max-w-md text-[15px] leading-relaxed text-surface/85">{tour.summary}</p>}
        <div className="mt-6 flex items-center gap-2 font-sans text-[13px] font-semibold uppercase tracking-[0.12em]">
          <span>Ανακαλύψτε τη διαδρομή</span>
          <ArrowUpRight className="h-4 w-4 transition-transform group-hover:translate-x-1 group-hover:-translate-y-1" strokeWidth={1.75} />
        </div>
      </div>
    </Link>
  );
}
