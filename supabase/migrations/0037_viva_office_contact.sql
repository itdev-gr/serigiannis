-- 0037: χειροκίνητα στοιχεία πελάτη σε συναλλαγές Viva (αίτημα 2026-08-21).
-- Οι χρεώσεις POS δεν έχουν στοιχεία από την πηγή — το γραφείο θέλει να
-- σημειώνει ποιος πλήρωσε. Ξεχωριστές στήλες office_* ώστε ο αυτόματος
-- συγχρονισμός (webhook/cron), που κάνει upsert τα πεδία της Viva, να μην
-- τις αγγίζει ποτέ.

alter table public.viva_transactions
  add column if not exists office_name text,
  add column if not exists office_email text,
  add column if not exists office_phone text;

-- Μέχρι τώρα ο πίνακας είχε μόνο admin read (οι εγγραφές γίνονταν με service
-- ρόλο)· η επεξεργασία των office_* πεδίων γίνεται με τη σύνοδο του admin.
create policy vivatrx_admin_update on public.viva_transactions for update to authenticated
  using (public.is_admin()) with check (public.is_admin());
