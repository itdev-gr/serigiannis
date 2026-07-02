'use client';
import { type Variants } from 'framer-motion';

// Shared, reduced-motion-agnostic variants. Components gate on useReducedMotion.
export const fadeUp: Variants = {
  hidden: { opacity: 0, y: 28 },
  show: { opacity: 1, y: 0, transition: { duration: 0.6, ease: [0.22, 1, 0.36, 1] } },
};

export const staggerParent: Variants = {
  hidden: {},
  show: { transition: { staggerChildren: 0.09 } },
};

export const VIEWPORT = { once: true, margin: '0px 0px -80px 0px' } as const;
