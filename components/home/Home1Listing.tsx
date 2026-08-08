import type { Tour } from '@/types/db';
import { SectionHeading } from '@/components/shared/SectionHeading';
import { TextLink } from '@/components/ui/TextLink';
import { TourCard } from '@/components/trips/TourCard';
import { homeContent } from './content';
import { HOME_SECTION_TITLE } from './home-section-title';
import type { ListingCopy } from './resolve-content';

export function Home1Listing({ tours, content = homeContent.listing }: { tours: Tour[]; content?: ListingCopy }) {
  const c = content;
  if (tours.length === 0) return null;
  // Η προηγούμενη ενότητα κλείνει ήδη με pb-24/32· χωρίς κομμένο πάνω
  // περιθώριο μαζεύονταν ~256px νεκρού χώρου ανάμεσά τους.
  return (
    <section className="pb-24 pt-4 md:pb-32 md:pt-6" aria-label={c.title}>
      <div className="container">
        <SectionHeading
          title={c.title}
          subtitle={c.subtitle}
          subtitleClassName="mx-auto max-w-2xl text-black"
          align="center"
          contentClassName="w-full max-w-none"
          titleClassName={`mx-auto w-full max-w-none text-balance lg:whitespace-nowrap ${HOME_SECTION_TITLE}`}
        />
        <div className="mt-14 grid gap-6 sm:grid-cols-2 lg:grid-cols-3">
          {tours.map((t) => <TourCard key={t.id} tour={t} />)}
        </div>
        <p className="mt-10 text-center">
          <TextLink href={c.actionHref}>{c.action}</TextLink>
        </p>
      </div>
    </section>
  );
}
