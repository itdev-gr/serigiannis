-- 0024: στοιχεία επιβατών ανά κράτηση εκδρομής. Το γραφείο χρειάζεται
-- ονομαστική λίστα· ο υπεύθυνος κράτησης μένει στα υπάρχοντα πεδία.
alter table public.tour_orders
  add column if not exists passengers jsonb not null default '[]'::jsonb;

-- public: write the customer details and hand off to the gateway -----------
-- p_customer = { customer_name, email, phone, notes?, marketing_opt_in?, accept_terms, passengers? }
-- passengers (new, optional) = [ { name, phone? }, ... ] — sanitised server-side:
-- only name/phone are kept, the list is capped at 40 entries, and anything that
-- is not a JSON array is ignored entirely. Live deploy note: old client code
-- (mid-rollout) posts p_customer without a `passengers` key at all — that must
-- keep working exactly as before, landing '[]' in the new column. Every other
-- check, the status transition and the return shape are unchanged from 0021.
create or replace function public.finalize_tour_order(
  p_order_id uuid, p_token uuid, p_customer jsonb, p_provider text)
returns jsonb
language plpgsql volatile security definer set search_path = '' as $$
declare
  v_order public.tour_orders;
  v_passengers jsonb := '[]'::jsonb;
  v_raw jsonb;
  v_p jsonb;
  v_name text;
  v_phone text;
  v_count int := 0;
begin
  select * into v_order from public.tour_orders
    where id = p_order_id and access_token = p_token for update;
  if not found then
    return jsonb_build_object('ok', false, 'error', 'order_not_found');
  end if;
  if v_order.status = 'paid' then
    return jsonb_build_object('ok', true, 'already_paid', true, 'total_cents', v_order.amount_total_cents);
  end if;
  if v_order.status not in ('pending', 'awaiting_payment') then
    return jsonb_build_object('ok', false, 'error', 'order_not_payable');
  end if;
  if v_order.status = 'pending' and v_order.expires_at is not null and v_order.expires_at <= now() then
    update public.tour_orders set status = 'expired' where id = v_order.id;
    return jsonb_build_object('ok', false, 'error', 'order_expired');
  end if;
  if coalesce(length(trim(p_customer->>'customer_name')), 0) < 2
     or coalesce(p_customer->>'email', '') !~ '^[^@[:space:]]+@[^@[:space:]]+\.[^@[:space:]]+$'
     or coalesce(length(regexp_replace(coalesce(p_customer->>'phone', ''), '[^0-9]', '', 'g')), 0) < 8 then
    return jsonb_build_object('ok', false, 'error', 'invalid_customer');
  end if;
  if not coalesce((p_customer->>'accept_terms')::boolean, false) then
    return jsonb_build_object('ok', false, 'error', 'terms_required');
  end if;

  -- sanitise the passenger list: keep only name/phone, cap at 40, ignore
  -- anything that isn't a JSON array (including an absent key — old clients).
  v_raw := p_customer->'passengers';
  if jsonb_typeof(v_raw) = 'array' then
    for v_p in select * from jsonb_array_elements(v_raw) loop
      exit when v_count >= 40;
      continue when jsonb_typeof(v_p) <> 'object';
      v_name := nullif(trim(coalesce(v_p->>'name', '')), '');
      continue when v_name is null;
      v_phone := nullif(trim(coalesce(v_p->>'phone', '')), '');
      v_passengers := v_passengers || jsonb_build_object('name', v_name, 'phone', v_phone);
      v_count := v_count + 1;
    end loop;
  end if;

  update public.tour_orders set
      customer_name = trim(p_customer->>'customer_name'),
      email = lower(trim(p_customer->>'email')),
      phone = trim(p_customer->>'phone'),
      notes = nullif(trim(coalesce(p_customer->>'notes', '')), ''),
      marketing_opt_in = coalesce((p_customer->>'marketing_opt_in')::boolean, false),
      passengers = v_passengers,
      accepted_terms_at = now(),
      payment_provider = p_provider,
      status = case when p_provider = 'offline' then 'offline'::public.order_status
                    else 'awaiting_payment'::public.order_status end,
      expires_at = case when p_provider = 'offline' then null else now() + interval '45 minutes' end
    where id = p_order_id;

  return jsonb_build_object(
    'ok', true,
    'offline', p_provider = 'offline',
    'public_code', v_order.public_code,
    'total_cents', v_order.amount_total_cents);
end $$;
