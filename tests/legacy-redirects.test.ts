import { describe, expect, it } from 'vitest';
import { LEGACY_PATH_REDIRECTS, LEGACY_PREFIX_REDIRECTS, legacyRedirects, siteRedirects } from '@/lib/legacy-redirects.mjs';
import { STATIC_ROUTES } from '@/app/sitemap';
import legacyPaths from './fixtures/legacy-urls.json';

/** Ένας κανόνας του next.config, όπως τον περιμένει το `redirects()`. */
type Rule = { source: string; destination: string; permanent: boolean; has?: { type: string; value: string }[] };

/** Μικρή απομίμηση του path-to-regexp που χρησιμοποιεί το Next για τα
 *  redirects: αρκεί για τις μορφές που χρησιμοποιούμε (σταθερό path με
 *  προαιρετικό τελικό «/» `{/}?`, `/:path*` πρόθεμα, `:id(\d+)`, custom regex
 *  με `[^/]`). Το Next ταιριάζει το path ΚΩΔΙΚΟΠΟΙΗΜΕΝΟ. */
function toRegex(source: string): RegExp {
  let re = '';
  const tokens = source.match(/\{\/\}\?|:[a-z]+\((?:[^()]|\([^()]*\))*\)\*?|:[a-z]+[*+]?|[^:{]+/gi) ?? [];
  for (const t of tokens) {
    if (t === '{/}?') {
      re += '/?';
    } else if (t.startsWith(':')) {
      const star = t.endsWith('*');
      const plus = t.endsWith('+');
      const custom = t.match(/^:[a-z]+\(((?:[^()]|\([^()]*\))*)\)/i)?.[1];
      if (star) re = re.replace(/\/$/, '') + '(?:/.*)?';
      else if (plus) re += '(.+)';
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
  if (path === '/:path') return true; // ο γενικός κανόνας του τελικού «/»
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

  it('κάθε παλιά εκδρομή /tour/<παλιό> πάει με ένα βήμα στη νέα, με ή χωρίς τελικό «/»', () => {
    const target = '/tour/monoimeri-ekdromi-gia-proskynima-stin-panagia-tis-tinoy-kath';
    expect(firstMatch(rules, '/tour/tinos-monoimeri-proskynimatiki-ekdromi-kathe-savvato-kyriaki-apo-athina')?.destination).toBe(target);
    expect(firstMatch(rules, '/tour/tinos-monoimeri-proskynimatiki-ekdromi-kathe-savvato-kyriaki-apo-athina/')?.destination).toBe(target);
    expect(firstMatch(rules, '/tour/sxolikes-monoimeres-ekdromes-protaseis-apo-athina/')?.destination).toBe(
      '/nea/sxolikes-monoimeres-ekdromes-apo-athina-protaseis-gia-kathe'
    );
    // Ελληνικοί χαρακτήρες στο παλιό slug: ο browser τους στέλνει κωδικοποιημένους.
    expect(
      firstMatch(rules, '/tour/thessaloniki-proskynima-ston-agio-paΐsio-diimeri-proskynimatiki-ekdromi-me-poylman/')?.destination
    ).toBe('/tour/thessaloniki-proskynima-ston-agio-pasio-diimeri-proskynimatiki-ekdromi-me-poylman');
  });

  it('οι παλιές σελίδες με τελικό «/» πιάνονται από τον δικό τους κανόνα, όχι από το γενικό', () => {
    expect(firstMatch(rules, '/ekdromes-sergiani-travel/monoimeres/')?.destination).toBe('/ekdromes/monoimeres');
    expect(firstMatch(rules, '/taksidiotiko-grafeio-peristeri-athina-sergiani-travel-apo-to-1995/')?.destination).toBe(
      '/nea/taksidiotiko-grafeio-peristeri-athina-sergiani-travel-apo-to-1995'
    );
    expect(firstMatch(rules, '/8929/taksidiotiko-grafeio-peristeri-athina-sergiani-travel-apo-to-1995/')?.destination).toBe(
      '/nea/taksidiotiko-grafeio-peristeri-athina-sergiani-travel-apo-to-1995'
    );
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

describe('siteRedirects — σειρά και γενικοί κανόνες', () => {
  const all = siteRedirects() as Rule[];
  const legacyCount = rules.length;

  it('πρώτα οι παλιές διευθύνσεις, μετά το τελικό «/», τελευταία τα host rules', () => {
    expect(all.slice(0, legacyCount)).toEqual(rules);
    const trailing = all[legacyCount];
    expect(trailing.has).toBeUndefined();
    expect(toRegex(trailing.source).test('/epikoinonia/')).toBe(true);
    expect(toRegex(trailing.source).test('/epikoinonia')).toBe(false);
    expect(toRegex(trailing.source).test('/')).toBe(false);
    expect(toRegex(trailing.source).test('/api/cron/viva-sync/')).toBe(false);
    const hosts = all.slice(legacyCount + 1).map((r) => r.has?.[0]?.value);
    expect(hosts).toEqual(['sergianitravel.gr', 'serigiannis.vercel.app']);
    for (const r of all.slice(legacyCount + 1)) {
      expect(r.destination).toBe('https://www.sergianitravel.gr/:path');
      expect(toRegex(r.source).test('/api/cron/viva-sync')).toBe(false);
      expect(toRegex(r.source).test('/ekdromes')).toBe(true);
    }
  });

  it('όλοι οι κανόνες είναι μόνιμοι', () => {
    for (const r of all) expect(r.permanent, r.source).toBe(true);
  });
});
