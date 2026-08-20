-- 0035: εβδομαδιαία προγράμματα αναχωρήσεων εκδρομών (αίτημα 2026-08-20).
-- Ό,τι κάνει το schedule_patterns/materialize_trips για τα λεωφορεία (0007/0010),
-- για τις εκδρομές: το γραφείο ορίζει «κάθε Σάββατο & Κυριακή, 50 θέσεις» μία
-- φορά και οι γραμμές tour_departures γεννιούνται αυτόματα, ακόμα κι όταν η
-- εκδρομή δεν έχει συνδεδεμένο πούλμαν. Ο πελάτης δεν αλλάζει καθόλου — το
-- widget και το create_tour_order δουλεύουν ήδη με κανονικές γραμμές.

create table public.tour_departure_patterns (
  id uuid primary key default gen_random_uuid(),
  tour_id uuid not null references public.tours(id) on delete cascade,
  -- extract(dow): 0=Κυριακή … 6=Σάββατο (ίδια κωδικοποίηση με schedule_patterns)
  weekdays smallint[] not null check (weekdays <@ array[0,1,2,3,4,5,6]::smallint[]),
  valid_from date not null,
  valid_to date,               -- null = χωρίς λήξη
  capacity int check (capacity > 0),  -- null = απεριόριστες θέσεις
  note text,
  is_active boolean not null default true,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);
create index tour_dep_patterns_tour_idx on public.tour_departure_patterns (tour_id) where is_active;
create trigger tour_departure_patterns_touch before update on public.tour_departure_patterns
  for each row execute function public.touch_updated_at();

alter table public.tour_departure_patterns enable row level security;
create policy tdpat_admin_read on public.tour_departure_patterns for select to authenticated
  using (public.is_admin());
create policy tdpat_admin_insert on public.tour_departure_patterns for insert to authenticated
  with check (public.is_admin());
create policy tdpat_admin_update on public.tour_departure_patterns for update to authenticated
  using (public.is_admin()) with check (public.is_admin());
create policy tdpat_admin_delete on public.tour_departure_patterns for delete to authenticated
  using (public.is_admin());

-- Σύνδεση παραγόμενης αναχώρησης ↔ προγράμματος. Το partial unique index είναι
-- ο εγγυητής και του idempotency ΚΑΙ της «παράλειψης ημέρας»: μια γραμμή που
-- απενεργοποιήθηκε ΜΕΝΕΙ στη θέση της, οπότε η επόμενη υλοποίηση δεν τη
-- ξαναγεννά (on conflict do nothing).
alter table public.tour_departures
  add column if not exists pattern_id uuid references public.tour_departure_patterns(id) on delete set null;
create unique index tour_dep_pattern_date_uq on public.tour_departures (pattern_id, starts_on)
  where pattern_id is not null;

-- Υλοποίηση: γεννά τις ημερομηνίες ενός tour μέσα στο διάστημα. Idempotent.
create or replace function public.materialize_tour_departures(p_tour_id uuid, p_from date, p_to date)
returns int
language plpgsql volatile security definer set search_path = '' as $$
declare
  v_count int;
begin
  insert into public.tour_departures (tour_id, pattern_id, starts_on, note, capacity, is_active)
  select p.tour_id, p.id, d.d::date, p.note, p.capacity, true
  from public.tour_departure_patterns p
  cross join generate_series(p_from, p_to, interval '1 day') as d(d)
  where p.tour_id = p_tour_id
    and p.is_active
    and d.d::date >= p.valid_from
    and (p.valid_to is null or d.d::date <= p.valid_to)
    and extract(dow from d.d)::smallint = any (p.weekdays)
  on conflict do nothing;
  get diagnostics v_count = row_count;
  return v_count;
end $$;
revoke execute on function public.materialize_tour_departures(uuid, date, date) from public, anon;
grant execute on function public.materialize_tour_departures(uuid, date, date) to authenticated, service_role;

-- Επανασυγχρονισμός μετά από επεξεργασία προγράμματος: οι μελλοντικές
-- αυτο-παραγόμενες γραμμές ΧΩΡΙΣ κρατήσεις σβήνονται και ξαναγεννιούνται με
-- τους νέους όρους — έτσι η αλλαγή ημερών/θέσεων ενημερώνει το μέλλον.
-- Γραμμές με έστω μία κράτηση δεν αγγίζονται ποτέ.
create or replace function public.resync_tour_pattern(p_pattern_id uuid, p_horizon_days int default 60)
returns int
language plpgsql volatile security definer set search_path = '' as $$
declare
  v_pat public.tour_departure_patterns;
  v_today date := (now() at time zone 'Europe/Athens')::date;
begin
  select * into v_pat from public.tour_departure_patterns where id = p_pattern_id;
  if not found then return 0; end if;

  -- Οι απενεργοποιημένες γραμμές ΔΕΝ σβήνονται: είναι οι σκόπιμες «παραλείψεις
  -- ημέρας» του γραφείου και λειτουργούν ως tombstones ώστε η υλοποίηση να μην
  -- τις ξαναγεννήσει.
  delete from public.tour_departures d
  where d.pattern_id = p_pattern_id
    and d.starts_on >= v_today
    and d.is_active
    and not exists (select 1 from public.tour_orders o where o.departure_id = d.id);

  -- Αρνητικός ορίζοντας = μόνο καθαρισμός (πριν από διαγραφή προγράμματος).
  if p_horizon_days < 0 then return 0; end if;
  return public.materialize_tour_departures(v_pat.tour_id, v_today, v_today + p_horizon_days);
end $$;
revoke execute on function public.resync_tour_pattern(uuid, int) from public, anon;
grant execute on function public.resync_tour_pattern(uuid, int) to authenticated, service_role;
