// src/components/cruises/CruiseCard.tsx
import { Link } from 'react-router-dom';
import { Waves, Clock, Calendar } from 'lucide-react';
import type { Cruise } from '@/types';
import { Button } from '@/components/ui/Button';
import { Badge } from '@/components/ui/Badge';
import { cn } from '@/lib/utils';

export function CruiseCard({ cruise, reverse = false }: { cruise: Cruise; reverse?: boolean }) {
  return (
    <article className="group grid overflow-hidden rounded-lg border border-border bg-surface shadow-card md:grid-cols-2 md:min-h-[420px]">
      <div className={cn('relative overflow-hidden bg-primary/5', reverse && 'md:order-2')}>
        <img src={cruise.photo} alt={cruise.photoAlt} className="h-full w-full object-cover transition-transform duration-700 ease-editorial group-hover:scale-105" loading="lazy" />
      </div>
      <div className={cn('flex flex-col justify-between gap-8 p-8 md:p-12', reverse && 'md:order-1')}>
        <div>
          <div className="mb-4 flex items-center gap-3">
            <Badge variant="olive">{cruise.routeTag}</Badge>
            <span className="inline-flex items-center gap-1.5 text-[13px] text-muted">
              <Clock className="h-3.5 w-3.5" strokeWidth={1.75} />{cruise.duration}
            </span>
          </div>
          <h3 className="font-display text-3xl font-semibold leading-tight text-primary md:text-4xl">
            {cruise.title}
          </h3>
          <p className="mt-4 text-[16px] leading-relaxed text-muted">{cruise.description}</p>
          <div className="mt-6 flex items-center gap-2 text-[13px] text-muted">
            <Waves className="h-4 w-4 text-sea" strokeWidth={1.75} />
            {cruise.islands.map((island, i) => (
              <span key={island} className="inline-flex items-center gap-2">
                {island}
                {i < cruise.islands.length - 1 && <span className="text-primary/30">·</span>}
              </span>
            ))}
          </div>
          <div className="mt-5 flex items-center gap-2 text-[13px] text-muted">
            <Calendar className="h-4 w-4 text-sea" strokeWidth={1.75} />
            {cruise.dates}
          </div>
        </div>
        <div className="flex items-end justify-between gap-4 border-t border-border pt-6">
          <div>
            <div className="font-sans text-[11px] uppercase tracking-[0.12em] text-muted">Από</div>
            <div className="font-display text-4xl font-bold text-cta tabular">{cruise.priceFrom}€</div>
          </div>
          <Button asChild variant="dark">
            <Link to={`/kroyazieres/${cruise.slug}`}>Κράτηση</Link>
          </Button>
        </div>
      </div>
    </article>
  );
}
