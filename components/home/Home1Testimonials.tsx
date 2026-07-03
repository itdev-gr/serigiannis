import { testimonials as defaultTestimonials } from '@/data/site';
import type { Testimonial } from '@/data/site';
import { SectionHeading } from '@/components/shared/SectionHeading';
import { TestimonialBlock } from '@/components/shared/TestimonialBlock';
import { Stagger, StaggerItem } from '@/components/motion/Reveal';
import { homeContent } from './content';
import type { TestimonialsCopy } from './resolve-content';

export function Home1Testimonials({
  testimonials = defaultTestimonials,
  content = homeContent.testimonials,
}: {
  testimonials?: Testimonial[];
  content?: TestimonialsCopy;
}) {
  const c = content;
  return (
    <section className="py-24 md:py-32" aria-label={c.title}>
      <div className="container">
        <SectionHeading eyebrow={c.eyebrow} title={c.title} align="center" />
        <Stagger className="mt-14 grid gap-6 md:grid-cols-3">
          {testimonials.map((t) => (
            <StaggerItem key={t.id}>
              <TestimonialBlock item={t} />
            </StaggerItem>
          ))}
        </Stagger>
      </div>
    </section>
  );
}
