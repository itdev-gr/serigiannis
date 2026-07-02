// Interim content seed: inserts 12 curated tours into the live DB so the site
// is browsable before the full Phase-2 migration. Images use existing URLs for
// now (replaced by Storage-hosted originals during migration).
// Run: node --env-file=.env.local scripts/seed-db.mjs
import { createClient } from '@supabase/supabase-js';

const sb = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL,
  process.env.SUPABASE_SERVICE_ROLE_KEY,
  { auth: { persistSession: false } }
);

const TOURS = [
  { slug: 'psatha-thalassia-bania', title: 'Θαλάσσια Μπάνια Ψάθα', cat: 'thalassia-mpania', price: 10, original: 12, duration: '5,5 ώρες', dates: 'Καθημερινά · Ιούλιος–Αύγουστος', desc: 'Καθημερινές αναχωρήσεις για μπάνιο στη Ψάθα με άνετο πούλμαν.', featured: true, photo: 'https://picsum.photos/seed/psatha/1600/1200', alt: 'Παραλία Ψάθα με τιρκουάζ νερά' },
  { slug: 'tinos-proskynima', title: 'Προσκύνημα στην Τήνο', cat: 'monoimeres', price: 75, original: 95, duration: 'Μονοήμερη', dates: 'Κάθε Σάββατο & Κυριακή', desc: 'Επίσκεψη στην Παναγία της Τήνου με ξενάγηση στο νησί.', photo: 'https://images.unsplash.com/photo-1533105079780-92b9be482077?w=1600&q=80', alt: 'Παναγία της Τήνου' },
  { slug: 'lichadonisia-kavos', title: 'Λιχαδονήσια · Κάβος', cat: 'monoimeres', price: 25, original: 30, duration: 'Λεωφορείο & Πλοίο', dates: '18/7, 26/7, 2/8, 9/8/2026', desc: 'Εξωτικές παραλίες στα Λιχαδονήσια με ολιγοήμερη περιήγηση.', photo: 'https://images.unsplash.com/photo-1590523278191-995cbcda646b?w=1600&q=80', alt: 'Λιχαδονήσια από ψηλά' },
  { slug: 'ydra', title: 'Ύδρα · Το Νησί του Μιαούλη', cat: 'monoimeres', price: 25, duration: 'Μονοήμερη', dates: '27/6, 12/7/2026', desc: 'Το νησί των καπετάνιων, της τέχνης και της αρχοντιάς.', featured: true, photo: 'https://images.unsplash.com/photo-1601581875039-e899893d520c?w=1600&q=80', alt: 'Λιμάνι της Ύδρας' },
  { slug: 'spetses', title: 'Σπέτσες', cat: 'monoimeres', price: 25, duration: 'Μονοήμερη', dates: '12/7/2026', desc: 'Το νησί των αρωμάτων και του Αργοσαρωνικού.', photo: 'https://images.unsplash.com/photo-1602940659805-770d1b3b9911?w=1600&q=80', alt: 'Παραλία Σπετσών' },
  { slug: 'meteora', title: 'Μετέωρα', cat: 'monoimeres', price: 65, duration: 'Μονοήμερη', dates: 'Κάθε Σάββατο', desc: 'Τα μοναστήρια στους ουρανούς — ένα ταξίδι στην πνευματικότητα.', featured: true, photo: 'https://images.unsplash.com/photo-1548013146-72479768bada?w=1600&q=80', alt: 'Μοναστήρια στα Μετέωρα' },
  { slug: 'delphi', title: 'Δελφοί', cat: 'monoimeres', price: 45, duration: 'Μονοήμερη', dates: 'Κάθε Κυριακή', desc: 'Ο ομφαλός της γης, με ξενάγηση στον αρχαιολογικό χώρο.', photo: 'https://picsum.photos/seed/delphi/1600/1200', alt: 'Αρχαία Δελφοί' },
  { slug: 'nafplio', title: 'Ναύπλιο', cat: 'monoimeres', price: 30, duration: 'Μονοήμερη', dates: 'Κάθε Σάββατο', desc: 'Η πρώτη πρωτεύουσα, με βόλτα στο ενετικό λιμάνι.', photo: 'https://picsum.photos/seed/nafplio/1600/1200', alt: 'Παλαμήδι Ναυπλίου' },
  { slug: 'andros', title: 'Άνδρος', cat: 'monoimeres', price: 35, duration: 'Μονοήμερη', dates: '19/7, 2/8/2026', desc: 'Το νησί των πλοιοκτητών, με μοναδικές παραλίες.', photo: 'https://picsum.photos/seed/andros/1600/1200', alt: 'Χώρα Άνδρου' },
  { slug: 'akr-sounio', title: 'Ακρωτήριο Σούνιο', cat: 'monoimeres', price: 20, duration: '4–5 ώρες', dates: 'Καθημερινά', desc: 'Το ηλιοβασίλεμα στον Ναό του Ποσειδώνα.', photo: 'https://images.unsplash.com/photo-1503152394-c571994fd383?w=1600&q=80', alt: 'Ναός του Ποσειδώνα στο Σούνιο' },
  { slug: 'pilio', title: 'Πήλιο', cat: 'polyimeres', price: 180, duration: '2 ημέρες', dates: '1–2/8/2026', desc: 'Το βουνό των Κενταύρων, τα χωριά και οι κρυμμένες παραλίες.', photo: 'https://picsum.photos/seed/pilio/1600/1200', alt: 'Χωριά Πηλίου' },
  { slug: 'skyros', title: 'Σκύρος', cat: 'polyimeres', price: 240, duration: '3 ημέρες', dates: '5–7/9/2026', desc: 'Το άγνωστο νησί των Σποράδων με μοναδική αρχιτεκτονική.', photo: 'https://picsum.photos/seed/skyros/1600/1200', alt: 'Χώρα Σκύρου' },
];

const { data: cats, error: catErr } = await sb.from('categories').select('id,slug');
if (catErr) { console.error('categories:', catErr.message); process.exit(1); }
const catId = Object.fromEntries(cats.map((c) => [c.slug, c.id]));

let ok = 0;
for (const [i, t] of TOURS.entries()) {
  const { data: tour, error } = await sb
    .from('tours')
    .upsert(
      {
        slug: t.slug, title: t.title, summary: t.desc, price_from: t.price,
        price_original: t.original ?? null, currency: 'EUR', duration_label: t.duration,
        departure_note: t.dates, status: 'published', is_featured: !!t.featured,
        sort_order: i, published_at: new Date().toISOString(),
      },
      { onConflict: 'slug' }
    )
    .select()
    .single();
  if (error) { console.error(t.slug, error.message); continue; }

  await sb.from('tour_images').delete().eq('tour_id', tour.id);
  const { data: img } = await sb
    .from('tour_images')
    .insert({ tour_id: tour.id, storage_path: t.photo, alt_el: t.alt, width: 1600, height: 1200, position: 0 })
    .select()
    .single();
  await sb.from('tour_categories').upsert(
    { tour_id: tour.id, category_id: catId[t.cat], is_primary: true },
    { onConflict: 'tour_id,category_id' }
  );
  if (img) await sb.from('tours').update({ cover_image_id: img.id }).eq('id', tour.id);
  ok++;
  console.log('seeded', t.slug);
}
console.log(`\nDone: ${ok}/${TOURS.length} tours seeded.`);
