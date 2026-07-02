import type { Tour } from '@/types/db';
import { SectionHeading } from '@/components/shared/SectionHeading';
import { TextLink } from '@/components/ui/TextLink';
import { TourCard } from '@/components/trips/TourCard';
import { homeContent } from './content';

export function Home1Listing({ tours }: { tours: Tour[] }) {
  const c = homeContent.listing;
  if (tours.length === 0) return null;
  return (
    <section className="py-24 md:py-32" aria-label={c.title}>
      <div className="container">
        <SectionHeading
          eyebrow={c.eyebrow}
          title={c.title}
          subtitle={c.subtitle}
          action={<TextLink href={c.actionHref}>{c.action}</TextLink>}
        />
        <div className="mt-14 grid gap-6 sm:grid-cols-2 lg:grid-cols-3">
          {tours.map((t) => <TourCard key={t.id} tour={t} />)}
        </div>
      </div>
    </section>
  );
}
