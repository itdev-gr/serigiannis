'use client';
import { useEffect, useRef, useState } from 'react';
import Link from 'next/link';
import { ChevronLeft, ChevronRight } from 'lucide-react';
import { TourCard } from '@/components/trips/TourCard';
import { useReducedMotion } from '@/hooks/useReducedMotion';
import type { Tour } from '@/types/db';
import { cn } from '@/lib/utils';

const ARROW =
  'absolute top-1/2 z-20 grid h-11 w-11 -translate-y-1/2 place-items-center rounded-full border border-border bg-surface/95 text-primary shadow-card backdrop-blur transition hover:border-primary hover:bg-primary hover:text-surface hover:shadow-card-hover focus:outline-none focus-visible:ring-4 focus-visible:ring-primary/25 motion-reduce:transition-none';

// Πόσες κάρτες χωρούν ανά breakpoint: 1 / 2 / 3 / 4. Ρητές κλάσεις, γιατί το
// Tailwind δεν βλέπει δυναμικά ονόματα.
const CARD =
  'w-[85%] shrink-0 snap-start sm:w-[calc((100%-1.5rem)/2)] lg:w-[calc((100%-3rem)/3)] xl:w-[calc((100%-4.5rem)/4)]';

/** Κρύβει βέλη και σκιάσεις εκεί που οι κάρτες χωράνε ούτως ή άλλως: με 2
 *  κάρτες δεν υπάρχει τίποτα να κυλήσει από το `sm` και πάνω, κ.ο.κ. */
function hideWhenItFits(count: number): string {
  if (count <= 2) return 'sm:hidden';
  if (count <= 3) return 'lg:hidden';
  if (count <= 4) return 'xl:hidden';
  return '';
}

/** Οι «Παρόμοιες εκδρομές» ως οριζόντιο carousel: κύλιση με snap (φυσική σε
 *  touch/trackpad), βέλη που προχωρούν μία «σελίδα» και γυρίζουν κυκλικά. */
export function RelatedToursCarousel({ tours }: { tours: Tour[] }) {
  const trackRef = useRef<HTMLDivElement>(null);
  const reduced = useReducedMotion();
  // Λεπτή μπάρα προόδου αντί για κουκκίδες: οι ορατές κάρτες αλλάζουν ανά
  // breakpoint, οπότε ένας σταθερός αριθμός κουκκίδων θα έλεγε ψέματα.
  const [rail, setRail] = useState({ visible: false, width: 0, offset: 0 });

  useEffect(() => {
    const el = trackRef.current;
    if (!el) return;
    const measure = () => {
      const { scrollWidth, clientWidth, scrollLeft } = el;
      if (scrollWidth <= clientWidth + 1) {
        setRail((r) => (r.visible ? { visible: false, width: 0, offset: 0 } : r));
        return;
      }
      setRail({
        visible: true,
        width: (clientWidth / scrollWidth) * 100,
        offset: (scrollLeft / scrollWidth) * 100,
      });
    };
    measure();
    el.addEventListener('scroll', measure, { passive: true });
    window.addEventListener('resize', measure);
    return () => {
      el.removeEventListener('scroll', measure);
      window.removeEventListener('resize', measure);
    };
  }, [tours.length]);

  if (tours.length === 0) return null;

  // Μία «σελίδα» = το ορατό πλάτος. Στα άκρα τυλίγει: μετά την τελευταία κάρτα
  // πάει στην πρώτη και αντίστροφα.
  const page = (dir: 1 | -1) => {
    const el = trackRef.current;
    if (!el) return;
    const max = Math.max(0, el.scrollWidth - el.clientWidth);
    const behavior: ScrollBehavior = reduced ? 'auto' : 'smooth';
    let left: number;
    if (dir === 1) left = el.scrollLeft >= max - 1 ? 0 : Math.min(max, el.scrollLeft + el.clientWidth);
    else left = el.scrollLeft <= 1 ? max : Math.max(0, el.scrollLeft - el.clientWidth);
    el.scrollTo({ left, behavior });
  };

  const fits = hideWhenItFits(tours.length);
  const scrollable = tours.length > 1;

  return (
    <section className="bg-surface py-16 md:py-24" data-testid="related-section">
      <div className="container">
        <div className="mb-10 flex items-end justify-between gap-6">
          <h2 className="font-display text-display-section text-primary">Παρόμοιες εκδρομές</h2>
          <Link
            href="/ekdromes"
            className="shrink-0 font-sans text-[14px] font-semibold text-primary transition-colors hover:text-cta motion-reduce:transition-none"
          >
            Δείτε όλες →
          </Link>
        </div>

        <div className="relative" data-testid="related-carousel">
          <div
            ref={trackRef}
            data-testid="related-track"
            role="region"
            aria-label="Παρόμοιες εκδρομές, οριζόντια λίστα"
            tabIndex={0}
            onKeyDown={(e) => {
              if (e.key !== 'ArrowRight' && e.key !== 'ArrowLeft') return;
              e.preventDefault();
              page(e.key === 'ArrowRight' ? 1 : -1);
            }}
            className="scrollbar-hide snap-x snap-mandatory overflow-x-auto rounded-lg focus:outline-none focus-visible:ring-4 focus-visible:ring-primary/20"
          >
            {/* py-3: το hover lift και η σκιά της κάρτας θέλουν αέρα, αλλιώς τα κόβει η κύλιση. */}
            <ul className="flex items-stretch gap-6 py-3">
              {tours.map((t) => (
                <li key={t.id} data-testid="related-card" className={CARD}>
                  <TourCard tour={t} />
                </li>
              ))}
            </ul>
          </div>

          {scrollable && (
            <>
              {/* Σκιάσεις στα άκρα: δείχνουν ότι η λίστα συνεχίζεται. */}
              <div
                aria-hidden
                className={cn(
                  'pointer-events-none absolute inset-y-0 left-0 z-10 w-6 bg-gradient-to-r from-surface to-transparent sm:w-10',
                  fits
                )}
              />
              <div
                aria-hidden
                className={cn(
                  'pointer-events-none absolute inset-y-0 right-0 z-10 w-6 bg-gradient-to-l from-surface to-transparent sm:w-10',
                  fits
                )}
              />
              <button
                type="button"
                data-testid="related-prev"
                onClick={() => page(-1)}
                aria-label="Προηγούμενες εκδρομές"
                className={cn(ARROW, 'left-1 lg:-left-5', fits)}
              >
                <ChevronLeft className="h-5 w-5" strokeWidth={2.25} />
              </button>
              <button
                type="button"
                data-testid="related-next"
                onClick={() => page(1)}
                aria-label="Επόμενες εκδρομές"
                className={cn(ARROW, 'right-1 lg:-right-5', fits)}
              >
                <ChevronRight className="h-5 w-5" strokeWidth={2.25} />
              </button>
            </>
          )}
        </div>

        {rail.visible && (
          <div
            data-testid="related-rail"
            aria-hidden
            className="relative mx-auto mt-8 h-1 w-40 overflow-hidden rounded-full bg-primary/10"
          >
            <span
              className="absolute inset-y-0 rounded-full bg-primary/60 transition-[left,width] duration-300 ease-editorial motion-reduce:transition-none"
              style={{ width: `${rail.width}%`, left: `${rail.offset}%` }}
            />
          </div>
        )}
      </div>
    </section>
  );
}
