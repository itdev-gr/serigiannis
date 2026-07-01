// src/pages/KroyazieresPage.tsx
import { PageHero } from '@/components/shared/PageHero';
import { CruiseCard } from '@/components/cruises/CruiseCard';
import { RevealOnScroll } from '@/components/shared/RevealOnScroll';
import { Button } from '@/components/ui/Button';
import { Phone } from 'lucide-react';
import { cruises } from '@/data/cruises';

export default function KroyazieresPage() {
  return (
    <>
      <PageHero
        photo="https://images.unsplash.com/photo-1523592121529-f6dde35f079e?w=2000&q=85"
        photoAlt="Θέα των Σαρωνικών νησιών από ψηλά"
        breadcrumbs={[{ label: 'Αρχική', to: '/' }, { label: 'Κρουαζιέρες' }]}
        eyebrow="Σαρωνικός · Αργοσαρωνικός"
        title="Κρουαζιέρες από τον Πειραιά"
        subtitle="Μια μέρα, τρία νησιά, χίλιες φωτογραφίες. Οργανωμένες κρουαζιέρες με άνετα πλοία και γεύμα εν πλω."
        heightClass="h-[70vh] min-h-[520px]"
      />
      <section className="py-16 md:py-24">
        <div className="container">
          <p className="mx-auto max-w-prose text-center font-display text-[19px] italic leading-relaxed text-muted">
            Οι κρουαζιέρες μας αναχωρούν από τον Πειραιά κάθε πρωί. Επιλέξτε ανάμεσα σε ημερήσιες περιηγήσεις σε τρία νησιά ή αποκλειστικά ταξίδια κολύμβησης — μαζί με ξεναγό, γεύμα και μουσική.
          </p>
          <RevealOnScroll className="mt-16 flex flex-col gap-10">
            {cruises.map((cruise, i) => (
              <div key={cruise.id} data-reveal>
                <CruiseCard cruise={cruise} reverse={i % 2 === 1} />
              </div>
            ))}
          </RevealOnScroll>
        </div>
      </section>
      <section className="bg-primary py-16 text-surface">
        <div className="container flex flex-col items-center gap-6 text-center md:flex-row md:justify-between md:text-left">
          <div>
            <h2 className="font-display text-3xl font-semibold">Προτιμάτε να κλείσετε τηλεφωνικά;</h2>
            <p className="mt-2 text-surface/80">Καλέστε μας — απαντάμε την ίδια μέρα.</p>
          </div>
          <div className="flex flex-col gap-3 sm:flex-row">
            <Button asChild variant="ghost" size="lg">
              <a href="tel:+302105712451"><Phone className="h-4 w-4" strokeWidth={1.75}/> 210 571 2451</a>
            </Button>
            <Button asChild variant="ghost" size="lg">
              <a href="tel:+306976811825"><Phone className="h-4 w-4" strokeWidth={1.75}/> 6976 811 825</a>
            </Button>
          </div>
        </div>
      </section>
    </>
  );
}
