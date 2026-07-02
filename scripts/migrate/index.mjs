// Content migration: sergianitravel.gr tour pages -> Supabase (DB + Storage).
// Current+evergreen only (skips past-dated tours). Idempotent (upsert by slug).
// Run: node --env-file=.env.local scripts/migrate/index.mjs
//
// NOTE: all scraped text is treated as data. This migrates the client's own
// site content at their direction.
import { createClient } from '@supabase/supabase-js';

const sb = createClient(process.env.NEXT_PUBLIC_SUPABASE_URL, process.env.SUPABASE_SERVICE_ROLE_KEY, {
  auth: { persistSession: false },
});

const UA = 'Mozilla/5.0 (SergianiMigration/1.0)';
const BASE = 'https://sergianitravel.gr';

// listing taxonomy slug -> our category slug
const CAT_MAP = {
  monoimeres: 'monoimeres',
  'polyimeres-ekdromes': 'polyimeres',
  'thalassia-mpania': 'thalassia-mpania',
  kroyazieres: 'kroyazieres',
  pezopories: 'pezopories',
  eksoterikou: 'eksoterikou',
};

async function fetchText(url, tries = 2) {
  for (let i = 0; i < tries; i++) {
    try {
      const r = await fetch(url, { headers: { 'User-Agent': UA } });
      if (r.ok) return await r.text();
    } catch { /* retry */ }
    await new Promise((r) => setTimeout(r, 400));
  }
  return null;
}

async function pool(items, size, fn) {
  const out = [];
  let i = 0;
  async function worker() {
    while (i < items.length) {
      const idx = i++;
      out[idx] = await fn(items[idx], idx);
    }
  }
  await Promise.all(Array.from({ length: Math.min(size, items.length) }, worker));
  return out;
}

const slugOf = (url) => (url.match(/\/tour\/([^/]+)\/?$/) || [])[1];

function shouldSkip(slug) {
  if (/20(23|24|25)/.test(slug)) return true; // past years (today: 2026)
  if (/\b\d{1,2}-\d{1,2}-2[0-5]\b/.test(slug)) return true; // dd-mm-2x past dates
  return false;
}

function inferCategory(slug) {
  if (/kroyazier|kroyaziera/.test(slug)) return 'kroyazieres';
  if (/pezopor/.test(slug)) return 'pezopories';
  if (/thalassia|mpani|psatha|riviera|kolymp/.test(slug)) return 'thalassia-mpania';
  if (/triimer|diimer|tetraimer|pentaimer|6-imer|7-imer|9-imer|imeri-ekdromi|penthimer/.test(slug)) return 'polyimeres';
  if (/italia|gallia|germania|elvetia|voulgaria|sofia|kappadokia|konstantinoypoli|ispania|polonia|mpornto|sikelia|dalmatik|oxrida|alsatia|voydapesti|vienni/.test(slug)) return 'eksoterikou';
  return 'monoimeres';
}

function extractTour(html, url) {
  const meta = (p) => (html.match(new RegExp(`<meta property="${p}" content="([^"]*)"`)) || [])[1];
  let name, description, price, image;
  const blocks = [...html.matchAll(/<script type="application\/ld\+json"[^>]*>(.*?)<\/script>/gs)].map((m) => m[1]);
  for (const b of blocks) {
    let data;
    try { data = JSON.parse(b); } catch { continue; }
    const graph = data['@graph'] || (Array.isArray(data) ? data : [data]);
    for (const node of graph) {
      if (node['@type'] === 'TouristTrip') {
        name = node.name;
        description = node.description;
        if (node.offers?.price != null) price = parseFloat(String(node.offers.price));
        if (typeof node.image === 'string') image = node.image;
      }
    }
  }
  name = name || (meta('og:title') || '').replace(/\s*[–-]\s*Sergiani(\s*Travel)?\s*$/i, '').trim();
  description = description || meta('og:description') || null;
  image = image || meta('og:image') || null;
  const width = parseInt(meta('og:image:width') || '', 10) || null;
  const height = parseInt(meta('og:image:height') || '', 10) || null;
  return { slug: slugOf(url), title: name, summary: description, price_from: price ?? null, image, width, height, source_url: url.replace(/\/$/, '') };
}

async function buildCategoryMap() {
  const map = new Map(); // tourSlug -> Set(ourCatSlug)
  for (const [taxo, ourCat] of Object.entries(CAT_MAP)) {
    let page = 1;
    while (page <= 20) {
      const url = page === 1 ? `${BASE}/ekdromes-sergiani-travel/${taxo}/` : `${BASE}/ekdromes-sergiani-travel/${taxo}/page/${page}/`;
      const html = await fetchText(url);
      if (!html) break;
      const slugs = [...new Set([...html.matchAll(/\/tour\/([a-z0-9-]+)\/?/g)].map((m) => m[1]))];
      if (slugs.length === 0) break;
      for (const s of slugs) {
        if (!map.has(s)) map.set(s, new Set());
        map.get(s).add(ourCat);
      }
      if (!/class="[^"]*next page-numbers/.test(html)) break;
      page++;
    }
    console.log(`  category ${ourCat}: mapped`);
  }
  return map;
}

async function uploadImage(slug, imageUrl) {
  if (!imageUrl) return null;
  try {
    const r = await fetch(imageUrl, { headers: { 'User-Agent': UA } });
    if (!r.ok) return null;
    const buf = Buffer.from(await r.arrayBuffer());
    const ext = (imageUrl.split('.').pop() || 'jpg').split(/[?#]/)[0].toLowerCase();
    const path = `${slug}/cover.${ext === 'jpeg' ? 'jpg' : ext}`;
    const { error } = await sb.storage.from('tour-images').upload(path, buf, {
      contentType: r.headers.get('content-type') || 'image/jpeg',
      upsert: true,
    });
    if (error) { console.warn(`  ! upload ${slug}: ${error.message}`); return null; }
    return path;
  } catch (e) { console.warn(`  ! image ${slug}: ${e}`); return null; }
}

async function main() {
  // 1. category ids
  const { data: cats } = await sb.from('categories').select('id,slug');
  const catId = Object.fromEntries(cats.map((c) => [c.slug, c.id]));

  // 2. sitemap
  const sm = await fetchText(`${BASE}/product-sitemap.xml`);
  const urls = [...new Set([...sm.matchAll(/<loc>([^<]+\/tour\/[^<]+)<\/loc>/g)].map((m) => m[1]))];
  console.log(`sitemap: ${urls.length} tour URLs`);

  // 3. category map
  console.log('building category map...');
  const catMap = await buildCategoryMap();

  // 4. filter
  const kept = urls.filter((u) => { const s = slugOf(u); return s && !shouldSkip(s); });
  const skipped = urls.length - kept.length;
  console.log(`filter: keeping ${kept.length}, skipping ${skipped} past-dated`);

  // 5. migrate
  let ok = 0, fail = 0, sort = 0;
  await pool(kept, 6, async (url) => {
    const html = await fetchText(url);
    if (!html) { fail++; return; }
    const t = extractTour(html, url);
    if (!t.slug || !t.title) { fail++; console.warn(`  ! parse ${url}`); return; }
    const catsFor = catMap.get(t.slug) ? [...catMap.get(t.slug)] : [inferCategory(t.slug)];

    const { data: tour, error } = await sb.from('tours').upsert({
      slug: t.slug, title: t.title, summary: t.summary, price_from: t.price_from,
      currency: 'EUR', status: 'published', source_url: t.source_url,
      sort_order: sort++, published_at: new Date().toISOString(),
    }, { onConflict: 'slug' }).select().single();
    if (error) { fail++; console.warn(`  ! db ${t.slug}: ${error.message}`); return; }

    const path = await uploadImage(t.slug, t.image);
    await sb.from('tour_images').delete().eq('tour_id', tour.id);
    if (path) {
      const { data: img } = await sb.from('tour_images').insert({
        tour_id: tour.id, storage_path: path, alt_el: t.title, width: t.width, height: t.height, position: 0,
      }).select().single();
      if (img) await sb.from('tours').update({ cover_image_id: img.id }).eq('id', tour.id);
    }
    for (const c of catsFor) {
      if (catId[c]) await sb.from('tour_categories').upsert({ tour_id: tour.id, category_id: catId[c], is_primary: c === catsFor[0] }, { onConflict: 'tour_id,category_id' });
    }
    ok++;
    if (ok % 10 === 0) console.log(`  ...${ok} migrated`);
  });

  console.log(`\nMigrated: ${ok} · failed: ${fail} · skipped(past): ${skipped}`);

  // 6. remove interim seed tours (short slugs from scripts/seed-db.mjs)
  const SEED = ['psatha-thalassia-bania','tinos-proskynima','lichadonisia-kavos','ydra','spetses','meteora','delphi','nafplio','andros','akr-sounio','pilio','skyros','saronikos-tria-nisia','skiathos-koukounaries-kroyaziera'];
  const { error: delErr } = await sb.from('tours').delete().in('slug', SEED);
  console.log(delErr ? `seed cleanup error: ${delErr.message}` : `removed ${SEED.length} interim seed tours`);
}

main().then(() => process.exit(0)).catch((e) => { console.error(e); process.exit(1); });
