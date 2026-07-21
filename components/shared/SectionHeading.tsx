import type { ReactNode } from 'react';
import { cn } from '@/lib/utils';

type Props = {
  eyebrow?: string;
  title: string;
  subtitle?: string;
  align?: 'left' | 'center';
  invert?: boolean;
  action?: ReactNode;
  subtitleClassName?: string;
  contentClassName?: string;
  titleClassName?: string;
};

export function SectionHeading({ eyebrow, title, subtitle, align = 'left', invert = false, action, subtitleClassName, contentClassName, titleClassName }: Props) {
  return (
    <div className={cn('flex flex-col gap-4 md:flex-row md:items-end md:justify-between', align === 'center' && 'items-center text-center md:flex-col')}>
      <div className={cn('max-w-2xl', align === 'center' && 'mx-auto', contentClassName)}>
        {eyebrow && (
          <p className={cn('mb-3 font-sans text-[13px] font-medium uppercase tracking-[0.14em]', invert ? 'text-sea' : 'text-cta')}>
            {eyebrow}
          </p>
        )}
        <h2
          className={cn(
            'font-display',
            !titleClassName && 'text-display-section',
            invert ? 'text-surface' : 'text-primary',
            titleClassName
          )}
        >
          {title}
        </h2>
        {subtitle && (
          <p className={cn('mt-4 text-[17px] leading-relaxed', subtitleClassName, !subtitleClassName && (invert ? 'text-surface/80' : 'text-muted'))}>{subtitle}</p>
        )}
      </div>
      {action && <div className="shrink-0">{action}</div>}
    </div>
  );
}
