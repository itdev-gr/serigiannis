/** Μόνιμες ανακατευθύνσεις από τις διευθύνσεις του παλιού WordPress site
 *  (sergianitravel.gr) στις αντίστοιχες σελίδες του νέου — ΕΝΑ βήμα.
 *
 *  ΓΙΑΤΙ: μετά τη μετάβαση, το 73% των clicks από τη Google (export του Search
 *  Console, 16 μήνες έως 10/9/2026) κατέληγε σε 404 — κυρίως οι σελίδες
 *  κατηγοριών (/ekdromes-sergiani-travel/monoimeres: 77.000 clicks) και τα
 *  παλιά άρθρα του blog που ζούσαν στη ρίζα του site.
 *
 *  ΕΝΑ ΒΗΜΑ (17/9/2026): πριν, μια παλιά διεύθυνση έκανε τρία 308 —
 *  sergianitravel.gr → www (Vercel), αφαίρεση τελικού «/» (Next), και μετά ο
 *  κανόνας μας. Τώρα: (α) το apex domain σερβίρει την εφαρμογή και οι κανόνες
 *  εδώ έχουν ΑΠΟΛΥΤΟ προορισμό (NEXT_PUBLIC_SITE_URL), ώστε από όποιον host κι
 *  αν έρθει το αίτημα να πάει κατευθείαν στο τελικό www URL· (β) το
 *  skipTrailingSlashRedirect του next.config απενεργοποιεί το εσωτερικό
 *  redirect του Next και κάθε source εδώ δέχεται προαιρετικό τελικό «/»
 *  ({/}? στη σύνταξη path-to-regexp)· το γενικό «κόψε το τελικό /» μπαίνει ως
 *  δικός μας κανόνας ΜΕΤΑ τους παλιούς (siteRedirects).
 *
 *  Είναι .mjs και όχι .ts επειδή το διαβάζει το next.config.mjs στο build· δεν
 *  περνά από τον TypeScript compiler. Οι παλιές εκδρομές (/tour/<παλιό slug>)
 *  έρχονται από το lib/legacy-tour-aliases.mjs· η σελίδα εκδρομής τις κρατά
 *  και ως εφεδρεία για μορφές με κεφαλαία ή «+» που το edge δεν πιάνει.
 */
import { LEGACY_TOUR_ALIASES } from './legacy-tour-aliases.mjs';

/** Το www domain, ώστε οι προορισμοί να είναι απόλυτοι και το αίτημα από το
 *  apex (sergianitravel.gr) να πηγαίνει κατευθείαν στο τελικό URL. Χωρίς την
 *  μεταβλητή (τοπικά, tests) οι προορισμοί μένουν σχετικοί. */
const SITE_BASE = (process.env.NEXT_PUBLIC_SITE_URL ?? '').replace(/\/$/, '');
const WWW_HOST = 'www.sergianitravel.gr';

/** Σταθερές σελίδες και κατηγορίες: παλιό path → νέο path. */
export const LEGACY_PATH_REDIRECTS = {
  // Κατηγορίες εκδρομών (τα ίδια slug, άλλο πρόθεμα· μόνο οι πολυήμερες άλλαξαν).
  '/ekdromes-sergiani-travel': '/ekdromes',
  '/ekdromes-sergiani-travel/monoimeres': '/ekdromes/monoimeres',
  '/ekdromes-sergiani-travel/polyimeres-ekdromes': '/ekdromes/polyimeres',
  '/ekdromes-sergiani-travel/thalassia-mpania': '/ekdromes/thalassia-mpania',
  '/ekdromes-sergiani-travel/kroyazieres': '/ekdromes/kroyazieres',
  '/ekdromes-sergiani-travel/pezopories': '/ekdromes/pezopories',
  '/ekdromes-sergiani-travel/eksoterikou': '/ekdromes/eksoterikou',
  '/ekdromes-sergianitravel/monoimeres': '/ekdromes/monoimeres',
  '/ekdromes-sergiani-travel-2': '/ekdromes',
  '/sergiani-travel-ekdromes-imerisies-monoimeres-polyimeres': '/ekdromes',
  '/monoimeri-krouaziera-ellada-polyhmerh-krouaziera-sto-eksoteriko': '/kroyazieres',
  // Στατικές σελίδες που άλλαξαν όνομα.
  '/istoriko-ekdromon-2': '/istoriko-ekdromon',
  '/portofolio': '/istoriko-ekdromon',
  '/oroi-kai-proϋpotheseis': '/oroi-proypotheseis',
  '/refund_returns': '/oroi-proypotheseis',
  '/bus-rentals-enoikiaseis-poylman': '/enoikiaseis-poylman',
  '/prosfora-gia-poylman-2': '/enoikiaseis-poylman',
  '/newsletter': '/',
  '/cart': '/',
  '/x': '/',
  // Παλιά άρθρα του blog που ζούσαν στη ρίζα και τώρα είναι στο /nea.
  '/taksidiotiko-grafeio-peristeri-athina-sergiani-travel-apo-to-1995':
    '/nea/taksidiotiko-grafeio-peristeri-athina-sergiani-travel-apo-to-1995',
  '/pezopories-konta-stin-athina-8-monopatia-gia-eksereynisi': '/nea/pezopories-konta-stin-athina-8-monopatia-gia-eksereynisi',
  '/ekdromes-stin-peloponniso-apo-athina-mani-nayplio-monemvasia':
    '/nea/ekdromes-stin-peloponniso-apo-athina-mani-nayplio-monemvasia',
  '/lixadonisia-paralia-kavoy-eyvoia-monoimeri-ekdromi': '/nea/lixadonisia-paralia-kavoy-eyvoia-monoimeri-ekdromi',
  '/enarksi-mylos-ton-ksotikon-mia-fantasmagoriki-giorti-sta-trikala':
    '/nea/enarksi-mylos-ton-ksotikon-mia-fantasmagoriki-giorti-sta-trikala',
  '/enoikiasi-poylman-athina-times-ypiresies-kai-odigos-2026': '/nea/enoikiasi-poylman-athina-times-ypiresies-kai-odigos-2027',
  '/thalassia-mpania-apo-athina-2026-oi-kalyteres-paralies-me-ekdromi':
    '/nea/thalassia-mpania-apo-athina-peiraia-kathimerina-me-poulman',
  '/ekdromes-apo-athina-2026-koryfaia-organomena-taksidia-2027-sergiani-travel': '/nea/organomenes-ekdromes-apo-athina',
  '/sergiani-travel-ekdromes-apo-athina-2026-taksidia-2027': '/nea/organomenes-ekdromes-apo-athina',
  '/monoimeres-ekdromes-apo-athina-2026-odigos-proorismon': '/nea/10-kaliteres-monohmeres-ekdromes-apo-athina',
  '/sxolikes-ekdromes-apo-athina-asfaleis-kai-ekpaideytikes': '/nea/sxolikes-ekdromes-apo-athina-me-sergiani-travel',
  '/sikelia-ellinofona-xoria-kapri-sorrento-potizano-9-imeri-odiki-aktoploϊki-ekdromi-apo-athina':
    '/nea/ekdromi-sthn-notia-italia-apo-athina-sergiani-travel',
  '/kalokairines-ekdromes-stin-ellada-me-leoforeio-i-karavi':
    '/nea/kalokairines-apodraseis-xoris-anxos-stis-paralies-tis-attikis-thalassia-mpania',
  '/ekdromes-eksoterikoy-apo-athina-sikelia-kappadokia-valkania': '/ekdromes/eksoterikou',
  // Παλιά άρθρα χωρίς αντίστοιχο στο /nea: στην πιο κοντινή εκδρομή ή κατηγορία.
  '/ekdromi-sta-meteora-apo-athina-pliris-odigos-2026': '/tour/meteora-trikala-kalampaka-moyseio-troyfas-monoimeri-ekdromi',
  '/mpanio-stin-athinaϊki-riviera-sergiani-syntagma-varkiza-anavysso-saronida-paralia-xaraka':
    '/tour/athinaki-riviera-kathe-savvato-kai-kyriaki-apo-5e-thalassia-mpania-5-ores-paramoni-gia-kavoyri-varkiza-yabanaki-paralia-anavyssoy',
  '/agkistri-to-aythentiko-nisitoy-argosaronikoy-monoimeri-ekdromi':
    '/tour/monoimeri-ekdromi-sto-agkistri-to-mikro-diamanti-toy-argosar',
  '/kroyaziera-ydra-poros-aigina-tria-nisia-se-mia-mera-apo-athina': '/tour/imerisia-kroyaziera-ydra-poros-aigina-apo-athina',
  '/tinos-monoimeri-proskynimatiki-ekdromi-kathe-savvato-kyriaki-apo-athina':
    '/tour/monoimeri-ekdromi-gia-proskynima-stin-panagia-tis-tinoy-kath',
  '/monoimeri-ekdromi-stin-kea-tzia-to-katofli-ton-kykladon': '/tour/ekdromi-sti-tzia-i-kea',
  '/sykia-korinthias': '/ekdromes/thalassia-mpania',
  '/thalassia-mpania-kathimerina-apo-athina-gia-psatha': '/tour/thalassia-mpania-kathimerina-apo-athina-gia-psatha-530-ores-stin-paralia',
  '/monoimeres-ekdromes-gia-megales-stigmes-xalarosis': '/ekdromes/monoimeres',
  '/ekdromes-fevroyarioy-2025': '/ekdromes/monoimeres',
  '/ekdromi-stin-mani-limeni-areopoli-28o-oktovrioy-imerisia': '/tour/ekdromi-stin-agria-mani-limeni-areopoli-gytheio',
};

/** Ολόκληρα «δέντρα» του παλιού site χωρίς αντίστοιχο: WP taxonomies
 *  (τοποθεσία, σημείο επιβίβασης, λέξη-κλειδί), σελιδοποίηση blog, παλιό
 *  πρόθεμα κατηγοριών. Πάνε στη σελίδα που τους μοιάζει περισσότερο. */
export const LEGACY_PREFIX_REDIRECTS = {
  '/topothesia': '/ekdromes',
  '/keyword': '/ekdromes',
  '/cat': '/ekdromes',
  '/ekdromes-sergianitravel': '/ekdromes',
  '/area': '/ekdromes/thalassia-mpania',
  '/nea/page': '/nea',
  '/sergiani-travel-blog': '/nea',
  '/monoimeres-ekdromes-enoikiaseis-poylman-thalassia-mpania': '/nea',
};

/** Το path όπως το ταιριάζει το Next: percent-encoded, με τους χαρακτήρες που
 *  έχουν ειδική σημασία στο path-to-regexp (παρενθέσεις, «:», «*», «+», «?»,
 *  άγκιστρα) αποφυγμένους, και με προαιρετικό τελικό «/» — όλες οι διευθύνσεις
 *  του παλιού site κυκλοφορούν και με τις δύο μορφές. */
function encodeSource(path) {
  return path
    .split('/')
    .map((seg) => encodeURIComponent(seg).replace(/[():*+?{}]/g, (c) => `\\${c}`))
    .join('/');
}

const OPTIONAL_SLASH = '{/}?';

function abs(destination) {
  return `${SITE_BASE}${destination}`;
}

/** Οι κανόνες για τις διευθύνσεις του παλιού site, με τη μορφή που περιμένει
 *  το `redirects()` του next.config. Μόνο παλιά URLs — οι γενικοί κανόνες
 *  (host, τελικό «/») είναι στο siteRedirects(). */
export function legacyRedirects() {
  const exact = Object.entries(LEGACY_PATH_REDIRECTS).map(([source, destination]) => ({
    source: `${encodeSource(source)}${OPTIONAL_SLASH}`,
    destination: abs(destination),
    permanent: true,
  }));
  const prefixes = Object.entries(LEGACY_PREFIX_REDIRECTS).map(([source, destination]) => ({
    source: `${encodeSource(source)}/:path*`,
    destination: abs(destination),
    permanent: true,
  }));
  // Η μορφή «/<αριθμός>/<slug>» ήταν ο μόνιμος σύνδεσμος (?p=ID) των άρθρων του
  // WordPress· ο αριθμός δεν λέει τίποτα, το slug είναι το ίδιο με το root URL.
  // Για κάθε γνωστή διεύθυνση της ρίζας ο προορισμός δίνεται απευθείας (ένα
  // βήμα, όχι αλυσίδα /8919/x → /x → /nea/x)· για ό,τι άλλο, στο root URL.
  const wpPostIds = Object.entries(LEGACY_PATH_REDIRECTS)
    .filter(([source]) => source.split('/').length === 2)
    .map(([source, destination]) => ({
      source: `/:id(\\d+)${encodeSource(source)}${OPTIONAL_SLASH}`,
      destination: abs(destination),
      permanent: true,
    }));
  const wpPostIdFallback = { source: `/:id(\\d+)/:slug${OPTIONAL_SLASH}`, destination: abs('/:slug'), permanent: true };
  // Παλιές εκδρομές: /tour/<παλιό slug> → νέα εκδρομή, άρθρο ή κατηγορία.
  const tours = Object.entries(LEGACY_TOUR_ALIASES).map(([oldSlug, target]) => ({
    source: `/tour/${encodeSource(oldSlug)}${OPTIONAL_SLASH}`,
    destination: abs(target.startsWith('/') ? target : `/tour/${target}`),
    permanent: true,
  }));
  return [...exact, ...prefixes, ...wpPostIds, wpPostIdFallback, ...tours];
}

/** Όλοι οι κανόνες redirect του site, με τη σειρά που μετράει:
 *  1. παλιές διευθύνσεις (ένα βήμα στο τελικό www URL),
 *  2. αφαίρεση τελικού «/» (αντί για το εσωτερικό του Next, που έτρεχε ΠΡΙΝ
 *     τους δικούς μας κανόνες και πρόσθετε ένα βήμα)· απόλυτος προορισμός,
 *     ώστε και από το apex να πηγαίνει κατευθείαν στο www,
 *  3. apex και vercel.app → www για ό,τι άλλο. Τα /api/* μένουν απ' έξω: τα
 *     Vercel crons και το Viva webhook χτυπούν το deployment URL και δεν
 *     ακολουθούν redirects. */
export function siteRedirects() {
  const toWww = (host) => ({
    source: '/:path((?!api/).*)',
    has: [{ type: 'host', value: host }],
    destination: `https://${WWW_HOST}/:path`,
    permanent: true,
  });
  return [
    ...legacyRedirects(),
    { source: '/:path((?!api/).*[^/])/', destination: abs('/:path'), permanent: true },
    toWww('sergianitravel.gr'),
    toWww('serigiannis.vercel.app'),
  ];
}
