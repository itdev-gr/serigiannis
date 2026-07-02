import { describe, it, expect } from 'vitest';
import { resolveHomeContent } from '@/components/home/resolve-content';
import { homeContent } from '@/components/home/content';
import type { SettingsData } from '@/types/db';

const base: SettingsData = {
  phones: ['1'], address: 'a', email: 'e', hours: { weekdays: 'w', saturday: 's' },
};

describe('resolveHomeContent', () => {
  it('uses content.ts defaults when settings has no copy', () => {
    const r = resolveHomeContent(base);
    expect(r.hero.titleTop).toBe(homeContent.hero.titleTop);
    expect(r.about.title).toBe(homeContent.about.title);
    expect(r.about.trust).toBe(homeContent.about.trust); // untouched fields preserved
  });

  it('overrides only the provided non-empty fields', () => {
    const r = resolveHomeContent({ ...base, hero: { titleTop: 'ΝΕΟΣ ΤΙΤΛΟΣ' }, about: { body: 'νέο κείμενο' } });
    expect(r.hero.titleTop).toBe('ΝΕΟΣ ΤΙΤΛΟΣ');
    expect(r.hero.subtitle).toBe(homeContent.hero.subtitle); // not overridden
    expect(r.about.body).toBe('νέο κείμενο');
    expect(r.about.title).toBe(homeContent.about.title); // not overridden
  });

  it('ignores empty/whitespace overrides', () => {
    const r = resolveHomeContent({ ...base, hero: { titleTop: '   ', subtitle: '' } });
    expect(r.hero.titleTop).toBe(homeContent.hero.titleTop);
    expect(r.hero.subtitle).toBe(homeContent.hero.subtitle);
  });

  it('works with no settings at all', () => {
    expect(resolveHomeContent(undefined).hero.titleEmph).toBe(homeContent.hero.titleEmph);
  });
});
