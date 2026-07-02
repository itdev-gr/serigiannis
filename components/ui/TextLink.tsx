import { forwardRef, type ComponentPropsWithoutRef } from 'react';
import Link from 'next/link';
import { ArrowRight } from 'lucide-react';
import { cn } from '@/lib/utils';

type Props = ComponentPropsWithoutRef<typeof Link> & {
  showArrow?: boolean;
};

export const TextLink = forwardRef<HTMLAnchorElement, Props>(
  ({ className, children, showArrow = true, ...props }, ref) => (
    <Link
      ref={ref}
      className={cn(
        'group inline-flex items-center gap-1.5 font-sans font-semibold text-[14px] uppercase tracking-[0.12em] text-primary transition-colors hover:text-cta',
        className
      )}
      {...props}
    >
      <span className="relative">
        {children}
        <span className="absolute -bottom-0.5 left-0 h-px w-full origin-left scale-x-100 bg-current transition-transform duration-300 ease-editorial group-hover:scale-x-0" />
        <span className="absolute -bottom-0.5 left-0 h-px w-full origin-right scale-x-0 bg-cta transition-transform duration-300 delay-100 ease-editorial group-hover:scale-x-100 group-hover:origin-left" />
      </span>
      {showArrow && <ArrowRight className="h-4 w-4 transition-transform group-hover:translate-x-1" strokeWidth={1.75} />}
    </Link>
  )
);
TextLink.displayName = 'TextLink';
