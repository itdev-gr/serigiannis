-- 0039: σήμανση «Το είδα» ανά συναλλαγή Viva στο admin (αίτημα 2026-08-28).
-- Ο ιδιοκτήτης θέλει να τσεκάρει ποιες πληρωμές έχει ήδη ελέγξει, ώστε να μην
-- τις ξαναψάχνει. Ξεχωριστή στήλη που ΔΕΝ γράφει ο αυτόματος συγχρονισμός
-- (το upsert στέλνει μόνο τα πεδία της Viva), οπότε η σήμανση επιβιώνει.
-- Η ενημέρωση γίνεται με τη σύνοδο του admin μέσω του υπάρχοντος policy
-- vivatrx_admin_update (0037).

alter table public.viva_transactions
  add column if not exists reviewed_at timestamptz;

create index if not exists viva_transactions_reviewed_idx
  on public.viva_transactions (reviewed_at);
