// src/components/rentals/UseCaseCard.tsx
import * as Lucide from 'lucide-react';
import type { UseCase } from '@/types';

export function UseCaseCard({ item }: { item: UseCase }) {
  const Icon = (Lucide[item.icon as keyof typeof Lucide] as Lucide.LucideIcon) ?? Lucide.Bus;
  return (
    <div className="rounded-lg border border-border bg-surface p-8 text-center shadow-card">
      <div className="mx-auto grid h-14 w-14 place-items-center rounded-full bg-cta/10 text-cta">
        <Icon className="h-6 w-6" strokeWidth={1.5} />
      </div>
      <h3 className="mt-6 font-display text-2xl font-semibold text-primary">{item.title}</h3>
      <p className="mt-3 text-[15px] leading-relaxed text-muted">{item.description}</p>
    </div>
  );
}
