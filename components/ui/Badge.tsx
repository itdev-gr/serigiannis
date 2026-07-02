import type { HTMLAttributes } from 'react';
import { cva, type VariantProps } from 'class-variance-authority';
import { cn } from '@/lib/utils';

const badgeVariants = cva(
  'inline-flex items-center rounded-full font-sans font-semibold uppercase tracking-[0.12em]',
  {
    variants: {
      variant: {
        sea: 'bg-cta/10 text-cta',
        olive: 'bg-olive/15 text-olive',
        cta: 'bg-cta text-surface',
        gold: 'bg-gold text-primary',
        surface: 'bg-surface/95 text-primary shadow-sm',
      },
      size: {
        default: 'h-7 px-3 text-[11px]',
        lg: 'h-9 px-4 text-[13px]',
      },
    },
    defaultVariants: { variant: 'sea', size: 'default' },
  }
);

interface BadgeProps extends HTMLAttributes<HTMLSpanElement>, VariantProps<typeof badgeVariants> {}

export function Badge({ className, variant, size, ...props }: BadgeProps) {
  return <span className={cn(badgeVariants({ variant, size, className }))} {...props} />;
}

export function PriceBadge({ from, original }: { from: number; original?: number }) {
  return (
    <div className="inline-flex items-center gap-2 rounded-full bg-surface/95 px-3.5 py-1.5 shadow-sm backdrop-blur">
      {original !== undefined && original > from && (
        <span className="font-sans text-[13px] font-medium text-muted line-through">{original}€</span>
      )}
      <span className="font-sans text-[15px] font-bold text-cta tabular">από {from}€</span>
    </div>
  );
}
