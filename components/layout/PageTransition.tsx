'use client';
import { useRef, type ReactNode } from 'react';
import { usePathname } from 'next/navigation';
import { gsap } from '@/lib/gsap';
import { useGsapContext } from '@/hooks/useGsapContext';
import { useReducedMotion } from '@/hooks/useReducedMotion';

export function PageTransition({ children }: { children: ReactNode }) {
  const containerRef = useRef<HTMLDivElement>(null);
  const pathname = usePathname();
  const reduced = useReducedMotion();

  useGsapContext(() => {
    if (reduced) return;
    gsap.fromTo(
      containerRef.current,
      { opacity: 0, y: 16 },
      { opacity: 1, y: 0, duration: 0.55, ease: 'power3.out' }
    );
    window.scrollTo({ top: 0, behavior: 'instant' as ScrollBehavior });
  }, containerRef, [pathname]);

  return (
    <div ref={containerRef} id="main" tabIndex={-1}>
      {children}
    </div>
  );
}
