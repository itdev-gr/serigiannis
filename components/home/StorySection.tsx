'use client';
import { useRef } from 'react';
import { gsap } from '@/lib/gsap';
import { useGsapContext } from '@/hooks/useGsapContext';
import { useReducedMotion } from '@/hooks/useReducedMotion';

const PANELS = [
  {
    eyebrow: 'Από το 1995',
    title: 'Τριάντα χρόνια εμπειρίας',
    text: 'Χιλιάδες ταξιδιώτες μάς εμπιστεύτηκαν για τις αποδράσεις τους σε όλη την Ελλάδα — και επιστρέφουν κάθε χρόνο.',
  },
  {
    eyebrow: 'Προορισμοί',
    title: 'Από την Αθήνα, παντού',
    text: 'Μονοήμερες, πολυήμερες, κρουαζιέρες, θαλάσσια μπάνια και εξωτερικό — όλα οργανωμένα από την αρχή ως το τέλος.',
  },
  {
    eyebrow: 'Άνεση & Ασφάλεια',
    title: 'Σύγχρονα πούλμαν, έμπειροι συνοδοί',
    text: 'Ταξιδεύετε άνετα και με ασφάλεια, με ξεκάθαρες τιμές και χωρίς κρυφές χρεώσεις.',
  },
];

export function StorySection() {
  const sectionRef = useRef<HTMLElement>(null);
  const trackRef = useRef<HTMLDivElement>(null);
  const reduced = useReducedMotion();

  useGsapContext(() => {
    if (reduced) return;
    const track = trackRef.current;
    if (!track) return;
    const panels = gsap.utils.toArray<HTMLElement>('.story-panel', track);
    if (panels.length < 2) return;
    gsap.to(panels, {
      xPercent: -100 * (panels.length - 1),
      ease: 'none',
      scrollTrigger: {
        trigger: sectionRef.current!,
        pin: true,
        scrub: 1,
        end: () => '+=' + track.scrollWidth,
      },
    });
  }, sectionRef, [reduced]);

  return (
    <section
      ref={sectionRef}
      className={`relative bg-deep-ink text-surface ${reduced ? '' : 'overflow-hidden'}`}
      aria-label="Γιατί Sergiani Travel"
    >
      <div className="pointer-events-none absolute inset-0 bg-[radial-gradient(60%_60%_at_80%_20%,rgba(0,81,157,0.5),transparent_60%)]" />
      <div ref={trackRef} className={reduced ? 'relative flex flex-col' : 'relative flex h-screen min-h-[600px]'}>
        {PANELS.map((p, i) => (
          <div
            key={i}
            className={
              reduced
                ? 'w-full border-b border-surface/10 py-16'
                : 'story-panel flex h-full w-screen shrink-0 items-center'
            }
          >
            <div className="container max-w-4xl">
              <p className="font-sans text-[13px] font-semibold uppercase tracking-[0.2em] text-gold">{p.eyebrow}</p>
              <h2 className="mt-4 font-display text-4xl font-bold leading-[1.1] text-surface md:text-6xl">{p.title}</h2>
              <p className="mt-6 max-w-2xl text-[18px] leading-relaxed text-surface/80 md:text-[20px]">{p.text}</p>
              <div className="mt-10 flex items-center gap-4 text-surface/40">
                <span className="font-display text-2xl font-bold text-gold">0{i + 1}</span>
                <span className="h-px w-16 bg-surface/20" />
                <span className="font-sans text-[13px] uppercase tracking-[0.14em]">0{PANELS.length}</span>
                {!reduced && i === 0 && (
                  <span className="ml-4 hidden font-sans text-[12px] uppercase tracking-[0.14em] text-surface/50 md:inline">
                    Κυλήστε →
                  </span>
                )}
              </div>
            </div>
          </div>
        ))}
      </div>
    </section>
  );
}
