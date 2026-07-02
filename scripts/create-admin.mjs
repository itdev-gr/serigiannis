// Create a Supabase auth user (email confirmed) and grant the admin role via
// app_metadata.role='admin' (checked by middleware). Idempotent: if the user already
// exists, it resets the password and (re)grants admin.
// Run: node --env-file=.env.local scripts/create-admin.mjs <email> <password>
import { createClient } from '@supabase/supabase-js';

const [email, password] = process.argv.slice(2);
if (!email || !password) {
  console.error('usage: node scripts/create-admin.mjs <email> <password>');
  process.exit(1);
}

const sb = createClient(process.env.NEXT_PUBLIC_SUPABASE_URL, process.env.SUPABASE_SERVICE_ROLE_KEY, {
  auth: { persistSession: false },
});

const { data, error } = await sb.auth.admin.createUser({
  email,
  password,
  email_confirm: true,
  app_metadata: { role: 'admin' },
});

if (!error) {
  console.log(`✓ created admin ${email} (id ${data.user.id}). They can log in at /admin/login.`);
  process.exit(0);
}

// Already registered → locate and update instead.
let user = null;
for (let page = 1; page <= 20 && !user; page++) {
  const { data: list, error: e2 } = await sb.auth.admin.listUsers({ page, perPage: 200 });
  if (e2) { console.error(e2.message); process.exit(1); }
  user = list.users.find((u) => u.email?.toLowerCase() === email.toLowerCase());
  if (list.users.length < 200) break;
}
if (!user) { console.error(error.message); process.exit(1); }

const { error: e3 } = await sb.auth.admin.updateUserById(user.id, {
  password,
  email_confirm: true,
  app_metadata: { ...user.app_metadata, role: 'admin' },
});
if (e3) { console.error(e3.message); process.exit(1); }
console.log(`✓ updated existing user ${email} → admin (password reset).`);
process.exit(0);
