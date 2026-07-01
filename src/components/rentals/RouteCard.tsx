// src/components/rentals/RouteCard.tsx
import { MapPin, ArrowRight, Clock } from 'lucide-react';
import type { Route } from '@/types';

export function RouteCard({ route }: { route: Route }) {
  return (
    <div className="group flex flex-col gap-5 rounded-lg border border-border bg-surface p-8 shadow-card transition-all duration-300 hover:-translate-y-1 hover:shadow-card-hover">
      <div className="flex items-center gap-3">
        <div className="grid h-11 w-11 place-items-center rounded-full bg-primary/8 text-primary transition-colors group-hover:bg-cta group-hover:text-surface">
          <MapPin className="h-5 w-5" strokeWidth={1.5} />
        </div>
        <div className="inline-flex items-center gap-1.5 text-[12px] font-medium uppercase tracking-[0.12em] text-muted">
          <Clock className="h-3.5 w-3.5" strokeWidth={1.75} />
          {route.durationHours}
        </div>
      </div>
      <div>
        <div className="font-sans text-[12px] font-semibold uppercase tracking-[0.14em] text-cta">{route.from}</div>
        <div className="mt-1 flex items-center gap-2 font-display text-2xl font-semibold text-primary">
          <ArrowRight className="h-4 w-4 opacity-40" strokeWidth={1.75} /> {route.to}
        </div>
      </div>
      <p className="text-[15px] leading-relaxed text-muted">{route.description}</p>
    </div>
  );
}
