'use server';
import { revalidatePath } from 'next/cache';
import { redirect } from 'next/navigation';
import { createServerClient } from '@/lib/supabase/server';
import type { SettingsData } from '@/types/db';
import { resolvePublishedAt } from '@/lib/posts-publish';
import { parseEuroToCents } from '@/lib/booking';

function revalidatePublic() {
  revalidatePath('/admin');
  revalidatePath('/');
  revalidatePath('/ekdromes');
}

export async function saveSettings(formData: FormData) {
  const sb = await createServerClient();
  const g = (k: string) => String(formData.get(k) || '').trim();
  const opt = (v: string) => (v ? v : undefined);

  const data: SettingsData = {
    phones: [g('phone1'), g('phone2'), g('phone3')].filter(Boolean),
    phone24h: opt(g('phone_24h')),
    address: g('address'),
    email: g('email'),
    hours: { weekdays: g('hours_weekdays'), saturday: g('hours_saturday') },
    social: {
      facebook: opt(g('social_facebook')),
      instagram: opt(g('social_instagram')),
      youtube: opt(g('social_youtube')),
    },
    hero: {
      eyebrow: opt(g('hero_eyebrow')),
      titleTop: opt(g('hero_titleTop')),
      titleEmph: opt(g('hero_titleEmph')),
      subtitle: opt(g('hero_subtitle')),
    },
    about: {
      eyebrow: opt(g('about_eyebrow')),
      title: opt(g('about_title')),
      body: opt(g('about_body')),
    },
  };

  const promoEyebrow = opt(g('promo_eyebrow'));
  const promoTitle = opt(g('promo_title'));
  const promoBody = opt(g('promo_body'));
  const promoCta = opt(g('promo_cta'));
  if (promoEyebrow || promoTitle || promoBody || promoCta) {
    data.promo = {
      ...(promoEyebrow ? { eyebrow: promoEyebrow } : {}),
      ...(promoTitle ? { title: promoTitle } : {}),
      ...(promoBody ? { body: promoBody } : {}),
      ...(promoCta ? { cta: promoCta } : {}),
    };
  }

  const stats = [0, 1, 2, 3, 4, 5]
    .map((i) => ({ value: Number(g(`stat_value_${i}`)) || 0, suffix: opt(g(`stat_suffix_${i}`)), label: g(`stat_label_${i}`) }))
    .filter((s) => s.label !== '');
  if (stats.length) data.stats = stats;

  const testimonials = [0, 1, 2, 3]
    .map((i) => ({ name: g(`testi_name_${i}`), city: g(`testi_city_${i}`), quote: g(`testi_quote_${i}`) }))
    .filter((t) => t.name !== '' && t.quote !== '');
  if (testimonials.length) data.testimonials = testimonials;

  const trust = [0, 1, 2, 3]
    .map((i) => ({ title: g(`trust_title_${i}`), text: g(`trust_text_${i}`) }))
    .filter((t) => t.title !== '');
  if (trust.length) data.trust = trust;

  const processEyebrow = opt(g('process_eyebrow'));
  const processTitle = opt(g('process_title'));
  const processSteps = [0, 1, 2]
    .map((i) => ({ title: g(`process_step_title_${i}`), text: g(`process_step_text_${i}`) }))
    .filter((s) => s.title !== '');
  if (processEyebrow || processTitle || processSteps.length) {
    data.process = {
      ...(processEyebrow ? { eyebrow: processEyebrow } : {}),
      ...(processTitle ? { title: processTitle } : {}),
      ...(processSteps.length ? { steps: processSteps } : {}),
    };
  }

  const poylmanValueProps = [0, 1, 2, 3]
    .map((i) => ({ title: g(`poylman_vp_title_${i}`), description: g(`poylman_vp_desc_${i}`) }))
    .filter((v) => v.title !== '');
  const poylmanRoutes = [0, 1, 2]
    .map((i) => ({ from: g(`poylman_route_from_${i}`), to: g(`poylman_route_to_${i}`), hours: g(`poylman_route_hours_${i}`) }))
    .filter((r) => r.from !== '' || r.to !== '');
  if (poylmanValueProps.length || poylmanRoutes.length) {
    data.poylman = {
      ...(poylmanValueProps.length ? { valueProps: poylmanValueProps } : {}),
      ...(poylmanRoutes.length ? { routes: poylmanRoutes } : {}),
    };
  }

  const pageHeroKeys = ['ekdromes', 'kroyazieres', 'poylman', 'epikoinonia', 'istoriko'] as const;
  const pageHeros: Record<string, { eyebrow?: string; title?: string; subtitle?: string }> = {};
  for (const key of pageHeroKeys) {
    const eyebrow = opt(g(`pagehero_${key}_eyebrow`));
    const title = opt(g(`pagehero_${key}_title`));
    const subtitle = opt(g(`pagehero_${key}_subtitle`));
    if (eyebrow || title || subtitle) {
      pageHeros[key] = {
        ...(eyebrow ? { eyebrow } : {}),
        ...(title ? { title } : {}),
        ...(subtitle ? { subtitle } : {}),
      };
    }
  }
  if (Object.keys(pageHeros).length) data.pageHeros = pageHeros;

  const homeSections: NonNullable<SettingsData['homeSections']> = {};
  const destinationsEyebrow = opt(g('homesec_destinations_eyebrow'));
  const destinationsTitle = opt(g('homesec_destinations_title'));
  const destinationsSubtitle = opt(g('homesec_destinations_subtitle'));
  if (destinationsEyebrow || destinationsTitle || destinationsSubtitle) {
    homeSections.destinations = {
      ...(destinationsEyebrow ? { eyebrow: destinationsEyebrow } : {}),
      ...(destinationsTitle ? { title: destinationsTitle } : {}),
      ...(destinationsSubtitle ? { subtitle: destinationsSubtitle } : {}),
    };
  }

  const listingEyebrow = opt(g('homesec_listing_eyebrow'));
  const listingTitle = opt(g('homesec_listing_title'));
  const listingSubtitle = opt(g('homesec_listing_subtitle'));
  if (listingEyebrow || listingTitle || listingSubtitle) {
    homeSections.listing = {
      ...(listingEyebrow ? { eyebrow: listingEyebrow } : {}),
      ...(listingTitle ? { title: listingTitle } : {}),
      ...(listingSubtitle ? { subtitle: listingSubtitle } : {}),
    };
  }

  const testimonialsEyebrow = opt(g('homesec_testimonials_eyebrow'));
  const testimonialsTitle = opt(g('homesec_testimonials_title'));
  if (testimonialsEyebrow || testimonialsTitle) {
    homeSections.testimonials = {
      ...(testimonialsEyebrow ? { eyebrow: testimonialsEyebrow } : {}),
      ...(testimonialsTitle ? { title: testimonialsTitle } : {}),
    };
  }

  const newsEyebrow = opt(g('homesec_news_eyebrow'));
  const newsTitle = opt(g('homesec_news_title'));
  const newsSubtitle = opt(g('homesec_news_subtitle'));
  if (newsEyebrow || newsTitle || newsSubtitle) {
    homeSections.news = {
      ...(newsEyebrow ? { eyebrow: newsEyebrow } : {}),
      ...(newsTitle ? { title: newsTitle } : {}),
      ...(newsSubtitle ? { subtitle: newsSubtitle } : {}),
    };
  }

  const ctaTitle = opt(g('homesec_cta_title'));
  const ctaBody = opt(g('homesec_cta_body'));
  if (ctaTitle || ctaBody) {
    homeSections.cta = {
      ...(ctaTitle ? { title: ctaTitle } : {}),
      ...(ctaBody ? { body: ctaBody } : {}),
    };
  }

  if (Object.keys(homeSections).length) data.homeSections = homeSections;

  const legalTerms = opt(g('legal_terms'));
  const legalPrivacy = opt(g('legal_privacy'));
  if (legalTerms || legalPrivacy) {
    data.legal = {
      ...(legalTerms ? { terms: legalTerms } : {}),
      ...(legalPrivacy ? { privacy: legalPrivacy } : {}),
    };
  }

  const { error } = await sb.from('settings').upsert({ id: 1, data }, { onConflict: 'id' });
  if (error) {
    console.error('saveSettings:', error.message);
    redirect('/admin/settings?error=db');
  }
  // Refresh the footer (root layout) and home copy everywhere.
  revalidatePath('/', 'layout');
  redirect('/admin/settings?saved=1');
}

export async function signOut() {
  const sb = await createServerClient();
  await sb.auth.signOut();
  redirect('/admin/login');
}

export async function setStatus(id: string, status: string) {
  const sb = await createServerClient();
  await sb.from('tours').update({
    status,
    published_at: status === 'published' ? new Date().toISOString() : null,
  }).eq('id', id);
  revalidatePublic();
}

export async function setFeatured(id: string, is_featured: boolean) {
  const sb = await createServerClient();
  await sb.from('tours').update({ is_featured }).eq('id', id);
  revalidatePublic();
}

export async function deleteTour(id: string) {
  const sb = await createServerClient();
  await sb.from('tours').delete().eq('id', id);
  revalidatePublic();
}

export async function upsertTour(formData: FormData) {
  const sb = await createServerClient();
  const id = (formData.get('id') as string) || null;
  const slug = String(formData.get('slug') || '').trim();
  const status = String(formData.get('status') || 'draft');
  const payload = {
    title: String(formData.get('title') || '').trim(),
    slug,
    summary: (String(formData.get('summary') || '').trim() || null) as string | null,
    price_from: formData.get('price_from') ? Number(formData.get('price_from')) : null,
    duration_label: (String(formData.get('duration_label') || '').trim() || null) as string | null,
    departure_note: (String(formData.get('departure_note') || '').trim() || null) as string | null,
    status,
    is_featured: formData.get('is_featured') === 'on',
  };

  let tourId = id;
  if (id) {
    await sb.from('tours').update(payload).eq('id', id);
  } else {
    const { data } = await sb.from('tours')
      .insert({ ...payload, published_at: status === 'published' ? new Date().toISOString() : null })
      .select('id').single();
    tourId = data?.id ?? null;
  }
  if (!tourId) return;

  // primary category
  const category = String(formData.get('category') || '');
  if (category) {
    const { data: cat } = await sb.from('categories').select('id').eq('slug', category).maybeSingle();
    if (cat) {
      await sb.from('tour_categories').delete().eq('tour_id', tourId);
      await sb.from('tour_categories').insert({ tour_id: tourId, category_id: cat.id, is_primary: true });
    }
  }

  revalidatePublic();
  redirect('/admin/tours');
}

export async function addTourImages(tourId: string, formData: FormData) {
  const sb = await createServerClient();
  const { data: tour } = await sb.from('tours').select('slug, cover_image_id').eq('id', tourId).maybeSingle();
  if (!tour) return;
  const files = formData.getAll('files').filter((f): f is File => f instanceof File && f.size > 0);
  const { data: existing } = await sb.from('tour_images').select('position').eq('tour_id', tourId).order('position', { ascending: false }).limit(1);
  let pos = (existing?.[0]?.position ?? -1) + 1;
  let firstNewId: string | null = null;
  for (const file of files) {
    const ext = (file.name.split('.').pop() || 'jpg').toLowerCase();
    const path = `${tour.slug}/gallery-${Date.now()}-${pos}.${ext === 'jpeg' ? 'jpg' : ext}`;
    const buf = Buffer.from(await file.arrayBuffer());
    const { error } = await sb.storage.from('tour-images').upload(path, buf, { contentType: file.type || 'image/jpeg', upsert: true });
    if (error) { console.error('addTourImages upload:', error.message); continue; }
    const { data: img } = await sb.from('tour_images').insert({ tour_id: tourId, storage_path: path, position: pos }).select('id').single();
    if (img && !firstNewId) firstNewId = img.id;
    pos++;
  }
  if (!tour.cover_image_id && firstNewId) await sb.from('tours').update({ cover_image_id: firstNewId }).eq('id', tourId);
  revalidatePath(`/admin/tours/${tourId}/edit`);
  revalidatePublic();
}

export async function deleteTourImage(imageId: string, tourId: string) {
  const sb = await createServerClient();
  const { data: img } = await sb.from('tour_images').select('storage_path').eq('id', imageId).maybeSingle();
  const { data: tour } = await sb.from('tours').select('cover_image_id').eq('id', tourId).maybeSingle();
  await sb.from('tour_images').delete().eq('id', imageId);
  if (img?.storage_path) await sb.storage.from('tour-images').remove([img.storage_path]);
  if (tour?.cover_image_id === imageId) {
    const { data: next } = await sb.from('tour_images').select('id').eq('tour_id', tourId).order('position').limit(1);
    await sb.from('tours').update({ cover_image_id: next?.[0]?.id ?? null }).eq('id', tourId);
  }
  revalidatePath(`/admin/tours/${tourId}/edit`);
  revalidatePublic();
}

export async function setCoverImage(tourId: string, imageId: string) {
  const sb = await createServerClient();
  await sb.from('tours').update({ cover_image_id: imageId }).eq('id', tourId);
  revalidatePath(`/admin/tours/${tourId}/edit`);
  revalidatePublic();
}

export async function setLeadStatus(id: string, status: string) {
  const sb = await createServerClient();
  const { error } = await sb.from('leads').update({ status }).eq('id', id);
  if (error) console.error('setLeadStatus:', error.message);
  revalidatePath('/admin');
  revalidatePath('/admin/requests');
  revalidatePath(`/admin/requests/${id}`);
}

export async function saveLeadNotes(id: string, notes: string) {
  const sb = await createServerClient();
  const { error } = await sb.from('leads').update({ admin_notes: notes }).eq('id', id);
  if (error) console.error('saveLeadNotes:', error.message);
  revalidatePath(`/admin/requests/${id}`);
}

export async function deleteLead(id: string) {
  const sb = await createServerClient();
  const { error } = await sb.from('leads').delete().eq('id', id);
  if (error) console.error('deleteLead:', error.message);
  revalidatePath('/admin/requests');
  redirect('/admin/requests');
}

export async function upsertCategory(formData: FormData) {
  const sb = await createServerClient();
  const id = (formData.get('id') as string) || null;
  const payload = {
    name_el: String(formData.get('name_el') || '').trim(),
    slug: String(formData.get('slug') || '').trim(),
    sort_order: Number(formData.get('sort_order') || 0),
  };
  if (!payload.name_el || !payload.slug) return;
  const { error } = id
    ? await sb.from('categories').update(payload).eq('id', id)
    : await sb.from('categories').insert(payload);
  if (error) console.error('upsertCategory:', error.message);
  revalidatePublic();
  revalidatePath('/admin/tours');
}

export async function deleteCategory(id: string) {
  const sb = await createServerClient();
  const { error } = await sb.from('categories').delete().eq('id', id);
  if (error) console.error('deleteCategory:', error.message);
  revalidatePublic();
  revalidatePath('/admin/tours');
}

function revalidatePosts(slug?: string) {
  revalidatePath('/admin/posts');
  revalidatePath('/nea');
  if (slug) revalidatePath(`/nea/${slug}`);
}

export async function upsertPost(formData: FormData) {
  const sb = await createServerClient();
  const id = (formData.get('id') as string) || null;
  const slug = String(formData.get('slug') || '').trim();
  const status = String(formData.get('status') || 'draft');

  let existingPublishedAt: string | null = null;
  let existingLookupFailed = false;
  if (id) {
    const { data: existing, error } = await sb.from('posts').select('published_at').eq('id', id).maybeSingle();
    if (error) {
      console.error('upsertPost select:', error.message);
      existingLookupFailed = true;
    }
    existingPublishedAt = existing?.published_at ?? null;
  }
  const priceRaw = String(formData.get('price') || '').trim();
  const submittedPublishedOn = String(formData.get('published_on') || '').trim();

  const payload = {
    title: String(formData.get('title') || '').trim(),
    slug,
    excerpt: (String(formData.get('excerpt') || '').trim() || null) as string | null,
    body: String(formData.get('body') || '').trim(),
    seo_title: (String(formData.get('seo_title') || '').trim() || null) as string | null,
    seo_description: (String(formData.get('seo_description') || '').trim() || null) as string | null,
    status,
    trip_date: (String(formData.get('trip_date') || '').trim() || null) as string | null,
    price: priceRaw ? Number(priceRaw) : null,
    route_id: (String(formData.get('route_id') || '').trim() || null) as string | null,
    // If the lookup failed, only an explicit form date may touch published_at —
    // otherwise leave the column as-is rather than risk re-dating the post.
    ...(existingLookupFailed && !submittedPublishedOn
      ? {}
      : {
          published_at: resolvePublishedAt({
            status,
            submitted: submittedPublishedOn,
            existing: existingPublishedAt,
          }),
        }),
  };

  let postId = id;
  if (id) {
    const { error } = await sb.from('posts').update(payload).eq('id', id);
    if (error) console.error('upsertPost update:', error.message);
  } else {
    const { data, error } = await sb.from('posts').insert(payload).select('id').single();
    if (error) console.error('upsertPost insert:', error.message);
    postId = data?.id ?? null;
  }
  if (!postId) return;

  const cover = formData.get('cover');
  if (cover instanceof File && cover.size > 0) {
    const ext = (cover.name.split('.').pop() || 'jpg').toLowerCase();
    const path = `posts/${slug}/cover-${Date.now()}.${ext === 'jpeg' ? 'jpg' : ext}`;
    const buf = Buffer.from(await cover.arrayBuffer());
    const { error } = await sb.storage.from('tour-images').upload(path, buf, { contentType: cover.type || 'image/jpeg', upsert: true });
    if (error) {
      console.error('upsertPost upload:', error.message);
    } else {
      await sb.from('posts').update({ cover_path: path }).eq('id', postId);
    }
  }

  revalidatePosts(slug);
  redirect('/admin/posts');
}

export async function setPostStatus(id: string, status: string) {
  const sb = await createServerClient();
  const patch: { status: string; published_at?: string } = { status };
  if (status === 'published') {
    const { data, error } = await sb.from('posts').select('published_at').eq('id', id).maybeSingle();
    if (error) console.error('setPostStatus select:', error.message);
    else if (!data?.published_at) patch.published_at = new Date().toISOString();
  }
  const { error } = await sb.from('posts').update(patch).eq('id', id);
  if (error) console.error('setPostStatus:', error.message);
  revalidatePosts();
}

export async function deletePost(id: string) {
  const sb = await createServerClient();
  const { error } = await sb.from('posts').delete().eq('id', id);
  if (error) console.error('deletePost:', error.message);
  revalidatePosts();
}

// ── Tour booking setup (price categories + departure dates) ────────────────

type TierPayload = {
  id?: string;
  label?: string;
  price?: string;
  price_original?: string;
  max_qty?: string;
  is_active?: boolean;
};

type DeparturePayload = {
  id?: string;
  starts_on?: string;
  ends_on?: string;
  note?: string;
  capacity?: string;
  is_active?: boolean;
};

function parseJsonRows<T>(raw: FormDataEntryValue | null): T[] {
  if (typeof raw !== 'string' || !raw) return [];
  try {
    const parsed = JSON.parse(raw);
    return Array.isArray(parsed) ? (parsed as T[]) : [];
  } catch {
    return [];
  }
}

/** Save every price category and departure date of a tour in one shot: rows the
 *  editor dropped are deleted, the rest are upserted in on-screen order. */
export async function saveTourBooking(formData: FormData) {
  const sb = await createServerClient();
  const tourId = String(formData.get('tour_id') || '');
  if (!tourId) return;

  const tiers = parseJsonRows<TierPayload>(formData.get('tiers'))
    .map((t, i) => ({
      id: t.id,
      tour_id: tourId,
      label: String(t.label ?? '').trim(),
      price_cents: parseEuroToCents(t.price ?? '') ?? 0,
      price_original_cents: parseEuroToCents(t.price_original ?? ''),
      max_qty: Math.min(99, Math.max(1, Number(t.max_qty) || 20)),
      position: i,
      is_active: t.is_active !== false,
    }))
    .filter((t) => t.label !== '');

  const departures = parseJsonRows<DeparturePayload>(formData.get('departures'))
    .map((d) => ({
      id: d.id,
      tour_id: tourId,
      starts_on: String(d.starts_on ?? '').trim(),
      ends_on: String(d.ends_on ?? '').trim() || null,
      note: String(d.note ?? '').trim() || null,
      capacity: d.capacity && Number(d.capacity) > 0 ? Number(d.capacity) : null,
      is_active: d.is_active !== false,
    }))
    .filter((d) => /^\d{4}-\d{2}-\d{2}$/.test(d.starts_on));

  const keptTierIds = tiers.map((t) => t.id).filter((id): id is string => Boolean(id));
  const keptDepIds = departures.map((d) => d.id).filter((id): id is string => Boolean(id));

  const inList = (ids: string[]) => `("${ids.join('","')}")`;
  const delTiers = sb.from('tour_price_tiers').delete().eq('tour_id', tourId);
  await (keptTierIds.length ? delTiers.not('id', 'in', inList(keptTierIds)) : delTiers);
  const delDeps = sb.from('tour_departures').delete().eq('tour_id', tourId);
  await (keptDepIds.length ? delDeps.not('id', 'in', inList(keptDepIds)) : delDeps);

  for (const t of tiers) {
    const { id, ...values } = t;
    const { error } = id
      ? await sb.from('tour_price_tiers').update(values).eq('id', id).eq('tour_id', tourId)
      : await sb.from('tour_price_tiers').insert(values);
    if (error) console.error('saveTourBooking tier:', error.message);
  }
  for (const d of departures) {
    const { id, ...values } = d;
    const { error } = id
      ? await sb.from('tour_departures').update(values).eq('id', id).eq('tour_id', tourId)
      : await sb.from('tour_departures').insert(values);
    if (error) console.error('saveTourBooking departure:', error.message);
  }

  const { data: tour } = await sb.from('tours').select('slug').eq('id', tourId).maybeSingle();
  if (tour?.slug) revalidatePath(`/tour/${tour.slug}`);
  revalidatePath(`/admin/tours/${tourId}/edit`);
  revalidatePublic();
}

// ── Tour bookings (orders) ────────────────────────────────────────────────

export async function setTourOrderStatus(id: string, status: string) {
  const sb = await createServerClient();
  const { data, error } = await sb.rpc('admin_set_tour_order_status', { p_order_id: id, p_status: status });
  if (error) console.error('setTourOrderStatus:', error.message);
  else if (!(data as { ok: boolean })?.ok) console.error('setTourOrderStatus:', data);
  revalidatePath('/admin/bookings');
  revalidatePath(`/admin/bookings/${id}`);
}

export async function saveTourOrderNotes(id: string, notes: string) {
  const sb = await createServerClient();
  const { error } = await sb.from('tour_orders').update({ admin_notes: notes }).eq('id', id);
  if (error) console.error('saveTourOrderNotes:', error.message);
  revalidatePath(`/admin/bookings/${id}`);
}
