// Migrate blog posts (ΝΕΑ) from sergianitravel.gr into the `posts` table + Storage.
// Extracts title/excerpt/cover/date from og: meta, the article body from the WP
// .hentry container (sanitized to a safe HTML allowlist), and rehosts every image
// into the 'tour-images' bucket. Idempotent (upsert by slug). The client's own content.
// Run:  node --env-file=.env.local scripts/migrate-posts.mjs [limit]
import { createClient } from '@supabase/supabase-js';
import { JSDOM } from 'jsdom';

const sb = createClient(process.env.NEXT_PUBLIC_SUPABASE_URL, process.env.SUPABASE_SERVICE_ROLE_KEY, {
  auth: { persistSession: false },
});
const BASE = 'https://sergianitravel.gr';
const UA = 'Mozilla/5.0 (SergianiPostMigration/1.0)';
const SUPA = process.env.NEXT_PUBLIC_SUPABASE_URL;
const limit = Number(process.argv[2]) || Infinity;

// URLs in post-sitemap that are structural pages, not blog articles.
const SKIP = new Set(['ekdromes-sergiani-travel', 'ekdromes', 'enoikiaseis-poylman', 'nea']);

async function fetchText(url) {
  for (let i = 0; i < 2; i++) {
    try { const r = await fetch(url, { headers: { 'User-Agent': UA } }); if (r.ok) return await r.text(); } catch {}
    await new Promise((r) => setTimeout(r, 300));
  }
  return null;
}

const ALLOWED = new Set(['P','H1','H2','H3','H4','H5','H6','UL','OL','LI','A','STRONG','B','EM','I','BLOCKQUOTE','FIGURE','FIGCAPTION','IMG','BR','HR']);
const NOISE = 'script,style,noscript,iframe,form,svg,button,input,select,textarea,nav,header,footer,aside,.sgt-related,[class*="related"],[class*="share"],[class*="widget"],[class*="sidebar"],[class*="comment"],[class*="breadcrumb"],[class*="menu"],[class*="social"],[class*="author-box"],[class*="post-meta"],[class*="entry-meta"],[class*="navigation"],[class*="pagination"]';

function slugFromUrl(url) {
  const seg = new URL(url).pathname.split('/').filter(Boolean).pop() || '';
  try { return decodeURIComponent(seg); } catch { return seg; }
}
function meta(doc, prop) {
  return doc.querySelector(`meta[property="${prop}"]`)?.getAttribute('content')
    || doc.querySelector(`meta[name="${prop}"]`)?.getAttribute('content') || null;
}
function cleanTitle(t) {
  return (t || '').replace(/\s*[|–-]\s*Sergiani\s*Travel.*$/i, '').trim();
}

async function rehostImage(imgUrl, slug, i) {
  if (!imgUrl || /^data:/i.test(imgUrl)) return null;
  const abs = imgUrl.startsWith('http') ? imgUrl : new URL(imgUrl, BASE).href;
  if (/logo|favicon|placeholder|spinner|avatar|gravatar|1x1|blank\./i.test(abs)) return null;
  const full = abs.replace(/-\d{2,4}x\d{2,4}(\.\w+)(\?.*)?$/i, '$1'); // strip WP -WxH suffix → full size
  for (const candidate of [full, abs]) {
    try {
      const r = await fetch(candidate, { headers: { 'User-Agent': UA } });
      if (!r.ok) continue;
      const buf = Buffer.from(await r.arrayBuffer());
      if (buf.length < 2500) return null; // skip tiny icons
      const ext = (candidate.split('.').pop() || 'jpg').split(/[?#]/)[0].toLowerCase();
      const safeSlug = slug.replace(/[^a-z0-9-]/gi, '').slice(0, 80) || 'post'; // storage keys must be ASCII
      const path = `posts/${safeSlug}/${i}.${ext === 'jpeg' ? 'jpg' : ext}`;
      const { error } = await sb.storage.from('tour-images').upload(path, buf, {
        contentType: r.headers.get('content-type') || 'image/jpeg', upsert: true,
      });
      if (error) { console.warn(`   ! upload ${slug}/${i}: ${error.message}`); return null; }
      return path;
    } catch {}
  }
  return null;
}

function sanitizeBody(root) {
  root.querySelectorAll(NOISE).forEach((el) => el.remove());
  const walk = (node) => {
    for (const el of [...node.children]) {
      walk(el);
      if (!ALLOWED.has(el.tagName)) {
        while (el.firstChild) el.parentNode.insertBefore(el.firstChild, el);
        el.remove();
      } else {
        for (const attr of [...el.attributes]) {
          const keep = (el.tagName === 'A' && attr.name === 'href') || (el.tagName === 'IMG' && (attr.name === 'src' || attr.name === 'alt'));
          if (!keep) el.removeAttribute(attr.name);
        }
        if (el.tagName === 'A' && /^\s*javascript:/i.test(el.getAttribute('href') || '')) el.removeAttribute('href');
      }
    }
  };
  walk(root);
  root.querySelector('h1')?.remove(); // title lives in PageHero
  root.querySelectorAll('p').forEach((p) => { if (!p.textContent.trim() && !p.querySelector('img')) p.remove(); });
  return root;
}

async function migratePost(url) {
  const slug = slugFromUrl(url);
  const html = await fetchText(url);
  if (!html) { console.warn(`   ! fetch failed ${slug}`); return false; }
  const doc = new JSDOM(html).window.document;

  const title = cleanTitle(meta(doc, 'og:title') || doc.querySelector('h1')?.textContent || slug);
  const excerpt = meta(doc, 'og:description');
  const coverUrl = meta(doc, 'og:image');
  const publishedAt = meta(doc, 'article:published_time') || new Date().toISOString();
  const seoTitle = doc.querySelector('title')?.textContent?.trim() || null;

  // body root
  const root = doc.querySelector('.entry-content') || doc.querySelector('.hentry') || doc.querySelector('article') || doc.querySelector('main') || doc.body;
  const clean = sanitizeBody(root);

  // rehost inline images, rewrite src
  let idx = 1;
  for (const img of [...clean.querySelectorAll('img')]) {
    const path = await rehostImage(img.getAttribute('src'), slug, idx++);
    if (path) img.setAttribute('src', `${SUPA}/storage/v1/object/public/tour-images/${path}`);
    else img.remove();
  }
  let body = clean.innerHTML.replace(/\s+/g, ' ').replace(/>\s+</g, '><').trim();
  // Rewrite old-site internal links to our routes (category hub → /ekdromes, rest relative).
  body = body
    .replace(/https:\/\/(www\.)?sergianitravel\.gr\/ekdromes-sergiani-travel\//g, '/ekdromes/')
    .replace(/https:\/\/(www\.)?sergianitravel\.gr\//g, '/');
  // Drop a leading orphan category link (breadcrumb remnant) if the body starts with one.
  body = body.replace(/^(<img[^>]*>)?<a href="\/ekdromes\/?">[^<]*<\/a>/i, '$1');

  // rehost cover
  const coverPath = await rehostImage(coverUrl, slug, 0);

  const { error } = await sb.from('posts').upsert({
    slug, title, excerpt, body,
    cover_path: coverPath,
    status: 'published', published_at: publishedAt,
    seo_title: seoTitle, seo_description: excerpt,
  }, { onConflict: 'slug' });
  if (error) { console.warn(`   ! db ${slug}: ${error.message}`); return false; }
  console.log(`   ✓ ${slug}  (title: ${title.slice(0, 40)}…, body ${body.length}b, cover ${coverPath ? 'yes' : 'no'})`);
  return true;
}

async function main() {
  const sm = await fetchText(`${BASE}/post-sitemap.xml`);
  const urls = [...new Set([...sm.matchAll(/<loc>([^<]+)<\/loc>/g)].map((m) => m[1]))]
    .filter((u) => !SKIP.has(slugFromUrl(u)))
    .slice(0, limit);
  console.log(`Migrating ${urls.length} posts…`);
  let ok = 0;
  for (const u of urls) { if (await migratePost(u)) ok++; }
  console.log(`\nDone: ${ok}/${urls.length} posts migrated.`);
}
main().then(() => process.exit(0)).catch((e) => { console.error(e); process.exit(1); });
