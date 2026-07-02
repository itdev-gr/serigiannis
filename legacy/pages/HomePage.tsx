// src/pages/HomePage.tsx
import { Link } from 'react-router-dom';
import { Phone } from 'lucide-react';
import { HomeHero } from '@/components/home/HomeHero';
import { CategoryStrip } from '@/components/home/CategoryStrip';
import { EditorialFeature } from '@/components/home/EditorialFeature';
import { FeatureTripCard } from '@/components/trips/FeatureTripCard';
import { CruiseCard } from '@/components/cruises/CruiseCard';
import { StatCounter } from '@/components/shared/StatCounter';
import { TestimonialBlock } from '@/components/shared/TestimonialBlock';
import { SectionHeading } from '@/components/shared/SectionHeading';
import { RevealOnScroll } from '@/components/shared/RevealOnScroll';
import { TextLink } from '@/components/ui/TextLink';
import { Button } from '@/components/ui/Button';
import { trips } from '@/data/trips';
import { cruises } from '@/data/cruises';
import { testimonials } from '@/data/testimonials';
import { stats } from '@/data/stats';

export default function HomePage() {
  const featured = trips.filter((t) => t.featured);
  const [large, ...rest] = featured;
  const otherFeatured = rest.slice(0, 2);

  return (
    <>
      <HomeHero />
      <CategoryStrip />

      {/* Featured trips */}
      <section className="py-24 md:py-32">
        <div className="container">
          <SectionHeading
            eyebrow="Ξεχωριστές Επιλογές"
            title="Οι πιο δημοφιλείς εκδρομές μας"
            subtitle="Επιλεγμένες από τους ταξιδιώτες μας — μονοήμερες αποδράσεις με αρχή και τέλος στην Αθήνα."
            action={<TextLink to="/monoimeres">Όλες οι εκδρομές</TextLink>}
          />
          <RevealOnScroll className="mt-14 grid gap-6 lg:grid-cols-12">
            {large && (
              <div data-reveal className="lg:col-span-7">
                <FeatureTripCard trip={large} size="lg" />
              </div>
            )}
            <div className="grid gap-6 lg:col-span-5">
              {otherFeatured.map((trip) => (
                <div key={trip.id} data-reveal>
                  <FeatureTripCard trip={trip} size="sm" />
                </div>
              ))}
            </div>
          </RevealOnScroll>
        </div>
      </section>

      {/* About + stats (dark) */}
      <section className="bg-deep-ink py-24 text-surface md:py-32">
        <div className="container grid gap-16 md:grid-cols-12 md:items-start">
          <div className="md:col-span-5">
            <p className="font-sans text-[13px] font-semibold uppercase tracking-[0.18em] text-cta">Από το 1995</p>
            <h2 className="mt-4 font-display text-display-section text-surface">
              Τριάντα χρόνια δημιουργούμε αναμνήσεις
            </h2>
            <p className="mt-6 text-[17px] leading-relaxed text-surface/80">
              Είμαστε ένα ταξιδιωτικό γραφείο στο Περιστέρι που πιστεύει ότι κάθε εκδρομή είναι μια ιστορία. Οργανώνουμε ταξίδια σε όλη την Ελλάδα με σεβασμό στον χρόνο και τη διάθεσή σας.
            </p>
            <div className="mt-8">
              <Button asChild variant="ghost">
                <Link to="/epikoinonia">Ελάτε να γνωριστούμε</Link>
              </Button>
            </div>
          </div>
          <div className="grid grid-cols-2 gap-10 md:col-span-7 md:gap-14">
            {stats.map((stat) => <StatCounter key={stat.id} stat={stat} />)}
          </div>
        </div>
      </section>

      <EditorialFeature />

      {/* Cruises teaser */}
      <section className="bg-surface py-24 md:py-32">
        <div className="container">
          <SectionHeading
            eyebrow="Θάλασσα"
            title="Κρουαζιέρες στον Σαρωνικό"
            subtitle="Τρεις κρουαζιέρες, τρεις ολόκληρες μέρες θάλασσας — χωρίς άγχος, χωρίς μετακίνηση."
            action={<TextLink to="/kroyazieres">Όλες οι κρουαζιέρες</TextLink>}
          />
          <RevealOnScroll className="mt-14 flex flex-col gap-8">
            {cruises.map((cruise, i) => (
              <div key={cruise.id} data-reveal>
                <CruiseCard cruise={cruise} reverse={i % 2 === 1} />
              </div>
            ))}
          </RevealOnScroll>
        </div>
      </section>

      {/* Testimonials */}
      <section className="py-24 md:py-32">
        <div className="container">
          <SectionHeading eyebrow="Οι Ταξιδιώτες Μας" title="Τι λένε όσοι ταξίδεψαν μαζί μας" align="center" />
          <RevealOnScroll className="mt-14 grid gap-6 md:grid-cols-3">
            {testimonials.map((t) => (
              <div key={t.id} data-reveal>
                <TestimonialBlock item={t} />
              </div>
            ))}
          </RevealOnScroll>
        </div>
      </section>

      {/* CTA strip */}
      <section className="bg-cta py-16 text-surface">
        <div className="container flex flex-col items-center justify-between gap-6 text-center md:flex-row md:text-left">
          <div>
            <h2 className="font-display text-3xl font-semibold md:text-4xl">Έτοιμοι για την επόμενη περιπέτεια;</h2>
            <p className="mt-2 text-[17px] text-surface/90">Καλέστε μας ή στείλτε μας μήνυμα — απαντάμε την ίδια μέρα.</p>
          </div>
          <div className="flex flex-col gap-3 sm:flex-row sm:items-center">
            <a href="tel:+302105712451" className="inline-flex items-center gap-3 rounded-full bg-surface px-6 py-3 font-display text-2xl font-semibold text-cta transition hover:bg-surface/90">
              <Phone className="h-5 w-5" strokeWidth={1.75}/> 210 571 2451
            </a>
            <Link to="/epikoinonia" className="font-sans text-[13px] font-semibold uppercase tracking-[0.14em] underline underline-offset-4 hover:text-surface/80">
              ή στείλτε μήνυμα
            </Link>
          </div>
        </div>
      </section>
    </>
  );
}
