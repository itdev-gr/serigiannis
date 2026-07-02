// Decode HTML entities left in migrated content (WordPress export stored e.g.
// "&#8211;" literally in tour titles/summaries). Runs server-side in the data layer
// so every consumer (home, listings, tour detail, admin) gets clean text.

const NAMED: Record<string, string> = {
  amp: '&', lt: '<', gt: '>', quot: '"', apos: "'", nbsp: ' ',
  laquo: '«', raquo: '»', hellip: '…', ndash: '–', mdash: '—',
  lsquo: '‘', rsquo: '’', ldquo: '“', rdquo: '”',
  euro: '€', deg: '°',
};

/** Decode numeric (&#8211; / &#x2013;) and common named HTML entities. */
export function decodeEntities(input: string): string {
  return input
    .replace(/&#(\d+);/g, (_, n: string) => String.fromCodePoint(Number(n)))
    .replace(/&#x([0-9a-fA-F]+);/g, (_, n: string) => String.fromCodePoint(parseInt(n, 16)))
    .replace(/&([a-zA-Z]+);/g, (m, name: string) => NAMED[name] ?? m);
}

/** Decode a nullable string, preserving null. */
export function decodeMaybe(input: string | null): string | null {
  return input == null ? null : decodeEntities(input);
}
