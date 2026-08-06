import { describe, expect, it } from 'vitest';
import { pathTokens, suggestTours } from '@/lib/not-found-suggest';

// Δείγμα από τον πραγματικό κατάλογο.
const tours = [
  { slug: 'ekdromi-sta-meteora-kalampaka', title: 'Εκδρομή στα Μετέωρα και Καλαμπάκα' },
  { slug: 'monoimeri-ekdromi-stin-ydra', title: 'Μονοήμερη Εκδρομή στην Ύδρα' },
  { slug: 'nayplio-monoimeri-ekdromi', title: 'Ναύπλιο Μονοήμερη Εκδρομή' },
  { slug: 'thessaloniki-diimeri-ekdromi', title: 'Μονή Αγίου Παϊσίου Θεσσαλονίκη Διήμερη' },
  { slug: 'kroyaziera-saronikos', title: 'Κρουαζιέρα στον Σαρωνικό' },
];

describe('pathTokens', () => {
  it('βγάζει τις λέξεις από ολόκληρο path', () => {
    expect(pathTokens('/tour/ekdromi-sta-meteora')).toEqual(['ekdromi', 'sta', 'meteora']);
  });

  it('δέχεται και σκέτο slug', () => {
    expect(pathTokens('nayplio-monoimeri')).toEqual(['nayplio', 'monoimeri']);
  });

  it('λατινοποιεί ελληνικά και πετάει τις μικρές λέξεις', () => {
    expect(pathTokens('/tour/Μετέωρα-και-Καλαμπάκα')).toEqual(['meteora', 'kai', 'kalampaka']);
  });

  it('αποκωδικοποιεί %20 και αγνοεί το query', () => {
    expect(pathTokens('/tour/THESSALONIKI%20DIHMERH?x=1')).toEqual(['thessaloniki', 'dihmerh']);
  });

  it('κενό για κενή ή σκουπίδια είσοδο', () => {
    expect(pathTokens('')).toEqual([]);
    expect(pathTokens('/')).toEqual([]);
    expect(pathTokens('/tour/%E0%A4%A')).toEqual([]);
  });
});

describe('suggestTours', () => {
  it('βρίσκει την εκδρομή από μερική διεύθυνση', () => {
    const s = suggestTours('/tour/meteora', tours);
    expect(s[0].slug).toBe('ekdromi-sta-meteora-kalampaka');
  });

  it('ταιριάζει και με τον ελληνικό τίτλο, όχι μόνο με το slug', () => {
    // «paisiou» δεν υπάρχει στο slug· υπάρχει μόνο στον τίτλο.
    const s = suggestTours('/tour/agiou-paisiou', tours);
    expect(s[0].slug).toBe('thessaloniki-diimeri-ekdromi');
  });

  it('βάζει πρώτη αυτή με τις περισσότερες κοινές λέξεις', () => {
    const s = suggestTours('/tour/monoimeri-ekdromi-ydra', tours);
    expect(s[0].slug).toBe('monoimeri-ekdromi-stin-ydra');
  });

  it('δεν προτείνει τίποτα όταν δεν υπάρχει καμία σχέση', () => {
    expect(suggestTours('/tour/zzz-qqq-www', tours)).toEqual([]);
  });

  it('σέβεται το όριο προτάσεων', () => {
    // «ekdromi» υπάρχει σε πολλές — ζητάμε 2
    expect(suggestTours('/tour/ekdromi', tours, 2)).toHaveLength(2);
  });

  it('αντέχει κενή λίστα, κενή διεύθυνση και χαλασμένες εγγραφές', () => {
    expect(suggestTours('/tour/meteora', [])).toEqual([]);
    expect(suggestTours('', tours)).toEqual([]);
    expect(suggestTours('/tour/meteora', [{ slug: '', title: '' }])).toEqual([]);
    expect(suggestTours('/tour/meteora', null as unknown as typeof tours)).toEqual([]);
  });

  it('πιάνει το κολλημένο τέλος λέξης (meteor → meteora)', () => {
    expect(suggestTours('/tour/meteor', tours)[0].slug).toBe('ekdromi-sta-meteora-kalampaka');
  });

  // Οι πραγματικές διευθύνσεις του site γράφουν τα ίδια ελληνικά με διαφορετικά
  // λατινικά· χωρίς εξομάλυνση greeklish αυτές οι αναζητήσεις αστοχούσαν.
  it('ταιριάζει «DIHMERH» με «diimeri» (η ίδια η παλιά διεύθυνση του site)', () => {
    expect(suggestTours('/tour/THESSALONIKI DIHMERH EKDROMH', tours)[0].slug)
      .toBe('thessaloniki-diimeri-ekdromi');
  });

  it('ταιριάζει «agiou/paisiou» με «agioy/paisioy»', () => {
    expect(suggestTours('/tour/moni-agiou-paisiou', tours)[0].slug).toBe('thessaloniki-diimeri-ekdromi');
  });

  it('δεν διαλύει λέξεις με «th» ενώ εξομαλύνει το «h»', () => {
    // «thessaloniki» πρέπει να μείνει αναγνωρίσιμο, όχι να γίνει «tiessaloniki»
    expect(suggestTours('/tour/thessaloniki', tours)[0].slug).toBe('thessaloniki-diimeri-ekdromi');
  });
});
