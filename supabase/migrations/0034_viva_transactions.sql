-- 0034: καθρέφτης ΟΛΩΝ των συναλλαγών Viva στο admin (αίτημα 2026-08-20).
-- Το γραφείο χρεώνει και εκτός site (POS source «Default», payment links
-- source «7498»)· αυτές οι πληρωμές δεν περνούν ποτέ από τις παραγγελίες μας
-- και ο ιδιοκτήτης δεν τις έβλεπε πουθενά. Ο πίνακας γεμίζει από το webhook
-- (real-time) και από το cron reconciliation (/api/cron/viva-sync), πάντα με
-- idempotent upsert πάνω στο transaction_id της Viva.

create table public.viva_transactions (
  transaction_id uuid primary key,
  order_code text,
  amount_cents int not null default 0,
  -- Viva statusId: F=ολοκληρωμένη, E=αποτυχημένη, A=ενεργή/pre-auth, κ.λπ.
  status text not null,
  source_code text,
  terminal_id bigint,
  bank_id text,
  card_number text,
  transaction_type_id int,
  -- παράγωγο πεδίο: card | iris | wallet | other (βλ. derivePaymentMethod)
  payment_method text not null default 'card',
  customer_trns text,
  merchant_trns text,
  full_name text,
  email text,
  occurred_at timestamptz not null,
  -- match με δική μας παραγγελία, όταν το merchant_trns είναι δικό μας id
  order_family text check (order_family in ('tour', 'ticket')),
  order_id uuid,
  -- πλήρης απάντηση της Viva: επιτρέπει αναδρομική διόρθωση του mapping
  -- (π.χ. όταν δούμε την πρώτη πραγματική πληρωμή IRIS)
  raw jsonb not null default '{}'::jsonb,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create index viva_transactions_occurred_idx on public.viva_transactions (occurred_at desc);
create index viva_transactions_order_idx on public.viva_transactions (order_id);
create trigger viva_transactions_touch before update on public.viva_transactions
  for each row execute function public.touch_updated_at();

-- RLS: διαβάζει μόνο ο admin· γράφει μόνο ο service ρόλος (webhook/cron).
alter table public.viva_transactions enable row level security;
create policy vivatrx_admin_read on public.viva_transactions for select to authenticated
  using (public.is_admin());

-- Μέθοδος πληρωμής και πάνω στην παραγγελία (denormalized) ώστε οι λίστες
-- κρατήσεων να τη δείχνουν χωρίς join.
alter table public.tour_orders add column if not exists payment_method text;
alter table public.ticket_orders add column if not exists payment_method text;
