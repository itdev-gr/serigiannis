import type { HTMLAttributes } from 'react';
import { cva, type VariantProps } from 'class-variance-authority';
import { cn } from '@/lib/utils';

const badgeVariants = cva(
  'inline-flex items-center rounded-full font-sans font-semibold uppercase tracking-[0.12em]',
  {
    variants: {
      variant: {
        sea: 'bg-sea/15 text-primary',
        olive: 'bg-olive/15 text-olive',
        cta: 'bg-cta text-surface',
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
    <div className="inline-flex items-center gap-2 rounded-full bg-cta px-4 py-2 text-surface shadow-md">
      {original !== undefined && original > from && (
        <span className="font-sans text-[13px] font-medium line-through opacity-70">{original}€</span>
      )}
      <span className="font-sans text-[16px] font-bold tabular">από {from}€</span>
    </div>
  );
}
