import type { Metadata } from 'next';
import Link from 'next/link';
import { Phone } from 'lucide-react';
import { PageHero } from '@/components/shared/PageHero';
import { TourCard } from '@/components/trips/TourCard';
import { RevealOnScroll } from '@/components/shared/RevealOnScroll';
import { Button } from '@/components/ui/Button';
import { getTours } from '@/lib/queries/tours';

export const metadata: Metadata = {
  title: 'Κρουαζιέρες από τον Πειραιά',
  description: 'Οργανωμένες κρουαζιέρες στον Σαρωνικό και τις Σποράδες — μια μέρα, πολλά νησιά, με γεύμα εν πλω.',
};

export default async function KroyazieresPage() {
  const tours = await getTours();
  const cruises = tours.filter((t) => t.categories?.some((c) => c.slug === 'kroyazieres'));

  return (
    <>
      <PageHero
        eyebrow="Σαρωνικός · Αργοσαρωνικός"
        title="Κρουαζιέρες από τον Πειραιά"
        subtitle="Μια μέρα, πολλά νησιά, χίλιες φωτογραφίες. Οργανωμένες κρουαζιέρες με άνετα πλοία και γεύμα εν πλω."
        breadcrumbs={[{ label: 'Αρχική', href: '/' }, { label: 'Κρουαζιέρες' }]}
        heightClass="h-[58vh] min-h-[460px]"
      />
      <section className="py-16 md:py-24">
        <div className="container">
          <p className="mx-auto max-w-prose text-center font-display text-[19px] italic leading-relaxed text-muted">
            Οι κρουαζιέρες μας αναχωρούν από τον Πειραιά κάθε πρωί — ημερήσιες περιηγήσεις σε νησιά ή ταξίδια κολύμβησης, μαζί με ξεναγό, γεύμα και μουσική.
          </p>
          {cruises.length > 0 ? (
            <RevealOnScroll className="mt-14 grid gap-6 md:grid-cols-2 lg:grid-cols-3">
              {cruises.map((t) => (
                <div key={t.id} data-reveal><TourCard tour={t} /></div>
              ))}
            </RevealOnScroll>
          ) : (
            <p className="mt-14 text-center text-muted">Ετοιμάζουμε το πρόγραμμα κρουαζιέρων. Καλέστε μας για πληροφορίες.</p>
          )}
        </div>
      </section>
      <section className="bg-primary py-16 text-surface">
        <div className="container flex flex-col items-center gap-6 text-center md:flex-row md:justify-between md:text-left">
          <div>
            <h2 className="font-display text-3xl font-semibold">Προτιμάτε να κλείσετε τηλεφωνικά;</h2>
            <p className="mt-2 text-surface/80">Καλέστε μας — απαντάμε την ίδια μέρα.</p>
          </div>
          <div className="flex flex-col gap-3 sm:flex-row">
            <Button asChild variant="ghost" size="lg"><a href="tel:+302105712451"><Phone className="h-4 w-4" strokeWidth={1.75}/> 210 571 2451</a></Button>
            <Button asChild variant="ghost" size="lg"><Link href="/epikoinonia">Στείλτε μήνυμα</Link></Button>
          </div>
        </div>
      </section>
    </>
  );
}
