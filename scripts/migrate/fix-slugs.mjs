// Repair tours whose slug contains %xx URL-encoding (which broke Storage keys).
// Cleans the slug and re-uploads the cover image. Run:
// node --env-file=.env.local scripts/migrate/fix-slugs.mjs
import { createClient } from '@supabase/supabase-js';

const sb = createClient(process.env.NEXT_PUBLIC_SUPABASE_URL, process.env.SUPABASE_SERVICE_ROLE_KEY, { auth: { persistSession: false } });
const UA = 'Mozilla/5.0 (SergianiMigration/1.0)';

const clean = (s) => s.replace(/%[0-9a-f]{2}/gi, '').replace(/-+/g, '-').replace(/^-|-$/g, '');

async function coverFrom(sourceUrl) {
  const r = await fetch(sourceUrl, { headers: { 'User-Agent': UA } });
  if (!r.ok) return null;
  const html = await r.text();
  const meta = (p) => (html.match(new RegExp(`<meta property="${p}" content="([^"]*)"`)) || [])[1];
  let image = meta('og:image');
  const blocks = [...html.matchAll(/<script type="application\/ld\+json"[^>]*>(.*?)<\/script>/gs)].map((m) => m[1]);
  for (const b of blocks) { let d; try { d = JSON.parse(b); } catch { continue; }
    const g = d['@graph'] || (Array.isArray(d) ? d : [d]);
    for (const n of g) if (n['@type'] === 'TouristTrip' && typeof n.image === 'string') image = n.image; }
  return { image, width: parseInt(meta('og:image:width') || '', 10) || null, height: parseInt(meta('og:image:height') || '', 10) || null };
}

const { data: tours } = await sb.from('tours').select('id,slug,title,source_url').or('cover_image_id.is.null');
const bad = tours.filter((t) => /%[0-9a-f]{2}/i.test(t.slug));
console.log(`repairing ${bad.length} tours`);

for (const t of bad) {
  const newSlug = clean(t.slug);
  // update slug (skip if it would collide)
  const { data: existing } = await sb.from('tours').select('id').eq('slug', newSlug).neq('id', t.id).maybeSingle();
  const slug = existing ? `${newSlug}-${t.id.slice(0, 4)}` : newSlug;
  await sb.from('tours').update({ slug }).eq('id', t.id);

  const cov = t.source_url ? await coverFrom(t.source_url) : null;
  if (cov?.image) {
    const r = await fetch(cov.image, { headers: { 'User-Agent': UA } });
    if (r.ok) {
      const buf = Buffer.from(await r.arrayBuffer());
      const ext = (cov.image.split('.').pop() || 'jpg').split(/[?#]/)[0].toLowerCase();
      const path = `${slug}/cover.${ext === 'jpeg' ? 'jpg' : ext}`;
      const { error } = await sb.storage.from('tour-images').upload(path, buf, { contentType: r.headers.get('content-type') || 'image/jpeg', upsert: true });
      if (!error) {
        await sb.from('tour_images').delete().eq('tour_id', t.id);
        const { data: img } = await sb.from('tour_images').insert({ tour_id: t.id, storage_path: path, alt_el: t.title, width: cov.width, height: cov.height, position: 0 }).select().single();
        if (img) await sb.from('tours').update({ cover_image_id: img.id }).eq('id', t.id);
        console.log(`  ok  ${slug}`);
        continue;
      }
    }
  }
  console.log(`  slug-only  ${slug} (no image)`);
}
console.log('done');
process.exit(0);
