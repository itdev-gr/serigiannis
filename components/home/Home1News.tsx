import type { Tour } from '@/types/db';
import { SectionHeading } from '@/components/shared/SectionHeading';
import { TextLink } from '@/components/ui/TextLink';
import { TourCard } from '@/components/trips/TourCard';
import { homeContent } from './content';
import { HOME_SECTION_TITLE } from './home-section-title';
import type { NewsCopy } from './resolve-content';

export function Home1News({ tours, content = homeContent.news }: { tours: Tour[]; content?: NewsCopy }) {
  const c = content;
  const items = tours.slice(0, 3);
  if (items.length === 0) return null;
  return (
    <section className="bg-background py-24 md:py-32" aria-label={c.title}>
      <div className="container">
        <SectionHeading
          eyebrow={c.eyebrow.trim() !== '' ? c.eyebrow : undefined}
          title={c.title}
          subtitle={c.subtitle}
          action={<TextLink href={c.actionHref}>{c.action}</TextLink>}
          titleClassName={HOME_SECTION_TITLE}
        />
        <div className="mt-14 grid gap-6 sm:grid-cols-2 lg:grid-cols-3">
          {items.map((t) => <TourCard key={t.id} tour={t} />)}
        </div>
      </div>
    </section>
  );
}
