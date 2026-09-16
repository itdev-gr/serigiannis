import { describe, expect, it } from 'vitest';
import { resolveTourAlias, tourAliasHref } from '@/lib/tour-aliases';
import { LEGACY_TOUR_ALIASES } from '@/lib/legacy-tour-aliases';

describe('resolveTourAlias', () => {
  it('στέλνει την παλιά διεύθυνση με κενά στη νέα', () => {
    expect(resolveTourAlias('THESSALONIKI DIHMERH EKDROMH')).toBe('thessaloniki-diimeri-ekdromi');
    expect(resolveTourAlias('ekdromi sta lixadonisia')).toBe('ekdromi-sta-lixadonisia');
  });

  it('πιάνει και τη μορφή με «+» αντί για κενό', () => {
    expect(resolveTourAlias('THESSALONIKI+DIHMERH+EKDROMH')).toBe('thessaloniki-diimeri-ekdromi');
    expect(resolveTourAlias('ekdromi+sta+lixadonisia')).toBe('ekdromi-sta-lixadonisia');
  });

  it('αγνοεί πεζά/κεφαλαία', () => {
    expect(resolveTourAlias('thessaloniki dihmerh ekdromh')).toBe('thessaloniki-diimeri-ekdromi');
    expect(resolveTourAlias('EKDROMI STA LIXADONISIA')).toBe('ekdromi-sta-lixadonisia');
  });

  it('στέλνει τις αποσυρμένες διπλοεγγραφές στην πλήρη εκδοχή', () => {
    expect(resolveTourAlias('moni-agioy-pasioy-soyrotis-thessaloniki-diimeri-proskynimatiki-ekdromi'))
      .toBe('thessaloniki-diimeri-ekdromi');
    expect(resolveTourAlias('lixadonisia-kavos-sergiani-travel')).toBe('ekdromi-sta-lixadonisia');
  });

  it('null για άγνωστο ή κενό slug', () => {
    expect(resolveTourAlias('kati-allo')).toBeNull();
    expect(resolveTourAlias('')).toBeNull();
    expect(resolveTourAlias(undefined as unknown as string)).toBeNull();
  });

  it('δεν ανακατευθύνει το ΝΕΟ slug στον εαυτό του (αποφυγή βρόχου)', () => {
    expect(resolveTourAlias('thessaloniki-diimeri-ekdromi')).toBeNull();
    expect(resolveTourAlias('ekdromi-sta-lixadonisia')).toBeNull();
  });
});

describe('παλιές διευθύνσεις του WordPress site (legacy aliases)', () => {
  it('στέλνει τις πιο δημοφιλείς παλιές εκδρομές στη νέα τους σελίδα', () => {
    expect(resolveTourAlias('tinos-monoimeri-proskynimatiki-ekdromi-kathe-savvato-kyriaki-apo-athina'))
      .toBe('monoimeri-ekdromi-gia-proskynima-stin-panagia-tis-tinoy-kath');
    expect(resolveTourAlias('spetses-monoimeri-ekdromi-stin-arxontissa-toy-argosaronikoy'))
      .toBe('spetses-to-archontiko-nisi-toy-argosaronikoy-imerisia-ekdrom');
    expect(resolveTourAlias('monoimeri-ekdromi-mani-gytheio-limeni-areopoli'))
      .toBe('28i-oktovrioy-monoimeri-ekdromi-sti-mani-areopoli-gytheio');
  });

  it('αγνοεί το τελικό «/» που είχαν όλες οι διευθύνσεις του παλιού site', () => {
    expect(resolveTourAlias('proskynima-stin-tino-kathe-savvato-kyriaki-apo-athina/'))
      .toBe('monoimeri-ekdromi-gia-proskynima-stin-panagia-tis-tinoy-kath');
  });

  it('πιάνει slug με ελληνικούς χαρακτήρες όπως τα δίνει αποκωδικοποιημένα το Next', () => {
    expect(resolveTourAlias('thessaloniki-proskynima-ston-agio-paΐsio-diimeri-proskynimatiki-ekdromi-me-poylman'))
      .toBe('thessaloniki-proskynima-ston-agio-pasio-diimeri-proskynimatiki-ekdromi-me-poylman');
    expect(resolveTourAlias('΄andros-monoimeri-ekdromi-stin-kapetanissa-ton-kykladon'))
      .toBe('monoimeri-ekdromi-stin-andro-i-kapetanissa-ton-kykladon');
  });

  it('επιστρέφει πλήρες path όταν ο προορισμός είναι άρθρο ή κατηγορία', () => {
    expect(resolveTourAlias('sxolikes-monoimeres-ekdromes-protaseis-apo-athina'))
      .toBe('/nea/sxolikes-monoimeres-ekdromes-apo-athina-protaseis-gia-kathe');
    expect(resolveTourAlias('kathimerina-thalassia-oikonomika-mpania-proina-mesimeriana-6-ores-paramoni-stin-thalassa'))
      .toBe('/ekdromes/thalassia-mpania');
  });

  it('οι δικές μας μετονομασίες υπερισχύουν του legacy πίνακα', () => {
    // Υπάρχει και στα δύο αρχεία· το tour-aliases.ts δείχνει στην πλήρη εκδοχή.
    expect(resolveTourAlias('lixadonisia-kavos-sergiani-travel')).toBe('ekdromi-sta-lixadonisia');
  });

  it('κανένας στόχος δεν είναι ο ίδιος με το κλειδί του (αποφυγή βρόχου)', () => {
    for (const [oldSlug, target] of Object.entries(LEGACY_TOUR_ALIASES)) {
      expect(target.toLowerCase(), oldSlug).not.toBe(oldSlug.toLowerCase());
      expect(target, oldSlug).toMatch(/^(\/(nea|ekdromes)\/[a-z0-9-]+|[a-z0-9-]+)$/);
    }
  });
});

describe('tourAliasHref', () => {
  it('slug → /tour/<slug>, path → όπως είναι', () => {
    expect(tourAliasHref('ekdromi-sta-lixadonisia')).toBe('/tour/ekdromi-sta-lixadonisia');
    expect(tourAliasHref('/ekdromes/monoimeres')).toBe('/ekdromes/monoimeres');
  });
});
