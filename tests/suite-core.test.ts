import { afterEach, describe, expect, it, vi } from 'vitest';

import { decodeEntities, decodeMaybe } from '@/lib/text';
import { sanitizeArticleHtml } from '@/lib/sanitize-html';
import { resolvePublishedAt } from '@/lib/posts-publish';
import { sortPostsForListing } from '@/lib/posts-sort';
import { groupClients } from '@/lib/queries/leads';
import { athensDepartureAt, athensToday } from '@/lib/athens-time';
import { centsFromMajorUnits, paymentAmountNote } from '@/lib/payments/amount';
import { getPaymentProvider, getProviderById } from '@/lib/payments';
import { offlineProvider } from '@/lib/payments/offline';
import { vivaProvider } from '@/lib/payments/viva';
import { ODIGOS_SECTIONS, withValues } from '@/data/odigos-content';
import { findMatches, normalizeGreek, sectionMatches } from '@/lib/odigos-search';
import { buildTermsOfUseSections } from '@/lib/legal/terms-of-use';
import { buildPrivacyPolicySections } from '@/lib/legal/privacy-policy';
import { groupRouteDates } from '@/lib/excursions';
import { passengerRecipients } from '@/lib/ticket-notify';
import { cn, formatEuro } from '@/lib/utils';
import type { Lead, Post, SettingsData } from '@/types/db';
import type { OrderTicket } from '@/types/ticketing';

/* ═════════════════════════════ lib/text ═════════════════════════════ */

describe('decodeEntities — οριακές περιπτώσεις', () => {
  it('το κενό κείμενο μένει κενό', () => {
    expect(decodeEntities('')).toBe('');
  });

  it('το &nbsp; γίνεται απλό κενό, όχι αδιάσπαστο', () => {
    const out = decodeEntities('Αθήνα&nbsp;Πάτρα');
    expect(out).toBe('Αθήνα Πάτρα');
    expect(out.charCodeAt(5)).toBe(32);
  });

  it('η διπλή κωδικοποίηση ξετυλίγεται μία μόνο φορά', () => {
    expect(decodeEntities('&amp;#8211;')).toBe('&#8211;');
  });

  it('αποκωδικοποιεί €, °, εισαγωγικά και απόστροφο', () => {
    expect(decodeEntities('35&euro; &deg; &lsquo;a&rsquo; &ldquo;b&rdquo; &apos;')).toBe(
      "35€ ° ‘a’ “b” '"
    );
  });

  it('δουλεύει σε πολύ μεγάλο κείμενο', () => {
    const big = 'Αράχωβα &#8211; Δελφοί. '.repeat(5000);
    const out = decodeEntities(big);
    expect(out).not.toContain('&#8211;');
    expect(out.split('–')).toHaveLength(5001);
  });

  it('το decodeMaybe κρατά το κενό string ως κενό (δεν το κάνει null)', () => {
    expect(decodeMaybe('')).toBe('');
  });
});

/* ═════════════════════════ lib/sanitize-html ════════════════════════ */

describe('sanitizeArticleHtml — φωλιασμένα και επικίνδυνα', () => {
  it('κρατά ανέπαφη τη φωλιασμένη δομή του άρθρου', () => {
    const html =
      '<div class="wrap"><blockquote><p>Κείμενο <em>με <strong>έμφαση</strong></em></p></blockquote>' +
      '<ol><li><a href="/ekdromes/meteora">Μετέωρα</a></li></ol></div>';
    expect(sanitizeArticleHtml(html)).toBe(html);
  });

  it('πιάνει τα ΚΕΦΑΛΑΙΑ tags', () => {
    const out = sanitizeArticleHtml('<SCRIPT>alert(1)</SCRIPT><P>κείμενο</P>');
    expect(out).toBe('<P>κείμενο</P>');
  });

  it('σβήνει noscript, template, svg, math, frameset και applet με το περιεχόμενό τους', () => {
    for (const tag of ['noscript', 'template', 'svg', 'math', 'frameset', 'applet']) {
      const out = sanitizeArticleHtml(`<p>a</p><${tag}>κακό</${tag}>`);
      expect(out, tag).toBe('<p>a</p>');
    }
  });

  it('σβήνει τα μονά link, meta, base, param, source', () => {
    for (const tag of ['link', 'meta', 'base', 'param', 'source']) {
      const out = sanitizeArticleHtml(`<${tag} href="x" rel="y"><p>a</p>`);
      expect(out, tag).toBe('<p>a</p>');
    }
  });

  it('σβήνει όλους τους χειριστές συμβάντων ενός στοιχείου μαζί', () => {
    const out = sanitizeArticleHtml(`<div onclick="a()" onmouseenter='b()' onfocus=c()>x</div>`);
    expect(out).toBe('<div>x</div>');
  });

  it('το srcdoc φεύγει πάντα, ακόμη κι όταν φαίνεται αθώο', () => {
    const out = sanitizeArticleHtml('<div srcdoc="γεια">x</div>');
    expect(out).not.toContain('srcdoc');
    expect(out).toContain('x');
  });

  it('κρατά ακίνδυνα σχήματα URL (mailto, tel, σχετικά, https)', () => {
    const html = '<a href="mailto:info@example.gr">mail</a><a href="tel:+302100000000">tel</a>' +
      '<a href="/eisitiria">κρατήσεις</a><a href="https://example.gr">έξω</a>';
    expect(sanitizeArticleHtml(html)).toBe(html);
  });

  it('τα data-* attributes δεν ελέγχονται (μένουν ως έχουν)', () => {
    const html = '<div data-note="javascript:alert(1)">x</div>';
    expect(sanitizeArticleHtml(html)).toBe(html);
  });

  it('κόβει το data:image/svg+xml, δέχεται τα raster data:image', () => {
    // Το svg+xml μπορεί να περιέχει script αν φορτωθεί εκτός <img>.
    expect(sanitizeArticleHtml('<img src="data:image/svg+xml;base64,PHN2Zz48L3N2Zz4=">')).toBe('<img>');
    const png = '<img src="data:image/png;base64,iVBORw0KGgo=">';
    expect(sanitizeArticleHtml(png)).toBe(png);
  });

  it('αντέχει πολύ μεγάλο άρθρο', () => {
    const html = '<p>Παράγραφος με λίγο κείμενο.</p>'.repeat(3000) + '<script>alert(1)</script>';
    const out = sanitizeArticleHtml(html);
    expect(out).not.toContain('script');
    expect(out.split('<p>')).toHaveLength(3001);
  });
});

/* ═══════════════════════ lib/posts-publish ══════════════════════════ */

describe('resolvePublishedAt — συνδυασμοί κατάστασης/ημερομηνίας', () => {
  it('νέα υποβληθείσα ημερομηνία αντικαθιστά την παλιά (μεσημέρι UTC)', () => {
    expect(
      resolvePublishedAt({ status: 'published', submitted: '2026-04-10', existing: '2026-01-02T10:30:00.000Z' })
    ).toBe('2026-04-10T12:00:00.000Z');
  });

  it('η υποβληθείσα ημερομηνία μετράει και σε πρόχειρο άρθρο', () => {
    expect(resolvePublishedAt({ status: 'draft', submitted: '2026-04-10', existing: null })).toBe(
      '2026-04-10T12:00:00.000Z'
    );
  });

  it('κενό string ως παλιά τιμή μετράει ως «ποτέ δημοσιευμένο»', () => {
    const out = resolvePublishedAt({ status: 'published', submitted: '', existing: '' });
    expect(out).not.toBe('');
    expect(Math.abs(Date.now() - new Date(out!).getTime())).toBeLessThan(5000);
  });

  it('ίδια ημέρα αλλά διαφορετική ώρα: κρατά το ακριβές timestamp', () => {
    expect(
      resolvePublishedAt({ status: 'published', submitted: '2026-01-02', existing: '2026-01-02T23:59:59.999Z' })
    ).toBe('2026-01-02T23:59:59.999Z');
  });

  it('η 29η Φεβρουαρίου σε μη δίσεκτο έτος κυλάει στην 1η Μαρτίου', () => {
    expect(resolvePublishedAt({ status: 'published', submitted: '2026-02-29', existing: null })).toBe(
      '2026-03-01T12:00:00.000Z'
    );
  });
});

/* ════════════════════════ lib/posts-sort ════════════════════════════ */

const post = (id: string, trip_date: string | null, published_at: string | null): Post =>
  ({ id, trip_date, published_at } as unknown as Post);

describe('sortPostsForListing — επιπλέον συνδυασμοί', () => {
  it('κενή λίστα δίνει κενή λίστα', () => {
    expect(sortPostsForListing([], '2026-07-30')).toEqual([]);
  });

  it('η σημερινή εκδρομή μετράει ως επερχόμενη, η χθεσινή ως περασμένη', () => {
    const ids = sortPostsForListing(
      [post('χθες', '2026-07-29', null), post('σήμερα', '2026-07-30', null)],
      '2026-07-30'
    ).map((p) => p.id);
    expect(ids).toEqual(['σήμερα', 'χθες']);
  });

  it('άρθρα χωρίς ημερομηνία εκδρομής: το null published_at πάει τελευταίο', () => {
    const ids = sortPostsForListing(
      [post('χωρίς', null, null), post('με', null, '2026-01-01')],
      '2026-07-30'
    ).map((p) => p.id);
    expect(ids).toEqual(['με', 'χωρίς']);
  });

  it('ίδιες ημερομηνίες εκδρομής κρατούν σταθερή σειρά', () => {
    const ids = sortPostsForListing(
      [post('a', '2026-08-01', null), post('b', '2026-08-01', null), post('c', '2026-08-01', null)],
      '2026-07-30'
    ).map((p) => p.id);
    expect(ids).toEqual(['a', 'b', 'c']);
  });

});

/* ═════════════════════ lib/queries/leads ════════════════════════════ */

const lead = (o: Partial<Lead>): Lead =>
  ({
    id: 'x', type: 'contact', status: 'new', name: 'Α', email: null, phone: null,
    subject: null, message: null, tour_id: null, preferred_date: null, party_size: null,
    source_path: null, admin_notes: null, created_at: '2026-01-01T00:00:00Z',
    updated_at: '2026-01-01T00:00:00Z', ...o,
  }) as Lead;

describe('groupClients — κλειδί, κενά και σειρά', () => {
  it('τα κενά γύρω από το email δεν σπάνε την ομαδοποίηση', () => {
    const clients = groupClients([
      lead({ id: '1', email: '  Maria@Example.com  ' }),
      lead({ id: '2', email: 'maria@example.com' }),
    ]);
    expect(clients).toHaveLength(1);
    expect(clients[0].key).toBe('maria@example.com');
  });

  it('το τηλέφωνο κανονικοποιείται χωρίς κενά', () => {
    const clients = groupClients([
      lead({ id: '1', phone: '210 111 2222' }),
      lead({ id: '2', phone: '2101112222' }),
    ]);
    expect(clients).toHaveLength(1);
    expect(clients[0].count).toBe(2);
  });

  it('το email υπερισχύει του τηλεφώνου: ίδιο τηλέφωνο, δύο email → δύο πελάτες', () => {
    const clients = groupClients([
      lead({ id: '1', email: 'a@a.gr', phone: '210111' }),
      lead({ id: '2', email: 'b@b.gr', phone: '210111' }),
    ]);
    expect(clients).toHaveLength(2);
  });

  it('email μόνο με κενά πέφτει πίσω στο τηλέφωνο', () => {
    const clients = groupClients([lead({ id: '1', email: '   ', phone: '210111' })]);
    expect(clients).toHaveLength(1);
    expect(clients[0].key).toBe('210111');
  });

  it('τηλέφωνο μόνο με κενά και χωρίς email: ο πελάτης αγνοείται', () => {
    expect(groupClients([lead({ email: null, phone: '   ' })])).toHaveLength(0);
  });

  it('κρατά το όνομα της πρώτης εγγραφής της ομάδας', () => {
    const clients = groupClients([
      lead({ id: '1', name: 'Πρώτο', email: 'a@a.gr' }),
      lead({ id: '2', name: 'Δεύτερο', email: 'a@a.gr' }),
    ]);
    expect(clients[0].name).toBe('Πρώτο');
    expect(clients[0].leads.map((l) => l.id)).toEqual(['1', '2']);
  });

  it('το lastActivity παίρνει τη νεότερη ημερομηνία, ό,τι σειρά κι αν έρθουν', () => {
    const clients = groupClients([
      lead({ id: '1', email: 'a@a.gr', created_at: '2026-05-01T00:00:00Z' }),
      lead({ id: '2', email: 'a@a.gr', created_at: '2026-02-01T00:00:00Z' }),
    ]);
    expect(clients[0].lastActivity).toBe('2026-05-01T00:00:00Z');
  });

});

/* ═════════════════════════ lib/athens-time ══════════════════════════ */

describe('athensToday', () => {
  it('αργά το βράδυ UTC έχει ήδη αλλάξει η μέρα στην Αθήνα (χειμώνας)', () => {
    expect(athensToday(new Date('2026-01-15T22:30:00Z'))).toBe('2026-01-16');
  });

  it('το καλοκαίρι η μέρα αλλάζει μία ώρα νωρίτερα σε UTC', () => {
    expect(athensToday(new Date('2026-07-15T21:30:00Z'))).toBe('2026-07-16');
    expect(athensToday(new Date('2026-07-15T20:30:00Z'))).toBe('2026-07-15');
  });

  it('άκυρη ημερομηνία πετάει RangeError', () => {
    expect(() => athensToday(new Date('χαλασμένο'))).toThrow(RangeError);
  });
});

describe('athensDepartureAt — γύρω από την αλλαγή ώρας', () => {
  it('η 02:00 της Κυριακής της αλλαγής υπάρχει κανονικά ως +02:00', () => {
    expect(athensDepartureAt('2026-03-29', '02:00')).toBe('2026-03-29T02:00:00+02:00');
  });

  it('η ανύπαρκτη 03:30 της άνοιξης καταλήγει σε +02:00 (η δεύτερη πάσα γυρίζει πίσω)', () => {
    expect(athensDepartureAt('2026-03-29', '03:30')).toBe('2026-03-29T03:30:00+02:00');
  });

  it('τα ξημερώματα της αλλαγής του φθινοπώρου δίνουν ακόμη +03:00', () => {
    expect(athensDepartureAt('2026-10-25', '02:00')).toBe('2026-10-25T02:00:00+03:00');
    expect(athensDepartureAt('2026-10-25', '04:00')).toBe('2026-10-25T04:00:00+02:00');
  });

  it('άκυρη ημερομηνία ή ώρα πετάει RangeError', () => {
    expect(() => athensDepartureAt('χωρίς-ημερομηνία', '09:00')).toThrow(RangeError);
    expect(() => athensDepartureAt('2026-07-15', '')).toThrow(RangeError);
  });
});

/* ══════════════════════════ lib/payments ════════════════════════════ */

describe('getPaymentProvider / getProviderById', () => {
  afterEach(() => {
    vi.unstubAllEnvs();
  });

  it('χωρίς PAYMENT_PROVIDER πέφτει στο offline', () => {
    vi.stubEnv('PAYMENT_PROVIDER', undefined as unknown as string);
    expect(getPaymentProvider().id).toBe('offline');
  });

  it('PAYMENT_PROVIDER=viva δίνει τον πάροχο Viva', () => {
    vi.stubEnv('PAYMENT_PROVIDER', 'viva');
    expect(getPaymentProvider()).toBe(vivaProvider);
    expect(vivaProvider.id).toBe('viva');
  });

  it('άγνωστη ή ΚΕΦΑΛΑΙΑ τιμή πέφτει στο offline', () => {
    vi.stubEnv('PAYMENT_PROVIDER', 'stripe');
    expect(getPaymentProvider().id).toBe('offline');
    vi.stubEnv('PAYMENT_PROVIDER', 'VIVA');
    expect(getPaymentProvider().id).toBe('offline');
  });

  it('άγνωστο id δίνει null', () => {
    expect(getProviderById('paypal')).toBeNull();
    expect(getProviderById('')).toBeNull();
  });
});

describe('offlineProvider — συμπεριφορά χωρίς πύλη', () => {
  it('δεν έχει ανακατεύθυνση: πετάει σφάλμα', async () => {
    await expect(
      offlineProvider.createRedirect({
        orderId: 'o1', publicCode: 'P1', amountCents: 1000, email: 'a@a.gr', returnUrl: '/x',
      })
    ).rejects.toThrow(/offline/);
  });

  it('η επιστροφή από τον browser δεν επιβεβαιώνεται ποτέ και το webhook αγνοείται', async () => {
    await expect(offlineProvider.verifyReturn(new URLSearchParams('t=1'))).resolves.toEqual({ ok: false });
    await expect(offlineProvider.verifyWebhook(new Request('https://x.gr'))).resolves.toBeNull();
  });

});

describe('ποσά πληρωμής — επιπλέον όρια', () => {
  it('μηδέν και αρνητικά ποσά μετατρέπονται κανονικά', () => {
    expect(centsFromMajorUnits(0)).toBe(0);
    expect(centsFromMajorUnits(-12.5)).toBe(-1250);
  });

  it('μη πεπερασμένο αναμενόμενο ποσό δεν παράγει σημείωση', () => {
    expect(paymentAmountNote(Number.NaN, 3000)).toBeNull();
  });

  it('μηδενική χρέωση σε μη μηδενική κράτηση σημειώνεται', () => {
    const note = paymentAmountNote(3000, 0);
    expect(note).toContain('0,00');
    expect(note).toContain('30,00');
  });

});

/* ═════════════════ data/odigos-content + odigos-search ══════════════ */

describe('ODIGOS_SECTIONS — αναλλοίωτα περιεχομένου', () => {
  it('κάθε ενότητα έχει id, ομάδα, τίτλο και τουλάχιστον ένα block', () => {
    for (const s of ODIGOS_SECTIONS) {
      expect(s.id.trim(), s.id).not.toBe('');
      expect(s.group.trim(), s.id).not.toBe('');
      expect(s.title.trim(), s.id).not.toBe('');
      expect(s.blocks.length, s.id).toBeGreaterThan(0);
    }
  });

  it('τα id είναι καθαρά τμήματα URL (πεζά λατινικά, ψηφία, παύλες)', () => {
    for (const s of ODIGOS_SECTIONS) expect(s.id, s.id).toMatch(/^[a-z0-9-]+$/);
  });

  it('κάθε σύνδεσμος δείχνει εσωτερικά (ξεκινά με «/») και έχει ετικέτα', () => {
    const links = ODIGOS_SECTIONS.flatMap((s) => s.blocks).filter((b) => b.kind === 'link');
    expect(links.length).toBeGreaterThan(0);
    for (const l of links) {
      if (l.kind !== 'link') continue;
      expect(l.href, l.label).toMatch(/^\//);
      expect(l.label.trim()).not.toBe('');
    }
  });

  it('κάθε πίνακας έχει επικεφαλίδες και γραμμές ίδιου πλάτους', () => {
    for (const s of ODIGOS_SECTIONS) {
      for (const b of s.blocks) {
        if (b.kind !== 'table') continue;
        expect(b.head.length, s.id).toBeGreaterThan(0);
        for (const row of b.rows) expect(row.length, `${s.id}: ${row[0]}`).toBe(b.head.length);
      }
    }
  });

  it('το withValues δεν πειράζει τα link blocks ούτε την αρχική λίστα', () => {
    const before = JSON.stringify(ODIGOS_SECTIONS);
    const out = withValues(ODIGOS_SECTIONS, { hold_minutes: '30' });
    expect(JSON.stringify(ODIGOS_SECTIONS)).toBe(before);
    const link = out.flatMap((s) => s.blocks).find((b) => b.kind === 'link');
    const orig = ODIGOS_SECTIONS.flatMap((s) => s.blocks).find((b) => b.kind === 'link');
    expect(link).toBe(orig);
  });

});

describe('findMatches / sectionMatches — τόνοι και πολλές λέξεις', () => {
  it('βρίσκει φράση πολλών λέξεων αγνοώντας τόνους', () => {
    const text = 'Η Τηλεφωνική Κράτηση γίνεται στο γραφείο.';
    const [m] = findMatches(text, 'τηλεφωνικη κρατηση');
    expect(text.slice(m[0], m[1])).toBe('Τηλεφωνική Κράτηση');
  });

  it('κόβει τα κενά γύρω από το query', () => {
    expect(findMatches('θέση', '  θεση  ')).toEqual([[0, 4]]);
  });

  it('query μόνο με κενά δεν δίνει ταιριάσματα', () => {
    expect(findMatches('κείμενο', '   ')).toEqual([]);
  });

  it('οι επικαλυπτόμενες εμφανίσεις μετρούν μία φορά (σάρωση χωρίς επικάλυψη)', () => {
    expect(findMatches('ααααα', 'αα')).toEqual([
      [0, 2],
      [2, 4],
    ]);
  });

  it('το τελικό «ς» ενοποιείται με το «σ», όπως και στο searchNormalize', () => {
    expect(findMatches('θέσεις', 'θεσεισ')).toHaveLength(1);
    expect(findMatches('θέσεις', 'θεσεις')).toHaveLength(1);
  });

  it('η ενότητα ταιριάζει και από ετικέτα συνδέσμου ή κείμενο tip/warning', () => {
    const section = {
      id: 's', group: 'g', title: 'Τίτλος', keywords: [],
      blocks: [
        { kind: 'link' as const, href: '/admin/orders', label: 'Άνοιγμα: Κρατήσεις' },
        { kind: 'tip' as const, text: 'Συμβουλή για τα λεωφορεία.' },
        { kind: 'warning' as const, text: 'Προσοχή στην Ακύρωση.' },
      ],
    };
    expect(sectionMatches(section, 'κρατησεις')).toBe(true);
    expect(sectionMatches(section, 'ΛΕΩΦΟΡΕΙΑ')).toBe(true);
    expect(sectionMatches(section, 'ακυρωση')).toBe(true);
    expect(sectionMatches(section, 'ξενοδοχειο')).toBe(false);
  });

  it('αναζήτηση «ακύρωση» στον πραγματικό οδηγό βρίσκει ενότητες', () => {
    expect(ODIGOS_SECTIONS.filter((s) => sectionMatches(s, 'ακύρωση')).length).toBeGreaterThan(0);
    expect(normalizeGreek('Ακύρωσης')).toBe('ακυρωσησ');
  });
});

/* ═══════════════════════════ lib/legal ══════════════════════════════ */

const settings = (over: Partial<SettingsData> = {}): SettingsData => ({
  phones: ['26230 12345', '6970000000'],
  address: 'Πλατεία Γαστούνης 1',
  email: 'info@sergianitravel.gr',
  hours: { weekdays: '09:00-21:00', saturday: '09:00-14:00' },
  ...over,
});

describe('buildTermsOfUseSections', () => {
  it('δεν αφήνει κανένα placeholder στο κείμενο', () => {
    const out = buildTermsOfUseSections(settings());
    expect(out.length).toBeGreaterThan(0);
    for (const s of out) expect(s.body, s.title).not.toContain('{{');
  });

  it('βάζει διεύθυνση, email και όλα τα τηλέφωνα χωρισμένα με κόμμα', () => {
    const all = buildTermsOfUseSections(settings()).map((s) => s.body).join('\n');
    expect(all).toContain('Πλατεία Γαστούνης 1');
    expect(all).toContain('info@sergianitravel.gr');
    expect(all).toContain('26230 12345, 6970000000');
  });

  it('κάθε ενότητα έχει τίτλο· μόνο η «10. ΠΕΡΙΛΑΜΒΑΝΟΜΕΝΕΣ ΥΠΗΡΕΣΙΕΣ» έχει άδειο σώμα σήμερα', () => {
    const out = buildTermsOfUseSections(settings());
    for (const s of out) expect(s.title.trim()).not.toBe('');
    expect(out.filter((s) => s.body.trim() === '').map((s) => s.title)).toEqual([
      '10. ΠΕΡΙΛΑΜΒΑΝΟΜΕΝΕΣ ΥΠΗΡΕΣΙΕΣ',
    ]);
  });

});

describe('buildPrivacyPolicySections', () => {
  it('δεν αφήνει κανένα placeholder στο κείμενο', () => {
    const out = buildPrivacyPolicySections(settings());
    expect(out.length).toBeGreaterThan(0);
    for (const s of out) expect(s.body, s.title).not.toContain('{{');
  });

  it('χρησιμοποιεί το ΠΡΩΤΟ τηλέφωνο, όχι όλη τη λίστα', () => {
    const all = buildPrivacyPolicySections(settings()).map((s) => s.body).join('\n');
    expect(all).toContain('26230 12345');
    expect(all).not.toContain('26230 12345, 6970000000');
  });

  it('χωρίς τηλέφωνα πέφτει στο 24ωρο κινητό', () => {
    const all = buildPrivacyPolicySections(settings({ phones: [], phone24h: '6971111111' }))
      .map((s) => s.body)
      .join('\n');
    expect(all).toContain('6971111111');
    expect(all).not.toContain('{{PHONE}}');
  });

  it('χωρίς κανένα τηλέφωνο ο placeholder αντικαθίσταται με κενό', () => {
    const all = buildPrivacyPolicySections(settings({ phones: [] })).map((s) => s.body).join('\n');
    expect(all).not.toContain('{{');
  });
});

/* ════════════════════════ lib/excursions ════════════════════════════ */

describe('groupRouteDates — επιπλέον περιπτώσεις', () => {
  it('κρατά τη σειρά εμφάνισης των διαδρομών στο Map', () => {
    const map = groupRouteDates([
      { route_id: 'b', service_date: '2026-01-02' },
      { route_id: 'a', service_date: '2026-01-01' },
    ]);
    expect([...map.keys()]).toEqual(['b', 'a']);
  });

  it('ταξινομεί ανακατεμένες ημερομηνίες αύξουσα, ακόμη κι όταν αλλάζει χρονιά', () => {
    const map = groupRouteDates(
      ['2026-12-31', '2025-01-05', '2026-02-10'].map((service_date) => ({ route_id: 'a', service_date }))
    );
    expect(map.get('a')).toEqual(['2025-01-05', '2026-02-10', '2026-12-31']);
  });

  it('μία μόνο διαδρομή με μία ημερομηνία', () => {
    const map = groupRouteDates([{ route_id: 'solo', service_date: '2026-05-05' }]);
    expect(map.size).toBe(1);
    expect(map.get('solo')).toEqual(['2026-05-05']);
    expect(map.get('anyparkti')).toBeUndefined();
  });
});

/* ═══════════════════════ lib/ticket-notify ══════════════════════════ */

const ticket = (over: Partial<OrderTicket> & { passenger_key: number }): OrderTicket =>
  ({
    id: `t${over.passenger_key}-${over.leg ?? 'outbound'}`,
    code: `C${over.passenger_key}`,
    leg: 'outbound',
    trip_id: 'trip1',
    seat_no: '1',
    passenger_name: `Επιβάτης ${over.passenger_key}`,
    passenger_phone: null,
    fare_name: 'Κανονικό',
    fare_basis: 'oneway',
    price_cents: 1500,
    status: 'valid',
    open_return: false,
    open_return_expires_on: null,
    refunded_cents: null,
    ...over,
  }) as OrderTicket;

describe('passengerRecipients — κενά και ασυνέπειες', () => {
  it('κενή λίστα εισιτηρίων δεν στέλνει τίποτα', () => {
    expect(passengerRecipients([], 'payer@example.com')).toEqual([]);
  });

  it('τα κενά γύρω από το email του πληρωτή δεν εμποδίζουν την παράλειψή του', () => {
    const res = passengerRecipients(
      [ticket({ passenger_key: 1, passenger_email: 'payer@example.com' })],
      '  Payer@Example.com  '
    );
    expect(res).toEqual([]);
  });

  it('το email του επιβάτη αποθηκεύεται καθαρισμένο και σε πεζά', () => {
    const res = passengerRecipients([ticket({ passenger_key: 1, passenger_email: '  A@Example.COM ' })], null);
    expect(res[0].email).toBe('a@example.com');
  });

  it('όταν τα δύο σκέλη του ίδιου επιβάτη έχουν διαφορετικό email, μετράει το πρώτο', () => {
    const res = passengerRecipients(
      [
        ticket({ passenger_key: 1, leg: 'outbound', passenger_email: 'proto@example.com' }),
        ticket({ passenger_key: 1, leg: 'return', passenger_email: 'deytero@example.com' }),
      ],
      null
    );
    expect(res).toHaveLength(1);
    expect(res[0].email).toBe('proto@example.com');
    expect(res[0].tickets).toHaveLength(2);
  });
});

/* ═════════════════════════ lib/utils (cn) ═══════════════════════════ */

describe('cn', () => {
  it('αγνοεί false, null, undefined και κενά strings', () => {
    expect(cn('flex', false, null, undefined, '', 'gap-2')).toBe('flex gap-2');
  });

  it('δέχεται αντικείμενο με συνθήκες', () => {
    expect(cn('base', { active: true, hidden: false })).toBe('base active');
  });

  it('σε σύγκρουση tailwind κερδίζει η τελευταία κλάση', () => {
    expect(cn('p-2', 'p-4')).toBe('p-4');
    expect(cn('text-red-500', 'text-blue-500')).toBe('text-blue-500');
  });

  it('τα δικά μας μεγέθη γραμματοσειράς δεν συγκρούονται με τα χρώματα κειμένου', () => {
    expect(cn('text-display-hero', 'text-red-500')).toBe('text-display-hero text-red-500');
    expect(cn('text-red-500', 'text-display-section')).toBe('text-red-500 text-display-section');
  });

  it('δύο δικά μας μεγέθη συγκρούονται μεταξύ τους — κερδίζει το τελευταίο', () => {
    expect(cn('text-display-hero', 'text-display-editorial')).toBe('text-display-editorial');
    expect(cn('text-sm', 'text-display-hero')).toBe('text-display-hero');
  });

  it('το formatEuro γράφει το ποσό με το σύμβολο στο τέλος', () => {
    expect(formatEuro(30)).toBe('30€');
    expect(formatEuro(0)).toBe('0€');
    expect(formatEuro(19.5)).toBe('19.5€');
  });
});
