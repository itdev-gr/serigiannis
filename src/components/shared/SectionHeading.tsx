// src/components/shared/SectionHeading.tsx
import type { ReactNode } from 'react';
import { cn } from '@/lib/utils';

type Props = {
  eyebrow?: string;
  title: string;
  subtitle?: string;
  align?: 'left' | 'center';
  invert?: boolean;
  action?: ReactNode;
};

export function SectionHeading({ eyebrow, title, subtitle, align = 'left', invert = false, action }: Props) {
  return (
    <div className={cn('flex flex-col gap-4 md:flex-row md:items-end md:justify-between', align === 'center' && 'md:flex-col md:items-center md:text-center')}>
      <div className={cn('max-w-2xl', align === 'center' && 'mx-auto')}>
        {eyebrow && (
          <p className={cn('mb-3 font-sans text-[13px] font-medium uppercase tracking-[0.14em]', invert ? 'text-sea' : 'text-cta')}>
            {eyebrow}
          </p>
        )}
        <h2 className={cn('font-display text-display-section', invert ? 'text-surface' : 'text-primary')}>{title}</h2>
        {subtitle && (
          <p className={cn('mt-4 text-[17px] leading-relaxed', invert ? 'text-surface/80' : 'text-muted')}>{subtitle}</p>
        )}
      </div>
      {action && <div className="shrink-0">{action}</div>}
    </div>
  );
}
