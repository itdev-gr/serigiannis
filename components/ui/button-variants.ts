import { cva } from 'class-variance-authority';

export const buttonVariants = cva(
  'inline-flex items-center justify-center gap-2 whitespace-nowrap rounded-md font-sans font-semibold text-[15px] tracking-[0.02em] transition-all duration-200 ease-editorial focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary focus-visible:ring-offset-2 focus-visible:ring-offset-background disabled:pointer-events-none disabled:opacity-50 cursor-pointer',
  {
    variants: {
      variant: {
        primary: 'bg-cta text-surface shadow-cta hover:bg-cta-hover hover:-translate-y-0.5 hover:shadow-lg active:translate-y-0',
        ghost: 'border border-surface/60 bg-transparent text-surface hover:bg-surface hover:text-primary',
        outline: 'border border-primary/20 bg-transparent text-primary hover:bg-primary hover:text-surface',
        dark: 'bg-primary text-surface hover:bg-primary-hover',
      },
      size: {
        default: 'h-11 px-6',
        sm: 'h-9 px-4 text-[13px]',
        lg: 'h-14 px-8 text-[16px]',
      },
    },
    defaultVariants: { variant: 'primary', size: 'default' },
  }
);
