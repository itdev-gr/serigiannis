// src/components/trips/TripCard.tsx
import { Link } from 'react-router-dom';
import { Calendar, Clock, ArrowUpRight } from 'lucide-react';
import type { Trip } from '@/types';
import { PriceBadge } from '@/components/ui/Badge';

const CATEGORY_LABEL: Record<Trip['category'], string> = {
  'monoimeri': 'Μονοήμερη',
  'kroyaziera': 'Κρουαζιέρα',
  'polyimeri': 'Πολυήμερη',
  'thalassia-bania': 'Θαλάσσια Μπάνια',
  'pezoporia': 'Πεζοπορία',
};

export function TripCard({ trip }: { trip: Trip }) {
  return (
    <Link
      to={`/monoimeres/${trip.slug}`}
      className="group relative flex flex-col overflow-hidden rounded-lg border border-border bg-surface shadow-card transition-all duration-300 ease-editorial hover:-translate-y-1 hover:shadow-card-hover"
    >
      <div className="relative aspect-[4/3] overflow-hidden bg-primary/5">
        <img
          src={trip.photo}
          alt={trip.photoAlt}
          loading="lazy"
          className="h-full w-full object-cover transition-transform duration-700 ease-editorial group-hover:scale-105"
        />
        <div className="absolute left-4 top-4">
          <span className="inline-flex items-center rounded-full bg-surface/95 px-3 py-1.5 font-sans text-[11px] font-semibold uppercase tracking-[0.12em] text-primary shadow-sm backdrop-blur">
            {CATEGORY_LABEL[trip.category]}
          </span>
        </div>
        <div className="absolute right-3 top-3">
          <PriceBadge from={trip.priceFrom} original={trip.priceOriginal} />
        </div>
      </div>
      <div className="flex flex-1 flex-col p-6">
        <h3 className="font-display text-[22px] font-semibold leading-tight text-primary">{trip.title}</h3>
        <p className="mt-2 text-[15px] leading-relaxed text-muted line-clamp-2">{trip.description}</p>
        <div className="mt-5 flex flex-wrap items-center gap-4 text-[13px] text-muted">
          <span className="inline-flex items-center gap-1.5"><Clock className="h-3.5 w-3.5" strokeWidth={1.75} />{trip.duration}</span>
          <span className="inline-flex items-center gap-1.5"><Calendar className="h-3.5 w-3.5" strokeWidth={1.75} />{trip.dates}</span>
        </div>
        <div className="mt-6 flex items-center justify-between border-t border-border pt-5">
          <span className="font-sans text-[13px] font-semibold uppercase tracking-[0.12em] text-primary group-hover:text-cta">Λεπτομέρειες</span>
          <ArrowUpRight className="h-4 w-4 text-primary transition-all group-hover:translate-x-1 group-hover:-translate-y-1 group-hover:text-cta" strokeWidth={1.75} />
        </div>
      </div>
    </Link>
  );
}
