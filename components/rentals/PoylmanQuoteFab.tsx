'use client';
import { useEffect, useState } from 'react';
import { cn } from '@/lib/utils';

/** Σταθερό κουμπί κινητού που οδηγεί στη φόρμα προσφοράς. Στο κινητό η φόρμα
 *  βρίσκεται στο τέλος της σελίδας, οπότε χωρίς αυτό ο επισκέπτης θα έπρεπε να
 *  κατέβει ~2.000 λέξεις και δύο πίνακες για να τη βρει. Κρύβεται μόλις η φόρμα
 *  μπει στο κάδρο, ώστε να μην την καλύπτει. Κάτω δεξιά — το cookie banner
 *  είναι κάτω αριστερά (components/layout/CookieConsent.tsx). */
export function PoylmanQuoteFab({ targetId = 'prosfora' }: { targetId?: string }) {
  const [hidden, setHidden] = useState(false);

  useEffect(() => {
    const target = document.getElementById(targetId);
    if (!target) return;
    const io = new IntersectionObserver(([entry]) => setHidden(entry.isIntersecting), { rootMargin: '-20% 0px' });
    io.observe(target);
    return () => io.disconnect();
  }, [targetId]);

  return (
    <a
      href={`#${targetId}`}
      className={cn(
        'fixed bottom-5 right-5 z-40 inline-flex items-center justify-center rounded-full bg-gold px-5 py-3 font-sans text-[15px] font-semibold text-deep-ink shadow-card-hover transition-all duration-300 ease-editorial hover:bg-gold-hover lg:hidden',
        hidden && 'pointer-events-none translate-y-3 opacity-0'
      )}
    >
      Ζητήστε προσφορά
    </a>
  );
}
