import type { Testimonial } from '@/data/site';

export function TestimonialBlock({ item }: { item: Testimonial }) {
  return (
    <figure className="relative flex flex-col gap-6 rounded-lg bg-surface p-8 shadow-card">
      <span aria-hidden="true" className="font-display text-8xl leading-none text-cta/20">“</span>
      <blockquote className="-mt-8 font-display text-[22px] italic leading-[1.4] text-primary">
        {item.quote}
      </blockquote>
      <figcaption className="mt-auto border-t border-border pt-5">
        <div className="font-sans text-[15px] font-semibold text-primary">{item.name}</div>
        <div className="font-sans text-[12px] uppercase tracking-[0.14em] text-muted">{item.city}</div>
      </figcaption>
    </figure>
  );
}
