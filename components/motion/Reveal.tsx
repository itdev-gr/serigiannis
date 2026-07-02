'use client';
import { motion } from 'framer-motion';
import type { ReactNode } from 'react';
import { useReducedMotion } from '@/hooks/useReducedMotion';
import { fadeUp, staggerParent, VIEWPORT } from './MotionPrimitives';

/** Fade+rise a block once as it scrolls into view. */
export function Reveal({ children, className }: { children: ReactNode; className?: string }) {
  const reduced = useReducedMotion();
  if (reduced) return <div className={className}>{children}</div>;
  return (
    <motion.div className={className} variants={fadeUp} initial="hidden" whileInView="show" viewport={VIEWPORT}>
      {children}
    </motion.div>
  );
}

/** Stagger children (each wrapped in <StaggerItem>) as the group enters view. */
export function Stagger({ children, className }: { children: ReactNode; className?: string }) {
  const reduced = useReducedMotion();
  if (reduced) return <div className={className}>{children}</div>;
  return (
    <motion.div className={className} variants={staggerParent} initial="hidden" whileInView="show" viewport={VIEWPORT}>
      {children}
    </motion.div>
  );
}

export function StaggerItem({ children, className }: { children: ReactNode; className?: string }) {
  const reduced = useReducedMotion();
  if (reduced) return <div className={className}>{children}</div>;
  return (
    <motion.div className={className} variants={fadeUp}>
      {children}
    </motion.div>
  );
}
