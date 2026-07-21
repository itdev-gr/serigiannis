// Seed fallback used by the data layer until the Supabase DB is populated (Phase 2).
// Self-contained (does not import from legacy/) so it survives the Task 12 cleanup.
// Image `storage_path` here holds absolute URLs; the real DB stores bucket paths —
// see imageUrl() in lib/queries/tours.ts which handles both.
import type { Tour } from '@/types/db';

const CAT_NAME: Record<string, string> = {
  monoimeres: 'Μονοήμερες',
  polyimeres: 'Πολυήμερες',
  'thalassia-mpania': 'Θαλάσσια Μπάνια',
  kroyazieres: 'Κρουαζιέρες',
  pezopories: 'Πεζοπορίες',
  eksoterikou: 'Εκδρομές Εξωτερικού',
};

type SeedInput = {
  slug: string; title: string; cat: keyof typeof CAT_NAME;
  price: number; original?: number; duration: string; dates: string;
  desc: string; featured?: boolean; photo: string; alt: string;
};

function mk(i: number, s: SeedInput): Tour {
  const id = `seed-${i}`;
  const imgId = `${id}-img`;
  return {
    id, slug: s.slug, title: s.title, subtitle: null, summary: s.desc, body: {},
    price_from: s.price, price_original: s.original ?? null, currency: 'EUR',
    duration_label: s.duration, departure_note: s.dates, meeting_point: null,
    status: 'published', is_featured: s.featured ?? false, cover_image_id: imgId,
    seo_title: null, seo_description: null, source_url: null, sort_order: i, published_at: null,
    categories: [{ id: s.cat, slug: s.cat, name_el: CAT_NAME[s.cat], description_el: null, sort_order: 0 }],
    images: [{ id: imgId, tour_id: id, storage_path: s.photo, alt_el: s.alt, width: 1600, height: 1200, blurhash: null, position: 0 }],
    next_departure: null,
  };
}

export const seedTours: Tour[] = [
  mk(1, { slug: 'psatha-thalassia-bania', title: 'Θαλάσσια Μπάνια Ψάθα', cat: 'thalassia-mpania', price: 10, original: 12, duration: '5,5 ώρες', dates: 'Καθημερινά · Ιούλιος–Αύγουστος', desc: 'Καθημερινές αναχωρήσεις για μπάνιο στη Ψάθα με άνετο πούλμαν.', featured: true, photo: 'https://picsum.photos/seed/psatha/1600/1200', alt: 'Παραλία Ψάθα με τιρκουάζ νερά' }),
  mk(2, { slug: 'tinos-proskynima', title: 'Προσκύνημα στην Τήνο', cat: 'monoimeres', price: 75, original: 95, duration: 'Μονοήμερη', dates: 'Κάθε Σάββατο & Κυριακή', desc: 'Επίσκεψη στην Παναγία της Τήνου με ξενάγηση στο νησί.', photo: 'https://images.unsplash.com/photo-1533105079780-92b9be482077?w=1600&q=80', alt: 'Παναγία της Τήνου' }),
  mk(3, { slug: 'lichadonisia-kavos', title: 'Λιχαδονήσια · Κάβος', cat: 'monoimeres', price: 25, original: 30, duration: 'Λεωφορείο & Πλοίο', dates: '18/7, 26/7, 2/8, 9/8/2026', desc: 'Εξωτικές παραλίες στα Λιχαδονήσια με ολιγοήμερη περιήγηση.', photo: 'https://images.unsplash.com/photo-1590523278191-995cbcda646b?w=1600&q=80', alt: 'Λιχαδονήσια από ψηλά' }),
  mk(4, { slug: 'ydra', title: 'Ύδρα · Το Νησί του Μιαούλη', cat: 'monoimeres', price: 25, duration: 'Μονοήμερη', dates: '27/6, 12/7/2026', desc: 'Το νησί των καπετάνιων, της τέχνης και της αρχοντιάς.', featured: true, photo: 'https://images.unsplash.com/photo-1601581875039-e899893d520c?w=1600&q=80', alt: 'Λιμάνι της Ύδρας' }),
  mk(5, { slug: 'spetses', title: 'Σπέτσες', cat: 'monoimeres', price: 25, duration: 'Μονοήμερη', dates: '12/7/2026', desc: 'Το νησί των αρωμάτων και του Αργοσαρωνικού.', photo: 'https://images.unsplash.com/photo-1602940659805-770d1b3b9911?w=1600&q=80', alt: 'Παραλία Σπετσών' }),
  mk(6, { slug: 'meteora', title: 'Μετέωρα', cat: 'monoimeres', price: 65, duration: 'Μονοήμερη', dates: 'Κάθε Σάββατο', desc: 'Τα μοναστήρια στους ουρανούς, ένα ταξίδι στην πνευματικότητα.', featured: true, photo: 'https://images.unsplash.com/photo-1548013146-72479768bada?w=1600&q=80', alt: 'Μοναστήρια στα Μετέωρα' }),
  mk(7, { slug: 'delphi', title: 'Δελφοί', cat: 'monoimeres', price: 45, duration: 'Μονοήμερη', dates: 'Κάθε Κυριακή', desc: 'Ο ομφαλός της γης, με ξενάγηση στον αρχαιολογικό χώρο.', photo: 'https://picsum.photos/seed/delphi/1600/1200', alt: 'Αρχαία Δελφοί' }),
  mk(8, { slug: 'nafplio', title: 'Ναύπλιο', cat: 'monoimeres', price: 30, duration: 'Μονοήμερη', dates: 'Κάθε Σάββατο', desc: 'Η πρώτη πρωτεύουσα, με βόλτα στο ενετικό λιμάνι.', photo: 'https://picsum.photos/seed/nafplio/1600/1200', alt: 'Παλαμήδι Ναυπλίου' }),
  mk(9, { slug: 'andros', title: 'Άνδρος', cat: 'monoimeres', price: 35, duration: 'Μονοήμερη', dates: '19/7, 2/8/2026', desc: 'Το νησί των πλοιοκτητών, με μοναδικές παραλίες.', photo: 'https://picsum.photos/seed/andros/1600/1200', alt: 'Χώρα Άνδρου' }),
  mk(10, { slug: 'akr-sounio', title: 'Ακρωτήριο Σούνιο', cat: 'monoimeres', price: 20, duration: '4–5 ώρες', dates: 'Καθημερινά', desc: 'Το ηλιοβασίλεμα στον Ναό του Ποσειδώνα.', photo: 'https://images.unsplash.com/photo-1503152394-c571994fd383?w=1600&q=80', alt: 'Ναός του Ποσειδώνα στο Σούνιο' }),
  mk(11, { slug: 'pilio', title: 'Πήλιο', cat: 'polyimeres', price: 180, duration: '2 ημέρες', dates: '1–2/8/2026', desc: 'Το βουνό των Κενταύρων, τα χωριά και οι κρυμμένες παραλίες.', photo: 'https://picsum.photos/seed/pilio/1600/1200', alt: 'Χωριά Πηλίου' }),
  mk(12, { slug: 'skyros', title: 'Σκύρος', cat: 'polyimeres', price: 240, duration: '3 ημέρες', dates: '5–7/9/2026', desc: 'Το άγνωστο νησί των Σποράδων με μοναδική αρχιτεκτονική.', photo: 'https://picsum.photos/seed/skyros/1600/1200', alt: 'Χώρα Σκύρου' }),
];

export const seedCategories = Object.entries(CAT_NAME).map(([slug, name_el], i) => ({
  id: slug, slug, name_el, description_el: null, sort_order: i + 1,
}));

export const seedSettings = {
  phones: ['210 571 2451', '210 821 2452', '6976 811 825'],
  phone24h: '6976 811 825',
  address: 'Π. Μελά 45, Περιστέρι 121 31',
  email: 'info@sergianitravel.gr',
  hours: { weekdays: '09:00–17:00', saturday: '09:00–14:00' },
  social: {
    facebook: 'https://facebook.com/sergiani.travelgr',
    instagram: 'https://instagram.com/sergiani_travel',
    youtube: 'https://youtube.com/@sergianitravel',
  },
};
