-- 0036: στοιχεία ταυτοποίησης για χρεώσεις POS (αίτημα 2026-08-21).
-- Στο POS η Viva δεν έχει ΚΑΝΕΝΑ στοιχείο πελάτη (ανέπαφη κάρτα) — ό,τι
-- υπάρχει για ταυτοποίηση είναι ο τύπος/τράπεζα της κάρτας και ο αριθμός
-- αναφοράς που τυπώνεται στη χάρτινη απόδειξη του τερματικού. Τα βγάζουμε
-- από το raw σε στήλες ώστε η σελίδα «Πληρωμές» να τα δείχνει χωρίς να
-- κουβαλάει ολόκληρα jsonb.

alter table public.viva_transactions
  add column if not exists card_type text,
  add column if not exists issuing_bank text,
  add column if not exists receipt_ref text;

-- Backfill από τα ήδη αποθηκευμένα raw (legacy PascalCase ή checkout v2 camelCase).
update public.viva_transactions set
  card_type = coalesce(raw->'CreditCard'->'CardType'->>'Name', card_type),
  issuing_bank = coalesce(raw->'CreditCard'->>'IssuingBank', raw->>'cardIssuingBank', issuing_bank),
  receipt_ref = coalesce(raw->>'ReferenceNumber', raw->>'referenceNumber', receipt_ref)
where raw is not null;
