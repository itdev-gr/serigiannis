/** Route params arrive percent-encoded; Greek slugs need decoding before DB lookup. */
export function decodeSlugParam(slug: string): string {
  try {
    return decodeURIComponent(slug);
  } catch {
    return slug; // malformed escape sequence — use as-is, lookup will 404 naturally
  }
}
