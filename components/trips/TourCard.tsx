import Link from 'next/link';
import { Calendar, Clock, ArrowUpRight } from 'lucide-react';
import type { Tour } from '@/types/db';
import { PriceBadge } from '@/components/ui/Badge';
import { TourImage } from '@/components/ui/TourImage';
import { coverImage } from '@/lib/images';

export function TourCard({ tour }: { tour: Tour }) {
  const cover = coverImage(tour);
  const primaryCat = tour.categories?.find((c) => c) ?? null;
  return (
    <Link
      href={`/tour/${tour.slug}`}
      className="group relative flex flex-col overflow-hidden rounded-lg border border-border bg-surface shadow-card transition-all duration-300 ease-editorial hover:-translate-y-1 hover:shadow-card-hover"
    >
      <div className="relative aspect-[4/3] overflow-hidden bg-primary/5">
        <div className="absolute inset-0 transition-transform duration-700 ease-editorial group-hover:scale-105">
          <TourImage image={cover} alt={cover?.alt_el ?? tour.title} sizes="(max-width: 768px) 100vw, (max-width: 1024px) 50vw, 33vw" />
        </div>
        {primaryCat && (
          <div className="absolute left-4 top-4">
            <span className="glass inline-flex items-center rounded-full px-3 py-1.5 font-sans text-[11px] font-semibold uppercase tracking-[0.12em] text-primary shadow-sm">
              {primaryCat.name_el}
            </span>
          </div>
        )}
        {tour.price_from != null && (
          <div className="absolute right-3 top-3">
            <PriceBadge from={tour.price_from} original={tour.price_original ?? undefined} />
          </div>
        )}
      </div>
      <div className="flex flex-1 flex-col p-6">
        <h3 className="font-display text-[22px] font-semibold leading-tight text-primary">{tour.title}</h3>
        {tour.summary && <p className="mt-2 text-[15px] leading-relaxed text-muted line-clamp-2">{tour.summary}</p>}
        <div className="mt-5 flex flex-wrap items-center gap-4 text-[13px] font-medium text-body">
          {tour.duration_label && (
            <span className="inline-flex items-center gap-1.5"><Clock className="h-3.5 w-3.5" strokeWidth={1.75} />{tour.duration_label}</span>
          )}
          {tour.departure_note && (
            <span className="inline-flex items-center gap-1.5"><Calendar className="h-3.5 w-3.5" strokeWidth={1.75} />{tour.departure_note}</span>
          )}
        </div>
        <div className="mt-6 flex items-center justify-between border-t border-border pt-5">
          <span className="font-sans text-[13px] font-semibold uppercase tracking-[0.12em] text-primary group-hover:text-cta">Λεπτομέρειες</span>
          <ArrowUpRight className="h-4 w-4 text-primary transition-all group-hover:translate-x-1 group-hover:-translate-y-1 group-hover:text-cta" strokeWidth={1.75} />
        </div>
      </div>
    </Link>
  );
}
