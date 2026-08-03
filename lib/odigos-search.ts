import type { OdigosBlock, OdigosSection } from '@/data/odigos-content';

/** Πεζά + αφαίρεση τόνων/διαλυτικών ώστε «ΑΚΥΡΩΣΗ» να ταιριάζει με «ακύρωση». */
export function normalizeGreek(s: string): string {
  return s.normalize('NFD').replace(/[\u0300-\u036f]/g, '').toLowerCase();
}

/**
 * Θέσεις (start, end) του query μέσα στο text, με ταίριασμα τόνο/πεζά-ανεξάρτητο.
 * Οι δείκτες αναφέρονται στο ΑΡΧΙΚΟ κείμενο, ώστε το highlight να κόβει σωστά
 * ακόμη κι όταν η κανονικοποίηση αλλάζει μήκη χαρακτήρων.
 */
export function findMatches(text: string, query: string): Array<[number, number]> {
  const q = normalizeGreek(query.trim());
  if (!q) return [];
  // Κανονικοποίηση χαρακτήρα-χαρακτήρα κρατώντας αντιστοίχιση προς το αρχικό index.
  const normChars: string[] = [];
  const origIndex: number[] = [];
  for (let i = 0; i < text.length; i++) {
    const base = text[i].normalize('NFD').replace(/[\u0300-\u036f]/g, '').toLowerCase();
    for (const c of base) {
      normChars.push(c);
      origIndex.push(i);
    }
  }
  const norm = normChars.join('');
  const out: Array<[number, number]> = [];
  let from = 0;
  for (;;) {
    const at = norm.indexOf(q, from);
    if (at === -1) break;
    const start = origIndex[at];
    const end = origIndex[at + q.length - 1] + 1;
    out.push([start, end]);
    from = at + q.length;
  }
  return out;
}

function blockTexts(block: OdigosBlock): string[] {
  switch (block.kind) {
    case 'p':
    case 'tip':
    case 'warning':
      return [block.text];
    case 'steps':
      return block.items;
    case 'table':
      return [...block.head, ...block.rows.flat()];
    case 'link':
      return [block.label];
  }
}

/** Ταιριάζει η ενότητα με το query; (τίτλος, keywords ή οποιοδήποτε κείμενο block) */
export function sectionMatches(section: OdigosSection, query: string): boolean {
  const q = normalizeGreek(query.trim());
  if (!q) return true;
  if (normalizeGreek(section.title).includes(q)) return true;
  if (section.keywords.some((k) => normalizeGreek(k).includes(q))) return true;
  return section.blocks.some((b) => blockTexts(b).some((t) => normalizeGreek(t).includes(q)));
}
