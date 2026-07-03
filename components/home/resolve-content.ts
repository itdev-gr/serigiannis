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
export function resolveHomeContent(settings?: SettingsData): { hero: HeroCopy; about: AboutCopy } {
  const trust: readonly TrustPoint[] = settings?.trust?.some((t) => t.title.trim() !== '')
    ? settings.trust.map((t) => ({ title: t.title, text: t.text }))
    : homeContent.about.trust;
  return {
    hero: { ...homeContent.hero, ...overrides(settings?.hero) },
    about: { ...homeContent.about, ...overrides(settings?.about), trust },
  };
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
