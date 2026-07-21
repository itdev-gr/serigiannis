import privacySections from '@/data/privacy-policy-sections.json';
import type { SettingsData } from '@/types/db';

export type PrivacySection = { title: string; body: string };

export function buildPrivacyPolicySections(settings: SettingsData): PrivacySection[] {
  const phone = settings.phones[0] ?? settings.phone24h ?? '';
  return (privacySections as PrivacySection[]).map((section) => ({
    title: section.title,
    body: section.body
      .replace(/\{\{ADDRESS\}\}/g, settings.address)
      .replace(/\{\{EMAIL\}\}/g, settings.email)
      .replace(/\{\{PHONE\}\}/g, phone),
  }));
}
