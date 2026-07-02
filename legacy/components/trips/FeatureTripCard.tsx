// src/components/trips/FeatureTripCard.tsx
import { Link } from 'react-router-dom';
import { ArrowUpRight } from 'lucide-react';
import type { Trip } from '@/types';
import { PriceBadge } from '@/components/ui/Badge';
import { cn } from '@/lib/utils';

export function FeatureTripCard({ trip, size = 'lg' }: { trip: Trip; size?: 'lg' | 'sm' }) {
  return (
    <Link
      to={`/monoimeres/${trip.slug}`}
      className={cn(
        'group relative block overflow-hidden rounded-lg',
        size === 'lg' ? 'aspect-[5/6] lg:aspect-[4/5]' : 'aspect-[4/3]'
      )}
    >
      <img src={trip.photo} alt={trip.photoAlt} className="absolute inset-0 h-full w-full object-cover transition-transform duration-700 ease-editorial group-hover:scale-105" loading="lazy" />
      <div className="absolute inset-0 bg-gradient-to-t from-deep-ink via-deep-ink/30 to-transparent" />

      <div className="absolute right-4 top-4">
        <PriceBadge from={trip.priceFrom} original={trip.priceOriginal} />
      </div>

      <div className={cn('absolute inset-x-0 bottom-0 flex flex-col text-surface', size === 'lg' ? 'p-8 lg:p-10' : 'p-6')}>
        <p className="mb-2 font-sans text-[11px] font-semibold uppercase tracking-[0.18em] text-cta">
          {trip.duration} · {trip.dates}
        </p>
        <h3 className={cn('font-display font-semibold text-balance leading-[1.1]', size === 'lg' ? 'text-4xl lg:text-5xl' : 'text-2xl')}>
          {trip.title}
        </h3>
        {size === 'lg' && <p className="mt-3 max-w-md text-[15px] leading-relaxed text-surface/85">{trip.description}</p>}
        <div className="mt-6 flex items-center gap-2 font-sans text-[13px] font-semibold uppercase tracking-[0.12em]">
          <span>Ανακαλύψτε τη διαδρομή</span>
          <ArrowUpRight className="h-4 w-4 transition-transform group-hover:translate-x-1 group-hover:-translate-y-1" strokeWidth={1.75} />
        </div>
      </div>
    </Link>
  );
}
