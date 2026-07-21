import type { ReactNode } from 'react';
import { cn } from '@/lib/utils';

type Props = {
  intro?: ReactNode;
  children: ReactNode;
  className?: string;
};

/** Full-width legal document shell — readable line length, generous vertical rhythm. */
export function LegalPageLayout({ intro, children, className }: Props) {
  return (
    <section className={cn('border-b border-border bg-background py-12 md:py-20', className)}>
      <div className="container max-w-5xl">
        {intro ? (
          <div className="mb-10 rounded-lg border border-border bg-surface px-6 py-5 text-[16px] leading-[1.75] text-body shadow-card md:mb-12 md:px-8 md:py-6 md:text-[17px] md:leading-[1.8]">
            {intro}
          </div>
        ) : null}
        <div className="rounded-lg border border-border bg-surface px-6 py-2 shadow-card md:px-10 md:py-4">{children}</div>
      </div>
    </section>
  );
}
