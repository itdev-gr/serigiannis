/** Καθαρισμός HTML άρθρου πριν μπει σε `dangerouslySetInnerHTML`.
 *
 *  Το σώμα των άρθρων είναι HTML: το γράφει το γραφείο και ένα μέρος του ήρθε
 *  με εισαγωγή από το παλιό site. Ό,τι κι αν περιέχει, δεν πρέπει να μπορεί να
 *  εκτελέσει κώδικα στον browser του επισκέπτη.
 *
 *  ΟΡΙΑ — διάβασέ τα πριν το εμπιστευτείς για κείμενο από άγνωστη πηγή: αυτός
 *  είναι καθαρισμός με regex, όχι πλήρης parser. Καλύπτει τους γνωστούς φορείς
 *  (tags που εκτελούν, χειριστές συμβάντων, javascript: URLs) και είναι
 *  σαφώς καλύτερος από το τίποτα, αλλά ένας αποφασισμένος επιτιθέμενος με
 *  δικαίωμα εγγραφής άρθρων δεν αποκλείεται από εδώ — αποκλείεται από το ότι
 *  μόνο διαχειριστές γράφουν άρθρα. Αν ποτέ επιτραπεί HTML από τρίτους,
 *  αντικατάστησέ το με πραγματικό sanitizer (DOMPurify σε server DOM).
 */

/** Στοιχεία που φεύγουν μαζί με το περιεχόμενό τους. */
const VOID_THE_LOT = 'script|style|iframe|object|embed|noscript|template|form|svg|math|frame|frameset|applet';
/** Στοιχεία που δεν έχουν ορατό περιεχόμενο· φεύγει η ίδια η ετικέτα. */
const DROP_TAG = 'link|meta|base|param|source';

export function sanitizeArticleHtml(html: string): string {
  if (!html) return '';
  let out = html;

  // σχόλια — μπορούν να κρύψουν conditional comments σε παλιούς browsers
  out = out.replace(/<!--[\s\S]*?-->/g, '');

  // εκτελέσιμα στοιχεία, με το περιεχόμενό τους· και η μισοτελειωμένη μορφή
  // («<script> χωρίς κλείσιμο»), που αλλιώς θα έμενε ανοιχτή
  out = out.replace(new RegExp(`<(${VOID_THE_LOT})\\b[\\s\\S]*?<\\/\\s*\\1\\s*>`, 'gi'), '');
  out = out.replace(new RegExp(`<\\/?\\s*(${VOID_THE_LOT})\\b[^>]*>`, 'gi'), '');
  out = out.replace(new RegExp(`<\\s*(${DROP_TAG})\\b[^>]*>`, 'gi'), '');

  // χειριστές συμβάντων: onclick=…, onerror='…', onload=χωρίς εισαγωγικά
  out = out.replace(/\son[a-z-]+\s*=\s*"[^"]*"/gi, '');
  out = out.replace(/\son[a-z-]+\s*=\s*'[^']*'/gi, '');
  out = out.replace(/\son[a-z-]+\s*=\s*[^\s>]+/gi, '');

  // επικίνδυνα URL σε συνδέσμους και πηγές. Οι εικόνες data: επιτρέπονται —
  // τις χρησιμοποιεί ο επεξεργαστής κειμένου· κάθε άλλο data: όχι.
  out = out.replace(
    /\s(href|src|xlink:href|action|formaction|srcdoc|data)\s*=\s*(?:"([^"]*)"|'([^']*)'|([^\s>]+))/gi,
    (match, attr: string, dq: string | undefined, sq: string | undefined, bare: string | undefined) => {
      const value = dq ?? sq ?? bare ?? '';
      // «java\tscript:» ή «java script:» είναι έγκυρο URL για τον browser — πέφτουν
      // έξω κενά και χαρακτήρες ελέγχου πριν τον έλεγχο του προθέματος.
      const v = Array.from(value)
        .filter((ch) => ch.charCodeAt(0) > 0x20)
        .join('')
        .toLowerCase();
      const bad =
        v.startsWith('javascript:') ||
        v.startsWith('vbscript:') ||
        // data: επιτρέπεται μόνο για raster εικόνες· το svg+xml μπορεί να
        // περιέχει script αν το ίδιο HTML φορτωθεί εκτός <img>.
        (v.startsWith('data:') && (!v.startsWith('data:image/') || v.startsWith('data:image/svg'))) ||
        attr.toLowerCase() === 'srcdoc';
      return bad ? '' : match;
    }
  );

  return out;
}
