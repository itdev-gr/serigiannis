import { describe, it, expect } from 'vitest';
import { findMatches, normalizeGreek, sectionMatches } from '@/lib/odigos-search';
import { ODIGOS_SECTIONS, withValues, type OdigosSection } from '@/data/odigos-content';

describe('normalizeGreek', () => {
  it('strips accents and lowercases', () => {
    expect(normalizeGreek('ΑΚΥΡΩΣΗ')).toBe('ακυρωση');
    expect(normalizeGreek('Ακύρωση')).toBe('ακυρωση');
    expect(normalizeGreek('τηλεφωνική κράτηση')).toBe('τηλεφωνικη κρατηση');
  });
  it('handles dialytika', () => {
    expect(normalizeGreek('Ναΰπλιο')).toBe('ναυπλιο');
  });
});

describe('findMatches', () => {
  it('finds accent-insensitive matches with original-string indices', () => {
    const text = 'Η Ακύρωση γίνεται από το γραφείο.';
    const [m] = findMatches(text, 'ακυρωση');
    expect(text.slice(m[0], m[1])).toBe('Ακύρωση');
  });
  it('finds multiple occurrences', () => {
    expect(findMatches('θέση θέση θέση', 'θεση')).toHaveLength(3);
  });
  it('returns empty for blank or missing query', () => {
    expect(findMatches('κείμενο', '')).toEqual([]);
    expect(findMatches('κείμενο', 'ανύπαρκτο')).toEqual([]);
  });
});

describe('sectionMatches', () => {
  const section: OdigosSection = {
    id: 't',
    group: 'Δοκιμή',
    title: 'Κρατήσεις Εισιτηρίων',
    keywords: ['refund', 'επιστροφή χρημάτων'],
    blocks: [
      { kind: 'steps', items: ['Πατήστε «Πληρώθηκε στο γραφείο».'] },
      { kind: 'table', head: ['Κατάσταση'], rows: [['Έληξε']] },
    ],
  };
  it('matches on title, keywords, steps and table cells (accent-insensitive)', () => {
    expect(sectionMatches(section, 'ΕΙΣΙΤΗΡΙΩΝ')).toBe(true);
    expect(sectionMatches(section, 'refund')).toBe(true);
    expect(sectionMatches(section, 'πληρωθηκε')).toBe(true);
    expect(sectionMatches(section, 'εληξε')).toBe(true);
  });
  it('rejects unrelated queries and accepts empty query', () => {
    expect(sectionMatches(section, 'λεωφορειο')).toBe(false);
    expect(sectionMatches(section, '')).toBe(true);
  });
});

describe('odigos content', () => {
  it('every placeholder in the content is substituted by withValues', () => {
    const subbed = withValues(ODIGOS_SECTIONS, {
      hold_minutes: '30',
      sales_window_days: '30',
      default_cutoff_min: '20',
      refund_policy: 'Χ πολιτική.',
    });
    const texts: string[] = [];
    for (const s of subbed) {
      for (const b of s.blocks) {
        if (b.kind === 'p' || b.kind === 'tip' || b.kind === 'warning') texts.push(b.text);
        else if (b.kind === 'steps') texts.push(...b.items);
        else if (b.kind === 'table') texts.push(...b.head, ...b.rows.flat());
      }
    }
    const leftover = texts.filter((t) => /\{\w+\}/.test(t));
    expect(leftover).toEqual([]);
  });
  it('ο οδηγός εξηγεί τη στάση ανά επιβάτη', () => {
    const texts: string[] = [];
    for (const s of ODIGOS_SECTIONS) {
      for (const b of s.blocks) {
        if (b.kind === 'p' || b.kind === 'tip' || b.kind === 'warning') texts.push(b.text);
        else if (b.kind === 'steps') texts.push(...b.items);
        else if (b.kind === 'table') texts.push(...b.head, ...b.rows.flat());
      }
    }
    const all = texts.join(' ');
    expect(all).toMatch(/σημείο επιβίβασης/i);
    expect(all).toMatch(/κάθε επιβάτη|ανά επιβάτη|κάθε ταξιδιώτη/i);
  });

  it('has unique section ids', () => {
    const ids = ODIGOS_SECTIONS.map((s) => s.id);
    expect(new Set(ids).size).toBe(ids.length);
  });

  // Οι σελίδες /admin/excursions, /admin/routes, /admin/schedules και
  // /admin/stations έχουν διαγραφεί — ένας σύνδεσμος προς αυτές στέλνει τον
  // υπάλληλο σε 404 και ο οδηγός χάνει την αξιοπιστία του.
  it('κάθε σύνδεσμος δείχνει σε σελίδα του admin που υπάρχει', () => {
    const DELETED = ['/admin/excursions', '/admin/routes', '/admin/schedules', '/admin/stations'];
    const hrefs = ODIGOS_SECTIONS.flatMap((s) =>
      s.blocks.filter((b) => b.kind === 'link').map((b) => (b as { href: string }).href)
    );
    expect(hrefs.length).toBeGreaterThan(0);
    for (const href of hrefs) {
      expect(href.startsWith('/admin/'), `bad href: ${href}`).toBe(true);
      expect(DELETED, `deleted page: ${href}`).not.toContain(href.split('?')[0]);
    }
  });
});

/** Όλο το κείμενο του οδηγού σε μία συμβολοσειρά, για ελέγχους περιεχομένου. */
function allText(): string {
  const texts: string[] = [];
  for (const s of ODIGOS_SECTIONS) {
    texts.push(s.title, ...s.keywords);
    for (const b of s.blocks) {
      if (b.kind === 'p' || b.kind === 'tip' || b.kind === 'warning') texts.push(b.text);
      else if (b.kind === 'steps') texts.push(...b.items);
      else if (b.kind === 'table') texts.push(...b.head, ...b.rows.flat());
      else if (b.kind === 'link') texts.push(b.label);
    }
  }
  return texts.join(' ');
}

describe('odigos: ο οδηγός περιγράφει το σημερινό admin', () => {
  it('αναφέρει και τις τρεις καρτέλες των «Εκδρομών»', () => {
    const all = allText();
    for (const tab of ['Σελίδες εκδρομών', 'Πούλμαν & θέσεις', 'Κατηγορίες']) {
      expect(all, `λείπει η καρτέλα: ${tab}`).toContain(tab);
    }
  });

  it('εξηγεί το προαιρετικό email επιβάτη και τα νέα πεδία της σελίδας εκδρομής', () => {
    const all = allText();
    expect(all).toMatch(/email επιβάτη/i);
    expect(all).toContain('Τι θα δείτε');
    expect(all).toContain('Δεν περιλαμβάνονται');
  });
});
