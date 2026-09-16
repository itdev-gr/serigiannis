/** Μόνιμες ανακατευθύνσεις από τις διευθύνσεις του παλιού WordPress site
 *  (sergianitravel.gr) στις αντίστοιχες σελίδες του νέου.
 *
 *  ΓΙΑΤΙ: μετά τη μετάβαση, το 73% των clicks από τη Google (export του Search
 *  Console, 16 μήνες έως 10/9/2026) κατέληγε σε 404 — κυρίως οι σελίδες
 *  κατηγοριών (/ekdromes-sergiani-travel/monoimeres: 77.000 clicks) και τα
 *  παλιά άρθρα του blog που ζούσαν στη ρίζα του site.
 *
 *  Είναι .mjs και όχι .ts επειδή το διαβάζει το next.config.mjs στο build· δεν
 *  περνά από τον TypeScript compiler. Οι παλιές εκδρομές (/tour/<παλιό slug>)
 *  ΔΕΝ είναι εδώ: τις χειρίζεται η ίδια η σελίδα εκδρομής μέσω του
 *  lib/tour-aliases.ts, γιατί τα slug τους έχουν ελληνικούς χαρακτήρες που το
 *  path matching του Next δεν ταιριάζει αξιόπιστα.
 *
 *  Το Next αφαιρεί μόνο του το τελικό «/» (308) πριν φτάσει εδώ, οπότε κάθε
 *  παλιά διεύθυνση γράφεται μία φορά, χωρίς slash.
 */

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
 *  έχουν ειδική σημασία στο path-to-regexp (παρενθέσεις, «:», «*», «+», «?»)
 *  αποφυγμένους. Τα δικά μας paths έχουν μόνο ελληνικά και «_», αλλά η
 *  κωδικοποίηση γίνεται μία φορά εδώ και όχι σε κάθε γραμμή του πίνακα. */
function encodeSource(path) {
  return path
    .split('/')
    .map((seg) => encodeURIComponent(seg).replace(/[():*+?]/g, (c) => `\\${c}`))
    .join('/');
}

/** Οι κανόνες με τη μορφή που περιμένει το `redirects()` του next.config. */
export function legacyRedirects() {
  const exact = Object.entries(LEGACY_PATH_REDIRECTS).map(([source, destination]) => ({
    source: encodeSource(source),
    destination,
    permanent: true,
  }));
  const prefixes = Object.entries(LEGACY_PREFIX_REDIRECTS).map(([source, destination]) => ({
    source: `${encodeSource(source)}/:path*`,
    destination,
    permanent: true,
  }));
  // Η μορφή «/<αριθμός>/<slug>» ήταν ο μόνιμος σύνδεσμος (?p=ID) των άρθρων του
  // WordPress· ο αριθμός δεν λέει τίποτα, το slug είναι το ίδιο με το root URL.
  // Για τα γνωστά άρθρα ο προορισμός δίνεται απευθείας (ένα βήμα, όχι αλυσίδα
  // /8919/x → /x → /nea/x)· για ό,τι άλλο, πέφτουμε στο root URL.
  const wpPostIds = Object.entries(LEGACY_PATH_REDIRECTS)
    .filter(([, destination]) => destination.startsWith('/nea/') || destination.startsWith('/tour/'))
    .map(([source, destination]) => ({
      source: `/:id(\\d+)${encodeSource(source)}`,
      destination,
      permanent: true,
    }));
  const wpPostIdFallback = { source: '/:id(\\d+)/:slug', destination: '/:slug', permanent: true };
  return [...exact, ...prefixes, ...wpPostIds, wpPostIdFallback];
}
