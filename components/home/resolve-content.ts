import type { SettingsData } from '@/types/db';
import { stats as defaultStats, testimonials as defaultTestimonials } from '@/data/site';
import type { Stat, Testimonial } from '@/data/site';
import { homeContent } from './content';

export type HeroCopy = {
  eyebrow: string;
  titleTop: string;
  titleEmph: string;
  subtitle: string;
  bookedNote: string;
  searchLabel: string;
  searchCta: string;
  allOption: string;
};

export type TrustPoint = { title: string; text: string };

export type AboutCopy = {
  eyebrow: string;
  title: string;
  body: string;
  cta: string;
  ctaHref: string;
  trust: readonly TrustPoint[];
};

export type PromoCopy = {
  eyebrow: string;
  title: string;
  body: string;
  cta: string;
  ctaHref: string;
};

export type ProcessStep = { n: string; title: string; text: string };

export type ProcessCopy = {
  eyebrow: string;
  title: string;
  steps: readonly ProcessStep[];
};

export type DestinationsCopy = {
  eyebrow: string;
  title: string;
  subtitle: string;
};

export type ListingCopy = {
  eyebrow: string;
  title: string;
  subtitle: string;
  action: string;
  actionHref: string;
};

export type TestimonialsCopy = {
  eyebrow: string;
  title: string;
};

export type NewsCopy = {
  eyebrow: string;
  title: string;
  subtitle: string;
  action: string;
  actionHref: string;
};

export type CtaCopy = {
  title: string;
  body: string;
  messageCta: string;
  messageHref: string;
};

export type PoylmanValueProp = { title: string; description: string };
export type PoylmanRoute = { from: string; to: string; hours: string };

// Real "Πούλμαν" page copy (crawl 2026-07-02). Icons stay in the page component.
const poylmanValuePropsDefault: PoylmanValueProp[] = [
  { title: 'Έμπειροι Οδηγοί', description: 'Πιστοποιημένοι οδηγοί με πολυετή εμπειρία σε τουριστικές μεταφορές.' },
  { title: 'Σύγχρονος Στόλος', description: 'Νεότερα πούλμαν με air-condition, mic, wifi και χώρο για αποσκευές.' },
  { title: 'Καθ’ όλη την Ελλάδα', description: 'Από τη Χαλκιδική μέχρι τη Μάνη — καλύπτουμε κάθε προορισμό.' },
  { title: '24ωρη Εξυπηρέτηση', description: 'Είμαστε διαθέσιμοι όλο το εικοσιτετράωρο για κρατήσεις και αλλαγές.' },
];

const poylmanRoutesDefault: PoylmanRoute[] = [
  { from: 'Αθήνα', to: 'Δελφοί · Αράχωβα', hours: '≈ 2,5 ώρες' },
  { from: 'Αθήνα', to: 'Μετέωρα · Καλαμπάκα', hours: '≈ 4,5 ώρες' },
  { from: 'Αθήνα', to: 'Ναύπλιο · Επίδαυρος', hours: '≈ 2 ώρες' },
];

/** Keep only non-empty string overrides (empty admin fields mean "use the default"). */
function overrides<T extends object>(o: T | undefined): Partial<T> {
  if (!o) return {};
  const out: Record<string, unknown> = {};
  for (const [k, v] of Object.entries(o)) {
    if (typeof v === 'string' && v.trim() !== '') out[k] = v;
  }
  return out as Partial<T>;
}

/** Merge editable settings copy over the static content.ts defaults. */
export function resolveHomeContent(
  settings?: SettingsData,
): {
  hero: HeroCopy;
  about: AboutCopy;
  promo: PromoCopy;
  process: ProcessCopy;
  destinations: DestinationsCopy;
  listing: ListingCopy;
  testimonials: TestimonialsCopy;
  news: NewsCopy;
  cta: CtaCopy;
} {
  const trust: readonly TrustPoint[] = settings?.trust?.some((t) => t.title.trim() !== '')
    ? settings.trust.map((t) => ({ title: t.title, text: t.text }))
    : homeContent.about.trust;

  const steps: readonly ProcessStep[] = settings?.process?.steps?.some((s) => s.title.trim() !== '')
    ? settings.process.steps.map((s, i) => ({
        n: homeContent.process.steps[i]?.n ?? String(i + 1).padStart(2, '0'),
        title: s.title,
        text: s.text,
      }))
    : homeContent.process.steps;

  return {
    hero: { ...homeContent.hero, ...overrides(settings?.hero) },
    about: { ...homeContent.about, ...overrides(settings?.about), trust },
    promo: { ...homeContent.promo, ...overrides(settings?.promo) },
    process: { ...homeContent.process, ...overrides(settings?.process), steps },
    destinations: { ...homeContent.destinations, ...overrides(settings?.homeSections?.destinations) },
    listing: { ...homeContent.listing, ...overrides(settings?.homeSections?.listing) },
    testimonials: { ...homeContent.testimonials, ...overrides(settings?.homeSections?.testimonials) },
    news: { ...homeContent.news, ...overrides(settings?.homeSections?.news) },
    cta: { ...homeContent.cta, ...overrides(settings?.homeSections?.cta) },
  };
}

/** Resolve the Πούλμαν page's value-props and example routes: editable via settings, else the page defaults. */
export function resolvePoylman(settings?: SettingsData): { valueProps: PoylmanValueProp[]; routes: PoylmanRoute[] } {
  const valueProps = settings?.poylman?.valueProps?.some((v) => v.title.trim() !== '')
    ? settings.poylman.valueProps.map((v) => ({ title: v.title, description: v.description }))
    : poylmanValuePropsDefault;
  const routes = settings?.poylman?.routes?.some((r) => r.from.trim() !== '' || r.to.trim() !== '')
    ? settings.poylman.routes.map((r) => ({ from: r.from, to: r.to, hours: r.hours }))
    : poylmanRoutesDefault;
  return { valueProps, routes };
}

/** Resolve the homepage stats: editable via settings, else the data/site.ts defaults. */
export function resolveStats(settings?: SettingsData): Stat[] {
  if (settings?.stats?.some((s) => s.label.trim() !== '')) {
    return settings.stats.map((s, i) => ({ id: 's' + i, value: s.value, suffix: s.suffix, label: s.label }));
  }
  return defaultStats;
}

/** Resolve the homepage testimonials: editable via settings, else the data/site.ts defaults. */
export function resolveTestimonials(settings?: SettingsData): Testimonial[] {
  if (settings?.testimonials?.some((t) => t.name.trim() !== '' && t.quote.trim() !== '')) {
    return settings.testimonials.map((t, i) => ({ id: 't' + i, name: t.name, city: t.city, quote: t.quote }));
  }
  return defaultTestimonials;
}

export type PageHeroCopy = { eyebrow?: string; title: string; subtitle?: string };

/** Resolve an inner page's hero copy: editable via settings.pageHeros[key], else the page's own defaults. */
export function resolvePageHero(
  settings: SettingsData | undefined,
  key: string,
  defaults: PageHeroCopy,
): PageHeroCopy {
  const o = settings?.pageHeros?.[key];
  return {
    eyebrow: (o?.eyebrow?.trim() || undefined) ?? defaults.eyebrow,
    title: o?.title?.trim() || defaults.title,
    subtitle: (o?.subtitle?.trim() || undefined) ?? defaults.subtitle,
  };
}
