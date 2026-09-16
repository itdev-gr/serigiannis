import { describe, expect, it } from 'vitest';
import { LEGACY_PATH_REDIRECTS, LEGACY_PREFIX_REDIRECTS, legacyRedirects } from '@/lib/legacy-redirects.mjs';
import { STATIC_ROUTES } from '@/app/sitemap';
import legacyPaths from './fixtures/legacy-urls.json';

/** Ένας κανόνας του next.config, όπως τον περιμένει το `redirects()`. */
type Rule = { source: string; destination: string; permanent: boolean };

/** Μικρή απομίμηση του path-to-regexp που χρησιμοποιεί το Next για τα
 *  redirects: αρκεί για τις τρεις μορφές που χρησιμοποιούμε (σταθερό path,
 *  `/:path*` πρόθεμα, `:id(\d+)`). Το Next ταιριάζει το path ΚΩΔΙΚΟΠΟΙΗΜΕΝΟ. */
function toRegex(source: string): RegExp {
  let re = '';
  const tokens = source.match(/:[a-z]+\([^)]*\)\*?|:[a-z]+\*?|[^:]+/gi) ?? [];
  for (const t of tokens) {
    if (t.startsWith(':')) {
      const star = t.endsWith('*');
      const custom = t.match(/\(([^)]*)\)/)?.[1];
      if (star) re = re.replace(/\/$/, '') + '(?:/.*)?';
      else re += custom ? `(${custom})` : '([^/]+)';
    } else {
      re += t.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
    }
  }
  return new RegExp(`^${re}$`);
}

function encodePath(path: string): string {
  return path
    .split('/')
    .map((s) => encodeURIComponent(s))
    .join('/');
}

function firstMatch(rules: Rule[], path: string): Rule | null {
  const encoded = encodePath(path);
  return rules.find((r) => toRegex(r.source).test(encoded)) ?? null;
}

/** Οι σελίδες που υπάρχουν στο νέο site (χωρίς βάση): στατικές διαδρομές συν
 *  τα δυναμικά πρότυπα. Τα slug εκδρομών/άρθρων δεν ελέγχονται εδώ — αυτό το
 *  κάνει το tour-aliases test και η επαλήθευση μετά το deploy. */
function isKnownRoute(path: string): boolean {
  // Το sitemap γράφει την αρχική ως κενό string.
  if (STATIC_ROUTES.includes(path === '/' ? '' : path)) return true;
  return /^\/(tour|nea)\/[a-z0-9-]+$/.test(path);
}

const rules = legacyRedirects() as Rule[];

describe('legacyRedirects', () => {
  it('κάθε κανόνας είναι μόνιμος (308) και δείχνει σε σελίδα που υπάρχει', () => {
    for (const r of rules) {
      expect(r.permanent, r.source).toBe(true);
      // Ο μόνος δυναμικός προορισμός: το fallback /<id>/<slug> → /<slug>.
      if (r.destination === '/:slug') continue;
      expect(isKnownRoute(r.destination), `${r.source} → ${r.destination}`).toBe(true);
      // Ποτέ αλυσίδα: ο προορισμός δεν πρέπει να πιάνεται από άλλον κανόνα.
      expect(firstMatch(rules, r.destination), `${r.destination} redirects again`).toBeNull();
    }
  });

  it('οι σελίδες κατηγοριών του παλιού site πάνε στις νέες κατηγορίες', () => {
    expect(firstMatch(rules, '/ekdromes-sergiani-travel/monoimeres')?.destination).toBe('/ekdromes/monoimeres');
    expect(firstMatch(rules, '/ekdromes-sergiani-travel/polyimeres-ekdromes')?.destination).toBe('/ekdromes/polyimeres');
    expect(firstMatch(rules, '/ekdromes-sergiani-travel/thalassia-mpania')?.destination).toBe('/ekdromes/thalassia-mpania');
    expect(firstMatch(rules, '/ekdromes-sergiani-travel')?.destination).toBe('/ekdromes');
  });

  it('τα παλιά άρθρα της ρίζας και η μορφή /<id>/<slug> πάνε στο /nea σε ΕΝΑ βήμα', () => {
    const post = '/nea/taksidiotiko-grafeio-peristeri-athina-sergiani-travel-apo-to-1995';
    expect(firstMatch(rules, '/taksidiotiko-grafeio-peristeri-athina-sergiani-travel-apo-to-1995')?.destination).toBe(post);
    expect(firstMatch(rules, '/8929/taksidiotiko-grafeio-peristeri-athina-sergiani-travel-apo-to-1995')?.destination).toBe(post);
    // Άγνωστο id-άρθρο: πέφτει στο root URL (ίσως 404, αλλά όχι νεκρό id).
    expect(firstMatch(rules, '/9999/kati-allo')?.destination).toBe('/:slug');
  });

  it('οι WP taxonomies (τοποθεσία, σημείο επιβίβασης, λέξη-κλειδί) πάνε στις εκδρομές', () => {
    expect(firstMatch(rules, '/topothesia/tinos')?.destination).toBe('/ekdromes');
    expect(firstMatch(rules, '/topothesia/esoteriko/page/2')?.destination).toBe('/ekdromes');
    expect(firstMatch(rules, '/area/marina-delta-kalitheas')?.destination).toBe('/ekdromes/thalassia-mpania');
    expect(firstMatch(rules, '/keyword/2imeri-ekdromi-apo-athina')?.destination).toBe('/ekdromes');
    expect(firstMatch(rules, '/nea/page/2')?.destination).toBe('/nea');
  });

  it('ταιριάζει τα paths με ελληνικούς χαρακτήρες όπως τα κωδικοποιεί ο browser', () => {
    expect(firstMatch(rules, '/oroi-kai-proϋpotheseis')?.destination).toBe('/oroi-proypotheseis');
    expect(
      firstMatch(rules, '/mpanio-stin-athinaϊki-riviera-sergiani-syntagma-varkiza-anavysso-saronida-paralia-xaraka')?.destination
    ).toMatch(/^\/tour\//);
  });

  it('δεν πιάνει σελίδες του νέου site', () => {
    for (const p of ['/', '/ekdromes', '/ekdromes/monoimeres', '/tour/kati', '/nea/kati', '/nea', '/admin/tours', '/api/cron/viva-sync']) {
      expect(firstMatch(rules, p), p).toBeNull();
    }
  });

  it('κάθε παλιό URL με ≥20 clicks (εκτός /tour/) είτε υπάρχει είτε ανακατευθύνεται', () => {
    const dead: string[] = [];
    for (const p of legacyPaths as string[]) {
      if (isKnownRoute(p) || p === '/enoikiaseis-poylman' || p === '/epikoinonia' || p === '/istoriko-ekdromon') continue;
      const hit = firstMatch(rules, p);
      if (!hit || !isKnownRoute(hit.destination)) dead.push(p);
    }
    expect(dead).toEqual([]);
  });

  it('οι πίνακες δεν έχουν κενά ή διπλά κλειδιά με άλλη μορφή', () => {
    for (const k of [...Object.keys(LEGACY_PATH_REDIRECTS), ...Object.keys(LEGACY_PREFIX_REDIRECTS)]) {
      expect(k, k).toMatch(/^\/[^/]/);
      expect(k, k).not.toMatch(/\/$/);
    }
  });
});
