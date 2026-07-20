'use server';
import { revalidatePath } from 'next/cache';
import { redirect } from 'next/navigation';
import { z } from 'zod';
import { createServerClient } from '@/lib/supabase/server';

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
  };
  if (!row.origin_station_id || !row.destination_station_id) return;

  if (id) {
    const { error } = await sb.from('bus_routes').update(row).eq('id', id);
    if (error) console.error('upsertRoute:', error.message);
  } else {
    const { error } = await sb.from('bus_routes').insert(row);
    if (error) console.error('upsertRoute:', error.message);
    // create the reverse direction too (ignore if it already exists)
    const { error: e2 } = await sb.from('bus_routes').insert({
      ...row,
      origin_station_id: row.destination_station_id,
      destination_station_id: row.origin_station_id,
      position: row.position + 1,
    });
    if (e2 && e2.code !== '23505') console.error('upsertRoute reverse:', e2.message);
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

export async function copyFaresToReverse(routeId: string) {
  const sb = await createServerClient();
  const { data: route } = await sb.from('bus_routes').select('*').eq('id', routeId).maybeSingle();
  if (!route) return;
  const { data: reverse } = await sb
    .from('bus_routes')
    .select('id')
    .eq('origin_station_id', route.destination_station_id)
    .eq('destination_station_id', route.origin_station_id)
    .maybeSingle();
  if (!reverse) return;
  const { data: fares } = await sb.from('fare_types').select('*').eq('route_id', routeId);
  await sb.from('fare_types').delete().eq('route_id', reverse.id);
  if (fares?.length) {
    const { error } = await sb.from('fare_types').insert(
      fares.map((f) => ({
        route_id: reverse.id,
        name: f.name,
        description: f.description,
        price_oneway_cents: f.price_oneway_cents,
        price_round_cents: f.price_round_cents,
        requires_document: f.requires_document,
        is_default: f.is_default,
        position: f.position,
        is_active: f.is_active,
      }))
    );
    if (error) console.error('copyFaresToReverse:', error.message);
  }
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
  if (!row.name || !routeId) return;
  const { error } = id
    ? await sb.from('fare_types').update(row).eq('id', id)
    : await sb.from('fare_types').insert(row);
  if (error) console.error('upsertFareType:', error.message);
  revalidatePath(`/admin/routes/${routeId}`);
  revalidateTicketing();
}

export async function deleteFareType(id: string, routeId: string) {
  const sb = await createServerClient();
  const { error } = await sb.from('fare_types').delete().eq('id', id);
  if (error) console.error('deleteFareType:', error.message);
  revalidatePath(`/admin/routes/${routeId}`);
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
  redirect('/admin/schedules');
}

export async function deletePattern(id: string) {
  const sb = await createServerClient();
  const { error } = await sb.from('schedule_patterns').delete().eq('id', id);
  if (error) console.error('deletePattern:', error.message);
  revalidateTicketing();
}

export async function materializeTrips(formData: FormData) {
  const sb = await createServerClient();
  const from = g(formData, 'from');
  const to = g(formData, 'to');
  if (!from || !to) return;
  const { error } = await sb.rpc('admin_materialize_range', { p_from: from, p_to: to });
  if (error) console.error('materializeTrips:', error.message);
  revalidatePath('/admin/schedules');
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
}

// ---------------------------------------------------------- seat state

export async function blockSeat(tripId: string, seat: string) {
  const sb = await createServerClient();
  const { error } = await sb.rpc('admin_block_seat', { p_trip_id: tripId, p_seat: seat });
  if (error) console.error('blockSeat:', error.message);
  revalidatePath(`/admin/schedules/trips/${tripId}`);
}

export async function unblockSeat(tripId: string, seat: string) {
  const sb = await createServerClient();
  const { error } = await sb.rpc('admin_unblock_seat', { p_trip_id: tripId, p_seat: seat });
  if (error) console.error('unblockSeat:', error.message);
  revalidatePath(`/admin/schedules/trips/${tripId}`);
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
  if (error || !(began as { ok: boolean }).ok) {
    console.error('manualBooking begin:', error?.message ?? began);
    revalidatePath(`/admin/schedules/trips/${tripId}`);
    return;
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
    p_passengers: [{ passenger_name: name, fare_type_id: fareTypeId, outbound_seat: seat }],
    p_provider: 'offline',
  });
  if (e2) console.error('manualBooking finalize:', e2.message);
  revalidatePath(`/admin/schedules/trips/${tripId}`);
  revalidatePath('/admin/orders');
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
}

export async function saveOrderNotes(id: string, formData: FormData) {
  const sb = await createServerClient();
  const { error } = await sb
    .from('ticket_orders')
    .update({ admin_notes: g(formData, 'admin_notes') || null })
    .eq('id', id);
  if (error) console.error('saveOrderNotes:', error.message);
  revalidatePath(`/admin/orders/${id}`);
}

export async function cancelTicket(ticketId: string, orderId: string) {
  const sb = await createServerClient();
  const { data, error } = await sb.rpc('admin_cancel_ticket', { p_ticket_id: ticketId });
  if (error) console.error('cancelTicket:', error.message);
  else if (!(data as { ok: boolean }).ok) console.error('cancelTicket:', data);
  revalidatePath(`/admin/orders/${orderId}`);
  revalidatePath('/admin/orders');
}

export async function moveTicket(formData: FormData) {
  const sb = await createServerClient();
  const ticketId = g(formData, 'ticket_id');
  const orderId = g(formData, 'order_id');
  const tripId = g(formData, 'trip_id');
  const seat = g(formData, 'seat_no');
  if (!ticketId || !tripId || !seat) return;
  const open = g(formData, 'open_return') === '1';
  const { data, error } = await sb.rpc(open ? 'admin_redeem_open_return' : 'admin_move_ticket', {
    p_ticket_id: ticketId,
    p_trip_id: tripId,
    p_seat: seat,
  });
  if (error) console.error('moveTicket:', error.message);
  else if (!(data as { ok: boolean }).ok) console.error('moveTicket:', data);
  revalidatePath(`/admin/orders/${orderId}`);
}

export async function renameTicket(formData: FormData) {
  const sb = await createServerClient();
  const ticketId = g(formData, 'ticket_id');
  const orderId = g(formData, 'order_id');
  const name = g(formData, 'passenger_name');
  if (!ticketId || name.length < 2) return;
  const { error } = await sb.from('tickets').update({ passenger_name: name }).eq('id', ticketId);
  if (error) console.error('renameTicket:', error.message);
  revalidatePath(`/admin/orders/${orderId}`);
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
