import Link from 'next/link';
import { Phone } from 'lucide-react';
import { HomeHero } from '@/components/home/HomeHero';
import { CategoryStrip } from '@/components/home/CategoryStrip';
import { EditorialFeature } from '@/components/home/EditorialFeature';
import { FeatureTripCard } from '@/components/trips/FeatureTripCard';
import { StatCounter } from '@/components/shared/StatCounter';
import { TestimonialBlock } from '@/components/shared/TestimonialBlock';
import { SectionHeading } from '@/components/shared/SectionHeading';
import { Reveal, Stagger, StaggerItem } from '@/components/motion/Reveal';
import { TextLink } from '@/components/ui/TextLink';
import { Button } from '@/components/ui/Button';
import { getFeaturedTours } from '@/lib/queries/tours';
import { stats, testimonials } from '@/data/site';

export default async function HomePage() {
  const featured = await getFeaturedTours();
  const [large, ...rest] = featured;
  const otherFeatured = rest.slice(0, 2);

  return (
    <>
      <HomeHero />
      <CategoryStrip />

      {/* Featured trips */}
      {large && (
        <section className="py-24 md:py-32">
          <div className="container">
            <SectionHeading
              eyebrow="Ξεχωριστές Επιλογές"
              title="Οι πιο δημοφιλείς εκδρομές μας"
              subtitle="Επιλεγμένες από τους ταξιδιώτες μας — αποδράσεις με αρχή και τέλος στην Αθήνα."
              action={<TextLink href="/ekdromes">Όλες οι εκδρομές</TextLink>}
            />
            <Reveal className="mt-14 grid gap-6 lg:grid-cols-12">
              <div className="lg:col-span-7">
                <FeatureTripCard tour={large} size="lg" />
              </div>
              <div className="grid gap-6 lg:col-span-5">
                {otherFeatured.map((tour) => (
                  <FeatureTripCard key={tour.id} tour={tour} size="sm" />
                ))}
              </div>
            </Reveal>
          </div>
        </section>
      )}

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
                <Link href="/epikoinonia">Ελάτε να γνωριστούμε</Link>
              </Button>
            </div>
          </div>
          <div className="grid grid-cols-2 gap-10 md:col-span-7 md:gap-14">
            {stats.map((stat) => <StatCounter key={stat.id} stat={stat} />)}
          </div>
        </div>
      </section>

      <EditorialFeature />

      {/* Testimonials */}
      <section className="py-24 md:py-32">
        <div className="container">
          <SectionHeading eyebrow="Οι Ταξιδιώτες Μας" title="Τι λένε όσοι ταξίδεψαν μαζί μας" align="center" />
          <Stagger className="mt-14 grid gap-6 md:grid-cols-3">
            {testimonials.map((t) => (
              <StaggerItem key={t.id}>
                <TestimonialBlock item={t} />
              </StaggerItem>
            ))}
          </Stagger>
        </div>
      </section>

      {/* CTA strip */}
      <section className="bg-gold py-16 text-[#00296b]">
        <div className="container flex flex-col items-center justify-between gap-6 text-center md:flex-row md:text-left">
          <div>
            <h2 className="font-display text-3xl font-semibold md:text-4xl">Έτοιμοι για την επόμενη περιπέτεια;</h2>
            <p className="mt-2 text-[17px] text-[#00296b]/80">Καλέστε μας ή στείλτε μας μήνυμα — απαντάμε την ίδια μέρα.</p>
          </div>
          <div className="flex flex-col gap-3 sm:flex-row sm:items-center">
            <a href="tel:+302105712451" className="inline-flex items-center gap-3 rounded-full bg-[#00296b] px-6 py-3 font-display text-2xl font-semibold text-surface transition hover:bg-primary">
              <Phone className="h-5 w-5" strokeWidth={1.75}/> 210 571 2451
            </a>
            <Link href="/epikoinonia" className="font-sans text-[13px] font-semibold uppercase tracking-[0.14em] underline underline-offset-4 hover:text-[#00296b]/70">
              ή στείλτε μήνυμα
            </Link>
          </div>
        </div>
      </section>
    </>
  );
}
