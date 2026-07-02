import type { SettingsData } from '@/types/db';
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
  return {
    hero: { ...homeContent.hero, ...overrides(settings?.hero) },
    about: { ...homeContent.about, ...overrides(settings?.about) },
  };
}
