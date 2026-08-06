'use server';
import { randomUUID } from 'node:crypto';
import { revalidatePath } from 'next/cache';
import { redirect } from 'next/navigation';
import { z } from 'zod';
import { createServerClient } from '@/lib/supabase/server';
import { parseBoardingPoints, slugify } from '@/lib/excursions';
import { flashQuery, withFlash } from '@/lib/admin-flash';
import { athensDepartureAt } from '@/lib/athens-time';

function revalidateTicketing() {
  revalidatePath('/admin/excursions');
  revalidatePath('/admin/layouts');
  revalidatePath('/admin/orders');
  revalidatePath('/admin/trips');
  revalidatePath('/eisitiria');
}

const g = (fd: FormData, k: string) => String(fd.get(k) ?? '').trim();
const num = (fd: FormData, k: string) => {
  const v = Number(g(fd, k));
  return Number.isFinite(v) ? v : null;
};

// --------------------------------------------------------------- routes

/** The two client-mandated fare categories every excursion starts with. */
function defaultFares(routeId: string) {
  return [
    { route_id: routeId, name: 'Κανονικό', description: 'Κανονικό εισιτήριο.', price_oneway_cents: 0, price_round_cents: 0, requires_document: false, is_default: true, position: 1, is_active: true },
    { route_id: routeId, name: 'Φοιτητικό', description: 'Φοιτητές με επίδειξη ακαδημαϊκής ταυτότητας (πάσο).', price_oneway_cents: 0, price_round_cents: 0, requires_document: true, is_default: false, position: 2, is_active: true },
  ];
}

export async function upsertRoute(formData: FormData) {
  const sb = await createServerClient();
  const id = g(formData, 'id');
  const redirectTo = g(formData, 'redirect_to');
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
    if (redirectTo.startsWith('/admin/')) redirect(withFlash(redirectTo, !error));
    redirect(`/admin/excursions/${id}${flashQuery(!error)}`);
  }

  const { data: created, error } = await sb.from('bus_routes').insert(row).select('id').single();
  if (error) console.error('upsertRoute:', error.message);
  if (created) {
    const { error: e2 } = await sb.from('fare_types').insert(defaultFares(created.id));
    if (e2) console.error('upsertRoute fares:', e2.message);
  }
  revalidateTicketing();
  redirect('/admin/excursions');
}

/** New excursion from the hub: one title. Reuses a shared origin station,
 *  mints a per-excursion destination station, then a draft route + default fares. */
export async function createExcursion(formData: FormData) {
  const sb = await createServerClient();
  const title = g(formData, 'title');
  if (!title) redirect('/admin/excursions?error=invalid_input');

  // find-or-create the shared origin station
  let originId: string;
  const { data: origin } = await sb.from('stations').select('id').eq('slug', 'sergiani-afetiria').maybeSingle();
  if (origin) {
    originId = origin.id;
  } else {
    const { data: newOrigin, error: eOrigin } = await sb
      .from('stations')
      .insert({ slug: 'sergiani-afetiria', name: 'Αφετηρία Sergiani', is_active: true, position: 0 })
      .select('id')
      .single();
    if (eOrigin || !newOrigin) {
      console.error('createExcursion origin:', eOrigin?.message);
      redirect('/admin/excursions?error=db');
    }
    originId = newOrigin!.id;
  }

  // unique per-excursion destination station named after the excursion
  const destSlug = `${slugify(title) || 'ekdromi'}-${randomUUID().slice(0, 6)}`;
  const { data: dest, error: eDest } = await sb
    .from('stations')
    .insert({ slug: destSlug, name: title, is_active: true, position: 0 })
    .select('id')
    .single();
  if (eDest || !dest) {
    console.error('createExcursion destination:', eDest?.message);
    redirect('/admin/excursions?error=db');
  }

  const { data: route, error: eRoute } = await sb
    .from('bus_routes')
    .insert({
      origin_station_id: originId,
      destination_station_id: dest!.id,
      status: 'draft',
      position: 0,
      title,
      boarding_points: [],
    })
    .select('id')
    .single();
  if (eRoute || !route) {
    console.error('createExcursion route:', eRoute?.message);
    redirect('/admin/excursions?error=db');
  }

  const { error: eFares } = await sb.from('fare_types').insert(defaultFares(route!.id));
  if (eFares) console.error('createExcursion fares:', eFares.message);

  revalidateTicketing();
  redirect(`/admin/excursions/${route!.id}?created=1`);
}

/** Unpublish (draft) an excursion — reversible, unlike deletion. */
export async function retireExcursion(id: string) {
  const sb = await createServerClient();
  const { error } = await sb.from('bus_routes').update({ status: 'draft' }).eq('id', id);
  if (error) console.error('retireExcursion:', error.message);
  revalidateTicketing();
  redirect(withFlash(`/admin/excursions/${id}?tab=stoixeia`, !error));
}

export async function deleteRoute(id: string) {
  const sb = await createServerClient();
  // trips have no ON DELETE CASCADE — a route with materialized trips can't be
  // deleted; guide the admin to retire it instead of a silent FK failure.
  const { count } = await sb.from('trips').select('id', { count: 'exact', head: true }).eq('route_id', id);
  if ((count ?? 0) > 0) {
    redirect(withFlash(`/admin/excursions/${id}?tab=stoixeia`, false, 'route_has_trips'));
  }
  const { error } = await sb.from('bus_routes').delete().eq('id', id);
  if (error) console.error('deleteRoute:', error.message);
  revalidateTicketing();
  redirect(`/admin/excursions${flashQuery(!error)}`);
}

// ---------------------------------------------------------------- fares

export async function upsertFareType(formData: FormData) {
  const sb = await createServerClient();
  const id = g(formData, 'id');
  const routeId = g(formData, 'route_id');
  const redirectTo = g(formData, 'redirect_to');
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
  if (!row.name) {
    if (redirectTo.startsWith('/admin/')) redirect(withFlash(redirectTo, false, 'invalid_input'));
    redirect(`/admin/excursions/${routeId}${flashQuery(false, 'invalid_input')}`);
  }
  const { error } = id
    ? await sb.from('fare_types').update(row).eq('id', id)
    : await sb.from('fare_types').insert(row);
  if (error) console.error('upsertFareType:', error.message);
  revalidatePath(`/admin/excursions/${routeId}`);
  revalidateTicketing();
  if (redirectTo.startsWith('/admin/')) redirect(withFlash(redirectTo, !error));
  redirect(`/admin/excursions/${routeId}${flashQuery(!error)}`);
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
  let layout: z.infer<typeof LayoutSchema> | null = null;
  try {
    layout = LayoutSchema.parse(JSON.parse(g(formData, 'layout_json')));
  } catch (e) {
    console.error('upsertLayout: invalid layout json', e);
  }
  // invalid layout JSON or missing name → back to the editor (redirect outside try)
  if (!layout || !name) redirect(`/admin/layouts/${id || 'new'}?error=invalid_input`);
  const row = { name, layout, is_active: formData.get('is_active') !== null };
  const { error } = id
    ? await sb.from('bus_layouts').update(row).eq('id', id)
    : await sb.from('bus_layouts').insert(row);
  if (error) console.error('upsertLayout:', error.message);
  revalidateTicketing();
  redirect(`/admin/layouts${flashQuery(!error)}`);
}

export async function deleteLayout(id: string) {
  const sb = await createServerClient();
  const { error } = await sb.from('bus_layouts').delete().eq('id', id);
  if (error) console.error('deleteLayout:', error.message);
  revalidateTicketing();
  // FK violation → layout still referenced by patterns/trips
  const code = error?.code === '23503' ? 'layout_in_use' : 'db';
  redirect(`/admin/layouts${flashQuery(!error, code)}`);
}

// ------------------------------------------------------------ schedules

export async function upsertPattern(formData: FormData) {
  const sb = await createServerClient();
  const id = g(formData, 'id');
  const redirectTo = g(formData, 'redirect_to');
  const weekdays = [0, 1, 2, 3, 4, 5, 6].filter((d) => formData.get(`wd_${d}`) !== null);
  const row: {
    route_id: string;
    layout_id: string;
    departure_time: string;
    weekdays: number[];
    valid_from: string;
    valid_to: string | null;
    is_active: boolean;
    notes?: string | null;
  } = {
    route_id: g(formData, 'route_id'),
    layout_id: g(formData, 'layout_id'),
    departure_time: g(formData, 'departure_time'),
    weekdays,
    valid_from: g(formData, 'valid_from'),
    valid_to: g(formData, 'valid_to') || null,
    is_active: formData.get('is_active') !== null,
  };
  // The hub's pattern forms carry no notes field — only touch notes when present,
  // so saving from the hub doesn't null out legacy notes.
  if (formData.has('notes')) row.notes = g(formData, 'notes') || null;
  if (!row.route_id || !row.layout_id || !row.departure_time || !row.valid_from || weekdays.length === 0) {
    redirect(withFlash(redirectTo.startsWith('/admin/') ? redirectTo : '/admin/excursions', false, 'invalid_input'));
  }
  const { error } = id
    ? await sb.from('schedule_patterns').update(row).eq('id', id)
    : await sb.from('schedule_patterns').insert(row);
  if (error) console.error('upsertPattern:', error.message);
  revalidateTicketing();
  if (redirectTo.startsWith('/admin/')) redirect(withFlash(redirectTo, !error));
  redirect(`/admin/excursions${flashQuery(!error)}`);
}

export async function deletePattern(id: string, redirectTo?: string) {
  const sb = await createServerClient();
  const { error } = await sb.from('schedule_patterns').delete().eq('id', id);
  if (error) console.error('deletePattern:', error.message);
  revalidateTicketing();
  // when bound with only `id`, React passes FormData here — guard on string
  if (typeof redirectTo === 'string' && redirectTo.startsWith('/admin/')) redirect(withFlash(redirectTo, !error));
  redirect(`/admin/excursions${flashQuery(!error)}`);
}

export async function createTrip(formData: FormData) {
  const sb = await createServerClient();
  const redirectTo = g(formData, 'redirect_to');
  const date = g(formData, 'service_date');
  const time = g(formData, 'departure_time');
  const row = {
    route_id: g(formData, 'route_id'),
    layout_id: g(formData, 'layout_id'),
    service_date: date,
    // Athens wall-clock with the correct EET/EEST offset for that date
    departure_at: athensDepartureAt(date, time),
    notes: g(formData, 'notes') || null,
  };
  if (!row.route_id || !row.layout_id || !date || !time) return;
  const { error } = await sb.from('trips').insert(row);
  if (error) console.error('createTrip:', error.message);
  revalidatePath('/admin/excursions');
  if (redirectTo.startsWith('/admin/')) redirect(withFlash(redirectTo, !error));
  redirect(`/admin/excursions${flashQuery(!error)}`);
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
  revalidatePath(`/admin/trips/${id}`);
  revalidatePath('/admin/excursions');
  revalidatePath('/eisitiria');
  // Carries the seat-suggestion `after` param (if the form had one) back onto
  // the redirect, so TripSeatPanel's key stays put and a half-typed seat isn't lost.
  const after = g(formData, 'after');
  const afterQuery = after ? `&after=${encodeURIComponent(after)}` : '';
  redirect(`/admin/trips/${id}${flashQuery(!error)}${afterQuery}`);
}

// ---------------------------------------------------------- seat state

/** Called from AdminSeatMap via useTransition — returns status instead of redirecting. */
export async function blockSeat(tripId: string, seat: string): Promise<{ ok: boolean; error?: string }> {
  const sb = await createServerClient();
  const { error } = await sb.rpc('admin_block_seat', { p_trip_id: tripId, p_seat: seat });
  if (error) console.error('blockSeat:', error.message);
  revalidatePath(`/admin/trips/${tripId}`);
  return { ok: !error, error: error ? 'db' : undefined };
}

export async function unblockSeat(tripId: string, seat: string): Promise<{ ok: boolean; error?: string }> {
  const sb = await createServerClient();
  const { error } = await sb.rpc('admin_unblock_seat', { p_trip_id: tripId, p_seat: seat });
  if (error) console.error('unblockSeat:', error.message);
  revalidatePath(`/admin/trips/${tripId}`);
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
    revalidatePath(`/admin/trips/${tripId}`);
    // seat_taken → the seat the office just tried is gone; suggest the next free one
    // so they don't have to hunt for it themselves.
    const after = code === 'seat_taken' ? `&after=${encodeURIComponent(seat)}` : '';
    redirect(`/admin/trips/${tripId}${flashQuery(false, code)}${after}`);
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
  revalidatePath(`/admin/trips/${tripId}`);
  revalidatePath('/admin/orders');
  // On success, tell the page which seat was just booked so it can suggest
  // the next free one after it (11 → 12) instead of starting over.
  const after = !e2 ? `&after=${encodeURIComponent(seat)}` : '';
  redirect(`/admin/trips/${tripId}${flashQuery(!e2)}${after}`);
}

// --------------------------------------------------------------- orders

export async function markOrderPaid(id: string) {
  const sb = await createServerClient();
  const { data, error } = await sb
    .from('ticket_orders')
    .update({ status: 'paid', paid_at: new Date().toISOString(), payment_provider: 'offline' })
    .eq('id', id)
    .in('status', ['offline', 'awaiting_payment'])
    .select('id');
  if (error) console.error('markOrderPaid:', error.message);
  revalidatePath(`/admin/orders/${id}`);
  revalidatePath('/admin/orders');
  // 0 rows matched → the order wasn't in a payable state; don't flash a false success.
  const ok = !error && (data?.length ?? 0) > 0;
  redirect(`/admin/orders/${id}${flashQuery(ok, error ? 'db' : 'not_found')}`);
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
  };
  const { error } = await sb.from('booking_settings').update(row).eq('id', 1);
  if (error) console.error('saveBookingSettings:', error.message);
  revalidatePath('/admin/settings');
  revalidatePath('/eisitiria');
  redirect(`/admin/settings${flashQuery(!error)}`);
}
