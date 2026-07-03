export function LegalBody({ text }: { text: string }) {
  const blocks = text.split(/\n\s*\n/).map((b) => b.trim()).filter(Boolean);
  return (
    <div className="mt-10 space-y-6">
      {blocks.map((b, i) => (
        <p key={i} className="whitespace-pre-wrap text-[17px] leading-relaxed text-muted">{b}</p>
      ))}
    </div>
  );
}
