import { parseLegalBody } from '@/lib/legal/format-legal-body';
import { cn } from '@/lib/utils';

export type LegalSection = { title: string; body: string };

function LegalBlocks({ body, introSection }: { body: string; introSection?: boolean }) {
  const blocks = parseLegalBody(body);

  return (
    <div className={cn('space-y-4', introSection && 'space-y-5')}>
      {blocks.map((block, i) => {
        if (block.type === 'subheading') {
          return (
            <h3
              key={i}
              className="pt-2 font-sans text-[15px] font-semibold uppercase tracking-[0.08em] text-primary md:text-[16px]"
            >
              {block.text}
            </h3>
          );
        }
        if (block.type === 'list') {
          return (
            <ul key={i} className="list-disc space-y-2.5 pl-5 text-[16px] leading-[1.8] text-body md:text-[17px] md:leading-[1.85]">
              {block.items.map((item) => (
                <li key={item}>{item}</li>
              ))}
            </ul>
          );
        }
        return (
          <p
            key={i}
            className={cn(
              'text-[16px] leading-[1.8] text-body md:text-[17px] md:leading-[1.85]',
              introSection && i === 0 && 'text-[17px] font-medium text-primary md:text-[18px]'
            )}
          >
            {block.text}
          </p>
        );
      })}
    </div>
  );
}

export function LegalSections({ sections }: { sections: LegalSection[] }) {
  return (
    <div>
      {sections.map((section) => {
        const isIntro = section.title === 'Εισαγωγή' || section.title === 'ΟΡΟΙ ΧΡΗΣΗΣ';
        return (
          <article
            key={section.title}
            className="border-b border-border/60 py-10 last:border-b-0 md:py-12"
          >
            <h2
              className={cn(
                'font-display font-semibold text-primary',
                isIntro ? 'text-xl md:text-2xl' : 'text-lg uppercase tracking-[0.05em] md:text-xl'
              )}
            >
              {section.title}
            </h2>
            <div className="mt-5 md:mt-6">
              <LegalBlocks body={section.body} introSection={isIntro} />
            </div>
          </article>
        );
      })}
    </div>
  );
}

/** Simple titled blocks for /oroi default copy. */
export function LegalSimpleSections({ sections }: { sections: { title: string; body: string }[] }) {
  return (
    <div>
      {sections.map((section) => (
        <article key={section.title} className="border-b border-border/60 py-10 last:border-b-0 md:py-12">
          <h2 className="font-display text-lg font-semibold uppercase tracking-[0.05em] text-primary md:text-xl">
            {section.title}
          </h2>
          <p className="mt-5 text-[16px] leading-[1.8] text-body md:mt-6 md:text-[17px] md:leading-[1.85]">{section.body}</p>
        </article>
      ))}
    </div>
  );
}
