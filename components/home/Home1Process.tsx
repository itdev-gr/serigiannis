import { SectionHeading } from '@/components/shared/SectionHeading';
import { homeContent } from './content';

export function Home1Process() {
  const c = homeContent.process;
  return (
    <section className="bg-background py-24 md:py-32" aria-label={c.title}>
      <div className="container">
        <SectionHeading eyebrow={c.eyebrow} title={c.title} align="center" />
        <ol className="mt-14 grid gap-6 md:grid-cols-3">
          {c.steps.map((s) => (
            <li key={s.n} className="relative rounded-lg border border-border bg-surface p-8 shadow-card">
              <span className="font-display text-6xl font-bold text-gold/40 tabular">{s.n}</span>
              <h3 className="mt-4 font-display text-[24px] font-semibold text-primary">{s.title}</h3>
              <p className="mt-3 text-[16px] leading-relaxed text-muted">{s.text}</p>
            </li>
          ))}
        </ol>
      </div>
    </section>
  );
}
