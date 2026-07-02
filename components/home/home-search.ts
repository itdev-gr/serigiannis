/** Build the target href for the hero search form from a chosen category slug. */
export function buildSearchHref(input: { category?: string }): string {
  const c = (input.category ?? '').trim();
  if (!c || c === 'all') return '/ekdromes';
  return `/ekdromes/${c}`;
}
