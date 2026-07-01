// src/components/shared/RevealOnScroll.tsx
import { useRef, type ReactNode } from 'react';
import { gsap, ScrollTrigger } from '@/lib/gsap';
import { useGsapContext } from '@/hooks/useGsapContext';
import { useReducedMotion } from '@/hooks/useReducedMotion';

type Props = {
  children: ReactNode;
  selector?: string;
  stagger?: number;
  y?: number;
  className?: string;
};

export function RevealOnScroll({ children, selector = '[data-reveal]', stagger = 0.09, y = 32, className }: Props) {
  const scopeRef = useRef<HTMLDivElement>(null);
  const reduced = useReducedMotion();

  useGsapContext(() => {
    if (reduced) return;
    const targets = scopeRef.current?.querySelectorAll<HTMLElement>(selector);
    if (!targets || targets.length === 0) return;

    gsap.set(targets, { opacity: 0, y });
    ScrollTrigger.batch(Array.from(targets), {
      start: 'top 85%',
      onEnter: (batch) => gsap.to(batch, { opacity: 1, y: 0, duration: 0.8, ease: 'power3.out', stagger, overwrite: true }),
      once: true,
    });
  }, scopeRef, [reduced]);

  return <div ref={scopeRef} className={className}>{children}</div>;
}
