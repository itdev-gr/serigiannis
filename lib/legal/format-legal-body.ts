export type LegalBlock =
  | { type: 'paragraph'; text: string }
  | { type: 'subheading'; text: string }
  | { type: 'list'; items: string[] };

/** Break dense legal copy into readable paragraphs and lists (Versus-style). */
export function parseLegalBody(body: string): LegalBlock[] {
  const normalized = body.replace(/\s+/g, ' ').trim();
  if (!normalized) return [];

  let chunks = normalized.split(/\s{2,}(?=[Α-ΩA-Z«(•])/);
  if (chunks.length <= 1) {
    chunks = normalized.split(/(?<=[.!?])\s+(?=[Α-ΩA-Z«(•])/);
  }

  const blocks: LegalBlock[] = [];

  for (const chunk of chunks.map((c) => c.trim()).filter(Boolean)) {
    const subheadingMatch = chunk.match(/^(\d+\.\d+\.?\s*[^:]+?)(?:\s+(?=[Α-Ω]))(.*)$/s);
    if (subheadingMatch && subheadingMatch[1].length < 80) {
      blocks.push({ type: 'subheading', text: subheadingMatch[1].trim() });
      const rest = subheadingMatch[2]?.trim();
      if (rest) pushChunk(blocks, rest);
      continue;
    }

    pushChunk(blocks, chunk);
  }

  return blocks;
}

function pushChunk(blocks: LegalBlock[], chunk: string) {
  const forListMatch = chunk.match(/^(.+ για:)\s*(.+)$/);
  if (forListMatch && forListMatch[2].length > 80) {
    blocks.push({ type: 'paragraph', text: forListMatch[1] });
    const items = forListMatch[2]
      .split(/(?<=\))\s+(?=[Α-ΩA-ZΝ])|(?<=[.!?])\s+(?=[Α-ΩA-ZΝ])/)
      .map((s) => s.trim())
      .filter((s) => s.length > 12);
    if (items.length >= 2) {
      blocks.push({ type: 'list', items });
      return;
    }
  }

  const rightsItems = chunk.split(/(?=Δικαίωμα )/).map((s) => s.trim()).filter(Boolean);
  if (rightsItems.length >= 3 && rightsItems.every((s) => s.startsWith('Δικαίωμα '))) {
    blocks.push({ type: 'list', items: rightsItems });
    return;
  }

  if (chunk.includes(': ') && chunk.length < 220 && !chunk.includes('. ')) {
    const afterColon = chunk.split(': ').slice(1).join(': ');
    const listParts = afterColon.split(/(?=[Α-ΩA-Z][α-ωά-ώ]{2,} )/);
    if (listParts.length >= 3) {
      blocks.push({ type: 'paragraph', text: chunk.split(': ')[0] + ':' });
      blocks.push({ type: 'list', items: listParts.map((s) => s.trim()).filter(Boolean) });
      return;
    }
  }

  blocks.push({ type: 'paragraph', text: chunk });
}
