'use server';
import { revalidatePath } from 'next/cache';
import { redirect } from 'next/navigation';
import { z } from 'zod';
import { createServerClient } from '@/lib/supabase/server';
import { parseBoardingPoints } from '@/lib/excursions';
import { flashQuery } from '@/lib/admin-flash';

function revalidateTicketing() {
  revalidatePath('/admin/stations');
  revalidatePath('/admin/routes');
  revalidatePath('/admin/layouts');
  revalidatePath('/admin/schedules');
  revalidatePath('/admin/orders');
  revalidatePath('/eisitiria');
}

const g = (fd: FormData, k: string) => String(fd.get(k) ?? '').trim();
const num = (fd: FormData, k: string) => {
  const v = Number(g(fd, k));
  return Number.isFinite(v) ? v : null;
};

// ------------------------------------------------------------- stations

export async function upsertStation(formData: FormData) {
  const sb = await createServerClient();
  const id = g(formData, 'id');
  const row = {
    name: g(formData, 'name'),
    slug: g(formData, 'slug'),
    code: g(formData, 'code') || null,
    position: num(formData, 'position') ?? 0,
    is_active: formData.get('is_active') !== null,
  };
  if (!row.name || !row.slug) return;
  const { error } = id
    ? await sb.from('stations').update(row).eq('id', id)
    : await sb.from('stations').insert(row);
  if (error) console.error('upsertStation:', error.message);
  revalidateTicketing();
}

export async function deleteStation(id: string) {
  const sb = await createServerClient();
  const { error } = await sb.from('stations').delete().eq('id', id);
  if (error) console.error('deleteStation:', error.message);
  revalidateTicketing();
}

// --------------------------------------------------------------- routes

export async function upsertRoute(formData: FormData) {
  const sb = await createServerClient();
  const id = g(formData, 'id');
  const row = {
    origin_station_id: g(formData, 'origin_station_id'),
    destination_station_id: g(formData, 'destination_station_id'),
    status: g(formData, 'status') === 'draft' ? 'draft' : 'published',
    duration_min: num(formData, 'duration_min'),
    sales_cutoff_min: num(formData, 'sales_cutoff_min'),
    position: num(formData, 'position') ?? 0,
    title: g(formData, 'title') || null,
    boarding_points: parseBoardingPoints(g(formData, 'boarding_points')),
  };
  if (!row.origin_station_id || !row.destination_station_id) return;

  if (id) {
    const { error } = await sb.from('bus_routes').update(row).eq('id', id);
    if (error) console.error('upsertRoute:', error.message);
    revalidateTicketing();
    redirect(`/admin/routes/${id}${flashQuery(!error)}`);
  }

  const { data: created, error } = await sb.from('bus_routes').insert(row).select('id').single();
  if (error) console.error('upsertRoute:', error.message);
  // every new excursion starts with the two client-mandated fare categories
  if (created) {
    const { error: e2 } = await sb.from('fare_types').insert([
      { route_id: created.id, name: 'Κανονικό', description: 'Κανονικό εισιτήριο.', price_oneway_cents: 0, price_round_cents: 0, requires_document: false, is_default: true, position: 1, is_active: true },
      { route_id: created.id, name: 'Φοιτητικό', description: 'Φοιτητές με επίδειξη ακαδημαϊκής ταυτότητας (πάσο).', price_oneway_cents: 0, price_round_cents: 0, requires_document: true, is_default: false, position: 2, is_active: true },
    ]);
    if (e2) console.error('upsertRoute fares:', e2.message);
  }
  revalidateTicketing();
  redirect('/admin/routes');
}

export async function deleteRoute(id: string) {
  const sb = await createServerClient();
  const { error } = await sb.from('bus_routes').delete().eq('id', id);
  if (error) console.error('deleteRoute:', error.message);
  revalidateTicketing();
}

// ---------------------------------------------------------------- fares

export async function upsertFareType(formData: FormData) {
  const sb = await createServerClient();
  const id = g(formData, 'id');
  const routeId = g(formData, 'route_id');
  const row = {
    route_id: routeId,
    name: g(formData, 'name'),
    description: g(formData, 'description') || null,
    price_oneway_cents: Math.round((num(formData, 'price_oneway') ?? 0) * 100),
    price_round_cents: Math.round((num(formData, 'price_round') ?? 0) * 100),
    requires_document: formData.get('requires_document') !== null,
    is_default: formData.get('is_default') !== null,
    position: num(formData, 'position') ?? 0,
    is_active: formData.get('is_active') !== null,
  };
  if (!routeId) return;
  if (!row.name) redirect(`/admin/routes/${routeId}${flashQuery(false, 'invalid_input')}`);
  const { error } = id
    ? await sb.from('fare_types').update(row).eq('id', id)
    : await sb.from('fare_types').insert(row);
  if (error) console.error('upsertFareType:', error.message);
  revalidatePath(`/admin/routes/${routeId}`);
  revalidateTicketing();
  redirect(`/admin/routes/${routeId}${flashQuery(!error)}`);
}

export async function deleteFareType(id: string, routeId: string) {
  const sb = await createServerClient();
  const { error } = await sb.from('fare_types').delete().eq('id', id);
  if (error) console.error('deleteFareType:', error.message);
  revalidatePath(`/admin/routes/${routeId}`);
  redirect(`/admin/routes/${routeId}${flashQuery(!error)}`);
}

// -------------------------------------------------------------- layouts

const CellSchema = z.object({
  r: z.number().int().min(0),
  c: z.number().int().min(0),
  type: z.enum(['seat', 'aisle', 'driver', 'door', 'wc', 'stairs', 'empty']),
  seat: z.string().optional(),
  online: z.boolean().optional(),
});
const LayoutSchema = z.object({
  decks: z
    .array(
      z.object({
        name: z.string().min(1),
        rows: z.number().int().min(1).max(40),
        cols: z.number().int().min(1).max(8),
        cells: z.array(CellSchema),
      })
    )
    .min(1)
    .max(2),
});

export async function upsertLayout(formData: FormData) {
  const sb = await createServerClient();
  const id = g(formData, 'id');
  const name = g(formData, 'name');
  let layout: z.infer<typeof LayoutSchema>;
  try {
    layout = LayoutSchema.parse(JSON.parse(g(formData, 'layout_json')));
  } catch (e) {
    console.error('upsertLayout: invalid layout json', e);
    return;
  }
  if (!name) return;
  const row = { name, layout, is_active: formData.get('is_active') !== null };
  const { error } = id
    ? await sb.from('bus_layouts').update(row).eq('id', id)
    : await sb.from('bus_layouts').insert(row);
  if (error) console.error('upsertLayout:', error.message);
  revalidateTicketing();
  redirect('/admin/layouts');
}

export async function deleteLayout(id: string) {
  const sb = await createServerClient();
  const { error } = await sb.from('bus_layouts').delete().eq('id', id);
  if (error) console.error('deleteLayout:', error.message);
  revalidateTicketing();
}

// ------------------------------------------------------------ schedules

export async function upsertPattern(formData: FormData) {
  const sb = await createServerClient();
  const id = g(formData, 'id');
  const weekdays = [0, 1, 2, 3, 4, 5, 6].filter((d) => formData.get(`wd_${d}`) !== null);
  const row = {
    route_id: g(formData, 'route_id'),
    layout_id: g(formData, 'layout_id'),
    departure_time: g(formData, 'departure_time'),
    weekdays,
    valid_from: g(formData, 'valid_from'),
    valid_to: g(formData, 'valid_to') || null,
    is_active: formData.get('is_active') !== null,
    notes: g(formData, 'notes') || null,
  };
  if (!row.route_id || !row.layout_id || !row.departure_time || !row.valid_from || weekdays.length === 0) return;
  const { error } = id
    ? await sb.from('schedule_patterns').update(row).eq('id', id)
    : await sb.from('schedule_patterns').insert(row);
  if (error) console.error('upsertPattern:', error.message);
  revalidateTicketing();
  redirect(`/admin/schedules${flashQuery(!error)}`);
}

export async function deletePattern(id: string) {
  const sb = await createServerClient();
  const { error } = await sb.from('schedule_patterns').delete().eq('id', id);
  if (error) console.error('deletePattern:', error.message);
  revalidateTicketing();
  redirect(`/admin/schedules${flashQuery(!error)}`);
}

export async function materializeTrips(formData: FormData) {
  const sb = await createServerClient();
  const from = g(formData, 'from');
  const to = g(formData, 'to');
  if (!from || !to) return;
  const { error } = await sb.rpc('admin_materialize_range', { p_from: from, p_to: to });
  if (error) console.error('materializeTrips:', error.message);
  revalidatePath('/admin/schedules');
  redirect(`/admin/schedules${flashQuery(!error)}`);
}

export async function createTrip(formData: FormData) {
  const sb = await createServerClient();
  const date = g(formData, 'service_date');
  const time = g(formData, 'departure_time');
  const row = {
    route_id: g(formData, 'route_id'),
    layout_id: g(formData, 'layout_id'),
    service_date: date,
    // stored as Athens local wall-clock; Postgres converts to timestamptz
    departure_at: `${date}T${time}:00+03:00`,
    notes: g(formData, 'notes') || null,
  };
  if (!row.route_id || !row.layout_id || !date || !time) return;
  const { error } = await sb.from('trips').insert(row);
  if (error) console.error('createTrip:', error.message);
  revalidatePath('/admin/schedules');
  redirect(`/admin/schedules${flashQuery(!error)}`);
}

export async function updateTrip(formData: FormData) {
  const sb = await createServerClient();
  const id = g(formData, 'id');
  if (!id) return;
  const row = {
    status: g(formData, 'status') === 'cancelled' ? 'cancelled' : 'scheduled',
    layout_id: g(formData, 'layout_id'),
    sales_cutoff_min: num(formData, 'sales_cutoff_min'),
    notes: g(formData, 'notes') || null,
  };
  const { error } = await sb.from('trips').update(row).eq('id', id);
  if (error) console.error('updateTrip:', error.message);
  revalidatePath(`/admin/schedules/trips/${id}`);
  revalidatePath('/admin/schedules');
  revalidatePath('/eisitiria');
  redirect(`/admin/schedules/trips/${id}${flashQuery(!error)}`);
}

// ---------------------------------------------------------- seat state

/** Called from AdminSeatMap via useTransition — returns status instead of redirecting. */
export async function blockSeat(tripId: string, seat: string): Promise<{ ok: boolean; error?: string }> {
  const sb = await createServerClient();
  const { error } = await sb.rpc('admin_block_seat', { p_trip_id: tripId, p_seat: seat });
  if (error) console.error('blockSeat:', error.message);
  revalidatePath(`/admin/schedules/trips/${tripId}`);
  return { ok: !error, error: error ? 'db' : undefined };
}

export async function unblockSeat(tripId: string, seat: string): Promise<{ ok: boolean; error?: string }> {
  const sb = await createServerClient();
  const { error } = await sb.rpc('admin_unblock_seat', { p_trip_id: tripId, p_seat: seat });
  if (error) console.error('unblockSeat:', error.message);
  revalidatePath(`/admin/schedules/trips/${tripId}`);
  return { ok: !error, error: error ? 'db' : undefined };
}

/** Phone booking: one passenger per call — hold + finalize offline in one go. */
export async function manualBooking(formData: FormData) {
  const sb = await createServerClient();
  const tripId = g(formData, 'trip_id');
  const seat = g(formData, 'seat_no');
  const name = g(formData, 'passenger_name');
  const phone = g(formData, 'phone');
  const fareTypeId = g(formData, 'fare_type_id');
  const email = g(formData, 'email') || 'office@sergianitravel.gr';
  if (!tripId || !seat || !name || !fareTypeId) return;

  const { data: began, error } = await sb.rpc('begin_booking', {
    p: { kind: 'oneway', legs: [{ trip_id: tripId, seats: [seat] }] },
  });
  const okBegin = !error && (began as { ok: boolean }).ok;
  if (!okBegin) {
    console.error('manualBooking begin:', error?.message ?? began);
    const code = (began as { error?: string } | null)?.error === 'seat_taken' ? 'seat_taken' : 'db';
    revalidatePath(`/admin/schedules/trips/${tripId}`);
    redirect(`/admin/schedules/trips/${tripId}${flashQuery(false, code)}`);
  }
  const b = began as { order_id: string; access_token: string };
  const { error: e2 } = await sb.rpc('finalize_checkout', {
    p_order_id: b.order_id,
    p_token: b.access_token,
    p_billing: {
      customer_name: name,
      email,
      phone: phone || '0000000000',
      accept_terms: true,
      by_admin: true,
    },
    p_passengers: [{ passenger_name: name, passenger_phone: phone || '0000000000', fare_type_id: fareTypeId, outbound_seat: seat }],
    p_provider: 'offline',
  });
  if (e2) console.error('manualBooking finalize:', e2.message);
  revalidatePath(`/admin/schedules/trips/${tripId}`);
  revalidatePath('/admin/orders');
  redirect(`/admin/schedules/trips/${tripId}${flashQuery(!e2)}`);
}

// --------------------------------------------------------------- orders

export async function markOrderPaid(id: string) {
  const sb = await createServerClient();
  const { error } = await sb
    .from('ticket_orders')
    .update({ status: 'paid', paid_at: new Date().toISOString(), payment_provider: 'offline' })
    .eq('id', id)
    .in('status', ['offline', 'awaiting_payment']);
  if (error) console.error('markOrderPaid:', error.message);
  revalidatePath(`/admin/orders/${id}`);
  revalidatePath('/admin/orders');
  redirect(`/admin/orders/${id}${flashQuery(!error)}`);
}

export async function saveOrderNotes(id: string, formData: FormData) {
  const sb = await createServerClient();
  const { error } = await sb
    .from('ticket_orders')
    .update({ admin_notes: g(formData, 'admin_notes') || null })
    .eq('id', id);
  if (error) console.error('saveOrderNotes:', error.message);
  revalidatePath(`/admin/orders/${id}`);
  redirect(`/admin/orders/${id}${flashQuery(!error)}`);
}

export async function cancelTicket(ticketId: string, orderId: string) {
  const sb = await createServerClient();
  const { data, error } = await sb.rpc('admin_cancel_ticket', { p_ticket_id: ticketId });
  const ok = !error && (data as { ok: boolean }).ok;
  if (error) console.error('cancelTicket:', error.message);
  else if (!ok) console.error('cancelTicket:', data);
  revalidatePath(`/admin/orders/${orderId}`);
  revalidatePath('/admin/orders');
  redirect(`/admin/orders/${orderId}${flashQuery(ok)}`);
}

export async function moveTicket(formData: FormData) {
  const sb = await createServerClient();
  const ticketId = g(formData, 'ticket_id');
  const orderId = g(formData, 'order_id');
  const tripId = g(formData, 'trip_id');
  const seat = g(formData, 'seat_no');
  if (!ticketId || !tripId || !seat) {
    if (orderId) redirect(`/admin/orders/${orderId}${flashQuery(false, 'invalid_input')}`);
    return;
  }
  const open = g(formData, 'open_return') === '1';
  const { data, error } = await sb.rpc(open ? 'admin_redeem_open_return' : 'admin_move_ticket', {
    p_ticket_id: ticketId,
    p_trip_id: tripId,
    p_seat: seat,
  });
  const ok = !error && (data as { ok: boolean }).ok;
  if (error) console.error('moveTicket:', error.message);
  else if (!ok) console.error('moveTicket:', data);
  revalidatePath(`/admin/orders/${orderId}`);
  let code = 'db';
  if (!error) {
    const e = (data as { error?: string })?.error;
    if (e === 'seat_taken' || e === 'not_found') code = e;
  }
  redirect(`/admin/orders/${orderId}${flashQuery(ok, code)}`);
}

export async function renameTicket(formData: FormData) {
  const sb = await createServerClient();
  const ticketId = g(formData, 'ticket_id');
  const orderId = g(formData, 'order_id');
  const name = g(formData, 'passenger_name');
  if (!ticketId || name.length < 2) {
    if (orderId) redirect(`/admin/orders/${orderId}${flashQuery(false, 'invalid_input')}`);
    return;
  }
  const { error } = await sb.from('tickets').update({ passenger_name: name }).eq('id', ticketId);
  if (error) console.error('renameTicket:', error.message);
  revalidatePath(`/admin/orders/${orderId}`);
  redirect(`/admin/orders/${orderId}${flashQuery(!error)}`);
}

export type ValidateState = { result?: unknown } | null;

export async function validateTicket(_prev: ValidateState, formData: FormData): Promise<ValidateState> {
  const sb = await createServerClient();
  const code = g(formData, 'code');
  if (!code) return null;
  const { data, error } = await sb.rpc('admin_validate_ticket', { p_code: code });
  if (error) {
    console.error('validateTicket:', error.message);
    return { result: { ok: false, error: 'db' } };
  }
  revalidatePath('/admin/orders');
  return { result: data };
}

// ------------------------------------------------------------- settings

export async function saveBookingSettings(formData: FormData) {
  const sb = await createServerClient();
  const row = {
    hold_minutes: num(formData, 'hold_minutes') ?? 30,
    sales_window_days: num(formData, 'sales_window_days') ?? 30,
    default_cutoff_min: num(formData, 'default_cutoff_min') ?? 5,
    refund_cutoff_hours: num(formData, 'refund_cutoff_hours') ?? 8,
    refund_pct_early: num(formData, 'refund_pct_early') ?? 70,
    refund_pct_late: num(formData, 'refund_pct_late') ?? 50,
    open_return_months: num(formData, 'open_return_months') ?? 3,
  };
  const { error } = await sb.from('booking_settings').update(row).eq('id', 1);
  if (error) console.error('saveBookingSettings:', error.message);
  revalidatePath('/admin/settings');
  revalidatePath('/eisitiria');
}
