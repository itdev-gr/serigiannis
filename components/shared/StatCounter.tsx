'use client';
import { useRef } from 'react';
import { gsap, ScrollTrigger } from '@/lib/gsap';
import { useGsapContext } from '@/hooks/useGsapContext';
import { useReducedMotion } from '@/hooks/useReducedMotion';
import type { Stat } from '@/data/site';

export function StatCounter({ stat }: { stat: Stat }) {
  const scopeRef = useRef<HTMLDivElement>(null);
  const reduced = useReducedMotion();

  useGsapContext(() => {
    const numberEl = scopeRef.current?.querySelector<HTMLElement>('[data-value]');
    if (!numberEl) return;

    if (reduced) {
      numberEl.textContent = stat.value.toLocaleString('el-GR') + (stat.suffix ?? '');
      return;
    }

    const counter = { val: 0 };
    gsap.to(counter, {
      val: stat.value,
      duration: 1.8,
      ease: 'power2.out',
      scrollTrigger: {
        trigger: scopeRef.current!,
        start: 'top bottom-=40',
        once: true,
      },
      onUpdate: () => {
        const displayed = Math.round(counter.val).toLocaleString('el-GR');
        numberEl.textContent = displayed + (stat.suffix ?? '');
      },
    });
    requestAnimationFrame(() => ScrollTrigger.refresh());
  }, scopeRef, [reduced]);

  return (
    <div ref={scopeRef} className="text-center md:text-left">
      <div className="font-display text-6xl font-bold text-gold tabular md:text-7xl">
        <span data-value>0</span>
      </div>
      <div className="mt-3 font-sans text-[12px] font-semibold uppercase tracking-[0.18em] text-surface/70">{stat.label}</div>
    </div>
  );
}
