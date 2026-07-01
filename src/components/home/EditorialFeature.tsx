// src/components/home/EditorialFeature.tsx
import { useRef } from 'react';
import { Link } from 'react-router-dom';
import { gsap } from '@/lib/gsap';
import { useGsapContext } from '@/hooks/useGsapContext';
import { useReducedMotion } from '@/hooks/useReducedMotion';
import { Button } from '@/components/ui/Button';

export function EditorialFeature() {
  const scopeRef = useRef<HTMLDivElement>(null);
  const reduced = useReducedMotion();

  useGsapContext(() => {
    if (reduced) return;
    gsap.fromTo(
      '[data-mask]',
      { clipPath: 'inset(0 100% 0 0)' },
      {
        clipPath: 'inset(0 0% 0 0)',
        duration: 1.4,
        ease: 'power4.out',
        scrollTrigger: { trigger: scopeRef.current!, start: 'top 70%', once: true },
      }
    );
    gsap.from('[data-editorial-text] > *', {
      y: 30,
      opacity: 0,
      stagger: 0.12,
      duration: 0.7,
      ease: 'power3.out',
      scrollTrigger: { trigger: scopeRef.current!, start: 'top 60%', once: true },
    });
  }, scopeRef, [reduced]);

  return (
    <section ref={scopeRef} className="py-24 md:py-32">
      <div className="container grid gap-12 md:grid-cols-2 md:items-center">
        <div className="relative aspect-[4/5] overflow-hidden rounded-lg">
          <div data-mask className="absolute inset-0">
            <img
              src="https://images.unsplash.com/photo-1601581875039-e899893d520c?w=1600&q=80"
              alt="Λιμάνι της Ύδρας"
              className="h-full w-full object-cover"
              loading="lazy"
            />
          </div>
        </div>
        <div data-editorial-text className="max-w-lg">
          <p className="font-sans text-[13px] font-semibold uppercase tracking-[0.18em] text-cta">Αυτό το Σαββατοκύριακο</p>
          <h2 className="mt-4 font-display text-display-section italic text-primary">Ύδρα — το νησί του Μιαούλη</h2>
          <p className="mt-6 text-[17px] leading-relaxed text-muted">
            Η Ύδρα δεν έχει αυτοκίνητα. Έχει μόνο πέτρα, φως, θάλασσα και ιστορία. Ένα ταξίδι που μοιάζει με ταινία. Καθημερινές αναχωρήσεις από τον Πειραιά, μαζί με τον έμπειρο συνοδό μας.
          </p>
          <div className="mt-8 flex flex-wrap items-center gap-6">
            <Button asChild>
              <Link to="/monoimeres">Δείτε τη Διαδρομή</Link>
            </Button>
            <div className="font-display text-lg italic text-muted">από <span className="text-2xl font-bold not-italic text-cta">25€</span></div>
          </div>
        </div>
      </div>
    </section>
  );
}
