import { describe, expect, it } from 'vitest';
import { resolveTourAlias } from '@/lib/tour-aliases';

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
