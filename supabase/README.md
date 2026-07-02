# Supabase — apply steps (gated on credentials)

These migrations are authored but **not yet applied**. Apply them once the project's
Supabase credentials exist in `.env.local` (see `.env.local.example`).

## Order
`0001_init.sql` → `0002_rls.sql` → `0003_storage_and_seed.sql`

## Applying (recommended flow, per the Supabase skill)
1. `supabase init` (if not already) and link: `supabase link --project-ref <ref>`.
2. Before implementing, check `https://supabase.com/changelog.md` for breaking changes.
3. Iterate the schema live with **`execute_sql`** (MCP) or `supabase db query` — do **not**
   use `apply_migration` for iteration (it writes history on every call and breaks diffs).
4. Run advisors and fix findings: `supabase db advisors` (or MCP `get_advisors`).
5. Reconcile to a clean migration: `supabase db pull <name> --local --yes`.
6. Verify: `supabase migration list --local`.

## Auth configuration (single-agency, invite-only admin)
- **Disable public sign-ups** in Auth settings (Dashboard → Authentication → Sign In / Providers,
  turn off "Allow new users to sign up"), or set `enable_signup = false` in `config.toml`.
- Create admin users via the Dashboard / Admin API, then grant the role by setting
  **`app_metadata.role = 'admin'`** (never `user_metadata`). Example (service role / SQL):
  ```sql
  -- via the auth admin API is preferred; SQL equivalent:
  update auth.users
    set raw_app_meta_data = raw_app_meta_data || '{"role":"admin"}'::jsonb
    where email = 'admin@sergianitravel.gr';
  ```
  The user must re-authenticate (token refresh) for `is_admin()` to see the claim.

## After apply
- Regenerate typed client types to replace the hand-written `types/db.ts`:
  `supabase gen types typescript --local > types/db.ts` (or `--project-id <ref>`).
- Set `NEXT_PUBLIC_SUPABASE_URL` / `NEXT_PUBLIC_SUPABASE_ANON_KEY` (publishable) in the app env;
  keep `SUPABASE_SERVICE_ROLE_KEY` server-only (migration/admin scripts).
