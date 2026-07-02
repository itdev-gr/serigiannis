# Deploying Sergiani Travel (Vercel)

The repo is a standard Next.js 16 app. It's already **linked** to the Vercel project
`itdevs-projects-a8c0aa53/serigiani` and the **GitHub repo is connected**, so every push
to `main` triggers a production deploy — once the environment variables below are set.

## 1. Set environment variables (required before the first build)

`NEXT_PUBLIC_*` vars are inlined at **build time**. Without the Supabase ones, the site
falls back to seed data (12 demo tours) instead of the real database (254 tours), and the
admin login can't initialise. Set all four for the **Production** (and ideally **Preview**)
environments.

| Variable | Where to get it | Notes |
|---|---|---|
| `NEXT_PUBLIC_SUPABASE_URL` | your `.env.local` | public |
| `NEXT_PUBLIC_SUPABASE_ANON_KEY` | your `.env.local` | public |
| `SUPABASE_SERVICE_ROLE_KEY` | your `.env.local` | **secret — server only, never expose** |
| `NEXT_PUBLIC_SITE_URL` | the production domain (see step 3) | e.g. `https://serigiani.vercel.app` |

**Option A — Dashboard:** Vercel → Project `serigiani` → Settings → Environment Variables →
add each of the four (copy values from `.env.local`), scope = Production (+ Preview).

**Option B — CLI (run these yourself so the secrets stay in your session):**
```bash
vercel env add NEXT_PUBLIC_SUPABASE_URL production
vercel env add NEXT_PUBLIC_SUPABASE_ANON_KEY production
vercel env add SUPABASE_SERVICE_ROLE_KEY production
vercel env add NEXT_PUBLIC_SITE_URL production
```
Each command prompts for the value (paste from `.env.local`).

## 2. Deploy

- **Auto:** push to `main` (GitHub is connected) → Vercel builds & deploys, **or**
- **Manual:** `vercel deploy --prod`

## 3. Set the real site URL, then redeploy

After the first deploy, note the assigned production domain (e.g. `https://serigiani.vercel.app`),
set `NEXT_PUBLIC_SITE_URL` to it, and redeploy so canonical URLs, `sitemap.xml`, `robots.txt`
and JSON-LD emit absolute production URLs.

## 4. Verify

- `/` renders the real tours (not the 12 seed demos).
- `/admin/login` → log in (`mkifokeris@itdev.gr`) → dashboard loads.
- `/sitemap.xml` lists `https://<domain>/tour/...` (not localhost).
- Change the weak admin password: `node --env-file=.env.local scripts/create-admin.mjs <email> <newpass>`.

## Notes

- Admin auth uses Supabase **password** sign-in — no email-redirect config needed. (If you
  later add magic-link/OAuth, add the production URL to Supabase → Auth → URL Configuration.)
- Images: `next/image` allows `*.supabase.co/*.supabase.in` (real covers) plus local
  `/public` assets (hero slideshow, brand logo). No extra config needed.
