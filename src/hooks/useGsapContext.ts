// src/hooks/useGsapContext.ts
import { useLayoutEffect, useRef, type RefObject } from 'react';
import { gsap } from 'gsap';

/**
 * Runs a GSAP setup function scoped to `scopeRef`. All tweens and ScrollTriggers
 * created inside are automatically reverted on unmount.
 */
export function useGsapContext(
  setup: (ctx: gsap.Context) => void,
  scopeRef: RefObject<HTMLElement>,
  deps: unknown[] = []
) {
  const ctxRef = useRef<gsap.Context | null>(null);

  useLayoutEffect(() => {
    if (!scopeRef.current) return;
    ctxRef.current = gsap.context(setup, scopeRef.current);
    return () => {
      ctxRef.current?.revert();
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, deps);
}
