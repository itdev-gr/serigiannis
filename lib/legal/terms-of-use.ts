import termsSections from '@/data/terms-of-use-sections.json';
import type { SettingsData } from '@/types/db';

export type TermsSection = { title: string; body: string };

export function buildTermsOfUseSections(settings: SettingsData): TermsSection[] {
  const phones = settings.phones.join(', ');
  return (termsSections as TermsSection[]).map((section) => ({
    title: section.title,
    body: section.body
      .replace(/\{\{ADDRESS\}\}/g, settings.address)
      .replace(/\{\{EMAIL\}\}/g, settings.email)
      .replace(/\{\{PHONES\}\}/g, phones),
  }));
}
