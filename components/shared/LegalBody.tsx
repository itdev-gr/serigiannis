import { parseLegalBody } from '@/lib/legal/format-legal-body';

export function LegalBody({ text }: { text: string }) {
  const blocks = text.includes('\n\n')
    ? text
        .split(/\n\s*\n/)
        .map((b) => b.trim())
        .filter(Boolean)
        .flatMap((b) => parseLegalBody(b))
    : parseLegalBody(text);

  return (
    <div className="border-t border-border/60 pt-10 md:pt-12">
      <div className="space-y-4">
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
            <p key={i} className="text-[16px] leading-[1.8] text-body md:text-[17px] md:leading-[1.85]">
              {block.text}
            </p>
          );
        })}
      </div>
    </div>
  );
}
