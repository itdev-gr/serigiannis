export type RouteDateRow = { route_id: string; service_date: string };

/** Group list_route_dates rows into route_id -> sorted unique ISO dates. */
export function groupRouteDates(rows: RouteDateRow[]): Map<string, string[]> {
  const map = new Map<string, string[]>();
  for (const r of rows) {
    const arr = map.get(r.route_id) ?? [];
    if (!arr.includes(r.service_date)) arr.push(r.service_date);
    map.set(r.route_id, arr);
  }
  for (const arr of map.values()) arr.sort();
  return map;
}

/** Resolve the wizard's initial excursion id from a deep-link param
 *  (?ekdromi=…). Returns the param only when it matches a real excursion id,
 *  otherwise '' so the select stays on "— Επιλέξτε εκδρομή —". */
export function resolveInitialRoute(excursions: { id: string }[], param: string | null): string {
  if (!param) return '';
  return excursions.some((x) => x.id === param) ? param : '';
}

/** Admin textarea (one boarding point per line) -> clean array. */
export function parseBoardingPoints(text: string): string[] {
  return text
    .split('\n')
    .map((s) => s.trim())
    .filter(Boolean);
}

const GREEK_TO_LATIN: Record<string, string> = {
  α: 'a', β: 'v', γ: 'g', δ: 'd', ε: 'e', ζ: 'z', η: 'i', θ: 'th', ι: 'i',
  κ: 'k', λ: 'l', μ: 'm', ν: 'n', ξ: 'x', ο: 'o', π: 'p', ρ: 'r', σ: 's',
  ς: 's', τ: 't', υ: 'y', φ: 'f', χ: 'ch', ψ: 'ps', ω: 'o',
};

/** Latin URL slug from an (often Greek) title. Empty when the title has no
 *  alphanumerics — callers should fall back (e.g. `ekdromi-<hex>`). */
export function slugify(input: string): string {
  const base = input
    .toLowerCase()
    .normalize('NFD')
    .replace(/[̀-ͯ]/g, ''); // strip accents (Greek tonos/dialytika too)
  let out = '';
  for (const ch of base) out += GREEK_TO_LATIN[ch] ?? ch;
  return out
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/^-+|-+$/g, '')
    .slice(0, 60)
    .replace(/-+$/g, '');
}

/** Slug for a title, falling back to a generic value when the title has no
 *  alphanumerics to slugify — so callers never persist an empty slug. */
export function slugifyWithFallback(input: string, fallback = 'ekdromi'): string {
  return slugify(input) || fallback;
}

/** True when a slug contains characters outside a-z, 0-9 and '-' (e.g.
 *  uppercase or spaces). Used to warn — never to silently rewrite — when an
 *  existing tour's slug isn't a clean URL segment. */
export function slugNeedsCleanup(slug: string): boolean {
  return slug !== '' && /[^a-z0-9-]/.test(slug);
}
