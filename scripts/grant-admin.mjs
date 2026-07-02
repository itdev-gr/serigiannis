// Grant the admin role to an existing auth user (by email), via app_metadata
// (NOT user_metadata — app_metadata is not user-editable, so it's safe for RLS).
// Run: node --env-file=.env.local scripts/grant-admin.mjs <email>
import { createClient } from '@supabase/supabase-js';

const email = process.argv[2];
if (!email) { console.error('usage: node scripts/grant-admin.mjs <email>'); process.exit(1); }

const sb = createClient(process.env.NEXT_PUBLIC_SUPABASE_URL, process.env.SUPABASE_SERVICE_ROLE_KEY, {
  auth: { persistSession: false },
});

// find the user (page through if needed)
let user = null;
for (let page = 1; page <= 20 && !user; page++) {
  const { data, error } = await sb.auth.admin.listUsers({ page, perPage: 200 });
  if (error) { console.error(error.message); process.exit(1); }
  user = data.users.find((u) => u.email?.toLowerCase() === email.toLowerCase());
  if (data.users.length < 200) break;
}
if (!user) {
  console.error(`No auth user found for ${email}. Create it first (Supabase → Authentication → Add user).`);
  process.exit(1);
}

const { error } = await sb.auth.admin.updateUserById(user.id, {
  app_metadata: { ...user.app_metadata, role: 'admin' },
});
if (error) { console.error(error.message); process.exit(1); }
console.log(`✓ granted admin role to ${email}. They must re-login for the claim to take effect.`);
process.exit(0);
