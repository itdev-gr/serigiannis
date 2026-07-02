'use client';
import { motion } from 'framer-motion';
import { useReducedMotion } from '@/hooks/useReducedMotion';

// template.tsx re-mounts on each navigation → drives the page transition.
export default function Template({ children }: { children: React.ReactNode }) {
  const reduced = useReducedMotion();
  if (reduced) return <div id="main" tabIndex={-1}>{children}</div>;
  return (
    <motion.div
      id="main"
      tabIndex={-1}
      initial={{ opacity: 0, y: 12 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.45, ease: [0.22, 1, 0.36, 1] }}
    >
      {children}
    </motion.div>
  );
}
