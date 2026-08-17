-- 0033: έτοιμα κείμενα εκδρομών (tour_presets) + opt-in ενημερώσεων στα leads.
--
-- ΓΙΑΤΙ (1): το γραφείο ξαναγράφει σε ΚΑΘΕ εκδρομή από την αρχή τα σημεία
-- συνάντησης και τα «Περιλαμβάνονται / Δεν περιλαμβάνονται». Ζήτησε μια
-- κεντρική λίστα με έτοιμες γραμμές που θα τσεκάρει ανά εκδρομή. Ο πίνακας
-- tour_presets κρατά τις γραμμές αυτές ανά είδος (kind)· η φόρμα εκδρομής τις
-- δείχνει ως checkboxes και το αποτέλεσμα αποθηκεύεται ΟΠΩΣ ΠΡΙΝ στα text[]
-- πεδία της εκδρομής (meeting_points, included, not_included) — καμία αλλαγή
-- στο δημόσιο site ή στο finalize_tour_order.
--
-- ΓΙΑΤΙ (2): η φόρμα «Ζητήστε Κράτηση» αποκτά checkbox «Θέλω να λαμβάνω
-- ενημερώσεις για νέες εκδρομές» (πάνω από την αποδοχή όρων, όπως ζήτησε το
-- γραφείο) — χρειάζεται στήλη marketing_opt_in στα leads, όπως έχουν ήδη τα
-- tour_orders (0021) και ticket_orders (0008).
--
-- Εφαρμογή: ΧΕΙΡΟΚΙΝΗΤΑ στο project lucwtnzdvcpcdcmfxbqp (SQL editor), ΠΡΙΝ
-- το push — αλλιώς το admin σπάει στη φόρμα εκδρομής και η δημόσια φόρμα
-- κράτησης στο insert. Ξανατρέξιμο ακίνδυνο (if not exists / on conflict).

create table if not exists public.tour_presets (
  id uuid primary key default gen_random_uuid(),
  -- meeting_point: σημεία συνάντησης/επιβίβασης · included / not_included:
  -- γραμμές για την ενότητα «Τι περιλαμβάνεται» της σελίδας εκδρομής.
  kind text not null check (kind in ('meeting_point', 'included', 'not_included')),
  label text not null,
  sort_order int not null default 0,
  created_at timestamptz not null default now(),
  unique (kind, label)
);

alter table public.tour_presets enable row level security;

-- Μόνο το γραφείο τα βλέπει και τα διαχειρίζεται: το δημόσιο site διαβάζει
-- πάντα τα text[] πεδία της κάθε εκδρομής, ποτέ τον πίνακα αυτόν.
drop policy if exists tour_presets_admin_select on public.tour_presets;
create policy tour_presets_admin_select on public.tour_presets
  for select to authenticated using (public.is_admin());
drop policy if exists tour_presets_admin_insert on public.tour_presets;
create policy tour_presets_admin_insert on public.tour_presets
  for insert to authenticated with check (public.is_admin());
drop policy if exists tour_presets_admin_update on public.tour_presets;
create policy tour_presets_admin_update on public.tour_presets
  for update to authenticated using (public.is_admin()) with check (public.is_admin());
drop policy if exists tour_presets_admin_delete on public.tour_presets;
create policy tour_presets_admin_delete on public.tour_presets
  for delete to authenticated using (public.is_admin());

-- Λίγες συνηθισμένες γραμμές για αρχή — το γραφείο τις αλλάζει ελεύθερα από
-- τη νέα καρτέλα «Έτοιμα κείμενα» στο Διαχείριση → Εκδρομές.
insert into public.tour_presets (kind, label, sort_order) values
  ('included', 'Μεταφορά με πολυτελές πούλμαν', 0),
  ('included', 'Αρχηγός / συνοδός εκδρομής', 1),
  ('included', 'Φ.Π.Α.', 2),
  ('not_included', 'Είσοδοι σε μουσεία και αρχαιολογικούς χώρους', 0),
  ('not_included', 'Γεύματα και ποτά', 1),
  ('not_included', 'Ό,τι δεν αναφέρεται ρητά στα «Περιλαμβάνονται»', 2)
on conflict (kind, label) do nothing;

-- (2) opt-in ενημερώσεων στη φόρμα «Ζητήστε Κράτηση».
alter table public.leads
  add column if not exists marketing_opt_in boolean not null default false;
