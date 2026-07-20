-- Sergiani Travel — ticketing RLS.
-- Public reads only active/published reference data and scheduled trips.
-- Orders/tickets/claims have NO public policies: guests reach their own order
-- exclusively through SECURITY DEFINER RPCs gated by the order access_token,
-- and every public write goes through an RPC (no direct table inserts).

-- stations ----------------------------------------------------------------
alter table public.stations enable row level security;
create policy stations_public_read on public.stations for select to anon, authenticated
  using (is_active);
create policy stations_admin_read on public.stations for select to authenticated
  using (public.is_admin());
create policy stations_admin_insert on public.stations for insert to authenticated
  with check (public.is_admin());
create policy stations_admin_update on public.stations for update to authenticated
  using (public.is_admin()) with check (public.is_admin());
create policy stations_admin_delete on public.stations for delete to authenticated
  using (public.is_admin());

-- bus_routes --------------------------------------------------------------
alter table public.bus_routes enable row level security;
create policy broutes_public_read on public.bus_routes for select to anon, authenticated
  using (status = 'published');
create policy broutes_admin_read on public.bus_routes for select to authenticated
  using (public.is_admin());
create policy broutes_admin_insert on public.bus_routes for insert to authenticated
  with check (public.is_admin());
create policy broutes_admin_update on public.bus_routes for update to authenticated
  using (public.is_admin()) with check (public.is_admin());
create policy broutes_admin_delete on public.bus_routes for delete to authenticated
  using (public.is_admin());

-- fare_types --------------------------------------------------------------
alter table public.fare_types enable row level security;
create policy fares_public_read on public.fare_types for select to anon, authenticated
  using (is_active and exists (
    select 1 from public.bus_routes r where r.id = route_id and r.status = 'published'));
create policy fares_admin_read on public.fare_types for select to authenticated
  using (public.is_admin());
create policy fares_admin_insert on public.fare_types for insert to authenticated
  with check (public.is_admin());
create policy fares_admin_update on public.fare_types for update to authenticated
  using (public.is_admin()) with check (public.is_admin());
create policy fares_admin_delete on public.fare_types for delete to authenticated
  using (public.is_admin());

-- bus_layouts (public renders seat maps from these; nothing sensitive) ----
alter table public.bus_layouts enable row level security;
create policy layouts_public_read on public.bus_layouts for select to anon, authenticated
  using (is_active);
create policy layouts_admin_read on public.bus_layouts for select to authenticated
  using (public.is_admin());
create policy layouts_admin_insert on public.bus_layouts for insert to authenticated
  with check (public.is_admin());
create policy layouts_admin_update on public.bus_layouts for update to authenticated
  using (public.is_admin()) with check (public.is_admin());
create policy layouts_admin_delete on public.bus_layouts for delete to authenticated
  using (public.is_admin());

-- schedule_patterns (admin-only; public sees materialized trips) ----------
alter table public.schedule_patterns enable row level security;
create policy patterns_admin_read on public.schedule_patterns for select to authenticated
  using (public.is_admin());
create policy patterns_admin_insert on public.schedule_patterns for insert to authenticated
  with check (public.is_admin());
create policy patterns_admin_update on public.schedule_patterns for update to authenticated
  using (public.is_admin()) with check (public.is_admin());
create policy patterns_admin_delete on public.schedule_patterns for delete to authenticated
  using (public.is_admin());

-- trips -------------------------------------------------------------------
alter table public.trips enable row level security;
create policy trips_public_read on public.trips for select to anon, authenticated
  using (status = 'scheduled');
create policy trips_admin_read on public.trips for select to authenticated
  using (public.is_admin());
create policy trips_admin_insert on public.trips for insert to authenticated
  with check (public.is_admin());
create policy trips_admin_update on public.trips for update to authenticated
  using (public.is_admin()) with check (public.is_admin());
create policy trips_admin_delete on public.trips for delete to authenticated
  using (public.is_admin());

-- booking_settings (public needs window/hold copy for the wizard) ---------
alter table public.booking_settings enable row level security;
create policy bset_public_read on public.booking_settings for select to anon, authenticated
  using (true);
create policy bset_admin_update on public.booking_settings for update to authenticated
  using (public.is_admin()) with check (public.is_admin());

-- ticket_orders / tickets / claims / refunds: admin-only table access -----
alter table public.ticket_orders enable row level security;
create policy torders_admin_read on public.ticket_orders for select to authenticated
  using (public.is_admin());
create policy torders_admin_update on public.ticket_orders for update to authenticated
  using (public.is_admin()) with check (public.is_admin());
create policy torders_admin_delete on public.ticket_orders for delete to authenticated
  using (public.is_admin());

alter table public.tickets enable row level security;
create policy tickets_admin_read on public.tickets for select to authenticated
  using (public.is_admin());
create policy tickets_admin_update on public.tickets for update to authenticated
  using (public.is_admin()) with check (public.is_admin());

alter table public.trip_seat_claims enable row level security;
create policy claims_admin_read on public.trip_seat_claims for select to authenticated
  using (public.is_admin());

alter table public.refunds enable row level security;
create policy refunds_admin_read on public.refunds for select to authenticated
  using (public.is_admin());

alter table public.payment_events enable row level security;
create policy pevents_admin_read on public.payment_events for select to authenticated
  using (public.is_admin());
